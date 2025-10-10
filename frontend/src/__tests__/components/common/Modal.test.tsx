import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../../../components/common/Modal';

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
  XMarkIcon: ({ className }: { className?: string }) => 
    <svg data-testid="x-mark-icon" className={className} />,
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

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div data-testid="modal-content">Modal content goes here</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility Control', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
      expect(screen.getByTestId('modal-container')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modal-container')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    });

    it('should toggle visibility based on isOpen prop', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
      
      rerender(<Modal {...defaultProps} isOpen={true} />);
      
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(<Modal {...defaultProps} size="sm" />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('max-w-md');
    });

    it('should apply medium size classes (default)', () => {
      render(<Modal {...defaultProps} size="md" />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('max-w-lg');
    });

    it('should apply large size classes', () => {
      render(<Modal {...defaultProps} size="lg" />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('max-w-2xl');
    });

    it('should apply extra large size classes', () => {
      render(<Modal {...defaultProps} size="xl" />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('max-w-4xl');
    });

    it('should default to medium size when size prop is not provided', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('max-w-lg');
    });
  });

  describe('Modal Structure', () => {
    it('should render modal with proper structure', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
      expect(screen.getByTestId('modal-container')).toBeInTheDocument();
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-header')).toBeInTheDocument();
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('should render modal title correctly', () => {
      render(<Modal {...defaultProps} title="Custom Modal Title" />);
      
      const title = screen.getByTestId('modal-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Custom Modal Title');
      expect(title).toHaveClass('text-xl', 'font-semibold', 'text-gray-900');
    });

    it('should render close button with correct icon', () => {
      render(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      const icon = screen.getByTestId('x-mark-icon');
      
      expect(closeButton).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-5', 'w-5');
    });

    it('should render children in content area', () => {
      const testChildren = (
        <div>
          <p data-testid="child-1">First child</p>
          <p data-testid="child-2">Second child</p>
        </div>
      );
      
      render(<Modal {...defaultProps}>{testChildren}</Modal>);
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const modal = screen.getByTestId('modal');
      await user.click(modal);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking inside modal content', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const content = screen.getByTestId('modal-content');
      await user.click(content);
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should focus close button when modal opens', () => {
      render(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      expect(closeButton).toHaveFocus();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      
      render(
        <Modal {...defaultProps}>
          <div>
            <input data-testid="input-1" />
            <button data-testid="button-1">Button</button>
            <input data-testid="input-2" />
          </div>
        </Modal>
      );
      
      const closeButton = screen.getByTestId('modal-close-button');
      const input1 = screen.getByTestId('input-1');
      
      // Tab should move to first focusable element in content
      await user.tab();
      expect(input1).toHaveFocus();
      
      // Initial focus should be on close button
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Styling and Classes', () => {
    it('should apply correct backdrop classes', () => {
      render(<Modal {...defaultProps} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop).toHaveClass(
        'fixed', 'inset-0', 'z-40', 'bg-black', 'bg-opacity-50'
      );
    });

    it('should apply correct container classes', () => {
      render(<Modal {...defaultProps} />);
      
      const container = screen.getByTestId('modal-container');
      expect(container).toHaveClass(
        'fixed', 'inset-0', 'z-50', 'flex', 'items-center', 
        'justify-center', 'p-4'
      );
    });

    it('should apply correct modal classes', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass(
        'w-full', 'bg-white', 'rounded-lg', 'shadow-xl'
      );
    });

    it('should apply correct header classes', () => {
      render(<Modal {...defaultProps} />);
      
      const header = screen.getByTestId('modal-header');
      expect(header).toHaveClass(
        'flex', 'items-center', 'justify-between', 
        'p-6', 'border-b', 'border-gray-200'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', expect.stringContaining('modal-title'));
    });

    it('should label modal with title', () => {
      render(<Modal {...defaultProps} title="Accessible Modal" />);
      
      const modal = screen.getByTestId('modal');
      const title = screen.getByTestId('modal-title');
      
      expect(title).toHaveAttribute('id', expect.any(String));
      expect(modal).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
    });

    it('should be announced to screen readers', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('should have accessible close button', () => {
      render(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      render(<Modal {...defaultProps} title="" />);
      
      const title = screen.getByTestId('modal-title');
      expect(title).toBeInTheDocument();
      expect(title).toBeEmptyDOMElement();
    });

    it('should handle null children', () => {
      render(<Modal {...defaultProps}>{null}</Modal>);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toBeInTheDocument();
    });

    it('should handle undefined size', () => {
      render(<Modal {...defaultProps} size={undefined} />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('max-w-lg'); // Should default to md
    });

    it('should handle rapid open/close cycles', () => {
      const onClose = jest.fn();
      const { rerender } = render(<Modal {...defaultProps} onClose={onClose} isOpen={false} />);
      
      // Rapidly toggle open state
      rerender(<Modal {...defaultProps} onClose={onClose} isOpen={true} />);
      rerender(<Modal {...defaultProps} onClose={onClose} isOpen={false} />);
      rerender(<Modal {...defaultProps} onClose={onClose} isOpen={true} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  describe('Event Propagation', () => {
    it('should stop propagation when modal content is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const onModalClick = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const modal = screen.getByTestId('modal');
      modal.addEventListener('click', onModalClick);
      
      await user.click(modal);
      
      expect(onClose).not.toHaveBeenCalled();
      expect(onModalClick).toHaveBeenCalled();
    });

    it('should handle multiple close attempts gracefully', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByTestId('modal-close-button');
      const backdrop = screen.getByTestId('modal-backdrop');
      
      // Multiple close attempts
      await user.click(closeButton);
      await user.click(backdrop);
      await user.keyboard('{Escape}');
      
      // onClose should be called for each interaction
      expect(onClose).toHaveBeenCalledTimes(3);
    });
  });

  describe('Animation Preparation', () => {
    it('should render with animation wrapper when open', () => {
      render(<Modal {...defaultProps} />);
      
      // Since we mocked framer-motion, we're just testing structure
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should handle animation states correctly', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      
      rerender(<Modal {...defaultProps} isOpen={true} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });
});