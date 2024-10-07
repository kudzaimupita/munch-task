import Joi from 'joi';

const createTask = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    dueDate: Joi.date().optional(),
    priority: Joi.number().integer().min(1).max(5).optional(),
    assigneeId: Joi.number().integer().required(),
    status: Joi.string().valid('open', 'in progress', 'completed').default('open')
  })
};

const getTasks = {
  query: Joi.object().keys({
    title: Joi.string().optional(),
    dueDate: Joi.date().optional(),
    priority: Joi.number().integer().optional(),
    status: Joi.string().valid('open', 'in progress', 'completed').optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional()
  })
};

const getTask = {
  params: Joi.object().keys({
    taskId: Joi.number().integer().required()
  })
};

const updateTask = {
  params: Joi.object().keys({
    taskId: Joi.number().integer().required()
  }),
  body: Joi.object()
    .keys({
      title: Joi.string().optional(),
      description: Joi.string().optional(),
      dueDate: Joi.date().optional(),
      priority: Joi.number().integer().min(1).max(5).optional()
    })
    .min(1)
};

const deleteTask = {
  params: Joi.object().keys({
    taskId: Joi.number().integer().required()
  })
};
const assignTask = {
  params: Joi.object().keys({
    taskId: Joi.number().required()
  }),
  body: Joi.object().keys({
    assigneeId: Joi.number().required()
  })
};

const updateTaskStatus = {
  params: Joi.object().keys({
    taskId: Joi.number().required()
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('open', 'in_progress', 'completed').required()
  })
};

export default {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus
};
