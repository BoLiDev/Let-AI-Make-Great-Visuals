// 用示例数据生成各外观的预览页，以及一个带切换条的对比页。
// 用法：node tools/build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, lookStyles, renderPage, renderReport } from './lib.mjs';
import { looks } from './looks.mjs';

const template = 'scan-report';
const data = JSON.parse(readFileSync(join(ROOT, 'templates', template, 'example/data.json'), 'utf8'));
const OUT = join(ROOT, 'preview/out');
mkdirSync(OUT, { recursive: true });

for (const look of looks) writeFileSync(join(OUT, `scan-report-${look.id}.html`), renderReport({ template, data, theme: look.id }));

const head = looks.map((look, i) =>
  lookStyles(look).map((css) => `<style data-look="${look.id}" media="${i === 0 ? 'all' : 'not all'}">${css}</style>`).join('\n')).join('\n');
const switcher = `
<div id="look-switcher" role="group" aria-label="切换外观">
  ${looks.map((l, i) => `<button type="button" data-look-btn="${l.id}" data-dark="${l.defaultDark ? 1 : 0}" aria-pressed="${i === 0}" title="${l.note}">${String.fromCharCode(65 + i)} ${l.name}</button>`).join('')}
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
writeFileSync(join(OUT, 'scan-report-compare.html'), renderPage({ template, data, head, bodyEnd: switcher, title: '代码扫描报告 | 外观对比' }));
console.log(`已生成 ${looks.length} 个外观和对比页：${OUT}`);
