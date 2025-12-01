import {submitGrievance} from "../controllers/grivanceController.js";
import { Router } from "express";

const grivanceRoute = Router();
grivanceRoute.post('/', submitGrievance);

export default grivanceRoute;
