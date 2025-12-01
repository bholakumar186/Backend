import { protectedRouter } from "../utils/protectRoute.js";
import { getJobs } from "../controllers/jobController.js";
import { Router } from "express";

const jobRouter = Router();
jobRouter.get('/', getJobs);

export default jobRouter;
