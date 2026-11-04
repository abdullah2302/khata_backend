import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import { round2 } from './money.js';

export const emptyClientFinance = { billed: 0, paid: 0, owed: 0, invoices: 0 };

// Billed, paid and still-owed amounts for a list of clients, using ONE aggregation
// (instead of one query per client). Returns a Map(clientId -> totals).
export const financeByClient = async (owner, clientIds) => {
  if (!clientIds.length) return new Map();
  const rows = await Invoice.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(owner), client: { $in: clientIds } } },
    {
      $group: {
        _id: '$client',
        billed: { $sum: '$amount' },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
        invoices: { $sum: 1 }
      }
    }
  ]);
  return new Map(
    rows.map((r) => [
      String(r._id),
      { billed: round2(r.billed), paid: round2(r.paid), owed: round2(r.billed - r.paid), invoices: r.invoices }
    ])
  );
};