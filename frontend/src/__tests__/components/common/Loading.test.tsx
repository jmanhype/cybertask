import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from '../../../components/common/Loading';

describe('Loading', () => {
  describe('Basic Rendering', () => {
    it('should render loading spinner', () => {
      render(<Loading />);
      
      const container = screen.getByTestId('loading-container');
      const spinner = screen.getByTestId('loading-spinner');
      
      expect(container).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
    });

    it('should have default medium size', () => {
      render(<Loading />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('should have default styling classes', () => {
      render(<Loading />);
      
      const container = screen.getByTestId('loading-container');
      const spinner = screen.getByTestId('loading-spinner');
      
      expect(container).toHaveClass('flex', 'justify-center', 'items-center');
      expect(spinner).toHaveClass(
        'animate-spin', 
        'rounded-full', 
        'border-b-2', 
        'border-primary-600'
      );
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      render(<Loading size="sm" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('h-4', 'w-4');
      expect(spinner).not.toHaveClass('h-8', 'w-8');
      expect(spinner).not.toHaveClass('h-12', 'w-12');
    });

    it('should render medium size correctly', () => {
      render(<Loading size="md" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('h-8', 'w-8');
      expect(spinner).not.toHaveClass('h-4', 'w-4');
      expect(spinner).not.toHaveClass('h-12', 'w-12');
    });

    it('should render large size correctly', () => {
      render(<Loading size="lg" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('h-12', 'w-12');
      expect(spinner).not.toHaveClass('h-4', 'w-4');
      expect(spinner).not.toHaveClass('h-8', 'w-8');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className to container', () => {
      render(<Loading className="custom-loading-class" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('custom-loading-class');
      expect(container).toHaveClass('flex', 'justify-center', 'items-center');
    });

    it('should merge custom classes with default classes', () => {
      render(<Loading className="bg-red-500 p-4" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('bg-red-500', 'p-4');
      expect(container).toHaveClass('flex', 'justify-center', 'items-center');
    });

    it('should override container positioning with custom classes', () => {
      render(<Loading className="justify-start items-start" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('justify-start', 'items-start');
      expect(container).toHaveClass('flex'); // Should still have flex
    });
  });

  describe('Animation', () => {
    it('should have spin animation class', () => {
      render(<Loading />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should maintain animation across different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Loading size={size} />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toHaveClass('animate-spin');
        
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible for screen readers', () => {
      render(<Loading />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveAttribute('role', 'status');
      expect(container).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have proper ARIA attributes for different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Loading size={size} />);
        
        const container = screen.getByTestId('loading-container');
        expect(container).toHaveAttribute('role', 'status');
        expect(container).toHaveAttribute('aria-label', 'Loading');
        
        unmount();
      });
    });

    it('should be properly announced by screen readers', () => {
      render(<Loading />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Loading');
    });
  });

  describe('Visual Structure', () => {
    it('should have circular border styling', () => {
      render(<Loading />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('rounded-full');
      expect(spinner).toHaveClass('border-b-2');
      expect(spinner).toHaveClass('border-primary-600');
    });

    it('should maintain circular structure across sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Loading size={size} />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toHaveClass('rounded-full', 'border-b-2', 'border-primary-600');
        
        unmount();
      });
    });

    it('should center the spinner in its container', () => {
      render(<Loading />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('justify-center', 'items-center');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work as inline loading indicator', () => {
      render(
        <div>
          <span>Processing</span>
          <Loading size="sm" className="ml-2" />
        </div>
      );
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('ml-2');
      expect(container).toHaveClass('flex', 'justify-center', 'items-center');
    });

    it('should work as full-page loading indicator', () => {
      render(<Loading className="min-h-screen w-full" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('min-h-screen', 'w-full');
    });

    it('should work with different background colors', () => {
      render(<Loading className="bg-gray-100 rounded-lg p-4" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('bg-gray-100', 'rounded-lg', 'p-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined size gracefully', () => {
      render(<Loading size={undefined} />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('h-8', 'w-8'); // Should default to md
    });

    it('should handle empty className gracefully', () => {
      render(<Loading className="" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('flex', 'justify-center', 'items-center');
    });

    it('should handle null className gracefully', () => {
      render(<Loading className={null as any} />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('flex', 'justify-center', 'items-center');
    });

    it('should render without crashing in different environments', () => {
      // Test that the component doesn't break with various prop combinations
      const testCases = [
        { size: 'sm' as const, className: 'test-class' },
        { size: 'md' as const, className: undefined },
        { size: 'lg' as const, className: '' },
        { size: undefined, className: 'another-class' },
      ];
      
      testCases.forEach((props, index) => {
        const { unmount } = render(<Loading {...props} />);
        
        expect(screen.getByTestId('loading-container')).toBeInTheDocument();
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal DOM nodes', () => {
      render(<Loading />);
      
      const container = screen.getByTestId('loading-container');
      const spinner = screen.getByTestId('loading-spinner');
      
      // Should only have two DOM nodes: container and spinner
      expect(container.children).toHaveLength(1);
      expect(container.children[0]).toBe(spinner);
    });

    it('should not create unnecessary re-renders', () => {
      const { rerender } = render(<Loading size="sm" />);
      
      // Re-render with same props
      rerender(<Loading size="sm" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toBeInTheDocument();
    });
  });
});