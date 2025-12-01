import { pool } from "../config/db.js";
import createHttpError from "http-errors";

const toSafeString = (value) => (value == null ? "" : String(value).trim());

const requireStr = (v, name) => {
  const s = toSafeString(v);
  if (!s) throw createHttpError(400, `${name} is required`);
  return s;
};

export const createApplicationDraft = async (req, res, next) => {
  try {
    const {
      user_id,
      job_id,
      full_name,
      phone,
      skills,
      years_of_experience,
      resume_path,
    } = req.body;

    const userId = requireStr(user_id, "user_id");        
    const jobId = requireStr(job_id, "job_id");
    const fullName = requireStr(full_name, "full_name");
    const phoneNumber = requireStr(phone, "phone");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userCheck = await client.query(
        `SELECT 1 FROM users WHERE uuid = $1`,
        [userId]
      );

      if (userCheck.rowCount === 0) {
        throw createHttpError(404, "User not found. Invalid user_id");
      }

      const jobRes = await client.query(
        `SELECT 
           job_title,
           COALESCE(requires_payment, true) AS requires_payment,
           COALESCE(application_fee, 500)    AS application_fee,
           COALESCE(currency, 'INR')         AS currency
         FROM jobs 
         WHERE job_id = $1`,
        [jobId]
      );

      if (jobRes.rowCount === 0) {
        throw createHttpError(404, "Job not found");
      }

      const job = jobRes.rows[0];

      const appRes = await client.query(
        `INSERT INTO applications 
         (user_id, job_id, status, applied_at, updated_at)
         VALUES ($1, $2, 'pending_payment', NOW(), NOW())
         RETURNING application_id`,
        [userId, jobId]
      );

      const application_id = appRes.rows[0].application_id;

      await client.query(
        `INSERT INTO application_data
         (application_id, full_name, phone, skills, years_of_experience, resume_path, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          application_id,
          fullName,
          phoneNumber,
          toSafeString(skills),
          toSafeString(years_of_experience),   // "1-2 years", "Fresher", "5+ years" → stored correctly
          resume_path || null,
        ]
      );

      // 5. Create payment record only if job requires payment
      let payment = null;
      if (job.requires_payment) {
        const payRes = await client.query(
          `INSERT INTO payments
           (application_id, amount, currency, payment_status, payment_gateway, created_at)
           VALUES ($1, $2, $3, 'created', 'razorpay', NOW())
           RETURNING id AS payment_id, amount, currency`,
          [application_id, job.application_fee, job.currency]
        );
        payment = payRes.rows[0];
      }

      await client.query("COMMIT");

      // 6. Send response
      return res.status(201).json({
        success: true,
        application_id,
        status: "pending_payment",
        requires_payment: job.requires_payment,
        payment: payment
          ? {
            payment_id: payment.payment_id,
            amount: payment.amount,
            currency: payment.currency,
            razorpay_order_id: null,
          }
          : null,
        message: job.requires_payment
          ? "Application saved. Please complete payment to submit."
          : "Application submitted successfully! (No payment required)",
        expires_in_minutes: 30,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

export const completeApplicationPayment = async (req, res, next) => {
  try {
    const { application_id } = req.params;
    const {
      payment_gateway_order_id,
      payment_gateway_payment_id,
      signature,
    } = req.body;

    if (!application_id) {
      throw createHttpError(400, "application_id is required");
    }

    if (!payment_gateway_order_id || !payment_gateway_payment_id || !signature) {
      throw createHttpError(400, "Payment details are incomplete");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const appRes = await client.query(
        `SELECT a.status, p.payment_status
         FROM applications a
         JOIN payments p ON p.application_id = a.application_id
         WHERE a.application_id = $1
         FOR UPDATE`,
        [application_id]
      );

      if (appRes.rowCount === 0) {
        throw createHttpError(404, "Application not found");
      }

      const { status, payment_status } = appRes.rows[0];

      if (status !== "pending_payment") {
        throw createHttpError(400, "Application is not pending payment");
      }

      if (payment_status !== "created") {
        throw createHttpError(400, "Payment already processed");
      }

      await client.query(
        `UPDATE payments
         SET payment_status = 'paid',
             payment_gateway_order_id = $1,
             payment_gateway_payment_id = $2,
             signature = $3,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE application_id = $4`,
        [
          payment_gateway_order_id,
          payment_gateway_payment_id,
          signature,
          application_id,
        ]
      );

      await client.query(
        `UPDATE applications
         SET status = 'submitted',
             applied_at = NOW(),
             updated_at = NOW()
         WHERE application_id = $1`,
        [application_id]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        application_id,
        status: "submitted",
        message: "Application submitted successfully!",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};