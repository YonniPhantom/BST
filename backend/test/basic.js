/**
 * Basic tests for BST Backend
 * Simple test suite to verify backend functionality
 */

const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Test configuration
const tests = [
  {
    name: 'Server Health Check',
    method: 'GET',
    path: '/',
    expectedStatus: 200
  },
  {
    name: 'Database Health Check',
    method: 'GET',
    path: '/api/health',
    expectedStatus: [200, 404] // 404 is OK if DB not initialized
  },
  {
    name: 'Auth Providers',
    method: 'GET',
    path: '/api/auth/providers',
    expectedStatus: 200
  },
  {
    name: 'Student Search (no query)',
    method: 'GET',
    path: '/api/students/search',
    expectedStatus: 200
  }
];

// Simple HTTP request helper
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Starting BST Backend Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`⏳ Running: ${test.name}`);
      
      const response = await makeRequest(test.method, test.path);
      const expectedStatuses = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus 
        : [test.expectedStatus];
      
      if (expectedStatuses.includes(response.status)) {
        console.log(`✅ PASS: ${test.name} (Status: ${response.status})`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name} (Expected: ${test.expectedStatus}, Got: ${response.status})`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('GET', '/');
    console.log('✅ Server is running, starting tests...\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running!');
    console.log('💡 Start the server with: npm start');
    console.log('💡 Or in development mode: npm run dev\n');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Tests interrupted');
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
