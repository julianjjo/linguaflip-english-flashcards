#!/usr/bin/env node

/**
 * Script de revisión de diseño para LinguaFlip
 * Utiliza Puppeteer para automatizar la revisión visual y funcional del sitio web
 *
 * Requisitos: npm install puppeteer
 * Ejecución: node design-review.js
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DesignReviewer {
    constructor() {
        this.baseUrl = 'http://localhost:5173';
        this.screenshotsDir = './design-review-screenshots';
        this.reportFile = './design-review-report.json';
        this.results = {
            timestamp: new Date().toISOString(),
            url: this.baseUrl,
            deviceTests: {},
            componentTests: {},
            responsiveTests: {},
            interactionTests: {},
            overallStatus: 'pending'
        };
    }

    /**
     * Configuraciones de viewport para diferentes dispositivos
     */
    getDeviceConfigs() {
        return {
            desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 },
            laptop: { width: 1366, height: 768, deviceScaleFactor: 1 },
            tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
            mobile: { width: 375, height: 667, deviceScaleFactor: 2 }
        };
    }

    /**
     * Inicializar directorio de screenshots
     */
    async initializeScreenshotDir() {
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
            console.log('📁 Directorio de screenshots creado:', this.screenshotsDir);
        }
    }

    /**
     * Lanzar navegador con configuración optimizada
     */
    async launchBrowser() {
        console.log('🚀 Lanzando navegador Puppeteer...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        console.log('✅ Navegador lanzado exitosamente');
    }

    /**
     * Crear nueva página con configuración base
     */
    async createPage() {
        const page = await this.browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Configurar timeouts
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        return page;
    }

    /**
     * Esperar a que la página cargue completamente
     */
    async waitForPageLoad(page) {
        console.log('⏳ Esperando carga completa de la página...');

        try {
            // Esperar a que se cargue el DOM
            await page.waitForSelector('body', { timeout: 10000 });

            // Esperar a que se carguen los recursos críticos
            await page.waitForFunction(() => {
                return document.readyState === 'complete';
            }, { timeout: 15000 });

            // Pequeña pausa adicional para que se rendericen los componentes React
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('✅ Página cargada completamente');
            return true;
        } catch (error) {
            console.log('⚠️  Error en carga de página:', error.message);
            return false;
        }
    }

    /**
     * Capturar screenshot con nombre descriptivo
     */
    async captureScreenshot(page, name, options = {}) {
        const filename = `${name}-${Date.now()}.png`;
        const filepath = path.join(this.screenshotsDir, filename);

        try {
            await page.screenshot({
                path: filepath,
                fullPage: options.fullPage || false,
                ...options
            });
            console.log(`📸 Screenshot capturado: ${filename}`);
            return filename;
        } catch (error) {
            console.log(`❌ Error capturando screenshot ${name}:`, error.message);
            return null;
        }
    }

    /**
     * Verificar existencia de elementos críticos
     */
    async verifyCriticalElements(page) {
        console.log('🔍 Verificando elementos críticos...');

        const elements = {
            header: 'header, [data-testid="header"], .header',
            sidebar: 'aside, [data-testid="sidebar"], .sidebar, nav',
            main: 'main, [data-testid="main"], .main-content',
            flashcard: '[data-testid="flashcard"], .flashcard, .card',
            dashboard: '[data-testid="dashboard"], .dashboard'
        };

        const results = {};

        for (const [key, selector] of Object.entries(elements)) {
            try {
                const element = await page.$(selector);
                results[key] = element !== null;
                console.log(`   ${results[key] ? '✅' : '❌'} ${key}: ${selector}`);
            } catch (error) {
                results[key] = false;
                console.log(`   ❌ ${key}: Error - ${error.message}`);
            }
        }

        this.results.componentTests.criticalElements = results;
        return results;
    }

    /**
     * Verificar estilos CSS y Tailwind
     */
    async verifyStyling(page) {
        console.log('🎨 Verificando estilos y Tailwind CSS...');

        const styleChecks = await page.evaluate(() => {
            const results = {
                hasTailwind: false,
                hasCustomCSS: false,
                bodyStyles: {},
                responsiveClasses: false
            };

            // Verificar Tailwind CSS
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            results.hasTailwind = links.some(link =>
                link.href.includes('tailwind') || link.href.includes('cdn.tailwindcss.com')
            );

            // Verificar CSS personalizado
            results.hasCustomCSS = document.querySelector('style') !== null ||
                                 links.some(link => !link.href.includes('tailwind'));

            // Obtener estilos del body
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            results.bodyStyles = {
                fontFamily: computedStyle.fontFamily,
                backgroundColor: computedStyle.backgroundColor,
                color: computedStyle.color,
                fontSize: computedStyle.fontSize
            };

            // Verificar clases responsive
            const responsiveSelectors = ['sm:', 'md:', 'lg:', 'xl:'];
            const allClasses = Array.from(document.querySelectorAll('*'))
                .map(el => el.className)
                .join(' ');

            results.responsiveClasses = responsiveSelectors.some(prefix =>
                allClasses.includes(prefix)
            );

            return results;
        });

        this.results.componentTests.styling = styleChecks;
        console.log('   Tailwind CSS:', styleChecks.hasTailwind ? '✅ Detectado' : '❌ No detectado');
        console.log('   CSS Personalizado:', styleChecks.hasCustomCSS ? '✅ Presente' : '❌ Ausente');
        console.log('   Clases Responsive:', styleChecks.responsiveClasses ? '✅ Detectadas' : '❌ No detectadas');

        return styleChecks;
    }

    /**
     * Verificar elementos interactivos
     */
    async verifyInteractiveElements(page) {
        console.log('🖱️  Verificando elementos interactivos...');

        const interactiveChecks = await page.evaluate(() => {
            const results = {
                buttons: 0,
                inputs: 0,
                links: 0,
                clickableElements: 0,
                forms: 0
            };

            // Contar botones
            results.buttons = document.querySelectorAll('button, [role="button"], .btn').length;

            // Contar inputs
            results.inputs = document.querySelectorAll('input, textarea, select').length;

            // Contar enlaces
            results.links = document.querySelectorAll('a[href]').length;

            // Contar elementos clickeables
            results.clickableElements = document.querySelectorAll('[onclick], [onClick], [onchange]').length;

            // Contar formularios
            results.forms = document.querySelectorAll('form').length;

            return results;
        });

        this.results.interactionTests.elements = interactiveChecks;

        console.log(`   Botones encontrados: ${interactiveChecks.buttons}`);
        console.log(`   Inputs encontrados: ${interactiveChecks.inputs}`);
        console.log(`   Enlaces encontrados: ${interactiveChecks.links}`);
        console.log(`   Formularios encontrados: ${interactiveChecks.forms}`);

        return interactiveChecks;
    }

    /**
     * Probar diferentes dispositivos y capturar screenshots
     */
    async testDeviceResponsiveness() {
        console.log('📱 Probando responsividad en diferentes dispositivos...');

        const devices = this.getDeviceConfigs();
        const deviceResults = {};

        for (const [deviceName, config] of Object.entries(devices)) {
            console.log(`\n📏 Probando dispositivo: ${deviceName} (${config.width}x${config.height})`);

            const page = await this.createPage();
            await page.setViewport(config);

            try {
                await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
                const loadSuccess = await this.waitForPageLoad(page);

                if (loadSuccess) {
                    // Capturar screenshot del dispositivo
                    const screenshotName = `device-${deviceName}`;
                    const screenshotFile = await this.captureScreenshot(page, screenshotName, {
                        fullPage: true
                    });

                    // Verificar elementos críticos en este dispositivo
                    const elements = await this.verifyCriticalElements(page);

                    deviceResults[deviceName] = {
                        success: true,
                        screenshot: screenshotFile,
                        elements: elements,
                        config: config
                    };

                    console.log(`   ✅ ${deviceName}: Prueba completada`);
                } else {
                    deviceResults[deviceName] = {
                        success: false,
                        error: 'Error de carga'
                    };
                    console.log(`   ❌ ${deviceName}: Error de carga`);
                }

            } catch (error) {
                deviceResults[deviceName] = {
                    success: false,
                    error: error.message
                };
                console.log(`   ❌ ${deviceName}: ${error.message}`);
            } finally {
                await page.close();
            }
        }

        this.results.deviceTests = deviceResults;
        return deviceResults;
    }

    /**
     * Verificar layout y espaciado
     */
    async verifyLayout(page) {
        console.log('📐 Verificando layout y espaciado...');

        const layoutChecks = await page.evaluate(() => {
            const results = {
                hasGrid: false,
                hasFlexbox: false,
                spacing: {},
                alignment: {}
            };

            // Verificar uso de CSS Grid
            const gridElements = document.querySelectorAll('[style*="display: grid"], [style*="grid-template"], .grid');
            results.hasGrid = gridElements.length > 0;

            // Verificar uso de Flexbox
            const flexElements = document.querySelectorAll('[style*="display: flex"], .flex');
            results.hasFlexbox = flexElements.length > 0;

            // Verificar espaciado consistente
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            results.spacing = {
                margin: computedStyle.margin,
                padding: computedStyle.padding,
                lineHeight: computedStyle.lineHeight
            };

            return results;
        });

        this.results.componentTests.layout = layoutChecks;
        console.log('   CSS Grid:', layoutChecks.hasGrid ? '✅ Usado' : '❌ No usado');
        console.log('   Flexbox:', layoutChecks.hasFlexbox ? '✅ Usado' : '❌ No usado');

        return layoutChecks;
    }

    /**
     * Ejecutar todas las pruebas de diseño
     */
    async runDesignReview() {
        console.log('🎯 Iniciando revisión de diseño de LinguaFlip\n');
        console.log('=' .repeat(50));

        try {
            // Inicialización
            await this.initializeScreenshotDir();
            await this.launchBrowser();

            // Página principal para pruebas generales
            const mainPage = await this.createPage();
            await mainPage.goto(this.baseUrl, { waitUntil: 'networkidle2' });

            // Esperar carga completa
            const loadSuccess = await this.waitForPageLoad(mainPage);

            if (!loadSuccess) {
                throw new Error('No se pudo cargar la página principal');
            }

            // Capturar screenshot inicial
            await this.captureScreenshot(mainPage, 'initial-load', { fullPage: true });

            // Ejecutar pruebas
            console.log('\n🔍 Ejecutando pruebas de componentes...');
            await this.verifyCriticalElements(mainPage);
            await this.verifyStyling(mainPage);
            await this.verifyInteractiveElements(mainPage);
            await this.verifyLayout(mainPage);

            // Cerrar página principal
            await mainPage.close();

            // Probar responsividad
            console.log('\n📱 Ejecutando pruebas de responsividad...');
            await this.testDeviceResponsiveness();

            // Generar reporte final
            this.generateFinalReport();

            console.log('\n🎉 Revisión de diseño completada exitosamente!');
            console.log('📊 Reporte generado:', this.reportFile);
            console.log('📸 Screenshots guardados en:', this.screenshotsDir);

        } catch (error) {
            console.error('❌ Error durante la revisión:', error.message);
            this.results.overallStatus = 'error';
            this.results.error = error.message;
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 Navegador cerrado');
            }
        }
    }

    /**
     * Generar reporte final en JSON
     */
    generateFinalReport() {
        // Calcular estado general
        const deviceSuccess = Object.values(this.results.deviceTests)
            .every(test => test.success);

        const componentSuccess = Object.values(this.results.componentTests)
            .every(test => test !== false);

        this.results.overallStatus = (deviceSuccess && componentSuccess) ? 'success' : 'warning';

        // Estadísticas
        this.results.summary = {
            totalDevices: Object.keys(this.results.deviceTests).length,
            successfulDevices: Object.values(this.results.deviceTests)
                .filter(test => test.success).length,
            totalComponents: Object.keys(this.results.componentTests).length,
            screenshotsGenerated: fs.readdirSync(this.screenshotsDir)
                .filter(file => file.endsWith('.png')).length
        };

        // Guardar reporte
        fs.writeFileSync(this.reportFile, JSON.stringify(this.results, null, 2));
        console.log('📄 Reporte JSON generado:', this.reportFile);
    }

    /**
     * Mostrar resumen en consola
     */
    displaySummary() {
        console.log('\n📊 RESUMEN DE LA REVISIÓN');
        console.log('=' .repeat(30));

        console.log(`Estado general: ${this.results.overallStatus === 'success' ? '✅ Éxito' : '⚠️  Advertencias'}`);
        console.log(`Dispositivos probados: ${this.results.summary?.totalDevices || 0}`);
        console.log(`Dispositivos exitosos: ${this.results.summary?.successfulDevices || 0}`);
        console.log(`Screenshots generados: ${this.results.summary?.screenshotsGenerated || 0}`);

        if (this.results.error) {
            console.log(`Error: ${this.results.error}`);
        }
    }
}

// Función principal
async function main() {
    console.log('🎨 LinguaFlip Design Review Script');
    console.log('Versión 1.0.0');
    console.log('Revisando diseño en http://localhost:5173\n');

    const reviewer = new DesignReviewer();

    try {
        await reviewer.runDesignReview();
        reviewer.displaySummary();
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Error no manejado:', error);
        process.exit(1);
    });
}

export default DesignReviewer;