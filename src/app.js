import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import applyNowRouter from './routes/applicationRoute.js';
import jobsRouter    from './routes/jobsRoute.js';
import userRouter    from './routes/usersRoute.js';
import { protectedRouter } from './utils/protectRoute.js';
import resumesRouter from './routes/uploadResumeRoute.js';
import paymentRoutes from './routes/cashfreeRoute.js';
import contactusRouter from './routes/contactusRoute.js';
import grivanceRoute from './routes/grivanceRoute.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/apply',     protectedRouter,applyNowRouter);
app.use('/api/jobs',      jobsRouter);
app.use('/api/save-user', protectedRouter,userRouter);
app.use("/api",  resumesRouter);
app.use("/api/payments", protectedRouter,paymentRoutes);
app.use("/api/contact-us", contactusRouter);
app.use("/api/grievance", grivanceRoute);


app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

export default app;