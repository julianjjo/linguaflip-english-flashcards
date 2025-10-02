import { f as renderers, k as createExports } from './chunks/vendor_Bpx6Nh43.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_amPse1VK.mjs';
import { manifest } from './manifest_Uc3ZrmHB.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/auth/login.astro.mjs');
const _page2 = () => import('./pages/api/auth/logout.astro.mjs');
const _page3 = () => import('./pages/api/auth/me.astro.mjs');
const _page4 = () => import('./pages/api/auth/refresh.astro.mjs');
const _page5 = () => import('./pages/api/auth/register.astro.mjs');
const _page6 = () => import('./pages/api/auth/verify.astro.mjs');
const _page7 = () => import('./pages/api/dashboard/activity.astro.mjs');
const _page8 = () => import('./pages/api/dashboard/progress.astro.mjs');
const _page9 = () => import('./pages/api/dashboard/stats.astro.mjs');
const _page10 = () => import('./pages/api/flashcards/create.astro.mjs');
const _page11 = () => import('./pages/api/flashcards/delete.astro.mjs');
const _page12 = () => import('./pages/api/flashcards/list.astro.mjs');
const _page13 = () => import('./pages/api/flashcards/review.astro.mjs');
const _page14 = () => import('./pages/api/flashcards/stats.astro.mjs');
const _page15 = () => import('./pages/api/flashcards/update.astro.mjs');
const _page16 = () => import('./pages/api/flashcards/_cardid_/review.astro.mjs');
const _page17 = () => import('./pages/api/flashcards/_cardid_.astro.mjs');
const _page18 = () => import('./pages/api/flashcards.astro.mjs');
const _page19 = () => import('./pages/api/tts/generate.astro.mjs');
const _page20 = () => import('./pages/api/tts/stream.astro.mjs');
const _page21 = () => import('./pages/dashboard.astro.mjs');
const _page22 = () => import('./pages/data.astro.mjs');
const _page23 = () => import('./pages/help.astro.mjs');
const _page24 = () => import('./pages/login.astro.mjs');
const _page25 = () => import('./pages/profile.astro.mjs');
const _page26 = () => import('./pages/progress.astro.mjs');
const _page27 = () => import('./pages/register.astro.mjs');
const _page28 = () => import('./pages/settings.astro.mjs');
const _page29 = () => import('./pages/study.astro.mjs');
const _page30 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["src/pages/api/auth/login.ts", _page1],
    ["src/pages/api/auth/logout.ts", _page2],
    ["src/pages/api/auth/me.ts", _page3],
    ["src/pages/api/auth/refresh.ts", _page4],
    ["src/pages/api/auth/register.ts", _page5],
    ["src/pages/api/auth/verify.ts", _page6],
    ["src/pages/api/dashboard/activity.ts", _page7],
    ["src/pages/api/dashboard/progress.ts", _page8],
    ["src/pages/api/dashboard/stats.ts", _page9],
    ["src/pages/api/flashcards/create.ts", _page10],
    ["src/pages/api/flashcards/delete.ts", _page11],
    ["src/pages/api/flashcards/list.ts", _page12],
    ["src/pages/api/flashcards/review.ts", _page13],
    ["src/pages/api/flashcards/stats.ts", _page14],
    ["src/pages/api/flashcards/update.ts", _page15],
    ["src/pages/api/flashcards/[cardId]/review.ts", _page16],
    ["src/pages/api/flashcards/[cardId].ts", _page17],
    ["src/pages/api/flashcards.ts", _page18],
    ["src/pages/api/tts/generate.ts", _page19],
    ["src/pages/api/tts/stream.ts", _page20],
    ["src/pages/dashboard.astro", _page21],
    ["src/pages/data.astro", _page22],
    ["src/pages/help.astro", _page23],
    ["src/pages/login.astro", _page24],
    ["src/pages/profile.astro", _page25],
    ["src/pages/progress.astro", _page26],
    ["src/pages/register.astro", _page27],
    ["src/pages/settings.astro", _page28],
    ["src/pages/study.astro", _page29],
    ["src/pages/index.astro", _page30]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "mode": "standalone",
    "client": "file:///home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/dist/client/",
    "server": "file:///home/runner/work/linguaflip-english-flashcards/linguaflip-english-flashcards/dist/server/",
    "host": "localhost",
    "port": 4321,
    "assets": "_astro",
    "experimentalStaticHeaders": false
};
const _exports = createExports(_manifest, _args);
const handler = _exports['handler'];
const startServer = _exports['startServer'];
const options = _exports['options'];
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { handler, options, pageMap, startServer };
