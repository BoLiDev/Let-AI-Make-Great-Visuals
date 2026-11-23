// 按 make-interfaces-feel-better 的条目对成品做可执行的检查（技能本身不带脚本，这是为它的“Verification”一节写的）。
// 用法：node check.mjs   结果打印为 JSON，慢放帧写到 review/
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + join(HERE, 'scan-report.html');
const browser = await chromium.launch();
const R = {};

async function open(hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 1280, height: 1000 }, colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const remote = [], errors = [];
  page.on('request', (r) => { if (!/^(file|data|about):/.test(r.url())) remote.push(r.url()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL + hash);
  await page.evaluate(() => document.fonts.ready);
  if (!opts.noWait) await page.waitForTimeout(1000);
  return { page, remote, errors, ctx };
}

// 静态审计：transition: all、点击区域、等宽数字、字体平滑、溢出
const audit = () => {
  const out = { transitionAll: [], smallHits: [], overlappingHits: [] };
  for (const el of document.querySelectorAll('#app *')) {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && cs.content === 'none') continue;
      if (cs.transitionProperty.split(', ').includes('all') && cs.transitionDuration.split(', ').some((d) => parseFloat(d) > 0)) out.transitionAll.push((el.className || el.tagName) + (pseudo || ''));
    }
  }
  // 点击区域：从元素中心向上下左右探测 elementFromPoint，量出实际可点范围
  const owner = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest('a, button, input, summary, tr[data-href]'); };
  for (const el of document.querySelectorAll('#app a, #app button, #app input, #app summary')) {
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).visibility === 'hidden' || el.disabled) continue;
    if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const b = el.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const self = owner(cx, cy);
    const mine = (x, y) => { const o = owner(x, y); return o === el || (el.closest('tr[data-href]') && o === el.closest('tr[data-href]') && el.matches('.r-app-name')); };
    let up = 0, down = 0, left = 0, right = 0;
    while (up < 30 && mine(cx, cy - up - 1)) up++;
    while (down < 30 && mine(cx, cy + down + 1)) down++;
    while (left < 30 && mine(cx - left - 1, cy)) left++;
    while (right < 30 && mine(cx + right + 1, cy)) right++;
    const w = Math.max(b.width, left + right + 1), h = up + down + 1;
    const name = (el.className || el.tagName) + ':' + (el.textContent.trim().slice(0, 14) || el.getAttribute('aria-label') || '');
    if (self !== el && !mine(cx, cy)) out.overlappingHits.push(name);
    else if (w < 40 || h < 40) out.smallHits.push(`${name} ${Math.round(w)}x${h}`);
  }
  out.smallHits = [...new Set(out.smallHits)].slice(0, 12);
  window.scrollTo(0, 0);
  const de = document.documentElement;
  out.overflowX = de.scrollWidth - de.clientWidth;
  out.fontSmoothing = getComputedStyle(de).webkitFontSmoothing;
  out.tabular = [...document.querySelectorAll('td.is-num, .r-when, .r-h2 small, .r-chip b, .r-legend b, .r-bars-value')].every((e) => getComputedStyle(e).fontVariantNumeric.includes('tabular-nums'));
  out.h1Wrap = getComputedStyle(document.querySelector('h1')).textWrap || getComputedStyle(document.querySelector('h1')).textWrapStyle;
  out.iconStrokes = [...new Set([...document.querySelectorAll('#app svg')].map((s) => getComputedStyle(s).strokeWidth))];
  out.iconSizes = [...new Set([...document.querySelectorAll('#app svg')].map((s) => parseFloat(getComputedStyle(s.parentNode).width)))];
  out.images = document.images.length;
  return out;
};

for (const [name, hash] of [['list', '#/'], ['detail', '#/app/checkout']]) {
  const { page, remote, errors, ctx } = await open(hash);
  R[name] = { ...(await page.evaluate(audit)), remoteRequests: remote, errors };
  await ctx.close();
}

// 交互走查
{
  const { page, errors, ctx } = await open('#/');
  const w = {};
  await page.click('tr[data-href="#/app/checkout"] td:nth-child(2)'); await page.waitForTimeout(100);
  w.rowClickGoesToDetail = page.url().endsWith('#/app/checkout') && (await page.textContent('h1')).includes('收银台');
  w.detailRows = await page.locator('#detail-body tr').count();
  w.firstRow = (await page.locator('#detail-body tr').first().innerText()).replace(/\s+/g, ' ');
  w.locHref = await page.locator('#detail-body a.r-loc').first().getAttribute('href');
  await page.click('[data-filter="blocker"]');
  w.filterBlocker = [await page.locator('#detail-body tr').count(), await page.textContent('#detail-count')];
  await page.fill('[data-input="detail-q"]', 'zzz');
  w.emptyStateShown = await page.locator('.r-empty').isVisible();
  await page.click('[data-action="reset-detail"]');
  w.afterReset = await page.locator('#detail-body tr').count();
  await page.click('[data-sort="detail:time"]');
  w.sortTime = [await page.locator('th[aria-sort]').getAttribute('aria-sort'), (await page.locator('#detail-body .r-when').first().innerText()).split('\n')[0]];
  await page.click('.r-back'); await page.waitForTimeout(100);
  w.backGoesToList = /#\/$/.test(page.url()) && (await page.locator('#list-body tr').count());
  await page.fill('[data-input="list-q"]', '交易');
  w.searchList = [await page.locator('#list-body tr').count(), await page.textContent('#list-count')];
  w.clearVisible = await page.locator('.r-clear').evaluate((e) => getComputedStyle(e).visibility);
  await page.click('.r-clear');
  w.afterClear = [await page.locator('#list-body tr').count(), await page.evaluate(() => document.activeElement.dataset.input)];
  await page.focus('#list-body a.r-app-name'); await page.keyboard.press('Enter');
  w.keyboardEnter = page.url().split('#')[1];
  await page.goBack();
  w.browserBack = page.url().split('#')[1];
  // 按压：按住时 scale 应为 0.96
  const btn = page.locator('[data-action="theme"]');
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.waitForTimeout(300);
  w.pressScale = await btn.evaluate((e) => getComputedStyle(e).scale);
  await page.mouse.up(); await page.waitForTimeout(500);
  w.darkAfterClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  w.errors = errors;
  R.walk = w;
  await ctx.close();
}

// 慢放到 10%：主题图标交叉淡入淡出，中途再点一次看是否从当前值折返；首次入场的分段错开
{
  const { page, ctx } = await open('#/');
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
  const read = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-action="theme"] .r-swap-item')].map((e) => { const c = getComputedStyle(e); return [e.dataset.for, `opacity ${(+c.opacity).toFixed(2)} scale ${(+c.scale).toFixed(2)} ${c.filter}`]; })));
  const clip = { x: 1140, y: 0, width: 80, height: 60 };
  const frames = { rest: await read() };
  await page.click('[data-action="theme"]');
  await page.waitForTimeout(600); frames['10%速 600ms'] = await read(); await page.screenshot({ path: join(HERE, 'review/swap-10pct-600ms.png'), clip });
  await page.waitForTimeout(600); frames['10%速 1200ms'] = await read(); await page.screenshot({ path: join(HERE, 'review/swap-10pct-1200ms.png'), clip });
  await page.click('[data-action="theme"]'); // 中途打断
  await page.waitForTimeout(100); frames['打断后 100ms'] = await read();
  await page.waitForTimeout(4000); frames['打断后结束'] = await read();
  R.slowSwap = frames;
  await ctx.close();

  const s = await open('#/', { noWait: true });
  const cdp2 = await s.ctx.newCDPSession(s.page);
  await cdp2.send('Animation.enable');
  await cdp2.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
  await s.page.reload();
  const op = () => s.page.evaluate(() => [...document.querySelectorAll('.r-stagger')].map((e) => (+getComputedStyle(e).opacity).toFixed(2)).join(' '));
  R.slowStagger = {};
  for (const t of [1000, 2500, 4000, 8000]) {
    await s.page.waitForTimeout(t - (Object.keys(R.slowStagger).length ? [1000, 2500, 4000][Object.keys(R.slowStagger).length - 1] : 0));
    R.slowStagger[`10%速 ${t}ms`] = await op();
    if (t === 2500) await s.page.screenshot({ path: join(HERE, 'review/stagger-10pct-2500ms.png') });
  }
  await s.page.evaluate(() => { location.hash = '#/app/checkout'; });
  await s.page.waitForTimeout(200);
  R.staggerReplaysOnRouteChange = await s.page.evaluate(() => document.getAnimations().length > 0);
  await s.ctx.close();
}

// 深色、窄屏、减少动效
{
  const d = await open('#/app/checkout', { dark: true });
  R.dark = { cardShadow: await d.page.evaluate(() => getComputedStyle(document.querySelector('.r-card')).boxShadow), overflowX: await d.page.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
  await d.page.screenshot({ path: join(HERE, 'review/detail-dark.png') });
  await d.page.goto(URL + '#/'); await d.page.waitForTimeout(300);
  await d.page.screenshot({ path: join(HERE, 'review/list-dark.png') });
  await d.ctx.close();
  for (const [n, h] of [['list', '#/'], ['detail', '#/app/checkout']]) {
    const m = await open(h, { width: 390 });
    R[`narrow390-${n}`] = { overflowX: await m.page.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
    await m.page.screenshot({ path: join(HERE, `review/${n}-390.png`) });
    await m.ctx.close();
  }
  const r = await open('#/', { reduce: true, noWait: true });
  R.reducedMotion = { animations: await r.page.evaluate(() => document.getAnimations().length), opacity: await r.page.evaluate(() => getComputedStyle(document.querySelector('.r-stagger')).opacity) };
  await r.ctx.close();
}

console.log(JSON.stringify(R, null, 1));
await browser.close();
