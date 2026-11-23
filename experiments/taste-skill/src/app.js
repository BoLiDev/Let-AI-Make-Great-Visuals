/* 扫描报告（tasteskill 2.5.1 试验版）：渲染与交互。
   同一份代码在构建时（Node）预渲染列表页，在浏览器里渲染详情页并绑定交互。
   版式用的是 tasteskill 套件的类名（.hero--split、.section、.rows、.stats、.footer.closing 等）。 */
(function (global) {
  const SEV = [
    { id: 'blocker', label: '阻断' },
    { id: 'high', label: '严重' },
    { id: 'medium', label: '一般' },
    { id: 'low', label: '提示' },
  ];
  const SEV_RANK = Object.fromEntries(SEV.map((s, i) => [s.id, i]));
  const SEV_BY_ID = Object.fromEntries(SEV.map((s) => [s.id, s]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ARROW = '<svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="m-arrow__stem" d="M1 6h8"/><path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';
  const MARK = '<span class="mark" data-mark="arc" aria-hidden="true"></span>';
  const ext = (url) => `href="${esc(url)}" target="_blank" rel="noopener"`;

  function model(R) {
    const typeById = Object.fromEntries(R.types.map((t) => [t.id, t]));
    const count = (issues) => {
      const c = { blocker: 0, high: 0, medium: 0, low: 0 };
      for (const i of issues) c[i.severity]++;
      return c;
    };
    const apps = R.apps.map((a) => {
      const prefix = a.path ? a.path.replace(/\/?$/, '/') : '';
      const issues = (a.issues || []).map((i) => ({
        ...i,
        severity: i.severity || typeById[i.type].severity,
        typeLabel: typeById[i.type].label,
        short: prefix && i.file.startsWith(prefix) ? i.file.slice(prefix.length) : i.file,
        app: a,
      }));
      return { ...a, issues, total: issues.length, sev: count(issues) };
    });
    const dirty = apps.filter((a) => a.total).sort((a, b) => b.sev.blocker - a.sev.blocker || b.total - a.total);
    const all = apps.flatMap((a) => a.issues);
    return {
      R, typeById, apps, dirty, all,
      clean: apps.filter((a) => !a.total),
      totals: count(all),
      title: R.title || '代码扫描报告',
      repoShort: R.repo && R.repo.name ? R.repo.name.split('/').pop() : '',
    };
  }

  /* ---------- 共用零件 ---------- */

  const sevbar = (c, scale = 1) => {
    const present = SEV.filter((s) => c[s.id]);
    const label = present.map((s) => `${s.label} ${c[s.id]}`).join('，');
    return `<span class="sevbar" role="img" aria-label="${label}" style="width:${Math.max(scale * 100, 3)}%">${present.map((s) => `<i data-sev="${s.id}" style="flex:${c[s.id]} 0 0"></i>`).join('')}</span>`;
  };
  const sevTag = (id) => `<span class="sev t-label" data-sev="${id}">${SEV_BY_ID[id].label}</span>`;
  const sevStats = (c) => `
        <div class="sevsum">
          ${sevbar(c)}
          <div class="stats" data-moment="counter-rolls">
            ${SEV.map((s) => `<div class="stat" data-sev="${s.id}"><p class="t-stat">${c[s.id]}</p><p class="t-small muted">${s.label}</p></div>`).join('')}
          </div>
        </div>`;
  const typeCounts = (M, issues) => M.R.types.map((t) => ({ ...t, n: issues.filter((i) => i.type === t.id).length })).filter((t) => t.n).sort((a, b) => b.n - a.n);
  const typeRows = (M, issues) => {
    const counts = typeCounts(M, issues);
    const max = Math.max(1, ...counts.map((t) => t.n));
    return `<ul class="rows typerows">${counts.map((t) => `
            <li><span class="rows__name">${esc(t.label)}</span>${sevTag(t.severity)}<span class="bar"><i data-sev="${t.severity}" style="width:${(t.n / max) * 100}%"></i></span><span class="rows__value">${t.n}</span></li>`).join('')}
          </ul>`;
  };
  // 一屏约放 9 行、两屏约 21 行；更长的清单按内容撑高（套件的"一段一屏"在这里放不下）。
  const screens = (rows, one, two) => (rows <= one ? 'style="--h: 1"' : rows <= two ? 'style="--h: 2"' : 'data-long');

  function nav(M, words, action) {
    return `<header class="nav nav--centre">
  <div class="wrap nav__bar">
    <a class="skip-link" href="#top">跳到正文</a>
    <a class="nav__logo" href="#top" data-home>${MARK}${esc(M.title)}</a>
    <nav class="nav__links" aria-label="主导航">
      ${words.map((w) => `<div class="nav__item"><a class="nav__link" ${w.ext ? ext(w.href) : `href="${w.href}"`}>${w.label}</a></div>`).join('\n      ')}
    </nav>
    <div class="nav__actions"><a class="btn btn--primary" href="${action.href}">${action.label}</a></div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="菜单">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
  </div>
</header>`;
  }

  function footer(M, { h2, line, action, word, cols }) {
    const R = M.R;
    const n = [...word].reduce((w, ch) => w + (/[⺀-￿]/.test(ch) ? 1 : 0.58), 0);
    return `<footer class="footer closing" id="close" aria-labelledby="close-h">
  <div class="wrap">
    <div class="closing__cta close--word">
      <div class="section-head--split">
        <div><h2 id="close-h">${h2}</h2><p class="t-lead">${line}</p></div>
        <a class="btn btn--primary" href="${action.href}">${action.label}${ARROW}</a>
      </div>
      <p class="close__word" aria-hidden="true" style="--word-n:${n.toFixed(2)}">${esc(word)}</p>
    </div>
    <div class="closing__links">
      <div class="grid">
        <div class="span-4 stack-4">
          <a class="nav__logo" href="#top" data-home>${MARK}${esc(M.title)}</a>
          <p class="footer__lede">${R.repo && R.repo.name ? `${esc(R.repo.name)} 的扫描结果` : '按子应用整理的扫描结果'}</p>
        </div>
        ${cols.map((c, i) => `<div class="span-2 ${i === 0 ? 'start-7 ' : ''}footer__col"><h3>${c.head}</h3><ul>${c.links.map((l) => `<li>${l.href ? `<a ${l.ext ? ext(l.href) : `href="${l.href}"`}>${l.label}</a>` : `<span>${l.label}</span>`}</li>`).join('')}</ul></div>`).join('\n        ')}
      </div>
      <div class="footer__legal">
        <span>${R.scannedAt ? `扫描于 ${esc(R.scannedAt)}` : esc(M.title)}</span>
        ${R.footnote ? `<span>${esc(R.footnote)}</span>` : ''}
      </div>
    </div>
  </div>
</footer>`;
  }

  const repoCol = (M) => {
    const R = M.R;
    const links = [];
    if (R.repo && R.repo.name) links.push({ label: esc(R.repo.name), href: R.repo.url, ext: true });
    if (R.branch) links.push({ label: `分支 <span class="mono">${esc(R.branch)}</span>` });
    if (R.commit) links.push({ label: `提交 <span class="mono">${esc(R.commit)}</span>` });
    return links.length ? [{ head: '仓库', links }] : [];
  };
  const facts = (items) => `<dl class="hero-facts">${items.filter(Boolean).slice(0, 3).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

  /* ---------- 列表页 ---------- */

  function appRows(M, st) {
    const kw = st.q.trim().toLowerCase();
    const key = st.sort === 'blocker' ? (a) => a.sev.blocker * 100000 + a.total : (a) => a.total;
    const rows = M.dirty
      .filter((a) => !kw || [a.id, a.name, a.path, a.team].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (st.dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    if (!rows.length) return `<p class="empty">没有名称、目录或团队包含“${esc(st.q)}”的子应用。<button type="button" class="link" data-reset>清除搜索</button></p>`;
    const max = Math.max(1, ...M.dirty.map((a) => a.total));
    return `<ul class="rows applist">${rows.map((a) => `
            <li><a class="approw" href="#/app/${encodeURIComponent(a.id)}">
              <span class="rows__name">${esc(a.name)}${a.path ? `<small class="mono">${esc(a.path)}</small>` : ''}</span>
              <span class="approw__team">${esc(a.team || '')}</span>
              <span class="num"${a.sev.blocker ? ' data-sev="blocker"' : ' data-zero'}>${a.sev.blocker}</span>
              <span class="num">${a.total}</span>
              <span class="approw__bar">${sevbar(a.sev, a.total / max)}</span>
            </a></li>`).join('')}
          </ul>`;
  }
  const sortBtn = (st, key, label) => `<button type="button" class="sort t-label" data-sort="${key}"${st.sort === key ? ` data-on aria-pressed="true"` : ' aria-pressed="false"'}>${label}<span aria-hidden="true">${st.sort === key ? (st.dir === 'asc' ? '↑' : '↓') : ''}</span></button>`;
  const appHead = (st) => `<span>子应用</span><span>负责团队</span>${sortBtn(st, 'blocker', '阻断')}${sortBtn(st, 'total', '问题')}<span>严重程度分布</span>`;

  function renderList(M, st) {
    const R = M.R;
    const t = M.totals;
    const total = M.all.length;
    const blockers = M.all.filter((i) => i.severity === 'blocker');
    const blockerApps = M.dirty.filter((a) => a.sev.blocker);
    const main = { label: '查看子应用清单', href: '#apps' };
    const words = [{ label: '阻断', href: '#top' }, { label: '子应用', href: '#apps' }, { label: '种类', href: '#types' }];
    if (R.repo && R.repo.url) words.push({ label: '仓库', href: R.repo.url, ext: true });

    const panel = blockers.length
      ? `<p class="t-card panelui__head">${blockers.length} 个阻断问题</p>
          <ul class="blk">${blockers.slice(0, 9).map((i) => `
            <li><a href="#/app/${encodeURIComponent(i.app.id)}"><span class="blk__type">${esc(i.typeLabel)}</span><span class="blk__app">${esc(i.app.name)}</span><span class="blk__loc mono">${esc(i.short)}${i.line ? `:${i.line}` : ''}</span></a></li>`).join('')}
          </ul>`
      : `<p class="t-card panelui__head">问题最多的种类</p>${typeRows(M, M.all)}`;

    const hero = `<section class="hero hero--split" data-enter aria-labelledby="hero-h">
    <div class="wrap"><div class="hero-text grid hero__grid">
      <div class="hero__text span-5">
        ${R.repo && R.repo.name ? `<p class="hero__kicker"><span class="mono">${esc(R.repo.name)}</span></p>` : ''}
        <h1 id="hero-h">${esc(M.title)}<span class="muted">${total} 个问题</span><span class="muted">${t.blocker} 个阻断</span></h1>
        <p class="hero__lead">${M.apps.length} 个子应用里有 ${M.dirty.length} 个存在问题。${t.blocker ? `阻断问题要在发布前修复，分布在 ${blockerApps.length} 个子应用里。` : '本次没有阻断问题。'}</p>
        <div class="btn-row"><a class="btn btn--primary" href="${main.href}">${main.label}${ARROW}</a><a class="btn btn--secondary" href="#types">查看问题种类</a></div>
        ${facts([R.scannedAt && ['扫描时间', esc(R.scannedAt)], R.branch && ['分支', `<span class="mono">${esc(R.branch)}</span>`], R.commit && ['提交', `<span class="mono">${esc(R.commit)}</span>`]])}
      </div>
      <div class="hero__media panelui ui ui-panel span-6 start-7">
        ${panel}
      </div>
    </div></div>
  </section>`;

    const apps = `<section class="section" id="apps" aria-labelledby="apps-h" ${screens(M.dirty.length, 8, 20)}>
    <div class="wrap">
      <div class="listhead">
        <h2 id="apps-h">${M.dirty.length} 个子应用存在问题</h2>
        <div class="field"><label for="q">搜索子应用</label><input id="q" type="search" autocomplete="off" value="${esc(st.q)}" data-q></div>
      </div>
      <div class="applist__head t-label muted" data-head>${appHead(st)}</div>
      <div data-rows>${appRows(M, st)}</div>
      ${M.clean.length ? `<p class="cleanline"><span class="t-label muted">另有 ${M.clean.length} 个子应用未发现问题</span>${M.clean.map((a) => esc(a.name)).join('、')}</p>` : ''}
    </div>
  </section>`;

    const types = `<section class="section" id="types" aria-labelledby="types-h">
    <div class="wrap">
      <div class="section-head"><h2 id="types-h">${typeCounts(M, M.all).length} 种问题，按数量排列</h2></div>
      <div class="grid grid--top">
        <div class="span-5">${sevStats(t)}</div>
        <div class="span-6 start-7">${typeRows(M, M.all)}</div>
      </div>
    </div>
  </section>`;

    const top = blockerApps[0] || M.dirty[0];
    return {
      title: `${M.title}：${R.repo && R.repo.name ? R.repo.name + ' ' : ''}各子应用的问题清单`,
      nav: nav(M, words, main),
      main: total ? `${hero}\n${apps}\n${types}` : `<section class="hero" data-enter><div class="wrap"><div class="hero-text"><h1>${esc(M.title)}<span class="muted">未发现问题</span></h1><p class="hero__lead">已扫描 ${M.apps.length} 个子应用。</p></div></div></section>`,
      footer: footer(M, {
        h2: t.blocker ? `先修复 ${t.blocker} 个阻断问题` : '从问题最多的子应用开始',
        line: top ? `${esc(top.name)}最多，有 ${t.blocker ? top.sev.blocker + ' 个阻断、' : ''}${top.total} 个问题。` : '',
        action: main,
        word: M.repoShort || M.title,
        cols: [{ head: '报告', links: [{ label: '阻断问题', href: '#top' }, { label: '子应用', href: '#apps' }, { label: '问题种类', href: '#types' }] }, ...repoCol(M)],
      }),
    };
  }

  /* ---------- 详情页 ---------- */

  function issueRows(app, st) {
    const kw = st.q.trim().toLowerCase();
    const time = (i) => (i.introducedAt ? Date.parse(i.introducedAt) : 0);
    const key = st.sort === 'severity' ? (i) => SEV_RANK[i.severity] * 1e14 - time(i) : (i) => -time(i);
    const rows = app.issues
      .filter((i) => !kw || [i.typeLabel, SEV_BY_ID[i.severity].label, i.message, i.file, i.author, i.mr].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (st.dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    if (!rows.length) return `<p class="empty">没有种类、说明、文件或作者包含“${esc(st.q)}”的问题。<button type="button" class="link" data-reset>清除搜索</button></p>`;
    return `<ul class="rows issues">${rows.map((i) => {
      const loc = `${esc(i.short)}${i.line ? `:${i.line}` : ''}`;
      return `
            <li>
              ${sevTag(i.severity)}
              <div class="issue__what"><span class="rows__name">${esc(i.typeLabel)}</span>${i.message ? `<p>${esc(i.message)}</p>` : ''}</div>
              <div class="issue__loc">${i.url ? `<a class="m-link mono" ${ext(i.url)} title="在代码仓库中打开">${loc}</a>` : `<span class="mono">${loc}</span>`}</div>
              <div class="issue__when">${i.introducedAt ? `<span>${esc(i.introducedAt)}</span>` : ''}${i.author || i.mr ? `<small>${[i.author, i.mr].filter(Boolean).map(esc).join(' ')}</small>` : ''}</div>
            </li>`;
    }).join('')}
          </ul>`;
  }
  const issueHead = (st) => `${sortBtn(st, 'severity', '严重程度')}<span>问题种类和说明</span><span>代码位置</span>${sortBtn(st, 'time', '引入时间')}`;

  function renderDetail(M, app, st) {
    const main = { label: '返回子应用清单', href: '#apps' };
    const dates = app.issues.map((i) => i.introducedAt).filter(Boolean).sort();
    const idx = M.dirty.indexOf(app);
    const next = M.dirty[(idx + 1) % M.dirty.length];
    const hero = `<section class="hero hero--split" data-enter aria-labelledby="hero-h">
    <div class="wrap"><div class="hero-text grid hero__grid">
      <div class="hero__text span-5">
        <p class="hero__kicker"><a class="m-link" href="#top" data-home>${esc(M.title)}</a><span aria-hidden="true">/</span><span>${esc(app.name)}</span></p>
        <h1 id="hero-h">${esc(app.name)}<span class="muted">${app.total} 个问题</span><span class="muted">${app.sev.blocker} 个阻断</span></h1>
        <p class="hero__lead">${app.sev.blocker ? `${app.sev.blocker} 个阻断问题要在发布前修复。` : '没有阻断问题。'}每个问题都带代码位置和引入时间${dates.length ? `，最早的一个引入于 ${esc(dates[0])}` : ''}。</p>
        <div class="btn-row"><a class="btn btn--primary" href="#issues" data-scroll>查看问题清单${ARROW}</a>${app.url ? `<a class="btn btn--secondary" ${ext(app.url)}>打开代码目录</a>` : ''}</div>
        ${facts([app.team && ['负责团队', esc(app.team)], app.path && ['代码目录', `<span class="mono">${esc(app.path)}</span>`], dates.length && ['最近引入', esc(dates[dates.length - 1])]])}
      </div>
      <div class="hero__media panelui ui ui-panel span-6 start-7">
        <p class="t-card panelui__head">${typeCounts(M, app.issues).length} 种问题</p>
        ${typeRows(M, app.issues)}
      </div>
    </div></div>
  </section>`;
    const issues = `<section class="section" id="issues" aria-labelledby="issues-h" data-long>
    <div class="wrap">
      <div class="listhead">
        <h2 id="issues-h">${esc(app.name)}的 ${app.total} 个问题</h2>
        <div class="field"><label for="q">搜索问题</label><input id="q" type="search" autocomplete="off" value="${esc(st.q)}" data-q></div>
      </div>
      ${sevStats(app.sev)}
      <div class="issues__head t-label muted" data-head>${issueHead(st)}</div>
      <div data-rows>${issueRows(app, st)}</div>
    </div>
  </section>`;
    return {
      title: `${app.name}：${M.title}里的 ${app.total} 个问题`,
      nav: nav(M, [{ label: '报告', href: '#top', home: true }, { label: '概览', href: '#hero-h' }, { label: '问题', href: '#issues' }].map((w) => w), main),
      main: `${hero}\n${issues}`,
      footer: footer(M, {
        h2: next && next !== app ? `下一个：${esc(next.name)}` : '回到子应用清单',
        line: next && next !== app ? `${esc(next.name)}有 ${next.sev.blocker ? next.sev.blocker + ' 个阻断、' : ''}${next.total} 个问题。` : '',
        action: next && next !== app ? { label: `查看${esc(next.name)}`, href: `#/app/${encodeURIComponent(next.id)}` } : main,
        word: app.id,
        cols: [{ head: '报告', links: [{ label: '全部子应用', href: '#apps' }, { label: '问题种类', href: '#types' }] }, ...repoCol(M)],
      }),
    };
  }

  const api = { model, renderList, renderDetail, appRows, appHead, issueRows, issueHead };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  /* ---------- 浏览器：路由与交互 ---------- */
  const M = model(global.REPORT);
  const appOf = (hash) => {
    const m = hash.match(/^#\/app\/(.+)$/);
    return m ? M.dirty.find((a) => String(a.id) === decodeURIComponent(m[1])) || null : null;
  };
  const app = appOf(location.hash);
  const st = app ? { q: '', sort: 'severity', dir: 'asc' } : { q: '', sort: 'blocker', dir: 'desc' };

  if (app) {
    // 列表页已在构建时写进 HTML；详情页在套件脚本启动前整页换掉。
    const page = renderDetail(M, app, st);
    document.querySelector('header.nav').outerHTML = page.nav;
    document.querySelector('main').innerHTML = page.main;
    document.querySelector('footer.closing').outerHTML = page.footer;
    document.title = page.title;
    document.documentElement.dataset.view = 'detail';
    scrollTo(0, 0);
  } else {
    document.documentElement.dataset.view = 'list';
  }

  // 列表和详情之间切换时整页重载：套件的进场动画、数字滚动和导航脚本只在载入时启动一次。
  addEventListener('hashchange', () => {
    if (appOf(location.hash) !== app || (app && !location.hash.startsWith('#/app/'))) location.reload();
  });

  const rowsEl = () => document.querySelector('[data-rows]');
  const refresh = () => {
    rowsEl().innerHTML = app ? issueRows(app, st) : appRows(M, st);
    document.querySelector('[data-head]').innerHTML = app ? issueHead(st) : appHead(st);
  };
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) { st.q = e.target.value; rowsEl().innerHTML = app ? issueRows(app, st) : appRows(M, st); }
  });
  document.addEventListener('click', (e) => {
    const sort = e.target.closest('[data-sort]');
    if (sort) {
      const k = sort.dataset.sort;
      if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
      else { st.sort = k; st.dir = app ? 'asc' : 'desc'; }
      refresh();
      document.querySelector(`[data-sort="${k}"]`).focus();
      return;
    }
    if (e.target.closest('[data-reset]')) { st.q = ''; document.querySelector('[data-q]').value = ''; refresh(); return; }
    if (!app) return;
    // 详情页里的页内链接不改地址（地址里是 #/app/<id>），只滚动。
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (a.hasAttribute('data-home') || href === '#top' && a.closest('.nav__links, .hero__kicker, .footer')) { e.preventDefault(); location.hash = '#top'; return; }
    if (href === '#issues' || href === '#hero-h') {
      e.preventDefault();
      (href === '#issues' ? document.getElementById('issues') : document.documentElement).scrollIntoView({ block: 'start' });
    }
  });
  if (!app && location.hash && !location.hash.startsWith('#/')) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) addEventListener('load', () => target.scrollIntoView({ block: 'start' }));
  }
})(typeof window !== 'undefined' ? window : globalThis);
