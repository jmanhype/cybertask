describe('Authentication Flow', () => {
  const testUser = {
    email: 'cypress@example.com',
    password: 'CypressTest123!',
    firstName: 'Cypress',
    lastName: 'User',
  };

  const adminUser = {
    email: 'admin@example.com',
    password: 'AdminTest123!',
    firstName: 'Admin',
    lastName: 'User',
  };

  beforeEach(() => {
    // Reset database state
    cy.task('db:seed');
    
    // Clear all cookies and local storage
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Visit the app
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      cy.visit('/register');
      
      // Verify we're on the registration page
      cy.contains('Create Account').should('be.visible');
      cy.url().should('include', '/register');

      // Fill out registration form
      cy.get('[data-testid="firstName-input"]').type(testUser.firstName);
      cy.get('[data-testid="lastName-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirmPassword-input"]').type(testUser.password);

      // Accept terms and conditions
      cy.get('[data-testid="terms-checkbox"]').check();

      // Submit form
      cy.get('[data-testid="register-button"]').click();

      // Verify successful registration
      cy.get('[data-testid="success-message"]').should('contain', 'Account created successfully');
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      
      // Verify user is logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.get('[data-testid="user-name"]').should('contain', testUser.firstName);
    });

    it('should show validation errors for invalid input', () => {
      cy.visit('/register');

      // Try to submit empty form
      cy.get('[data-testid="register-button"]').click();

      // Check for validation errors
      cy.get('[data-testid="firstName-error"]').should('contain', 'First name is required');
      cy.get('[data-testid="lastName-error"]').should('contain', 'Last name is required');
      cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');

      // Test invalid email format
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email');
      cy.get('[data-testid="password-error"]').should('contain', 'Password must be at least 8 characters');
    });

    it('should prevent registration with existing email', () => {
      // First, register a user
      cy.task('db:createUser', testUser);

      cy.visit('/register');
      
      cy.get('[data-testid="firstName-input"]').type(testUser.firstName);
      cy.get('[data-testid="lastName-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirmPassword-input"]').type(testUser.password);
      cy.get('[data-testid="terms-checkbox"]').check();

      cy.get('[data-testid="register-button"]').click();

      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'User with this email already exists');
      
      // Should remain on registration page
      cy.url().should('include', '/register');
    });

    it('should enforce password confirmation matching', () => {
      cy.visit('/register');
      
      cy.get('[data-testid="firstName-input"]').type(testUser.firstName);
      cy.get('[data-testid="lastName-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirmPassword-input"]').type('DifferentPassword123!');
      cy.get('[data-testid="terms-checkbox"]').check();

      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="confirmPassword-error"]').should('contain', 'Passwords must match');
    });

    it('should handle server errors gracefully', () => {
      // Mock server error
      cy.intercept('POST', '/api/auth/register', {
        statusCode: 500,
        body: { success: false, message: 'Internal server error' },
      }).as('registerError');

      cy.visit('/register');
      
      cy.get('[data-testid="firstName-input"]').type(testUser.firstName);
      cy.get('[data-testid="lastName-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirmPassword-input"]').type(testUser.password);
      cy.get('[data-testid="terms-checkbox"]').check();

      cy.get('[data-testid="register-button"]').click();

      cy.wait('@registerError');
      cy.get('[data-testid="error-message"]').should('contain', 'Registration failed');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Create test user
      cy.task('db:createUser', testUser);
    });

    it('should login user successfully', () => {
      cy.visit('/login');
      
      // Verify we're on the login page
      cy.contains('Sign In').should('be.visible');
      cy.url().should('include', '/login');

      // Fill out login form
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);

      // Submit form
      cy.get('[data-testid="login-button"]').click();

      // Verify successful login
      cy.url().should('include', '/dashboard');
      
      // Verify user is logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.get('[data-testid="user-name"]').should('contain', testUser.firstName);

      // Verify token is stored
      cy.window().its('localStorage.token').should('exist');
    });

    it('should remember user when "Remember Me" is checked', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="remember-checkbox"]').check();

      cy.get('[data-testid="login-button"]').click();

      // Verify login success
      cy.url().should('include', '/dashboard');

      // Verify tokens are stored with longer expiration
      cy.window().its('localStorage.refreshToken').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type('wrongpassword');

      cy.get('[data-testid="login-button"]').click();

      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password');
      
      // Should remain on login page
      cy.url().should('include', '/login');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      
      // Try to submit empty form
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
    });

    it('should prevent login for inactive accounts', () => {
      // Create inactive user
      const inactiveUser = { ...testUser, isActive: false };
      cy.task('db:createUser', inactiveUser);

      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="error-message"]').should('contain', 'Account is deactivated');
    });

    it('should redirect to originally requested page after login', () => {
      // Try to access protected page
      cy.visit('/dashboard/projects');
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Login
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      // Should redirect to originally requested page
      cy.url().should('include', '/dashboard/projects');
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.task('db:createUser', testUser);
    });

    it('should initiate password reset successfully', () => {
      cy.visit('/login');
      
      // Click forgot password link
      cy.get('[data-testid="forgot-password-link"]').click();
      
      // Should navigate to forgot password page
      cy.url().should('include', '/forgot-password');
      cy.contains('Reset Password').should('be.visible');

      // Enter email
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="reset-button"]').click();

      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('contain', 'If the email exists, a password reset link has been sent');
    });

    it('should reset password with valid token', () => {
      // Create password reset token
      cy.task('db:createPasswordResetToken', { 
        email: testUser.email, 
        token: 'valid-reset-token' 
      });

      cy.visit('/reset-password?token=valid-reset-token');
      
      const newPassword = 'NewPassword123!';
      
      cy.get('[data-testid="password-input"]').type(newPassword);
      cy.get('[data-testid="confirmPassword-input"]').type(newPassword);
      cy.get('[data-testid="reset-password-button"]').click();

      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Password reset successful');

      // Should redirect to login
      cy.url().should('include', '/login');

      // Should be able to login with new password
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(newPassword);
      cy.get('[data-testid="login-button"]').click();

      cy.url().should('include', '/dashboard');
    });

    it('should handle invalid reset token', () => {
      cy.visit('/reset-password?token=invalid-token');
      
      cy.get('[data-testid="password-input"]').type('NewPassword123!');
      cy.get('[data-testid="confirmPassword-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-button"]').click();

      cy.get('[data-testid="error-message"]')
        .should('contain', 'Invalid or expired reset token');
    });

    it('should handle expired reset token', () => {
      // Create expired token
      cy.task('db:createPasswordResetToken', { 
        email: testUser.email, 
        token: 'expired-token',
        expired: true 
      });

      cy.visit('/reset-password?token=expired-token');
      
      cy.get('[data-testid="password-input"]').type('NewPassword123!');
      cy.get('[data-testid="confirmPassword-input"]').type('NewPassword123!');
      cy.get('[data-testid="reset-password-button"]').click();

      cy.get('[data-testid="error-message"]')
        .should('contain', 'Invalid or expired reset token');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.task('db:createUser', testUser);
      // Login user
      cy.login(testUser.email, testUser.password);
    });

    it('should logout user successfully', () => {
      cy.visit('/dashboard');
      
      // Verify user is logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
      
      // Click user menu
      cy.get('[data-testid="user-menu-button"]').click();
      
      // Click logout
      cy.get('[data-testid="logout-button"]').click();

      // Should redirect to login page
      cy.url().should('include', '/login');
      
      // Tokens should be cleared
      cy.window().its('localStorage.token').should('not.exist');
      cy.window().its('localStorage.refreshToken').should('not.exist');

      // Should not be able to access protected routes
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should handle logout from all devices', () => {
      cy.visit('/dashboard/settings');
      
      // Click logout from all devices
      cy.get('[data-testid="logout-all-devices-button"]').click();
      
      // Should show confirmation dialog
      cy.get('[data-testid="confirm-logout-all"]').should('be.visible');
      cy.get('[data-testid="confirm-button"]').click();

      // Should redirect to login
      cy.url().should('include', '/login');
      
      // All tokens should be invalidated
      cy.window().its('localStorage').should('be.empty');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      cy.task('db:createUser', testUser);
    });

    it('should handle expired access token', () => {
      // Login and get tokens
      cy.login(testUser.email, testUser.password);
      
      // Mock expired token response
      cy.intercept('GET', '/api/users/profile', {
        statusCode: 401,
        body: { success: false, error: 'TOKEN_EXPIRED' },
      }).as('expiredToken');

      cy.visit('/dashboard/profile');
      
      // Should attempt token refresh automatically
      cy.wait('@expiredToken');
      
      // Should still be on the page after refresh
      cy.url().should('include', '/dashboard/profile');
    });

    it('should redirect to login when refresh token is invalid', () => {
      // Login user
      cy.login(testUser.email, testUser.password);
      
      // Mock both access token and refresh token as expired
      cy.intercept('GET', '/api/**', {
        statusCode: 401,
        body: { success: false, error: 'TOKEN_EXPIRED' },
      });
      
      cy.intercept('POST', '/api/auth/refresh', {
        statusCode: 401,
        body: { success: false, error: 'REFRESH_TOKEN_EXPIRED' },
      });

      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should persist session across browser refresh', () => {
      cy.login(testUser.email, testUser.password);
      cy.visit('/dashboard');
      
      // Refresh the browser
      cy.reload();
      
      // Should still be logged in
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should handle concurrent session limit', () => {
      // This would be implemented if the app has session limits
      cy.login(testUser.email, testUser.password);
      cy.visit('/dashboard');
      
      // Simulate login from another device
      cy.task('db:createSession', { userId: testUser.id, concurrent: true });
      
      // Make an API request
      cy.get('[data-testid="user-menu-button"]').click();
      
      // Should handle session conflict gracefully
      // Implementation depends on app's session management strategy
    });
  });

  describe('Email Verification', () => {
    it('should verify email with valid token', () => {
      // Create unverified user
      const unverifiedUser = { ...testUser, emailVerified: false };
      cy.task('db:createUser', unverifiedUser);
      
      // Create verification token
      cy.task('db:createEmailVerificationToken', {
        email: testUser.email,
        token: 'valid-verification-token'
      });

      cy.visit('/verify-email?token=valid-verification-token');
      
      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Email verified successfully');
      
      // Should provide login link
      cy.get('[data-testid="login-link"]').click();
      cy.url().should('include', '/login');
    });

    it('should handle invalid verification token', () => {
      cy.visit('/verify-email?token=invalid-token');
      
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Invalid verification token');
    });

    it('should resend verification email', () => {
      // Create unverified user and login
      const unverifiedUser = { ...testUser, emailVerified: false };
      cy.task('db:createUser', unverifiedUser);
      cy.login(testUser.email, testUser.password);
      
      cy.visit('/dashboard');
      
      // Should show email verification banner
      cy.get('[data-testid="email-verification-banner"]').should('be.visible');
      
      // Click resend verification
      cy.get('[data-testid="resend-verification-button"]').click();
      
      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Verification email sent');
    });
  });

  describe('Security Features', () => {
    beforeEach(() => {
      cy.task('db:createUser', testUser);
    });

    it('should enforce rate limiting on login attempts', () => {
      cy.visit('/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        cy.get('[data-testid="email-input"]').clear().type(testUser.email);
        cy.get('[data-testid="password-input"]').clear().type('wrongpassword');
        cy.get('[data-testid="login-button"]').click();
        
        if (i < 5) {
          cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password');
        }
      }
      
      // Should show rate limit error
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Too many login attempts');
    });

    it('should prevent CSRF attacks', () => {
      cy.login(testUser.email, testUser.password);
      
      // Attempt to make request without CSRF token
      cy.request({
        method: 'POST',
        url: '/api/users/profile',
        headers: {
          'Content-Type': 'application/json',
        },
        body: { firstName: 'Hacked' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });

    it('should handle suspicious activity', () => {
      cy.login(testUser.email, testUser.password);
      
      // Simulate suspicious activity (multiple rapid requests)
      for (let i = 0; i < 10; i++) {
        cy.request({
          method: 'GET',
          url: '/api/users/profile',
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('token')}`,
          },
          failOnStatusCode: false,
        });
      }
      
      // Should trigger security measures
      cy.visit('/dashboard');
      cy.get('[data-testid="security-warning"]').should('be.visible');
    });
  });

  describe('Multi-Factor Authentication', () => {
    beforeEach(() => {
      // Create user with MFA enabled
      const mfaUser = { ...testUser, mfaEnabled: true };
      cy.task('db:createUser', mfaUser);
    });

    it('should require MFA code during login', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      // Should redirect to MFA verification
      cy.url().should('include', '/mfa-verify');
      cy.contains('Enter Verification Code').should('be.visible');

      // Enter MFA code
      cy.get('[data-testid="mfa-code-input"]').type('123456');
      cy.get('[data-testid="verify-button"]').click();

      // Should complete login
      cy.url().should('include', '/dashboard');
    });

    it('should handle invalid MFA code', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      cy.url().should('include', '/mfa-verify');
      
      cy.get('[data-testid="mfa-code-input"]').type('000000');
      cy.get('[data-testid="verify-button"]').click();

      cy.get('[data-testid="error-message"]')
        .should('contain', 'Invalid verification code');
    });
  });
});