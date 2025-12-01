import verifyToken from '../config/jwtConfig.js';

export const protectedRouter = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    next(); 
  });
};