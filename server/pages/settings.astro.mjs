import { c as createComponent, g as renderComponent, d as renderTemplate, r as renderScript, m as maybeRenderHead } from '../chunks/vendor_Bpx6Nh43.mjs';
export { f as renderers } from '../chunks/vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import { $ as $$MainLayout } from '../chunks/MainLayout_laCPBsuV.mjs';
import { c as currentProfileStore, d as profileActions, T as ThemeToggle } from '../chunks/ui-components_Dymo2gSD.mjs';
/* empty css                                    */

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Settings = createComponent(($$result, $$props, $$slots) => {
  const defaultProfile = {
    id: "default",
    name: "Perfil Predeterminado",
    description: "Configuraci\xF3n de estudio b\xE1sica",
    studyMode: {
      mode: "mixed"
    },
    difficultyFilter: {
      enabled: true,
      levels: ["easy", "medium", "hard"],
      focusRecentCards: false,
      recentDaysThreshold: 7,
      prioritizeDueCards: true,
      excludeMasteredCards: false
    },
    isDefault: true,
    sessionControls: {
      maxCardsPerSession: 20,
      breakInterval: 10,
      breakDuration: 5,
      autoAdvance: true,
      showProgress: true
    },
    audioSettings: {
      enabled: true,
      speed: "normal",
      voice: "female",
      autoPlay: true
    },
    visualSettings: {
      cardSize: "medium",
      fontSize: "medium",
      theme: "light",
      animations: true
    },
    notificationSettings: {
      sessionReminders: true,
      breakReminders: true,
      achievementNotifications: true,
      dailyGoalReminders: true
    },
    studyGoals: {
      dailyCards: 20,
      dailyTime: 30,
      weeklyCards: 100,
      weeklyTime: 180,
      monthlyCards: 400,
      monthlyTime: 720
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!currentProfileStore.get()) {
    profileActions.setCurrentProfile(defaultProfile);
  }
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Configuraci\xF3n - LinguaFlip", "description": "Personaliza tu experiencia de aprendizaje de ingl\xE9s con configuraciones avanzadas de estudio, audio, visuales y notificaciones", "data-astro-cid-swhfej32": true }, { "default": ($$result2) => renderTemplate(_a || (_a = __template(['  <meta property="og:title" content="Configuraci\xF3n de LinguaFlip"> <meta property="og:description" content="Personaliza tu experiencia de aprendizaje con configuraciones avanzadas"> <meta property="og:type" content="website"> <meta name="twitter:card" content="summary_large_image"> <meta name="twitter:title" content="Configuraci\xF3n - LinguaFlip"> <meta name="twitter:description" content="Ajustes y preferencias de estudio">  <script type="application/ld+json">\n    {\n      "@context": "https://schema.org",\n      "@type": "WebApplication",\n      "name": "LinguaFlip Settings",\n      "description": "Panel de configuraci\xF3n para personalizar la experiencia de aprendizaje",\n      "applicationCategory": "EducationalApplication",\n      "operatingSystem": "Web Browser",\n      "featureList": [\n        "Configuraci\xF3n de sesiones de estudio",\n        "Preferencias de audio",\n        "Ajustes visuales",\n        "Notificaciones",\n        "Metas de estudio"\n      ]\n    }\n  <\/script> ', "  ", "  "])), renderComponent($$result2, "AppProvider", null, { "client:only": "react", "client:component-hydration": "only", "data-astro-cid-swhfej32": true, "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/AppProvider.tsx", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50" data-astro-cid-swhfej32> <div class="flex" data-astro-cid-swhfej32> <!-- Main Content --> <main class="flex-1 p-6 lg:pl-72" data-astro-cid-swhfej32> <div class="mx-auto max-w-4xl" data-astro-cid-swhfej32> <!-- Page Header --> <div class="mb-8" data-astro-cid-swhfej32> <div class="mb-4 flex items-center justify-between" data-astro-cid-swhfej32> <div data-astro-cid-swhfej32> <h1 class="mb-2 text-3xl font-bold text-neutral-900" data-astro-cid-swhfej32>
Configuración
</h1> <p class="text-neutral-600" data-astro-cid-swhfej32>
Personaliza tu experiencia de aprendizaje
</p> </div> <div class="flex items-center gap-3" data-astro-cid-swhfej32> <!-- Theme Toggle --> ${renderComponent($$result3, "ThemeToggle", ThemeToggle, { "variant": "icon", "size": "md", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/ThemeToggle.tsx", "client:component-export": "default", "data-astro-cid-swhfej32": true })} <button class="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-200" id="reset-settings" data-astro-cid-swhfej32>
Restablecer
</button> <button class="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-primary-700" id="save-settings" data-astro-cid-swhfej32>
Guardar Cambios
</button> </div> </div> </div> <!-- Settings Content --> <div class="mb-8 rounded-2xl bg-white p-8 shadow-xl" data-astro-cid-swhfej32> <!-- Settings Header --> <div class="mb-8" data-astro-cid-swhfej32> <div class="mb-6 flex items-center gap-4" data-astro-cid-swhfej32> <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100" data-astro-cid-swhfej32> <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" data-astro-cid-swhfej32></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" data-astro-cid-swhfej32></path> </svg> </div> <div data-astro-cid-swhfej32> <h2 class="text-2xl font-bold text-neutral-900" data-astro-cid-swhfej32>
Preferencias de Estudio
</h2> <p class="text-neutral-600" data-astro-cid-swhfej32>
Configura cómo quieres aprender
</p> </div> </div> </div> <!-- Settings Form Container --> <div id="settings-container" data-astro-cid-swhfej32> <!-- StudySettings component will be rendered here --> </div> </div> <!-- Profile Management --> <div class="mb-8 rounded-2xl bg-white p-8 shadow-xl" data-astro-cid-swhfej32> <h3 class="mb-6 text-xl font-bold text-neutral-900" data-astro-cid-swhfej32>
Perfiles de Estudio
</h3> <div class="grid grid-cols-1 gap-6 md:grid-cols-2" data-astro-cid-swhfej32> <!-- Current Profile --> <div class="rounded-xl border-2 border-primary-200 bg-primary-50 p-6" data-astro-cid-swhfej32> <div class="mb-4 flex items-center gap-3" data-astro-cid-swhfej32> <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100" data-astro-cid-swhfej32> <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" data-astro-cid-swhfej32></path> </svg> </div> <div data-astro-cid-swhfej32> <h4 class="font-semibold text-neutral-900" data-astro-cid-swhfej32>
Perfil Actual
</h4> <p class="text-sm text-neutral-600" id="current-profile-name" data-astro-cid-swhfej32>
Perfil Predeterminado
</p> </div> </div> <div class="space-y-2 text-sm text-neutral-600" data-astro-cid-swhfej32> <p data-astro-cid-swhfej32>
📚 <span id="profile-daily-cards" data-astro-cid-swhfej32>20</span> tarjetas diarias
</p> <p data-astro-cid-swhfej32>
⏰ <span id="profile-daily-time" data-astro-cid-swhfej32>30</span> minutos diarios
</p> <p data-astro-cid-swhfej32>🎵 Audio: <span id="profile-audio" data-astro-cid-swhfej32>Activado</span></p> </div> </div> <!-- Profile Actions --> <div class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-6" data-astro-cid-swhfej32> <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100" data-astro-cid-swhfej32> <svg class="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" data-astro-cid-swhfej32></path> </svg> </div> <h4 class="mb-2 font-semibold text-neutral-900" data-astro-cid-swhfej32>
Crear Nuevo Perfil
</h4> <p class="mb-4 text-center text-sm text-neutral-600" data-astro-cid-swhfej32>
Crea un perfil personalizado para diferentes estilos de
                    aprendizaje
</p> <button class="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-200" data-astro-cid-swhfej32>
Crear Perfil
</button> </div> </div> </div> <!-- Advanced Settings --> <div class="mb-8 rounded-2xl bg-white p-8 shadow-xl" data-astro-cid-swhfej32> <h3 class="mb-6 text-xl font-bold text-neutral-900" data-astro-cid-swhfej32>
Configuración Avanzada
</h3> <div class="space-y-6" data-astro-cid-swhfej32> <!-- API Settings --> <div class="rounded-xl border border-neutral-200 p-6" data-astro-cid-swhfej32> <div class="mb-4 flex items-center justify-between" data-astro-cid-swhfej32> <div data-astro-cid-swhfej32> <h4 class="font-semibold text-neutral-900" data-astro-cid-swhfej32>
Configuración de API
</h4> <p class="text-sm text-neutral-600" data-astro-cid-swhfej32>
Configura la integración con Google AI
</p> </div> <div class="flex items-center gap-2" data-astro-cid-swhfej32> <span class="text-sm text-neutral-600" data-astro-cid-swhfej32>Estado:</span> <span class="rounded-full bg-success-100 px-2 py-1 text-xs font-medium text-success-700" data-astro-cid-swhfej32>
Conectado
</span> </div> </div> <div class="space-y-4" data-astro-cid-swhfej32> <div data-astro-cid-swhfej32> <label class="mb-2 block text-sm font-medium text-neutral-700" data-astro-cid-swhfej32>
API Key de Google AI
</label> <input type="password" class="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500" placeholder="Ingresa tu API key..." id="google-api-key" data-astro-cid-swhfej32> </div> <div class="flex items-center justify-between" data-astro-cid-swhfej32> <div data-astro-cid-swhfej32> <p class="text-sm font-medium text-neutral-900" data-astro-cid-swhfej32>
Generación Automática
</p> <p class="text-xs text-neutral-600" data-astro-cid-swhfej32>
Permitir generación automática de tarjetas
</p> </div> <label class="relative inline-flex cursor-pointer items-center" data-astro-cid-swhfej32> <input type="checkbox" class="peer sr-only" id="auto-generate-toggle" checked data-astro-cid-swhfej32> <div class="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300" data-astro-cid-swhfej32></div> </label> </div> </div> </div> <!-- Data Management --> <div class="rounded-xl border border-neutral-200 p-6" data-astro-cid-swhfej32> <div class="mb-4 flex items-center justify-between" data-astro-cid-swhfej32> <div data-astro-cid-swhfej32> <h4 class="font-semibold text-neutral-900" data-astro-cid-swhfej32>
Gestión de Datos
</h4> <p class="text-sm text-neutral-600" data-astro-cid-swhfej32>
Copia de seguridad y restauración
</p> </div> <a href="/data" class="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700" data-astro-cid-swhfej32>
Gestionar Datos
<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" data-astro-cid-swhfej32></path> </svg> </a> </div> <div class="grid grid-cols-1 gap-4 md:grid-cols-2" data-astro-cid-swhfej32> <button class="flex items-center gap-3 rounded-lg border-2 border-dashed border-neutral-300 p-4 transition-colors duration-200 hover:border-primary-300 hover:bg-primary-50" data-astro-cid-swhfej32> <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100" data-astro-cid-swhfej32> <svg class="h-5 w-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" data-astro-cid-swhfej32></path> </svg> </div> <div class="text-left" data-astro-cid-swhfej32> <p class="font-medium text-neutral-900" data-astro-cid-swhfej32>
Exportar Datos
</p> <p class="text-sm text-neutral-600" data-astro-cid-swhfej32>
Descarga tu progreso
</p> </div> </button> <button class="flex items-center gap-3 rounded-lg border-2 border-dashed border-neutral-300 p-4 transition-colors duration-200 hover:border-primary-300 hover:bg-primary-50" data-astro-cid-swhfej32> <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100" data-astro-cid-swhfej32> <svg class="h-5 w-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" data-astro-cid-swhfej32></path> </svg> </div> <div class="text-left" data-astro-cid-swhfej32> <p class="font-medium text-neutral-900" data-astro-cid-swhfej32>
Importar Datos
</p> <p class="text-sm text-neutral-600" data-astro-cid-swhfej32>
Restaura desde backup
</p> </div> </button> </div> </div> </div> </div> <!-- Save Status --> <div class="fixed bottom-4 right-4 hidden rounded-lg bg-white p-4 shadow-lg" id="save-status" data-astro-cid-swhfej32> <div class="flex items-center gap-3" data-astro-cid-swhfej32> <div class="flex h-5 w-5 items-center justify-center rounded-full bg-success-100" data-astro-cid-swhfej32> <svg class="h-3 w-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-swhfej32> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" data-astro-cid-swhfej32></path> </svg> </div> <span class="text-sm font-medium text-neutral-900" data-astro-cid-swhfej32>Cambios guardados</span> </div> </div> </div> </main> </div> </div> ` }), renderScript($$result2, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/settings.astro?astro&type=script&index=0&lang.ts")) })}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/settings.astro", void 0);

const $$file = "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/settings.astro";
const $$url = "/settings";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Settings,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
