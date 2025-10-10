import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Layout from '../../../components/layout/Layout';
import authSlice from '../../../store/slices/authSlice';
import notificationSlice from '../../../store/slices/notificationSlice';

// Mock the Navbar component
jest.mock('../../../components/layout/Navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="mock-navbar">Navbar Component</nav>;
  };
});

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
          role: 'USER',
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

describe('Layout', () => {
  describe('Basic Rendering', () => {
    it('should render layout with children', () => {
      const testChildren = <div data-testid="test-content">Test Content</div>;
      
      renderWithProviders(<Layout>{testChildren}</Layout>);
      
      expect(screen.getByTestId('layout-container')).toBeInTheDocument();
      expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render layout without children', () => {
      renderWithProviders(<Layout>{null}</Layout>);
      
      expect(screen.getByTestId('layout-container')).toBeInTheDocument();
      expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      renderWithProviders(
        <Layout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </Layout>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render React fragments as children', () => {
      renderWithProviders(
        <Layout>
          <>
            <div data-testid="fragment-child-1">Fragment Child 1</div>
            <div data-testid="fragment-child-2">Fragment Child 2</div>
          </>
        </Layout>
      );
      
      expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have correct HTML structure', () => {
      renderWithProviders(
        <Layout>
          <div data-testid="page-content">Page Content</div>
        </Layout>
      );
      
      const container = screen.getByTestId('layout-container');
      const navbar = screen.getByTestId('mock-navbar');
      const main = screen.getByTestId('main-content');
      
      expect(container).toContainElement(navbar);
      expect(container).toContainElement(main);
      expect(main).toContainElement(screen.getByTestId('page-content'));
    });

    it('should render navbar before main content', () => {
      renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      const container = screen.getByTestId('layout-container');
      const children = Array.from(container.children);
      
      expect(children[0]).toEqual(screen.getByTestId('mock-navbar'));
      expect(children[1]).toEqual(screen.getByTestId('main-content'));
    });

    it('should wrap content in main element', () => {
      renderWithProviders(
        <Layout>
          <h1>Page Title</h1>
          <p>Page content</p>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      expect(main.tagName.toLowerCase()).toBe('main');
      expect(main).toContainElement(screen.getByText('Page Title'));
      expect(main).toContainElement(screen.getByText('Page content'));
    });
  });

  describe('Styling and Classes', () => {
    it('should apply correct container classes', () => {
      renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      const container = screen.getByTestId('layout-container');
      expect(container).toHaveClass('min-h-screen', 'bg-gray-50');
    });

    it('should apply correct main content classes', () => {
      renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      expect(main).toHaveClass(
        'max-w-7xl', 
        'mx-auto', 
        'py-6', 
        'px-4', 
        'sm:px-6', 
        'lg:px-8'
      );
    });

    it('should maintain responsive padding classes', () => {
      renderWithProviders(
        <Layout>
          <div>Responsive content</div>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      expect(main).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });

    it('should have full height container', () => {
      renderWithProviders(
        <Layout>
          <div>Full height content</div>
        </Layout>
      );
      
      const container = screen.getByTestId('layout-container');
      expect(container).toHaveClass('min-h-screen');
    });
  });

  describe('Responsive Design', () => {
    it('should handle different viewport sizes', () => {
      renderWithProviders(
        <Layout>
          <div>Responsive content</div>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      
      // Should have responsive padding classes
      expect(main).toHaveClass('px-4'); // Mobile
      expect(main).toHaveClass('sm:px-6'); // Small screens
      expect(main).toHaveClass('lg:px-8'); // Large screens
    });

    it('should maintain max-width constraint', () => {
      renderWithProviders(
        <Layout>
          <div>Constrained content</div>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      expect(main).toHaveClass('max-w-7xl', 'mx-auto');
    });

    it('should handle mobile layout correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(
        <Layout>
          <div>Mobile content</div>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      expect(main).toHaveClass('px-4'); // Mobile padding
    });
  });

  describe('Content Rendering', () => {
    it('should render simple text content', () => {
      renderWithProviders(<Layout>Simple text content</Layout>);
      
      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });

    it('should render complex component trees', () => {
      const ComplexComponent = () => (
        <div>
          <header data-testid="page-header">
            <h1>Page Title</h1>
            <nav>
              <ul>
                <li><a href="#section1">Section 1</a></li>
                <li><a href="#section2">Section 2</a></li>
              </ul>
            </nav>
          </header>
          <section data-testid="page-section">
            <p>Section content</p>
          </section>
          <footer data-testid="page-footer">
            <p>Footer content</p>
          </footer>
        </div>
      );

      renderWithProviders(
        <Layout>
          <ComplexComponent />
        </Layout>
      );

      expect(screen.getByTestId('page-header')).toBeInTheDocument();
      expect(screen.getByTestId('page-section')).toBeInTheDocument();
      expect(screen.getByTestId('page-footer')).toBeInTheDocument();
      expect(screen.getByText('Page Title')).toBeInTheDocument();
    });

    it('should handle dynamic content updates', () => {
      const { rerender } = renderWithProviders(
        <Layout>
          <div data-testid="dynamic-content">Initial content</div>
        </Layout>
      );

      expect(screen.getByText('Initial content')).toBeInTheDocument();

      renderWithProviders(
        <Layout>
          <div data-testid="dynamic-content">Updated content</div>
        </Layout>
      );

      expect(screen.getByText('Updated content')).toBeInTheDocument();
      expect(screen.queryByText('Initial content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic HTML elements', () => {
      renderWithProviders(
        <Layout>
          <div>Accessible content</div>
        </Layout>
      );
      
      const main = screen.getByTestId('main-content');
      expect(main.tagName.toLowerCase()).toBe('main');
    });

    it('should provide proper landmark structure', () => {
      renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      // Main landmark should be present
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should allow screen reader navigation', () => {
      renderWithProviders(
        <Layout>
          <h1>Page Title</h1>
          <p>Page content</p>
        </Layout>
      );
      
      // Should have proper heading hierarchy
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Page Title');
    });

    it('should maintain focus management', () => {
      renderWithProviders(
        <Layout>
          <button data-testid="focusable-button">Focusable Button</button>
          <input data-testid="focusable-input" />
        </Layout>
      );
      
      const button = screen.getByTestId('focusable-button');
      const input = screen.getByTestId('focusable-input');
      
      button.focus();
      expect(button).toHaveFocus();
      
      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe('Integration with Store', () => {
    it('should work with different authentication states', () => {
      const unauthenticatedState = {
        auth: {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }
      };

      renderWithProviders(
        <Layout>
          <div>Unauthenticated content</div>
        </Layout>,
        { initialState: unauthenticatedState }
      );

      expect(screen.getByText('Unauthenticated content')).toBeInTheDocument();
      expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    });

    it('should work with loading states', () => {
      const loadingState = {
        auth: {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: true,
          error: null,
        }
      };

      renderWithProviders(
        <Layout>
          <div>Loading content</div>
        </Layout>,
        { initialState: loadingState }
      );

      expect(screen.getByText('Loading content')).toBeInTheDocument();
    });

    it('should work with error states', () => {
      const errorState = {
        auth: {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Authentication error',
        }
      };

      renderWithProviders(
        <Layout>
          <div>Error handling content</div>
        </Layout>,
        { initialState: errorState }
      );

      expect(screen.getByText('Error handling content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined children gracefully', () => {
      renderWithProviders(<Layout>{undefined}</Layout>);
      
      expect(screen.getByTestId('layout-container')).toBeInTheDocument();
      expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('should handle empty array as children', () => {
      renderWithProviders(<Layout>{[]}</Layout>);
      
      expect(screen.getByTestId('layout-container')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('should handle boolean children', () => {
      renderWithProviders(
        <Layout>
          {true && <div>Conditional content</div>}
          {false && <div>Hidden content</div>}
        </Layout>
      );
      
      expect(screen.getByText('Conditional content')).toBeInTheDocument();
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    it('should handle component re-renders', () => {
      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return <div>Render count: {renderCount}</div>;
      };

      const { rerender } = renderWithProviders(
        <Layout>
          <TestComponent />
        </Layout>
      );

      expect(screen.getByText('Render count: 1')).toBeInTheDocument();

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <Layout>
              <TestComponent />
            </Layout>
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText('Render count: 2')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal DOM nodes', () => {
      renderWithProviders(
        <Layout>
          <div>Simple content</div>
        </Layout>
      );
      
      const container = screen.getByTestId('layout-container');
      expect(container.children).toHaveLength(2); // Navbar + main
      
      const main = screen.getByTestId('main-content');
      expect(main.children).toHaveLength(1); // Single child div
    });

    it('should not cause unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const container = screen.getByTestId('layout-container');
      const initialContainer = container;

      rerender(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <Layout>
              <div>Content</div>
            </Layout>
          </BrowserRouter>
        </Provider>
      );

      // Should be the same element reference (React optimization)
      expect(screen.getByTestId('layout-container')).toBe(initialContainer);
    });
  });
});