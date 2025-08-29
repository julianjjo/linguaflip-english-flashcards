import testConfig from './test-config.js';

/**
 * Test Utilities
 * Helper functions for testing infrastructure
 */

/**
 * Sleep utility for delays
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Dynamic timeout based on environment
 */
export const getDynamicTimeout = (baseTimeout = 5000) => {
  const config = testConfig.getTimeouts();
  const multiplier = process.env.CI ? 2 : 1; // Double timeout in CI
  return Math.max(baseTimeout, config.elementWait * multiplier);
};

/**
 * Wait for element with dynamic timeout
 */
export const waitForElement = async (page, selector, options = {}) => {
  const timeout = getDynamicTimeout(options.timeout || 5000);
  const visible = options.visible !== false;

  try {
    const element = await page.waitForSelector(selector, {
      timeout,
      visible
    });
    return element;
  } catch (error) {
    throw new Error(`Element ${selector} not found within ${timeout}ms: ${error.message}`);
  }
};

/**
 * Wait for page load with dynamic timeout
 */
export const waitForPageLoad = async (page, options = {}) => {
  const config = testConfig.getTimeouts();
  const timeout = options.timeout || config.pageLoad;

  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    console.warn(`Page load timeout after ${timeout}ms, continuing...`);
  }
};

/**
 * Retry function for flaky operations
 */
export const retry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const currentDelay = delay * Math.pow(backoff, attempt - 1);

        if (onRetry) {
          onRetry(error, attempt, maxRetries);
        }

        console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed, retrying in ${currentDelay}ms...`);
        await sleep(currentDelay);
      }
    }
  }

  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Parallel test execution helper
 */
export const runParallel = async (tests, options = {}) => {
  const config = testConfig.getParallelConfig();

  if (!config.enabled) {
    console.log('ℹ️ Parallel execution disabled, running tests sequentially');
    const results = [];
    for (const test of tests) {
      results.push(await test());
    }
    return results;
  }

  const maxConcurrent = options.maxConcurrent || config.maxConcurrent;
  console.log(`🚀 Running ${tests.length} tests with max ${maxConcurrent} concurrent`);

  const results = [];
  const running = new Set();

  for (let i = 0; i < tests.length; i++) {
    // Wait if we've reached the concurrency limit
    while (running.size >= maxConcurrent) {
      await Promise.race(running);
    }

    const testPromise = (async () => {
      try {
        const result = await tests[i]();
        results[i] = result;
      } catch (error) {
        results[i] = { error: error.message };
      } finally {
        running.delete(testPromise);
      }
    })();

    running.add(testPromise);
  }

  // Wait for all remaining tests to complete
  await Promise.all(running);

  return results;
};

/**
 * Browser setup helper with configuration
 */
export const setupBrowser = async (puppeteer, options = {}) => {
  const config = testConfig.getBrowserConfig();

  const launchOptions = {
    headless: options.headless !== undefined ? options.headless : config.headless,
    args: [
      ...config.args,
      ...(options.args || [])
    ],
    ...options.launchOptions
  };

  console.log(`🌐 Launching browser (headless: ${launchOptions.headless})`);
  return await puppeteer.launch(launchOptions);
};

/**
 * Page setup helper
 */
export const setupPage = async (browser, options = {}) => {
  const config = testConfig.getTimeouts();
  const page = await browser.newPage();

  // Set default viewport
  await page.setViewport({
    width: options.width || 1280,
    height: options.height || 720
  });

  // Set default timeouts
  page.setDefaultTimeout(config.elementWait);
  page.setDefaultNavigationTimeout(config.pageLoad);

  // Capture console errors
  if (options.captureErrors !== false) {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.warn('🚨 Page console error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.error('🚨 Page error:', error.message);
    });
  }

  return page;
};

/**
 * Environment-aware URL resolver
 */
export const resolveUrl = (path = '') => {
  const baseUrl = testConfig.getBaseURL();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Mock-aware API URL resolver
 */
export const resolveApiUrl = (endpoint) => {
  const mockConfig = testConfig.getMockConfig();

  if (mockConfig.useMocks) {
    // Return mock server URL for mocked endpoints
    if (endpoint.includes('gemini') && mockConfig.mockGemini) {
      return `http://localhost:3001/gemini${endpoint.replace('/api/gemini', '')}`;
    }
    if (endpoint.includes('speech') && mockConfig.mockSpeech) {
      return `http://localhost:3001/speech${endpoint.replace('/api/speech', '')}`;
    }
    if (endpoint.includes('picsum') && mockConfig.mockImages) {
      return `http://localhost:3001/picsum${endpoint.replace('https://picsum.photos', '')}`;
    }
  }

  // Return original URL for non-mocked endpoints
  return endpoint;
};

/**
 * Performance measurement helper
 */
export const measurePerformance = async (fn, label = 'operation') => {
  const startTime = Date.now();
  console.log(`⏱️ Starting ${label}...`);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    console.log(`✅ ${label} completed in ${duration}ms`);
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${label} failed after ${duration}ms:`, error.message);
    throw error;
  }
};

/**
 * Memory usage logger
 */
export const logMemoryUsage = () => {
  const usage = process.memoryUsage();
  console.log('📊 Memory usage:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
};

/**
 * Cleanup helper for tests
 */
export const cleanup = async (resources = []) => {
  const errors = [];

  for (const resource of resources) {
    try {
      if (resource && typeof resource.close === 'function') {
        await resource.close();
      } else if (resource && typeof resource.stop === 'function') {
        await resource.stop();
      }
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    console.warn('⚠️ Some resources failed to cleanup:', errors);
  }
};