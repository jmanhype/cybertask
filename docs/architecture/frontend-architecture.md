# CyberTask Frontend Architecture

## Overview
CyberTask frontend is built as a modern, scalable React application with TypeScript, focusing on performance, maintainability, and user experience. The architecture follows clean architecture principles with clear separation of concerns.

## Technology Stack

### Core Technologies
- **React 18**: Latest React with concurrent features
- **TypeScript**: Type safety and better developer experience
- **Vite**: Fast build tool and development server
- **React Router v6**: Client-side routing
- **Redux Toolkit**: State management with RTK Query
- **Material-UI v5**: Component library with theming

### Supporting Libraries
- **React Hook Form**: Form handling and validation
- **Zod**: Schema validation
- **React Query**: Server state management (backup/migration path)
- **React Virtual**: Virtualization for large lists
- **React DnD**: Drag and drop functionality
- **Socket.IO Client**: Real-time communication

## Architecture Layers

```
┌─────────────────────────────────────────┐
│              Presentation               │
│         (Components, Pages)             │
├─────────────────────────────────────────┤
│               Containers                │
│         (Connected Components)          │
├─────────────────────────────────────────┤
│              State Layer                │
│         (Redux, RTK Query)              │
├─────────────────────────────────────────┤
│              Service Layer              │
│           (API, WebSocket)              │
├─────────────────────────────────────────┤
│               Utilities                 │
│        (Helpers, Constants)             │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Input, etc.)
│   ├── forms/           # Form-specific components
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   └── ui/              # UI-specific components
├── pages/               # Route-level components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard and analytics
│   ├── projects/       # Project management pages
│   ├── tasks/          # Task management pages
│   └── settings/       # Application settings
├── containers/          # Connected components
│   ├── TaskContainer.tsx
│   ├── ProjectContainer.tsx
│   └── DashboardContainer.tsx
├── store/              # Redux store configuration
│   ├── index.ts        # Store configuration
│   ├── api/            # RTK Query API slices
│   ├── slices/         # Redux slices
│   └── middleware/     # Custom middleware
├── services/           # External service integrations
│   ├── api.ts          # API client configuration
│   ├── websocket.ts    # WebSocket service
│   ├── claude-flow.ts  # Claude Flow integration
│   └── notifications.ts # Push notifications
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── useSocket.ts    # WebSocket hook
│   ├── useDebounce.ts  # Utility hooks
│   └── api/            # API hooks
├── utils/              # Utility functions
│   ├── format.ts       # Data formatting
│   ├── validation.ts   # Validation schemas
│   ├── constants.ts    # Application constants
│   └── helpers.ts      # Helper functions
├── types/              # TypeScript type definitions
│   ├── api.ts          # API response types
│   ├── store.ts        # Redux state types
│   └── common.ts       # Common types
├── styles/             # Global styles and themes
│   ├── theme.ts        # Material-UI theme
│   ├── globals.css     # Global CSS
│   └── components/     # Component-specific styles
├── assets/             # Static assets
│   ├── images/         # Images and icons
│   ├── fonts/          # Custom fonts
│   └── locales/        # i18n files
└── __tests__/          # Test files
    ├── components/     # Component tests
    ├── hooks/          # Hook tests
    ├── utils/          # Utility tests
    └── __mocks__/      # Mock files
```

## Component Architecture

### Component Hierarchy
```
App
├── AuthProvider
├── ThemeProvider
├── Router
│   ├── PublicRoutes
│   │   ├── LoginPage
│   │   ├── RegisterPage
│   │   └── ForgotPasswordPage
│   └── PrivateRoutes
│       ├── DashboardLayout
│       │   ├── Header
│       │   ├── Sidebar
│       │   └── MainContent
│       │       ├── DashboardPage
│       │       ├── ProjectsPage
│       │       ├── TasksPage
│       │       └── SettingsPage
│       └── ProjectLayout
│           ├── ProjectHeader
│           ├── ProjectSidebar
│           └── ProjectContent
└── GlobalNotifications
```

### Component Types

#### 1. Presentation Components
Pure components that only receive props and render UI:

```typescript
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h6">{task.title}</Typography>
        <Chip 
          label={task.status} 
          color={getStatusColor(task.status)}
        />
      </CardHeader>
      <CardContent>
        <Typography variant="body2" color="textSecondary">
          {task.description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button onClick={() => onEdit(task)}>Edit</Button>
        <Button onClick={() => onDelete(task.id)}>Delete</Button>
      </CardActions>
    </Card>
  );
};
```

#### 2. Container Components
Connected components that manage state and side effects:

```typescript
const TaskContainer: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: tasks, isLoading } = useGetTasksQuery({ projectId });
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const handleEdit = (task: Task) => {
    // Handle edit logic
  };

  const handleDelete = (taskId: string) => {
    deleteTask({ id: taskId });
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateTask({ id: taskId, status });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <TaskList>
      {tasks?.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      ))}
    </TaskList>
  );
};
```

## State Management

### Redux Store Structure
```typescript
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    permissions: Permission[];
  };
  ui: {
    theme: 'light' | 'dark';
    sidebar: {
      collapsed: boolean;
      activeTab: string;
    };
    notifications: Notification[];
    modals: {
      taskEdit: TaskEditModal;
      projectCreate: ProjectCreateModal;
    };
  };
  filters: {
    tasks: TaskFilters;
    projects: ProjectFilters;
    users: UserFilters;
  };
  cache: {
    lastFetch: Record<string, number>;
    invalidations: string[];
  };
  offline: {
    isOnline: boolean;
    pendingActions: Action[];
    syncInProgress: boolean;
  };
}
```

### RTK Query API Slices
```typescript
export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/tasks',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Task', 'Project', 'User'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], TasksQueryParams>({
      query: (params) => ({
        url: '',
        params,
      }),
      providesTags: ['Task'],
      // Real-time updates
      onCacheEntryAdded: async (
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) => {
        const ws = new WebSocket(`wss://api.cybertask.com/ws`);
        
        try {
          await cacheDataLoaded;
          
          ws.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'task.updated') {
              updateCachedData((draft) => {
                const index = draft.findIndex(task => task.id === data.task.id);
                if (index !== -1) {
                  draft[index] = data.task;
                }
              });
            }
          });
        } catch {
          // Handle error
        }
        
        await cacheEntryRemoved;
        ws.close();
      },
    }),
    
    createTask: builder.mutation<Task, Partial<Task>>({
      query: (task) => ({
        url: '',
        method: 'POST',
        body: task,
      }),
      invalidatesTags: ['Task'],
    }),
    
    updateTask: builder.mutation<Task, { id: string } & Partial<Task>>({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),
  }),
});
```

## Routing Architecture

### Route Configuration
```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'auth',
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      {
        path: 'dashboard',
        element: <PrivateRoute><DashboardLayout /></PrivateRoute>,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'projects',
            children: [
              { index: true, element: <ProjectsPage /> },
              {
                path: ':projectId',
                element: <ProjectLayout />,
                children: [
                  { index: true, element: <ProjectOverview /> },
                  { path: 'tasks', element: <TasksPage /> },
                  { path: 'board', element: <KanbanBoard /> },
                  { path: 'timeline', element: <TimelinePage /> },
                  { path: 'settings', element: <ProjectSettings /> },
                ],
              },
            ],
          },
          {
            path: 'tasks',
            children: [
              { index: true, element: <MyTasksPage /> },
              { path: ':taskId', element: <TaskDetailPage /> },
            ],
          },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
```

### Route Guards
```typescript
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const PermissionGuard: React.FC<{
  permission: string;
  children: React.ReactNode;
}> = ({ permission, children }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
};
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy loading for route components
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const TasksPage = lazy(() => import('../pages/TasksPage'));

// Component-level code splitting
const HeavyComponent = lazy(() => import('../components/HeavyComponent'));

// Usage with Suspense
<Suspense fallback={<ComponentSkeleton />}>
  <HeavyComponent />
</Suspense>
```

### Virtual Scrolling
```typescript
const VirtualTaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TaskCard task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Memoization
```typescript
// React.memo for components
const TaskCard = React.memo<TaskCardProps>(({ task, onEdit, onDelete }) => {
  return (
    // Component JSX
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.updatedAt === nextProps.task.updatedAt
  );
});

// useMemo for expensive calculations
const TaskStats = ({ tasks }: { tasks: Task[] }) => {
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date()
      ).length,
    };
  }, [tasks]);

  return <StatsDisplay stats={stats} />;
};
```

## Real-time Features

### WebSocket Integration
```typescript
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, isConnected]);

  return { socket, isConnected, sendMessage };
};

// Usage in components
const TaskRealTimeUpdates: React.FC = () => {
  const { sendMessage } = useWebSocket('wss://api.cybertask.com/ws');
  
  useEffect(() => {
    sendMessage({
      type: 'subscribe',
      channels: ['tasks.updates', 'notifications']
    });
  }, [sendMessage]);

  // Handle real-time updates through RTK Query cache updates
  return null;
};
```

### Collaborative Features
```typescript
const CollaborativeEditor: React.FC<{ taskId: string }> = ({ taskId }) => {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const { sendMessage } = useWebSocket('wss://api.cybertask.com/ws');

  const handleCursorMove = useCallback((position: CursorPosition) => {
    sendMessage({
      type: 'cursor.move',
      taskId,
      position
    });
  }, [taskId, sendMessage]);

  const handleTextChange = useCallback(debounce((text: string) => {
    sendMessage({
      type: 'text.change',
      taskId,
      text,
      timestamp: Date.now()
    });
  }, 300), [taskId, sendMessage]);

  return (
    <Editor
      onCursorMove={handleCursorMove}
      onTextChange={handleTextChange}
      collaborativeCursors={cursors}
    />
  );
};
```

## Error Boundaries and Error Handling

### Error Boundary
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### API Error Handling
```typescript
const ApiErrorHandler: React.FC = () => {
  const dispatch = useAppDispatch();

  // Global error handler for RTK Query
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const apiState = state.api;
      
      Object.values(apiState.queries).forEach((query: any) => {
        if (query?.error && !query.error.handled) {
          handleApiError(query.error, dispatch);
        }
      });
    });

    return unsubscribe;
  }, [dispatch]);

  return null;
};

const handleApiError = (error: any, dispatch: AppDispatch) => {
  switch (error.status) {
    case 401:
      dispatch(logout());
      break;
    case 403:
      dispatch(showNotification({
        type: 'error',
        message: 'You don\'t have permission to perform this action'
      }));
      break;
    case 429:
      dispatch(showNotification({
        type: 'warning',
        message: 'Rate limit exceeded. Please try again later.'
      }));
      break;
    case 500:
      dispatch(showNotification({
        type: 'error',
        message: 'Server error. Our team has been notified.'
      }));
      break;
    default:
      dispatch(showNotification({
        type: 'error',
        message: error.message || 'An unexpected error occurred'
      }));
  }
};
```

## Testing Strategy

### Component Testing
```typescript
describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium'
  };

  it('renders task information correctly', () => {
    render(
      <TaskCard
        task={mockTask}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('todo')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockTask);
  });
});
```

### Integration Testing
```typescript
describe('Task Management Flow', () => {
  it('should create, edit, and delete a task', async () => {
    const { store } = renderWithProviders(<TaskContainer projectId="1" />);

    // Create task
    fireEvent.click(screen.getByText('Add Task'));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Task' }
    });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    // Edit task
    fireEvent.click(screen.getByLabelText('Edit task'));
    fireEvent.change(screen.getByDisplayValue('New Task'), {
      target: { value: 'Updated Task' }
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Updated Task')).toBeInTheDocument();
    });

    // Delete task
    fireEvent.click(screen.getByLabelText('Delete task'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.queryByText('Updated Task')).not.toBeInTheDocument();
    });
  });
});
```

## Build and Deployment

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    viteCompression(),
  ],
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          store: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material'],
  },
});
```

### Environment Configuration
```typescript
// src/config/env.ts
interface Config {
  apiUrl: string;
  wsUrl: string;
  claudeFlowApiKey: string;
  enableDevTools: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export const config: Config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  claudeFlowApiKey: import.meta.env.VITE_CLAUDE_FLOW_API_KEY || '',
  enableDevTools: import.meta.env.DEV,
  logLevel: (import.meta.env.VITE_LOG_LEVEL as Config['logLevel']) || 'info',
};
```

This frontend architecture provides a robust, scalable foundation for CyberTask with modern React patterns, comprehensive state management, real-time capabilities, and strong performance optimizations.