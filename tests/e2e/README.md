# Playwright E2E Tests

Este directorio contiene las pruebas end-to-end (E2E) para la aplicación LinguaFlip utilizando Playwright.

## Estructura del Directorio

```
tests/e2e/
├── app.spec.ts          # Pruebas básicas de la aplicación
├── auth/                # Pruebas de autenticación
├── flashcards/          # Pruebas de funcionalidades de flashcards
├── dashboard/           # Pruebas del dashboard
├── fixtures/            # Datos de prueba y fixtures
├── utils/               # Utilidades para las pruebas
├── global-setup.ts      # Configuración global antes de las pruebas
└── global-teardown.ts   # Limpieza global después de las pruebas
```

## Scripts Disponibles

### Ejecución Básica
- `npm run test:e2e` - Ejecuta todas las pruebas E2E
- `npm run test:e2e:ui` - Ejecuta las pruebas con interfaz gráfica
- `npm run test:e2e:debug` - Ejecuta las pruebas en modo debug
- `npm run test:e2e:headed` - Ejecuta las pruebas con navegador visible

### Por Navegador
- `npm run test:e2e:chromium` - Solo en Chrome
- `npm run test:e2e:firefox` - Solo en Firefox
- `npm run test:e2e:webkit` - Solo en Safari (WebKit)

### Móviles
- `npm run test:e2e:mobile` - Pruebas en dispositivos móviles

### Reportes
- `npm run test:e2e:report` - Muestra el reporte de pruebas

## Configuración

La configuración de Playwright está en `playwright.config.ts` en la raíz del proyecto:

- **Base URL**: `http://localhost:4321` (puerto de desarrollo de Astro)
- **Navegadores**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reportes**: HTML, JSON, JUnit
- **Videos y Screenshots**: Se capturan en caso de fallos
- **Traces**: Se generan para debugging

## Ejecutar las Pruebas

1. **Primera vez**: Instalar los navegadores
   ```bash
   npx playwright install
   ```

2. **Ejecutar todas las pruebas**:
   ```bash
   npm run test:e2e
   ```

3. **Ejecutar con interfaz visual**:
   ```bash
   npm run test:e2e:ui
   ```

4. **Debug de una prueba específica**:
   ```bash
   npm run test:e2e:debug tests/e2e/app.spec.ts
   ```

## Mejores Prácticas

1. **Espera elementos**: Usa `await expect()` en lugar de `waitForTimeout()`
2. **Selectores**: Prefiere selectores de datos sobre clases CSS
3. **Fixtures**: Usa fixtures para datos de prueba reutilizables
4. **Agrupación**: Organiza las pruebas en `test.describe()` por funcionalidad
5. **Independencia**: Cada prueba debe ser independiente y no depender de otras

## Debugging

- Usa `page.pause()` para pausar la ejecución y inspeccionar el DOM
- Revisa los screenshots y videos en `test-results/` cuando fallen las pruebas
- Usa `page.locator().hover()` para verificar elementos interactivos
- Revisa la consola del navegador con `page.on('console')`

## CI/CD

Las pruebas están configuradas para ejecutarse en entornos CI/CD con:
- Reintentos automáticos en CI
- Reportes en múltiples formatos
- Ejecución en paralelo deshabilitada en CI para estabilidad