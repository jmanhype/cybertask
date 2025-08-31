import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { RootState, AppDispatch } from '../store/store';
import { loadUser, loginUser, registerUser, logoutUser } from '../store/slices/authSlice';
import { LoginCredentials, RegisterData } from '../types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, isLoading, error } = useSelector((state: RootState) => state.auth);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token;

  // Load user on mount if token exists
  useEffect(() => {
    if (token && !user) {
      dispatch(loadUser());
    }
  }, [dispatch, token, user]);

  const login = async (credentials: LoginCredentials) => {
    return dispatch(loginUser(credentials));
  };

  const register = async (userData: RegisterData) => {
    return dispatch(registerUser(userData));
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  const refreshUser = () => {
    if (token) {
      dispatch(loadUser());
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
  };
};