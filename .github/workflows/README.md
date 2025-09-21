# LinguaFlip CI/CD Workflows

Este directorio contiene los workflows de GitHub Actions para la ejecución automatizada de pruebas E2E en LinguaFlip.

## Workflows Disponibles

### 1. `e2e-tests.yml` - Workflow Principal
Workflow completo para pruebas E2E que se ejecuta en push a ramas principales y pull requests.

**Características:**
- Ejecución en múltiples navegadores (Chromium, Firefox, WebKit)
- Matrix de versiones de Node.js (18.x, 20.x, 22.x)
- Configuración de base de datos MongoDB para pruebas
- Ejecución en paralelo con sharding
- Artefactos y reportes detallados
- Notificaciones en caso de fallos

**Triggers:**
- Push a `main` y `develop`
- Pull requests a `main` y `develop`
- Manual via workflow_dispatch

### 2. `e2e-tests-pr.yml` - Workflow para Pull Requests
Workflow optimizado para revisiones de código en pull requests.

**Características:**
- Ejecución más rápida (solo 2 navegadores)
- Comentarios automáticos en PRs con resultados
- Configuración ligera para feedback rápido
- Notificaciones específicas para PRs

**Triggers:**
- Pull requests (opened, synchronize, reopened, ready_for_review)
- Manual via workflow_dispatch

### 3. `e2e-tests-scheduled.yml` - Ejecución Programada
Workflow para pruebas regulares programadas diariamente.

**Características:**
- Ejecución diaria a las 2:00 AM UTC
- Pruebas completas en todos los navegadores
- Generación de baselines de rendimiento
- Reportes detallados de salud de la aplicación
- Limpieza automática de artefactos antiguos

**Triggers:**
- Schedule: `0 2 * * *` (diario a las 2:00 AM UTC)
- Manual via workflow_dispatch

## Configuración de Docker

### `docker/Dockerfile.e2e`
Imagen Docker optimizada para la ejecución de pruebas E2E.

**Características:**
- Basada en Node.js 20 LTS
- Incluye todos los navegadores necesarios (Chrome, Firefox, WebKit)
- Configuración optimizada para CI/CD
- Usuario no-root para seguridad

### `docker/docker-compose.e2e.yml`
Configuración completa de servicios para pruebas E2E.

**Servicios incluidos:**
- **mongodb**: Base de datos MongoDB para pruebas
- **redis**: Cache Redis (si es necesario)
- **app**: Aplicación LinguaFlip bajo prueba
- **playwright**: Contenedor para ejecutar las pruebas

## Scripts de Package.json

Se han agregado varios scripts para facilitar la ejecución de pruebas en diferentes contextos:

### Scripts para CI/CD:
- `test:e2e:ci`: Ejecuta pruebas con reportes para CI
- `test:e2e:ci:chromium`: Pruebas solo en Chromium para CI
- `test:e2e:ci:firefox`: Pruebas solo en Firefox para CI
- `test:e2e:ci:webkit`: Pruebas solo en WebKit para CI
- `test:e2e:ci:parallel`: Pruebas en paralelo para CI
- `test:e2e:ci:shard`: Pruebas con sharding para CI

### Scripts para Docker:
- `test:e2e:docker`: Ejecuta pruebas usando Docker Compose
- `test:e2e:docker:build`: Construye la imagen Docker para E2E
- `test:e2e:docker:run`: Ejecuta pruebas en contenedor Docker
- `test:e2e:docker:clean`: Limpia contenedores y volúmenes de Docker

### Scripts para diferentes tipos de pruebas:
- `test:performance`: Pruebas marcadas con `@performance`
- `test:smoke`: Pruebas marcadas con `@smoke`
- `test:accessibility`: Pruebas marcadas con `@accessibility`
- `test:visual`: Pruebas marcadas con `@visual`
- `test:api`: Pruebas marcadas con `@api`

## Variables de Entorno

### Variables requeridas:
- `BASE_URL`: URL base de la aplicación (ej: http://localhost:4321)
- `MONGODB_URL`: URL de conexión a MongoDB
- `NODE_ENV`: Entorno de ejecución (test)
- `CI`: Indica si se ejecuta en CI (true/false)

### Variables opcionales:
- `WORKERS`: Número de workers para ejecución en paralelo
- `SHARD`: Configuración de sharding (ej: "1/3")
- `BROWSERS`: Lista de navegadores separados por coma

## Configuración de Playwright

El archivo `playwright.config.ts` ha sido optimizado para CI/CD con:

- Configuración condicional basada en `process.env.CI`
- Workers optimizados para CI (2 por defecto, configurable)
- Reportes múltiples (JSON, JUnit, HTML)
- Configuración de sharding
- Timeouts extendidos para CI
- Configuración de webServer diferenciada para CI vs desarrollo

## Uso Manual

### Ejecutar pruebas localmente:
```bash
# Pruebas básicas
npm run test:e2e

# Pruebas en CI mode
npm run test:e2e:ci

# Pruebas en un navegador específico
npm run test:e2e:ci:chromium

# Pruebas con Docker
npm run test:e2e:docker
```

### Ejecutar workflows manualmente:
1. Ir a la pestaña "Actions" en GitHub
2. Seleccionar el workflow deseado
3. Hacer clic en "Run workflow"
4. Configurar los parámetros si es necesario

## Artefactos y Reportes

Los workflows generan los siguientes artefactos:
- `test-results/`: Resultados detallados de las pruebas
- `playwright-report/`: Reportes HTML interactivos
- `test-videos/`: Videos de las pruebas (solo en fallos)

Los artefactos se mantienen por:
- 7 días para workflows de PR
- 30 días para workflows principales
- 90 días para workflows programados

## Notificaciones

Los workflows incluyen notificaciones automáticas en caso de fallos. Para configurar notificaciones:

1. **Slack**: Agregar `SLACK_WEBHOOK_URL` secret
2. **Discord**: Agregar `DISCORD_WEBHOOK_URL` secret
3. **Email**: Configurar en la sección de notificaciones

## Solución de Problemas

### Problemas comunes:
1. **Base de datos no disponible**: Verificar que MongoDB esté ejecutándose
2. **Aplicación no inicia**: Verificar que el puerto 4321 esté disponible
3. **Navegadores no encontrados**: Ejecutar `npx playwright install`
4. **Timeouts**: Ajustar timeouts en playwright.config.ts

### Logs de depuración:
- Ver logs de workflows en GitHub Actions
- Logs de aplicación en contenedores Docker
- Reportes detallados en artefactos

## Mejores Prácticas

1. **Mantener pruebas estables**: Evitar flaky tests
2. **Usar fixtures**: Para datos de prueba consistentes
3. **Parallel execution**: Aprovechar workers para velocidad
4. **Cleanup**: Siempre limpiar datos de prueba
5. **Monitoring**: Revisar reportes regularmente
6. **Sharding**: Usar para pruebas muy grandes

## Contribución

Al agregar nuevas pruebas E2E:
1. Usar las fixtures existentes
2. Agregar etiquetas apropiadas (@smoke, @performance, etc.)
3. Incluir assertions descriptivos
4. Documentar en el README correspondiente
5. Probar en múltiples navegadores

Para más información sobre Playwright, consulta: https://playwright.dev/