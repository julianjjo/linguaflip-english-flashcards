import { c as createComponent, g as renderComponent, d as renderTemplate, r as renderScript, m as maybeRenderHead } from '../chunks/vendor_Bpx6Nh43.mjs';
export { f as renderers } from '../chunks/vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import { $ as $$MainLayout } from '../chunks/MainLayout_laCPBsuV.mjs';
import { $ as $$Header, b as $$Sidebar, T as ThemeToggle, D as DashboardLayout } from '../chunks/ui-components_Dymo2gSD.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Dashboard = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Dashboard - LinguaFlip", "description": "Visualiza tu progreso de aprendizaje de ingl\xE9s con estad\xEDsticas detalladas y an\xE1lisis de rendimiento" }, { "default": ($$result2) => renderTemplate(_a || (_a = __template(['  <meta property="og:title" content="Dashboard de Progreso - LinguaFlip"> <meta property="og:description" content="Analiza tu progreso de aprendizaje de ingl\xE9s con m\xE9tricas detalladas"> <meta property="og:type" content="website"> <meta name="twitter:card" content="summary_large_image"> <meta name="twitter:title" content="Dashboard - LinguaFlip"> <meta name="twitter:description" content="M\xE9tricas y estad\xEDsticas de tu aprendizaje">  <script type="application/ld+json">\n    {\n      "@context": "https://schema.org",\n      "@type": "WebApplication",\n      "name": "LinguaFlip Dashboard",\n      "description": "Dashboard de an\xE1lisis de progreso para aprendizaje de ingl\xE9s",\n      "applicationCategory": "EducationalApplication",\n      "operatingSystem": "Web Browser"\n    }\n  <\/script> ', " ", " "])), renderComponent($$result2, "AppProvider", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/AppProvider.tsx", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"> <!-- Header --> ${renderComponent($$result3, "Header", $$Header, { "isSidebarOpen": false })} <div class="flex"> <!-- Sidebar --> ${renderComponent($$result3, "Sidebar", $$Sidebar, {})} <!-- Main Content --> <main class="flex-1 p-6 lg:pl-72"> <!-- Page Header --> <div class="mb-8"> <div class="mb-4 flex items-center justify-between"> <div> <h1 class="mb-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
Dashboard de Progreso
</h1> <p class="text-neutral-600 dark:text-neutral-300">
Analiza tu progreso y mantén la motivación en tu aprendizaje
</p> </div> <div class="flex items-center gap-3"> <!-- Theme Toggle --> ${renderComponent($$result3, "ThemeToggle", ThemeToggle, { "variant": "icon", "size": "md", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/ThemeToggle.tsx", "client:component-export": "default" })} <a href="/study" class="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"> <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path> </svg>
Continuar Estudiando
</a> </div> </div> </div> <!-- Dashboard Layout Component --> ${renderComponent($$result3, "DashboardLayout", DashboardLayout, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/dashboard/DashboardLayout.tsx", "client:component-export": "default" })} </main> </div> </div> ` }), renderScript($$result2, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/dashboard.astro?astro&type=script&index=0&lang.ts")) })}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/dashboard.astro", void 0);

const $$file = "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
