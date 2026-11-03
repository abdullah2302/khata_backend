import Message from '../models/Message.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/contact (public)
export const sendMessage = asyncHandler(async (req, res) => {
  // Honeypot: bots fill the hidden field, real users do not
  if (req.body.website) return res.status(201).json({ message: 'Message received' });
  const { name, email, topic, message } = req.body;
  await Message.create({ name, email, topic, message });
  res.status(201).json({ message: 'Message received' });
});
