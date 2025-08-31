/**
 * Utility function to safely convert errors to string messages
 * Prevents "Objects are not valid as a React child" errors
 */

export const errorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    // Handle response errors from API
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    // Handle nested response data
    if ('response' in error && error.response && typeof error.response === 'object') {
      const response = error.response as any;
      if (response.data?.message) {
        return response.data.message;
      }
      if (response.message) {
        return response.message;
      }
    }
    
    // Handle rejection values from Redux Toolkit
    if ('payload' in error && typeof error.payload === 'string') {
      return error.payload;
    }
    
    // Fallback to JSON stringify for complex objects
    try {
      return JSON.stringify(error);
    } catch {
      return 'An unknown error occurred';
    }
  }
  
  return 'An unknown error occurred';
};

/**
 * Safe error logging that won't crash the app
 */
export const logError = (error: unknown, context?: string) => {
  const message = errorMessage(error);
  console.error(`${context ? `[${context}] ` : ''}${message}`, error);
};