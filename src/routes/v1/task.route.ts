import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import taskController from '../../controllers/task.controller';
import taskValidation from '../../validations/task.validation';
// import { taskValidation } from '../../validations'; // Update import to reference taskValidation
// import { taskController } from '../../controllers'; // Update import to reference taskController

const router = express.Router();

router
  .route('/')
  .post(auth('manageTasks'), validate(taskValidation.createTask), taskController.createTask)
  .get(auth('getTasks'), validate(taskValidation.getTasks), taskController.getTasks);

router
  .route('/:taskId')
  .get(auth('getTasks'), validate(taskValidation.getTask), taskController.getTask)
  .patch(auth('manageTasks'), validate(taskValidation.updateTask), taskController.updateTask)
  .delete(auth('manageTasks'), validate(taskValidation.deleteTask), taskController.deleteTask);

router
  .route('/:taskId/assign')
  .patch(auth('manageTasks'), validate(taskValidation.assignTask), taskController.assignTask);

router
  .route('/:taskId/status')
  .patch(
    auth('manageTasks'),
    validate(taskValidation.updateTaskStatus),
    taskController.updateTaskStatus
  );

export default router;
