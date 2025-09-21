import type { Page } from '@playwright/test';
import type { TestFlashcard, FlashcardFormData } from '../fixtures/flashcards';

/**
 * Utilidades para pruebas de gestión de flashcards
 * Proporciona métodos para interactuar con formularios, listas y operaciones de flashcards
 */

export class FlashcardHelpers {
  constructor(public page: Page) {}

  /**
   * Navega a la página de flashcards
   */
  async goToFlashcards(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');

    // Hacer clic en el botón de flashcards si existe
    const flashcardsButton = this.page.locator('[data-testid="flashcards-button"]');
    if (await flashcardsButton.isVisible()) {
      await flashcardsButton.click();
    }

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navega a la página de creación de flashcards
   */
  async goToCreateFlashcard(): Promise<void> {
    await this.goToFlashcards();

    // Buscar y hacer clic en el botón de crear flashcard
    const createButton = this.page.locator('[data-testid="create-flashcard-button"], text=Create Flashcard, text=Crear Flashcard');
    await createButton.click();

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Llena el formulario de creación/edición de flashcard
   */
  async fillFlashcardForm(formData: FlashcardFormData): Promise<void> {
    // Llenar campos principales
    await this.page.fill('#front, [name="front"], [placeholder*="front" i]', formData.front);
    await this.page.fill('#back, [name="back"], [placeholder*="back" i]', formData.back);

    // Llenar campos opcionales si están presentes
    if (formData.exampleFront) {
      await this.page.fill('#exampleFront, [name="exampleFront"], [placeholder*="example" i]', formData.exampleFront);
    }

    if (formData.exampleBack) {
      await this.page.fill('#exampleBack, [name="exampleBack"], [placeholder*="example" i]', formData.exampleBack);
    }

    // Seleccionar categoría
    if (formData.category) {
      const categorySelect = this.page.locator('#category, [name="category"]');
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption({ label: formData.category });
      } else {
        await this.page.fill('#category, [name="category"]', formData.category);
      }
    }

    // Llenar tags si están presentes
    if (formData.tags) {
      const tagsInput = this.page.locator('#tags, [name="tags"], [placeholder*="tags" i]');
      if (await tagsInput.isVisible()) {
        await tagsInput.fill(formData.tags);
      }
    }

    // Seleccionar dificultad si está presente
    if (formData.difficulty) {
      const difficultySelect = this.page.locator('#difficulty, [name="difficulty"]');
      if (await difficultySelect.isVisible()) {
        await difficultySelect.selectOption(formData.difficulty);
      }
    }
  }

  /**
   * Envía el formulario de flashcard
   */
  async submitFlashcardForm(): Promise<void> {
    const submitButton = this.page.locator('#submit-flashcard, #create-flashcard, #update-flashcard, button[type="submit"]');
    await submitButton.click();
  }

  /**
   * Crea una flashcard completa desde el formulario
   */
  async createFlashcard(formData: FlashcardFormData): Promise<void> {
    await this.goToCreateFlashcard();
    await this.fillFlashcardForm(formData);
    await this.submitFlashcardForm();
  }

  /**
   * Busca una flashcard por texto
   */
  async searchFlashcard(searchText: string): Promise<void> {
    const searchInput = this.page.locator('#search, [name="search"], [placeholder*="search" i], [placeholder*="buscar" i]');
    await searchInput.fill(searchText);
    await searchInput.press('Enter');

    // Esperar a que se actualice la lista
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filtra flashcards por categoría
   */
  async filterByCategory(category: string): Promise<void> {
    const categoryFilter = this.page.locator('#category-filter, [name="category-filter"]');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption({ label: category });
    }

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filtra flashcards por dificultad
   */
  async filterByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
    const difficultyFilter = this.page.locator('#difficulty-filter, [name="difficulty-filter"]');
    if (await difficultyFilter.isVisible()) {
      await difficultyFilter.selectOption(difficulty);
    }

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Obtiene la lista de flashcards visibles
   */
  async getFlashcardList(): Promise<string[]> {
    const flashcards = this.page.locator('[data-testid="flashcard-item"], .flashcard-item, .card-item');
    const count = await flashcards.count();

    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await flashcards.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Obtiene el número total de flashcards
   */
  async getFlashcardCount(): Promise<number> {
    const flashcards = this.page.locator('[data-testid="flashcard-item"], .flashcard-item, .card-item');
    return await flashcards.count();
  }

  /**
   * Selecciona una flashcard específica por índice
   */
  async selectFlashcardByIndex(index: number): Promise<void> {
    const flashcards = this.page.locator('[data-testid="flashcard-item"], .flashcard-item, .card-item');
    await flashcards.nth(index).click();
  }

  /**
   * Selecciona una flashcard por texto del frente
   */
  async selectFlashcardByFrontText(frontText: string): Promise<void> {
    const flashcard = this.page.locator(`text=${frontText}`).first();
    await flashcard.click();
  }

  /**
   * Selecciona múltiples flashcards para operaciones en lote
   */
  async selectMultipleFlashcards(indices: number[]): Promise<void> {
    for (const index of indices) {
      const flashcards = this.page.locator('[data-testid="flashcard-item"], .flashcard-item, .card-item');
      const checkbox = flashcards.nth(index).locator('input[type="checkbox"], .checkbox, [data-testid="select-checkbox"]');
      await checkbox.check();
    }
  }

  /**
   * Selecciona todas las flashcards visibles
   */
  async selectAllFlashcards(): Promise<void> {
    const selectAllCheckbox = this.page.locator('#select-all, [data-testid="select-all"], input[name="selectAll"]');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
    }
  }

  /**
   * Edita una flashcard existente
   */
  async editFlashcard(frontText: string, newData: Partial<FlashcardFormData>): Promise<void> {
    // Buscar y seleccionar la flashcard
    await this.searchFlashcard(frontText);
    await this.selectFlashcardByFrontText(frontText);

    // Hacer clic en el botón de editar
    const editButton = this.page.locator('[data-testid="edit-button"], text=Edit, text=Editar');
    await editButton.click();

    // Llenar los nuevos datos
    await this.fillFlashcardForm(newData as FlashcardFormData);

    // Guardar cambios
    await this.submitFlashcardForm();
  }

  /**
   * Elimina una flashcard individual
   */
  async deleteFlashcard(frontText: string): Promise<void> {
    // Buscar y seleccionar la flashcard
    await this.searchFlashcard(frontText);
    await this.selectFlashcardByFrontText(frontText);

    // Hacer clic en el botón de eliminar
    const deleteButton = this.page.locator('[data-testid="delete-button"], text=Delete, text=Eliminar');
    await deleteButton.click();

    // Confirmar eliminación en el modal
    const confirmButton = this.page.locator('#confirm-delete, .confirm-delete, text=Confirm, text=Confirmar');
    await confirmButton.click();
  }

  /**
   * Elimina múltiples flashcards
   */
  async deleteMultipleFlashcards(indices: number[]): Promise<void> {
    // Seleccionar las flashcards
    await this.selectMultipleFlashcards(indices);

    // Hacer clic en el botón de eliminar en lote
    const bulkDeleteButton = this.page.locator('#bulk-delete, [data-testid="bulk-delete"], text=Delete Selected');
    await bulkDeleteButton.click();

    // Confirmar eliminación en el modal
    const confirmButton = this.page.locator('#confirm-delete, .confirm-delete, text=Confirm, text=Confirmar');
    await confirmButton.click();
  }

  /**
   * Obtiene los detalles de una flashcard específica
   */
  async getFlashcardDetails(frontText: string): Promise<TestFlashcard | null> {
    await this.searchFlashcard(frontText);
    await this.selectFlashcardByFrontText(frontText);

    const details: Partial<TestFlashcard> = {};

    // Extraer información visible
    const frontElement = this.page.locator('#flashcard-front, .flashcard-front, [data-testid="front-content"]');
    if (await frontElement.isVisible()) {
      details.front = await frontElement.textContent() || '';
    }

    const backElement = this.page.locator('#flashcard-back, .flashcard-back, [data-testid="back-content"]');
    if (await backElement.isVisible()) {
      details.back = await backElement.textContent() || '';
    }

    const categoryElement = this.page.locator('#flashcard-category, .flashcard-category, [data-testid="category"]');
    if (await categoryElement.isVisible()) {
      details.category = await categoryElement.textContent() || '';
    }

    return details as TestFlashcard;
  }

  /**
   * Verifica si una flashcard existe en la lista
   */
  async isFlashcardVisible(frontText: string): Promise<boolean> {
    const flashcard = this.page.locator(`text=${frontText}`);
    return await flashcard.isVisible();
  }

  /**
   * Obtiene el mensaje de error del formulario
   */
  async getFormErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator('#form-error, .form-error, .error-message');
    return await errorElement.textContent();
  }

  /**
   * Obtiene el mensaje de éxito del formulario
   */
  async getFormSuccessMessage(): Promise<string | null> {
    const successElement = this.page.locator('#form-success, .form-success, .success-message');
    return await successElement.textContent();
  }

  /**
   * Espera a que el formulario de flashcard esté visible
   */
  async waitForFlashcardForm(): Promise<void> {
    await this.page.waitForSelector('#front, [name="front"], [placeholder*="front" i]');
  }

  /**
   * Espera a que la lista de flashcards se cargue
   */
  async waitForFlashcardList(): Promise<void> {
    await this.page.waitForSelector('[data-testid="flashcard-item"], .flashcard-item, .card-item');
  }

  /**
   * Espera a que aparezca el modal de confirmación
   */
  async waitForConfirmationModal(): Promise<void> {
    await this.page.waitForSelector('#confirm-delete, .confirm-delete, .modal');
  }

  /**
   * Navega a la siguiente página de resultados
   */
  async goToNextPage(): Promise<void> {
    const nextButton = this.page.locator('#next-page, [data-testid="next-page"], text=Next, text=Siguiente');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Navega a la página anterior de resultados
   */
  async goToPreviousPage(): Promise<void> {
    const prevButton = this.page.locator('#prev-page, [data-testid="prev-page"], text=Previous, text=Anterior');
    if (await prevButton.isVisible()) {
      await prevButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Obtiene el número de página actual
   */
  async getCurrentPageNumber(): Promise<number> {
    const pageInfo = this.page.locator('#page-info, .page-info, [data-testid="page-info"]');
    const text = await pageInfo.textContent();
    if (text) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    }
    return 1;
  }

  /**
   * Verifica si hay una página siguiente disponible
   */
  async hasNextPage(): Promise<boolean> {
    const nextButton = this.page.locator('#next-page, [data-testid="next-page"]');
    return await nextButton.isVisible() && !await nextButton.isDisabled();
  }

  /**
   * Verifica si hay una página anterior disponible
   */
  async hasPreviousPage(): Promise<boolean> {
    const prevButton = this.page.locator('#prev-page, [data-testid="prev-page"]');
    return await prevButton.isVisible() && !await prevButton.isDisabled();
  }

  /**
   * Limpia la búsqueda actual
   */
  async clearSearch(): Promise<void> {
    const clearButton = this.page.locator('#clear-search, [data-testid="clear-search"], .clear-search');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    } else {
      // Alternativa: limpiar el campo de búsqueda
      const searchInput = this.page.locator('#search, [name="search"]');
      await searchInput.clear();
    }

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Limpia todos los filtros aplicados
   */
  async clearAllFilters(): Promise<void> {
    const clearFiltersButton = this.page.locator('#clear-filters, [data-testid="clear-filters"], text=Clear Filters');
    if (await clearFiltersButton.isVisible()) {
      await clearFiltersButton.click();
    } else {
      // Limpiar filtros individuales
      const categoryFilter = this.page.locator('#category-filter, [name="category-filter"]');
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption('');
      }

      const difficultyFilter = this.page.locator('#difficulty-filter, [name="difficulty-filter"]');
      if (await difficultyFilter.isVisible()) {
        await difficultyFilter.selectOption('');
      }
    }

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Obtiene estadísticas de flashcards desde la UI
   */
  async getFlashcardStats(): Promise<{
    total: number;
    easy: number;
    medium: number;
    hard: number;
  }> {
    const totalElement = this.page.locator('#total-cards, [data-testid="total-cards"], .stat-total');
    const easyElement = this.page.locator('#easy-cards, [data-testid="easy-cards"], .stat-easy');
    const mediumElement = this.page.locator('#medium-cards, [data-testid="medium-cards"], .stat-medium');
    const hardElement = this.page.locator('#hard-cards, [data-testid="hard-cards"], .stat-hard');

    return {
      total: parseInt(await totalElement.textContent() || '0', 10),
      easy: parseInt(await easyElement.textContent() || '0', 10),
      medium: parseInt(await mediumElement.textContent() || '0', 10),
      hard: parseInt(await hardElement.textContent() || '0', 10),
    };
  }

  /**
   * Espera a que se complete la operación de creación/edición
   */
  async waitForOperationComplete(): Promise<void> {
    // Esperar a que desaparezca el spinner de carga
    await this.page.waitForSelector('#loading-spinner, .loading-spinner', { state: 'hidden', timeout: 10000 });

    // Esperar a que aparezca un mensaje de éxito o a que se redirija
    await Promise.race([
      this.page.waitForSelector('#form-success, .form-success, .success-message'),
      this.page.waitForURL('**/dashboard**'),
      this.page.waitForLoadState('networkidle')
    ]);
  }

  /**
   * Maneja errores de red durante operaciones
   */
  async handleNetworkError(): Promise<string | null> {
    const errorElement = this.page.locator('#network-error, .network-error, .error-message');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Toma una captura de pantalla de la página actual
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }
}