# LinguaFlip Testing Infrastructure

Esta documentación describe la infraestructura de testing mejorada implementada en la Fase 2 del plan de refactorización.

## 📋 Resumen de Cambios

### ✅ Completado
- **Configuración de Entorno de Testing**: Variables de entorno específicas para diferentes entornos (dev, test, prod)
- **Configuración Dinámica de URLs**: Eliminación de URLs hardcodeadas, configuración automática basada en entorno
- **Setup/Teardown Automático**: Servidor de testing que se inicia y detiene automáticamente
- **Sistema de Mocks**: Mocks para Gemini API, Speech Synthesis API, y imágenes externas (Picsum)
- **Testing Paralelo**: Configuración para ejecutar tests en paralelo con control de concurrencia
- **Timeouts Dinámicos**: Timeouts basados en el entorno y optimizados para CI/CD
- **CI/CD Pipeline**: Configuración completa de GitHub Actions
- **Scripts Mejorados**: Scripts de testing mejorados en package.json
- **Health Checks**: Verificación automática de servicios antes de ejecutar pruebas

## 🏗️ Arquitectura de Testing

```
tests/
├── test-config.js          # Configuración centralizada
├── test-server.js          # Servidor de testing automático
├── test-utils.js           # Utilidades de testing
├── run-tests.js            # Ejecutor principal de tests
├── mocks/
│   └── mock-server.js      # Servidor de mocks
├── design-tests.js         # Tests de diseño (actualizados)
├── interaction-tests.js    # Tests de interacción (actualizados)
└── README.md              # Esta documentación
```

## ⚙️ Configuración de Entorno

### Variables de Entorno

#### `.env.test` (Testing)
```bash
NODE_ENV=test
TEST_PORT=5174
TEST_HOST=localhost
TEST_BASE_URL=http://localhost:5174
USE_MOCKS=true
MOCK_GEMINI_API=true
MOCK_SPEECH_SYNTHESIS=true
MOCK_EXTERNAL_IMAGES=true
TEST_TIMEOUT=30000
MAX_CONCURRENT_TESTS=4
```

#### `.env.development` (Development)
```bash
NODE_ENV=development
DEV_PORT=5173
DEV_HOST=localhost
DEV_BASE_URL=http://localhost:5173
USE_MOCKS=false
DEV_TIMEOUT=60000
```

#### `.env.production` (Production)
```bash
NODE_ENV=production
PROD_PORT=3000
PROD_HOST=0.0.0.0
PROD_BASE_URL=https://your-production-domain.com
USE_MOCKS=false
PROD_TIMEOUT=15000
```

## 🚀 Uso de Scripts

### Comandos Disponibles

```bash
# Ejecutar todos los tests con infraestructura completa
npm test

# Ejecutar tests individuales
npm run test:design
npm run test:interaction

# Tests en paralelo
npm run test:parallel

# Tests optimizados para CI
npm run test:ci

# Health checks
npm run test:health

# Setup manual del entorno
npm run test:setup

# Cleanup manual
npm run test:cleanup
```

### Ejecución con Diferentes Entornos

```bash
# Testing (con mocks)
NODE_ENV=test npm test

# Development (sin mocks)
NODE_ENV=development npm test

# Production (configuración de prod)
NODE_ENV=production npm test
```

## 🎭 Sistema de Mocks

### APIs Soportadas

#### 1. Gemini API (`/gemini/*`)
- **Endpoint**: `POST /gemini/generate`
- **Respuesta**: Mock de generación de flashcards
- **Configuración**: `MOCK_GEMINI_API=true`

#### 2. Speech Synthesis API (`/speech/*`)
- **Endpoints**:
  - `POST /speech/synthesize` - Genera audio mock
  - `GET /speech/voices` - Lista voces disponibles
- **Configuración**: `MOCK_SPEECH_SYNTHESIS=true`

#### 3. Imágenes Externas (`/picsum/*`)
- **Endpoint**: `GET /picsum/{width}/{height}`
- **Respuesta**: Imagen mock (buffer simple)
- **Configuración**: `MOCK_EXTERNAL_IMAGES=true`

### Configuración de Mocks

```javascript
// En test-config.js
getMockConfig() {
  return {
    useMocks: this.config.USE_MOCKS === 'true',
    mockGemini: this.config.MOCK_GEMINI_API === 'true',
    mockSpeech: this.config.MOCK_SPEECH_SYNTHESIS === 'true',
    mockImages: this.config.MOCK_EXTERNAL_IMAGES === 'true'
  };
}
```

## ⚡ Testing Paralelo

### Configuración

```javascript
// En test-config.js
getParallelConfig() {
  return {
    enabled: this.config.TEST_PARALLEL !== 'false',
    maxConcurrent: parseInt(this.config.MAX_CONCURRENT_TESTS) || 4
  };
}
```

### Uso

```javascript
import { runParallel } from './test-utils.js';

// Ejecutar tests en paralelo
await runParallel([
  () => testFunction1(),
  () => testFunction2(),
  () => testFunction3()
], { maxConcurrent: 3 });
```

## ⏱️ Timeouts Dinámicos

### Configuración por Entorno

```javascript
// Timeouts basados en entorno
getTimeouts() {
  const env = this.getEnvironment();
  const prefix = env === 'production' ? 'PROD' : env === 'development' ? 'DEV' : 'TEST';

  return {
    test: parseInt(this.config[`${prefix}_TIMEOUT`]) || 30000,
    pageLoad: parseInt(this.config[`${prefix}_PAGE_LOAD_TIMEOUT`]) || 10000,
    elementWait: parseInt(this.config[`${prefix}_ELEMENT_WAIT_TIMEOUT`]) || 5000,
    healthCheck: parseInt(this.config.HEALTH_CHECK_TIMEOUT) || 5000
  };
}
```

### Uso en Tests

```javascript
import { getDynamicTimeout } from './test-utils.js';

// Timeout dinámico basado en entorno
it('should load page', async function() {
  this.timeout(getDynamicTimeout(30000));
  // ... test code
});
```

## 🔍 Health Checks

### Configuración

```javascript
getHealthCheckConfig() {
  return {
    enabled: this.config.HEALTH_CHECK_ENABLED === 'true',
    timeout: parseInt(this.config.HEALTH_CHECK_TIMEOUT) || 5000,
    retries: parseInt(this.config.HEALTH_CHECK_RETRIES) || 3
  };
}
```

### Verificación Automática

```bash
# Verificar health de servicios
npm run test:health
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

El pipeline incluye:

1. **Test Job**: Tests unitarios y de integración
2. **E2E Test Job**: Tests end-to-end con Playwright
3. **Deploy Preview**: Despliegue de preview para PRs
4. **Deploy Production**: Despliegue a producción
5. **Notify**: Notificaciones de resultado

### Configuración de Secrets Requeridos

```bash
# En GitHub repository settings
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

## 📊 Mejoras de Rendimiento

### Optimizaciones Implementadas

1. **Servidor Dedicado**: Puerto separado para testing (5174)
2. **Configuración Condicional**: Mocks solo en entorno de test
3. **Timeouts Optimizados**: Diferentes timeouts por entorno
4. **Paralelización**: Ejecución concurrente de tests
5. **Health Checks**: Verificación previa de servicios

### Métricas de Rendimiento

- **Tiempo de Setup**: ~2-3 segundos
- **Tiempo por Test**: 5-15 segundos (dependiendo de complejidad)
- **Tiempo Total**: 30-60 segundos para suite completa
- **Memoria**: ~50-100MB adicional durante ejecución

## 🛠️ Utilidades de Testing

### Funciones Helper Disponibles

```javascript
import {
  sleep,
  getDynamicTimeout,
  waitForElement,
  waitForPageLoad,
  retry,
  runParallel,
  setupBrowser,
  setupPage,
  resolveUrl,
  resolveApiUrl,
  measurePerformance,
  logMemoryUsage,
  cleanup
} from './test-utils.js';
```

### Ejemplos de Uso

```javascript
// Espera dinámica con timeout inteligente
await waitForElement(page, '.flashcard', { timeout: 10000 });

// Reintento automático para operaciones flaky
await retry(() => flakyOperation(), { maxRetries: 3, delay: 1000 });

// Medición de rendimiento
const { result, duration } = await measurePerformance(() => expensiveOperation());
console.log(`Operation took ${duration}ms`);
```

## 🔧 Configuración Avanzada

### Variables de Entorno Adicionales

```bash
# Logging
TEST_LOG_LEVEL=info
TEST_LOG_FILE=./test-results/test.log

# Browser Configuration
TEST_BROWSER=headless
TEST_BROWSER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage

# Performance
MAX_CONCURRENT_TESTS=4
TEST_PARALLEL=true

# CI/CD
CI=false
CONTINUOUS_INTEGRATION=false
```

### Personalización

Para personalizar la configuración:

1. Modificar archivos `.env.*` según el entorno
2. Ajustar `test-config.js` para nuevas variables
3. Actualizar `test-utils.js` para nuevas funciones helper
4. Modificar `run-tests.js` para nueva lógica de ejecución

## 📈 Monitoreo y Debugging

### Logs Disponibles

- **Consola**: Output en tiempo real durante ejecución
- **Archivos de Log**: `test-results/test.log`
- **Resultados de Tests**: `test-results/` directory
- **CI/CD Logs**: Disponibles en GitHub Actions

### Debugging

```bash
# Ejecutar con más verbosidad
DEBUG=test:* npm test

# Ejecutar tests individuales con debug
DEBUG=test:* npm run test:design

# Ver logs en tiempo real
tail -f test-results/test.log
```

## 🎯 Mejores Prácticas

### Para Desarrolladores

1. **Usar Timeouts Dinámicos**: Siempre usar `getDynamicTimeout()` en lugar de valores hardcodeados
2. **Configurar URLs Dinámicamente**: Usar `resolveUrl()` en lugar de URLs hardcodeadas
3. **Implementar Health Checks**: Verificar servicios antes de operaciones críticas
4. **Usar Mocks Apropiadamente**: Activar mocks solo cuando sea necesario
5. **Paralelizar con Cuidado**: Considerar dependencias entre tests

### Para CI/CD

1. **Configurar Secrets**: Asegurar que todos los secrets necesarios estén configurados
2. **Optimizar Timeouts**: Ajustar timeouts para entorno de CI (generalmente más lentos)
3. **Monitorear Recursos**: Verificar límites de memoria y CPU en CI
4. **Cache Dependencies**: Usar cache de npm para acelerar builds

## 🚨 Solución de Problemas

### Problemas Comunes

#### 1. Tests Fallan por Timeouts
```bash
# Solución: Aumentar timeouts en CI
CI=true TEST_TIMEOUT=60000 npm run test:ci
```

#### 2. Puerto ya en Uso
```bash
# Solución: Cambiar puerto de test
TEST_PORT=5175 npm test
```

#### 3. Mocks no Funcionan
```bash
# Solución: Verificar configuración
USE_MOCKS=true MOCK_GEMINI_API=true npm test
```

#### 4. Memoria Insuficiente
```bash
# Solución: Reducir concurrencia
MAX_CONCURRENT_TESTS=2 npm run test:parallel
```

## 📚 Referencias

- [Mocha Documentation](https://mochajs.org/)
- [Chai Documentation](https://www.chaijs.com/)
- [Puppeteer Documentation](https://pptr.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Testing Best Practices](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)

---

## 🎉 Conclusión

Esta infraestructura de testing proporciona una base sólida y escalable para el desarrollo y mantenimiento de LinguaFlip. Las mejoras implementadas en la Fase 2 permiten:

- ✅ **Entornos Flexibles**: Configuración específica por entorno
- ✅ **Ejecución Eficiente**: Paralelización y timeouts optimizados
- ✅ **Desarrollo Acelerado**: Mocks y setup automático
- ✅ **Integración Continua**: Pipeline completo de CI/CD
- ✅ **Mantenibilidad**: Código organizado y bien documentado

La infraestructura está diseñada para crecer con el proyecto y adaptarse a futuras necesidades de testing.