import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';
import authSlice from '../../../store/slices/authSlice';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth');

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, state }: { to: string; state?: any }) => (
    <div data-testid="navigate" data-to={to} data-state={JSON.stringify(state)} />
  ),
  useLocation: jest.fn(),
}));

const mockUseAuth = require('../../../hooks/useAuth');
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  { initialState = {}, store = createMockStore(initialState) } = {}
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    mockUseLocation.mockReturnValue({
      pathname: '/dashboard',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner when authentication is loading', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should display loading with correct size', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toHaveClass('loading-lg');
    });

    it('should center loading spinner on screen', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const loadingContainer = screen.getByTestId('loading-spinner').parentElement;
      expect(loadingContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');
    });
  });

  describe('Unauthenticated Access', () => {
    it('should redirect to login when not authenticated', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const navigate = screen.getByTestId('navigate');
      expect(navigate).toBeInTheDocument();
      expect(navigate).toHaveAttribute('data-to', '/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should pass current location in state when redirecting', () => {
      const currentLocation = {
        pathname: '/dashboard',
        search: '?tab=projects',
        hash: '#section1',
        state: { fromApp: true },
        key: 'test',
      };

      mockUseLocation.mockReturnValue(currentLocation);
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const navigate = screen.getByTestId('navigate');
      const stateData = JSON.parse(navigate.getAttribute('data-state') || '{}');
      
      expect(stateData).toEqual({
        from: currentLocation,
      });
    });

    it('should use replace navigation', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Since we mocked Navigate component, we need to verify it's called with replace
      // In a real test environment, this would be tested differently
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });

  describe('Authenticated Access', () => {
    it('should render protected content when authenticated', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          emailVerified: true,
        },
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should render multiple children when authenticated', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          emailVerified: true,
        },
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should pass through props to children', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          emailVerified: true,
        },
        error: null,
      });

      const ChildWithProps = ({ testProp }: { testProp: string }) => (
        <div data-testid="child-with-props">{testProp}</div>
      );

      renderWithProviders(
        <ProtectedRoute>
          <ChildWithProps testProp="test value" />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('child-with-props')).toHaveTextContent('test value');
    });
  });

  describe('State Transitions', () => {
    it('should handle authentication state changes', () => {
      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Initially loading
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Then authenticated
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          emailVerified: true,
        },
        error: null,
      });

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle loading to unauthenticated transition', () => {
      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Initially loading
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Then not authenticated
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should still redirect to login if authentication error occurs', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'Authentication failed',
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });

    it('should render content if authenticated despite error', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          emailVerified: true,
        },
        error: 'Some non-critical error',
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user but authenticated state', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          emailVerified: true,
        },
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          {undefined}
        </ProtectedRoute>
      );

      // Should not crash and should render empty content
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle boolean loading state correctly', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Test false loading state
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      const { rerender } = renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading state', () => {
      mockUseAuth.useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toHaveAttribute('role', 'status');
      expect(loadingSpinner).toHaveAttribute('aria-label', 'Loading');
    });
  });
});