import { pool } from "../config/db.js";

export const saveUser = async (req, res) => {
  const client = await pool.connect();
  console.log("Working:");

  try {
    const { email, id: uuid } = req.body;
    if (!email || !uuid) {
      return res.status(400).json({
        success: false,
        message: "Both email and uuid are required",
        timestamp: new Date().toISOString(),
        timezone: "Asia/Kolkata",
      });
    }

    const query = `
      INSERT INTO public.users (email, uuid, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING email, uuid, created_at
    `;

    const { rows } = await client.query(query, [email, uuid]);

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    if (rows.length === 0) {
      return res.json({
        success: true,
        message: "User already exists – no changes made",
        skipped: true,
        timestamp: new Date().toISOString(),
        timezone: "Asia/Kolkata",
        note: `API executed at ${now} IST (IN)`,
      });
    }

    res.status(201).json({
      success: true,
      message: "User saved successfully",
      user: rows[0],
      timestamp: new Date().toISOString(),
      timezone: "Asia/Kolkata",
      note: `API executed at ${now} IST (IN)`,
    });
  } catch (err) {
    console.error("saveUser error at November 17, 2025 04:53 PM IST:", err);

    res.status(500).json({
      success: false,
      message: "Database error",
      error: err.message,
      timestamp: new Date().toISOString(),
      timezone: "Asia/Kolkata",
    });
  } finally {
    client.release();
  }
};
