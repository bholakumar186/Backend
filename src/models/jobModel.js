import { pool } from '../config/db.js';

export const getJobs = async ({ page, pageSize, query, location, minVacancies }) => {
  const size = Math.min(100, Math.max(1, pageSize));
  const offset = (page - 1) * size;

  let where = [];
  let values = [];
  let idx = 1;

  if (query) {
      q = `%${query.toLowerCase()}%`;
    where.push(`(LOWER(job_title) LIKE $${idx} OR LOWER(job_description) LIKE $${idx + 1})`);
    values.push(q, q);
    idx += 2;
  }

  if (location) {
    where.push(`locations @> ARRAY[$${idx}]::text[]`);
    values.push(location);
    idx += 1;
  }

  if (minVacancies && !isNaN(minVacancies)) {
    where.push(`vacancies >= $${idx}`);
    values.push(parseInt(minVacancies));
    idx += 1;
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const countQuery = `SELECT COUNT(*) FROM jobs ${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, values.slice(0, idx - 1));
  const total = parseInt(countRows[0].count, 10);

  values.push(size, offset);
  const dataQuery = `
    SELECT
      id,
      job_title,
      job_description,
      key_responsibilities,
      required_skills,
      nice_to_have_skills,
      salary_range_raw AS "salary_range",
      locations,
      vacancies,
      age_min,
      age_max,
      CONCAT(age_min, '–', age_max, ' years') AS age_range
    FROM jobs
    ${whereClause}
    ORDER BY job_title
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const { rows } = await pool.query(dataQuery, values);

  return {
    jobs: rows.map(job => ({
      ...job,
      key_responsibilities: job.key_responsibilities || [],
      required_skills: job.required_skills || [],
      nice_to_have_skills: job.nice_to_have_skills || [],
      locations: job.locations || [],
    })),
    total,
    totalPages: Math.ceil(total / size),
  };
};
