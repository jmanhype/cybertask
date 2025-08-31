import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={onClose}
            data-testid="modal-backdrop"
          />
          
          {/* Modal */}
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            data-testid="modal-container"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              data-testid="modal"
            >
              {/* Header */}
              <div 
                className="flex items-center justify-between p-6 border-b border-gray-200"
                data-testid="modal-header"
              >
                <h2 
                  id={titleId}
                  className="text-xl font-semibold text-gray-900"
                  data-testid="modal-title"
                >
                  {title}
                </h2>
                <Button
                  ref={closeButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  aria-label="Close modal"
                  data-testid="modal-close-button"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="p-6" data-testid="modal-content">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;