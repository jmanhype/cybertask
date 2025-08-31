import { configureStore } from '@reduxjs/toolkit'
import authReducer, {
  loginUser,
  registerUser,
  loadUser,
  logoutUser,
  clearError,
  setUser,
} from '../../store/slices/authSlice'
import { authService } from '../../services/authService'
import { vi } from 'vitest'

// Mock the auth service
vi.mock('../../services/authService')
const mockAuthService = vi.mocked(authService)

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

describe('authSlice', () => {
  let store: any

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth
      expect(state).toEqual({
        user: null,
        token: null,
        isLoading: false,
        error: null,
      })
    })

    it('should load token from localStorage if available', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token')
      
      const storeWithToken = configureStore({
        reducer: {
          auth: authReducer,
        },
      })
      
      const state = storeWithToken.getState().auth
      expect(state.token).toBe('stored-token')
    })
  })

  describe('regular actions', () => {
    it('should clear error', () => {
      // First set an error
      store.dispatch({
        type: 'auth/loginUser/rejected',
        payload: 'Login failed',
      })
      
      expect(store.getState().auth.error).toBe('Login failed')
      
      // Then clear it
      store.dispatch(clearError())
      
      expect(store.getState().auth.error).toBeNull()
    })

    it('should set user', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }

      store.dispatch(setUser(mockUser))

      expect(store.getState().auth.user).toEqual(mockUser)
    })
  })

  describe('loginUser async thunk', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123',
    }

    const mockResponse = {
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        token: 'jwt-token-123',
      },
    }

    it('should handle successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockResponse)

      await store.dispatch(loginUser(mockCredentials))

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.user).toEqual(mockResponse.data.user)
      expect(state.token).toBe(mockResponse.data.token)
      expect(state.error).toBeNull()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', mockResponse.data.token)
    })

    it('should handle login failure', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      }
      mockAuthService.login.mockRejectedValue(mockError)

      await store.dispatch(loginUser(mockCredentials))

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.error).toBe('Invalid credentials')
    })

    it('should handle login failure without response data', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Network error'))

      await store.dispatch(loginUser(mockCredentials))

      const state = store.getState().auth
      expect(state.error).toBe('Login failed')
    })

    it('should set loading state during login', async () => {
      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      const loginPromise = store.dispatch(loginUser(mockCredentials))
      
      // Check loading state immediately after dispatch
      expect(store.getState().auth.isLoading).toBe(true)
      expect(store.getState().auth.error).toBeNull()
      
      await loginPromise
      
      expect(store.getState().auth.isLoading).toBe(false)
    })
  })

  describe('registerUser async thunk', () => {
    const mockUserData = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    }

    const mockResponse = {
      data: {
        user: {
          id: 'user-456',
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
        },
        token: 'jwt-token-456',
      },
    }

    it('should handle successful registration', async () => {
      mockAuthService.register.mockResolvedValue(mockResponse)

      await store.dispatch(registerUser(mockUserData))

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.user).toEqual(mockResponse.data.user)
      expect(state.token).toBe(mockResponse.data.token)
      expect(state.error).toBeNull()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', mockResponse.data.token)
    })

    it('should handle registration failure', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Email already exists',
          },
        },
      }
      mockAuthService.register.mockRejectedValue(mockError)

      await store.dispatch(registerUser(mockUserData))

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.error).toBe('Email already exists')
    })

    it('should handle registration failure without response data', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Network error'))

      await store.dispatch(registerUser(mockUserData))

      const state = store.getState().auth
      expect(state.error).toBe('Registration failed')
    })
  })

  describe('loadUser async thunk', () => {
    const mockUserResponse = {
      data: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    }

    it('should handle successful user load', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUserResponse)

      await store.dispatch(loadUser())

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.user).toEqual(mockUserResponse.data)
      expect(state.error).toBeNull()
    })

    it('should handle user load failure and clear localStorage', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Token expired',
          },
        },
      }
      mockAuthService.getCurrentUser.mockRejectedValue(mockError)

      await store.dispatch(loadUser())

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.error).toBe('Token expired')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })

    it('should handle user load failure without response data', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Network error'))

      await store.dispatch(loadUser())

      const state = store.getState().auth
      expect(state.error).toBe('Failed to load user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })

    it('should set loading state during user load', async () => {
      mockAuthService.getCurrentUser.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUserResponse), 100))
      )

      const loadPromise = store.dispatch(loadUser())
      
      expect(store.getState().auth.isLoading).toBe(true)
      
      await loadPromise
      
      expect(store.getState().auth.isLoading).toBe(false)
    })
  })

  describe('logoutUser async thunk', () => {
    it('should handle successful logout', async () => {
      // First set a user and token
      store.dispatch(setUser({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }))
      
      // Set initial state with user and token
      store.dispatch({
        type: 'auth/loginUser/fulfilled',
        payload: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'jwt-token-123',
        },
      })

      mockAuthService.logout.mockResolvedValue({})

      await store.dispatch(logoutUser())

      const state = store.getState().auth
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })

    it('should handle logout even if service call fails', async () => {
      store.dispatch(setUser({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }))

      mockAuthService.logout.mockRejectedValue(new Error('Network error'))

      await store.dispatch(logoutUser())

      const state = store.getState().auth
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('edge cases', () => {
    it('should handle multiple concurrent login attempts', async () => {
      const mockResponse1 = {
        data: {
          user: { id: 'user-1', email: 'user1@example.com' },
          token: 'token-1',
        },
      }
      
      const mockResponse2 = {
        data: {
          user: { id: 'user-2', email: 'user2@example.com' },
          token: 'token-2',
        },
      }

      mockAuthService.login
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const promise1 = store.dispatch(loginUser({ email: 'user1@example.com', password: 'pass' }))
      const promise2 = store.dispatch(loginUser({ email: 'user2@example.com', password: 'pass' }))

      await Promise.all([promise1, promise2])

      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      // The last resolved login should win
      expect(state.user.id).toBe('user-2')
      expect(state.token).toBe('token-2')
    })

    it('should maintain loading state consistency', async () => {
      const slowPromise = new Promise(resolve => 
        setTimeout(() => resolve({
          data: { user: { id: 'user-123' }, token: 'token' }
        }), 100)
      )
      
      mockAuthService.login.mockReturnValue(slowPromise)

      const loginPromise = store.dispatch(loginUser({ email: 'test@example.com', password: 'pass' }))
      
      expect(store.getState().auth.isLoading).toBe(true)
      
      await loginPromise
      
      expect(store.getState().auth.isLoading).toBe(false)
    })

    it('should handle empty error responses gracefully', async () => {
      mockAuthService.login.mockRejectedValue({})

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'pass' }))

      expect(store.getState().auth.error).toBe('Login failed')
    })
  })

  describe('state transitions', () => {
    it('should properly transition from loading to success', async () => {
      const mockResponse = {
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'token-123',
        },
      }

      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 50))
      )

      const states: any[] = []
      
      // Subscribe to state changes
      const unsubscribe = store.subscribe(() => {
        states.push(store.getState().auth)
      })

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'pass' }))
      
      unsubscribe()

      // Should have at least pending and fulfilled states
      expect(states.length).toBeGreaterThanOrEqual(2)
      expect(states.some(state => state.isLoading === true)).toBe(true)
      expect(states[states.length - 1].isLoading).toBe(false)
      expect(states[states.length - 1].user).toEqual(mockResponse.data.user)
    })

    it('should properly transition from loading to error', async () => {
      mockAuthService.login.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject({ response: { data: { message: 'Auth failed' } } }), 50)
        )
      )

      const states: any[] = []
      
      const unsubscribe = store.subscribe(() => {
        states.push(store.getState().auth)
      })

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'pass' }))
      
      unsubscribe()

      expect(states.some(state => state.isLoading === true)).toBe(true)
      expect(states[states.length - 1].isLoading).toBe(false)
      expect(states[states.length - 1].error).toBe('Auth failed')
      expect(states[states.length - 1].user).toBeNull()
    })
  })
})