import { pool } from "../config/db.js";
import createHttpError from "http-errors";

export const submitGrievance = async (req, res, next) => {
  try {
    const { name, email, grievance_category, description } = req.body;

    if (!name?.trim()) return next(createHttpError(400, "Name is required"));
    if (!email?.trim()) return next(createHttpError(400, "Email required"));
    if (!grievance_category?.trim())
      return next(createHttpError(400, "Grievance category required"));
    if (!description?.trim())
      return next(createHttpError(400, "Description required"));

    const year = new Date().getFullYear();

    const seq = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 AS seq
       FROM grievances
       WHERE ticket_number LIKE $1`,
      [`GRV-${year}-%`]
    );

    const ticketNumber = `GRV-${year}-${String(seq.rows[0].seq).padStart(
      4,
      "0"
    )}`;

    const result = await pool.query(
      `INSERT INTO grievances 
       (name, email, grievance_category, description, ticket_number, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, ticket_number, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        grievance_category.trim(),
        description.trim(),
        ticketNumber,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Grievance registered successfully!",
      data: {
        grievance_id: result.rows[0].id,
        ticket_number: result.rows[0].ticket_number,
        status: "pending",
        submitted_at: result.rows[0].created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};