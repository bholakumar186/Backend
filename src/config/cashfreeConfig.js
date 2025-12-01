import dotenv from "dotenv";
import { Cashfree } from "cashfree-pg";

dotenv.config();

const cashfree = new Cashfree(
  process.env.CASHFREE_ENV,
  process.env.CASHFREE_APPID,
  process.env.CASHFREE_KEY_SECRET
);

export default cashfree;