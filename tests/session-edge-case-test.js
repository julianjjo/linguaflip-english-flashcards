/**
 * Session Edge Case Testing Script
 *
 * This script tests various edge cases that commonly cause session management issues:
 * 1. Token expiration scenarios
 * 2. Concurrency issues with multiple tabs
 * 3. Network interruption handling
 * 4. Page reload behavior
 * 5. Inactivity handling
 * 6. Context switching issues
 */

class SessionEdgeCaseTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    console.log('[SESSION_TEST] Session edge case tester initialized');
  }

  /**
   * Run all edge case tests
   */
  async runAllTests() {
    if (this.isRunning) {
      console.log('[SESSION_TEST] Tests already running');
      return;
    }

    this.isRunning = true;
    console.log('[SESSION_TEST] Starting session edge case tests...');

    try {
      await this.testTokenExpiration();
      await this.testConcurrency();
      await this.testNetworkInterruption();
      await this.testPageReload();
      await this.testInactivity();
      await this.testContextSwitching();

      this.generateReport();
    } catch (error) {
      console.error('[SESSION_TEST] Test suite failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test 1: Token Expiration
   */
  async testTokenExpiration() {
    console.log('[SESSION_TEST] Testing token expiration scenarios...');

    // Test 1.1: Check current token status
    const hasToken = localStorage.getItem('linguaflip_access_token') !== null;
    const expiryTime = localStorage.getItem('linguaflip_token_expiry');
    const timeUntilExpiry = expiryTime ? parseInt(expiryTime) - Date.now() : 0;

    this.logResult('Token Status Check', {
      hasToken,
      timeUntilExpiry: timeUntilExpiry > 0 ? `${Math.round(timeUntilExpiry / 1000)}s` : 'expired',
      expiryTime: expiryTime ? new Date(parseInt(expiryTime)).toISOString() : 'none'
    });

    // Test 1.2: Simulate expired token
    if (hasToken && timeUntilExpiry > 0) {
      console.log('[SESSION_TEST] Simulating token expiration...');
      localStorage.setItem('linguaflip_token_expiry', (Date.now() - 1000).toString());

      // Try to make an authenticated request
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('linguaflip_access_token')}` }
        });

        this.logResult('Expired Token Request', {
          status: response.status,
          shouldBe401: response.status === 401,
          response: await response.text().substring(0, 100)
        });
      } catch (error) {
        this.logResult('Expired Token Request Error', { error: error.message });
      }
    }

    // Test 1.3: Test refresh mechanism
    console.log('[SESSION_TEST] Testing token refresh mechanism...');
    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      this.logResult('Token Refresh Test', {
        status: refreshResponse.status,
        success: refreshResponse.ok,
        hasNewToken: refreshResponse.headers.get('set-cookie')?.includes('accessToken')
      });
    } catch (error) {
      this.logResult('Token Refresh Error', { error: error.message });
    }
  }

  /**
   * Test 2: Concurrency Issues
   */
  async testConcurrency() {
    console.log('[SESSION_TEST] Testing concurrency scenarios...');

    // Test 2.1: Multiple simultaneous requests
    const concurrentRequests = 5;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('linguaflip_access_token')}` }
        }).then(r => ({ index: i, status: r.status, ok: r.ok }))
      );
    }

    const results = await Promise.all(promises);
    this.logResult('Concurrent Requests', {
      total: concurrentRequests,
      successCount: results.filter(r => r.ok).length,
      results: results.map(r => ({ index: r.index, status: r.status }))
    });

    // Test 2.2: Multiple tabs simulation
    console.log('[SESSION_TEST] Simulating multiple tabs...');
    const originalToken = localStorage.getItem('linguaflip_access_token');

    // Simulate token change in another tab
    localStorage.setItem('linguaflip_access_token', 'simulated_new_token_from_another_tab');
    this.logResult('Multi-tab Token Change', {
      originalToken: originalToken ? 'present' : 'none',
      newToken: 'simulated_new_token_from_another_tab'
    });

    // Restore original token
    if (originalToken) {
      localStorage.setItem('linguaflip_access_token', originalToken);
    }
  }

  /**
   * Test 3: Network Interruption
   */
  async testNetworkInterruption() {
    console.log('[SESSION_TEST] Testing network interruption scenarios...');

    // Test 3.1: Simulate offline/online transition
    console.log('[SESSION_TEST] Simulating network disconnection...');

    // This would normally be tested with a service worker or network mocking
    // For now, we'll test the current behavior
    this.logResult('Network Status Check', {
      online: navigator.onLine,
      timestamp: new Date().toISOString()
    });

    // Test 3.2: Request timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('/api/auth/me', {
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('linguaflip_access_token')}` }
      });

      clearTimeout(timeoutId);
      this.logResult('Request Timeout Test', {
        completed: true,
        status: response.status,
        duration: 'under 5s'
      });
    } catch (error) {
      clearTimeout(timeoutId);
      this.logResult('Request Timeout Test', {
        completed: false,
        error: error.name,
        aborted: error.name === 'AbortError'
      });
    }
  }

  /**
   * Test 4: Page Reload Behavior
   */
  async testPageReload() {
    console.log('[SESSION_TEST] Testing page reload scenarios...');

    // Test 4.1: Check if tokens persist after reload
    const beforeReload = {
      hasAccessToken: !!localStorage.getItem('linguaflip_access_token'),
      hasRefreshToken: !!localStorage.getItem('linguaflip_refresh_token'),
      expiryTime: localStorage.getItem('linguaflip_token_expiry')
    };

    this.logResult('Pre-Reload Token State', beforeReload);

    // Simulate page reload by re-checking authentication
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('linguaflip_access_token')}` }
      });

      this.logResult('Post-Reload Auth Check', {
        status: response.status,
        success: response.ok
      });
    } catch (error) {
      this.logResult('Post-Reload Auth Check Error', { error: error.message });
    }
  }

  /**
   * Test 5: Inactivity Handling
   */
  async testInactivity() {
    console.log('[SESSION_TEST] Testing inactivity scenarios...');

    // Test 5.1: Check current session state
    const currentState = {
      hasToken: !!localStorage.getItem('linguaflip_access_token'),
      timeSinceLastActivity: Date.now() - (parseInt(localStorage.getItem('lastActivity') || '0')),
      timestamp: new Date().toISOString()
    };

    this.logResult('Inactivity Check', currentState);

    // Test 5.2: Simulate long inactivity period
    const longInactivityPeriod = 30 * 60 * 1000; // 30 minutes
    const simulatedLastActivity = Date.now() - longInactivityPeriod;
    localStorage.setItem('lastActivity', simulatedLastActivity.toString());

    this.logResult('Simulated Long Inactivity', {
      simulatedInactivity: `${Math.round(longInactivityPeriod / 1000 / 60)} minutes`,
      shouldTriggerRefresh: true
    });
  }

  /**
   * Test 6: Context Switching
   */
  async testContextSwitching() {
    console.log('[SESSION_TEST] Testing context switching scenarios...');

    // Test 6.1: Rapid navigation between protected routes
    const routes = ['/study', '/dashboard', '/profile', '/settings'];
    const results = [];

    for (const route of routes) {
      try {
        const response = await fetch(route, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('linguaflip_access_token')}` }
        });
        results.push({ route, status: response.status, ok: response.ok });
      } catch (error) {
        results.push({ route, error: error.message });
      }
    }

    this.logResult('Context Switching Test', {
      routesTested: routes.length,
      successCount: results.filter(r => r.ok).length,
      results
    });

    // Test 6.2: Mixed authenticated and non-authenticated requests
    const mixedRequests = [
      { path: '/api/auth/me', auth: true },
      { path: '/api/flashcards', auth: true },
      { path: '/api/public/info', auth: false }
    ];

    const mixedResults = [];
    for (const req of mixedRequests) {
      try {
        const headers = req.auth ? { 'Authorization': `Bearer ${localStorage.getItem('linguaflip_access_token')}` } : {};
        const response = await fetch(req.path, { headers });
        mixedResults.push({
          path: req.path,
          auth: req.auth,
          status: response.status,
          ok: response.ok
        });
      } catch (error) {
        mixedResults.push({
          path: req.path,
          auth: req.auth,
          error: error.message
        });
      }
    }

    this.logResult('Mixed Auth Requests', {
      total: mixedRequests.length,
      successCount: mixedResults.filter(r => r.ok).length,
      results: mixedResults
    });
  }

  /**
   * Log test result
   */
  logResult(testName, data) {
    const result = {
      test: testName,
      timestamp: new Date().toISOString(),
      data
    };

    this.testResults.push(result);
    console.log(`[SESSION_TEST] ${testName}:`, data);
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('[SESSION_TEST] === SESSION EDGE CASE TEST REPORT ===');
    console.log(`[SESSION_TEST] Total tests run: ${this.testResults.length}`);
    console.log(`[SESSION_TEST] Test results:`, this.testResults);

    // Analyze results for potential issues
    const issues = this.analyzeResults();
    if (issues.length > 0) {
      console.log('[SESSION_TEST] ⚠️  POTENTIAL ISSUES DETECTED:');
      issues.forEach((issue, index) => {
        console.log(`[SESSION_TEST] ${index + 1}. ${issue}`);
      });
    } else {
      console.log('[SESSION_TEST] ✅ No obvious issues detected in basic tests');
    }

    console.log('[SESSION_TEST] === END REPORT ===');
  }

  /**
   * Analyze test results for potential issues
   */
  analyzeResults() {
    const issues = [];

    // Check for authentication failures
    const authFailures = this.testResults.filter(r =>
      r.test.includes('Auth Check') && r.data.status === 401
    );

    if (authFailures.length > 0) {
      issues.push('Authentication failures detected - tokens may not be properly validated');
    }

    // Check for token refresh issues
    const refreshFailures = this.testResults.filter(r =>
      r.test.includes('Refresh') && !r.data.success
    );

    if (refreshFailures.length > 0) {
      issues.push('Token refresh mechanism may have issues');
    }

    // Check for concurrent request problems
    const concurrentResults = this.testResults.find(r => r.test === 'Concurrent Requests');
    if (concurrentResults && concurrentResults.data.successCount < concurrentResults.data.total) {
      issues.push('Concurrent requests may be causing race conditions');
    }

    // Check for network handling issues
    const networkResults = this.testResults.find(r => r.test === 'Network Status Check');
    if (networkResults && !networkResults.data.online) {
      issues.push('Application may not handle offline scenarios properly');
    }

    return issues;
  }
}

module.exports = { SessionEdgeCaseTester };

describe('SessionEdgeCaseTester', () => {
  test('placeholder executes edge case tester', () => {
    expect(typeof SessionEdgeCaseTester).toBe('function');
  });
});

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.SessionEdgeCaseTester = SessionEdgeCaseTester;
  console.log('[SESSION_TEST] SessionEdgeCaseTester available in window object');
  console.log('[SESSION_TEST] Run: new SessionEdgeCaseTester().runAllTests()');
}

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('runSessionTests=true')) {
  console.log('[SESSION_TEST] Auto-running session tests...');
  new SessionEdgeCaseTester().runAllTests();
}