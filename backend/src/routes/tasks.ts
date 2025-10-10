import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  addTaskComment,
  getTaskComments,
  archiveTask,
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
} from '../controllers/taskController';
import { validateRequest, taskSchemas, commonSchemas } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', validateRequest({ body: taskSchemas.create }), createTask);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for the user
 * @access  Private
 */
router.get('/', getAllTasks);

/**
 * @route   GET /api/tasks/:taskId
 * @desc    Get task by ID
 * @access  Private
 */
router.get('/:taskId', validateRequest({ params: commonSchemas.taskId }), getTaskById);

/**
 * @route   PUT /api/tasks/:taskId
 * @desc    Update task
 * @access  Private
 */
router.put('/:taskId', 
  validateRequest({ 
    params: commonSchemas.taskId, 
    body: taskSchemas.update 
  }), 
  updateTask
);

/**
 * @route   DELETE /api/tasks/:taskId
 * @desc    Delete task
 * @access  Private
 */
router.delete('/:taskId', 
  validateRequest({ params: commonSchemas.taskId }), 
  deleteTask
);

/**
 * @route   POST /api/tasks/:taskId/assign
 * @desc    Assign task to user
 * @access  Private
 */
router.post('/:taskId/assign', 
  validateRequest({ params: commonSchemas.taskId }), 
  assignTask
);

/**
 * @route   POST /api/tasks/:taskId/unassign
 * @desc    Unassign task
 * @access  Private
 */
router.post('/:taskId/unassign', 
  validateRequest({ params: commonSchemas.taskId }), 
  unassignTask
);

/**
 * @route   POST /api/tasks/:taskId/archive
 * @desc    Archive task
 * @access  Private
 */
router.post('/:taskId/archive', 
  validateRequest({ params: commonSchemas.taskId }), 
  archiveTask
);

/**
 * @route   GET /api/tasks/:taskId/comments
 * @desc    Get task comments
 * @access  Private
 */
router.get('/:taskId/comments', 
  validateRequest({ params: commonSchemas.taskId }), 
  getTaskComments
);

/**
 * @route   POST /api/tasks/:taskId/comments
 * @desc    Add task comment
 * @access  Private
 */
router.post('/:taskId/comments', 
  validateRequest({ 
    params: commonSchemas.taskId, 
    body: taskSchemas.comment 
  }), 
  addTaskComment
);

/**
 * @route   GET /api/tasks/:taskId/dependencies
 * @desc    Get task dependencies
 * @access  Private
 */
router.get('/:taskId/dependencies', 
  validateRequest({ params: commonSchemas.taskId }), 
  getTaskDependencies
);

/**
 * @route   POST /api/tasks/:taskId/dependencies
 * @desc    Add task dependency
 * @access  Private
 */
router.post('/:taskId/dependencies', 
  validateRequest({ params: commonSchemas.taskId }), 
  addTaskDependency
);

/**
 * @route   DELETE /api/tasks/:taskId/dependencies/:dependencyId
 * @desc    Remove task dependency
 * @access  Private
 */
router.delete('/:taskId/dependencies/:dependencyId', 
  validateRequest({ params: commonSchemas.taskId }), 
  removeTaskDependency
);

export default router;