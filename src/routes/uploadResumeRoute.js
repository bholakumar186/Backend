import express from "express";
import { presignResumeUpload, getResumeViewUrl } from "../controllers/uploadResumeController.js";

const resumeUploaderRouter = express.Router();

resumeUploaderRouter.post("/resumes/presign", presignResumeUpload);
resumeUploaderRouter.get("/resumes/view-url", getResumeViewUrl);

export default resumeUploaderRouter;
