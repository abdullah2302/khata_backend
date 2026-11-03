import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: { type: String, enum: ['Question', 'Bug report', 'Feature request', 'Other'], default: 'Question' },
    message: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
