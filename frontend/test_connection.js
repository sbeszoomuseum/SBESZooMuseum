/**
 * Frontend Connection Test Script
 * 
 * Copy and paste this code into your browser console (F12) 
 * on the frontend (http://localhost:3000) to test the backend connection
 */

const BioMuseumConnectionTest = (() => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  const API_URL = `${BACKEND_URL}/api`;
  
  const log = {
    header: (text) => {
      console.log('%c' + '='.repeat(60), 'color: cyan; font-weight: bold');
      console.log('%c  ' + text, 'color: cyan; font-weight: bold; font-size: 14px');
      console.log('%c' + '='.repeat(60), 'color: cyan; font-weight: bold');
    },
    section: (text) => {
      console.log('%c' + text, 'color: blue; font-weight: bold; font-size: 12px');
    },
    pass: (text, details = '') => {
      console.log(`%c✅ ${text}${details ? ': ' + details : ''}`, 'color: green; font-weight: bold');
    },
    fail: (text, error = '') => {
      console.log(`%c❌ ${text}${error ? ': ' + error : ''}`, 'color: red; font-weight: bold');
    },
    info: (text) => {
      console.log(`%cℹ️  ${text}`, 'color: gray');
    },
    divider: () => {
      console.log('%c' + '-'.repeat(60), 'color: gray');
    }
  };
  
  const tests = {
    results: [],
    
    async testHealthCheck() {
      log.section('Test 1: Health Check');
      try {
        const response = await fetch(BACKEND_URL);
        const data = await response.json();
        
        if (response.status === 200) {
          log.pass('Backend Health Check', `Status ${response.status}`);
          log.info(`Service: ${data.service || 'Unknown'}, Version: ${data.version || 'Unknown'}`);
          this.results.push({ name: 'Health Check', passed: true });
          return true;
        } else {
          log.fail('Health Check', `Unexpected status ${response.status}`);
          this.results.push({ name: 'Health Check', passed: false });
          return false;
        }
      } catch (error) {
        log.fail('Health Check', error.message);
        log.info('Make sure backend is running on http://localhost:8000');
        this.results.push({ name: 'Health Check', passed: false });
        return false;
      }
    },
    
    async testCORSHeaders() {
      log.section('Test 2: CORS Headers');
      try {
        const response = await fetch(`${API_URL}/organisms`, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'GET'
          }
        });
        
        const corsHeader = response.headers.get('access-control-allow-origin');
        if (corsHeader) {
          log.pass('CORS Headers', corsHeader);
          log.info(`Methods: ${response.headers.get('access-control-allow-methods') || 'Not specified'}`);
          this.results.push({ name: 'CORS Configuration', passed: true });
          return true;
        } else {
          log.fail('CORS Headers', 'No access-control-allow-origin header');
          this.results.push({ name: 'CORS Configuration', passed: false });
          return false;
        }
      } catch (error) {
        log.fail('CORS Check', error.message);
        this.results.push({ name: 'CORS Configuration', passed: false });
        return false;
      }
    },
    
    async testOrganismsEndpoint() {
      log.section('Test 3: GET /api/organisms');
      try {
        const response = await fetch(`${API_URL}/organisms`);
        
        if (response.status === 200) {
          const data = await response.json();
          const count = Array.isArray(data) ? data.length : 0;
          log.pass(`GET /api/organisms`, `${count} organisms found`);
          this.results.push({ name: 'GET /api/organisms', passed: true });
          return true;
        } else {
          log.fail(`GET /api/organisms`, `Status ${response.status}`);
          this.results.push({ name: 'GET /api/organisms', passed: false });
          return false;
        }
      } catch (error) {
        log.fail('GET /api/organisms', error.message);
        this.results.push({ name: 'GET /api/organisms', passed: false });
        return false;
      }
    },
    
    async testSearchEndpoint() {
      log.section('Test 4: GET /api/search');
      try {
        const response = await fetch(`${API_URL}/search?q=lion`);
        
        if (response.status === 200) {
          const data = await response.json();
          const count = Array.isArray(data) ? data.length : 0;
          log.pass('GET /api/search', `${count} results for "lion"`);
          this.results.push({ name: 'GET /api/search', passed: true });
          return true;
        } else {
          log.fail('GET /api/search', `Status ${response.status}`);
          this.results.push({ name: 'GET /api/search', passed: false });
          return false;
        }
      } catch (error) {
        log.fail('GET /api/search', error.message);
        this.results.push({ name: 'GET /api/search', passed: false });
        return false;
      }
    },
    
    async testAuthEndpoint() {
      log.section('Test 5: Authentication Endpoints');
      try {
        const response = await fetch(`${API_URL}/auth/verify`, {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
        
        // We expect 401 since we're using a test token, but the endpoint should exist
        if (response.status === 401 || response.status === 200) {
          log.pass('Auth endpoints exist', `Status ${response.status}`);
          this.results.push({ name: 'Auth Endpoints', passed: true });
          return true;
        } else {
          log.fail('Auth endpoints', `Unexpected status ${response.status}`);
          this.results.push({ name: 'Auth Endpoints', passed: false });
          return false;
        }
      } catch (error) {
        log.fail('Auth endpoints', error.message);
        this.results.push({ name: 'Auth Endpoints', passed: false });
        return false;
      }
    },
    
    async testEnvironmentVariables() {
      log.section('Test 6: Environment Variables');
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      if (backendUrl) {
        log.pass('REACT_APP_BACKEND_URL', backendUrl);
      } else {
        log.info('REACT_APP_BACKEND_URL not set (using fallback)');
      }
      
      log.info(`Detected BACKEND_URL: ${BACKEND_URL}`);
      log.info(`Detected API_URL: ${API_URL}`);
      
      this.results.push({ name: 'Environment Variables', passed: true });
      return true;
    }
  };
  
  const printSummary = () => {
    log.header('📊 Test Summary');
    
    const passed = tests.results.filter(r => r.passed).length;
    const total = tests.results.length;
    
    tests.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`%c${status} ${result.name}`, result.passed ? 'color: green' : 'color: red');
    });
    
    console.log('%c' + '='.repeat(60), 'color: cyan; font-weight: bold');
    
    if (passed === total) {
      console.log('%c🎉 All tests passed!', 'color: green; font-weight: bold; font-size: 14px');
      console.log('%cBackend-Frontend connection is working correctly!', 'color: green');
    } else {
      console.log(`%c⚠️  ${passed}/${total} tests passed`, 'color: orange; font-weight: bold; font-size: 14px');
      console.log('%cCheck the failures above and consult BACKEND_FRONTEND_CONNECTION_GUIDE.md', 'color: orange');
    }
    
    console.log('%c' + '='.repeat(60), 'color: cyan; font-weight: bold');
  };
  
  return {
    async run() {
      log.header('🧪 BioMuseum Frontend-Backend Connection Test');
      console.log(`%cFrontend URL: ${window.location.origin}`, 'color: gray');
      console.log(`%cBackend URL: ${BACKEND_URL}`, 'color: gray');
      console.log(`%cAPI URL: ${API_URL}`, 'color: gray');
      log.divider();
      
      try {
        await tests.testEnvironmentVariables();
        log.divider();
        await tests.testHealthCheck();
        await tests.testCORSHeaders();
        await tests.testOrganismsEndpoint();
        await tests.testSearchEndpoint();
        await tests.testAuthEndpoint();
        log.divider();
        printSummary();
      } catch (error) {
        log.fail('Unexpected error', error.message);
        console.error(error);
      }
    }
  };
})();

// Run the tests
console.log('%cTo run the connection tests, execute: BioMuseumConnectionTest.run()', 'color: cyan; font-style: italic; font-weight: bold');
console.log('%cOr click: copy(BioMuseumConnectionTest.run()); and paste below', 'color: cyan; font-style: italic');

// Auto-run if requested
// Uncomment the line below to auto-run tests when this script is loaded
// BioMuseumConnectionTest.run();
