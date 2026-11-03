import mongoose from 'mongoose';

// One document per user. invoiceSeq is increased atomically for every new invoice.
const counterSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  invoiceSeq: { type: Number, default: 0 }
});

export default mongoose.model('Counter', counterSchema);
