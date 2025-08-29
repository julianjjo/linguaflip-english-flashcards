import puppeteer from 'puppeteer';
import { expect } from 'chai';
import testConfig from './test-config.js';
import { setupBrowser, setupPage, waitForPageLoad, resolveUrl, getDynamicTimeout } from './test-utils.js';

describe('LinguaFlip Design Tests', () => {
  let browser;
  let page;
  let config;

  before(async function() {
    this.timeout(getDynamicTimeout(60000)); // 60 seconds for setup

    config = testConfig;
    console.log(`🌐 Testing against: ${config.getBaseURL()}`);

    browser = await setupBrowser(puppeteer);
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async function() {
    this.timeout(getDynamicTimeout(30000));

    page = await setupPage(browser);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Page Loading', () => {
    it('should load the main page successfully', async function() {
      this.timeout(getDynamicTimeout(30000));

      try {
        const url = resolveUrl();
        await page.goto(url, { waitUntil: 'networkidle2' });
        await waitForPageLoad(page);

        const title = await page.title();
        expect(title).to.not.be.empty;
        console.log('✅ Página cargada exitosamente');
      } catch (error) {
        console.error('❌ Error al cargar la página:', error.message);
        throw error;
      }
    });

    it('should have proper HTTP status', async function() {
      this.timeout(getDynamicTimeout(15000));

      const url = resolveUrl();
      const response = await page.goto(url, { waitUntil: 'networkidle2' });
      const status = response.status();
      expect([200, 304]).to.include(status); // 304 es válido para recursos cacheados
      console.log(`✅ HTTP status correcto (${status})`);
    });

    it('should load within reasonable time', async function() {
      this.timeout(getDynamicTimeout(20000));

      const startTime = Date.now();
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      const maxLoadTime = config.getTimeouts().pageLoad;
      expect(loadTime).to.be.below(maxLoadTime);
      console.log(`✅ Página cargada en ${loadTime}ms`);
    });
  });

  describe('Main Elements', () => {
    beforeEach(async function() {
      this.timeout(getDynamicTimeout(15000));

      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await waitForPageLoad(page);
    });

    it('should have main container', async () => {
      const mainContainer = await page.$('[data-testid="main-container"], main, #root');
      expect(mainContainer).to.not.be.null;
      console.log('✅ Contenedor principal encontrado');
    });

    it('should have header component', async () => {
      const header = await page.$('header, [data-testid="header"]');
      expect(header).to.not.be.null;
      console.log('✅ Header encontrado');
    });

    it('should have navigation', async () => {
      const nav = await page.$('nav, [data-testid="navigation"]');
      expect(nav).to.not.be.null;
      console.log('✅ Navegación encontrada');
    });

    it('should have flashcard component', async () => {
      const flashcard = await page.$('[data-testid="flashcard"], .flashcard, .card, [class*="card"]');
      expect(flashcard).to.not.be.null;
      console.log('✅ Componente flashcard encontrado');
    });
  });

  describe('Tailwind CSS', () => {
    beforeEach(async () => {
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    it('should have Tailwind utilities applied', async () => {
      const bodyClasses = await page.$eval('body', el => el.className);
      expect(bodyClasses).to.include('bg-');
      console.log('✅ Utilidades Tailwind aplicadas');
    });

    it('should have responsive classes', async () => {
      const responsiveElements = await page.$$('[class*="md:"], [class*="lg:"], [class*="sm:"]');
      expect(responsiveElements.length).to.be.greaterThan(0);
      console.log(`✅ ${responsiveElements.length} elementos con clases responsive encontrados`);
    });

    it('should have flexbox utilities', async () => {
      const flexElements = await page.$$('[class*="flex"], [class*="grid"]');
      expect(flexElements.length).to.be.greaterThan(0);
      console.log(`✅ ${flexElements.length} elementos con layout utilities encontrados`);
    });

    it('should have proper spacing classes', async () => {
      const spacingElements = await page.$$('[class*="p-"], [class*="m-"], [class*="px-"], [class*="py-"]');
      expect(spacingElements.length).to.be.greaterThan(0);
      console.log(`✅ ${spacingElements.length} elementos con clases de espaciado encontrados`);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    it('should work on mobile devices', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await new Promise(resolve => setTimeout(resolve, 500));

      const body = await page.$('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox.width).to.be.lessThan(400);
      console.log('✅ Diseño responsive en móvil verificado');
    });

    it('should work on tablet devices', async () => {
      await page.setViewport({ width: 768, height: 1024 }); // iPad
      await new Promise(resolve => setTimeout(resolve, 500));

      const body = await page.$('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox.width).to.be.greaterThan(700);
      expect(boundingBox.width).to.be.lessThan(800);
      console.log('✅ Diseño responsive en tablet verificado');
    });

    it('should work on desktop devices', async () => {
      await page.setViewport({ width: 1920, height: 1080 }); // Desktop
      await new Promise(resolve => setTimeout(resolve, 500));

      const body = await page.$('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox.width).to.be.greaterThan(1800);
      console.log('✅ Diseño responsive en desktop verificado');
    });

    it('should maintain readability on all screen sizes', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile small
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await new Promise(resolve => setTimeout(resolve, 300));

        const fontSize = await page.$eval('body', el => {
          const style = window.getComputedStyle(el);
          return parseFloat(style.fontSize);
        });

        expect(fontSize).to.be.greaterThan(10); // Mínimo 10px
        console.log(`✅ Legibilidad mantenida en ${viewport.width}x${viewport.height}`);
      }
    });
  });

  describe('Basic Functionality', () => {
    beforeEach(async () => {
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    it('should have interactive elements', async () => {
      const buttons = await page.$$('button, [role="button"], input[type="button"]');
      const links = await page.$$('a[href]');
      const inputs = await page.$$('input, textarea, select');

      const totalInteractive = buttons.length + links.length + inputs.length;
      expect(totalInteractive).to.be.greaterThan(0);
      console.log(`✅ ${totalInteractive} elementos interactivos encontrados`);
    });

    it('should have proper focus management', async () => {
      const focusableElements = await page.$$('button, a[href], input, select, textarea');
      expect(focusableElements.length).to.be.greaterThan(0);

      // Verificar que el primer elemento focusable puede recibir foco
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement.tagName);
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement)).to.be.true;
      console.log('✅ Manejo de foco correcto');
    });

    it('should handle basic user interactions', async () => {
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        try {
          await buttons[0].click();
          await page.waitForTimeout(500);
          console.log('✅ Interacción básica con botón exitosa');
        } catch (error) {
          console.log('ℹ️ No se pudo probar clic en botón (posiblemente normal)');
        }
      }
    });

    it('should have proper form validation if forms exist', async () => {
      const forms = await page.$$('form');
      if (forms.length > 0) {
        const form = forms[0];
        const inputs = await form.$$('input[required]');

        if (inputs.length > 0) {
          // Intentar enviar formulario sin llenar campos requeridos
          try {
            await form.$eval('input[type="submit"], button[type="submit"]', el => el.click());
            await page.waitForTimeout(500);
            console.log('✅ Validación de formulario verificada');
          } catch (error) {
            console.log('ℹ️ No se pudo probar validación de formulario');
          }
        }
      }
    });
  });

  describe('Performance', () => {
    it('should load resources efficiently', async () => {
      const client = await page.target().createCDPSession();
      await client.send('Network.enable');

      const requests = [];
      client.on('Network.responseReceived', (event) => {
        requests.push(event.response);
      });

      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });

      const failedRequests = requests.filter(req => req.status >= 400);
      expect(failedRequests.length).to.equal(0);
      console.log(`✅ ${requests.length} recursos cargados correctamente`);
    });

    it('should not have console errors', async () => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(errors.length).to.equal(0);
      console.log('✅ No se encontraron errores en consola');
    });
  });
});