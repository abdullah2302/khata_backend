import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    title: { type: String, required: true, trim: true },
    description: String,
    status: { type: String, enum: ['lead', 'in-progress', 'completed', 'cancelled'], default: 'lead' },
    budget: { type: Number, min: 0, default: 0 },
    deadline: Date
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
