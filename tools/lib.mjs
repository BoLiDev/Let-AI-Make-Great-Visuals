// 构建公共部分：把模板、数据、样式、字体、图标合成一个零外部依赖的 HTML。只用 Node 标准库。
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { looks } from './looks.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export function findLook(id) {
  const look = looks.find((l) => l.id === id);
  if (!look) throw new Error(`未知外观 "${id}"。可选：${looks.map((l) => l.id).join('、')}`);
  return look;
}

function fontFaceCss(ids) {
  const manifest = JSON.parse(read('vendor/fonts/fonts.json'));
  return ids.flatMap((id) => {
    const f = manifest[id];
    if (!f) throw new Error(`未知字体：${id}`);
    return f.files.map(({ file, weight }) => {
      const b64 = readFileSync(join(ROOT, 'vendor/fonts', id, file)).toString('base64');
      return `@font-face{font-family:"${f.family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
    });
  }).join('\n');
}

// 收集模板脚本里出现的图标名：凡是字符串字面量且 vendor/icons/lucide 下有同名文件的，都内联进去。
function iconMap(js) {
  const names = new Set();
  for (const m of js.matchAll(/'([a-z][a-z0-9-]*)'/g)) {
    if (existsSync(join(ROOT, 'vendor/icons/lucide', `${m[1]}.svg`))) names.add(m[1]);
  }
  const map = {};
  for (const name of names) {
    map[name] = read(`vendor/icons/lucide/${name}.svg`)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+class="[^"]*"/, '')
      .replace(/\s+(width|height)="24"/g, '')
      .replace(/\s*\n\s*/g, ' ')
      .trim();
  }
  return map;
}

export function lookStyles(look) {
  return [
    read(`vendor/basecoat/css/${look.basecoat}.min.css`),
    fontFaceCss(look.fonts),
    read('components/report.css'),
    look.theme ? read(look.theme) : '',
  ];
}

const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 首次绘制前确定深浅色，避免闪烁。
const themeInit = (defaultDark) => `(function(){var d=${defaultDark ? 'true' : "matchMedia('(prefers-color-scheme: dark)').matches"};try{var t=localStorage.getItem('report-theme');if(t)d=t==='dark'}catch(e){}if(d)document.documentElement.classList.add('dark')})();`;

export function renderPage({ template, data, head, bodyEnd = '', defaultDark = false, title }) {
  const appJs = read(`templates/${template}/app.js`);
  const dataJs = `window.REPORT=${JSON.stringify(data)};window.ICONS=${JSON.stringify(iconMap(appJs))};`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title || data.title || '报告')}</title>
<script>${themeInit(defaultDark)}</script>
${head}
</head>
<body>
<main id="app" class="r-page"></main>
<script>${safe(dataJs)}</script>
<script>${safe(appJs)}</script>
${bodyEnd}
</body>
</html>
`;
}

export function renderReport({ template, data, theme }) {
  const look = findLook(theme);
  return renderPage({ template, data, defaultDark: look.defaultDark, head: lookStyles(look).map((css) => `<style>${css}</style>`).join('\n') });
}
