import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import React, { useState } from 'react';
import { u as useAuth, L as LoadingSpinner, A as AuthModal } from './ui-components_Dymo2gSD.mjs';
import { atom, map } from 'nanostores';

const flashcardsStore = atom([]);
const currentCardStore = atom(null);
map({
  currentView: "study",
  previousView: null
});
const flashcardsLoadingStore = atom(false);
const flashcardsErrorStore = atom(null);
let hybridStorageInstance = null;
const getHybridStorage = async () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (!hybridStorageInstance) {
    const { hybridStorage } = await import('./ui-components_Dymo2gSD.mjs').then(n => n.h);
    hybridStorageInstance = hybridStorage;
    hybridStorage.getSyncStatusStore();
  }
  return hybridStorageInstance;
};
let currentUserId = null;
const setCurrentUser = (userId) => {
  currentUserId = userId;
};
const flashcardsActions = {
  // Cargar flashcards desde el almacenamiento híbrido y API
  async loadFlashcards(userId) {
    const user = userId || currentUserId;
    if (!user) {
      console.warn("No user ID provided for loading flashcards");
      return;
    }
    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);
      try {
        const response = await fetch("/api/flashcards/list", {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.flashcards) {
            flashcardsStore.set(data.data.flashcards);
            return;
          }
        }
      } catch (apiError) {
        console.warn(
          "API load failed, falling back to hybrid storage:",
          apiError
        );
      }
      const hybridStorage = await getHybridStorage();
      if (!hybridStorage) {
        console.warn("Hybrid storage not available (server-side)");
        return;
      }
      const flashcards = await hybridStorage.getFlashcards(user);
      flashcardsStore.set(flashcards);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load flashcards";
      flashcardsErrorStore.set(errorMessage);
      console.error("Failed to load flashcards:", error);
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },
  // Guardar flashcard con sincronización MongoDB y API
  async saveFlashcard(flashcard, userId) {
    const user = userId || currentUserId;
    if (!user) {
      console.warn("No user ID provided for saving flashcard");
      flashcardsStore.set([...flashcardsStore.get(), flashcard]);
      return;
    }
    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);
      let apiSuccess = false;
      try {
        const endpoint = flashcard.id ? `/api/flashcards/${flashcard.id}` : "/api/flashcards/create";
        const method = flashcard.id ? "PUT" : "POST";
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            english: flashcard.english,
            spanish: flashcard.spanish,
            exampleEnglish: flashcard.exampleEnglish,
            exampleSpanish: flashcard.exampleSpanish,
            image: flashcard.image,
            category: flashcard.category || "general",
            tags: flashcard.tags || []
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.flashcard) {
            flashcard = data.data.flashcard;
            apiSuccess = true;
          }
        }
      } catch (apiError) {
        console.warn(
          "API save failed, falling back to hybrid storage:",
          apiError
        );
      }
      if (!apiSuccess) {
        const hybridStorage = await getHybridStorage();
        if (hybridStorage) {
          await hybridStorage.saveFlashcard(user, flashcard);
        }
      }
      const current = flashcardsStore.get();
      const existingIndex = current.findIndex(
        (card) => card.id === flashcard.id
      );
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = flashcard;
        flashcardsStore.set(updated);
      } else {
        flashcardsStore.set([...current, flashcard]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save flashcard";
      flashcardsErrorStore.set(errorMessage);
      console.error("Failed to save flashcard:", error);
      const current = flashcardsStore.get();
      const existingIndex = current.findIndex(
        (card) => card.id === flashcard.id
      );
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = flashcard;
        flashcardsStore.set(updated);
      } else {
        flashcardsStore.set([...current, flashcard]);
      }
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },
  // Eliminar flashcard con sincronización MongoDB y API
  async deleteFlashcard(id, userId) {
    const user = userId || currentUserId;
    if (!user) {
      console.warn("No user ID provided for deleting flashcard");
      const current = flashcardsStore.get();
      const filtered = current.filter((card) => card.id !== id);
      flashcardsStore.set(filtered);
      return;
    }
    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);
      let apiSuccess = false;
      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            apiSuccess = true;
          }
        }
      } catch (apiError) {
        console.warn(
          "API delete failed, falling back to hybrid storage:",
          apiError
        );
      }
      if (!apiSuccess) {
        const hybridStorage = await getHybridStorage();
        if (hybridStorage) {
          await hybridStorage.deleteFlashcard(user, id);
        }
      }
      const current = flashcardsStore.get();
      const filtered = current.filter((card) => card.id !== id);
      flashcardsStore.set(filtered);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete flashcard";
      flashcardsErrorStore.set(errorMessage);
      console.error("Failed to delete flashcard:", error);
      const current = flashcardsStore.get();
      const filtered = current.filter((card) => card.id !== id);
      flashcardsStore.set(filtered);
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },
  // Métodos de compatibilidad hacia atrás
  setFlashcards: (flashcards) => {
    flashcardsStore.set(flashcards);
  },
  addFlashcard: (flashcard) => {
    flashcardsStore.set([...flashcardsStore.get(), flashcard]);
  },
  updateFlashcard: (id, updates) => {
    const current = flashcardsStore.get();
    const updated = current.map(
      (card) => card.id === id ? { ...card, ...updates } : card
    );
    flashcardsStore.set(updated);
  },
  deleteFlashcardLocal: (id) => {
    const current = flashcardsStore.get();
    const filtered = current.filter((card) => card.id !== id);
    flashcardsStore.set(filtered);
  },
  setCurrentCard: (card) => {
    currentCardStore.set(card);
  },
  // Forzar sincronización
  async forceSync(userId) {
    const user = userId || currentUserId;
    if (!user) return;
    try {
      const hybridStorage = await getHybridStorage();
      if (hybridStorage) {
        await hybridStorage.forceSync(user);
      }
    } catch (error) {
      console.error("Failed to force sync:", error);
    }
  },
  // Procesar respuesta de calidad (SM-2)
  async processQualityResponse(cardId, quality, responseTime = 0, userId) {
    const user = userId || currentUserId;
    if (!user) {
      console.warn("No user ID provided for processing quality response");
      return;
    }
    try {
      flashcardsLoadingStore.set(true);
      flashcardsErrorStore.set(null);
      let apiSuccess = false;
      try {
        const response = await fetch(`/api/flashcards/${cardId}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            quality,
            responseTime
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.flashcard) {
            const current = flashcardsStore.get();
            const updatedCards = current.map(
              (card) => card.id === cardId ? data.data.flashcard : card
            );
            flashcardsStore.set(updatedCards);
            apiSuccess = true;
          }
        }
      } catch (apiError) {
        console.warn("API quality response failed:", apiError);
      }
      if (!apiSuccess) {
        const current = flashcardsStore.get();
        const updatedCards = current.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              lastReviewed: (/* @__PURE__ */ new Date()).toISOString(),
              reviewCount: (card.reviewCount || 0) + 1
            };
          }
          return card;
        });
        flashcardsStore.set(updatedCards);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process quality response";
      flashcardsErrorStore.set(errorMessage);
      console.error("Failed to process quality response:", error);
    } finally {
      flashcardsLoadingStore.set(false);
    }
  },
  // Limpiar errores
  clearError: () => {
    flashcardsErrorStore.set(null);
  }
};

const CreateFlashcardModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    english: "Hello",
    spanish: "Hola",
    exampleEnglish: "Hello, how are you today?",
    exampleSpanish: "Hola, ¿cómo estás hoy?",
    category: "general",
    image: "",
    tags: "básico, saludo, común"
  });
  const resetForm = () => {
    setFormData({
      english: "Hello",
      spanish: "Hola",
      exampleEnglish: "Hello, how are you today?",
      exampleSpanish: "Hola, ¿cómo estás hoy?",
      category: "general",
      image: "",
      tags: "básico, saludo, común"
    });
    setError(null);
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user?.userId) {
      setError("Debes iniciar sesión para crear flashcards");
      return;
    }
    if (!formData.english.trim() || !formData.spanish.trim()) {
      setError("El texto en inglés y español son obligatorios");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/flashcards/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          english: formData.english.trim(),
          spanish: formData.spanish.trim(),
          exampleEnglish: formData.exampleEnglish.trim() || void 0,
          exampleSpanish: formData.exampleSpanish.trim() || void 0,
          category: formData.category,
          image: formData.image.trim() || null,
          tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al crear la flashcard");
      }
      const newFlashcard = {
        id: parseInt(data.data.cardId),
        // Convert string ID to number for FlashcardData compatibility
        english: formData.english.trim(),
        spanish: formData.spanish.trim(),
        exampleEnglish: formData.exampleEnglish.trim(),
        exampleSpanish: formData.exampleSpanish.trim(),
        image: formData.image.trim() || void 0,
        category: formData.category,
        difficulty: 1,
        dueDate: (/* @__PURE__ */ new Date()).toISOString(),
        interval: 1,
        easinessFactor: 2.5,
        repetitions: 0,
        lastReviewed: null,
        reviewCount: 0
      };
      await flashcardsActions.saveFlashcard(newFlashcard, user.userId);
      onSuccess?.(newFlashcard);
      window.dispatchEvent(
        new CustomEvent("flashcard-created", {
          detail: { flashcard: newFlashcard }
        })
      );
      resetForm();
      onClose();
    } catch (error2) {
      console.error("Failed to create flashcard:", error2);
      setError(
        error2 instanceof Error ? error2.message : "Error al crear la flashcard"
      );
    } finally {
      setIsLoading(false);
    }
  };
  const generateWithAI = async () => {
    if (!formData.english.trim()) {
      setError("Escribe una palabra en inglés para generar ejemplos con IA");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const word = formData.english.trim();
      const exampleEnglish = `I love ${word} very much.`;
      const exampleSpanish = formData.spanish.trim() ? `Me encanta ${formData.spanish.trim()} mucho.` : `Me encanta esta palabra mucho.`;
      setFormData((prev) => ({
        ...prev,
        exampleEnglish,
        exampleSpanish
      }));
    } catch (error2) {
      console.error("AI generation failed:", error2);
      setError("Error al generar ejemplos con IA");
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: /* @__PURE__ */ jsxs("div", { className: "max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800", children: [
    /* @__PURE__ */ jsxs("div", { className: "border-b border-gray-200 p-6 dark:border-gray-700", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Crear Nueva Flashcard" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onClose,
            className: "text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200",
            "aria-label": "Cerrar modal",
            children: /* @__PURE__ */ jsx(
              "svg",
              {
                className: "h-6 w-6",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M6 18L18 6M6 6l12 12"
                  }
                )
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-300", children: "Crea una nueva tarjeta de vocabulario para tu colección" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6 p-6", children: [
      error && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/50", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-800 dark:text-red-200", children: error }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-6 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "flashcard-english",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Palabra en Inglés *"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              name: "english",
              id: "flashcard-english",
              value: formData.english,
              onChange: handleInputChange,
              required: true,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "Hello"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "flashcard-spanish",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Traducción en Español *"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              name: "spanish",
              id: "flashcard-spanish",
              value: formData.spanish,
              onChange: handleInputChange,
              required: true,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "Hola"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "border-t border-gray-200 pt-6 dark:border-gray-700", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white", children: "Ejemplos de Uso" }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: generateWithAI,
              disabled: isLoading || !formData.english.trim(),
              className: "flex items-center rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-2 text-sm text-white transition-all duration-200 hover:from-purple-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500",
              children: [
                /* @__PURE__ */ jsx(
                  "svg",
                  {
                    className: "mr-2 h-4 w-4",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                    children: /* @__PURE__ */ jsx(
                      "path",
                      {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M13 10V3L4 14h7v7l9-11h-7z"
                      }
                    )
                  }
                ),
                isLoading ? "Generando..." : "Generar con IA"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "label",
              {
                htmlFor: "flashcard-example-english",
                className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
                children: "Ejemplo en Inglés"
              }
            ),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                name: "exampleEnglish",
                id: "flashcard-example-english",
                value: formData.exampleEnglish,
                onChange: handleInputChange,
                rows: 2,
                className: "w-full resize-none rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
                placeholder: "Hello, how are you today?"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "label",
              {
                htmlFor: "flashcard-example-spanish",
                className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
                children: "Ejemplo en Español"
              }
            ),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                name: "exampleSpanish",
                id: "flashcard-example-spanish",
                value: formData.exampleSpanish,
                onChange: handleInputChange,
                rows: 2,
                className: "w-full resize-none rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
                placeholder: "Hola, ¿cómo estás hoy?"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-6 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "flashcard-category",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Categoría"
            }
          ),
          /* @__PURE__ */ jsxs(
            "select",
            {
              name: "category",
              id: "flashcard-category",
              value: formData.category,
              onChange: handleInputChange,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              children: [
                /* @__PURE__ */ jsx("option", { value: "general", children: "General" }),
                /* @__PURE__ */ jsx("option", { value: "family", children: "Familia" }),
                /* @__PURE__ */ jsx("option", { value: "work", children: "Trabajo" }),
                /* @__PURE__ */ jsx("option", { value: "travel", children: "Viajes" }),
                /* @__PURE__ */ jsx("option", { value: "food", children: "Comida" }),
                /* @__PURE__ */ jsx("option", { value: "emotions", children: "Emociones" }),
                /* @__PURE__ */ jsx("option", { value: "nature", children: "Naturaleza" }),
                /* @__PURE__ */ jsx("option", { value: "technology", children: "Tecnología" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "label",
            {
              htmlFor: "flashcard-tags",
              className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
              children: "Etiquetas (separadas por comas)"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              name: "tags",
              id: "flashcard-tags",
              value: formData.tags,
              onChange: handleInputChange,
              className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
              placeholder: "básico, saludo, común"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(
          "label",
          {
            htmlFor: "flashcard-image",
            className: "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300",
            children: "URL de Imagen (opcional)"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "url",
            name: "image",
            id: "flashcard-image",
            value: formData.image,
            onChange: handleInputChange,
            className: "w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
            placeholder: "https://ejemplo.com/imagen.jpg"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 sm:flex-row", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "flex-1 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: isLoading || !formData.english.trim() || !formData.spanish.trim(),
            className: "flex flex-1 items-center justify-center rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-primary-400",
            children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(LoadingSpinner, { size: "sm", color: "white", className: "mr-2" }),
              "Creando..."
            ] }) : "Crear Flashcard"
          }
        )
      ] })
    ] })
  ] }) });
};

const CreateFlashcardButton = ({
  className = "",
  variant = "fab",
  onFlashcardCreated
}) => {
  const { isAuthenticated } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  React.useEffect(() => {
    const handleOpenCreateModal = () => {
      if (isAuthenticated) {
        setIsCreateModalOpen(true);
      } else {
        setIsAuthModalOpen(true);
      }
    };
    window.addEventListener("open-create-modal", handleOpenCreateModal);
    return () => {
      window.removeEventListener("open-create-modal", handleOpenCreateModal);
    };
  }, [isAuthenticated]);
  const handleClick = () => {
    if (isAuthenticated) {
      setIsCreateModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsCreateModalOpen(true);
  };
  const handleFlashcardCreated = (flashcard) => {
    setIsCreateModalOpen(false);
    onFlashcardCreated?.(flashcard);
  };
  if (variant === "fab") {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: handleClick,
          className: `group fixed bottom-6 right-6 z-40 flex h-14 w-14 transform items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary-700 hover:shadow-xl active:scale-95 ${className} `,
          "aria-label": "Crear nueva flashcard",
          children: [
            /* @__PURE__ */ jsx(
              "svg",
              {
                className: "h-6 w-6 transition-transform group-hover:rotate-90",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx(
                  "path",
                  {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M12 4v16m8-8H4"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100", children: [
              isAuthenticated ? "Crear flashcard" : "Inicia sesión para crear flashcards",
              /* @__PURE__ */ jsx("div", { className: "absolute left-full top-1/2 h-0 w-0 -translate-y-1/2 transform border-b-4 border-l-4 border-t-4 border-b-transparent border-l-gray-900 border-t-transparent" })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        CreateFlashcardModal,
        {
          isOpen: isCreateModalOpen,
          onClose: () => setIsCreateModalOpen(false),
          onSuccess: handleFlashcardCreated
        }
      ),
      /* @__PURE__ */ jsx(
        AuthModal,
        {
          isOpen: isAuthModalOpen,
          onClose: () => setIsAuthModalOpen(false),
          initialMode: "register",
          onSuccess: handleAuthSuccess
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: handleClick,
        className: `inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-primary-700 ${className} `,
        children: [
          /* @__PURE__ */ jsx(
            "svg",
            {
              className: "mr-2 h-5 w-5",
              fill: "none",
              stroke: "currentColor",
              viewBox: "0 0 24 24",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: 2,
                  d: "M12 4v16m8-8H4"
                }
              )
            }
          ),
          isAuthenticated ? "Crear Flashcard" : "Crear Flashcard"
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      CreateFlashcardModal,
      {
        isOpen: isCreateModalOpen,
        onClose: () => setIsCreateModalOpen(false),
        onSuccess: handleFlashcardCreated
      }
    ),
    /* @__PURE__ */ jsx(
      AuthModal,
      {
        isOpen: isAuthModalOpen,
        onClose: () => setIsAuthModalOpen(false),
        initialMode: "register",
        onSuccess: handleAuthSuccess
      }
    )
  ] });
};

export { CreateFlashcardButton as C, flashcardsActions as a, flashcardsStore as f, setCurrentUser as s };
