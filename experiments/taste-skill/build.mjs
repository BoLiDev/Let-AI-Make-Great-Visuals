#!/usr/bin/env node
// 把报告数据、tasteskill 套件（CSS/JS）、仓库自带字体打成一个可离线打开的 HTML。
// 用法：node experiments/taste-skill/build.mjs [data.json] [-o scan-report.html] [--skill <skill 目录>]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const args = process.argv.slice(2);
const flag = (name, d) => { const i = args.indexOf(name); if (i === -1) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = resolve(flag('-o', join(HERE, 'scan-report.html')));
const SKILL = resolve(flag('--skill', process.env.TASTE_SKILL || '/tmp/claude-0/-home-user-Let-AI-Make-Great-Visuals/bea25f7a-072d-5cc1-9e0e-751ac58497ac/scratchpad/skilltest/.agents/skills/design-taste-frontend'));
const dataPath = resolve(args[0] || join(ROOT, 'templates/scan-report/example/data.json'));

const read = (p) => readFileSync(p, 'utf8');
const kit = (p) => read(join(SKILL, 'assets', p));
const data = JSON.parse(read(dataPath));
const { validate } = await import(join(ROOT, 'templates/scan-report/validate.mjs'));
const errors = validate(data);
if (errors.length) { console.error(`数据不符合模板要求：\n- ${errors.join('\n- ')}`); process.exit(1); }

// 预渲染列表页：文案写进 HTML 本身，不依赖脚本也能读，套件的静态检查（copy-lint）也看得到。
const app = createRequire(import.meta.url)(join(HERE, 'src/app.js'));
const M = app.model(data);
const page = app.renderList(M, { q: '', sort: 'blocker', dir: 'desc' });

const font = (dir, file, family, weight) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, 'vendor/fonts', dir, file)).toString('base64')}) format("woff2")}`;
const fonts = [
  font('hanken-grotesk', 'hanken-grotesk-latin-wght-normal.woff2', 'Hanken Grotesk', '100 900'),
  font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2', 'JetBrains Mono', '100 800'),
].join('\n');

// 套件的样式原样内联，顺序同 starter.html：system、motion、layout，再是用到的那个 moment。
const css = ['system.css', 'motion/motion.css', 'layout/layout.css', 'moments/counter-rolls/moment.css'].map((p) => `/* tasteskill: assets/${p} */\n${kit(p)}`).join('\n');

// 套件的脚本是按相对路径互相 import 的 ES module；单文件里没有相对路径，
// 所以把 lib、moment 模块做成 blob 地址，只改写它们的 import 地址，其余逐字保留。
const must = (src, from, to, name) => { if (!src.includes(from)) throw new Error(`套件 ${name} 里找不到要改写的片段：${from}`); return src.replace(from, to); };
let systemJs = kit('system.js');
systemJs = must(systemJs, "import(new URL('moments/moments.js', HERE).href)", "import(window.__kit['moments/moments.js'])", 'system.js');
let momentsJs = kit('moments/moments.js');
momentsJs = must(momentsJs, "import * as lib from './lib.js';", "import * as lib from '__LIB__';", 'moments.js');
momentsJs = must(momentsJs, "const BASE = new URL('./', import.meta.url);", 'const BASE = null;', 'moments.js');
momentsJs = must(momentsJs, 'await Promise.all([css(new URL(`${id}/moment.css`, BASE).href), import(new URL(`${id}/moment.js`, BASE).href)])', '[null, await import(window.__kit[`${id}/moment.js`])]', 'moments.js');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');
const plain = (id, src) => `<script type="text/plain" id="${id}">${safe(src)}</script>`;

const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#0a0d14"/><path d="M5 17a7 7 0 0 1 14 0" fill="none" stroke="#5ab9fc" stroke-width="3" stroke-linecap="round"/></svg>')}`;
const desc = `${data.repo?.name || 'monorepo'} 的代码扫描结果：${M.apps.length} 个子应用里 ${M.dirty.length} 个存在问题，共 ${M.all.length} 个，其中 ${M.totals.blocker} 个阻断。`;

const html = `<!doctype html>
<html lang="zh-CN" data-type="software" data-radius="sharp" data-buttons="pill" data-motion>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${page.title}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${desc}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${favicon}" type="image/svg+xml">
<meta name="theme-color" content="#0a0d14">
<meta name="site-kind" content="software">
<meta name="page-type" content="software">
<style>
${fonts}
${css}
</style>
<style>
${read(join(HERE, 'src/page.css'))}
</style>
<script>document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)</script>
<script>document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)</script>
</head>
<body>
<!-- type: software（开发者工具：monorepo 代码扫描报告）
     deal: hero split, palette blue-black-cornflower, type host（离线：Hanken Grotesk 顶替 Host Grotesk，JetBrains Mono 不变）,
           radius sharp, nav nav-centre, close close-word, footer footer-columns, rhythm space, buttons pill, mark arc, grounds 无
     moments: counter-rolls（列表页在 #types 的四个严重程度数字上；详情页在 #issues 顶部的同一组数字上）
     页面是一摞屏：首屏只有 hero；#apps 两屏；#types 一屏；footer.closing 一屏。详情页的问题清单超过两屏时按内容撑高。 -->
${page.nav}
<main id="top">
${page.main}
</main>
${page.footer}
<script>window.REPORT = ${json(data)};</script>
<script>
${safe(read(join(HERE, 'src/app.js')))}
</script>
${plain('kit-lib', kit('moments/lib.js'))}
${plain('kit-counter-rolls', kit('moments/counter-rolls/moment.js'))}
${plain('kit-moments', momentsJs)}
<script>
(function () {
  var src = function (id) { return document.getElementById(id).textContent; };
  var blob = function (s) { return URL.createObjectURL(new Blob([s], { type: 'text/javascript' })); };
  var lib = blob(src('kit-lib'));
  window.__kit = {
    'counter-rolls/moment.js': blob(src('kit-counter-rolls')),
    'moments/moments.js': blob(src('kit-moments').replace('__LIB__', lib)),
  };
})();
</script>
<script type="module">
${safe(systemJs)}
</script>
<script type="module">
${safe(kit('motion/motion.js'))}
</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log(`${out}  (${Math.round(html.length / 1024)} KB)`);
