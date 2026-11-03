import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    invoiceNumber: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    dueDate: { type: Date, required: true },
    paidAt: Date
  },
  { timestamps: true }
);

// One invoice number per user
invoiceSchema.index({ owner: 1, invoiceNumber: 1 }, { unique: true });

// Keep paidAt in sync with status
invoiceSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.paidAt = this.status === 'paid' ? this.paidAt || new Date() : undefined;
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);
