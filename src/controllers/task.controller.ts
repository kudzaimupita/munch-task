/* eslint-disable @typescript-eslint/ban-ts-comment */
import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { taskService } from '../services';

const createTask = catchAsync(async (req, res) => {
  // @ts-ignore
  const task = await taskService.createTask(req.body);
  res.status(httpStatus.CREATED).send(task);
});

const getTasks = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['title', 'status', ' priority']);
  // @ts-ignore
  filter['assigneeId'] = req?.user?.['id'];
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.queryTasks(filter, options);
  res.send(result);
});

const getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  res.send(task);
});

const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTaskById(req.params.taskId, req.body);
  res.send(task);
});

const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTaskById(req.params.taskId);
  res.status(httpStatus.NO_CONTENT).send();
});
const assignTask = catchAsync(async (req, res) => {
  const { assigneeId } = req.body;
  const taskId = Number(req.params.taskId); // Ensure taskId is a number

  if (!assigneeId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assignee ID is required');
  }

  // Update the task with the new assignee
  const task = await taskService.updateTaskById(taskId, {
    assignee: { connect: { id: assigneeId } } // Use connect to update the assignee
  });
  res.send(task);
});

const updateTaskStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const taskId = Number(req.params.taskId); // Ensure taskId is a number

  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Status is required');
  }

  // Update the task with the new status
  const task = await taskService.updateTaskById(taskId, {
    status // Directly update the status
  });
  res.send(task);
});

export default {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus
};
