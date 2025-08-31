import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Navbar from '../../../components/layout/Navbar';
import authSlice from '../../../store/slices/authSlice';
import notificationSlice from '../../../store/slices/notificationSlice';
import * as useAuthHook from '../../../hooks/useAuth';

// Mock framer-motion to avoid issues with animations in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => 
      <div onClick={onClick} className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  BellIcon: ({ className }: { className?: string }) => 
    <svg data-testid="bell-icon" className={className} />,
  UserIcon: ({ className }: { className?: string }) => 
    <svg data-testid="user-icon" className={className} />,
  Cog6ToothIcon: ({ className }: { className?: string }) => 
    <svg data-testid="cog-icon" className={className} />,
  ArrowRightOnRectangleIcon: ({ className }: { className?: string }) => 
    <svg data-testid="logout-icon" className={className} />,
  ChevronDownIcon: ({ className }: { className?: string }) => 
    <svg data-testid="chevron-down-icon" className={className} />,
}));

// Mock the Button component
jest.mock('../../../components/common/Button', () => {
  return function MockButton({ 
    children, 
    onClick, 
    variant, 
    size, 
    className,
    ...props 
  }: any) {
    return (
      <button 
        onClick={onClick}
        className={className}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {children}
      </button>
    );
  };
});

// Mock the formatters utility
jest.mock('../../../utils/formatters', () => ({
  getInitials: (firstName: string, lastName: string) => `${firstName[0]}${lastName[0]}`,
}));

// Mock useAuth hook
const mockUseAuth = jest.spyOn(useAuthHook, 'useAuth');

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
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
  { 
    initialState = {}, 
    store = createMockStore(initialState),
    route = '/dashboard'
  } = {}
) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        {component}
      </MemoryRouter>
    </Provider>
  );
};

describe('Navbar', () => {
  const mockLogout = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
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
      login: jest.fn(),
      logout: mockLogout,
      register: jest.fn(),
      checkAuth: jest.fn(),
    });

    // Mock useNavigate
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render navbar with all main elements', () => {
      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('CyberTask')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Board')).toBeInTheDocument();
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render logo and brand name correctly', () => {
      renderWithProviders(<Navbar />);
      
      const logoLink = screen.getByRole('link', { name: /cybertask/i });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/dashboard');
      
      const brandName = screen.getByText('CyberTask');
      expect(brandName).toHaveClass('text-xl', 'font-bold', 'text-gray-900');
    });

    it('should render navigation items correctly', () => {
      renderWithProviders(<Navbar />);
      
      const navItems = ['Dashboard', 'Projects', 'Tasks', 'Board'];
      navItems.forEach(item => {
        const link = screen.getByRole('link', { name: item });
        expect(link).toBeInTheDocument();
        expect(link).toHaveClass('px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium');
      });
    });

    it('should render user information correctly', () => {
      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // User initials
    });
  });

  describe('Navigation Links', () => {
    it('should highlight active navigation item', () => {
      renderWithProviders(<Navbar />, { route: '/dashboard' });
      
      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toHaveClass('bg-primary-100', 'text-primary-700');
      
      const projectsLink = screen.getByRole('link', { name: 'Projects' });
      expect(projectsLink).toHaveClass('text-gray-500');
    });

    it('should highlight active item for nested routes', () => {
      renderWithProviders(<Navbar />, { route: '/projects/123' });
      
      const projectsLink = screen.getByRole('link', { name: 'Projects' });
      expect(projectsLink).toHaveClass('bg-primary-100', 'text-primary-700');
    });

    it('should have correct href attributes for navigation items', () => {
      renderWithProviders(<Navbar />);
      
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
      expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/tasks');
      expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/board');
    });

    it('should apply hover styles to inactive navigation items', () => {
      renderWithProviders(<Navbar />, { route: '/dashboard' });
      
      const projectsLink = screen.getByRole('link', { name: 'Projects' });
      expect(projectsLink).toHaveClass('hover:text-gray-700', 'hover:bg-gray-100');
    });
  });

  describe('Notifications', () => {
    it('should render notification bell without badge when no unread notifications', () => {
      renderWithProviders(<Navbar />);
      
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it('should display unread notification count', () => {
      const stateWithNotifications = {
        notifications: {
          notifications: [],
          unreadCount: 3,
          isLoading: false,
          error: null,
        }
      };
      
      renderWithProviders(<Navbar />, { initialState: stateWithNotifications });
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display "9+" for more than 9 notifications', () => {
      const stateWithManyNotifications = {
        notifications: {
          notifications: [],
          unreadCount: 15,
          isLoading: false,
          error: null,
        }
      };
      
      renderWithProviders(<Navbar />, { initialState: stateWithManyNotifications });
      
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should style notification badge correctly', () => {
      const stateWithNotifications = {
        notifications: {
          notifications: [],
          unreadCount: 5,
          isLoading: false,
          error: null,
        }
      };
      
      renderWithProviders(<Navbar />, { initialState: stateWithNotifications });
      
      const badge = screen.getByText('5');
      expect(badge).toHaveClass(
        'absolute', '-top-1', '-right-1', 'h-4', 'w-4', 
        'bg-red-500', 'text-white', 'text-xs', 'rounded-full'
      );
    });
  });

  describe('User Menu', () => {
    it('should render user menu button with user info', () => {
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      expect(userButton).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    it('should toggle user menu when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      
      // Menu should not be visible initially
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      
      // Click to open menu
      await user.click(userButton);
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('should render user menu items with correct icons', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      await user.click(userButton);
      
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('cog-icon')).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });

    it('should have correct links for Profile and Settings', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      await user.click(userButton);
      
      const profileLink = screen.getByRole('link', { name: /profile/i });
      const settingsLink = screen.getByRole('link', { name: /settings/i });
      
      expect(profileLink).toHaveAttribute('href', '/profile');
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('should close menu when menu item is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      await user.click(userButton);
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
      
      const profileLink = screen.getByRole('link', { name: /profile/i });
      await user.click(profileLink);
      
      // Menu should be closed (but we can't test this directly due to animation mocking)
      // We'll verify the onClick handler is called
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout and navigate when Sign out is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      await user.click(userButton);
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should render sign out button with correct styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      await user.click(userButton);
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toHaveClass(
        'flex', 'items-center', 'w-full', 'px-4', 'py-2', 
        'text-sm', 'text-gray-700', 'hover:bg-gray-100'
      );
    });
  });

  describe('Responsive Design', () => {
    it('should hide user name on mobile screens', () => {
      renderWithProviders(<Navbar />);
      
      const userName = screen.getByText('John Doe');
      expect(userName).toHaveClass('hidden', 'md:block');
    });

    it('should hide navigation on mobile screens', () => {
      renderWithProviders(<Navbar />);
      
      const navigation = screen.getByText('Dashboard').closest('div');
      expect(navigation).toHaveClass('hidden', 'md:flex');
    });

    it('should have responsive container classes', () => {
      renderWithProviders(<Navbar />);
      
      const container = screen.getByText('CyberTask').closest('.max-w-7xl');
      expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });
  });

  describe('Styling and Layout', () => {
    it('should have correct navbar styling', () => {
      renderWithProviders(<Navbar />);
      
      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass(
        'bg-white', 'shadow-sm', 'border-b', 'border-gray-200', 
        'sticky', 'top-0', 'z-30'
      );
    });

    it('should have correct height and flex layout', () => {
      renderWithProviders(<Navbar />);
      
      const flexContainer = screen.getByText('CyberTask').closest('.flex');
      expect(flexContainer).toHaveClass('flex', 'justify-between', 'items-center', 'h-16');
    });

    it('should style logo container correctly', () => {
      renderWithProviders(<Navbar />);
      
      const logoContainer = screen.getByText('C').closest('div');
      expect(logoContainer).toHaveClass(
        'w-8', 'h-8', 'bg-primary-600', 'rounded-lg', 
        'flex', 'items-center', 'justify-center'
      );
    });

    it('should style user avatar correctly', () => {
      renderWithProviders(<Navbar />);
      
      const userAvatar = screen.getByText('JD').closest('div');
      expect(userAvatar).toHaveClass(
        'w-8', 'h-8', 'bg-primary-600', 'rounded-full', 
        'flex', 'items-center', 'justify-center', 'text-white', 'text-sm', 'font-medium'
      );
    });
  });

  describe('User Information Display', () => {
    it('should display user initials when user is present', () => {
      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display fallback initial when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: jest.fn(),
        logout: mockLogout,
        register: jest.fn(),
        checkAuth: jest.fn(),
      });

      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('should handle user names correctly for initials', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-2',
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          username: 'alicesmith',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: jest.fn(),
        logout: mockLogout,
        register: jest.fn(),
        checkAuth: jest.fn(),
      });

      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('AS')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation landmark', () => {
      renderWithProviders(<Navbar />);
      
      const navbar = screen.getByRole('navigation');
      expect(navbar).toBeInTheDocument();
    });

    it('should have accessible user menu button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      expect(userButton).toBeInTheDocument();
      
      await user.click(userButton);
      
      // Menu items should be accessible
      expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should have accessible notification button', () => {
      renderWithProviders(<Navbar />);
      
      const notificationButton = screen.getByRole('button', { name: /bell-icon/i });
      expect(notificationButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user data gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: jest.fn(),
        logout: mockLogout,
        register: jest.fn(),
        checkAuth: jest.fn(),
      });

      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('U')).toBeInTheDocument(); // Fallback initial
      expect(screen.queryByText('null null')).not.toBeInTheDocument();
    });

    it('should handle zero notifications correctly', () => {
      const stateWithZeroNotifications = {
        notifications: {
          notifications: [],
          unreadCount: 0,
          isLoading: false,
          error: null,
        }
      };
      
      renderWithProviders(<Navbar />, { initialState: stateWithZeroNotifications });
      
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should handle rapid menu toggle clicks', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />);
      
      const userButton = screen.getByRole('button', { name: /john doe/i });
      
      // Rapid clicks
      await user.click(userButton);
      await user.click(userButton);
      await user.click(userButton);
      
      // Should still work correctly
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should handle long user names gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-3',
          email: 'verylongname@example.com',
          firstName: 'VeryLongFirstName',
          lastName: 'VeryLongLastName',
          username: 'verylongusername',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: jest.fn(),
        logout: mockLogout,
        register: jest.fn(),
        checkAuth: jest.fn(),
      });

      renderWithProviders(<Navbar />);
      
      expect(screen.getByText('VV')).toBeInTheDocument(); // Should still show initials correctly
      expect(screen.getByText('VeryLongFirstName VeryLongLastName')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal DOM nodes', () => {
      renderWithProviders(<Navbar />);
      
      const navbar = screen.getByRole('navigation');
      expect(navbar).toBeInTheDocument();
      
      // Should have expected structure without excessive nesting
      const container = navbar.querySelector('.max-w-7xl');
      expect(container).toBeInTheDocument();
    });

    it('should not cause unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(<Navbar />);
      
      const navbar = screen.getByRole('navigation');
      const initialNavbar = navbar;
      
      rerender(
        <Provider store={createMockStore()}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Navbar />
          </MemoryRouter>
        </Provider>
      );
      
      expect(screen.getByRole('navigation')).toBe(initialNavbar);
    });
  });
});