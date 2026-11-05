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
  // the project price (budget): every invoice for the project is created from it
  budget: Joi.number().positive().required().messages({
    'any.required': 'Enter the project price',
    'number.base': 'The project price must be a number',
    'number.positive': 'The project price must be more than 0'
  }),
  deadline: Joi.date()
});

export const invoice = Joi.object({
  project: id.required().messages({ 'any.required': 'Choose the project this invoice is for' }),
  share: Joi.alternatives()
    .try(Joi.number().greater(0).max(100), Joi.string().valid('rest'))
    .required()
    .messages({
      'any.required': 'Choose how much of the project price this invoice is for',
      'alternatives.match': 'The share must be a percent between 0 and 100, or "rest"'
    }),
  status: Joi.string().valid('pending', 'paid'),
  dueDate: Joi.date().required()
});

export const invoiceUpdate = Joi.object({
  status: Joi.string().valid('pending', 'paid').required(),
  dueDate: Joi.date().required()
});
export const projectStatus = Joi.object({
  status: Joi.string().valid('lead', 'in-progress', 'completed', 'cancelled').required()
});

export const task = Joi.object({
  title: Joi.string().trim().min(1).max(120).required()
});

export const taskUpdate = Joi.object({
  done: Joi.boolean(),
  title: Joi.string().trim().min(1).max(120)
}).min(1);
