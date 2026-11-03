import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import assertOwned from '../utils/assertOwned.js';
import syncOverdue from '../utils/syncOverdue.js';
import { buildFinance, financeByProject, invoicedTotal } from '../utils/projectFinance.js';
import { paginate, searchFilter, exactFilters, dateRange } from '../utils/query.js';

const clientPopulate = { path: 'client', select: 'name company' };
const MAX_TASKS = 50;

// % of tasks ticked off, or null when the project has no tasks
const progressOf = (tasks = []) => (tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : null);

const findOwned = async (req) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw httpError(404, 'Project not found');
  return project;
};

// GET /api/projects?status=in-progress&client=<id>&search=site&sort=-budget
// Every project comes back with a `finance` block (budget, invoiced, paid, remaining).
export const getProjects = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const filter = {
    owner: req.user._id,
    ...exactFilters(req.query, ['status', 'client']),
    ...searchFilter(req.query.search, ['title', 'description']),
    ...dateRange('deadline', req.query.from, req.query.to)
  };
  const result = await paginate(Project, filter, req.query, clientPopulate);
  const totals = await financeByProject(req.user._id, result.items.map((p) => p._id));
  res.json({
    ...result,
    items: result.items.map((p) => ({
      ...p.toObject(),
      finance: buildFinance(p.budget, totals.get(String(p._id))),
      progress: progressOf(p.tasks)
    }))
  });
});

// GET /api/projects/:id -> project + finance + its invoices
export const getProject = asyncHandler(async (req, res) => {
  await syncOverdue(req.user._id);
  const project = await findOwned(req);
  await project.populate(clientPopulate);
  const [totals, invoices] = await Promise.all([
    financeByProject(req.user._id, [project._id]),
    Invoice.find({ owner: req.user._id, project: project._id }).sort('-dueDate')
  ]);
  res.json({
    ...project.toObject(),
    finance: buildFinance(project.budget, totals.get(String(project._id))),
    progress: progressOf(project.tasks),
    invoices
  });
});

export const createProject = asyncHandler(async (req, res) => {
  await assertOwned(Client, req.body.client, req.user._id, 'client');
  const project = await Project.create({ ...req.body, owner: req.user._id });
  res.status(201).json(project);
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  await assertOwned(Client, req.body.client, req.user._id, 'client');

  // Invoices were issued to this project's client, so the client cannot change afterwards.
  if (String(req.body.client) !== String(project.client) && (await Invoice.exists({ project: project._id }))) {
    throw httpError(400, 'This project already has invoices, so its client cannot be changed.');
  }
  // The budget cannot drop below what has already been invoiced.
  if (req.body.budget > 0) {
    const invoiced = await invoicedTotal(req.user._id, project._id);
    if (req.body.budget < invoiced) {
      throw httpError(400, `The budget cannot be lower than the ${invoiced} already invoiced on this project.`);
    }
  }

  Object.assign(project, req.body);
  await project.save();
  res.json(project);
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  // Invoices are kept (they are payment history), they just lose the project link.
  await Invoice.updateMany({ project: project._id }, { $unset: { project: 1 } });
  await project.deleteOne();
  res.json({ message: 'Project deleted' });
});

// PATCH /api/projects/:id/status  (used by the board view and the status dropdown)
export const setStatus = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  project.status = req.body.status;
  await project.save();
  res.json(project);
});

// ---- task checklist (embedded in the project) ----
// POST /api/projects/:id/tasks
export const addTask = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  if (project.tasks.length >= MAX_TASKS) throw httpError(400, `A project can have at most ${MAX_TASKS} tasks.`);
  project.tasks.push({ title: req.body.title });
  await project.save();
  res.status(201).json(project.tasks);
});

// PATCH /api/projects/:id/tasks/:taskId
export const updateTask = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  const task = project.tasks.id(req.params.taskId);
  if (!task) throw httpError(404, 'Task not found');
  if (req.body.done !== undefined) task.done = req.body.done;
  if (req.body.title) task.title = req.body.title;
  await project.save();
  res.json(project.tasks);
});

// DELETE /api/projects/:id/tasks/:taskId
export const deleteTask = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  if (!project.tasks.id(req.params.taskId)) throw httpError(404, 'Task not found');
  project.tasks.pull(req.params.taskId);
  await project.save();
  res.json(project.tasks);
});
