# CyberTask API Authentication Guide

This guide explains how to authenticate with the CyberTask API using JWT (JSON Web Token) based authentication.

## Table of Contents

- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [Token Types](#token-types)
- [Getting Started](#getting-started)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

CyberTask API uses JWT-based authentication with access and refresh tokens. This provides:

- **Secure authentication** without storing passwords
- **Stateless sessions** with self-contained tokens
- **Automatic token refresh** for seamless user experience
- **Role-based access control** for different user permissions

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database

    Note over Client, Database: 1. Registration/Login
    Client->>API: POST /auth/login
    API->>Database: Verify credentials
    Database-->>API: User data
    API-->>Client: Access + Refresh tokens

    Note over Client, Database: 2. API Requests
    Client->>API: GET /tasks (with Bearer token)
    API->>API: Validate access token
    API-->>Client: Protected resource

    Note over Client, Database: 3. Token Refresh
    Client->>API: POST /auth/refresh
    API->>API: Validate refresh token
    API-->>Client: New access token

    Note over Client, Database: 4. Logout
    Client->>API: POST /auth/logout
    API->>Database: Invalidate refresh tokens
    API-->>Client: Success response
```

## Token Types

### Access Token

- **Purpose**: Authenticate API requests
- **Lifetime**: 1 hour (3600 seconds)
- **Usage**: Include in `Authorization` header for all protected endpoints
- **Security**: Short-lived to minimize risk if compromised

### Refresh Token

- **Purpose**: Obtain new access tokens
- **Lifetime**: 30 days
- **Usage**: Send to `/auth/refresh` endpoint when access token expires
- **Security**: Long-lived but can be revoked on logout

## Getting Started

### Step 1: User Registration

Create a new user account:

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe", 
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "cld1234567890",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### Step 2: User Login

Authenticate with existing credentials:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cld1234567890",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### Step 3: Making Authenticated Requests

Include the access token in the Authorization header:

```http
GET /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Token Refresh

When the access token expires, use the refresh token to get a new one:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### Step 5: Logout

Invalidate all refresh tokens for the user:

```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Implementation Examples

### JavaScript (Browser/Node.js)

```javascript
class CyberTaskAuth {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.accessToken = data.data.accessToken;
        this.refreshToken = data.data.refreshToken;
        
        // Store tokens securely
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        
        return data.data.user;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      const data = await response.json();

      if (data.success) {
        this.accessToken = data.data.accessToken;
        localStorage.setItem('accessToken', this.accessToken);
        return this.accessToken;
      } else {
        // Refresh token invalid, redirect to login
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  async apiCall(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    };

    try {
      let response = await fetch(url, config);

      // If access token expired, try to refresh
      if (response.status === 401 && this.refreshToken) {
        await this.refreshAccessToken();
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, config);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.accessToken) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear tokens regardless of API call success
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

// Usage example
const auth = new CyberTaskAuth();

// Login
await auth.login('john.doe@example.com', 'password123');

// Make authenticated API calls
const tasks = await auth.apiCall('/tasks');
console.log('User tasks:', tasks);

// Logout
await auth.logout();
```

### Python

```python
import requests
import json
from datetime import datetime, timedelta

class CyberTaskAuth:
    def __init__(self, base_url='http://localhost:3000/api'):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

    def login(self, email, password):
        """Login and store tokens"""
        url = f"{self.base_url}/auth/login"
        data = {
            'email': email,
            'password': password
        }
        
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get('success'):
            self.access_token = result['data']['accessToken']
            self.refresh_token = result['data']['refreshToken']
            expires_in = result['data']['expiresIn']
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)  # 1 minute buffer
            return result['data']['user']
        else:
            raise Exception(f"Login failed: {result.get('message')}")

    def refresh_access_token(self):
        """Refresh the access token using refresh token"""
        if not self.refresh_token:
            raise Exception("No refresh token available")
        
        url = f"{self.base_url}/auth/refresh"
        data = {'refreshToken': self.refresh_token}
        
        response = requests.post(url, json=data)
        result = response.json()
        
        if result.get('success'):
            self.access_token = result['data']['accessToken']
            expires_in = result['data']['expiresIn']
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)
            return self.access_token
        else:
            self.logout()  # Clear invalid tokens
            raise Exception("Session expired. Please login again.")

    def _ensure_valid_token(self):
        """Ensure access token is valid, refresh if necessary"""
        if not self.access_token:
            raise Exception("Not authenticated")
        
        if self.token_expires_at and datetime.now() >= self.token_expires_at:
            self.refresh_access_token()

    def api_call(self, endpoint, method='GET', data=None):
        """Make authenticated API call"""
        self._ensure_valid_token()
        
        url = f"{self.base_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise Exception(f"Unsupported HTTP method: {method}")
            
            # If token expired, try to refresh and retry
            if response.status_code == 401:
                self.refresh_access_token()
                headers['Authorization'] = f'Bearer {self.access_token}'
                
                if method == 'GET':
                    response = requests.get(url, headers=headers)
                elif method == 'POST':
                    response = requests.post(url, headers=headers, json=data)
                elif method == 'PUT':
                    response = requests.put(url, headers=headers, json=data)
                elif method == 'DELETE':
                    response = requests.delete(url, headers=headers)
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"API call failed: {str(e)}")

    def logout(self):
        """Logout and clear tokens"""
        if self.access_token:
            try:
                url = f"{self.base_url}/auth/logout"
                headers = {'Authorization': f'Bearer {self.access_token}'}
                requests.post(url, headers=headers)
            except:
                pass  # Ignore errors during logout API call
        
        # Clear tokens
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

    def is_authenticated(self):
        """Check if user is authenticated"""
        return self.access_token is not None

# Usage example
auth = CyberTaskAuth()

# Login
user = auth.login('john.doe@example.com', 'password123')
print(f"Logged in as: {user['firstName']} {user['lastName']}")

# Make authenticated API calls
tasks = auth.api_call('/tasks')
print(f"User has {len(tasks['data'])} tasks")

# Create a new task
new_task = auth.api_call('/tasks', 'POST', {
    'title': 'Complete API integration',
    'description': 'Integrate with CyberTask API',
    'priority': 'HIGH',
    'projectId': 'cld1234567890'
})
print(f"Created task: {new_task['data']['title']}")

# Logout
auth.logout()
```

### React Hook Example

```jsx
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const { user, accessToken, refreshToken } = data.data;
        
        setUser(user);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        return user;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Refresh token function
  const refreshAccessToken = async () => {
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        const newAccessToken = data.data.accessToken;
        setAccessToken(newAccessToken);
        localStorage.setItem('accessToken', newAccessToken);
        return newAccessToken;
      } else {
        logout();
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return null;
    }
  };

  // API call with automatic token refresh
  const apiCall = async (endpoint, options = {}) => {
    const makeRequest = async (token) => {
      return fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
    };

    try {
      let response = await makeRequest(accessToken);

      // If token expired, try to refresh
      if (response.status === 401 && refreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await makeRequest(newToken);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (accessToken) {
        await fetch(`${baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken && refreshToken) {
        try {
          // Verify token is still valid by fetching user profile
          const userData = await apiCall('/users/profile');
          setUser(userData.data);
        } catch (error) {
          // Token invalid, try to refresh
          const newToken = await refreshAccessToken();
          if (newToken) {
            try {
              const userData = await apiCall('/users/profile');
              setUser(userData.data);
            } catch (error) {
              logout();
            }
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const value = {
    user,
    accessToken,
    loading,
    login,
    logout,
    apiCall,
    isAuthenticated: !!accessToken && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Protected Route component
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Usage in components
const TaskList = () => {
  const { apiCall } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await apiCall('/tasks');
        setTasks(response.data);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [apiCall]);

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div>
      <h2>My Tasks</h2>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>Status: {task.status}</p>
          <p>Priority: {task.priority}</p>
        </div>
      ))}
    </div>
  );
};
```

## Best Practices

### Token Storage

#### Browser Applications
- **Use secure storage**: Store refresh tokens in httpOnly cookies when possible
- **Avoid localStorage**: For sensitive applications, consider sessionStorage or memory storage
- **Implement CSP**: Use Content Security Policy to prevent XSS attacks

#### Mobile Applications
- **Use secure storage**: iOS Keychain, Android Keystore, or encrypted storage
- **Implement biometric authentication**: Add fingerprint/face recognition for additional security
- **Handle app backgrounding**: Clear sensitive data when app goes to background

#### Server Applications
- **Use environment variables**: Store tokens in secure environment variables
- **Implement proper secrets management**: Use solutions like HashiCorp Vault or AWS Secrets Manager

### Token Refresh Strategy

```javascript
class TokenManager {
  constructor() {
    this.refreshPromise = null;
  }

  async ensureValidToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    if (this.isTokenExpired()) {
      this.refreshPromise = this.refreshToken();
      try {
        await this.refreshPromise;
      } finally {
        this.refreshPromise = null;
      }
    }

    return this.accessToken;
  }

  isTokenExpired() {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return true;
    }
    
    // Refresh 5 minutes before expiry
    const bufferTime = 5 * 60 * 1000;
    return Date.now() > (this.tokenExpiresAt - bufferTime);
  }
}
```

### Error Handling

```javascript
const handleAuthError = (error, response) => {
  if (response.status === 401) {
    // Token expired or invalid
    if (error.code === 'TOKEN_EXPIRED') {
      // Try to refresh token
      return refreshToken();
    } else if (error.code === 'INVALID_TOKEN') {
      // Redirect to login
      redirectToLogin();
    }
  } else if (response.status === 403) {
    // Insufficient permissions
    showError('You do not have permission to access this resource');
  } else if (response.status === 429) {
    // Rate limit exceeded
    showError('Too many requests. Please try again later.');
  }
};
```

## Security Considerations

### Token Security

1. **Use HTTPS**: Always use secure connections in production
2. **Validate SSL certificates**: Implement proper certificate validation
3. **Implement token rotation**: Rotate refresh tokens periodically
4. **Use short-lived access tokens**: 1 hour or less for access tokens
5. **Implement token blacklisting**: Maintain revoked token list if needed

### Password Security

1. **Enforce strong passwords**: Minimum 8 characters, mixed case, numbers, symbols
2. **Implement rate limiting**: Limit login attempts per IP/user
3. **Use secure password reset**: Implement secure password reset flow
4. **Hash passwords properly**: Server should use bcrypt or similar

### General Security

1. **Validate input**: Always validate and sanitize input data
2. **Use CORS properly**: Configure CORS for your specific domain
3. **Implement CSP**: Use Content Security Policy headers
4. **Log security events**: Monitor and log authentication events
5. **Regular security audits**: Regularly review and test security measures

### Compliance Considerations

For applications handling sensitive data:

1. **GDPR compliance**: Implement proper data protection measures
2. **HIPAA compliance**: For healthcare applications, ensure HIPAA compliance
3. **SOC 2**: Implement SOC 2 security controls if applicable
4. **Regular penetration testing**: Conduct security assessments

## Troubleshooting

### Common Issues

#### "Invalid or expired token" Error

**Cause**: Access token has expired or is malformed
**Solution**:
```javascript
// Check if token is properly formatted
if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(accessToken)) {
  console.error('Malformed JWT token');
  // Redirect to login
}

// Implement automatic token refresh
try {
  const response = await apiCall('/protected-endpoint');
} catch (error) {
  if (error.status === 401) {
    await refreshAccessToken();
    // Retry the request
  }
}
```

#### "Refresh token invalid" Error

**Cause**: Refresh token has expired or been revoked
**Solution**:
```javascript
const handleRefreshError = (error) => {
  if (error.code === 'REFRESH_TOKEN_EXPIRED') {
    // Clear all tokens and redirect to login
    clearTokens();
    redirectToLogin();
  }
};
```

#### CORS Issues

**Cause**: Cross-origin requests blocked by browser
**Solution**:
- Configure server CORS settings properly
- Use credentials flag for requests with cookies
```javascript
fetch(url, {
  credentials: 'include',  // Include cookies in requests
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Rate Limiting

**Cause**: Too many requests in short time period
**Solution**:
```javascript
const handleRateLimit = (response) => {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      // Wait specified time before retry
      setTimeout(() => {
        // Retry the request
      }, parseInt(retryAfter) * 1000);
    }
  }
};
```

### Debugging Tips

1. **Check network tab**: Inspect request/response headers in browser dev tools
2. **Decode JWT tokens**: Use jwt.io to inspect token contents
3. **Check server logs**: Review server logs for authentication errors
4. **Verify token format**: Ensure tokens are properly formatted
5. **Test with curl**: Use curl to test API endpoints directly

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### Support Resources

- **API Documentation**: [Interactive Swagger UI](./swagger-ui.html)
- **Support Email**: [support@cybertask.com](mailto:support@cybertask.com)
- **GitHub Issues**: Report bugs and request features
- **Community Forum**: Get help from other developers

---

For additional questions or support, please don't hesitate to reach out to our development team.