import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { errorMessage, logError } from '../errorMessage';

describe('errorMessage', () => {
  // Mock console.error to prevent noise in test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  it('should return string as-is', () => {
    expect(errorMessage('Simple error message')).toBe('Simple error message');
  });

  it('should extract message from Error object', () => {
    const error = new Error('Something went wrong');
    expect(errorMessage(error)).toBe('Something went wrong');
  });

  it('should extract message from object with message property', () => {
    const error = { message: 'API error' };
    expect(errorMessage(error)).toBe('API error');
  });

  it('should extract message from nested response object', () => {
    const error = {
      response: {
        data: {
          message: 'Validation failed'
        }
      }
    };
    expect(errorMessage(error)).toBe('Validation failed');
  });

  it('should extract payload from Redux rejection', () => {
    const error = { payload: 'Redux async thunk error' };
    expect(errorMessage(error)).toBe('Redux async thunk error');
  });

  it('should handle null/undefined gracefully', () => {
    expect(errorMessage(null)).toBe('An unknown error occurred');
    expect(errorMessage(undefined)).toBe('An unknown error occurred');
  });

  it('should stringify complex objects as fallback', () => {
    const complexError = { code: 500, details: { field: 'validation' } };
    const result = errorMessage(complexError);
    expect(result).toBe(JSON.stringify(complexError));
  });

  it('should handle objects that cannot be stringified', () => {
    const circularError = {};
    (circularError as any).self = circularError; // Create circular reference
    
    const result = errorMessage(circularError);
    expect(result).toBe('An unknown error occurred');
  });

  it('should handle primitive values', () => {
    expect(errorMessage(42)).toBe('An unknown error occurred');
    expect(errorMessage(true)).toBe('An unknown error occurred');
  });
});

describe('logError', () => {
  const originalError = console.error;
  const mockConsoleError = vi.fn();
  
  beforeEach(() => {
    console.error = mockConsoleError;
    mockConsoleError.mockClear();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  it('should log error with context', () => {
    const error = new Error('Test error');
    logError(error, 'TestComponent');
    
    expect(mockConsoleError).toHaveBeenCalledWith('[TestComponent] Test error', error);
  });

  it('should log error without context', () => {
    const error = new Error('Test error');
    logError(error);
    
    expect(mockConsoleError).toHaveBeenCalledWith('Test error', error);
  });
});