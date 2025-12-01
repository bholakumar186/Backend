import { pool } from "../config/db.js";
import createHttpError from "http-errors";

export const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, issue_category, message } = req.body;
    if (!name?.trim()) return next(createHttpError(400, "Name is required"));
    if (!email?.trim()) return next(createHttpError(400, "Email is required"));
    if (!issue_category?.trim()) return next(createHttpError(400, "Issue category required"));
    if (!message?.trim()) return next(createHttpError(400, "Message required"));

    const result = await pool.query(
      `INSERT INTO contactusdata 
       (name, email, issue_category, message, status)
       VALUES ($1, $2, $3, $4, 'new')
       RETURNING id, created_at`,
      [name.trim(), email.trim().toLowerCase(), issue_category.trim(), message.trim()]
    );

    res.status(201).json({
      success: true,
      message: "Thank you! We'll get back to you soon.",
      data: {
        inquiry_id: result.rows[0].id,
        submitted_at: result.rows[0].created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};