import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    // Handle different error status codes
    switch (error.response?.status) {
      case 401:
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        break;
      case 403:
        toast.error('Access denied');
        break;
      case 404:
        toast.error('Resource not found');
        break;
      case 422:
        // Validation error
        if (error.response.data.errors) {
          const validationErrors = error.response.data.errors;
          Object.keys(validationErrors).forEach(key => {
            toast.error(`${key}: ${validationErrors[key][0]}`);
          });
        } else {
          toast.error(message);
        }
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        if (error.code === 'NETWORK_ERROR') {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error(message);
        }
    }
    
    return Promise.reject(error);
  }
);

export default api;