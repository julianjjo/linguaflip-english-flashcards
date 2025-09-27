import { c as createComponent, g as renderComponent, d as renderTemplate, m as maybeRenderHead, r as renderScript } from '../chunks/vendor_Bpx6Nh43.mjs';
export { f as renderers } from '../chunks/vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import { $ as $$MainLayout } from '../chunks/MainLayout_laCPBsuV.mjs';
import { T as ThemeToggle, R as RecallQualityControls, e as AuthenticatedApp } from '../chunks/ui-components_Dymo2gSD.mjs';

const $$Study = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Estudiar - LinguaFlip", "description": "Estudia flashcards de ingl\xE9s con nuestro sistema de repetici\xF3n espaciada inteligente" }, { "default": async ($$result2) => renderTemplate`  <meta property="og:title" content="Estudiar Inglés - LinguaFlip"> <meta property="og:description" content="Aprende inglés con flashcards inteligentes y repetición espaciada"> <meta property="og:type" content="website"> <meta name="twitter:card" content="summary_large_image"> <meta name="twitter:title" content="Estudiar Inglés - LinguaFlip"> <meta name="twitter:description" content="Sistema inteligente de aprendizaje de inglés"> ${maybeRenderHead()}<div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"> <!-- Header --> <header class="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"> <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"> <div class="flex h-16 items-center justify-between"> <div class="flex items-center"> <h1 class="text-xl font-bold text-gray-900 dark:text-white">
LinguaFlip
</h1> </div> <div class="flex items-center space-x-4"> ${renderComponent($$result2, "ThemeToggle", ThemeToggle, { "variant": "icon", "size": "md", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/ThemeToggle.tsx", "client:component-export": "default" })} </div> </div> </div> </header> <!-- Main Content --> <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"> <div class="mb-8 text-center"> <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
Sesión de Estudio
</h1> <p class="text-gray-600 dark:text-gray-300">
Estudia tus flashcards y mejora tu inglés
</p> </div> <!-- Study Area --> <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800"> <div id="study-container"> <!-- Loading State --> <div class="flex items-center justify-center py-16" id="loading-state"> <div class="text-center"> <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400"></div> <p class="text-gray-600 dark:text-gray-300">
Cargando flashcards...
</p> </div> </div> <!-- No Cards State --> <div class="hidden py-16 text-center" id="no-cards-state"> <div class="mx-auto max-w-md"> <div class="mb-4 text-6xl">📚</div> <h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
¡Crea tu primera flashcard!
</h2> <p class="mb-6 text-gray-600 dark:text-gray-300">
No tienes flashcards aún. Crea una para comenzar a estudiar.
</p> <button id="create-first-card-btn" class="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-primary-700">
Crear Mi Primera Flashcard
</button> </div> </div> <!-- Auth Required State --> <div class="hidden py-16 text-center" id="auth-required-state"> <div class="mx-auto max-w-md"> <div class="mb-4 text-6xl">🔐</div> <h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
Inicia Sesión para Estudiar
</h2> <p class="mb-6 text-gray-600 dark:text-gray-300">
Necesitas iniciar sesión para acceder a tus flashcards y
                estudiar.
</p> <button id="login-btn" class="mr-3 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-primary-700">
Iniciar Sesión
</button> <button id="register-btn" class="rounded-lg border border-primary-600 px-6 py-3 font-medium text-primary-600 transition-colors duration-200 hover:bg-primary-50">
Registrarse
</button> </div> </div> <!-- Study Content --> <div class="hidden" id="study-content"> <div class="mb-6 text-center"> <div class="mb-2 text-sm text-gray-600 dark:text-gray-300">
Progreso
</div> <div class="text-lg font-semibold text-primary-600 dark:text-primary-400" id="session-progress">
0 / 0
</div> <div class="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700"> <div class="h-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300" id="progress-bar" style="width: 0%"></div> </div> </div> <!-- Flashcard Display --> <div class="mb-8" id="flashcard-container"> <!-- Flashcard will be inserted here --> </div> <!-- Controls --> <div class="flex flex-col items-center space-y-4"> <!-- Flip Button --> <button id="flip-btn" class="rounded-lg bg-gray-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-gray-700">
Voltear
</button> <!-- Recall Quality Controls --> <div id="recall-controls" style="display: none;"> ${renderComponent($$result2, "RecallQualityControls", RecallQualityControls, { "onRate": "rateCurrentCard", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/RecallQualityControls.tsx", "client:component-export": "default" })} </div> </div> </div> </div> </div> <!-- Navigation --> <div class="mt-8 text-center"> <a href="/dashboard" class="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"> <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path> </svg>
Volver al Dashboard
</a> </div> </main> <!-- Authentication Modal --> ${renderComponent($$result2, "AuthenticatedApp", AuthenticatedApp, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/AuthenticatedApp.tsx", "client:component-export": "default" })} </div> ${renderScript($$result2, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/study.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/study.astro", void 0);

const $$file = "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/study.astro";
const $$url = "/study";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Study,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
