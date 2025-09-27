import { c as createComponent, g as renderComponent, d as renderTemplate, r as renderScript, m as maybeRenderHead } from '../chunks/vendor_Bpx6Nh43.mjs';
export { f as renderers } from '../chunks/vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import { $ as $$MainLayout } from '../chunks/MainLayout_laCPBsuV.mjs';
import { b as $$Sidebar, T as ThemeToggle } from '../chunks/ui-components_Dymo2gSD.mjs';

const $$Help = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Ayuda y Soporte - LinguaFlip", "description": "Gu\xEDas completas, preguntas frecuentes y soporte para aprender ingl\xE9s con LinguaFlip" }, { "default": ($$result2) => renderTemplate`  <meta property="og:title" content="Ayuda y Soporte - LinguaFlip"> <meta property="og:description" content="Encuentra ayuda y soporte para tu aprendizaje de inglés"> <meta property="og:type" content="website"> ${renderComponent($$result2, "AppProvider", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/AppProvider.tsx", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50"> <div class="flex"> <!-- Sidebar --> ${renderComponent($$result3, "Sidebar", $$Sidebar, { "currentPath": "/help", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/Sidebar.astro", "client:component-export": "default" })} <!-- Main Content --> <main class="flex-1 p-6 lg:pl-72"> <div class="mx-auto max-w-4xl"> <!-- Page Header --> <div class="mb-8"> <div class="mb-4 flex items-center justify-between"> <div> <h1 class="mb-2 text-3xl font-bold text-neutral-900">
Centro de Ayuda
</h1> <p class="text-neutral-600">
Encuentra respuestas a tus preguntas y aprende a usar
                    LinguaFlip
</p> </div> <div class="flex items-center gap-3"> <!-- Theme Toggle --> ${renderComponent($$result3, "ThemeToggle", ThemeToggle, { "variant": "icon", "size": "md", "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/components/ThemeToggle.tsx", "client:component-export": "default" })} </div> </div> </div> <!-- Quick Actions --> <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3"> <div class="rounded-xl bg-white p-6 text-center shadow-lg transition-shadow duration-200 hover:shadow-xl"> <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100"> <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg> </div> <h3 class="mb-2 font-semibold text-neutral-900">
Preguntas Frecuentes
</h3> <p class="mb-4 text-sm text-neutral-600">
Respuestas a las dudas más comunes
</p> <button data-scroll="faq" class="text-sm font-medium text-primary-600 hover:text-primary-700">
Ver FAQ →
</button> </div> <div class="rounded-xl bg-white p-6 text-center shadow-lg transition-shadow duration-200 hover:shadow-xl"> <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-100"> <svg class="h-6 w-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path> </svg> </div> <h3 class="mb-2 font-semibold text-neutral-900">
Guía de Estudio
</h3> <p class="mb-4 text-sm text-neutral-600">
Cómo usar el sistema de repetición espaciada
</p> <button data-scroll="study-guide" class="text-sm font-medium text-primary-600 hover:text-primary-700">
Ver Guía →
</button> </div> <div class="rounded-xl bg-white p-6 text-center shadow-lg transition-shadow duration-200 hover:shadow-xl"> <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100"> <svg class="h-6 w-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path> </svg> </div> <h3 class="mb-2 font-semibold text-neutral-900">
Contactar Soporte
</h3> <p class="mb-4 text-sm text-neutral-600">
¿Necesitas ayuda personalizada?
</p> <button data-scroll="contact" class="text-sm font-medium text-primary-600 hover:text-primary-700">
Contactar →
</button> </div> </div> <!-- FAQ Section --> <div id="faq" class="mb-8 rounded-2xl bg-white p-8 shadow-xl"> <h2 class="mb-6 text-2xl font-bold text-neutral-900">
Preguntas Frecuentes
</h2> <div class="space-y-6"> <div class="border-b border-neutral-200 pb-6"> <h3 class="mb-2 text-lg font-semibold text-neutral-900">
¿Cómo funciona la repetición espaciada?
</h3> <p class="text-neutral-600">
La repetición espaciada es un técnica científica que
                    programa las revisiones de las tarjetas en intervalos
                    crecientes (1 día, 3 días, 1 semana, etc.) basándose en tu
                    rendimiento. Esto optimiza el tiempo de estudio y mejora la
                    retención a largo plazo.
</p> </div> <div class="border-b border-neutral-200 pb-6"> <h3 class="mb-2 text-lg font-semibold text-neutral-900">
¿Qué significa la calificación de recuerdo?
</h3> <p class="text-neutral-600">
Cuando revisas una tarjeta, calificas qué tan bien la
                    recordaste:
<br>• <strong>0-1:</strong> "Otra vez" - La olvidaste completamente
<br>• <strong>2:</strong> "Difícil" - La recordaste con dificultad
<br>• <strong>3:</strong> "Buena" - La recordaste correctamente
<br>• <strong>4-5:</strong> "Fácil" - La recordaste sin esfuerzo
</p> </div> <div class="border-b border-neutral-200 pb-6"> <h3 class="mb-2 text-lg font-semibold text-neutral-900">
¿Cómo creo flashcards personalizadas?
</h3> <p class="text-neutral-600">
Ve a la sección de "Estudiar" y haz clic en "Crear Nueva
                    Tarjeta". Puedes escribir la palabra/frase manualmente o
                    usar la IA integrada para generar contenido automáticamente
                    con definiciones, ejemplos y pronunciación.
</p> </div> <div class="border-b border-neutral-200 pb-6"> <h3 class="mb-2 text-lg font-semibold text-neutral-900">
¿Mis datos están seguros?
</h3> <p class="text-neutral-600">
Sí, tus datos se almacenan localmente en tu dispositivo. No
                    enviamos información personal a servidores externos. Puedes
                    exportar tus datos en cualquier momento desde la sección
                    "Datos" para hacer copias de seguridad.
</p> </div> <div> <h3 class="mb-2 text-lg font-semibold text-neutral-900">
¿Puedo usar LinguaFlip sin conexión?
</h3> <p class="text-neutral-600">
Sí, LinguaFlip funciona completamente sin conexión a
                    internet. Todos los datos se guardan localmente en tu
                    navegador.
</p> </div> </div> </div> <!-- Study Guide Section --> <div id="study-guide" class="mb-8 rounded-2xl bg-white p-8 shadow-xl"> <h2 class="mb-6 text-2xl font-bold text-neutral-900">
Guía de Estudio
</h2> <div class="grid grid-cols-1 gap-8 md:grid-cols-2"> <div> <h3 class="mb-4 text-lg font-semibold text-neutral-900">
Primeros Pasos
</h3> <ol class="list-inside list-decimal space-y-2 text-neutral-600"> <li>Crea tu primera sesión de estudio</li> <li>Revisa 10-20 tarjetas por sesión</li> <li>Califica honestamente tu recuerdo</li> <li>Estudia diariamente para mejores resultados</li> </ol> </div> <div> <h3 class="mb-4 text-lg font-semibold text-neutral-900">
Mejores Prácticas
</h3> <ul class="list-inside list-disc space-y-2 text-neutral-600"> <li>Estudia a la misma hora cada día</li> <li>No sobrecargues con demasiadas tarjetas</li> <li>Revisa tarjetas difíciles más frecuentemente</li> <li>Combina estudio con práctica real</li> </ul> </div> </div> <div class="mt-8 rounded-lg bg-primary-50 p-6"> <h3 class="mb-2 text-lg font-semibold text-primary-900">
💡 Tip Pro
</h3> <p class="text-primary-800">
Para mejores resultados, estudia consistentemente aunque sea
                  solo 10-15 minutos al día, en lugar de sesiones largas pero
                  irregulares.
</p> </div> </div> <!-- Contact Section --> <div id="contact" class="rounded-2xl bg-white p-8 shadow-xl"> <h2 class="mb-6 text-2xl font-bold text-neutral-900">
Contactar Soporte
</h2> <div class="grid grid-cols-1 gap-8 md:grid-cols-2"> <div> <h3 class="mb-4 text-lg font-semibold text-neutral-900">
¿Necesitas Ayuda?
</h3> <p class="mb-4 text-neutral-600">
Si no encuentras la respuesta que buscas, puedes
                    contactarnos a través de:
</p> <div class="space-y-3"> <div class="flex items-center space-x-3"> <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path> </svg> <span class="text-neutral-600">support@linguaflip.app</span> </div> <div class="flex items-center space-x-3"> <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path> </svg> <span class="text-neutral-600">Chat en vivo (próximamente)</span> </div> </div> </div> <div> <h3 class="mb-4 text-lg font-semibold text-neutral-900">
Comentarios
</h3> <p class="mb-4 text-neutral-600">
Tu opinión es importante para mejorar LinguaFlip. Comparte
                    tus sugerencias y experiencias.
</p> <form class="space-y-4"> <div> <label class="mb-1 block text-sm font-medium text-neutral-700">Asunto</label> <input type="text" class="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500" placeholder="¿En qué podemos ayudarte?"> </div> <div> <label class="mb-1 block text-sm font-medium text-neutral-700">Mensaje</label> <textarea rows="4" class="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500" placeholder="Describe tu consulta o sugerencia..."></textarea> </div> <button type="submit" class="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-primary-700">
Enviar Mensaje
</button> </form> </div> </div> </div> </div> </main> </div> </div> ` })} ${renderScript($$result2, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/help.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/help.astro", void 0);

const $$file = "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/pages/help.astro";
const $$url = "/help";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Help,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
