# Pruebas E2E de Autenticación - LinguaFlip

Este directorio contiene las pruebas end-to-end (E2E) completas para el sistema de autenticación de LinguaFlip.

## Archivos

### `auth.spec.ts`
Archivo principal con todas las pruebas de autenticación organizadas en grupos lógicos:

- **Registro de nuevo usuario**: Pruebas de registro exitoso y validaciones de formulario
- **Login exitoso**: Pruebas de autenticación correcta y persistencia de sesión
- **Login fallido**: Pruebas de manejo de errores con credenciales inválidas
- **Logout**: Pruebas de cierre de sesión y limpieza de datos
- **Validación de formularios**: Pruebas de validación en tiempo real
- **Persistencia de sesión**: Pruebas de mantenimiento de sesión tras recarga
- **Navegación y estados de UI**: Pruebas de elementos de interfaz y loading

### `fixtures/users.ts`
Fixtures para generar datos de prueba únicos:

- `createValidUser()`: Usuario válido para registro
- `createLoginUser()`: Usuario para pruebas de login
- `createInvalidUser()`: Usuario con credenciales inválidas
- `createUserWithInvalidEmail()`: Usuario con email malformado
- `createUserWithWeakPassword()`: Usuario con contraseña débil
- `createUserWithMismatchedPasswords()`: Usuario con contraseñas diferentes
- `createUserWithMissingFields()`: Usuario con campos requeridos vacíos

### `utils/auth-helpers.ts`
Utilidades para interactuar con el sistema de autenticación:

- `login()`: Realiza login completo
- `register()`: Realiza registro completo
- `logout()`: Realiza cierre de sesión
- `fillLoginForm()`: Llena formulario de login
- `fillRegisterForm()`: Llena formulario de registro
- `getErrorMessage()`: Obtiene mensajes de error
- `getSuccessMessage()`: Obtiene mensajes de éxito
- `isAuthenticated()`: Verifica si el usuario está autenticado
- `isOnDashboard()`: Verifica si está en el dashboard
- `clearStorage()`: Limpia el almacenamiento local
- `getStoredTokens()`: Obtiene tokens del localStorage

## Escenarios Cubiertos

### 1. Registro de Nuevo Usuario
- ✅ Registro exitoso con datos válidos
- ✅ Validación de formato de email
- ✅ Validación de requisitos de contraseña
- ✅ Validación de coincidencia de contraseñas
- ✅ Validación de términos de servicio
- ✅ Validación de campos requeridos

### 2. Login Exitoso
- ✅ Login con credenciales válidas
- ✅ Redirección al dashboard
- ✅ Persistencia de tokens en localStorage
- ✅ Mantenimiento de sesión tras recarga

### 3. Login Fallido
- ✅ Error con credenciales inválidas
- ✅ Error con email vacío
- ✅ Error con contraseña vacía
- ✅ Mensajes de error apropiados

### 4. Logout
- ✅ Cierre de sesión correcto
- ✅ Redirección a página de login
- ✅ Limpieza de tokens del localStorage

### 5. Validación de Formularios
- ✅ Validación en tiempo real de email
- ✅ Validación en tiempo real de contraseña
- ✅ Validación de requisitos de seguridad

### 6. Persistencia de Sesión
- ✅ Mantenimiento de sesión tras recarga
- ✅ Limpieza completa al hacer logout

### 7. Estados de UI
- ✅ Elementos de loading durante operaciones
- ✅ Estados de botones (habilitado/deshabilitado)
- ✅ Alternancia de visibilidad de contraseña

## Configuración

Las pruebas están configuradas para ejecutarse en múltiples navegadores:

- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome Mobile, Safari Mobile

## Ejecución

### Ejecutar todas las pruebas de autenticación
```bash
npm run test:e2e -- tests/e2e/auth/
```

### Ejecutar en un navegador específico
```bash
npm run test:e2e:chromium -- tests/e2e/auth/
npm run test:e2e:firefox -- tests/e2e/auth/
npm run test:e2e:webkit -- tests/e2e/auth/
```

### Ejecutar en dispositivos móviles
```bash
npm run test:e2e:mobile -- tests/e2e/auth/
```

### Modo debug
```bash
npm run test:e2e:debug -- tests/e2e/auth/
```

### Ver reporte HTML
```bash
npm run test:e2e:report
```

## Características Técnicas

- **Datos únicos**: Cada prueba usa datos generados dinámicamente para evitar conflictos
- **Waits apropiados**: Manejo correcto de elementos dinámicos y asíncronos
- **Assertions robustos**: Verificaciones completas de estados de UI
- **Manejo de errores**: Captura y manejo de errores de red y timeouts
- **Limpieza automática**: Limpieza de datos después de cada prueba
- **Compatibilidad multiplataforma**: Funciona en desktop y mobile

## Mejores Prácticas Implementadas

1. **Datos de prueba únicos**: Evita conflictos entre pruebas paralelas
2. **Espera explícita**: Usa waits apropiados para elementos dinámicos
3. **Verificaciones completas**: Incluye assertions para todos los estados relevantes
4. **Manejo de errores**: Implementa try-catch para operaciones críticas
5. **Limpieza consistente**: Asegura estado limpio entre pruebas
6. **Reutilización de código**: Utilidades compartidas para reducir duplicación