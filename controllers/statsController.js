import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Project from '../models/Project.js';
import asyncHandler from '../utils/asyncHandler.js';
import syncOverdue from '../utils/syncOverdue.js';
import { startOfToday } from '../utils/dates.js';
import { round2 } from '../utils/money.js';
import { buildFinance, financeByProject } from '../utils/projectFinance.js';

const ownerId = (req) => new mongoose.Types.ObjectId(req.user._id);

// GET /api/stats/summary  -> totals per invoice status
export const summary = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const data = await Invoice.aggregate([
    { $match: { owner: ownerId(req) } },
    { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  res.json(data);
});

// GET /api/stats/monthly-earnings?year=2026  -> paid invoices grouped by month
export const monthlyEarnings = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const data = await Invoice.aggregate([
    {
      $match: {
        owner: ownerId(req),
        status: 'paid',
        paidAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) }
      }
    },
    { $group: { _id: { $month: '$paidAt' }, total: { $sum: '$amount' }, invoices: { $sum: 1 } } },
    { $project: { _id: 0, month: '$_id', total: 1, invoices: 1 } },
    { $sort: { month: 1 } }
  ]);
  res.json({ year, data });
});

// GET /api/stats/pending-by-client  -> unpaid amount per client
export const pendingByClient = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const data = await Invoice.aggregate([
    { $match: { owner: ownerId(req), status: { $in: ['pending', 'overdue'] } } },
    {
      $group: {
        _id: '$client',
        totalPending: { $sum: '$amount' },
        invoices: { $sum: 1 },
        nextDue: { $min: '$dueDate' }
      }
    },
    { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
    { $unwind: '$client' },
    {
      $project: {
        _id: 0,
        clientId: '$_id',
        clientName: '$client.name',
        totalPending: 1,
        invoices: 1,
        nextDue: 1
      }
    },
    { $sort: { totalPending: -1 } }
  ]);
  res.json(data);
});

// GET /api/stats/top-clients  -> top 5 clients by paid revenue
export const topClients = asyncHandler(async (req, res) => {
  const data = await Invoice.aggregate([
    { $match: { owner: ownerId(req), status: 'paid' } },
    { $group: { _id: '$client', total: { $sum: '$amount' }, invoices: { $sum: 1 } } },
    { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
    { $unwind: '$client' },
    { $project: { _id: 0, clientId: '$_id', clientName: '$client.name', total: 1, invoices: 1 } },
    { $sort: { total: -1 } },
    { $limit: 5 }
  ]);
  res.json(data);
});

// GET /api/stats/projects-by-status  -> project count and budget per status
export const projectsByStatus = asyncHandler(async (req, res) => {
  const data = await Project.aggregate([
    { $match: { owner: ownerId(req) } },
    { $group: { _id: '$status', count: { $sum: 1 }, budget: { $sum: '$budget' } } },
    { $sort: { count: -1 } }
  ]);
  res.json(data);
});

// GET /api/stats/upcoming  -> pending invoices due in the next 14 days
export const upcoming = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const start = startOfToday();
  const in14 = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const data = await Invoice.find({ owner: req.user._id, status: 'pending', dueDate: { $gte: start, $lte: in14 } })
    .sort('dueDate')
    .limit(5)
    .populate('client', 'name');
  res.json(data);
});

// GET /api/stats/billed-vs-paid?year=2026  -> per month: invoiced amount vs received amount
export const billedVsPaid = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const from = new Date(`${year}-01-01`);
  const to = new Date(`${year + 1}-01-01`);

  const byMonth = (field, extraMatch = {}) =>
    Invoice.aggregate([
      { $match: { owner: ownerId(req), ...extraMatch, [field]: { $gte: from, $lt: to } } },
      { $group: { _id: { $month: `$${field}` }, total: { $sum: '$amount' } } }
    ]);

  const [billed, paid] = await Promise.all([byMonth('createdAt'), byMonth('paidAt', { status: 'paid' })]);
  const data = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    billed: billed.find((b) => b._id === i + 1)?.total || 0,
    paid: paid.find((p) => p._id === i + 1)?.total || 0
  }));
  res.json({ year, data });
});

// GET /api/stats/budget-usage -> budget vs invoiced per project, plus unbilled budget on open projects
export const budgetUsage = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const projects = await Project.find({ owner: req.user._id, budget: { $gt: 0 }, status: { $ne: 'cancelled' } }).populate('client', 'name');
  const totals = await financeByProject(req.user._id, projects.map((p) => p._id));

  const items = projects.map((p) => ({
    projectId: p._id,
    title: p.title,
    clientName: p.client?.name,
    status: p.status,
    ...buildFinance(p.budget, totals.get(String(p._id)))
  }));
  const toInvoice = round2(
    items.filter((i) => i.status === 'lead' || i.status === 'in-progress').reduce((sum, i) => sum + Math.max(i.remaining, 0), 0)
  );
  res.json({ toInvoice, items: items.sort((a, b) => b.budget - a.budget).slice(0, 8) });
});
