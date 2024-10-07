import { Task, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';

/**
 * Create a task
 * @param {Object} taskBody
 * @returns {Promise<Task>}
 */
const createTask = async (taskBody: {
  title: string;
  description?: string;
  dueDate?: Date | null;
  priority: number;
  assigneeId?: number;
  status?: string;
}): Promise<Task> => {
  const { title, description, dueDate, priority, assigneeId, status } = taskBody;
  console.log(assigneeId);
  const task = await prisma.task.create({
    data: {
      title,
      description,
      dueDate,
      priority,
      assigneeId,
      status: status || 'open'
      // labels: {
      //   connect: labels ? labels.map((label) => ({ id: label.id })) : [] // Connect existing labels if provided
      // }
    }
  });

  return task;
};
/**
 * Query for tasks
 * @param {Object} filter - Prisma filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTasks = async <Key extends keyof Task>(
  filter: object,
  options: {
    limit?: number;
    page?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
  },
  keys: Key[] = [
    'id',
    'title',
    'description',
    'dueDate',
    'priority',
    'assigneeId',
    'createdAt',
    'updatedAt',
    'labels'
  ] as Key[]
): Promise<Pick<Task, Key>[]> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy;
  const sortType = options.sortType ?? 'desc';
  const tasks = await prisma.task.findMany({
    where: filter,
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {}),
    // skip: page * limit,
    // take: limit,
    orderBy: sortBy ? { [sortBy]: sortType } : undefined
  });
  return tasks as Pick<Task, Key>[];
};

/**
 * Get task by id
 * @param {ObjectId} id
 * @param {Array<Key>} keys
 * @returns {Promise<Pick<Task, Key> | null>}
 */
const getTaskById = async <Key extends keyof Task>(
  id: number,
  keys: Key[] = [
    'id',
    'title',
    'description',
    'dueDate',
    'priority',
    'assigneeId',
    'createdAt',
    'updatedAt',
    'labels'
  ] as Key[]
): Promise<Pick<Task, Key> | null> => {
  return prisma.task.findUnique({
    where: { id },
    select: keys.reduce((obj, k) => ({ ...obj, [k]: true }), {})
  }) as Promise<Pick<Task, Key> | null>;
};

/**
 * Update task by id
 * @param {ObjectId} taskId
 * @param {Object} updateBody
 * @returns {Promise<Task>}
 */
const updateTaskById = async <Key extends keyof Task>(
  taskId: number,
  updateBody: Partial<Prisma.TaskUpdateInput>
): Promise<Pick<Task, Key> | null> => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: updateBody
  });

  return updatedTask as Pick<Task, Key> | null;
};

/**
 * Delete task by id
 * @param {ObjectId} taskId
 * @returns {Promise<Task>}
 */
const deleteTaskById = async (taskId: number): Promise<Task> => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  await prisma.task.delete({ where: { id: task.id } });
  return task;
};

export default {
  createTask,
  queryTasks,
  getTaskById,
  updateTaskById,
  deleteTaskById
};
