import React from 'react';
import clsx from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div 
      className={clsx('flex justify-center items-center', className)}
      role="status"
      aria-label="Loading"
      data-testid="loading-container"
    >
      <div
        className={clsx(
          'animate-spin rounded-full border-b-2 border-primary-600',
          sizeClasses[size]
        )}
        data-testid="loading-spinner"
      />
    </div>
  );
};

export default Loading;