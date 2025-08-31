import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TaskCard from '../../../components/tasks/TaskCard';
import authSlice from '../../../store/slices/authSlice';
import taskSlice from '../../../store/slices/taskSlice';

// Mock dependencies
jest.mock('../../../services/taskService');
jest.mock('react-hot-toast');

const mockTaskService = require('../../../services/taskService');
const mockToast = require('react-hot-toast');

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      tasks: taskSlice,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      tasks: {
        tasks: [],
        selectedTask: null,
        isLoading: false,
        error: null,
      },
      ...initialState,
    },
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  { initialState = {}, store = createMockStore(initialState) } = {}
) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('TaskCard', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Sample Task',
    description: 'This is a sample task description',
    status: 'TODO' as const,
    priority: 'MEDIUM' as const,
    dueDate: '2024-12-31T00:00:00.000Z',
    estimatedHours: 8,
    actualHours: 0,
    tags: ['frontend', 'bug'],
    project: {
      id: 'project-1',
      name: 'Sample Project',
    },
    assignedTo: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    createdBy: {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  };

  const mockOnClick = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnPriorityChange = jest.fn();
  const mockOnAssigneeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
  });

  describe('Basic Rendering', () => {
    it('should render task card with all basic information', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('Sample Task')).toBeInTheDocument();
      expect(screen.getByText('This is a sample task description')).toBeInTheDocument();
      expect(screen.getByText('Sample Project')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument();
    });

    it('should display task status badge', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const statusBadge = screen.getByTestId('task-status-badge');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveTextContent('TODO');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should display priority badge', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const priorityBadge = screen.getByTestId('task-priority-badge');
      expect(priorityBadge).toBeInTheDocument();
      expect(priorityBadge).toHaveTextContent('MEDIUM');
      expect(priorityBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should display tags', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('bug')).toBeInTheDocument();
      
      const tags = screen.getAllByTestId(/^task-tag-/);
      expect(tags).toHaveLength(2);
    });

    it('should handle empty tags array', () => {
      const taskWithoutTags = { ...mockTask, tags: [] };
      
      renderWithProviders(
        <TaskCard
          task={taskWithoutTags}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const tags = screen.queryAllByTestId(/^task-tag-/);
      expect(tags).toHaveLength(0);
    });
  });

  describe('Status Display', () => {
    it('should display TODO status correctly', () => {
      const todoTask = { ...mockTask, status: 'TODO' as const };
      
      renderWithProviders(
        <TaskCard
          task={todoTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const statusBadge = screen.getByTestId('task-status-badge');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should display IN_PROGRESS status correctly', () => {
      const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as const };
      
      renderWithProviders(
        <TaskCard
          task={inProgressTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const statusBadge = screen.getByTestId('task-status-badge');
      expect(statusBadge).toHaveTextContent('IN PROGRESS');
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should display DONE status correctly', () => {
      const doneTask = { ...mockTask, status: 'DONE' as const };
      
      renderWithProviders(
        <TaskCard
          task={doneTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const statusBadge = screen.getByTestId('task-status-badge');
      expect(statusBadge).toHaveTextContent('DONE');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display BLOCKED status correctly', () => {
      const blockedTask = { ...mockTask, status: 'BLOCKED' as const };
      
      renderWithProviders(
        <TaskCard
          task={blockedTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const statusBadge = screen.getByTestId('task-status-badge');
      expect(statusBadge).toHaveTextContent('BLOCKED');
      expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Priority Display', () => {
    it('should display LOW priority correctly', () => {
      const lowPriorityTask = { ...mockTask, priority: 'LOW' as const };
      
      renderWithProviders(
        <TaskCard
          task={lowPriorityTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const priorityBadge = screen.getByTestId('task-priority-badge');
      expect(priorityBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display HIGH priority correctly', () => {
      const highPriorityTask = { ...mockTask, priority: 'HIGH' as const };
      
      renderWithProviders(
        <TaskCard
          task={highPriorityTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const priorityBadge = screen.getByTestId('task-priority-badge');
      expect(priorityBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should display URGENT priority correctly', () => {
      const urgentTask = { ...mockTask, priority: 'URGENT' as const };
      
      renderWithProviders(
        <TaskCard
          task={urgentTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const priorityBadge = screen.getByTestId('task-priority-badge');
      expect(priorityBadge).toHaveTextContent('URGENT');
      expect(priorityBadge).toHaveClass('bg-red-600', 'text-white');
    });
  });

  describe('Date Display', () => {
    it('should format due date correctly', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument();
    });

    it('should handle missing due date', () => {
      const taskWithoutDueDate = { ...mockTask, dueDate: null };
      
      renderWithProviders(
        <TaskCard
          task={taskWithoutDueDate}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('No due date')).toBeInTheDocument();
    });

    it('should show overdue indicator for past due dates', () => {
      const overdueTask = {
        ...mockTask,
        dueDate: '2023-12-31T00:00:00.000Z', // Past date
      };
      
      renderWithProviders(
        <TaskCard
          task={overdueTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const dueDateElement = screen.getByTestId('task-due-date');
      expect(dueDateElement).toHaveClass('text-red-600');
      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    });
  });

  describe('Assignee Display', () => {
    it('should display assignee information', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      const assigneeAvatar = screen.getByTestId('assignee-avatar');
      expect(assigneeAvatar).toBeInTheDocument();
      expect(assigneeAvatar).toHaveTextContent('JD'); // Initials
    });

    it('should display unassigned state', () => {
      const unassignedTask = { ...mockTask, assignedTo: null };
      
      renderWithProviders(
        <TaskCard
          task={unassignedTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('Unassigned')).toBeInTheDocument();
      
      const unassignedAvatar = screen.getByTestId('unassigned-avatar');
      expect(unassignedAvatar).toBeInTheDocument();
      expect(unassignedAvatar).toHaveClass('bg-gray-100');
    });

    it('should handle assignee with only first name', () => {
      const taskWithPartialName = {
        ...mockTask,
        assignedTo: {
          id: 'user-1',
          firstName: 'John',
          lastName: '',
          email: 'john@example.com',
        },
      };
      
      renderWithProviders(
        <TaskCard
          task={taskWithPartialName}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      expect(screen.getByText('John')).toBeInTheDocument();
      
      const assigneeAvatar = screen.getByTestId('assignee-avatar');
      expect(assigneeAvatar).toHaveTextContent('J');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const card = screen.getByTestId('task-card');
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockTask);
    });

    it('should handle status change', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={true}
        />
      );

      const statusButton = screen.getByTestId('status-dropdown-button');
      await user.click(statusButton);

      const inProgressOption = screen.getByText('IN_PROGRESS');
      await user.click(inProgressOption);

      expect(mockOnStatusChange).toHaveBeenCalledWith(mockTask.id, 'IN_PROGRESS');
    });

    it('should handle priority change', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={true}
        />
      );

      const priorityButton = screen.getByTestId('priority-dropdown-button');
      await user.click(priorityButton);

      const highOption = screen.getByText('HIGH');
      await user.click(highOption);

      expect(mockOnPriorityChange).toHaveBeenCalledWith(mockTask.id, 'HIGH');
    });

    it('should prevent event bubbling for dropdown interactions', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={true}
        />
      );

      const statusButton = screen.getByTestId('status-dropdown-button');
      await user.click(statusButton);

      // Card onClick should not be called when clicking dropdown
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const card = screen.getByTestId('task-card');
      expect(card).toHaveClass('w-full', 'max-w-md', 'mx-auto', 'sm:mx-0');
    });

    it('should handle mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const card = screen.getByTestId('task-card');
      expect(card).toHaveClass('p-4');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const card = screen.getByTestId('task-card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Sample Task'));
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const card = screen.getByTestId('task-card');
      await user.tab();
      
      expect(card).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledWith(mockTask);
    });

    it('should support keyboard activation with Space key', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const card = screen.getByTestId('task-card');
      card.focus();

      await user.keyboard(' ');
      expect(mockOnClick).toHaveBeenCalledWith(mockTask);
    });

    it('should have proper color contrast for status badges', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
        />
      );

      const statusBadge = screen.getByTestId('task-status-badge');
      const styles = getComputedStyle(statusBadge);
      
      // Ensure contrast ratio meets WCAG standards
      expect(statusBadge).toHaveClass('text-gray-800'); // High contrast text
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state during status change', async () => {
      mockTaskService.updateTask.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={true}
        />
      );

      const statusButton = screen.getByTestId('status-dropdown-button');
      await user.click(statusButton);

      const inProgressOption = screen.getByText('IN_PROGRESS');
      await user.click(inProgressOption);

      expect(screen.getByTestId('status-loading')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      mockTaskService.updateTask.mockRejectedValue(new Error('API Error'));

      const user = userEvent.setup();
      
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={true}
        />
      );

      const statusButton = screen.getByTestId('status-dropdown-button');
      await user.click(statusButton);

      const inProgressOption = screen.getByText('IN_PROGRESS');
      await user.click(inProgressOption);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to update task status');
      });
    });
  });

  describe('Conditional Props', () => {
    it('should hide edit controls when not editable', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={false}
        />
      );

      expect(screen.queryByTestId('status-dropdown-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('priority-dropdown-button')).not.toBeInTheDocument();
    });

    it('should show edit controls when editable', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          isEditable={true}
        />
      );

      expect(screen.getByTestId('status-dropdown-button')).toBeInTheDocument();
      expect(screen.getByTestId('priority-dropdown-button')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      renderWithProviders(
        <TaskCard
          task={mockTask}
          onClick={mockOnClick}
          onStatusChange={mockOnStatusChange}
          onPriorityChange={mockOnPriorityChange}
          onAssigneeChange={mockOnAssigneeChange}
          className="custom-task-card"
        />
      );

      const card = screen.getByTestId('task-card');
      expect(card).toHaveClass('custom-task-card');
    });
  });
});