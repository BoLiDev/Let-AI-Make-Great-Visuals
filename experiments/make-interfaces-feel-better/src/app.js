/* 扫描报告：渲染与交互。数据来自 window.REPORT，图标来自 window.ICONS（构建时注入）。
 * 结构上和原版的区别：顶栏只渲染一次，表头在排序/搜索时不重建，只换 tbody。
 * 这样主题图标、排序箭头、清除按钮的过渡才能被打断和反向（见 report.css 的 .r-swap）。 */
(function () {
  const R = window.REPORT;
  const root = document.getElementById('app');

  const SEV = [
    { id: 'blocker', label: '阻断' },
    { id: 'high', label: '严重' },
    { id: 'medium', label: '一般' },
    { id: 'low', label: '提示' },
  ];
  const SEV_RANK = Object.fromEntries(SEV.map((s, i) => [s.id, i]));
  const SEV_BY_ID = Object.fromEntries(SEV.map((s) => [s.id, s]));
  const TYPE_BY_ID = Object.fromEntries(R.types.map((t) => [t.id, t]));
  const TITLE = R.title || '代码扫描报告';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<span class="r-icon ${cls}" aria-hidden="true">${window.ICONS[name] || ''}</span>`;
  // 同一位置的多个图标都留在 DOM 里，由 CSS 按状态交叉淡入淡出。
  const swap = (items) => `<span class="r-swap" aria-hidden="true">${Object.entries(items).map(([k, name]) => `<span class="r-swap-item" data-for="${k}">${icon(name)}</span>`).join('')}</span>`;

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
  const hasDate = allIssues.some((i) => i.introducedAt);

  const freshDetail = () => ({ q: '', sort: 'severity', dir: 'asc', sev: 'all' });
  const state = { list: { q: '', sort: 'blocker', dir: 'desc' }, detail: freshDetail() };

  function sevbar(counts, { size, scale = 1 } = {}) {
    const present = SEV.filter((s) => counts[s.id]);
    if (!present.length) return '';
    const label = present.map((s) => `${s.label} ${counts[s.id]}`).join('，');
    const segs = present.map((s) => `<span data-sev="${s.id}" title="${s.label} ${counts[s.id]}" style="flex:${counts[s.id]} 0 0"></span>`).join('');
    return `<div class="r-sevbar" ${size ? `data-size="${size}"` : ''} role="img" aria-label="${label}" style="width:${Math.max(scale * 100, 4)}%">${segs}</div>`;
  }

  // 图例带数字：概览里的分布条不再需要悬停才能读数。
  const legend = (counts) => `<ul class="r-legend">${SEV.map((x) => `<li><span class="r-dot" data-sev="${x.id}"></span>${x.label}<b>${counts[x.id]}</b></li>`).join('')}</ul>`;

  const sortDir = (scope, key) => (state[scope].sort === key ? state[scope].dir : 'none');
  const ARIA_SORT = { asc: 'ascending', desc: 'descending' };
  const sortTh = (scope, key, label, cls = '') => {
    const d = sortDir(scope, key);
    return `<th scope="col" class="${cls}" ${d !== 'none' ? `aria-sort="${ARIA_SORT[d]}"` : ''}><button type="button" class="r-sort" data-sort="${scope}:${key}" data-dir="${d}">${label}${swap({ none: 'arrow-up-down', asc: 'arrow-up', desc: 'arrow-down' })}</button></th>`;
  };

  const search = (key, label, value) => `
        <div class="r-search" ${value ? 'data-has-text' : ''}>${icon('search', 'r-search-icon')}
          <input class="input" type="text" inputmode="search" autocomplete="off" spellcheck="false" aria-label="${label}" placeholder="${label}" value="${esc(value)}" data-input="${key}">
          <button type="button" class="r-clear" data-action="clear-${key}" aria-label="清除搜索" ${value ? '' : 'tabindex="-1"'}>${icon('x')}</button>
        </div>`;

  const emptyBlock = (text, action) => `<div class="r-empty" hidden>${icon('search-x')}<strong>${text}</strong>
        <button type="button" class="btn" data-variant="outline" data-size="sm" data-action="${action}">清除筛选</button></div>`;

  const stat = (label, value, tone) => `
        <div class="r-tile r-stat" ${tone ? `data-tone="${tone}"` : ''}>
          <div class="r-stat-label">${label}</div>
          <div class="r-stat-value">${value}</div>
        </div>`;

  function typeBars(issues) {
    const counts = R.types.map((t) => ({ ...t, n: issues.filter((i) => i.type === t.id).length })).filter((t) => t.n).sort((a, b) => b.n - a.n);
    if (!counts.length) return '';
    const max = Math.max(...counts.map((t) => t.n));
    return `<div class="r-card r-bars">${counts.map((t) => `
      <span>${esc(t.label)}</span>
      <span class="r-bars-track"><span class="r-bars-fill" data-sev="${t.severity}" style="width:${(t.n / max) * 100}%"></span></span>
      <span class="r-bars-value">${t.n}</span>`).join('')}</div>`;
  }

  /* ---------- 顶栏：只渲染一次 ---------- */

  function shell() {
    const repo = R.repo || {};
    root.innerHTML = `
    <header class="r-topbar">
      <div class="r-meta">
        ${repo.name ? `<span>${icon('folder-git-2')}${repo.url ? `<a class="r-mono r-hit" href="${esc(repo.url)}" target="_blank" rel="noopener">${esc(repo.name)}</a>` : `<span class="r-mono">${esc(repo.name)}</span>`}</span>` : ''}
        ${R.branch ? `<span>${icon('git-branch')}<span class="r-mono">${esc(R.branch)}</span></span>` : ''}
        ${R.commit ? `<span>${icon('git-commit-horizontal')}<span class="r-mono">${esc(R.commit)}</span></span>` : ''}
      </div>
      <button type="button" class="r-iconbtn" data-action="theme">${swap({ light: 'moon', dark: 'sun' })}</button>
    </header>
    <div id="view"></div>`;
    labelTheme();
  }

  function labelTheme() {
    const btn = root.querySelector('[data-action="theme"]');
    const tip = document.documentElement.classList.contains('dark') ? '切换到浅色' : '切换到深色';
    btn.setAttribute('aria-label', tip);
    btn.title = tip;
  }

  /* ---------- 列表页 ---------- */

  function listRows() {
    const { q, sort, dir } = state.list;
    const kw = q.trim().toLowerCase();
    const key = sort === 'blocker' ? (a) => a.sev.blocker * 100000 + a.total : (a) => a.total;
    return dirty
      .filter((a) => !kw || [a.id, a.name, a.path, a.team].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
  }

  const listBody = (rows) => rows.map((a) => `
        <tr data-href="#/app/${encodeURIComponent(a.id)}">
          <td><a class="r-app-name" href="#/app/${encodeURIComponent(a.id)}">${esc(a.name)}</a>${a.path ? `<span class="r-app-path r-mono">${esc(a.path)}</span>` : ''}</td>
          ${hasTeam ? `<td class="r-hide-narrow r-muted">${esc(a.team || '')}</td>` : ''}
          ${a.sev.blocker ? `<td class="is-num"><span class="r-sev" data-sev="blocker">${a.sev.blocker}</span></td>` : '<td class="is-num is-zero">0</td>'}
          <td class="is-num">${a.total}</td>
          <td class="r-cell-bar r-hide-narrow">${sevbar(a.sev, { size: 'sm', scale: a.total / maxAppTotal })}</td>
          <td class="r-cell-go">${icon('chevron-right')}</td>
        </tr>`).join('');

  function renderList(view) {
    if (!total) {
      view.innerHTML = `
      <div class="r-header r-stagger" style="--i:0"><h1 class="r-title">${esc(TITLE)}</h1></div>
      <div class="r-card r-empty r-stagger" style="--i:1">${icon('circle-check')}<strong>未发现问题</strong><span>已扫描 ${apps.length} 个子应用</span></div>`;
      return;
    }
    view.innerHTML = `
    <div class="r-header r-stagger" style="--i:0">
      <h1 class="r-title">${esc(TITLE)}</h1>
    </div>

    <section class="r-overview r-stagger" style="--i:1" aria-label="概览">
      ${stat('问题总数', total)}
      ${stat('阻断', totals.blocker, totals.blocker ? 'blocker' : 'zero')}
      ${stat('受影响子应用', `${dirty.length}<small>/ ${apps.length}</small>`)}
      <div class="r-tile r-dist"><div class="r-stat-label">严重程度分布</div>${sevbar(totals)}${legend(totals)}</div>
    </section>

    <section class="r-section r-stagger" style="--i:2">
      <div class="r-section-head">
        <h2 class="r-h2">存在问题的子应用<small id="list-count"></small></h2>
        ${search('list-q', '搜索子应用或团队', state.list.q)}
      </div>
      <div class="r-card r-table-wrap">
        <table class="table r-table">
          <thead>
            <tr>
              <th scope="col">子应用</th>
              ${hasTeam ? '<th scope="col" class="r-hide-narrow">负责团队</th>' : ''}
              ${sortTh('list', 'blocker', '阻断', 'is-num')}
              ${sortTh('list', 'total', '问题数', 'is-num')}
              <th scope="col" class="r-cell-bar r-hide-narrow">严重程度分布</th>
              <th class="r-cell-go"><span class="sr-only">查看</span></th>
            </tr>
          </thead>
          <tbody id="list-body"></tbody>
        </table>
        ${emptyBlock('没有匹配的子应用', 'clear-list-q')}
      </div>
      ${clean.length ? `
      <details class="r-clean">
        <summary>${icon('chevron-right', 'r-chevron')}另有 ${clean.length} 个子应用未发现问题</summary>
        <ul>${clean.map((a) => `<li>${esc(a.name)}${a.path ? ` <span class="r-mono">${esc(a.path)}</span>` : ''}</li>`).join('')}</ul>
      </details>` : ''}
    </section>

    <section class="r-section r-stagger" style="--i:3">
      <div class="r-section-head"><h2 class="r-h2">问题种类</h2></div>
      ${typeBars(allIssues)}
    </section>
    ${R.footnote ? `<footer class="r-footer">${esc(R.footnote)}</footer>` : ''}`;
    refreshList();
  }

  function refreshList() {
    const rows = listRows();
    fill('list', rows.length, dirty.length, listBody(rows));
  }

  /* ---------- 详情页 ---------- */

  function detailRows(app) {
    const { q, sort, dir, sev } = state.detail;
    const kw = q.trim().toLowerCase();
    const key = sort === 'severity' ? (i) => SEV_RANK[i.severity] * 100000 + (i.age ?? 99999) : (i) => i.age ?? 99999;
    return app.issues
      .filter((i) => sev === 'all' || i.severity === sev)
      .filter((i) => !kw || [TYPE_BY_ID[i.type].label, SEV_BY_ID[i.severity].label, i.message, i.file, i.author].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
  }

  function detailBody(app, rows) {
    const prefix = app.path ? app.path.replace(/\/?$/, '/') : '';
    const loc = (i) => {
      const short = prefix && i.file.startsWith(prefix) ? i.file.slice(prefix.length) : i.file;
      const text = `${esc(short)}${i.line ? `:${i.line}` : ''}`;
      return i.url
        ? `<a class="r-loc r-link r-mono r-hit" href="${esc(i.url)}" target="_blank" rel="noopener" title="在代码仓库中查看">${text}${icon('external-link')}</a>`
        : `<span class="r-loc r-mono">${text}</span>`;
    };
    return rows.map((i) => `
        <tr>
          <td><span class="r-sev" data-sev="${i.severity}"><span class="r-dot" data-sev="${i.severity}"></span>${SEV_BY_ID[i.severity].label}</span></td>
          <td class="r-cell-issue">
            <div class="r-issue-title">${esc(TYPE_BY_ID[i.type].label)}</div>
            ${i.message ? `<div class="r-issue-desc">${esc(i.message)}</div>` : ''}
          </td>
          <td>${loc(i)}</td>
          ${hasDate ? `<td class="r-when">${i.introducedAt ? `${esc(i.introducedAt)}${i.author ? `<span class="r-when-sub">${esc(i.author)}</span>` : ''}` : ''}</td>` : ''}
        </tr>`).join('');
  }

  const chip = (id, label, n) => `<button type="button" class="r-chip" data-filter="${id}" aria-pressed="${state.detail.sev === id}" ${n ? '' : 'disabled'}>${id !== 'all' ? `<span class="r-dot" data-sev="${id}"></span>` : ''}${label}<b>${n}</b></button>`;

  function renderDetail(view, app) {
    view.innerHTML = `
    <div class="r-header r-stagger" style="--i:0">
      <a class="r-back" href="#/">${icon('arrow-left')}全部子应用</a>
      <h1 class="r-title">${esc(app.name)}${app.path ? `<span class="r-title-sub r-mono">${app.url ? `<a class="r-link r-hit" href="${esc(app.url)}" target="_blank" rel="noopener">${esc(app.path)}</a>` : esc(app.path)}</span>` : ''}</h1>
      ${app.team ? `<p class="r-lede">负责团队：${esc(app.team)}</p>` : ''}
    </div>

    <section class="r-overview r-stagger" style="--i:1" aria-label="概览">
      ${stat('问题总数', app.total)}
      ${stat('阻断', app.sev.blocker, app.sev.blocker ? 'blocker' : 'zero')}
      <div class="r-tile r-dist"><div class="r-stat-label">严重程度分布</div>${sevbar(app.sev)}${legend(app.sev)}</div>
    </section>

    <section class="r-section r-stagger" style="--i:2">
      <div class="r-section-head">
        <h2 class="r-h2">问题列表<small id="detail-count"></small></h2>
        <div class="r-tools">
          <div class="r-chips" role="group" aria-label="按严重程度筛选">
            ${chip('all', '全部', app.total)}${SEV.map((s) => chip(s.id, s.label, app.sev[s.id])).join('')}
          </div>
          ${search('detail-q', '搜索问题、文件或作者', state.detail.q)}
        </div>
      </div>
      <div class="r-card r-table-wrap">
        <table class="table r-table">
          <thead>
            <tr>
              ${sortTh('detail', 'severity', '严重程度')}
              <th scope="col">问题种类</th>
              <th scope="col">代码位置</th>
              ${hasDate ? sortTh('detail', 'time', '引入时间') : ''}
            </tr>
          </thead>
          <tbody id="detail-body"></tbody>
        </table>
        ${emptyBlock('没有匹配的问题', 'reset-detail')}
      </div>
    </section>`;
    refreshDetail();
  }

  function refreshDetail() {
    const app = currentApp();
    const rows = detailRows(app);
    fill('detail', rows.length, app.total, detailBody(app, rows));
    root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === state.detail.sev)));
  }

  /* ---------- 局部更新：只换 tbody、计数和控件状态 ---------- */

  function fill(scope, shown, all, html) {
    const body = document.getElementById(`${scope}-body`);
    body.innerHTML = html;
    const wrap = body.closest('.r-table-wrap');
    wrap.querySelector('table').hidden = !shown;
    wrap.querySelector('.r-empty').hidden = !!shown;
    document.getElementById(`${scope}-count`).textContent = shown === all ? `${all} 个` : `${shown} / ${all} 个`;
    wrap.querySelectorAll('[data-sort]').forEach((b) => {
      const d = sortDir(scope, b.dataset.sort.split(':')[1]);
      b.dataset.dir = d;
      if (d === 'none') b.parentNode.removeAttribute('aria-sort');
      else b.parentNode.setAttribute('aria-sort', ARIA_SORT[d]);
    });
    const s = root.querySelector(`[data-input="${scope}-q"]`);
    const has = !!state[scope].q;
    if (s.value !== state[scope].q) s.value = state[scope].q;
    s.parentNode.toggleAttribute('data-has-text', has);
    s.parentNode.querySelector('.r-clear').tabIndex = has ? 0 : -1;
  }

  /* ---------- 路由与事件 ---------- */

  function currentApp() {
    const m = location.hash.match(/^#\/app\/(.+)$/);
    if (!m) return null;
    let id = m[1];
    try { id = decodeURIComponent(id); } catch (_) {}
    return apps.find((a) => String(a.id) === id && a.total > 0) || null;
  }

  function render() {
    const app = currentApp();
    const view = document.getElementById('view');
    if (app) renderDetail(view, app);
    else renderList(view);
    document.title = app ? `${app.name} | ${TITLE}` : TITLE;
  }

  let lastApp = null;
  window.addEventListener('hashchange', () => {
    const app = currentApp();
    if (app && app.id !== lastApp) state.detail = freshDetail();
    lastApp = app ? app.id : null;
    // 分段入场只在首次打开时播放一次；列表与详情之间来回是高频操作，直接切换。
    root.classList.remove('is-entering');
    render();
    window.scrollTo(0, 0);
  });

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
      return;
    }
    const filter = e.target.closest('[data-filter]');
    if (filter) { state.detail.sev = filter.dataset.filter; refreshDetail(); return; }
    const action = e.target.closest('[data-action]');
    if (action) {
      const a = action.dataset.action;
      if (a === 'theme') {
        const dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('report-theme', dark ? 'dark' : 'light'); } catch (_) {}
        labelTheme();
      }
      if (a === 'clear-list-q') { state.list.q = ''; refreshList(); root.querySelector('[data-input="list-q"]').focus(); }
      if (a === 'clear-detail-q') { state.detail.q = ''; refreshDetail(); root.querySelector('[data-input="detail-q"]').focus(); }
      if (a === 'reset-detail') { state.detail.q = ''; state.detail.sev = 'all'; refreshDetail(); }
      return;
    }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
  });

  lastApp = currentApp() ? currentApp().id : null;
  shell();
  root.classList.add('is-entering');
  render();
})();
