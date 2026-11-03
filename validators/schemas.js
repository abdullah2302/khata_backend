import Joi from 'joi';

const id = Joi.string().hex().length(24);
const text = Joi.string().trim().allow('');

export const register = Joi.object({
  name: Joi.string().trim().min(2).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(6).required()
});

export const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required()
});

export const profile = Joi.object({
  name: Joi.string().trim().min(2).required(),
  email: Joi.string().trim().lowercase().email().required()
});

export const password = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const contact = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().required(),
  topic: Joi.string().valid('Question', 'Bug report', 'Feature request', 'Other'),
  message: Joi.string().trim().min(10).max(2000).required(),
  website: Joi.string().allow('') // honeypot field, real users leave it empty
});

export const client = Joi.object({
  name: Joi.string().trim().min(2).required(),
  company: text,
  email: Joi.string().trim().email().allow(''),
  phone: text,
  notes: text
});

export const project = Joi.object({
  client: id.required(),
  title: Joi.string().trim().min(2).required(),
  description: text,
  status: Joi.string().valid('lead', 'in-progress', 'completed', 'cancelled'),
  budget: Joi.number().min(0),
  deadline: Joi.date()
});

export const invoice = Joi.object({
  client: id.required(),
  project: id,
  amount: Joi.number().min(0).required(),
  status: Joi.string().valid('pending', 'paid', 'overdue'),
  dueDate: Joi.date().required()
});
