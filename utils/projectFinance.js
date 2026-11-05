import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import { round2 } from './money.js';

const toId = (id) => new mongoose.Types.ObjectId(id);

// Budget vs invoices for one project. Pure function, easy to test.
//   invoiced    = every invoice linked to the project (pending, overdue or paid)
//   paid        = invoices already paid
//   outstanding = invoiced but not paid yet
//   remaining   = budget - invoiced (null when the project has no budget)
export const buildFinance = (budget, { invoiced = 0, paid = 0, count = 0 } = {}) => {
  const b = round2(budget || 0);
  const inv = round2(invoiced);
  const pd = round2(paid);
  return {
    budget: b,
    invoiced: inv,
    paid: pd,
    outstanding: round2(inv - pd),
    remaining: b > 0 ? round2(b - inv) : null,
     balance: b > 0 ? round2(b - pd) : null, // budget - paid: what the client still has to pay
    percentInvoiced: b > 0 ? Math.round((inv / b) * 100) : null,
    count
  };
};

// Invoice totals for many projects with a single query. Returns a Map(projectId -> totals).
export const financeByProject = async (owner, projectIds) => {
  if (!projectIds.length) return new Map();
  const rows = await Invoice.aggregate([
    { $match: { owner: toId(owner), project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        invoiced: { $sum: '$amount' },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
        count: { $sum: 1 }
      }
    }
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
};

// Total already invoiced on a project, optionally ignoring one invoice (the one being edited).
export const invoicedTotal = async (owner, projectId, excludeInvoiceId) => {
  const match = { owner: toId(owner), project: toId(projectId) };
  if (excludeInvoiceId) match._id = { $ne: toId(excludeInvoiceId) };
  const [row] = await Invoice.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return round2(row?.total || 0);
};


