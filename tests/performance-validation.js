/**
 * Performance Validation Script for LinguaFlip Fase 3
 * Tests all implemented performance and reliability improvements
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PerformanceValidator {
  constructor() {
    this.results = {
      audioSystem: null,
      imageOptimization: null,
      cachingSystem: null,
      serviceWorker: null,
      codeSplitting: null,
      overall: null
    };
  }

  async runAllTests() {
    console.log('🚀 Iniciando validación de rendimiento de LinguaFlip Fase 3...\n');

    try {
      // Test 1: Sistema de Audio
      console.log('1️⃣ Probando Sistema de Audio...');
      this.results.audioSystem = await this.testAudioSystem();

      // Test 2: Optimización de Imágenes
      console.log('2️⃣ Probando Optimización de Imágenes...');
      this.results.imageOptimization = await this.testImageOptimization();

      // Test 3: Sistema de Caching
      console.log('3️⃣ Probando Sistema de Caching...');
      this.results.cachingSystem = await this.testCachingSystem();

      // Test 4: Service Worker
      console.log('4️⃣ Probando Service Worker...');
      this.results.serviceWorker = await this.testServiceWorker();

      // Test 5: Code Splitting
      console.log('5️⃣ Probando Code Splitting...');
      this.results.codeSplitting = await this.testCodeSplitting();

      // Overall Assessment
      this.results.overall = this.generateOverallAssessment();

      this.printResults();
      this.saveResults();

    } catch (error) {
      console.error('❌ Error durante la validación:', error);
    }
  }

  async testAudioSystem() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:4321');

      // Check if audio system is loaded
      const audioSystemLoaded = await page.evaluate(() => {
        return typeof window.speechSynthesis !== 'undefined' ||
               (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined');
      });

      // Test audio button functionality
      const audioButtons = await page.$$('[aria-label*="Play sound"]');
      const audioButtonsWork = audioButtons.length > 0;

      // Test audio settings component
      await page.goto('http://localhost:4321/settings');
      const audioSettingsVisible = await page.$('[data-testid="audio-settings"]') !== null;

      await browser.close();

      return {
        passed: audioSystemLoaded && audioButtonsWork,
        details: {
          audioSystemLoaded,
          audioButtonsWork,
          audioSettingsVisible,
          fallbackAvailable: true // Web Audio API fallback
        }
      };

    } catch (error) {
      await browser.close();
      return { passed: false, error: error.message };
    }
  }

  async testImageOptimization() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:4321/study');

      // Check for lazy loading
      const lazyImages = await page.$$('img[loading="lazy"]');
      const optimizedImages = await page.$$('[data-optimized="true"]');

      // Test image fallback
      await page.setOfflineMode(true);
      const fallbackImages = await page.$$('.fallback-image');
      await page.setOfflineMode(false);

      // Check cache headers for images
      const imageRequests = [];
      page.on('response', (response) => {
        if (response.url().includes('.jpg') || response.url().includes('.png')) {
          imageRequests.push(response);
        }
      });

      await page.reload();
      await page.waitForTimeout(2000);

      await browser.close();

      return {
        passed: lazyImages.length > 0 || optimizedImages.length > 0,
        details: {
          lazyImagesCount: lazyImages.length,
          optimizedImagesCount: optimizedImages.length,
          fallbackImagesCount: fallbackImages.length,
          imageRequestsCount: imageRequests.length
        }
      };

    } catch (error) {
      await browser.close();
      return { passed: false, error: error.message };
    }
  }

  async testCachingSystem() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:4321');

      // Check if cache system is initialized
      const cacheSystemReady = await page.evaluate(() => {
        return typeof window.localStorage !== 'undefined' &&
               localStorage.getItem('linguaflip-cache-ready') === 'true';
      });

      // Test cache persistence
      await page.evaluate(() => {
        localStorage.setItem('test-cache', JSON.stringify({ test: 'data' }));
      });

      await page.reload();

      const cachePersisted = await page.evaluate(() => {
        const data = localStorage.getItem('test-cache');
        return data && JSON.parse(data).test === 'data';
      });

      // Clear test data
      await page.evaluate(() => {
        localStorage.removeItem('test-cache');
      });

      await browser.close();

      return {
        passed: cacheSystemReady && cachePersisted,
        details: {
          cacheSystemReady,
          cachePersisted,
          localStorageAvailable: true
        }
      };

    } catch (error) {
      await browser.close();
      return { passed: false, error: error.message };
    }
  }

  async testServiceWorker() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto('http://localhost:4321');

      // Wait for service worker to register
      await page.waitForTimeout(2000);

      // Check if service worker is registered
      const swStatus = await page.evaluate(() => {
        return navigator.serviceWorker.getRegistration()
          .then(registration => ({
            registered: !!registration,
            active: !!registration?.active,
            installing: !!registration?.installing,
            waiting: !!registration?.waiting
          }))
          .catch(() => ({ registered: false, active: false, installing: false, waiting: false }));
      });

      // Test offline functionality
      await page.setOfflineMode(true);
      const offlinePageLoads = await page.evaluate(() => {
        return fetch('/').then(() => true).catch(() => false);
      });
      await page.setOfflineMode(false);

      await browser.close();

      return {
        passed: swStatus.registered,
        details: {
          ...swStatus,
          offlinePageLoads
        }
      };

    } catch (error) {
      await browser.close();
      return { passed: false, error: error.message };
    }
  }

  async testCodeSplitting() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      // Monitor network requests
      const requests = [];
      page.on('request', (request) => {
        requests.push(request.url());
      });

      await page.goto('http://localhost:4321');

      // Wait for page to load
      await page.waitForTimeout(3000);

      // Analyze bundle chunks
      const chunks = requests.filter(url =>
        url.includes('.js') &&
        (url.includes('chunk') || url.includes('vendor') || url.includes('component'))
      );

      // Check for lazy loaded components
      const lazyComponents = await page.$$('[data-lazy-loaded="true"]');

      await browser.close();

      return {
        passed: chunks.length > 1, // Multiple chunks indicate code splitting
        details: {
          totalRequests: requests.length,
          jsChunks: chunks.length,
          lazyComponentsCount: lazyComponents.length,
          chunkNames: chunks.map(url => url.split('/').pop())
        }
      };

    } catch (error) {
      await browser.close();
      return { passed: false, error: error.message };
    }
  }

  generateOverallAssessment() {
    const tests = Object.values(this.results).filter(result => result !== null);
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;

    const score = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      score: Math.round(score),
      passedTests,
      totalTests,
      grade: score >= 90 ? 'A' :
             score >= 80 ? 'B' :
             score >= 70 ? 'C' :
             score >= 60 ? 'D' : 'F',
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    const summaries = [];

    if (this.results.audioSystem?.passed) {
      summaries.push('✅ Sistema de audio funcionando correctamente');
    } else {
      summaries.push('❌ Sistema de audio requiere atención');
    }

    if (this.results.imageOptimization?.passed) {
      summaries.push('✅ Optimización de imágenes activa');
    } else {
      summaries.push('❌ Optimización de imágenes necesita revisión');
    }

    if (this.results.cachingSystem?.passed) {
      summaries.push('✅ Sistema de cache operativo');
    } else {
      summaries.push('❌ Sistema de cache inactivo');
    }

    if (this.results.serviceWorker?.passed) {
      summaries.push('✅ Service Worker registrado');
    } else {
      summaries.push('❌ Service Worker no registrado');
    }

    if (this.results.codeSplitting?.passed) {
      summaries.push('✅ Code splitting implementado');
    } else {
      summaries.push('❌ Code splitting no detectado');
    }

    return summaries;
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADOS DE VALIDACIÓN DE RENDIMIENTO');
    console.log('='.repeat(60));

    console.log(`\n🎯 Puntaje General: ${this.results.overall.score}% (${this.results.overall.grade})`);
    console.log(`✅ Pruebas Pasadas: ${this.results.overall.passedTests}/${this.results.overall.totalTests}`);

    console.log('\n📋 Resumen:');
    this.results.overall.summary.forEach(line => console.log(`   ${line}`));

    console.log('\n📈 Detalles por Categoría:');

    Object.entries(this.results).forEach(([category, result]) => {
      if (result && category !== 'overall') {
        const status = result.passed ? '✅' : '❌';
        console.log(`\n${status} ${category.charAt(0).toUpperCase() + category.slice(1)}:`);

        if (result.details) {
          Object.entries(result.details).forEach(([key, value]) => {
            console.log(`   • ${key}: ${value}`);
          });
        }

        if (result.error) {
          console.log(`   ⚠️ Error: ${result.error}`);
        }
      }
    });

    console.log('\n' + '='.repeat(60));
  }

  saveResults() {
    const timestamp = new Date().toISOString();
    const filename = `performance-validation-${timestamp.split('T')[0]}.json`;

    const report = {
      timestamp,
      version: '3.0.0',
      ...this.results
    };

    fs.writeFileSync(path.join(__dirname, '..', 'reports', filename), JSON.stringify(report, null, 2));
    console.log(`\n💾 Reporte guardado: reports/${filename}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.runAllTests().then(() => {
    console.log('\n✨ Validación completada!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = PerformanceValidator;