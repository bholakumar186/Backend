// middleware/verifyToken.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("SUPABASE_JWT_SECRET is missing in .env");
}

const options = {
  audience: 'authenticated',
  issuer: 'https://ktyrwmesabhoyhocbltr.supabase.co/auth/v1',
  algorithms: ['HS256'],
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, options, (err, decoded) => {
    if (err) {
      console.error("JWT Error:", err.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  });
};

export default verifyToken;