# Pruebas E2E del Dashboard

Este directorio contiene las pruebas end-to-end (E2E) para el dashboard y progreso de LinguaFlip.

## Archivos

### `dashboard.spec.ts`
Archivo principal con todas las pruebas E2E del dashboard. Incluye escenarios para:
- Estadísticas generales del dashboard
- Gráficos de progreso y visualizaciones
- Acciones rápidas del usuario
- Actividad reciente y sesiones
- Metas de estudio y seguimiento
- Navegación entre secciones
- Actualización en tiempo real
- Diferentes estados de datos (vacío, mínimo, grande)

### `../fixtures/dashboard-data.ts`
Datos de prueba únicos para evitar conflictos entre pruebas. Incluye:
- Estadísticas del dashboard
- Datos de progreso para gráficos
- Actividad reciente
- Metas de estudio
- Datos para diferentes estados (vacío, mínimo, grande)

### `../types/dashboard.ts`
Tipos TypeScript para las pruebas del dashboard, incluyendo:
- Interfaces para datos del dashboard
- Selectores CSS para elementos
- Contextos de prueba

### `../utils/dashboard-helpers.ts`
Utilidades y helpers para interactuar con el dashboard en las pruebas:
- Clase `DashboardHelpers` con métodos para navegación y verificación
- Selectores CSS organizados
- Métodos para manejar estados de carga y errores
- Funciones para capturas de pantalla

## Escenarios de Prueba

### 1. Estadísticas Generales
- Visualización de métricas principales (flashcards totales, estudiadas hoy, racha, etc.)
- Verificación de cálculos de progreso (semanal, mensual)
- Validación de formato de tiempo de estudio

### 2. Gráficos de Progreso
- Charts de actividad diaria, semanal y mensual
- Heatmap de estudio
- Verificación de renderizado correcto
- Interacciones con gráficos (hover, etc.)

### 3. Acciones Rápidas
- Botón "Crear Flashcard" - navegación y modal
- Botón "Iniciar Estudio" - navegación a página de estudio
- Botón "Ver Progreso" - navegación a página de progreso

### 4. Actividad Reciente
- Lista de sesiones de estudio recientes
- Flashcards estudiados recientemente
- Detalles de precisión y tiempo

### 5. Metas de Estudio
- Configuración y visualización de objetivos
- Barras de progreso para metas diarias/semanales/mensuales
- Seguimiento de rachas

### 6. Navegación
- Transiciones entre dashboard y progreso
- Mantenimiento de estado entre navegaciones
- URLs correctas

### 7. Actualización en Tiempo Real
- Actualización automática después de sesiones de estudio
- Sincronización de datos
- Manejo de estados de carga

### 8. Estados de Datos
- **Estado vacío**: Sin flashcards ni actividad
- **Estado mínimo**: Pocos datos para pruebas básicas
- **Estado grande**: Muchos datos para pruebas de rendimiento

## Especificaciones Técnicas

### Datos de Prueba Únicos
- Cada conjunto de datos tiene un ID único basado en timestamp
- Evita conflictos entre pruebas paralelas
- Permite limpieza específica después de cada prueba

### Waits Apropiados
- Esperas para elementos dinámicos y gráficos
- Timeouts configurables para diferentes escenarios
- Manejo de estados de carga

### Assertions
- Verificación de estados de UI
- Validación de datos mostrados
- Comprobación de cálculos y porcentajes

### Manejo de Errores
- Detección y manejo de errores de carga
- Timeouts apropiados
- Recuperación de estados de error

### Fixtures Consistentes
- Datos predecibles para pruebas repetibles
- Diferentes estados de datos para cobertura completa
- Limpieza automática después de cada prueba

## Ejecución

### Ejecutar todas las pruebas del dashboard
```bash
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts
```

### Ejecutar pruebas específicas
```bash
# Solo estadísticas
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts -g "estadísticas"

# Solo gráficos
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts -g "gráficos"

# Solo navegación
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts -g "navegación"
```

### Ejecutar con diferentes navegadores
```bash
# Chrome
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts --project=chromium

# Firefox
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts --project=firefox

# Safari
npm run test:e2e -- tests/e2e/dashboard/dashboard.spec.ts --project=webkit
```

## Capturas de Pantalla

Las pruebas generan capturas de pantalla automáticamente en `test-results/screenshots/` con nombres descriptivos:
- `dashboard-stats-overview.png`
- `dashboard-progress-charts.png`
- `dashboard-quick-actions.png`
- `dashboard-recent-activity.png`
- `dashboard-study-goals.png`
- `dashboard-navigation.png`
- `dashboard-real-time-updates.png`
- `dashboard-empty-state.png`
- `dashboard-minimal-data.png`
- `dashboard-large-data.png`
- `dashboard-error-handling.png`
- `dashboard-accessibility.png`

## Mejores Prácticas

1. **Datos únicos**: Siempre usar datos de prueba con IDs únicos
2. **Limpieza**: Asegurar limpieza después de cada prueba
3. **Waits**: Usar waits apropiados para elementos dinámicos
4. **Assertions**: Verificar tanto UI como datos
5. **Errores**: Manejar errores de carga y timeouts
6. **Rendimiento**: Probar con diferentes cantidades de datos
7. **Accesibilidad**: Verificar navegación por teclado y responsividad

## Mantenimiento

- Actualizar selectores CSS cuando cambie la UI
- Agregar nuevos escenarios cuando se agreguen funcionalidades
- Revisar y actualizar datos de prueba según sea necesario
- Mantener consistencia con otros archivos de pruebas E2E