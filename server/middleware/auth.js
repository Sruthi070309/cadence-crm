import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { httpError, wrap } from '../utils.js';

// Role is re-read from the DB on every request, so a demoted admin loses access immediately.
export const protect = wrap(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw httpError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw httpError(401, 'Session expired or token invalid. Please sign in again.'); }
  const user = await User.findById(payload.sub);
  if (!user) throw httpError(401, 'Account no longer exists');
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'You do not have permission to do that'));
