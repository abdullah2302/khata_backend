import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import syncOverdue from '../utils/syncOverdue.js';
import nextInvoiceNumber from '../utils/nextInvoiceNumber.js';
import { buildFinance, financeByProject, invoicedTotal } from '../utils/projectFinance.js';
import { round2 } from '../utils/money.js';
import { startOfToday } from '../utils/dates.js';
import { paginate, searchFilter, exactFilters, dateRange } from '../utils/query.js';

const listPopulate = [
  { path: 'client', select: 'name' },
  { path: 'project', select: 'title budget' }
];
const detailPopulate = [
  { path: 'client', select: 'name company email phone' },
  { path: 'project', select: 'title description budget' }
];

const findOwned = async (req) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
  if (!invoice) throw httpError(404, 'Invoice not found');
  return invoice;
};

// pending past its due date is overdue, overdue with a future due date is pending
const normalizeStatus = (invoice) => {
  const today = startOfToday();
  if (invoice.status === 'pending' && invoice.dueDate < today) invoice.status = 'overdue';
  else if (invoice.status === 'overdue' && invoice.dueDate >= today) invoice.status = 'pending';
};

// GET /api/invoices?status=pending&client=<id>&search=INV&from=2026-11-01&to=2026-12-31&sort=-amount
export const getInvoices = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const filter = {
    owner: req.user._id,
    ...exactFilters(req.query, ['status', 'client', 'project']),
    ...searchFilter(req.query.search, ['invoiceNumber']),
    ...dateRange('dueDate', req.query.from, req.query.to)
  };
  const result = await paginate(Invoice, filter, req.query, listPopulate);

  // One aggregation gives the paid totals of every project on this page
  const projects = new Map(result.items.filter((i) => i.project).map((i) => [String(i.project._id), i.project._id]));
  const totals = await financeByProject(req.user._id, [...projects.values()]);
  res.json({
    ...result,
    items: result.items.map((i) => ({
      ...i.toObject(),
      // what is still unpaid on the whole project (price minus everything paid so far)
      projectBalance: i.project ? buildFinance(i.project.budget, totals.get(String(i.project._id))).balance : null
    }))
  });
});

export const getInvoice = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const invoice = await (await findOwned(req)).populate(detailPopulate);
  const totals = invoice.project ? await financeByProject(req.user._id, [invoice.project._id]) : new Map();
  res.json({
    ...invoice.toObject(),
    // price, paid so far and the balance of the project this invoice belongs to
    projectFinance: invoice.project ? buildFinance(invoice.project.budget, totals.get(String(invoice.project._id))) : null
  });
});

// POST /api/invoices  body: { project, share, dueDate, status? }
// The user chooses the project and a share of its price: a percent (25, 50, a custom %) or "rest".
// The server works out everything else:
//   client        = the project's client
//   amount        = project price x percent  (or whatever is left, for "rest")
//   invoiceNumber = the next number in the sequence
// The amount can never go past what is still left of the project price.
export const createInvoice = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.body.project, owner: req.user._id });
  if (!project) throw httpError(400, 'Choose one of your projects');
  if (!(project.budget > 0)) throw httpError(400, 'This project has no price yet. Add the price to the project first.');

  const remaining = round2(project.budget - (await invoicedTotal(req.user._id, project._id)));
  if (remaining <= 0) throw httpError(400, 'The full price of this project is already invoiced. Raise the project price to bill more.');

  const { share } = req.body;
  let amount = share === 'rest' ? remaining : round2((project.budget * share) / 100);
  if (round2(amount - remaining) > 0.01) throw httpError(400, `That is more than what is left of the project price (${remaining} left).`);
  if (round2(remaining - amount) <= 0.01) amount = remaining; // the last share takes any leftover cents
  if (amount <= 0) throw httpError(400, 'That share is too small to invoice.');

  const invoice = new Invoice({
    owner: req.user._id,
    project: project._id,
    client: project.client,
    amount,
    percent: round2((amount / project.budget) * 100),
    status: req.body.status,
    dueDate: req.body.dueDate,
    invoiceNumber: await nextInvoiceNumber(req.user._id)
  });
  normalizeStatus(invoice);
  await invoice.save();
  res.status(201).json(invoice);
});

// PUT /api/invoices/:id  body: { dueDate, status }
// Number, client, project and amount never change after creation.
export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await findOwned(req);
  invoice.dueDate = req.body.dueDate;
  invoice.status = req.body.status;
  normalizeStatus(invoice);
  await invoice.save();
  res.json(invoice);
});

// PATCH /api/invoices/:id/paid
export const markInvoicePaid = asyncHandler(async (req, res) => {
  const invoice = await findOwned(req);
  invoice.status = 'paid';
  await invoice.save();
  res.json(invoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await findOwned(req);
  await invoice.deleteOne();
  res.json({ message: 'Invoice deleted' });
});