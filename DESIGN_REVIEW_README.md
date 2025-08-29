# LinguaFlip Design Review Script

Script automatizado de revisión de diseño para la aplicación LinguaFlip utilizando Puppeteer.

## 📋 Descripción

Este script realiza una revisión completa del diseño y funcionalidad del sitio web LinguaFlip, incluyendo:

- ✅ Verificación de carga de página
- 📱 Pruebas de responsividad en múltiples dispositivos
- 🎨 Verificación de estilos CSS y Tailwind
- 🔍 Análisis de componentes críticos
- 🖱️ Verificación de elementos interactivos
- 📸 Captura de screenshots automatizada
- 📊 Generación de reportes detallados

## 🚀 Requisitos

- **Node.js** (versión 14 o superior)
- **Puppeteer** (ya incluido en las dependencias del proyecto)
- **Servidor de desarrollo** corriendo en `http://localhost:5173`

## 📦 Instalación

Puppeteer ya está instalado como dependencia de desarrollo. Si necesitas instalarlo manualmente:

```bash
npm install puppeteer --save-dev
```

## 🏃‍♂️ Uso

### Opción 1: Ejecutar directamente
```bash
node design-review.js
```

### Opción 2: Usar como ejecutable
```bash
./design-review.js
```

### Opción 3: Usar con npm script (recomendado)

Agrega al `package.json` en la sección de scripts:
```json
{
  "scripts": {
    "design-review": "node design-review.js"
  }
}
```

Luego ejecuta:
```bash
npm run design-review
```

## ⚙️ Configuración

El script está preconfigurado para:

- **URL base**: `http://localhost:5173`
- **Dispositivos probados**:
  - Desktop (1920x1080)
  - Laptop (1366x768)
  - Tablet (768x1024)
  - Mobile (375x667)
- **Timeouts**: 30 segundos para navegación y elementos
- **Directorio de screenshots**: `./design-review-screenshots/`
- **Archivo de reporte**: `./design-review-report.json`

## 📊 Salidas Generadas

### 1. Screenshots
Se generan automáticamente en la carpeta `design-review-screenshots/`:
- `initial-load-[timestamp].png` - Screenshot inicial de la página
- `device-desktop-[timestamp].png` - Vista desktop
- `device-laptop-[timestamp].png` - Vista laptop
- `device-tablet-[timestamp].png` - Vista tablet
- `device-mobile-[timestamp].png` - Vista mobile

### 2. Reporte JSON
Archivo `design-review-report.json` con estructura:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "url": "http://localhost:5173",
  "deviceTests": {
    "desktop": {
      "success": true,
      "screenshot": "device-desktop-1234567890.png",
      "elements": { /* estado de elementos */ }
    }
  },
  "componentTests": {
    "criticalElements": { /* verificación de elementos */ },
    "styling": { /* verificación de estilos */ }
  },
  "overallStatus": "success"
}
```

### 3. Salida en Consola
Información detallada durante la ejecución:
- ✅ Estado de cada verificación
- 📸 Confirmación de screenshots capturados
- 🔍 Resultados de análisis de componentes
- 📊 Resumen final

## 🔍 Pruebas Realizadas

### Verificaciones de Componentes
- **Header**: Presencia del encabezado de navegación
- **Sidebar**: Panel lateral de navegación
- **Main Content**: Área principal de contenido
- **Flashcard**: Componente principal de tarjetas
- **Dashboard**: Panel de control y estadísticas

### Verificaciones de Estilos
- **Tailwind CSS**: Detección de framework CSS
- **CSS Personalizado**: Presencia de estilos personalizados
- **Clases Responsive**: Uso de breakpoints de Tailwind
- **Layout**: Verificación de Grid y Flexbox
- **Espaciado**: Consistencia en márgenes y padding

### Verificaciones Interactivas
- **Botones**: Cantidad y funcionalidad
- **Formularios**: Presencia de elementos de formulario
- **Enlaces**: Links de navegación
- **Elementos Clickeables**: Componentes interactivos

### Pruebas de Dispositivos
- **Desktop**: 1920x1080 (escala 1x)
- **Laptop**: 1366x768 (escala 1x)
- **Tablet**: 768x1024 (escala 1x)
- **Mobile**: 375x667 (escala 2x)

## 🛠️ Personalización

Para modificar la configuración, edita las variables en la clase `DesignReviewer`:

```javascript
// Cambiar URL base
this.baseUrl = 'http://localhost:3000';

// Modificar dispositivos
getDeviceConfigs() {
    return {
        desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 },
        // Agregar más dispositivos...
    };
}
```

## 🚨 Solución de Problemas

### Error: "No se pudo cargar la página principal"
- Verifica que el servidor de desarrollo esté corriendo
- Confirma que la URL `http://localhost:5173` sea correcta
- Revisa que no haya firewalls bloqueando conexiones locales

### Error: "Puppeteer no encontrado"
```bash
npm install puppeteer --save-dev
```

### Error: "No se pueden crear screenshots"
- Verifica permisos de escritura en el directorio del proyecto
- Asegúrate de que la carpeta `design-review-screenshots/` no esté bloqueada

### Timeout errors
- Aumenta los timeouts en la configuración
- Verifica la velocidad de tu conexión a internet
- Revisa si hay recursos pesados cargándose en la página

## 📈 Interpretación de Resultados

### Estado General
- **✅ Success**: Todas las pruebas pasaron exitosamente
- **⚠️ Warning**: Algunas pruebas fallaron pero no son críticas
- **❌ Error**: Error crítico que impidió completar la revisión

### Métricas Clave
- **Dispositivos exitosos**: Número de viewports donde la página funcionó correctamente
- **Componentes detectados**: Elementos críticos encontrados en el DOM
- **Screenshots generados**: Número de capturas realizadas

## 🔄 Integración con CI/CD

Para integrar en un pipeline de CI/CD:

```yaml
# Ejemplo GitHub Actions
- name: Run Design Review
  run: |
    npm run dev &
    sleep 10
    npm run design-review
```

## 📝 Notas Técnicas

- El script utiliza modo headless para ejecución automatizada
- Se configura un timeout de 30 segundos para evitar bloqueos
- Los screenshots se nombran con timestamp para evitar conflictos
- El reporte JSON incluye metadatos completos para análisis posterior

## 🤝 Contribución

Para mejorar el script:
1. Agrega nuevas verificaciones en métodos separados
2. Incluye nuevos dispositivos en `getDeviceConfigs()`
3. Mejora el formato del reporte JSON
4. Agrega validaciones adicionales de accesibilidad

---

**Versión**: 1.0.0
**Última actualización**: Enero 2024
**Autor**: LinguaFlip Development Team