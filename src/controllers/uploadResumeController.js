import { s3, RESUME_BUCKET } from "../config/s3.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import mime from "mime";

const toSafeString = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (typeof v?.toString === "function") {
    try { return String(v.toString()).trim(); } catch { return ""; }
  }
  return "";
};
const requireStr = (v, name) => {
  const s = toSafeString(v);
  if (!s) { const e = new Error(`${name} is required`); e.status = 400; throw e; }
  return s;
};

const randomKey = (len=16) => crypto.randomBytes(len).toString("hex");

export const presignResumeUpload = async (req, res, next) => {
  try {
    const job_id = requireStr(req.body?.job_id, "job_id");
    const filename = requireStr(req.body?.filename, "filename");
    const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "pdf";
    const contentType = toSafeString(req.body?.contentType) || mime.getType(ext) || "application/pdf";

    if (!contentType.startsWith("application/pdf")) {
      const e = new Error("Only PDF uploads are allowed");
      e.status = 400; throw e;
    }

    const key = `resumes/${job_id}/${Date.now()}-${randomKey(8)}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: RESUME_BUCKET,
      Key: key,
      ContentType: "application/pdf",
      ACL: "private",
      ServerSideEncryption: "AES256"
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return res.status(200).json({
      uploadUrl,
      key,
      contentType,
      meta: { expiresInSeconds: 300 }
    });
  } catch (err) {
    next(err);
  }
};

export const getResumeViewUrl = async (req, res, next) => {
  try {
    const key = requireStr(req.query?.key, "key");

    const command = new GetObjectCommand({
      Bucket: RESUME_BUCKET,
      Key: key,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: `inline; filename="${key.split("/").pop()}"`
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
    return res.status(200).json({ url, expiresInSeconds: 300 });
  } catch (err) {
    next(err);
  }
};

