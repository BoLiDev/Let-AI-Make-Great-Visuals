/* 扫描报告：渲染与交互。数据来自 window.REPORT，图标来自 window.ICONS（构建时注入）。
   在没有 document 的环境里（构建时），只把列表页的 HTML 交给 window.__prerender，供关闭脚本时显示。 */
(function (window) {
  const R = window.REPORT;
  const document = window.document;
  const root = document ? document.getElementById('app') : null;

  // 严重程度是模板固定的四级，数据里只需要引用 id。
  const SEV = [
    { id: 'blocker', label: '阻断' },
    { id: 'high', label: '严重' },
    { id: 'medium', label: '一般' },
    { id: 'low', label: '提示' },
  ];
  const SEV_RANK = Object.fromEntries(SEV.map((s, i) => [s.id, i]));
  const SEV_BY_ID = Object.fromEntries(SEV.map((s) => [s.id, s]));
  const TYPE_BY_ID = Object.fromEntries(R.types.map((t) => [t.id, t]));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name) => `<span class="icon" aria-hidden="true">${window.ICONS[name] || ''}</span>`;
  const link = (url, inner, cls = '') => (url ? `<a ${cls ? `class="${cls}"` : ''} href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : inner);

  function countBySev(issues) {
    const c = { blocker: 0, high: 0, medium: 0, low: 0 };
    for (const i of issues) c[i.severity]++;
    return c;
  }

  const scanDay = Date.parse(String(R.scannedAt || '').slice(0, 10));
  const ageOf = (date) => {
    const t = Date.parse(date);
    return Number.isNaN(t) || Number.isNaN(scanDay) ? null : Math.max(0, Math.round((scanDay - t) / 86400000));
  };

  // 预计算：补全每个问题的严重程度和距扫描日的天数，统计每个子应用。
  const apps = R.apps.map((a) => {
    const issues = (a.issues || []).map((i) => ({
      ...i,
      severity: i.severity || TYPE_BY_ID[i.type].severity,
      age: i.introducedAt ? ageOf(i.introducedAt) : null,
    }));
    return { ...a, issues, total: issues.length, sev: countBySev(issues) };
  });
  const dirty = apps.filter((a) => a.total > 0);
  const clean = apps.filter((a) => a.total === 0);
  const allIssues = apps.flatMap((a) => a.issues);
  const totals = countBySev(allIssues);
  const total = allIssues.length;
  const maxAppTotal = Math.max(1, ...dirty.map((a) => a.total));
  const hasTeam = apps.some((a) => a.team);
  const hasPath = apps.some((a) => a.path);
  const hasDate = allIssues.some((i) => i.introducedAt);
  const title = R.title || '代码扫描报告';

  const state = {
    list: { q: '', sort: 'blocker', dir: 'desc' },
    detail: { q: '', sort: 'severity', dir: 'asc' },
  };

  const isDark = () => {
    if (!document) return false;
    const m = document.documentElement.dataset.mode;
    return m ? m === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  function sortBtn(scope, key, label) {
    const s = state[scope];
    const active = s.sort === key;
    const ic = active ? (s.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down';
    return `<button type="button" class="sort" data-sort="${scope}:${key}" ${active ? 'data-active' : ''}>${label}${icon(ic)}</button>`;
  }
  const ariaSort = (scope, key) => (state[scope].sort === key ? `aria-sort="${state[scope].dir === 'asc' ? 'ascending' : 'descending'}"` : '');

  const num = (n, cls = '') => `<td class="num ${cls} ${n ? '' : 'is-zero'}">${n}</td>`;

  /* ---------- 顶栏 ---------- */

  function topbar() {
    const dark = isDark();
    const repo = R.repo || {};
    const item = (dt, dd) => `<div><dt>${dt}</dt><dd class="mono">${dd}</dd></div>`;
    return `
    <header class="top">
      <div class="container top__in">
        <dl class="meta">
          ${repo.name ? item('仓库', link(repo.url, esc(repo.name))) : ''}
          ${R.branch ? item('分支', esc(R.branch)) : ''}
          ${R.commit ? item('提交', esc(R.commit)) : ''}
          ${R.scannedAt ? item('扫描时间', esc(R.scannedAt)) : ''}
        </dl>
        <button type="button" class="btn" data-action="theme">${icon(dark ? 'sun' : 'moon')}${dark ? '浅色模式' : '深色模式'}</button>
      </div>
    </header>`;
  }

  /* ---------- 摘要栏里的两张横条表 ---------- */

  // 一组数量的横条：只有“阻断”用强调色，其余同一种墨色。
  function barRows(rows) {
    const max = Math.max(1, ...rows.map((r) => r.n));
    return `<table class="bars"><tbody>${rows.map((r) => `
      <tr ${r.tone ? `data-tone="${r.tone}"` : ''}>
        <th scope="row">${esc(r.label)}</th>
        <td class="bars__track"><span class="bar" aria-hidden="true" style="width:${(r.n / max) * 100}%"><i ${r.tone ? `data-tone="${r.tone}"` : ''} style="flex:1"></i></span></td>
        <td class="num">${r.n}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  const sevRows = (counts) => barRows(SEV.map((s) => ({ label: s.label, n: counts[s.id], tone: s.id === 'blocker' ? 'blocker' : '' })));

  function typeRows(issues) {
    const rows = R.types
      .map((t) => ({ label: t.label, n: issues.filter((i) => i.type === t.id).length, tone: t.severity === 'blocker' ? 'blocker' : '' }))
      .filter((t) => t.n)
      .sort((a, b) => b.n - a.n);
    return rows.length ? barRows(rows) : '';
  }

  const fig = (label, value, tone) => `<div><dt>${label}</dt><dd ${tone ? `data-tone="${tone}"` : ''}>${value}</dd></div>`;

  function summary(issues, counts, extra) {
    return `
      <section aria-label="概览">
        <dl class="figs">
          ${fig('问题总数', issues.length)}
          ${fig('阻断', counts.blocker, counts.blocker ? 'blocker' : '')}
        </dl>
        ${extra || ''}
      </section>
      <section>
        <h2>严重程度</h2>
        ${sevRows(counts)}
      </section>
      <section>
        <h2>问题种类</h2>
        ${typeRows(issues)}
      </section>`;
  }

  /* ---------- 列表页 ---------- */

  // 每行一条：长度是问题数相对最多的那个子应用，品红的一段是阻断。
  function rowBar(a) {
    const rest = a.total - a.sev.blocker;
    return `<span class="bar" aria-hidden="true" style="width:${Math.max((a.total / maxAppTotal) * 100, 2)}%">${a.sev.blocker ? `<i data-tone="blocker" style="flex:${a.sev.blocker}"></i>` : ''}${rest ? `<i style="flex:${rest}"></i>` : ''}</span>`;
  }

  function listTable() {
    const { q, sort, dir } = state.list;
    const kw = q.trim().toLowerCase();
    const key = sort === 'blocker' ? (a) => a.sev.blocker * 100000 + a.total : (a) => a.total;
    const rows = dirty
      .filter((a) => !kw || [a.id, a.name, a.path, a.team].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    if (!rows.length) {
      return `<div class="empty"><strong>没有匹配的子应用</strong>
        <button type="button" class="btn" data-action="reset-list">清除搜索</button></div>`;
    }
    return `
    <table class="tbl tbl--apps">
      <thead>
        <tr>
          <th scope="col">子应用</th>
          ${hasPath ? '<th scope="col" class="col-path">路径</th>' : ''}
          ${hasTeam ? '<th scope="col" class="col-team">负责团队</th>' : ''}
          <th scope="col" class="num" ${ariaSort('list', 'blocker')}>${sortBtn('list', 'blocker', '阻断')}</th>
          <th scope="col" class="num col-mid">严重</th>
          <th scope="col" class="num col-mid">一般</th>
          <th scope="col" class="num col-mid">提示</th>
          <th scope="col" class="num" ${ariaSort('list', 'total')}>${sortBtn('list', 'total', '问题数')}</th>
          <th scope="col" class="col-bar"><span class="visually-hidden">问题数对比</span></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((a) => `
        <tr data-href="#/app/${encodeURIComponent(a.id)}">
          <td><a class="app-name" href="#/app/${encodeURIComponent(a.id)}">${esc(a.name)}</a></td>
          ${hasPath ? `<td class="col-path mono muted">${esc(a.path || '')}</td>` : ''}
          ${hasTeam ? `<td class="col-team">${esc(a.team || '')}</td>` : ''}
          <td class="num ${a.sev.blocker ? '' : 'is-zero'}" ${a.sev.blocker ? 'data-tone="blocker"' : ''}>${a.sev.blocker}</td>
          ${num(a.sev.high, 'col-mid')}
          ${num(a.sev.medium, 'col-mid')}
          ${num(a.sev.low, 'col-mid')}
          <td class="num total">${a.total}</td>
          <td class="col-bar">${rowBar(a)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function listHTML() {
    if (!total) {
      return `${topbar()}
      <div class="container page">
        <aside class="rail"><header class="rail__head"><h1>${esc(title)}</h1></header></aside>
        <section class="sheet"><div class="empty">${icon('circle-check')}<strong>未发现问题</strong><span>已扫描 ${apps.length} 个子应用</span></div></section>
      </div>`;
    }
    return `
    ${topbar()}
    <div class="container page">
      <aside class="rail">
        <header class="rail__head"><h1>${esc(title)}</h1></header>
        ${summary(allIssues, totals, `<p class="note">${apps.length} 个子应用中有 ${dirty.length} 个存在问题</p>`)}
      </aside>

      <section class="sheet">
        <div class="sheet__head">
          <h2>存在问题的子应用<small>${dirty.length} 个</small></h2>
          <label class="search">${icon('search')}<span class="visually-hidden">搜索子应用</span>
            <input type="search" name="q" autocomplete="off" placeholder="搜索子应用" value="${esc(state.list.q)}" data-input="list-q"></label>
        </div>
        <div id="list-table">${listTable()}</div>
        ${clean.length ? `
        <details class="clean">
          <summary>${icon('chevron-right')}另有 ${clean.length} 个子应用未发现问题</summary>
          <ul>${clean.map((a) => `<li><span>${esc(a.name)}</span>${a.path ? `<span class="mono">${esc(a.path)}</span>` : ''}</li>`).join('')}</ul>
        </details>` : ''}
        ${R.footnote ? `<footer class="foot">${esc(R.footnote)}</footer>` : ''}
      </section>
    </div>`;
  }

  /* ---------- 详情页 ---------- */

  function detailTable(app) {
    const { q, sort, dir } = state.detail;
    const kw = q.trim().toLowerCase();
    const key = sort === 'severity' ? (i) => SEV_RANK[i.severity] * 100000 + (i.age ?? 99999) : (i) => i.age ?? 99999;
    const rows = app.issues
      .filter((i) => !kw || [TYPE_BY_ID[i.type].label, SEV_BY_ID[i.severity].label, i.message, i.file, i.author].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    if (!rows.length) {
      return `<div class="empty"><strong>没有匹配的问题</strong>
        <button type="button" class="btn" data-action="reset-detail">清除搜索</button></div>`;
    }
    const prefix = app.path ? app.path.replace(/\/?$/, '/') : '';
    const loc = (i) => {
      const short = prefix && i.file.startsWith(prefix) ? i.file.slice(prefix.length) : i.file;
      const text = `${esc(short)}${i.line ? `:${i.line}` : ''}`;
      return i.url
        ? `<a class="loc mono" href="${esc(i.url)}" target="_blank" rel="noopener" title="在代码仓库中查看">${text}</a>`
        : `<span class="loc mono">${text}</span>`;
    };
    const when = (i) => {
      if (!i.introducedAt) return '';
      return `<span class="mono">${esc(i.introducedAt)}</span>${i.author ? `<span class="when__who">${esc(i.author)}</span>` : ''}`;
    };
    return `
    <table class="tbl tbl--issues">
      <thead>
        <tr>
          <th scope="col" ${ariaSort('detail', 'severity')}>${sortBtn('detail', 'severity', '严重程度')}</th>
          <th scope="col">问题</th>
          <th scope="col">位置</th>
          ${hasDate ? `<th scope="col" ${ariaSort('detail', 'time')}>${sortBtn('detail', 'time', '引入时间')}</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${rows.map((i) => `
        <tr>
          <td><span class="sev" data-sev="${i.severity}">${SEV_BY_ID[i.severity].label}</span></td>
          <td>
            <div class="issue__type">${esc(TYPE_BY_ID[i.type].label)}</div>
            ${i.message ? `<div class="issue__msg">${esc(i.message)}</div>` : ''}
          </td>
          <td>${loc(i)}</td>
          ${hasDate ? `<td class="when">${when(i)}</td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function detailHTML(app) {
    const facts = [
      app.path ? `<div><dt>路径</dt><dd class="mono">${link(app.url, esc(app.path))}</dd></div>` : '',
      app.team ? `<div><dt>负责团队</dt><dd>${esc(app.team)}</dd></div>` : '',
    ].join('');
    return `
    ${topbar()}
    <div class="container page">
      <aside class="rail">
        <header class="rail__head">
          <nav class="crumb" aria-label="面包屑"><a href="#/">${esc(title)}</a></nav>
          <h1>${esc(app.name)}</h1>
          ${facts ? `<dl class="facts">${facts}</dl>` : ''}
        </header>
        ${summary(app.issues, app.sev)}
      </aside>

      <section class="sheet">
        <div class="sheet__head">
          <h2>问题列表<small>${app.total} 个</small></h2>
          <label class="search">${icon('search')}<span class="visually-hidden">搜索问题</span>
            <input type="search" name="q" autocomplete="off" placeholder="搜索问题" value="${esc(state.detail.q)}" data-input="detail-q"></label>
        </div>
        <div id="detail-table">${detailTable(app)}</div>
      </section>
    </div>`;
  }

  // 构建时：只输出列表页，供关闭脚本时显示。
  if (!document) {
    window.__prerender = listHTML();
    return;
  }

  /* ---------- 路由与事件 ---------- */

  function currentApp() {
    const m = location.hash.match(/^#\/app\/(.+)$/);
    if (!m) return null;
    const id = decodeURIComponent(m[1]);
    return apps.find((a) => String(a.id) === id && a.total > 0) || null;
  }

  function render() {
    const app = currentApp();
    root.innerHTML = app ? detailHTML(app) : listHTML();
    document.title = app ? `${app.name} | ${title}` : title;
  }

  let lastApp = null;
  window.addEventListener('hashchange', () => {
    const app = currentApp();
    if (app && app.id !== lastApp) state.detail = { q: '', sort: 'severity', dir: 'asc' };
    lastApp = app ? app.id : null;
    render();
    window.scrollTo(0, 0);
  });

  const refreshList = () => (document.getElementById('list-table').innerHTML = listTable());
  const refreshDetail = () => (document.getElementById('detail-table').innerHTML = detailTable(currentApp()));

  root.addEventListener('input', (e) => {
    const k = e.target.dataset.input;
    if (k === 'list-q') { state.list.q = e.target.value; refreshList(); }
    if (k === 'detail-q') { state.detail.q = e.target.value; refreshDetail(); }
  });

  root.addEventListener('click', (e) => {
    const sortEl = e.target.closest('[data-sort]');
    if (sortEl) {
      const [scope, key] = sortEl.dataset.sort.split(':');
      const s = state[scope];
      if (s.sort === key) s.dir = s.dir === 'asc' ? 'desc' : 'asc';
      else { s.sort = key; s.dir = scope === 'list' ? 'desc' : 'asc'; }
      scope === 'list' ? refreshList() : refreshDetail();
      const again = root.querySelector(`[data-sort="${scope}:${key}"]`);
      if (again) again.focus();
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) {
      const a = action.dataset.action;
      if (a === 'theme') {
        const mode = isDark() ? 'light' : 'dark';
        document.documentElement.dataset.mode = mode;
        try { localStorage.setItem('report-theme', mode); } catch (_) {}
        render();
        const btn = root.querySelector('[data-action="theme"]');
        if (btn) btn.focus();
      }
      if (a === 'reset-list') { state.list.q = ''; render(); }
      if (a === 'reset-detail') { state.detail.q = ''; render(); }
      return;
    }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
  });

  lastApp = currentApp() ? currentApp().id : null;
  window.__rerender = render;
  render();
})(typeof window !== 'undefined' ? window : globalThis);
