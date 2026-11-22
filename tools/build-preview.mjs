// 把预览页构建成零外部依赖的单文件 HTML。只用 Node 标准库。
// 用法：node tools/build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { looks as defaultLooks } from './looks.mjs';
import { report } from '../preview/scan-report/data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const OUT = join(ROOT, 'preview/out');
mkdirSync(OUT, { recursive: true });

const fontManifest = JSON.parse(read('vendor/fonts/fonts.json'));

function fontFaceCss(ids) {
  return ids.flatMap((id) => {
    const f = fontManifest[id];
    if (!f) throw new Error(`未知字体：${id}`);
    return f.files.map(({ file, weight }) => {
      const b64 = readFileSync(join(ROOT, 'vendor/fonts', id, file)).toString('base64');
      return `@font-face{font-family:"${f.family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
    });
  }).join('\n');
}

const ICON_NAMES = ['search', 'chevron-right', 'external-link', 'sun', 'moon', 'octagon-alert', 'triangle-alert', 'circle-alert', 'info',
  'arrow-up-down', 'arrow-up', 'arrow-down', 'git-branch', 'git-commit-horizontal', 'clock', 'search-x', 'folder-git-2', 'users'];

function iconMap() {
  const map = {};
  for (const name of ICON_NAMES) {
    map[name] = read(`vendor/icons/lucide/${name}.svg`)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+class="[^"]*"/, '')
      .replace(/\s+(width|height)="24"/g, '')
      .replace(/\s*\n\s*/g, ' ')
      .trim();
  }
  return map;
}

const baseCss = read('components/report.css');
const appJs = read('preview/scan-report/app.js');
const dataJs = `window.REPORT=${JSON.stringify(report)};window.ICONS=${JSON.stringify(iconMap())};`;
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

// 首次绘制前确定深浅色，避免闪烁。
const themeInit = (defaultDark) => `(function(){var d=${defaultDark ? 'true' : "matchMedia('(prefers-color-scheme: dark)').matches"};try{var t=localStorage.getItem('report-theme');if(t)d=t==='dark'}catch(e){}if(d)document.documentElement.classList.add('dark')})();`;

function lookStyles(look) {
  return [
    read(`vendor/basecoat/css/${look.basecoat}.min.css`),
    fontFaceCss(look.fonts),
    baseCss,
    look.theme ? read(look.theme) : '',
  ];
}

function page({ title, head, bodyEnd = '', defaultDark = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
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

export function build(looks = defaultLooks) {
  const sizes = {};
  // 每个外观一个独立文件
  for (const look of looks) {
    const html = page({ title: '代码扫描报告', defaultDark: look.defaultDark, head: lookStyles(look).map((css) => `<style>${css}</style>`).join('\n') });
    writeFileSync(join(OUT, `scan-report-${look.id}.html`), html);
    sizes[look.id] = Math.round(html.length / 1024);
  }
  // 一个带切换条的合并文件，方便并排比较
  if (looks.length > 1) {
    const head = looks.map((look, i) =>
      lookStyles(look).map((css) => `<style data-look="${look.id}" media="${i === 0 ? 'all' : 'not all'}">${css}</style>`).join('\n')).join('\n');
    const switcher = `
<div id="look-switcher" role="group" aria-label="切换外观">
  ${looks.map((l, i) => `<button type="button" data-look-btn="${l.id}" data-dark="${l.defaultDark ? 1 : 0}" aria-pressed="${i === 0}" title="${l.note}">${String.fromCharCode(65 + i)} · ${l.name}</button>`).join('')}
</div>
<style>
#look-switcher{position:fixed;left:50%;bottom:16px;translate:-50% 0;z-index:99;display:flex;gap:2px;padding:4px;max-width:calc(100vw - 24px);overflow-x:auto;background:#111;border-radius:10px;box-shadow:0 6px 24px rgb(0 0 0/.25);font:500 13px/1 system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
#look-switcher button{padding:8px 12px;border-radius:7px;color:#bbb;white-space:nowrap;cursor:pointer;background:none;border:0;font:inherit}
#look-switcher button:hover{color:#fff}
#look-switcher button[aria-pressed="true"]{background:#fff;color:#111}
body{padding-bottom:72px}
@media print{#look-switcher{display:none}}
</style>
<script>
(function(){
  var bar=document.getElementById('look-switcher');
  function apply(id){
    document.querySelectorAll('style[data-look]').forEach(function(s){s.media=s.dataset.look===id?'all':'not all'});
    bar.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.lookBtn===id)});
    try{localStorage.setItem('report-look',id)}catch(e){}
    var stored=null;try{stored=localStorage.getItem('report-theme')}catch(e){}
    if(!stored){
      var btn=bar.querySelector('[data-look-btn="'+id+'"]');
      var dark=btn.dataset.dark==='1'||matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark',dark);
      if(window.__rerender)window.__rerender();
    }
  }
  bar.addEventListener('click',function(e){var b=e.target.closest('button');if(b)apply(b.dataset.lookBtn)});
  try{var saved=localStorage.getItem('report-look');if(saved&&bar.querySelector('[data-look-btn="'+saved+'"]'))apply(saved)}catch(e){}
})();
</script>`;
    const html = page({ title: '代码扫描报告 · 外观对比', head, bodyEnd: switcher });
    writeFileSync(join(OUT, 'scan-report-compare.html'), html);
    sizes.compare = Math.round(html.length / 1024);
  }
  return sizes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(build());
