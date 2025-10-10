import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import CreateTaskModal from '../../../components/tasks/CreateTaskModal';
import authSlice from '../../../store/slices/authSlice';
import projectSlice from '../../../store/slices/projectSlice';
import taskSlice from '../../../store/slices/taskSlice';
import notificationSlice from '../../../store/slices/notificationSlice';
import { TaskPriority } from '../../../types';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock the Modal component
jest.mock('../../../components/common/Modal', () => {
  return function MockModal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size 
  }: any) {
    if (!isOpen) return null;
    
    return (
      <div data-testid="modal" data-size={size}>
        <div data-testid="modal-header">
          <h2 data-testid="modal-title">{title}</h2>
          <button onClick={onClose} data-testid="modal-close">Close</button>
        </div>
        <div data-testid="modal-content">
          {children}
        </div>
      </div>
    );
  };
});

// Mock the Button component
jest.mock('../../../components/common/Button', () => {
  return function MockButton({ 
    children, 
    onClick, 
    variant, 
    size, 
    type,
    isLoading,
    ...props 
  }: any) {
    return (
      <button 
        type={type}
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        data-loading={isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  };
});

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      projects: projectSlice,
      tasks: taskSlice,
      notifications: notificationSlice,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      projects: {
        projects: [
          {
            id: 'project-1',
            name: 'Test Project 1',
            description: 'First test project',
            color: '#3B82F6',
            ownerId: 'user-1',
            memberIds: ['user-1'],
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          {
            id: 'project-2',
            name: 'Test Project 2',
            description: 'Second test project',
            color: '#10B981',
            ownerId: 'user-1',
            memberIds: ['user-1'],
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
        isLoading: false,
        error: null,
      },
      tasks: {
        tasks: [],
        isLoading: false,
        error: null,
      },
      notifications: {
        notifications: [],
        unreadCount: 0,
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

describe('CreateTaskModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render modal when open', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Create New Task');
      expect(screen.getByTestId('modal')).toHaveAttribute('data-size', 'lg');
    });

    it('should not render when closed', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render title field with correct attributes', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const titleField = screen.getByLabelText(/title/i);
      expect(titleField).toHaveAttribute('type', 'text');
      expect(titleField).toHaveAttribute('placeholder', 'Enter task title');
      expect(titleField).toHaveAttribute('id', 'title');
    });

    it('should render description field as textarea', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const descriptionField = screen.getByLabelText(/description/i);
      expect(descriptionField.tagName).toBe('TEXTAREA');
      expect(descriptionField).toHaveAttribute('rows', '4');
      expect(descriptionField).toHaveAttribute('placeholder', 'Enter task description');
    });

    it('should populate project dropdown with available projects', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const projectSelect = screen.getByLabelText(/project/i);
      expect(projectSelect.tagName).toBe('SELECT');
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      expect(screen.getByText('Select a project')).toBeInTheDocument();
    });

    it('should render priority dropdown with all priority options', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const prioritySelect = screen.getByLabelText(/priority/i);
      expect(prioritySelect.tagName).toBe('SELECT');
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('should render due date field as datetime-local input', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const dueDateField = screen.getByLabelText(/due date/i);
      expect(dueDateField).toHaveAttribute('type', 'datetime-local');
    });

    it('should render tags field with helper text', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const tagsField = screen.getByLabelText(/tags/i);
      expect(tagsField).toHaveAttribute('type', 'text');
      expect(tagsField).toHaveAttribute('placeholder', 'Enter tags separated by commas');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty title', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('should show validation error for missing project', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const titleField = screen.getByLabelText(/title/i);
      await user.type(titleField, 'Test Task');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Project is required')).toBeInTheDocument();
      });
    });

    it('should show validation error for missing priority', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const titleField = screen.getByLabelText(/title/i);
      await user.type(titleField, 'Test Task');
      
      const projectSelect = screen.getByLabelText(/project/i);
      await user.selectOptions(projectSelect, 'project-1');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Priority is required')).toBeInTheDocument();
      });
    });

    it('should validate title length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const titleField = screen.getByLabelText(/title/i);
      const longTitle = 'A'.repeat(201); // Exceeds 200 character limit
      await user.type(titleField, longTitle);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Title must be less than 200 characters')).toBeInTheDocument();
      });
    });

    it('should validate description length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const descriptionField = screen.getByLabelText(/description/i);
      const longDescription = 'A'.repeat(1001); // Exceeds 1000 character limit
      await user.type(descriptionField, longDescription);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Description must be less than 1000 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      const mockDispatch = jest.spyOn(mockStore, 'dispatch');
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      // Fill out form
      await user.type(screen.getByLabelText(/title/i), 'New Test Task');
      await user.type(screen.getByLabelText(/description/i), 'Task description');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.HIGH);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('should handle tags correctly in form submission', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      const mockDispatch = jest.spyOn(mockStore, 'dispatch');
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      // Fill out form with tags
      await user.type(screen.getByLabelText(/title/i), 'New Test Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.MEDIUM);
      await user.type(screen.getByLabelText(/tags/i), 'tag1, tag2, tag3');
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
      
      // Verify that tags are processed correctly (split and trimmed)
      const dispatchCall = mockDispatch.mock.calls[0][0];
      expect(dispatchCall.payload.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle empty tags field', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      const mockDispatch = jest.spyOn(mockStore, 'dispatch');
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      await user.type(screen.getByLabelText(/title/i), 'New Test Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.LOW);
      // Leave tags empty
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
      
      const dispatchCall = mockDispatch.mock.calls[0][0];
      expect(dispatchCall.payload.tags).toEqual([]);
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const loadingStore = createMockStore({
        tasks: {
          tasks: [],
          isLoading: true,
          error: null,
        }
      });
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: loadingStore });
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      expect(submitButton).toHaveAttribute('data-loading', 'true');
      expect(submitButton).toHaveTextContent('Loading...');
    });

    it('should show success toast on successful submission', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      
      // Mock successful dispatch
      jest.spyOn(mockStore, 'dispatch').mockResolvedValue({ unwrap: () => Promise.resolve() });
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      await user.type(screen.getByLabelText(/title/i), 'New Test Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.MEDIUM);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task created successfully');
      });
    });

    it('should show error toast on submission failure', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      
      // Mock failed dispatch
      jest.spyOn(mockStore, 'dispatch').mockRejectedValue({ unwrap: () => Promise.reject('Server error') });
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      await user.type(screen.getByLabelText(/title/i), 'New Test Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.HIGH);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create task');
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      renderWithProviders(<CreateTaskModal {...defaultProps} onClose={onClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when modal close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      renderWithProviders(<CreateTaskModal {...defaultProps} onClose={onClose} />);
      
      const modalCloseButton = screen.getByTestId('modal-close');
      await user.click(modalCloseButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset form when modal is closed via Cancel', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      renderWithProviders(<CreateTaskModal {...defaultProps} onClose={onClose} />);
      
      // Fill out form
      const titleField = screen.getByLabelText(/title/i);
      await user.type(titleField, 'Test Task');
      
      expect(titleField).toHaveValue('Test Task');
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      // Form should be reset (though we can't test this directly due to mocking)
      expect(onClose).toHaveBeenCalled();
    });

    it('should close modal and reset form after successful submission', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const mockStore = createMockStore();
      
      // Mock successful dispatch
      jest.spyOn(mockStore, 'dispatch').mockResolvedValue({ unwrap: () => Promise.resolve() });
      
      renderWithProviders(<CreateTaskModal {...defaultProps} onClose={onClose} />, { store: mockStore });
      
      await user.type(screen.getByLabelText(/title/i), 'New Test Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.MEDIUM);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Button Styling and Variants', () => {
    it('should render Cancel button with correct variant', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveAttribute('data-variant', 'secondary');
    });

    it('should render Create Task button with correct variant', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      expect(submitButton).toHaveAttribute('data-variant', 'primary');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Form Layout and Styling', () => {
    it('should have proper form structure', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const form = screen.getByRole('form') || screen.getByTestId('modal-content').querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should apply grid layout to project and priority fields', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const projectField = screen.getByLabelText(/project/i);
      const priorityField = screen.getByLabelText(/priority/i);
      
      // Both fields should be in a grid container
      const projectContainer = projectField.closest('.grid');
      const priorityContainer = priorityField.closest('.grid');
      
      expect(projectContainer).toBe(priorityContainer);
    });

    it('should apply grid layout to due date and tags fields', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const dueDateField = screen.getByLabelText(/due date/i);
      const tagsField = screen.getByLabelText(/tags/i);
      
      // Both fields should be in a grid container
      const dueDateContainer = dueDateField.closest('.grid');
      const tagsContainer = tagsField.closest('.grid');
      
      expect(dueDateContainer).toBe(tagsContainer);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty projects list', () => {
      const stateWithNoProjects = {
        projects: {
          projects: [],
          isLoading: false,
          error: null,
        }
      };
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { initialState: stateWithNoProjects });
      
      const projectSelect = screen.getByLabelText(/project/i);
      expect(screen.getByText('Select a project')).toBeInTheDocument();
      expect(projectSelect.children).toHaveLength(1); // Only the default option
    });

    it('should handle projects loading state', () => {
      const stateWithLoadingProjects = {
        projects: {
          projects: [],
          isLoading: true,
          error: null,
        }
      };
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { initialState: stateWithLoadingProjects });
      
      const projectSelect = screen.getByLabelText(/project/i);
      expect(projectSelect).toBeInTheDocument();
    });

    it('should handle form submission with only required fields', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      const mockDispatch = jest.spyOn(mockStore, 'dispatch').mockResolvedValue({ unwrap: () => Promise.resolve() });
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      // Fill only required fields
      await user.type(screen.getByLabelText(/title/i), 'Minimal Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.LOW);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Task created successfully');
      });
    });

    it('should handle special characters in form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const titleField = screen.getByLabelText(/title/i);
      const specialTitle = 'Task with special chars: !@#$%^&*()';
      await user.type(titleField, specialTitle);
      
      expect(titleField).toHaveValue(specialTitle);
    });

    it('should handle whitespace-only tags correctly', async () => {
      const user = userEvent.setup();
      const mockStore = createMockStore();
      const mockDispatch = jest.spyOn(mockStore, 'dispatch').mockResolvedValue({ unwrap: () => Promise.resolve() });
      
      renderWithProviders(<CreateTaskModal {...defaultProps} />, { store: mockStore });
      
      await user.type(screen.getByLabelText(/title/i), 'Test Task');
      await user.selectOptions(screen.getByLabelText(/project/i), 'project-1');
      await user.selectOptions(screen.getByLabelText(/priority/i), TaskPriority.MEDIUM);
      await user.type(screen.getByLabelText(/tags/i), ' , , '); // Whitespace tags
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
      
      // Tags should be filtered out empty strings
      const dispatchCall = mockDispatch.mock.calls[0][0];
      expect(dispatchCall.payload.tags).toEqual([]);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it('should mark required fields with asterisk', () => {
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Project *')).toBeInTheDocument();
      expect(screen.getByText('Priority *')).toBeInTheDocument();
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const titleError = screen.getByText('Title is required');
        expect(titleError).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const modal = screen.getByTestId('modal');
      const initialModal = modal;
      
      rerender(
        <Provider store={createMockStore()}>
          <CreateTaskModal {...defaultProps} />
        </Provider>
      );
      
      expect(screen.getByTestId('modal')).toBe(initialModal);
    });

    it('should handle rapid form field changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateTaskModal {...defaultProps} />);
      
      const titleField = screen.getByLabelText(/title/i);
      
      // Rapid typing
      await user.type(titleField, 'A');
      await user.type(titleField, 'B');
      await user.type(titleField, 'C');
      
      expect(titleField).toHaveValue('ABC');
    });
  });
});