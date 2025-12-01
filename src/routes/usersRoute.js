import express from "express";
import { saveUser } from "../controllers/saveusers.js";

const userRouter = express.Router();

userRouter.post("/", saveUser);

export default userRouter;
