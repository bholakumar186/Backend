import {submitContactForm} from "../controllers/contactUsController.js";
import { Router } from "express";

const contactusRouter = Router();
contactusRouter.post('/', submitContactForm);

export default contactusRouter;
