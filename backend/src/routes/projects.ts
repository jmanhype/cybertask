import { Router } from 'express';
import Joi from 'joi';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
  getProjectTasks,
} from '../controllers/projectController';
import { validateRequest, projectSchemas, commonSchemas } from '../middleware/validation';
import { requireManager } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', validateRequest({ body: projectSchemas.create }), createProject);

/**
 * @route   GET /api/projects
 * @desc    Get all projects for the user
 * @access  Private
 */
router.get('/', getAllProjects);

/**
 * @route   GET /api/projects/:projectId
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:projectId', validateRequest({ params: commonSchemas.projectId }), getProjectById);

/**
 * @route   PUT /api/projects/:projectId
 * @desc    Update project
 * @access  Private (Owner/Admin)
 */
router.put('/:projectId', 
  validateRequest({ 
    params: commonSchemas.projectId, 
    body: projectSchemas.update 
  }), 
  updateProject
);

/**
 * @route   DELETE /api/projects/:projectId
 * @desc    Delete project
 * @access  Private (Owner/Admin)
 */
router.delete('/:projectId', 
  validateRequest({ params: commonSchemas.projectId }), 
  deleteProject
);

/**
 * @route   GET /api/projects/:projectId/members
 * @desc    Get project members
 * @access  Private
 */
router.get('/:projectId/members', 
  validateRequest({ params: commonSchemas.projectId }), 
  getProjectMembers
);

/**
 * @route   POST /api/projects/:projectId/members
 * @desc    Add project member
 * @access  Private (Owner/Admin)
 */
router.post('/:projectId/members', 
  validateRequest({ params: commonSchemas.projectId }), 
  addProjectMember
);

/**
 * @route   DELETE /api/projects/:projectId/members/:userId
 * @desc    Remove project member
 * @access  Private (Owner/Admin)
 */
router.delete('/:projectId/members/:userId', 
  validateRequest({ 
    params: Joi.object({
      projectId: Joi.string().required(),
      userId: Joi.string().required()
    })
  }), 
  removeProjectMember
);

/**
 * @route   GET /api/projects/:projectId/tasks
 * @desc    Get project tasks
 * @access  Private
 */
router.get('/:projectId/tasks', 
  validateRequest({ params: commonSchemas.projectId }), 
  getProjectTasks
);

export default router;