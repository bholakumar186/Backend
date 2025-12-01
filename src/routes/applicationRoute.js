import express from 'express';
import { createApplicationDraft,completeApplicationPayment } from '../controllers/applynow.js';

const applyNowRouter = express.Router();

applyNowRouter.post("/draft", createApplicationDraft);
applyNowRouter.post("/:application_id/complete-payment", completeApplicationPayment);

export default applyNowRouter;
