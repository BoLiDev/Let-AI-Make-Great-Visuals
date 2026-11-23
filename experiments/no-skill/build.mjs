#!/usr/bin/env node
// 生成单文件、零外部依赖的扫描报告。只用 Node 标准库。
// 用法：node experiments/no-skill/build.mjs [data.json] [-o 输出.html]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const args = process.argv.slice(2);
const oi = args.indexOf('-o');
const out = resolve(oi >= 0 ? args.splice(oi, 2)[1] : join(HERE, 'scan-report.html'));
const dataPath = resolve(args[0] || join(ROOT, 'templates/scan-report/example/data.json'));

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const { validate } = await import(pathToFileURL(join(ROOT, 'templates/scan-report/validate.mjs')));
const errors = validate(data);
if (errors.length) {
  console.error(`数据不符合要求：\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const css = readFileSync(join(HERE, 'src/style.css'), 'utf8');
const js = readFileSync(join(HERE, 'src/app.js'), 'utf8');

// 字体：内联 vendor 里的 Geist 和 Geist Mono（拉丁字符与数字），中文走系统字体。
const font = (family, file) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, 'vendor/fonts', file)).toString('base64')}) format("woff2")}`;
const fonts = [font('Geist', 'geist/geist-latin-wght-normal.woff2'), font('Geist Mono', 'geist-mono/geist-mono-latin-wght-normal.woff2')].join('\n');

// 图标：脚本里出现的、vendor/icons/lucide 下有的名字都内联；vendor 里没有的在这里补。
const EXTRA = {
  'arrow-right': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
};
const icons = {};
for (const m of js.matchAll(/'([a-z][a-z0-9-]*)'/g)) {
  const p = join(ROOT, 'vendor/icons/lucide', `${m[1]}.svg`);
  if (existsSync(p)) {
    icons[m[1]] = readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+class="[^"]*"/, '').replace(/\s+(width|height)="24"/g, '').replace(/\s*\n\s*/g, ' ').trim();
  } else if (EXTRA[m[1]]) icons[m[1]] = EXTRA[m[1]];
}

const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const themeInit = `(function(){var d=false;try{var t=localStorage.getItem('report-theme');if(t)d=t==='dark'}catch(e){}if(d)document.documentElement.classList.add('dark')})();`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(data.title || '代码扫描报告')}</title>
<script>${themeInit}</script>
<style>${fonts}</style>
<style>${css}</style>
</head>
<body>
<main id="app" class="page"></main>
<script>${safe(`window.REPORT=${JSON.stringify(data)};window.ICONS=${JSON.stringify(icons)};`)}</script>
<script>${safe(js)}</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log(`${out}  (${Math.round(html.length / 1024)} KB)`);
