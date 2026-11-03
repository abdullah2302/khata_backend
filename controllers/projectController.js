import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import asyncHandler from '../utils/asyncHandler.js';
import httpError from '../utils/httpError.js';
import assertOwned from '../utils/assertOwned.js';
import { paginate, searchFilter, exactFilters, dateRange } from '../utils/query.js';

const clientPopulate = { path: 'client', select: 'name company' };

const findOwned = async (req) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw httpError(404, 'Project not found');
  return project;
};

// GET /api/projects?status=in-progress&client=<id>&search=site&from=2026-01-01&to=2026-12-31
export const getProjects = asyncHandler(async (req, res) => {
  const filter = {
    owner: req.user._id,
    ...exactFilters(req.query, ['status', 'client']),
    ...searchFilter(req.query.search, ['title', 'description']),
    ...dateRange('deadline', req.query.from, req.query.to)
  };
  res.json(await paginate(Project, filter, req.query, clientPopulate));
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  res.json(await project.populate(clientPopulate));
});

export const createProject = asyncHandler(async (req, res) => {
  await assertOwned(Client, req.body.client, req.user._id, 'client');
  const project = await Project.create({ ...req.body, owner: req.user._id });
  res.status(201).json(project);
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  await assertOwned(Client, req.body.client, req.user._id, 'client');
  Object.assign(project, req.body);
  await project.save();
  res.json(project);
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await findOwned(req);
  await Invoice.updateMany({ project: project._id }, { $unset: { project: 1 } });
  await project.deleteOne();
  res.json({ message: 'Project deleted' });
});
