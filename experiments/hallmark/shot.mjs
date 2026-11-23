// 截图：1280x1000 视口，2 倍像素，不截整页。用法：node shot.mjs [--dark] [--width=1280] [--prefix=]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const flags = process.argv.slice(2);
const opt = (k, d) => (flags.find((f) => f.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const dark = flags.includes('--dark');
const width = +opt('width', 1280), height = +opt('height', 1000), prefix = opt('prefix', '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => { if (!/^(file|data):/.test(r.url())) errors.push('外部请求 ' + r.url()); });
const file = 'file://' + join(HERE, 'scan-report.html');
for (const [name, hash] of [['list', '#/'], ['detail', '#/app/checkout']]) {
  await page.goto(file + hash);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const check = await page.evaluate(() => {
    const de = document.documentElement;
    const over = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1 && getComputedStyle(el).position !== 'absolute').slice(0, 5).map((el) => el.className || el.tagName);
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, over, h1: document.querySelector('h1').textContent, rows: document.querySelectorAll('tbody tr').length };
  });
  await page.screenshot({ path: join(HERE, `${prefix}${name}.png`) });
  console.log(name, JSON.stringify(check));
}
if (errors.length) console.log('ERRORS', errors);
await browser.close();
