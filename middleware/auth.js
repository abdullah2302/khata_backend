import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';

export default asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw httpError(401, 'Not authorized');

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Invalid or expired token');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw httpError(401, 'User no longer exists');
  req.user = user;
  next();
});
