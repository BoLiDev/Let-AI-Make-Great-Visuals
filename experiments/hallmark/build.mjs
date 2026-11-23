#!/usr/bin/env node
// 生成单文件、可离线打开的扫描报告。只用 Node 标准库，所有素材都在 src/ 下。
// 用法：node build.mjs [data.json] [-o scan-report.html]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const read = (p) => readFileSync(join(SRC, p), 'utf8');

const args = process.argv.slice(2);
const oi = args.indexOf('-o');
const out = resolve(oi === -1 ? join(HERE, 'scan-report.html') : args.splice(oi, 2)[1]);
const dataPath = resolve(args[0] || join(SRC, 'data.json'));

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const { validate } = await import(pathToFileURL(join(SRC, 'validate.mjs')));
const errors = validate(data);
if (errors.length) {
  console.error(`数据不符合模板要求：\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const font = (family, file, weight) => {
  const b64 = readFileSync(join(SRC, 'fonts', file)).toString('base64');
  return `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight}; font-display: swap; src: url(data:font/woff2;base64,${b64}) format("woff2"); }`;
};
const fonts = [
  font('Hanken Grotesk', 'hanken-grotesk-latin-wght-normal.woff2', '100 900'),
  font('IBM Plex Mono', 'ibm-plex-mono-latin-400-normal.woff2', '400'),
  font('IBM Plex Mono', 'ibm-plex-mono-latin-500-normal.woff2', '500'),
].join('\n');

const icons = {};
for (const f of readdirSync(join(SRC, 'icons')).filter((f) => f.endsWith('.svg'))) {
  icons[f.replace(/\.svg$/, '')] = read(`icons/${f}`)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+class="[^"]*"/, '')
    .replace(/\s+(width|height)="24"/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

// 印记必须是 CSS 的第一行，然后是 token、基础规则、字体、页面样式。
const css = [read('stamp.css').trim(), read('tokens.css'), read('base.css'), fonts, read('report.css')].join('\n');
const appJs = read('app.js');

// 预渲染列表页：关闭脚本时也能看到内容。
const fake = { REPORT: data, ICONS: icons };
new Function('window', appJs)(fake);

const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const title = data.title || '代码扫描报告';
const repo = data.repo && data.repo.name ? `${data.repo.name} ` : '';
const modeInit = `(function(){try{var t=localStorage.getItem('report-theme');if(t==='dark'||t==='light')document.documentElement.dataset.mode=t}catch(e){}})();`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(`${repo}的${title}：按子应用列出问题数量、严重程度、引入时间和代码位置。`)}">
<script>${modeInit}</script>
<style>
${css}
</style>
</head>
<body>
<a class="skip" href="#app">跳到正文</a>
<main id="app">${fake.__prerender}</main>
<script>${safe(`window.REPORT=${JSON.stringify(data)};window.ICONS=${JSON.stringify(icons)};`)}</script>
<script>${safe(appJs)}</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log(`${out}  (${Math.round(html.length / 1024)} KB)`);
