// 截图：node shot.mjs  →  list.png、detail.png（1280 宽，2 倍，整页）
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const file = 'file://' + join(HERE, 'scan-report.html');
const pre = process.argv.find((a) => a.startsWith('--prefix='))?.slice(9) || HERE + '/';
const width = +(process.argv.find((a) => a.startsWith('--width='))?.slice(8) || 1280);
const height = +(process.argv.find((a) => a.startsWith('--height='))?.slice(9) || 900);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) errors.push('外部请求 ' + r.url()); });
for (const [name, hash] of [['list', ''], ['detail', '#/app/checkout']]) {
  await page.goto('about:blank');
  await page.goto(file + hash);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3200);
  const check = await page.evaluate(() => {
    const de = document.documentElement;
    const over = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1).slice(0, 5).map((el) => el.className || el.tagName);
    const small = [...document.querySelectorAll('body *')].filter((el) => el.children.length === 0 && el.textContent.trim() && el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 13).length;
    return { view: de.dataset.view, scrollW: de.scrollWidth, clientW: de.clientWidth, over, under13px: small, h1: document.querySelector('h1')?.innerText.replace(/\n/g, ' / '), sections: [...document.querySelectorAll('main > section, footer.closing')].map((s) => `${s.id || 'hero'}:${Math.round(s.getBoundingClientRect().height)}/${s.scrollHeight}`), moments: de.dataset.momentsReady, fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))] };
  });
  await page.screenshot({ path: `${pre}${name}.png`, fullPage: true });
  console.log(name, JSON.stringify(check));
}
if (errors.length) console.log('ERRORS', errors);
await browser.close();
