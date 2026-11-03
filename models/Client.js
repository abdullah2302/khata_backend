import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model('Client', clientSchema);
