import { pool } from "../config/db.js";
// import cashfree from "../config/cashfreeConfig.js";
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APPID,
  process.env.CASHFREE_KEY_SECRET
);

export const createOrder = async (req, res, next) => {
  const { amount = 500, application_id, name, phone } = req.body;

  if (!application_id || !name || !phone || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const orderData = {
      order_amount: Number(amount),
      order_currency: "INR",
      order_id: `app_${application_id}_${Date.now()}`,
      customer_details: {
        customer_id: String(application_id),
        customer_name: name.trim(),
        customer_phone: String(phone),
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}`,
        notify_url: `${process.env.BACKEND_URL}`,
      },
    };

    const response = await cashfree.PGCreateOrder(orderData);
    const order = response.data;
    await pool.query(
      `UPDATE applications SET cashfree_order_id = $1 WHERE application_id = $2`,
      [order.order_id, application_id]
    );


    return res.json({
      success: true,
      payment_session_id: order.payment_session_id,
      order_id: order.order_id,
    });
  } catch (error) {
    console.error("Cashfree order creation failed:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to create payment order",
      details: error.response?.data || error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { order_id } = req.query;

    if (!order_id) {
      return res.status(400).json({ error: "order_id is required" });
    }

    const response = await cashfree.PGOrderFetchPayments(order_id);

    console.log("Cashfree payment response:", response.data);

    if (!response?.data || response.data.length === 0) {
      return res.json({
        status: "PENDING",
        message: "No payment found yet",
      });
    }

    const payment = response.data[0];
    let status = "PENDING";

    if (payment.payment_status === "SUCCESS") {
      status = "SUCCESS";

      const appResult = await pool.query(
        `SELECT application_id FROM applications WHERE cashfree_order_id = $1`,
        [order_id]
      );

      if (appResult.rowCount > 0) {
        const appId = appResult.rows[0].application_id;

        try {
          await pool.query("BEGIN");

          await pool.query(
            `INSERT INTO payments 
             (application_id, amount, currency, payment_status, payment_gateway, 
              gateway_order_id, gateway_payment_id, paid_at, created_at)
             VALUES ($1, $2, 'INR', 'success', 'cashfree', $3, $4, NOW(), NOW())
             ON CONFLICT (gateway_order_id) DO NOTHING`,
            [appId, payment.payment_amount, order_id, payment.cf_payment_id]
          );

          await pool.query(
            `UPDATE applications 
             SET status = 'submitted',
                 payment_status = 'paid',
                 paid_at = NOW(),
                 updated_at = NOW()
             WHERE application_id = $1`,
            [appId]
          );

          await pool.query("COMMIT");

          console.log(`Payment verified & application ${appId} marked as submitted`);
        } catch (dbError) {
          await pool.query("ROLLBACK");
          console.error("Database transaction failed:", dbError);
        }
      }
    } else if (payment.payment_status === "FAILED" || payment.payment_status === "USER_DROPPED") {
      status = "FAILED";
    }

    return res.json({
      status,
      order_id: payment.order_id,
      payment_id: payment.cf_payment_id,
      amount: payment.payment_amount,
      payment_time: payment.payment_time,
      payment_method: payment.payment_group,
      message: status === "SUCCESS" ? "Payment successful!" : "Payment failed or cancelled",
    });

  } catch (error) {
    console.error("Status check failed:", error.message || error);
 
    return res.status(500).json({
      error: "Failed to check payment status",
      details: error.message || "Unknown error",
    });
  }
};