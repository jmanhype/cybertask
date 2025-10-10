import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { Toaster } from 'react-hot-toast'

// Import your slice reducers
import authSlice from '../../store/slices/authSlice'
import taskSlice from '../../store/slices/taskSlice'
import projectSlice from '../../store/slices/projectSlice'
import notificationSlice from '../../store/slices/notificationSlice'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any
  store?: any
  initialRoute?: string
}

function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      auth: authSlice,
      tasks: taskSlice,
      projects: projectSlice,
      notifications: notificationSlice,
    },
    preloadedState,
  })
}

function AllTheProviders({ 
  children, 
  store, 
  initialRoute = '/' 
}: { 
  children: React.ReactNode
  store: any
  initialRoute?: string
}) {
  // Set initial route
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute)
  }

  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
        <Toaster position="top-right" />
      </BrowserRouter>
    </Provider>
  )
}

function customRender(
  ui: ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    initialRoute = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders store={store} initialRoute={initialRoute}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Mock data generators
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

export const mockTask = {
  id: 'task-123',
  title: 'Test Task',
  description: 'Test task description',
  status: 'TODO' as const,
  priority: 'MEDIUM' as const,
  projectId: 'project-123',
  createdById: 'user-123',
  assignedToId: 'user-456',
  dueDate: '2024-12-31T23:59:59Z',
  estimatedHours: 8,
  actualHours: null,
  tags: ['test', 'frontend'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  project: {
    id: 'project-123',
    name: 'Test Project',
  },
  assignedTo: {
    id: 'user-456',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  createdBy: {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  },
}

export const mockProject = {
  id: 'project-123',
  name: 'Test Project',
  description: 'Test project description',
  ownerId: 'user-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  owner: {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  },
  _count: {
    tasks: 5,
    members: 3,
  },
}

export const mockNotification = {
  id: 'notification-123',
  type: 'TASK_ASSIGNED' as const,
  title: 'Task Assigned',
  message: 'You have been assigned to a new task',
  isRead: false,
  createdAt: '2024-01-01T10:00:00Z',
  relatedId: 'task-123',
}

// Pre-configured store states
export const authenticatedState = {
  auth: {
    user: mockUser,
    token: 'mock-jwt-token',
    isLoading: false,
    error: null,
  },
  tasks: {
    tasks: [],
    currentTask: null,
    isLoading: false,
    error: null,
  },
  projects: {
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
  },
  notifications: {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  },
}

export const unauthenticatedState = {
  auth: {
    user: null,
    token: null,
    isLoading: false,
    error: null,
  },
  tasks: {
    tasks: [],
    currentTask: null,
    isLoading: false,
    error: null,
  },
  projects: {
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
  },
  notifications: {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  },
}

export const loadingState = {
  ...authenticatedState,
  auth: {
    ...authenticatedState.auth,
    isLoading: true,
  },
  tasks: {
    ...authenticatedState.tasks,
    isLoading: true,
  },
}

export const errorState = {
  ...authenticatedState,
  auth: {
    ...authenticatedState.auth,
    error: 'Authentication failed',
  },
  tasks: {
    ...authenticatedState.tasks,
    error: 'Failed to fetch tasks',
  },
}

// Helper functions
export const waitForLoadingToFinish = () => 
  new Promise((resolve) => setTimeout(resolve, 0))

export const createMockStore = (preloadedState = {}) => {
  return createTestStore({
    ...authenticatedState,
    ...preloadedState,
  })
}

export const mockLocalStorage = () => {
  const storage: { [key: string]: string } = {}
  
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach(key => delete storage[key])
    },
    length: Object.keys(storage).length,
    key: (index: number) => Object.keys(storage)[index] || null,
  }
}

// Custom hooks testing utilities
export { act } from '@testing-library/react'

// Re-export everything
export * from '@testing-library/react'
export { customRender as render, createTestStore }

// Event simulation helpers
export const simulateNetworkError = () => {
  const originalFetch = global.fetch
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
  
  return () => {
    global.fetch = originalFetch
  }
}

export const simulateSlowNetwork = (delay = 1000) => {
  const originalFetch = global.fetch
  global.fetch = vi.fn().mockImplementation(
    (...args) => new Promise(resolve => 
      setTimeout(() => resolve(originalFetch(...args)), delay)
    )
  )
  
  return () => {
    global.fetch = originalFetch
  }
}

// Form testing helpers
export const fillForm = async (user: any, fields: Record<string, string>) => {
  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(new RegExp(label, 'i'))
    await user.clear(input)
    await user.type(input, value)
  }
}

export const submitForm = async (user: any, buttonText = /submit/i) => {
  const submitButton = screen.getByRole('button', { name: buttonText })
  await user.click(submitButton)
}