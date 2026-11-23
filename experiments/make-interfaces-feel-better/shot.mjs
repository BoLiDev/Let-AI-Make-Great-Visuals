// 截图：1280x1000，deviceScaleFactor 2，非整页。等首次入场动画结束后再截。
// 用法：node shot.mjs [--dark] [--width=1280] [--prefix=]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const flags = process.argv.slice(2);
const opt = (k, d) => (flags.find((f) => f.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const dark = flags.includes('--dark');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +opt('width', 1280), height: +opt('height', 1000) }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
const errors = [];
for (const [name, hash] of [['list', '#/'], ['detail', '#/app/checkout']]) {
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('file://' + join(HERE, 'scan-report.html') + hash);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const check = await page.evaluate(() => {
    const de = document.documentElement;
    const text = document.getElementById('app').innerText;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, slopChars: [...new Set(text.match(/[·•‧∙⋅]|\p{Extended_Pictographic}/gu) || [])], running: document.getAnimations().filter((a) => a.playState === 'running').length };
  });
  const out = join(HERE, `${opt('prefix', '')}${name}.png`);
  await page.screenshot({ path: out });
  console.log(out, JSON.stringify(check));
  await page.close();
}
if (errors.length) console.log('ERRORS', errors);
await browser.close();
