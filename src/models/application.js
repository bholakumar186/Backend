import { pool } from '../config/db.js';

export async function createApplication(data) {
  const {
    name,
    email,
    phone,
    qualification,
    experience,
    skills,
    resume_url,
    job_id,
  } = data;

  const query = `
    INSERT INTO job_application (application_id, job_id, email, application_status, submitted_on)
    VALUES (gen_random_uuid(), $1, $2, 'submitted', NOW())
    RETURNING application_id;
  `;
  const result = await pool.query(query, [job_id, email]);
  const applicationId = result.rows[0].application_id;

  const dataQuery = `
    INSERT INTO application_data (application_id, name, email, phone, qualification, experience, skills, resume_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
  `;
  await pool.query(dataQuery, [
    applicationId,
    name,
    email,
    phone,
    qualification,
    experience,
    skills,
    resume_url,
  ]);

  return { application_id: applicationId, email };
}
