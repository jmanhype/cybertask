import React from 'react';
import { render, screen } from '../../../test/utils/testUtils';
import Navbar from '../../../components/layout/Navbar';

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
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
    logout: jest.fn(),
    register: jest.fn(),
    checkAuth: jest.fn(),
  })
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => 
      <div onClick={onClick} className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  BellIcon: () => <svg data-testid="bell-icon" />,
  UserIcon: () => <svg data-testid="user-icon" />,
  Cog6ToothIcon: () => <svg data-testid="cog-icon" />,
  ArrowRightOnRectangleIcon: () => <svg data-testid="logout-icon" />,
  ChevronDownIcon: () => <svg data-testid="chevron-down-icon" />,
}));

describe('Navbar', () => {
  it('should render navbar with brand name', () => {
    render(<Navbar />);
    
    expect(screen.getByText('CyberTask')).toBeInTheDocument();
  });
});