import express from "express";
import { createOrder, verifyPayment } from "../controllers/cashfreeController.js";

const razorpayRouter = express.Router();

razorpayRouter.post("/create-order", createOrder);
razorpayRouter.get("/verify-payment", verifyPayment);

export default razorpayRouter;
