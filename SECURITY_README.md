# 🛡️ Seguridad - LinguaFlip

## Resumen de Mejoras de Seguridad Implementadas

Este documento describe las mejoras críticas de seguridad implementadas en la Fase 1 del plan de refactorización de LinguaFlip.

## ✅ Mejoras Implementadas

### 1. Gestión Segura de API Keys

**Problema Anterior:**
- API key hardcodeada en archivo `.env`
- Sin validación de formato
- Exposición potencial de credenciales

**Solución Implementada:**
- ✅ Remoción completa de API key hardcodeada del `.env`
- ✅ Validación automática de formato de API key de Gemini
- ✅ Configuración segura mediante variables de entorno del sistema
- ✅ Carga automática desde `GEMINI_API_KEY` o `VITE_GEMINI_API_KEY`

### 2. Validación y Sanitización de Inputs

**Problema Anterior:**
- Sin sanitización de texto enviado a Gemini
- Sin validación de longitud de prompts
- Riesgo de inyección de código malicioso

**Solución Implementada:**
- ✅ Sanitización completa de texto antes de enviar a Gemini
- ✅ Validación de longitud máxima de prompts (configurable)
- ✅ Detección y bloqueo de patrones maliciosos
- ✅ Manejo seguro de caracteres especiales

### 3. Rate Limiting y Protección

**Problema Anterior:**
- Sin límites de frecuencia de solicitudes
- Sin logging de actividades sospechosas
- Riesgo de abuso de la API

**Solución Implementada:**
- ✅ Rate limiting básico por usuario (configurable)
- ✅ Logging automático de intentos sospechosos
- ✅ Protección contra abuso de la API
- ✅ Mensajes de error específicos para usuarios

## 🔧 Configuración de Seguridad

### Variables de Entorno Requeridas

Configure las siguientes variables de entorno de forma segura:

```bash
# API Key de Gemini (OBLIGATORIA)
export GEMINI_API_KEY="AIzaSyTU_API_KEY_REAL_AQUI"

# O para desarrollo con Vite
export VITE_GEMINI_API_KEY="AIzaSyTU_API_KEY_REAL_AQUI"
```

### Variables de Entorno Opcionales

```bash
# Configuración de seguridad (con valores por defecto)
export MAX_PROMPT_LENGTH="10000"          # Longitud máxima de prompt
export MAX_RETRIES="3"                     # Máximo número de reintentos
export RATE_LIMIT_WINDOW_MS="60000"        # Ventana de rate limiting (1 min)
export RATE_LIMIT_MAX_REQUESTS="10"        # Máximo de solicitudes por ventana
```

## 🏗️ Arquitectura de Seguridad

### Módulo `utils/security.ts`

Contiene todas las utilidades de seguridad:

- `validateGeminiApiKey()` - Valida formato de API key
- `sanitizeTextInput()` - Sanitiza inputs de texto
- `validatePrompt()` - Valida contenido y longitud de prompts
- `checkRateLimit()` - Implementa rate limiting
- `loadSecurityConfig()` - Carga configuración segura

### Clase `AICardGenerator` Mejorada

- ✅ Constructor con validación automática de API key
- ✅ Sanitización de todos los inputs
- ✅ Rate limiting integrado
- ✅ Logging de seguridad automático
- ✅ Manejo robusto de errores

### Hook `useAICardGeneration` Mejorado

- ✅ Identificación de usuario para rate limiting
- ✅ Manejo específico de errores de seguridad
- ✅ Mensajes de error user-friendly
- ✅ Logging de actividades

## 🚨 Manejo de Errores de Seguridad

### Tipos de Errores

| Código de Error | Descripción | Acción del Usuario |
|----------------|-------------|-------------------|
| `MISSING_API_KEY` | API key no configurada | Configurar variable de entorno |
| `INVALID_API_KEY_FORMAT` | Formato de API key inválido | Verificar API key |
| `RATE_LIMIT_EXCEEDED` | Límite de frecuencia excedido | Esperar antes de reintentar |
| `INVALID_INPUT` | Input inválido o vacío | Revisar entrada |
| `INPUT_TOO_LONG` | Input demasiado largo | Usar texto más corto |
| `INVALID_PROMPT` | Prompt con contenido malicioso | Cambiar contenido |

### Logging de Seguridad

Todos los eventos de seguridad se registran automáticamente:

```
[SECURITY] Rate limit ALLOWED for user-123 at 2025-08-29T15:00:00.000Z
[SECURITY] Suspicious activity detected: user-456 exceeded rate limit
[SECURITY] Generating bulk cards for user-123
```

## 🔍 Monitoreo y Alertas

### Métricas a Monitorear

1. **Rate Limiting Events**
   - Número de solicitudes bloqueadas por rate limiting
   - Usuarios con actividad sospechosa

2. **Input Validation**
   - Número de inputs sanitizados
   - Tipos de contenido bloqueado

3. **API Usage**
   - Patrones de uso por usuario
   - Tiempos de respuesta de Gemini

### Alertas Recomendadas

- Rate limiting excedido > 10 veces por hora
- Múltiples validaciones fallidas del mismo usuario
- Patrones de uso inusuales

## 🧪 Testing de Seguridad

### Casos de Prueba Recomendados

```typescript
// Test de sanitización
const maliciousInput = "<script>alert('xss')</script>Hello";
const sanitized = sanitizeTextInput(maliciousInput);
// Resultado: "<script>alert(&#x27;xss&#x27;)</script>Hello"

// Test de rate limiting
const result = checkRateLimit("test-user", 5, 60000);
// Resultado: { allowed: true/false, remainingRequests: X }

// Test de validación de API key
const isValid = validateGeminiApiKey("AIzaSyVALID_KEY_HERE");
// Resultado: true/false
```

## 🚀 Próximos Pasos

### Fase 2 - Seguridad Avanzada (Planificada)

1. **Autenticación de Usuarios**
   - Sistema de login/logout
   - Sesiones seguras
   - Autorización basada en roles

2. **Encriptación de Datos**
   - Encriptación de datos sensibles
   - Almacenamiento seguro de configuraciones
   - Protección de datos en tránsito

3. **Auditoría y Compliance**
   - Logs detallados de auditoría
   - Cumplimiento con regulaciones de privacidad
   - Reportes de seguridad automatizados

## 📞 Contacto y Soporte

Para preguntas sobre seguridad o reportes de vulnerabilidades, contactar al equipo de desarrollo.

---

**Fecha de Implementación:** Agosto 2025
**Versión:** 1.0.0
**Estado:** ✅ Completado y Funcional