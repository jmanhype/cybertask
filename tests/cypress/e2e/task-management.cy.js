describe('Task Management', () => {
  const testUser = {
    email: 'cypress@example.com',
    password: 'CypressTest123!',
    firstName: 'Cypress',
    lastName: 'User',
  };

  const testProject = {
    name: 'Test Project',
    description: 'A project for testing task management',
  };

  const testTask = {
    title: 'Sample Task',
    description: 'This is a test task for automation',
    status: 'TODO',
    priority: 'MEDIUM',
    estimatedHours: 8,
    tags: ['frontend', 'testing'],
    dueDate: '2024-12-31',
  };

  let userId, projectId, taskId;

  beforeEach(() => {
    // Reset database and create test data
    cy.task('db:seed');
    
    // Create test user and project
    cy.task('db:createUser', testUser).then((user) => {
      userId = user.id;
      
      cy.task('db:createProject', { 
        ...testProject, 
        ownerId: userId 
      }).then((project) => {
        projectId = project.id;
      });
    });

    // Login user
    cy.login(testUser.email, testUser.password);
  });

  describe('Task Creation', () => {
    it('should create a new task successfully', () => {
      cy.visit('/dashboard/tasks');
      
      // Click create task button
      cy.get('[data-testid="create-task-button"]').click();
      
      // Fill out task form
      cy.get('[data-testid="task-title-input"]').type(testTask.title);
      cy.get('[data-testid="task-description-input"]').type(testTask.description);
      
      // Select project
      cy.get('[data-testid="project-select"]').click();
      cy.get(`[data-testid="project-option-${projectId}"]`).click();
      
      // Set priority
      cy.get('[data-testid="priority-select"]').select(testTask.priority);
      
      // Set estimated hours
      cy.get('[data-testid="estimated-hours-input"]').type(testTask.estimatedHours.toString());
      
      // Add tags
      testTask.tags.forEach(tag => {
        cy.get('[data-testid="tags-input"]').type(`${tag}{enter}`);
      });
      
      // Set due date
      cy.get('[data-testid="due-date-input"]').type(testTask.dueDate);
      
      // Submit form
      cy.get('[data-testid="create-task-submit"]').click();
      
      // Verify task was created
      cy.get('[data-testid="success-message"]').should('contain', 'Task created successfully');
      
      // Should appear in task list
      cy.get('[data-testid="task-list"]').should('contain', testTask.title);
      cy.get('[data-testid="task-list"]').should('contain', testTask.description);
    });

    it('should validate required fields', () => {
      cy.visit('/dashboard/tasks');
      
      cy.get('[data-testid="create-task-button"]').click();
      
      // Try to submit empty form
      cy.get('[data-testid="create-task-submit"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="title-error"]').should('contain', 'Title is required');
      cy.get('[data-testid="project-error"]').should('contain', 'Project is required');
      cy.get('[data-testid="priority-error"]').should('contain', 'Priority is required');
    });

    it('should create task with minimal required fields', () => {
      cy.visit('/dashboard/tasks');
      
      cy.get('[data-testid="create-task-button"]').click();
      
      // Fill only required fields
      cy.get('[data-testid="task-title-input"]').type('Minimal Task');
      cy.get('[data-testid="project-select"]').click();
      cy.get(`[data-testid="project-option-${projectId}"]`).click();
      cy.get('[data-testid="priority-select"]').select('LOW');
      
      cy.get('[data-testid="create-task-submit"]').click();
      
      // Should create task successfully
      cy.get('[data-testid="success-message"]').should('contain', 'Task created successfully');
      cy.get('[data-testid="task-list"]').should('contain', 'Minimal Task');
    });

    it('should handle duplicate task titles within project', () => {
      // First create a task
      cy.task('db:createTask', { 
        ...testTask, 
        projectId, 
        createdById: userId 
      });

      cy.visit('/dashboard/tasks');
      
      cy.get('[data-testid="create-task-button"]').click();
      
      // Try to create task with same title
      cy.get('[data-testid="task-title-input"]').type(testTask.title);
      cy.get('[data-testid="project-select"]').click();
      cy.get(`[data-testid="project-option-${projectId}"]`).click();
      cy.get('[data-testid="priority-select"]').select('LOW');
      
      cy.get('[data-testid="create-task-submit"]').click();
      
      // Should show warning but allow creation
      cy.get('[data-testid="warning-message"]').should('contain', 'Similar task title exists');
      
      // Can proceed with creation
      cy.get('[data-testid="confirm-create-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'Task created successfully');
    });

    it('should create task with dependencies', () => {
      // Create a dependency task first
      cy.task('db:createTask', { 
        title: 'Dependency Task',
        projectId, 
        createdById: userId,
        status: 'TODO',
        priority: 'HIGH',
      }).then((depTask) => {
        cy.visit('/dashboard/tasks');
        
        cy.get('[data-testid="create-task-button"]').click();
        
        cy.get('[data-testid="task-title-input"]').type('Task with Dependencies');
        cy.get('[data-testid="project-select"]').click();
        cy.get(`[data-testid="project-option-${projectId}"]`).click();
        cy.get('[data-testid="priority-select"]').select('MEDIUM');
        
        // Add dependency
        cy.get('[data-testid="dependencies-section"]').click();
        cy.get('[data-testid="dependency-select"]').click();
        cy.get(`[data-testid="dependency-option-${depTask.id}"]`).click();
        
        cy.get('[data-testid="create-task-submit"]').click();
        
        cy.get('[data-testid="success-message"]').should('contain', 'Task created successfully');
      });
    });
  });

  describe('Task Viewing and Filtering', () => {
    beforeEach(() => {
      // Create multiple tasks for testing
      const tasks = [
        { ...testTask, title: 'High Priority Bug', priority: 'HIGH', status: 'TODO' },
        { ...testTask, title: 'Medium Feature', priority: 'MEDIUM', status: 'IN_PROGRESS' },
        { ...testTask, title: 'Low Priority Task', priority: 'LOW', status: 'DONE' },
        { ...testTask, title: 'Urgent Fix', priority: 'URGENT', status: 'BLOCKED' },
      ];

      tasks.forEach((task, index) => {
        cy.task('db:createTask', { 
          ...task, 
          projectId, 
          createdById: userId 
        }).then((createdTask) => {
          if (index === 0) taskId = createdTask.id;
        });
      });
    });

    it('should display all tasks in default view', () => {
      cy.visit('/dashboard/tasks');
      
      // Should show all tasks
      cy.get('[data-testid="task-card"]').should('have.length', 4);
      cy.get('[data-testid="task-list"]').should('contain', 'High Priority Bug');
      cy.get('[data-testid="task-list"]').should('contain', 'Medium Feature');
      cy.get('[data-testid="task-list"]').should('contain', 'Low Priority Task');
      cy.get('[data-testid="task-list"]').should('contain', 'Urgent Fix');
    });

    it('should filter tasks by status', () => {
      cy.visit('/dashboard/tasks');
      
      // Filter by TODO status
      cy.get('[data-testid="status-filter"]').select('TODO');
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'High Priority Bug');
      cy.get('[data-testid="task-list"]').should('not.contain', 'Medium Feature');
      
      // Filter by IN_PROGRESS
      cy.get('[data-testid="status-filter"]').select('IN_PROGRESS');
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'Medium Feature');
    });

    it('should filter tasks by priority', () => {
      cy.visit('/dashboard/tasks');
      
      // Filter by HIGH priority
      cy.get('[data-testid="priority-filter"]').select('HIGH');
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'High Priority Bug');
      
      // Filter by URGENT priority
      cy.get('[data-testid="priority-filter"]').select('URGENT');
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'Urgent Fix');
    });

    it('should search tasks by title and description', () => {
      cy.visit('/dashboard/tasks');
      
      // Search by title
      cy.get('[data-testid="search-input"]').type('Bug');
      cy.get('[data-testid="search-button"]').click();
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'High Priority Bug');
      
      // Clear search
      cy.get('[data-testid="search-input"]').clear();
      cy.get('[data-testid="search-button"]').click();
      
      // Search by partial match
      cy.get('[data-testid="search-input"]').type('Feature');
      cy.get('[data-testid="search-button"]').click();
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'Medium Feature');
    });

    it('should filter tasks assigned to me', () => {
      cy.visit('/dashboard/tasks');
      
      // Filter by assigned to me
      cy.get('[data-testid="assignee-filter"]').select('me');
      
      // Should show no tasks initially (none assigned to user)
      cy.get('[data-testid="no-tasks-message"]').should('be.visible');
      
      // Assign a task to current user
      cy.get('[data-testid="assignee-filter"]').select('all');
      cy.get('[data-testid="task-card"]').first().within(() => {
        cy.get('[data-testid="assign-to-me-button"]').click();
      });
      
      // Now filter by assigned to me
      cy.get('[data-testid="assignee-filter"]').select('me');
      cy.get('[data-testid="task-card"]').should('have.length', 1);
    });

    it('should sort tasks by different criteria', () => {
      cy.visit('/dashboard/tasks');
      
      // Sort by priority
      cy.get('[data-testid="sort-select"]').select('priority');
      
      // URGENT should come first
      cy.get('[data-testid="task-card"]').first().should('contain', 'Urgent Fix');
      
      // Sort by due date
      cy.get('[data-testid="sort-select"]').select('dueDate');
      
      // Tasks with earlier due dates should come first
      cy.get('[data-testid="task-card"]').should('be.visible');
      
      // Sort by creation date
      cy.get('[data-testid="sort-select"]').select('createdAt');
      
      // Most recent should come first
      cy.get('[data-testid="task-card"]').should('be.visible');
    });

    it('should combine multiple filters', () => {
      cy.visit('/dashboard/tasks');
      
      // Apply multiple filters
      cy.get('[data-testid="status-filter"]').select('TODO');
      cy.get('[data-testid="priority-filter"]').select('HIGH');
      
      cy.get('[data-testid="task-card"]').should('have.length', 1);
      cy.get('[data-testid="task-list"]').should('contain', 'High Priority Bug');
      
      // Change priority filter
      cy.get('[data-testid="priority-filter"]').select('URGENT');
      
      // Should show no results (no TODO tasks with URGENT priority)
      cy.get('[data-testid="no-tasks-message"]').should('be.visible');
    });
  });

  describe('Task Details', () => {
    beforeEach(() => {
      cy.task('db:createTask', { 
        ...testTask, 
        projectId, 
        createdById: userId 
      }).then((task) => {
        taskId = task.id;
      });
    });

    it('should view task details', () => {
      cy.visit('/dashboard/tasks');
      
      // Click on task to view details
      cy.get('[data-testid="task-card"]').first().click();
      
      // Should navigate to task details
      cy.url().should('include', `/tasks/${taskId}`);
      
      // Should display task information
      cy.get('[data-testid="task-title"]').should('contain', testTask.title);
      cy.get('[data-testid="task-description"]').should('contain', testTask.description);
      cy.get('[data-testid="task-status"]').should('contain', testTask.status);
      cy.get('[data-testid="task-priority"]').should('contain', testTask.priority);
      cy.get('[data-testid="task-estimated-hours"]').should('contain', testTask.estimatedHours);
      
      // Should display tags
      testTask.tags.forEach(tag => {
        cy.get('[data-testid="task-tags"]').should('contain', tag);
      });
    });

    it('should show task metadata', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Should show creation info
      cy.get('[data-testid="created-by"]').should('contain', testUser.firstName);
      cy.get('[data-testid="created-at"]').should('be.visible');
      
      // Should show project info
      cy.get('[data-testid="task-project"]').should('contain', testProject.name);
      
      // Should show assignment status
      cy.get('[data-testid="assignee-info"]').should('contain', 'Unassigned');
    });

    it('should display task comments', () => {
      // Add some comments first
      cy.task('db:createTaskComment', {
        taskId,
        authorId: userId,
        content: 'This is a test comment',
      });

      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Should show comments section
      cy.get('[data-testid="comments-section"]').should('be.visible');
      cy.get('[data-testid="comment-item"]').should('contain', 'This is a test comment');
      cy.get('[data-testid="comment-author"]').should('contain', testUser.firstName);
    });

    it('should add new comment', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      const commentText = 'This is a new comment from Cypress';
      
      // Type comment
      cy.get('[data-testid="comment-input"]').type(commentText);
      cy.get('[data-testid="add-comment-button"]').click();
      
      // Should display the new comment
      cy.get('[data-testid="comment-item"]').should('contain', commentText);
      cy.get('[data-testid="success-message"]').should('contain', 'Comment added successfully');
    });

    it('should display task dependencies', () => {
      // Create dependency task
      cy.task('db:createTask', {
        title: 'Dependency Task',
        projectId,
        createdById: userId,
        status: 'DONE',
        priority: 'HIGH',
      }).then((depTask) => {
        // Add dependency relationship
        cy.task('db:addTaskDependency', {
          taskId,
          dependsOnId: depTask.id,
        });

        cy.visit(`/dashboard/tasks/${taskId}`);
        
        // Should show dependencies section
        cy.get('[data-testid="dependencies-section"]').should('be.visible');
        cy.get('[data-testid="dependency-item"]').should('contain', 'Dependency Task');
        cy.get('[data-testid="dependency-status"]').should('contain', 'DONE');
      });
    });

    it('should show task history/activity', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Should show activity section
      cy.get('[data-testid="activity-section"]').should('be.visible');
      
      // Should show task creation activity
      cy.get('[data-testid="activity-item"]').should('contain', 'Task created');
      cy.get('[data-testid="activity-timestamp"]').should('be.visible');
    });
  });

  describe('Task Editing', () => {
    beforeEach(() => {
      cy.task('db:createTask', { 
        ...testTask, 
        projectId, 
        createdById: userId 
      }).then((task) => {
        taskId = task.id;
      });
    });

    it('should edit task details', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Click edit button
      cy.get('[data-testid="edit-task-button"]').click();
      
      // Should switch to edit mode
      cy.get('[data-testid="task-edit-form"]').should('be.visible');
      
      // Edit task details
      const updatedTitle = 'Updated Task Title';
      const updatedDescription = 'Updated task description';
      
      cy.get('[data-testid="edit-title-input"]').clear().type(updatedTitle);
      cy.get('[data-testid="edit-description-input"]').clear().type(updatedDescription);
      cy.get('[data-testid="edit-priority-select"]').select('HIGH');
      
      // Save changes
      cy.get('[data-testid="save-changes-button"]').click();
      
      // Should show updated information
      cy.get('[data-testid="task-title"]').should('contain', updatedTitle);
      cy.get('[data-testid="task-description"]').should('contain', updatedDescription);
      cy.get('[data-testid="task-priority"]').should('contain', 'HIGH');
      
      cy.get('[data-testid="success-message"]').should('contain', 'Task updated successfully');
    });

    it('should update task status', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Update status via dropdown
      cy.get('[data-testid="status-dropdown"]').click();
      cy.get('[data-testid="status-option-IN_PROGRESS"]').click();
      
      // Should update immediately
      cy.get('[data-testid="task-status"]').should('contain', 'IN_PROGRESS');
      cy.get('[data-testid="success-message"]').should('contain', 'Task status updated');
      
      // Should show in activity
      cy.get('[data-testid="activity-item"]').should('contain', 'Status changed to IN_PROGRESS');
    });

    it('should assign task to user', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Click assign to me button
      cy.get('[data-testid="assign-to-me-button"]').click();
      
      // Should show assigned status
      cy.get('[data-testid="assignee-info"]').should('contain', testUser.firstName);
      cy.get('[data-testid="success-message"]').should('contain', 'Task assigned successfully');
      
      // Should show in activity
      cy.get('[data-testid="activity-item"]').should('contain', `Assigned to ${testUser.firstName}`);
    });

    it('should update estimated and actual hours', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Click edit button
      cy.get('[data-testid="edit-task-button"]').click();
      
      // Update hours
      cy.get('[data-testid="edit-estimated-hours-input"]').clear().type('12');
      cy.get('[data-testid="edit-actual-hours-input"]').type('8');
      
      cy.get('[data-testid="save-changes-button"]').click();
      
      // Should show updated hours
      cy.get('[data-testid="task-estimated-hours"]').should('contain', '12');
      cy.get('[data-testid="task-actual-hours"]').should('contain', '8');
      
      // Should show progress indicator
      cy.get('[data-testid="progress-indicator"]').should('be.visible');
      cy.get('[data-testid="progress-percentage"]').should('contain', '67%'); // 8/12 * 100
    });

    it('should add and remove tags', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      cy.get('[data-testid="edit-task-button"]').click();
      
      // Add new tag
      cy.get('[data-testid="edit-tags-input"]').type('urgent{enter}');
      
      // Remove existing tag
      cy.get('[data-testid="tag-frontend"]').within(() => {
        cy.get('[data-testid="remove-tag-button"]').click();
      });
      
      cy.get('[data-testid="save-changes-button"]').click();
      
      // Should show updated tags
      cy.get('[data-testid="task-tags"]').should('contain', 'urgent');
      cy.get('[data-testid="task-tags"]').should('contain', 'testing');
      cy.get('[data-testid="task-tags"]').should('not.contain', 'frontend');
    });

    it('should cancel edit without saving', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      cy.get('[data-testid="edit-task-button"]').click();
      
      // Make changes
      cy.get('[data-testid="edit-title-input"]').clear().type('Changed Title');
      
      // Cancel editing
      cy.get('[data-testid="cancel-edit-button"]').click();
      
      // Should revert to original title
      cy.get('[data-testid="task-title"]').should('contain', testTask.title);
      cy.get('[data-testid="task-title"]').should('not.contain', 'Changed Title');
    });
  });

  describe('Task Deletion', () => {
    beforeEach(() => {
      cy.task('db:createTask', { 
        ...testTask, 
        projectId, 
        createdById: userId 
      }).then((task) => {
        taskId = task.id;
      });
    });

    it('should delete task successfully', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      // Click delete button
      cy.get('[data-testid="delete-task-button"]').click();
      
      // Should show confirmation dialog
      cy.get('[data-testid="delete-confirmation-dialog"]').should('be.visible');
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Should redirect to tasks list
      cy.url().should('include', '/dashboard/tasks');
      
      // Should show success message
      cy.get('[data-testid="success-message"]').should('contain', 'Task deleted successfully');
      
      // Task should not appear in list
      cy.get('[data-testid="task-list"]').should('not.contain', testTask.title);
    });

    it('should prevent deletion of task with dependencies', () => {
      // Create dependent task
      cy.task('db:createTask', {
        title: 'Dependent Task',
        projectId,
        createdById: userId,
      }).then((depTask) => {
        // Add dependency
        cy.task('db:addTaskDependency', {
          taskId: depTask.id,
          dependsOnId: taskId,
        });

        cy.visit(`/dashboard/tasks/${taskId}`);
        
        cy.get('[data-testid="delete-task-button"]').click();
        cy.get('[data-testid="confirm-delete-button"]').click();
        
        // Should show error message
        cy.get('[data-testid="error-message"]')
          .should('contain', 'Cannot delete task. Other tasks depend on this task');
        
        // Should remain on task page
        cy.url().should('include', `/tasks/${taskId}`);
      });
    });

    it('should cancel task deletion', () => {
      cy.visit(`/dashboard/tasks/${taskId}`);
      
      cy.get('[data-testid="delete-task-button"]').click();
      
      // Cancel deletion
      cy.get('[data-testid="cancel-delete-button"]').click();
      
      // Should close dialog
      cy.get('[data-testid="delete-confirmation-dialog"]').should('not.exist');
      
      // Should remain on task page
      cy.url().should('include', `/tasks/${taskId}`);
    });
  });

  describe('Task Board View', () => {
    beforeEach(() => {
      // Create tasks with different statuses for board view
      const boardTasks = [
        { ...testTask, title: 'Todo Task', status: 'TODO' },
        { ...testTask, title: 'In Progress Task', status: 'IN_PROGRESS' },
        { ...testTask, title: 'Review Task', status: 'REVIEW' },
        { ...testTask, title: 'Done Task', status: 'DONE' },
      ];

      boardTasks.forEach((task) => {
        cy.task('db:createTask', { 
          ...task, 
          projectId, 
          createdById: userId 
        });
      });
    });

    it('should display tasks in board columns', () => {
      cy.visit('/dashboard/tasks/board');
      
      // Should show board layout
      cy.get('[data-testid="task-board"]').should('be.visible');
      
      // Should have columns for each status
      cy.get('[data-testid="column-TODO"]').should('be.visible').and('contain', 'Todo Task');
      cy.get('[data-testid="column-IN_PROGRESS"]').should('be.visible').and('contain', 'In Progress Task');
      cy.get('[data-testid="column-REVIEW"]').should('be.visible').and('contain', 'Review Task');
      cy.get('[data-testid="column-DONE"]').should('be.visible').and('contain', 'Done Task');
    });

    it('should drag and drop tasks between columns', () => {
      cy.visit('/dashboard/tasks/board');
      
      // Drag task from TODO to IN_PROGRESS
      cy.get('[data-testid="column-TODO"] [data-testid="task-card"]')
        .first()
        .trigger('dragstart');
        
      cy.get('[data-testid="column-IN_PROGRESS"]')
        .trigger('dragover')
        .trigger('drop');
      
      // Should move task to new column
      cy.get('[data-testid="column-IN_PROGRESS"]').should('contain', 'Todo Task');
      cy.get('[data-testid="column-TODO"]').should('not.contain', 'Todo Task');
      
      // Should show success message
      cy.get('[data-testid="success-message"]').should('contain', 'Task status updated');
    });

    it('should show task count in column headers', () => {
      cy.visit('/dashboard/tasks/board');
      
      // Should show task counts
      cy.get('[data-testid="column-TODO-count"]').should('contain', '1');
      cy.get('[data-testid="column-IN_PROGRESS-count"]').should('contain', '1');
      cy.get('[data-testid="column-REVIEW-count"]').should('contain', '1');
      cy.get('[data-testid="column-DONE-count"]').should('contain', '1');
    });

    it('should filter board by project', () => {
      cy.visit('/dashboard/tasks/board');
      
      // Filter by project
      cy.get('[data-testid="project-filter"]').select(testProject.name);
      
      // Should show all tasks from the project
      cy.get('[data-testid="task-card"]').should('have.length', 4);
      
      // Filter by different project (should show no tasks)
      cy.get('[data-testid="project-filter"]').select('Other Project');
      cy.get('[data-testid="task-card"]').should('have.length', 0);
    });

    it('should create new task from board column', () => {
      cy.visit('/dashboard/tasks/board');
      
      // Click add task in TODO column
      cy.get('[data-testid="column-TODO"] [data-testid="add-task-button"]').click();
      
      // Should open create task modal with status pre-selected
      cy.get('[data-testid="create-task-modal"]').should('be.visible');
      cy.get('[data-testid="status-select"]').should('have.value', 'TODO');
      
      // Create task
      cy.get('[data-testid="task-title-input"]').type('New Board Task');
      cy.get('[data-testid="project-select"]').select(testProject.name);
      cy.get('[data-testid="priority-select"]').select('MEDIUM');
      
      cy.get('[data-testid="create-task-submit"]').click();
      
      // Should appear in TODO column
      cy.get('[data-testid="column-TODO"]').should('contain', 'New Board Task');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      cy.task('db:createTask', { 
        ...testTask, 
        projectId, 
        createdById: userId 
      }).then((task) => {
        taskId = task.id;
      });
    });

    it('should show real-time task updates', () => {
      cy.visit('/dashboard/tasks');
      
      // Simulate task update from another user/session
      cy.task('api:updateTask', {
        taskId,
        updates: { status: 'IN_PROGRESS' },
      });
      
      // Should update automatically without refresh
      cy.get('[data-testid="task-card"]', { timeout: 5000 })
        .should('contain', 'IN_PROGRESS');
    });

    it('should show notifications for task assignments', () => {
      cy.visit('/dashboard/tasks');
      
      // Simulate task assignment
      cy.task('api:assignTask', {
        taskId,
        assigneeId: userId,
      });
      
      // Should show notification
      cy.get('[data-testid="notification"]', { timeout: 5000 })
        .should('contain', 'You have been assigned to a task');
    });

    it('should update task counts in real-time', () => {
      cy.visit('/dashboard/tasks/board');
      
      // Get initial count
      cy.get('[data-testid="column-TODO-count"]').should('contain', '1');
      
      // Simulate new task creation
      cy.task('api:createTask', {
        title: 'Real-time Task',
        projectId,
        status: 'TODO',
        createdById: userId,
      });
      
      // Should update count
      cy.get('[data-testid="column-TODO-count"]', { timeout: 5000 })
        .should('contain', '2');
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large number of tasks efficiently', () => {
      // Create many tasks
      const tasks = Array.from({ length: 50 }, (_, i) => ({
        ...testTask,
        title: `Performance Task ${i + 1}`,
        projectId,
        createdById: userId,
      }));

      cy.task('db:createManyTasks', tasks);
      
      cy.visit('/dashboard/tasks');
      
      // Should load within reasonable time
      cy.get('[data-testid="task-list"]', { timeout: 10000 }).should('be.visible');
      
      // Should show pagination
      cy.get('[data-testid="pagination"]').should('be.visible');
      
      // Should show task count
      cy.get('[data-testid="total-tasks"]').should('contain', '50');
    });

    it('should handle network errors gracefully', () => {
      cy.visit('/dashboard/tasks');
      
      // Simulate network error
      cy.intercept('GET', '/api/tasks*', { forceNetworkError: true }).as('networkError');
      
      cy.reload();
      
      cy.wait('@networkError');
      
      // Should show error message
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Failed to load tasks');
      
      // Should provide retry option
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle API timeouts', () => {
      cy.visit('/dashboard/tasks');
      
      // Simulate API timeout
      cy.intercept('GET', '/api/tasks*', { delay: 30000 }).as('timeout');
      
      cy.reload();
      
      // Should show loading state
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      
      // Should eventually show timeout error
      cy.get('[data-testid="timeout-error"]', { timeout: 35000 })
        .should('contain', 'Request timed out');
    });

    it('should maintain state during navigation', () => {
      cy.visit('/dashboard/tasks');
      
      // Apply filters
      cy.get('[data-testid="status-filter"]').select('TODO');
      cy.get('[data-testid="search-input"]').type('sample');
      cy.get('[data-testid="search-button"]').click();
      
      // Navigate away and back
      cy.visit('/dashboard/profile');
      cy.visit('/dashboard/tasks');
      
      // Should maintain filters
      cy.get('[data-testid="status-filter"]').should('have.value', 'TODO');
      cy.get('[data-testid="search-input"]').should('have.value', 'sample');
    });
  });
});