import { c as createComponent, a as createAstro, b as addAttribute, i as renderHead, j as renderSlot, d as renderTemplate } from './vendor_Bpx6Nh43.mjs';
import 'kleur/colors';
import 'clsx';
/* empty css                             */

const $$Astro = createAstro();
const $$MainLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$MainLayout;
  const { title, description = "Aprende ingl\xE9s con flashcards inteligentes" } = Astro2.props;
  return renderTemplate`<html lang="es"> <head><meta charset="UTF-8"><meta name="description"${addAttribute(description, "content")}><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title><!-- Import global CSS with Tailwind --><link rel="stylesheet" href="/src/index.css"><!-- Preload critical fonts --><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"><!-- Global CSS -->${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/src/layouts/MainLayout.astro", void 0);

export { $$MainLayout as $ };
