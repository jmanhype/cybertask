import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../../components/common/Button';

// Mock the Loading component
jest.mock('../../../components/common/Loading', () => {
  return function MockLoading({ size, className }: { size?: string; className?: string }) {
    return <div data-testid="loading-spinner" data-size={size} className={className} />;
  };
});

describe('Button', () => {
  describe('Basic Rendering', () => {
    it('should render button with children', () => {
      render(<Button>Click me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    it('should render button with default props', () => {
      render(<Button>Default Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600', 'text-white', 'px-4', 'py-2', 'text-sm');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Styled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should render React node children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toContainElement(screen.getByText('Icon'));
      expect(button).toContainElement(screen.getByText('Text'));
    });
  });

  describe('Variants', () => {
    it('should render primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600', 'text-white', 'hover:bg-primary-700');
    });

    it('should render secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200', 'text-gray-900', 'hover:bg-gray-300');
    });

    it('should render danger variant correctly', () => {
      render(<Button variant="danger">Danger</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white', 'hover:bg-red-700');
    });

    it('should render ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-700', 'hover:bg-gray-100');
    });
  });

  describe('Sizes', () => {
    it('should render small size correctly', () => {
      render(<Button size="sm">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should render medium size correctly', () => {
      render(<Button size="md">Medium</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('should render large size correctly', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      render(<Button isLoading={true}>Loading Button</Button>);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'sm');
      expect(screen.getByTestId('loading-spinner')).toHaveClass('mr-2');
      expect(screen.getByText('Loading Button')).toBeInTheDocument();
    });

    it('should disable button when isLoading is true', () => {
      render(<Button isLoading={true}>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not display loading spinner when isLoading is false', () => {
      render(<Button isLoading={false}>Normal Button</Button>);
      
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should show loading spinner with children', () => {
      render(
        <Button isLoading={true}>
          <span>Save Changes</span>
        </Button>
      );
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      render(<Button disabled={true}>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should disable button when both disabled and isLoading are true', () => {
      render(<Button disabled={true} isLoading={true}>Disabled Loading</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should enable button when disabled is false', () => {
      render(<Button disabled={false}>Enabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Event Handling', () => {
    it('should call onClick when button is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Clickable</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when button is disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick} disabled={true}>Disabled</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when button is loading', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick} isLoading={true}>Loading</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle onMouseEnter and onMouseLeave events', async () => {
      const user = userEvent.setup();
      const handleMouseEnter = jest.fn();
      const handleMouseLeave = jest.fn();
      
      render(
        <Button onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          Hover Me
        </Button>
      );
      
      const button = screen.getByRole('button');
      await user.hover(button);
      expect(handleMouseEnter).toHaveBeenCalled();
      
      await user.unhover(button);
      expect(handleMouseLeave).toHaveBeenCalled();
    });

    it('should handle keyboard events', async () => {
      const user = userEvent.setup();
      const handleKeyDown = jest.fn();
      
      render(<Button onKeyDown={handleKeyDown}>Keyboard</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('HTML Button Attributes', () => {
    it('should pass through HTML button attributes', () => {
      render(
        <Button 
          type="submit" 
          form="test-form"
          data-testid="custom-button"
          aria-label="Custom button"
        >
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'test-form');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
      expect(button).toHaveAttribute('aria-label', 'Custom button');
    });

    it('should handle autofocus attribute', () => {
      render(<Button autoFocus>Autofocus Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveFocus();
    });

    it('should handle tabIndex attribute', () => {
      render(<Button tabIndex={0}>Tab Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus styles', () => {
      render(<Button>Focusable Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Keyboard Button</Button>);
      
      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('should support aria attributes', () => {
      render(
        <Button 
          aria-describedby="help-text"
          aria-pressed={true}
          aria-expanded={false}
        >
          Accessible Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have accessible loading state', () => {
      render(<Button isLoading={true} aria-label="Saving changes">Save</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Saving changes');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Styling Combinations', () => {
    it('should combine variant and size classes correctly', () => {
      render(<Button variant="danger" size="lg">Large Danger</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'bg-red-600', 'text-white', 'hover:bg-red-700',
        'px-6', 'py-3', 'text-base'
      );
    });

    it('should maintain base classes with all variants', () => {
      const variants = ['primary', 'secondary', 'danger', 'ghost'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>{variant}</Button>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass(
          'btn', 'inline-flex', 'items-center', 'justify-center',
          'font-medium', 'rounded-lg', 'transition-colors', 'duration-200',
          'focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2'
        );
        
        unmount();
      });
    });

    it('should override classes with custom className', () => {
      render(
        <Button className="bg-purple-500 text-purple-100">
          Custom Styled
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-purple-500', 'text-purple-100');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button>{''}</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('should handle null children gracefully', () => {
      render(<Button>{null}</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle undefined props gracefully', () => {
      render(<Button variant={undefined} size={undefined}>Default</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600', 'px-4', 'py-2'); // Default values
    });

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Rapid Click</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });
});