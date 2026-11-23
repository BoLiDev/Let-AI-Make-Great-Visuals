// 截图并做基础检查。用法：node tools/shot.mjs <html> <输出前缀> [--dark] [--width=1280] [--scale=1] [--hash=#/app/checkout] [--full]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [file, prefix, ...flags] = process.argv.slice(2);
const opt = (k, d) => (flags.find((f) => f.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const has = (k) => flags.includes(`--${k}`);
const width = +opt('width', 1280);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: +opt('height', 900) }, deviceScaleFactor: +opt('scale', 1), colorScheme: has('dark') ? 'dark' : 'light' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const hashes = opt('hash', '#/,#/app/checkout').split(',');
for (const [i, hash] of hashes.entries()) {
  await page.goto('file://' + resolve(file) + hash);
  if (i === 0) await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const check = await page.evaluate(() => {
    const de = document.documentElement;
    const overflow = de.scrollWidth > de.clientWidth ? [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1 && !el.closest('#look-switcher')).slice(0, 5).map((el) => el.className || el.tagName) : [];
    // AI 味字符检查：间隔号、项目符号、emoji 不应出现在页面文字里。
    const text = document.getElementById('app').innerText;
    const slop = [...new Set(text.match(/[·•‧∙⋅]|\p{Extended_Pictographic}/gu) || [])];
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflow, slopChars: slop, fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family) };
  });
  const out = `${prefix}-${i === 0 ? 'list' : 'detail'}.png`;
  await page.screenshot({ path: out, fullPage: has('full') });
  console.log(out, JSON.stringify(check));
}
if (errors.length) console.log('ERRORS', errors);
await browser.close();
