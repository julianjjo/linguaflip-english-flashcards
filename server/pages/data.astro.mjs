import { c as createComponent, g as renderComponent, d as renderTemplate, r as renderScript, m as maybeRenderHead } from '../chunks/vendor_Bpx6Nh43.mjs';
export { f as renderers } from '../chunks/vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import { $ as $$MainLayout } from '../chunks/MainLayout_laCPBsuV.mjs';
import { T as ThemeToggle } from '../chunks/ui-components_Dymo2gSD.mjs';
/* empty css                                */

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Data = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Gesti\xF3n de Datos - LinguaFlip", "description": "Gestiona tus datos de aprendizaje: exporta, importa y realiza copias de seguridad de tu progreso en el estudio de ingl\xE9s", "data-astro-cid-p7ibfero": true }, { "default": ($$result2) => renderTemplate(_a || (_a = __template(['  <meta property="og:title" content="Gesti\xF3n de Datos - LinguaFlip"> <meta property="og:description" content="Exporta e importa tus datos de aprendizaje de ingl\xE9s"> <meta property="og:type" content="website"> <meta name="twitter:card" content="summary_large_image"> <meta name="twitter:title" content="Gesti\xF3n de Datos - LinguaFlip"> <meta name="twitter:description" content="Backup y restauraci\xF3n de datos de estudio">  <script type="application/ld+json">\n    {\n      "@context": "https://schema.org",\n      "@type": "WebApplication",\n      "name": "LinguaFlip Data Management",\n      "description": "Herramientas para gestionar y respaldar datos de aprendizaje",\n      "applicationCategory": "EducationalApplication",\n      "operatingSystem": "Web Browser",\n      "featureList": [\n        "Exportaci\xF3n de datos",\n        "Importaci\xF3n de datos",\n        "Copia de seguridad",\n        "Restauraci\xF3n de progreso"\n      ]\n    }\n  <\/script> ', "  ", "  "])), renderComponent($$result2, "AppProvider", null, { "client:only": "react", "client:component-hydration": "only", "data-astro-cid-p7ibfero": true, "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/AppProvider.tsx", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50" data-astro-cid-p7ibfero> <div class="flex" data-astro-cid-p7ibfero> <!-- Main Content --> <main class="flex-1 p-6 lg:pl-72" data-astro-cid-p7ibfero> <div class="mx-auto max-w-4xl" data-astro-cid-p7ibfero> <!-- Page Header --> <div class="mb-8" data-astro-cid-p7ibfero> <div class="mb-4 flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <h1 class="mb-2 text-3xl font-bold text-neutral-900" data-astro-cid-p7ibfero>
Gestión de Datos
</h1> <p class="text-neutral-600" data-astro-cid-p7ibfero>
Exporta, importa y realiza copias de seguridad de tu
                    progreso
</p> </div> <div class="flex items-center gap-3" data-astro-cid-p7ibfero> <!-- Theme Toggle --> ${renderComponent($$result3, "ThemeToggle", ThemeToggle, { "variant": "icon", "size": "md", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/ThemeToggle.tsx", "client:component-export": "default", "data-astro-cid-p7ibfero": true })} <div class="rounded-lg border border-neutral-200 bg-white px-4 py-2 shadow-sm" data-astro-cid-p7ibfero> <div class="text-sm text-neutral-600" data-astro-cid-p7ibfero>Última actividad</div> <div class="text-sm font-medium text-primary-600" id="last-activity" data-astro-cid-p7ibfero>
Hoy
</div> </div> </div> </div> </div> <!-- Quick Stats --> <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4" data-astro-cid-p7ibfero> <!-- Total Flashcards --> <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-lg" data-astro-cid-p7ibfero> <div class="flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <p class="text-sm font-medium text-neutral-600" data-astro-cid-p7ibfero>
Total de Tarjetas
</p> <p class="text-2xl font-bold text-primary-600" id="total-cards" data-astro-cid-p7ibfero>
0
</p> </div> <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100" data-astro-cid-p7ibfero> <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" data-astro-cid-p7ibfero></path> </svg> </div> </div> </div> <!-- Study Sessions --> <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-lg" data-astro-cid-p7ibfero> <div class="flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <p class="text-sm font-medium text-neutral-600" data-astro-cid-p7ibfero>
Sesiones de Estudio
</p> <p class="text-2xl font-bold text-secondary-600" id="total-sessions" data-astro-cid-p7ibfero>
0
</p> </div> <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-100" data-astro-cid-p7ibfero> <svg class="h-6 w-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" data-astro-cid-p7ibfero></path> </svg> </div> </div> </div> <!-- Data Size --> <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-lg" data-astro-cid-p7ibfero> <div class="flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <p class="text-sm font-medium text-neutral-600" data-astro-cid-p7ibfero>
Tamaño de Datos
</p> <p class="text-2xl font-bold text-accent-600" id="data-size" data-astro-cid-p7ibfero>
0 KB
</p> </div> <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100" data-astro-cid-p7ibfero> <svg class="h-6 w-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" data-astro-cid-p7ibfero></path> </svg> </div> </div> </div> <!-- Last Backup --> <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-lg" data-astro-cid-p7ibfero> <div class="flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <p class="text-sm font-medium text-neutral-600" data-astro-cid-p7ibfero>
Último Backup
</p> <p class="text-2xl font-bold text-success-600" id="last-backup" data-astro-cid-p7ibfero>
Nunca
</p> </div> <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-success-100" data-astro-cid-p7ibfero> <svg class="h-6 w-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" data-astro-cid-p7ibfero></path> </svg> </div> </div> </div> </div> <!-- Data Management Component --> <div class="mb-8 rounded-2xl bg-white p-8 shadow-xl" data-astro-cid-p7ibfero> <div id="data-management-container" data-astro-cid-p7ibfero> <!-- DataManagement component will be rendered here --> </div> </div> <!-- Storage Information --> <div class="mb-8 rounded-2xl bg-white p-8 shadow-xl" data-astro-cid-p7ibfero> <h3 class="mb-6 text-xl font-bold text-neutral-900" data-astro-cid-p7ibfero>
Información de Almacenamiento
</h3> <div class="space-y-6" data-astro-cid-p7ibfero> <!-- Local Storage --> <div class="rounded-xl border border-neutral-200 p-6" data-astro-cid-p7ibfero> <div class="mb-4 flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <h4 class="font-semibold text-neutral-900" data-astro-cid-p7ibfero>
Almacenamiento Local
</h4> <p class="text-sm text-neutral-600" data-astro-cid-p7ibfero>
Datos guardados en tu navegador
</p> </div> <div class="flex items-center gap-2" data-astro-cid-p7ibfero> <span class="rounded-full bg-success-100 px-2 py-1 text-xs font-medium text-success-700" data-astro-cid-p7ibfero>
Activo
</span> </div> </div> <div class="space-y-3" data-astro-cid-p7ibfero> <div class="flex justify-between text-sm" data-astro-cid-p7ibfero> <span class="text-neutral-600" data-astro-cid-p7ibfero>Uso actual:</span> <span class="font-medium text-neutral-900" id="local-storage-usage" data-astro-cid-p7ibfero>Calculando...</span> </div> <div class="h-2 w-full rounded-full bg-neutral-200" data-astro-cid-p7ibfero> <div class="h-2 rounded-full bg-primary-500 transition-all duration-300" id="local-storage-bar" style="width: 0%" data-astro-cid-p7ibfero></div> </div> <p class="text-xs text-neutral-500" data-astro-cid-p7ibfero>
Los datos se guardan automáticamente en tu navegador
</p> </div> </div> <!-- Cloud Backup --> <div class="rounded-xl border border-neutral-200 p-6" data-astro-cid-p7ibfero> <div class="mb-4 flex items-center justify-between" data-astro-cid-p7ibfero> <div data-astro-cid-p7ibfero> <h4 class="font-semibold text-neutral-900" data-astro-cid-p7ibfero>
Copia de Seguridad en la Nube
</h4> <p class="text-sm text-neutral-600" data-astro-cid-p7ibfero>
Sincronización automática (Próximamente)
</p> </div> <div class="flex items-center gap-2" data-astro-cid-p7ibfero> <span class="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600" data-astro-cid-p7ibfero>
Próximamente
</span> </div> </div> <p class="mb-4 text-sm text-neutral-600" data-astro-cid-p7ibfero>
En futuras versiones podrás sincronizar tus datos
                    automáticamente con la nube para acceder desde cualquier
                    dispositivo.
</p> <div class="flex items-center gap-3" data-astro-cid-p7ibfero> <div class="flex-1 rounded-lg bg-neutral-100 p-3" data-astro-cid-p7ibfero> <div class="flex items-center gap-2" data-astro-cid-p7ibfero> <svg class="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.9" data-astro-cid-p7ibfero></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" data-astro-cid-p7ibfero></path> </svg> <span class="text-sm text-neutral-600" data-astro-cid-p7ibfero>Sincronización automática</span> </div> </div> <div class="flex-1 rounded-lg bg-neutral-100 p-3" data-astro-cid-p7ibfero> <div class="flex items-center gap-2" data-astro-cid-p7ibfero> <svg class="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" data-astro-cid-p7ibfero></path> </svg> <span class="text-sm text-neutral-600" data-astro-cid-p7ibfero>Acceso multidispositivo</span> </div> </div> </div> </div> </div> </div> <!-- Data Privacy --> <div class="rounded-2xl bg-gradient-to-r from-primary-50 to-secondary-50 p-8" data-astro-cid-p7ibfero> <div class="flex items-start gap-4" data-astro-cid-p7ibfero> <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100" data-astro-cid-p7ibfero> <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-p7ibfero> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" data-astro-cid-p7ibfero></path> </svg> </div> <div data-astro-cid-p7ibfero> <h3 class="mb-2 text-lg font-bold text-neutral-900" data-astro-cid-p7ibfero>
Privacidad y Seguridad
</h3> <div class="space-y-2 text-sm text-neutral-600" data-astro-cid-p7ibfero> <p data-astro-cid-p7ibfero> <strong data-astro-cid-p7ibfero>Tus datos son tuyos:</strong> Toda la información se
                      almacena localmente en tu dispositivo. No enviamos datos a
                      servidores externos sin tu consentimiento.
</p> <p data-astro-cid-p7ibfero> <strong data-astro-cid-p7ibfero>Copias de seguridad:</strong> Te recomendamos exportar
                      regularmente tus datos para evitar pérdida de progreso.
</p> <p data-astro-cid-p7ibfero> <strong data-astro-cid-p7ibfero>Anonimato:</strong> No recopilamos información personal
                      identificable. Tu aprendizaje permanece privado.
</p> </div> </div> </div> </div> </div> </main> </div> </div> ` }), renderScript($$result2, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/data.astro?astro&type=script&index=0&lang.ts")) })}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/data.astro", void 0);

const $$file = "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/data.astro";
const $$url = "/data";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Data,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
