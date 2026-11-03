import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });
const authResponse = (user) => ({ token: sign(user._id), user: publicUser(user) });

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw httpError(400, 'Email already registered');
  const user = await User.create(req.body);
  res.status(201).json(authResponse(user));
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw httpError(401, 'Invalid email or password');
  res.json(authResponse(user));
});

// GET /api/auth/me
export const me = (req, res) => res.json(publicUser(req.user));

// PUT /api/auth/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (email !== req.user.email && (await User.exists({ email, _id: { $ne: req.user._id } }))) {
    throw httpError(400, 'That email is already in use');
  }
  req.user.name = name;
  req.user.email = email;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// PUT /api/auth/password
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  // 400 (not 401) so the frontend does not treat this as an expired session
  if (!(await user.matchPassword(req.body.currentPassword))) throw httpError(400, 'Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
