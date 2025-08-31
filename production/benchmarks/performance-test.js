/**
 * CyberTask Production Performance Benchmark Suite
 * Tests API performance, load handling, and response times
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceBenchmark {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.results = {
            responseTime: [],
            throughput: 0,
            errorRate: 0,
            concurrency: []
        };
    }

    async measureResponseTime(endpoint, iterations = 10) {
        console.log(`📊 Measuring response time for ${endpoint} (${iterations} iterations)`);
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            try {
                await axios.get(`${this.baseURL}${endpoint}`);
                const end = performance.now();
                times.push(end - start);
            } catch (error) {
                console.log(`❌ Request ${i + 1} failed: ${error.message}`);
                times.push(null);
            }
        }

        const validTimes = times.filter(t => t !== null);
        const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
        const min = Math.min(...validTimes);
        const max = Math.max(...validTimes);

        console.log(`   Average: ${avg.toFixed(2)}ms`);
        console.log(`   Min: ${min.toFixed(2)}ms`);
        console.log(`   Max: ${max.toFixed(2)}ms`);
        console.log(`   Success Rate: ${(validTimes.length / iterations * 100).toFixed(1)}%`);

        this.results.responseTime.push({
            endpoint,
            average: avg,
            min,
            max,
            successRate: validTimes.length / iterations
        });

        return { average: avg, min, max, successRate: validTimes.length / iterations };
    }

    async loadTest(endpoint, concurrentRequests = 50, duration = 30) {
        console.log(`🚛 Load testing ${endpoint} (${concurrentRequests} concurrent, ${duration}s)`);
        
        const startTime = Date.now();
        const endTime = startTime + (duration * 1000);
        let totalRequests = 0;
        let successfulRequests = 0;
        let errors = 0;

        const makeRequest = async () => {
            while (Date.now() < endTime) {
                totalRequests++;
                try {
                    await axios.get(`${this.baseURL}${endpoint}`, { timeout: 5000 });
                    successfulRequests++;
                } catch (error) {
                    errors++;
                }
            }
        };

        const workers = [];
        for (let i = 0; i < concurrentRequests; i++) {
            workers.push(makeRequest());
        }

        await Promise.all(workers);

        const actualDuration = (Date.now() - startTime) / 1000;
        const throughput = totalRequests / actualDuration;
        const errorRate = (errors / totalRequests) * 100;

        console.log(`   Total Requests: ${totalRequests}`);
        console.log(`   Successful: ${successfulRequests}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Throughput: ${throughput.toFixed(2)} req/s`);
        console.log(`   Error Rate: ${errorRate.toFixed(2)}%`);

        this.results.concurrency.push({
            endpoint,
            concurrentRequests,
            duration: actualDuration,
            totalRequests,
            successfulRequests,
            errors,
            throughput,
            errorRate
        });

        return { throughput, errorRate, successfulRequests, totalRequests };
    }

    async stressTest(endpoint, maxConcurrency = 100, stepSize = 10) {
        console.log(`💪 Stress testing ${endpoint} (up to ${maxConcurrency} concurrent)`);
        
        const results = [];
        
        for (let concurrency = stepSize; concurrency <= maxConcurrency; concurrency += stepSize) {
            console.log(`   Testing with ${concurrency} concurrent requests...`);
            
            const promises = [];
            const start = performance.now();
            
            for (let i = 0; i < concurrency; i++) {
                promises.push(
                    axios.get(`${this.baseURL}${endpoint}`, { timeout: 10000 })
                        .then(() => ({ success: true }))
                        .catch(() => ({ success: false }))
                );
            }
            
            const responses = await Promise.all(promises);
            const end = performance.now();
            
            const successful = responses.filter(r => r.success).length;
            const successRate = (successful / concurrency) * 100;
            const avgResponseTime = (end - start) / concurrency;
            
            results.push({
                concurrency,
                successful,
                successRate,
                avgResponseTime
            });
            
            console.log(`     Success Rate: ${successRate.toFixed(1)}%`);
            console.log(`     Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
            
            // Stop if success rate drops below 90%
            if (successRate < 90) {
                console.log(`   ⚠️  Success rate dropped below 90%, stopping stress test`);
                break;
            }
        }
        
        return results;
    }

    async memoryLeakTest(endpoint, iterations = 100) {
        console.log(`🧠 Memory leak test for ${endpoint} (${iterations} iterations)`);
        
        const initialMemory = process.memoryUsage();
        
        for (let i = 0; i < iterations; i++) {
            try {
                await axios.get(`${this.baseURL}${endpoint}`);
            } catch (error) {
                // Ignore errors for this test
            }
            
            if (i % 10 === 0) {
                if (global.gc) {
                    global.gc();
                }
            }
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = {
            heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
            heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
            external: finalMemory.external - initialMemory.external
        };
        
        console.log(`   Memory increase - Heap Used: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Memory increase - Heap Total: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)}MB`);
        
        return memoryIncrease;
    }

    async runBenchmarks() {
        console.log('🚀 Starting CyberTask Performance Benchmarks');
        console.log('============================================');

        // Basic response time tests
        await this.measureResponseTime('/health', 20);
        await this.measureResponseTime('/auth/validate', 10);
        
        // Load tests
        await this.loadTest('/health', 25, 15);
        await this.loadTest('/auth/validate', 10, 10);
        
        // Stress test
        const stressResults = await this.stressTest('/health', 50, 10);
        
        // Memory leak test
        const memoryResults = await this.memoryLeakTest('/health', 50);

        console.log('\n📊 Performance Summary:');
        console.log('=======================');
        
        // Response time summary
        console.log('\n📈 Response Times:');
        this.results.responseTime.forEach(result => {
            console.log(`   ${result.endpoint}: ${result.average.toFixed(2)}ms avg (${result.successRate * 100}% success)`);
        });
        
        // Load test summary
        console.log('\n🚛 Load Test Results:');
        this.results.concurrency.forEach(result => {
            console.log(`   ${result.endpoint}: ${result.throughput.toFixed(2)} req/s (${result.errorRate.toFixed(1)}% errors)`);
        });
        
        // Performance recommendations
        console.log('\n💡 Recommendations:');
        const avgResponseTime = this.results.responseTime.reduce((acc, r) => acc + r.average, 0) / this.results.responseTime.length;
        
        if (avgResponseTime < 100) {
            console.log('   ✅ Excellent response times (< 100ms average)');
        } else if (avgResponseTime < 200) {
            console.log('   ✅ Good response times (< 200ms average)');
        } else {
            console.log('   ⚠️  Consider optimizing response times (> 200ms average)');
        }
        
        const avgErrorRate = this.results.concurrency.reduce((acc, r) => acc + r.errorRate, 0) / this.results.concurrency.length;
        
        if (avgErrorRate < 1) {
            console.log('   ✅ Excellent error rates (< 1%)');
        } else if (avgErrorRate < 5) {
            console.log('   ✅ Good error rates (< 5%)');
        } else {
            console.log('   ⚠️  High error rates detected, investigate server stability');
        }

        return {
            responseTime: this.results.responseTime,
            loadTest: this.results.concurrency,
            stressTest: stressResults,
            memoryTest: memoryResults
        };
    }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
    const baseURL = process.env.VITE_API_URL || 'https://cybertask-backend.railway.app/api';
    
    const benchmark = new PerformanceBenchmark(baseURL);
    benchmark.runBenchmarks().catch(console.error);
}

module.exports = PerformanceBenchmark;