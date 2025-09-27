import { c as createComponent, g as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/vendor_Bpx6Nh43.mjs';
export { f as renderers } from '../chunks/vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import { $ as $$MainLayout } from '../chunks/MainLayout_laCPBsuV.mjs';
import { b as $$Sidebar, T as ThemeToggle } from '../chunks/ui-components_Dymo2gSD.mjs';

const $$Profile = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Perfil de Usuario - LinguaFlip", "description": "Gestiona tu perfil de usuario, preferencias de estudio y configuraci\xF3n personal" }, { "default": ($$result2) => renderTemplate`  <meta property="og:title" content="Perfil de Usuario - LinguaFlip"> <meta property="og:description" content="Configura tu perfil y preferencias de aprendizaje"> <meta property="og:type" content="website"> ${renderComponent($$result2, "AppProvider", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/AppProvider.tsx", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50"> <div class="flex"> <!-- Sidebar --> ${renderComponent($$result3, "Sidebar", $$Sidebar, { "currentPath": "/profile", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/Sidebar.astro", "client:component-export": "default" })} <!-- Main Content --> <main class="flex-1 p-6 lg:pl-72"> <div class="mx-auto max-w-4xl"> <!-- Page Header --> <div class="mb-8"> <div class="mb-4 flex items-center justify-between"> <div> <h1 class="mb-2 text-3xl font-bold text-neutral-900">
Perfil de Usuario
</h1> <p class="text-neutral-600">
Gestiona tu información personal y preferencias de estudio
</p> </div> <div class="flex items-center gap-3"> <!-- Theme Toggle --> ${renderComponent($$result3, "ThemeToggle", ThemeToggle, { "variant": "icon", "size": "md", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/ThemeToggle.tsx", "client:component-export": "default" })} </div> </div> </div> <!-- Profile Content --> <div class="space-y-8"> <!-- Profile Information --> <div class="rounded-2xl bg-white p-8 shadow-xl"> <h2 class="mb-6 text-xl font-bold text-neutral-900">
Información Personal
</h2> <div class="grid grid-cols-1 gap-6 md:grid-cols-2"> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Nombre
</label> <input type="text" class="w-full rounded-lg border border-neutral-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500" placeholder="Tu nombre" value="Usuario"> </div> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Correo Electrónico
</label> <input type="email" class="w-full rounded-lg border border-neutral-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500" placeholder="tu@email.com" value="user@example.com"> </div> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Idioma Nativo
</label> <select class="w-full rounded-lg border border-neutral-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500"> <option value="es">Español</option> <option value="en">English</option> <option value="fr">Français</option> <option value="de">Deutsch</option> </select> </div> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Nivel de Inglés
</label> <select class="w-full rounded-lg border border-neutral-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500"> <option value="beginner">Principiante</option> <option value="intermediate">Intermedio</option> <option value="advanced">Avanzado</option> <option value="expert">Experto</option> </select> </div> </div> <div class="mt-6 flex justify-end"> <button class="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-primary-700">
Guardar Cambios
</button> </div> </div> <!-- Study Preferences --> <div class="rounded-2xl bg-white p-8 shadow-xl"> <h2 class="mb-6 text-xl font-bold text-neutral-900">
Preferencias de Estudio
</h2> <div class="space-y-6"> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Tarjetas por sesión
</label> <input type="number" min="5" max="50" class="w-full rounded-lg border border-neutral-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500" value="20"> </div> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Recordatorios diarios
</label> <div class="flex items-center space-x-4"> <label class="flex items-center"> <input type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" checked> <span class="ml-2 text-sm text-neutral-700">Activar recordatorios</span> </label> </div> </div> <div> <label class="mb-2 block text-sm font-medium text-neutral-700">
Tema de la aplicación
</label> <div class="flex items-center space-x-4"> <label class="flex items-center"> <input type="radio" name="theme" value="light" class="border-neutral-300 text-primary-600 focus:ring-primary-500"> <span class="ml-2 text-sm text-neutral-700">Claro</span> </label> <label class="flex items-center"> <input type="radio" name="theme" value="dark" class="border-neutral-300 text-primary-600 focus:ring-primary-500"> <span class="ml-2 text-sm text-neutral-700">Oscuro</span> </label> <label class="flex items-center"> <input type="radio" name="theme" value="auto" class="border-neutral-300 text-primary-600 focus:ring-primary-500" checked> <span class="ml-2 text-sm text-neutral-700">Automático</span> </label> </div> </div> </div> <div class="mt-6 flex justify-end"> <button class="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-primary-700">
Actualizar Preferencias
</button> </div> </div> <!-- Account Actions --> <div class="rounded-2xl bg-white p-8 shadow-xl"> <h2 class="mb-6 text-xl font-bold text-neutral-900">
Acciones de Cuenta
</h2> <div class="space-y-4"> <button class="w-full rounded-lg border border-neutral-200 p-4 text-left transition-colors duration-200 hover:bg-neutral-50"> <div class="flex items-center justify-between"> <div> <h3 class="font-medium text-neutral-900">
Cambiar Contraseña
</h3> <p class="text-sm text-neutral-600">
Actualiza tu contraseña de acceso
</p> </div> <svg class="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path> </svg> </div> </button> <button class="w-full rounded-lg border border-neutral-200 p-4 text-left transition-colors duration-200 hover:bg-neutral-50"> <div class="flex items-center justify-between"> <div> <h3 class="font-medium text-neutral-900">
Exportar Datos
</h3> <p class="text-sm text-neutral-600">
Descarga una copia de tus datos
</p> </div> <svg class="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path> </svg> </div> </button> <button class="w-full rounded-lg border border-red-200 p-4 text-left text-red-700 transition-colors duration-200 hover:bg-red-50"> <div class="flex items-center justify-between"> <div> <h3 class="font-medium">Eliminar Cuenta</h3> <p class="text-sm text-red-600">
Esta acción no se puede deshacer
</p> </div> <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path> </svg> </div> </button> </div> </div> </div> </div> </main> </div> </div> ` })} ` })}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/profile.astro", void 0);

const $$file = "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/profile.astro";
const $$url = "/profile";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Profile,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
