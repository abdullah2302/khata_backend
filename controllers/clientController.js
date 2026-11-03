import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import syncOverdue from '../utils/syncOverdue.js';
import { paginate, searchFilter } from '../utils/query.js';

const findOwned = async (req) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user._id });
  if (!client) throw httpError(404, 'Client not found');
  return client;
};

// GET /api/clients?page=1&limit=10&search=ali&sort=name
export const getClients = asyncHandler(async (req, res) => {
  const filter = { owner: req.user._id, ...searchFilter(req.query.search, ['name', 'company', 'email']) };
  res.json(await paginate(Client, filter, req.query));
});

export const getClient = asyncHandler(async (req, res) => res.json(await findOwned(req)));

// GET /api/clients/:id/overview -> client + their projects, invoices and totals
export const getClientOverview = asyncHandler(async (req, res) => {
  const client = await findOwned(req);
  await syncOverdue(req.user._id);
  const [projects, invoices] = await Promise.all([
    Project.find({ client: client._id, owner: req.user._id }).sort('-createdAt'),
    Invoice.find({ client: client._id, owner: req.user._id }).sort('-dueDate')
  ]);
  const sum = (list) => list.reduce((total, i) => total + i.amount, 0);
  const totals = {
    billed: sum(invoices),
    paid: sum(invoices.filter((i) => i.status === 'paid')),
    owed: sum(invoices.filter((i) => i.status !== 'paid'))
  };
  res.json({ client, projects, invoices, totals });
});

export const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...req.body, owner: req.user._id });
  res.status(201).json(client);
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await findOwned(req);
  Object.assign(client, req.body);
  await client.save();
  res.json(client);
});

export const deleteClient = asyncHandler(async (req, res) => {
  const client = await findOwned(req);
  const [projects, invoices] = await Promise.all([
    Project.countDocuments({ client: client._id }),
    Invoice.countDocuments({ client: client._id })
  ]);
  if (projects || invoices) {
    throw httpError(400, 'This client has projects or invoices. Delete those first.');
  }
  await client.deleteOne();
  res.json({ message: 'Client deleted' });
});
