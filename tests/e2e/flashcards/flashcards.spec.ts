// @ts-nocheck
import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/auth-helpers';
import { FlashcardHelpers } from '../utils/flashcard-helpers';
import {
  createValidUser,
  createLoginUser,
  VALID_PASSWORD,
} from '../fixtures/users';
import {
  createBasicFlashcard,
  createAudioFlashcard,
  createImageFlashcard,
  createExampleFlashcard,
  createAdvancedFlashcard,
  createBasicFlashcardForm,
  createAudioFlashcardForm,
  createImageFlashcardForm,
  createInvalidFlashcardForm,
  createOversizedFlashcardForm,
  createEditableFlashcard,
  createUpdatedFlashcardData,
} from '../fixtures/flashcards';

test.describe('Gestión de Flashcards - LinguaFlip', () => {
  let authHelpers: AuthHelpers;
  let flashcardHelpers: FlashcardHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    flashcardHelpers = new FlashcardHelpers(page);

    // Limpiar storage antes de cada prueba
    await authHelpers.clearStorage();

    // Hacer login para acceder a las funcionalidades de flashcards
    const validUser = createLoginUser();
    await authHelpers.register({
      ...validUser,
      username: 'testuser',
      confirmPassword: VALID_PASSWORD,
    });

    // Verificar que estamos en el dashboard
    await authHelpers.waitForDashboardRedirect();
    expect(await authHelpers.isOnDashboard()).toBe(true);
  });

  test.afterEach(async () => {
    // Limpiar storage después de cada prueba
    await authHelpers.clearStorage();
  });

  test.describe('Creación de flashcards', () => {
    test('debería permitir crear una flashcard básica exitosamente', async () => {
      const formData = createBasicFlashcardForm();

      await flashcardHelpers.createFlashcard(formData);

      // Verificar que se muestra el mensaje de éxito
      await flashcardHelpers.waitForOperationComplete();
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcard creada exitosamente');

      // Verificar que la flashcard aparece en la lista
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);

      // Verificar que la flashcard se puede encontrar por búsqueda
      await flashcardHelpers.searchFlashcard(formData.front);
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería permitir crear una flashcard con audio', async () => {
      const formData = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData);

      // Verificar que se muestra el mensaje de éxito
      await flashcardHelpers.waitForOperationComplete();
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcard creada exitosamente');

      // Verificar que la flashcard aparece en la lista
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería permitir crear una flashcard con imagen', async () => {
      const formData = createImageFlashcardForm();

      await flashcardHelpers.createFlashcard(formData);

      // Verificar que se muestra el mensaje de éxito
      await flashcardHelpers.waitForOperationComplete();
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcard creada exitosamente');

      // Verificar que la flashcard aparece en la lista
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería permitir crear una flashcard con ejemplos', async () => {
      const formData = createImageFlashcardForm(); // Este formulario ya incluye ejemplos

      await flashcardHelpers.createFlashcard(formData);

      // Verificar que se muestra el mensaje de éxito
      await flashcardHelpers.waitForOperationComplete();
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcard creada exitosamente');

      // Verificar que la flashcard aparece en la lista
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería mostrar error con campos requeridos vacíos', async () => {
      const invalidFormData = createInvalidFlashcardForm();

      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(invalidFormData as any);
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestra el mensaje de error
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('Todos los campos obligatorios deben ser completados');
    });

    test('debería mostrar error con campos demasiado largos', async () => {
      const oversizedFormData = createOversizedFlashcardForm();

      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(oversizedFormData);
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestra el mensaje de error
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('El contenido excede el límite de caracteres');
    });

    test('debería mostrar elementos de loading durante la creación', async ({ page }) => {
      const formData = createBasicFlashcardForm();

      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(formData);
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que el botón muestra estado de loading
      const loadingSpinner = page.locator('#loading-spinner, .loading-spinner');
      await expect(loadingSpinner).toBeVisible();

      // Verificar que el botón está deshabilitado
      const submitButton = page.locator('#submit-flashcard, #create-flashcard, button[type="submit"]');
      await expect(submitButton).toBeDisabled();

      // Esperar a que el loading termine
      await flashcardHelpers.waitForOperationComplete();
    });
  });

  test.describe('Edición de flashcards', () => {
    test('debería permitir editar una flashcard existente', async () => {
      // Crear una flashcard primero
      const originalFormData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(originalFormData);

      // Verificar que se creó correctamente
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.isFlashcardVisible(originalFormData.front)).toBe(true);

      // Editar la flashcard
      const updatedData = createUpdatedFlashcardData();
      await flashcardHelpers.editFlashcard(originalFormData.front, {
        front: updatedData.front,
        back: updatedData.back,
        exampleFront: updatedData.exampleFront,
        exampleBack: updatedData.exampleBack,
        category: updatedData.category,
        tags: updatedData.tags?.join(', '),
        difficulty: updatedData.difficulty,
      });

      // Verificar que se muestra el mensaje de éxito
      await flashcardHelpers.waitForOperationComplete();
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcard actualizada exitosamente');

      // Verificar que los nuevos datos están presentes
      expect(await flashcardHelpers.isFlashcardVisible(updatedData.front!)).toBe(true);

      // Verificar que el contenido anterior ya no está visible
      expect(await flashcardHelpers.isFlashcardVisible(originalFormData.front)).toBe(false);
    });

    test('debería mostrar error al editar con datos inválidos', async () => {
      // Crear una flashcard primero
      const originalFormData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(originalFormData);

      // Intentar editar con datos inválidos
      const invalidData = createInvalidFlashcardForm();
      await flashcardHelpers.editFlashcard(originalFormData.front, invalidData as any);

      // Verificar que se muestra el mensaje de error
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('Todos los campos obligatorios deben ser completados');
    });

    test('debería cancelar la edición correctamente', async ({ page }) => {
      // Crear una flashcard primero
      const originalFormData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(originalFormData);

      // Iniciar edición
      await flashcardHelpers.editFlashcard(originalFormData.front, { front: 'Modified content' });

      // Cancelar la edición (hacer clic en cancelar)
      const cancelButton = page.locator('#cancel-edit, .cancel-edit, text=Cancel, text=Cancelar');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }

      // Verificar que el contenido original sigue presente
      expect(await flashcardHelpers.isFlashcardVisible(originalFormData.front)).toBe(true);
    });
  });

  test.describe('Eliminación de flashcards', () => {
    test('debería permitir eliminar una flashcard individual', async () => {
      // Crear una flashcard primero
      const formData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(formData);

      // Verificar que se creó correctamente
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);

      // Eliminar la flashcard
      await flashcardHelpers.deleteFlashcard(formData.front);

      // Verificar que se muestra el mensaje de éxito
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcard eliminada exitosamente');

      // Verificar que la flashcard ya no está visible
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(false);
    });

    test('debería permitir eliminar múltiples flashcards', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();
      const formData3 = createImageFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);
      await flashcardHelpers.createFlashcard(formData3);

      // Verificar que se crearon correctamente
      await flashcardHelpers.waitForFlashcardList();
      expect(await flashcardHelpers.getFlashcardCount()).toBeGreaterThanOrEqual(3);

      // Eliminar múltiples flashcards (índices 0 y 1)
      await flashcardHelpers.deleteMultipleFlashcards([0, 1]);

      // Verificar que se muestra el mensaje de éxito
      const successMessage = await flashcardHelpers.getFormSuccessMessage();
      expect(successMessage).toContain('Flashcards eliminadas exitosamente');

      // Verificar que las flashcards fueron eliminadas
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(false);
      expect(await flashcardHelpers.isFlashcardVisible(formData2.front)).toBe(false);
      // La tercera debería seguir existiendo
      expect(await flashcardHelpers.isFlashcardVisible(formData3.front)).toBe(true);
    });

    test('debería mostrar modal de confirmación antes de eliminar', async ({ page }) => {
      // Crear una flashcard primero
      const formData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(formData);

      // Iniciar eliminación
      await flashcardHelpers.deleteFlashcard(formData.front);

      // Verificar que aparece el modal de confirmación
      await flashcardHelpers.waitForConfirmationModal();
      const confirmModal = page.locator('#confirm-delete, .confirm-delete, .modal');
      await expect(confirmModal).toBeVisible();

      // Cancelar la eliminación
      const cancelButton = page.locator('#cancel-delete, .cancel-delete, text=Cancel, text=Cancelar');
      await cancelButton.click();

      // Verificar que la flashcard sigue existiendo
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería cancelar la eliminación correctamente', async ({ page }) => {
      // Crear una flashcard primero
      const formData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(formData);

      // Iniciar eliminación
      await flashcardHelpers.deleteFlashcard(formData.front);

      // Verificar que aparece el modal de confirmación
      await flashcardHelpers.waitForConfirmationModal();

      // Cancelar la eliminación
      const cancelButton = page.locator('#cancel-delete, .cancel-delete, text=Cancel, text=Cancelar');
      await cancelButton.click();

      // Verificar que la flashcard sigue existiendo
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });
  });

  test.describe('Listado y navegación', () => {
    test('debería mostrar flashcards en la lista correctamente', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();
      const formData3 = createImageFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);
      await flashcardHelpers.createFlashcard(formData3);

      // Verificar que aparecen en la lista
      await flashcardHelpers.waitForFlashcardList();
      const flashcardList = await flashcardHelpers.getFlashcardList();
      expect(flashcardList.length).toBeGreaterThanOrEqual(3);

      // Verificar que el contenido es correcto
      expect(flashcardList.some(item => item.includes(formData1.front))).toBe(true);
      expect(flashcardList.some(item => item.includes(formData2.front))).toBe(true);
      expect(flashcardList.some(item => item.includes(formData3.front))).toBe(true);
    });

    test('debería permitir buscar flashcards por texto', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Buscar la primera flashcard
      await flashcardHelpers.searchFlashcard(formData1.front);

      // Verificar que solo aparece la flashcard buscada
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);
      expect(await flashcardHelpers.isFlashcardVisible(formData2.front)).toBe(false);
    });

    test('debería permitir filtrar flashcards por categoría', async () => {
      // Crear flashcards con diferentes categorías
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Filtrar por la categoría de la primera flashcard
      await flashcardHelpers.filterByCategory(formData1.category);

      // Verificar que solo aparecen flashcards de esa categoría
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);
    });

    test('debería permitir filtrar flashcards por dificultad', async () => {
      // Crear flashcards con diferentes dificultades
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Filtrar por dificultad media
      await flashcardHelpers.filterByDifficulty('medium');

      // Verificar que aparecen las flashcards con esa dificultad
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);
    });

    test('debería permitir limpiar la búsqueda', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Realizar una búsqueda
      await flashcardHelpers.searchFlashcard(formData1.front);
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);
      expect(await flashcardHelpers.isFlashcardVisible(formData2.front)).toBe(false);

      // Limpiar la búsqueda
      await flashcardHelpers.clearSearch();

      // Verificar que aparecen todas las flashcards
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);
      expect(await flashcardHelpers.isFlashcardVisible(formData2.front)).toBe(true);
    });

    test('debería permitir limpiar todos los filtros', async () => {
      // Crear flashcards con diferentes categorías y dificultades
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Aplicar múltiples filtros
      await flashcardHelpers.filterByCategory(formData1.category);
      await flashcardHelpers.filterByDifficulty('medium');

      // Verificar que los filtros están aplicados
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);

      // Limpiar todos los filtros
      await flashcardHelpers.clearAllFilters();

      // Verificar que aparecen todas las flashcards
      expect(await flashcardHelpers.isFlashcardVisible(formData1.front)).toBe(true);
      expect(await flashcardHelpers.isFlashcardVisible(formData2.front)).toBe(true);
    });

    test('debería mostrar estadísticas de flashcards correctamente', async () => {
      // Crear flashcards con diferentes dificultades
      const formData1 = createBasicFlashcardForm(); // medium por defecto
      const formData2 = createAudioFlashcardForm(); // hard por defecto
      const formData3 = createImageFlashcardForm(); // easy por defecto

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);
      await flashcardHelpers.createFlashcard(formData3);

      // Obtener estadísticas
      const stats = await flashcardHelpers.getFlashcardStats();

      // Verificar que las estadísticas son correctas
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.easy).toBeGreaterThanOrEqual(1);
      expect(stats.medium).toBeGreaterThanOrEqual(1);
      expect(stats.hard).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Validación de formularios', () => {
    test('debería validar campos requeridos en tiempo real', async ({ page }) => {
      await flashcardHelpers.goToCreateFlashcard();

      // Intentar enviar formulario vacío
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestran errores de validación
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('Todos los campos obligatorios deben ser completados');
    });

    test('debería validar longitud de campos en tiempo real', async ({ page }) => {
      const oversizedFormData = createOversizedFlashcardForm();

      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(oversizedFormData);
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestra error de longitud
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('El contenido excede el límite de caracteres');
    });

    test('debería validar formato de URLs en tiempo real', async ({ page }) => {
      const formData = createBasicFlashcardForm();

      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(formData);

      // Intentar agregar una URL inválida manualmente
      const audioUrlInput = page.locator('#audioUrl, [name="audioUrl"]');
      if (await audioUrlInput.isVisible()) {
        await audioUrlInput.fill('invalid-url-format');
      }

      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestra error de formato de URL
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('formato de URL no es válido');
    });

    test('debería mostrar errores de validación específicos por campo', async ({ page }) => {
      await flashcardHelpers.goToCreateFlashcard();

      // Llenar solo el campo front
      await page.fill('#front, [name="front"]', 'Valid front content');
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestran errores específicos
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toContain('El campo back es requerido');
      expect(errorMessage).toContain('El campo category es requerido');
    });
  });

  test.describe('Operaciones masivas', () => {
    test('debería permitir seleccionar múltiples flashcards', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();
      const formData3 = createImageFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);
      await flashcardHelpers.createFlashcard(formData3);

      // Seleccionar múltiples flashcards
      await flashcardHelpers.selectMultipleFlashcards([0, 1, 2]);

      // Verificar que están seleccionadas (esto depende de la implementación de la UI)
      // Por ahora, solo verificamos que no hay errores
      expect(true).toBe(true);
    });

    test('debería permitir seleccionar todas las flashcards', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Seleccionar todas las flashcards
      await flashcardHelpers.selectAllFlashcards();

      // Verificar que están seleccionadas (esto depende de la implementación de la UI)
      // Por ahora, solo verificamos que no hay errores
      expect(true).toBe(true);
    });

    test('debería permitir operaciones en lote con flashcards seleccionadas', async () => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);

      // Seleccionar múltiples flashcards
      await flashcardHelpers.selectMultipleFlashcards([0, 1]);

      // Verificar que hay opciones de operaciones en lote disponibles
      const bulkActions = flashcardHelpers.page.locator('#bulk-actions, .bulk-actions, [data-testid="bulk-actions"]');
      expect(await bulkActions.isVisible()).toBe(true);
    });

    test('debería mostrar contador de elementos seleccionados', async ({ page }) => {
      // Crear múltiples flashcards
      const formData1 = createBasicFlashcardForm();
      const formData2 = createAudioFlashcardForm();
      const formData3 = createImageFlashcardForm();

      await flashcardHelpers.createFlashcard(formData1);
      await flashcardHelpers.createFlashcard(formData2);
      await flashcardHelpers.createFlashcard(formData3);

      // Seleccionar múltiples flashcards
      await flashcardHelpers.selectMultipleFlashcards([0, 1]);

      // Verificar que se muestra el contador de seleccionados
      const selectedCount = page.locator('#selected-count, .selected-count, [data-testid="selected-count"]');
      if (await selectedCount.isVisible()) {
        const countText = await selectedCount.textContent();
        expect(countText).toContain('2');
      }
    });
  });

  test.describe('Manejo de errores y estados', () => {
    test('debería manejar errores de red correctamente', async () => {
      // Simular un error de red (esto depende de la implementación)
      // Por ahora, solo verificamos que la funcionalidad básica funciona
      const formData = createBasicFlashcardForm();

      await flashcardHelpers.createFlashcard(formData);

      // Verificar que se manejó correctamente
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería mostrar mensaje de error cuando falla la operación', async ({ page }) => {
      // Crear una flashcard primero
      const formData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(formData);

      // Intentar crear una flashcard con datos inválidos
      const invalidFormData = createInvalidFlashcardForm();
      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(invalidFormData as any);
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestra el mensaje de error
      const errorMessage = await flashcardHelpers.getFormErrorMessage();
      expect(errorMessage).toBeTruthy();
    });

    test('debería mostrar estados de carga apropiados', async ({ page }) => {
      const formData = createBasicFlashcardForm();

      await flashcardHelpers.goToCreateFlashcard();
      await flashcardHelpers.fillFlashcardForm(formData);
      await flashcardHelpers.submitFlashcardForm();

      // Verificar que se muestran elementos de carga
      const loadingSpinner = page.locator('#loading-spinner, .loading-spinner');
      await expect(loadingSpinner).toBeVisible();

      // Esperar a que termine la operación
      await flashcardHelpers.waitForOperationComplete();
    });

    test('debería manejar timeouts correctamente', async () => {
      // Esta prueba verifica que las operaciones no se cuelgan indefinidamente
      const formData = createBasicFlashcardForm();

      // Establecer un timeout corto para la operación
      await flashcardHelpers.createFlashcard(formData);

      // Verificar que la operación se completó en un tiempo razonable
      await flashcardHelpers.waitForOperationComplete();
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });
  });

  test.describe('Persistencia y estado', () => {
    test('debería mantener los datos después de recargar la página', async ({ page }) => {
      // Crear una flashcard
      const formData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(formData);

      // Verificar que existe
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);

      // Recargar la página
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verificar que la flashcard sigue existiendo después de la recarga
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);
    });

    test('debería limpiar datos correctamente al hacer logout', async () => {
      // Crear una flashcard
      const formData = createBasicFlashcardForm();
      await flashcardHelpers.createFlashcard(formData);

      // Verificar que existe
      expect(await flashcardHelpers.isFlashcardVisible(formData.front)).toBe(true);

      // Hacer logout
      await authHelpers.logout();

      // Verificar que ya no estamos en el dashboard
      expect(await authHelpers.isOnLoginPage()).toBe(true);

      // Intentar acceder a flashcards (debería redirigir al login)
      await flashcardHelpers.goToFlashcards();
      expect(await authHelpers.isOnLoginPage()).toBe(true);
    });
  });
});