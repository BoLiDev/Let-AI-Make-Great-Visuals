#!/usr/bin/env node
// 构建本实验的单文件报告。只读取仓库里的 vendor/ 和示例数据，产物写在本目录。
// 用法：node experiments/make-interfaces-feel-better/build.mjs [data.json] [-o scan-report.html]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const args = process.argv.slice(2);
const oi = args.indexOf('-o');
const out = oi >= 0 ? resolve(args.splice(oi, 2)[1]) : join(HERE, 'scan-report.html');
const dataPath = args[0] ? resolve(args[0]) : join(ROOT, 'templates/scan-report/example/data.json');

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const { validate } = await import(pathToFileURL(join(ROOT, 'templates/scan-report/validate.mjs')));
const errors = validate(data);
if (errors.length) { console.error(`数据不符合模板要求：\n- ${errors.join('\n- ')}`); process.exit(1); }

const fonts = [
  ['Instrument Sans', 'vendor/fonts/instrument-sans/instrument-sans-latin-wght-normal.woff2', '400 700'],
  ['Geist Mono', 'vendor/fonts/geist-mono/geist-mono-latin-wght-normal.woff2', '100 900'],
].map(([family, file, weight]) => `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, file)).toString('base64')}) format("woff2")}`).join('\n');

const appJs = readFileSync(join(HERE, 'src/app.js'), 'utf8');
const icons = {};
for (const m of appJs.matchAll(/'([a-z][a-z0-9-]*)'/g)) {
  const p = join(ROOT, 'vendor/icons/lucide', `${m[1]}.svg`);
  if (!existsSync(p) || icons[m[1]]) continue;
  icons[m[1]] = readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+class="[^"]*"/, '').replace(/\s+(width|height)="24"/g, '').replace(/\s*\n\s*/g, ' ').trim();
}

const styles = [
  readFileSync(join(ROOT, 'vendor/basecoat/css/maia.min.css'), 'utf8'),
  fonts,
  readFileSync(join(HERE, 'src/theme.css'), 'utf8'),
  readFileSync(join(HERE, 'src/report.css'), 'utf8'),
];
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const themeInit = `(function(){var d=matchMedia('(prefers-color-scheme: dark)').matches;try{var t=localStorage.getItem('report-theme');if(t)d=t==='dark'}catch(e){}if(d)document.documentElement.classList.add('dark')})();`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title || '代码扫描报告')}</title>
<script>${themeInit}</script>
${styles.map((css) => `<style>${css}</style>`).join('\n')}
</head>
<body>
<main id="app" class="r-page"></main>
<script>${safe(`window.REPORT=${JSON.stringify(data)};window.ICONS=${JSON.stringify(icons)};`)}</script>
<script>${safe(appJs)}</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log(`${out}  (${Math.round(html.length / 1024)} KB)`);
