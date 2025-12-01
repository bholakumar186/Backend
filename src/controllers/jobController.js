import { pool } from "../config/db.js";

const toSafeString = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  if (typeof value.toString === "function") {
    try {
      const str = value.toString();
      return (typeof str === "string" ? str : "").trim();
    } catch {
      return "";
    }
  }
  return "";
};

const toSafeInt = (value, fallback = 1) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? fallback : Math.max(0, num);
};

export const getJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      query = "",
      location = "",
      minVacancies = "",
    } = req.query;

    const currentPage = Math.max(1, toSafeInt(page, 1));
    const size = Math.max(1, Math.min(100, toSafeInt(pageSize, 10)));
    const offset = (currentPage - 1) * size;

    const searchQuery = toSafeString(query);
    const searchLocation = toSafeString(location);
    const minVacanciesNum = toSafeInt(minVacancies, -1); // -1 = ignore

    const where = [];
    const params = [];
    let idx = 1;

    if (searchQuery) {
      where.push(`(job_title ILIKE $${idx} OR job_description ILIKE $${idx})`);
      params.push(`%${searchQuery}%`);
      idx++;
    }

    if (searchLocation) {
      where.push(`locations ILIKE $${idx}`); 
      params.push(`%${searchLocation}%`);
      idx++;
    }

    if (minVacanciesNum >= 0) {
      where.push(`vacancies >= $${idx}`);
      params.push(minVacanciesNum);
      idx++;
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) FROM jobs ${whereClause}`;
    const {
      rows: [{ count }],
    } = await pool.query(countQuery, params);
    const total = parseInt(count, 10) || 0;

    const selectQuery = `
      SELECT 
        job_id,
        job_title,
        job_description,
        key_responsibilities,
        required_skills,
        nice_to_have_skills,
        locations,
        vacancies,
        created_at,
        updated_at
      FROM jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const { rows: jobs } = await pool.query(selectQuery, [
      ...params,
      size,
      offset,
    ]);

    const totalPages = size > 0 ? Math.ceil(total / size) : 1;

    res.status(200).json({
      jobs,
      total,
      totalPages,
      page: currentPage,
      pageSize: size,
      timestamp: new Date().toISOString(), 
      timezone: "Asia/Kolkata", 
      note: "All job data returned as per DBeaver schema (Nov 10, 2025)",
    });
  } catch (err) {
    console.error("getJobs error at 2025-11-10 11:19 AM IST:", {
      message: err.message,
      stack: err.stack,
      queryParams: req.query,
    });
    next(err);
  }
};
