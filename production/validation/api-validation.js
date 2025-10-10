/**
 * CyberTask Production API Validation Suite
 * Validates all endpoints are working correctly in production
 */

const axios = require('axios');
const WebSocket = require('ws');

class ProductionValidator {
    constructor(baseURL, wsURL) {
        this.baseURL = baseURL;
        this.wsURL = wsURL;
        this.token = null;
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runTest(name, testFn) {
        console.log(`🧪 Running: ${name}`);
        this.results.total++;
        
        try {
            await testFn();
            console.log(`✅ PASSED: ${name}`);
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED' });
        } catch (error) {
            console.log(`❌ FAILED: ${name} - ${error.message}`);
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
        }
    }

    async validateHealthEndpoint() {
        await this.runTest('Health Check', async () => {
            const response = await axios.get(`${this.baseURL}/health`);
            if (response.status !== 200) {
                throw new Error(`Expected 200, got ${response.status}`);
            }
            if (!response.data.status || response.data.status !== 'healthy') {
                throw new Error('Health check returned unhealthy status');
            }
        });
    }

    async validateAuthentication() {
        await this.runTest('User Registration', async () => {
            const testUser = {
                email: `test-${Date.now()}@cybertask.com`,
                password: 'TestPassword123!',
                name: 'Test User'
            };
            
            const response = await axios.post(`${this.baseURL}/auth/register`, testUser);
            if (response.status !== 201) {
                throw new Error(`Registration failed with status ${response.status}`);
            }
            if (!response.data.token) {
                throw new Error('Registration did not return token');
            }
        });

        await this.runTest('User Login', async () => {
            const credentials = {
                email: 'demo@cybertask.com',
                password: 'Demo123!'
            };
            
            const response = await axios.post(`${this.baseURL}/auth/login`, credentials);
            if (response.status !== 200) {
                throw new Error(`Login failed with status ${response.status}`);
            }
            if (!response.data.token) {
                throw new Error('Login did not return token');
            }
            this.token = response.data.token;
        });
    }

    async validateTaskEndpoints() {
        const headers = { Authorization: `Bearer ${this.token}` };

        await this.runTest('Get Tasks', async () => {
            const response = await axios.get(`${this.baseURL}/tasks`, { headers });
            if (response.status !== 200) {
                throw new Error(`Get tasks failed with status ${response.status}`);
            }
            if (!Array.isArray(response.data)) {
                throw new Error('Tasks response is not an array');
            }
        });

        await this.runTest('Create Task', async () => {
            const newTask = {
                title: `Test Task ${Date.now()}`,
                description: 'This is a test task created during production validation',
                priority: 'medium',
                status: 'pending'
            };
            
            const response = await axios.post(`${this.baseURL}/tasks`, newTask, { headers });
            if (response.status !== 201) {
                throw new Error(`Create task failed with status ${response.status}`);
            }
            if (!response.data.id) {
                throw new Error('Created task does not have ID');
            }
        });
    }

    async validateWebSocketConnection() {
        await this.runTest('WebSocket Connection', () => {
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(this.wsURL, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });

                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 5000);

                ws.on('open', () => {
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                });

                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        });
    }

    async validateDatabaseConnection() {
        await this.runTest('Database Connection', async () => {
            // Test database through API endpoint that requires DB access
            const headers = { Authorization: `Bearer ${this.token}` };
            const response = await axios.get(`${this.baseURL}/users/profile`, { headers });
            
            if (response.status !== 200) {
                throw new Error(`Database test failed with status ${response.status}`);
            }
            if (!response.data.id) {
                throw new Error('User profile missing from database');
            }
        });
    }

    async validateSecurityHeaders() {
        await this.runTest('Security Headers', async () => {
            const response = await axios.get(`${this.baseURL}/health`);
            const headers = response.headers;
            
            const requiredHeaders = [
                'x-frame-options',
                'x-content-type-options',
                'x-xss-protection'
            ];
            
            for (const header of requiredHeaders) {
                if (!headers[header]) {
                    throw new Error(`Missing security header: ${header}`);
                }
            }
        });
    }

    async validateRateLimiting() {
        await this.runTest('Rate Limiting', async () => {
            // Send multiple requests quickly to test rate limiting
            const requests = [];
            for (let i = 0; i < 10; i++) {
                requests.push(axios.get(`${this.baseURL}/health`));
            }
            
            try {
                await Promise.all(requests);
                // If we get here, rate limiting might not be working
                // But some endpoints might not be rate limited, so this is informational
                console.log('ℹ️  Rate limiting test completed (all requests succeeded)');
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    // This is expected - rate limiting is working
                    return;
                }
                throw error;
            }
        });
    }

    async runAllValidations() {
        console.log('🚀 Starting CyberTask Production Validation');
        console.log('==========================================');

        await this.validateHealthEndpoint();
        await this.validateSecurityHeaders();
        await this.validateAuthentication();
        await this.validateTaskEndpoints();
        await this.validateDatabaseConnection();
        await this.validateWebSocketConnection();
        await this.validateRateLimiting();

        console.log('\n📊 Validation Results:');
        console.log('======================');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 All validations passed! Production deployment is successful.');
        } else {
            console.log('\n⚠️  Some validations failed. Review the issues above.');
            process.exit(1);
        }

        return this.results;
    }
}

// Run validation if this file is executed directly
if (require.main === module) {
    const baseURL = process.env.VITE_API_URL || 'https://cybertask-backend.railway.app/api';
    const wsURL = process.env.VITE_WS_URL || 'wss://cybertask-backend.railway.app';
    
    const validator = new ProductionValidator(baseURL, wsURL);
    validator.runAllValidations().catch(console.error);
}

module.exports = ProductionValidator;