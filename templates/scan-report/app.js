/* 扫描报告模板：渲染与交互。数据来自 window.REPORT（结构见同目录 README），图标来自 window.ICONS（构建时注入）。 */
(function () {
  const R = window.REPORT;
  const root = document.getElementById('app');

  // 严重程度是模板固定的四级，数据里只需要引用 id。
  const SEV = [
    { id: 'blocker', label: '阻断', icon: 'octagon-alert' },
    { id: 'high', label: '严重', icon: 'triangle-alert' },
    { id: 'medium', label: '一般', icon: 'circle-alert' },
    { id: 'low', label: '提示', icon: 'info' },
  ];
  const SEV_RANK = Object.fromEntries(SEV.map((s, i) => [s.id, i]));
  const SEV_BY_ID = Object.fromEntries(SEV.map((s) => [s.id, s]));
  const TYPE_BY_ID = Object.fromEntries(R.types.map((t) => [t.id, t]));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<span class="r-icon ${cls}" aria-hidden="true">${window.ICONS[name] || ''}</span>`;
  const link = (url, inner, cls = 'r-link') => (url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : inner);

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

  // 预计算：补全每个问题的严重程度和距今天数，统计每个子应用。
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

  const state = {
    list: { q: '', sort: 'blocker', dir: 'desc' },
    detail: { q: '', sort: 'severity', dir: 'asc' },
  };

  function sevbar(counts, { size, scale = 1 } = {}) {
    const present = SEV.filter((s) => counts[s.id]);
    if (!present.length) return '';
    const label = present.map((s) => `${s.label} ${counts[s.id]}`).join('，');
    const segs = present.map((s) => `<span data-sev="${s.id}" title="${s.label} ${counts[s.id]}" style="flex:${counts[s.id]} 0 0"></span>`).join('');
    return `<div class="r-sevbar" ${size ? `data-size="${size}"` : ''} role="img" aria-label="${label}" style="width:${Math.max(scale * 100, 4)}%">${segs}</div>`;
  }

  const sevLabel = (id) => `<span class="r-sev" data-sev="${id}">${icon(SEV_BY_ID[id].icon)}${SEV_BY_ID[id].label}</span>`;

  function ago(days) {
    if (days === null) return '';
    if (days <= 0) return '今天';
    if (days < 30) return `${days} 天前`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前`;
    return `${Math.floor(days / 365)} 年前`;
  }

  function sortBtn(scope, key, label) {
    const s = state[scope];
    const active = s.sort === key;
    const ic = active ? (s.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down';
    return `<button type="button" class="r-sort" data-sort="${scope}:${key}" ${active ? 'data-active' : ''}>${label}${icon(ic)}</button>`;
  }

  const ariaSort = (scope, key) => (state[scope].sort === key ? `aria-sort="${state[scope].dir === 'asc' ? 'ascending' : 'descending'}"` : '');

  function topbar() {
    const dark = document.documentElement.classList.contains('dark');
    const tip = dark ? '切换到浅色' : '切换到深色';
    const repo = R.repo || {};
    return `
    <header class="r-topbar">
      <div class="r-meta">
        ${repo.name ? `<span>${icon('folder-git-2')}${link(repo.url, `<strong class="r-mono">${esc(repo.name)}</strong>`, '')}</span>` : ''}
        ${R.branch ? `<span>${icon('git-branch')}<span class="r-mono">${esc(R.branch)}</span></span>` : ''}
        ${R.commit ? `<span>${icon('git-commit-horizontal')}<span class="r-mono">${esc(R.commit)}</span></span>` : ''}
      </div>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-action="theme" aria-label="${tip}" title="${tip}">${icon(dark ? 'sun' : 'moon')}</button>
    </header>`;
  }

  function typeBars(issues) {
    const counts = R.types.map((t) => ({ ...t, n: issues.filter((i) => i.type === t.id).length })).filter((t) => t.n).sort((a, b) => b.n - a.n);
    if (!counts.length) return '';
    const max = Math.max(...counts.map((t) => t.n));
    return `<div class="r-bars">${counts.map((t) => `
      <span>${esc(t.label)}</span>
      <span class="r-bars-track"><span class="r-bars-fill" data-sev="${t.severity}" style="width:${(t.n / max) * 100}%"></span></span>
      <span class="r-bars-value">${t.n}</span>`).join('')}</div>`;
  }

  /* ---------- 列表页 ---------- */

  function listLead() {
    if (!total) return `共扫描 ${apps.length} 个子应用，<strong>未发现问题</strong>。`;
    const blockerApps = dirty.filter((a) => a.sev.blocker).length;
    const head = `${apps.length} 个子应用中有 <strong>${dirty.length} 个</strong>存在问题，共 <strong>${total} 个</strong>。`;
    return totals.blocker
      ? `${head}其中 <span class="r-sev-text">${totals.blocker} 个阻断级问题</span>分布在 ${blockerApps} 个子应用，需要在下次发布前修复。`
      : `${head}没有阻断级问题。`;
  }

  function listTable() {
    const { q, sort, dir } = state.list;
    const kw = q.trim().toLowerCase();
    const key = sort === 'blocker' ? (a) => a.sev.blocker * 100000 + a.total : (a) => a.total;
    const rows = dirty
      .filter((a) => !kw || [a.id, a.name, a.path, a.team].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    if (!rows.length) {
      return `<div class="r-empty">${icon('search-x')}<strong>没有匹配的子应用</strong><span>换一个关键词试试。</span>
        <button type="button" class="btn" data-variant="outline" data-size="sm" data-action="reset-list">清除搜索</button></div>`;
    }
    return `
    <table class="table r-table">
      <thead>
        <tr>
          <th scope="col">子应用</th>
          ${hasTeam ? '<th scope="col" class="r-hide-narrow">负责团队</th>' : ''}
          <th scope="col" class="is-num" ${ariaSort('list', 'blocker')}>${sortBtn('list', 'blocker', '阻断')}</th>
          <th scope="col" class="is-num" ${ariaSort('list', 'total')}>${sortBtn('list', 'total', '问题数')}</th>
          <th scope="col" class="r-cell-bar r-hide-narrow">严重程度分布</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((a) => `
        <tr data-href="#/app/${encodeURIComponent(a.id)}">
          <td><a class="r-app-name" href="#/app/${encodeURIComponent(a.id)}">${esc(a.name)}</a>${a.path ? `<span class="r-app-path r-mono">${esc(a.path)}</span>` : ''}</td>
          ${hasTeam ? `<td class="r-hide-narrow r-muted">${esc(a.team || '')}</td>` : ''}
          ${a.sev.blocker ? `<td class="is-num"><span class="r-sev" data-sev="blocker">${a.sev.blocker}</span></td>` : '<td class="is-num is-zero">0</td>'}
          <td class="is-num">${a.total}</td>
          <td class="r-cell-bar r-hide-narrow">${sevbar(a.sev, { size: 'sm', scale: a.total / maxAppTotal })}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function renderList() {
    const header = `
    ${topbar()}
    <div class="r-header">
      <h1 class="r-title">${esc(R.title || '代码扫描报告')}</h1>
      <p class="r-lead">${listLead()}</p>
    </div>`;
    if (!total) {
      root.innerHTML = header;
      return;
    }
    root.innerHTML = `
    ${header}
    <section class="r-overview" data-layout="stats" aria-label="概览">
      <div class="r-stats">
        <div class="r-stat">
          <div class="r-stat-label">问题总数</div>
          <div class="r-stat-value">${total}</div>
        </div>
        <div class="r-stat">
          <div class="r-stat-label">受影响子应用</div>
          <div class="r-stat-value">${dirty.length}<small>/ ${apps.length}</small></div>
        </div>
      </div>
      ${sevbar(totals)}
    </section>

    <section class="r-section">
      <div class="r-section-head">
        <h2 class="r-h2">存在问题的子应用<small>${dirty.length} 个</small></h2>
        <label class="r-search">${icon('search')}<span class="sr-only">搜索子应用</span>
          <input class="input" type="search" placeholder="搜索子应用" value="${esc(state.list.q)}" data-input="list-q"></label>
      </div>
      <div class="r-table-wrap" id="list-table">${listTable()}</div>
      ${clean.length ? `
      <details class="r-clean">
        <summary>${icon('chevron-right', 'r-chevron')}另有 ${clean.length} 个子应用未发现问题</summary>
        <ul>${clean.map((a) => `<li>${esc(a.name)}${a.path ? ` <span class="r-mono">${esc(a.path)}</span>` : ''}</li>`).join('')}</ul>
      </details>` : ''}
    </section>

    <section class="r-section">
      <div class="r-section-head"><h2 class="r-h2">问题种类</h2></div>
      ${typeBars(allIssues)}
    </section>
    ${R.footnote ? `<footer class="r-footer">${esc(R.footnote)}</footer>` : ''}`;
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
      return `<div class="r-empty">${icon('search-x')}<strong>没有匹配的问题</strong><span>换一个关键词试试。</span>
        <button type="button" class="btn" data-variant="outline" data-size="sm" data-action="reset-detail">清除搜索</button></div>`;
    }
    const prefix = app.path ? app.path.replace(/\/?$/, '/') : '';
    const loc = (i) => {
      const short = prefix && i.file.startsWith(prefix) ? i.file.slice(prefix.length) : i.file;
      const text = `${esc(short)}${i.line ? `:${i.line}` : ''}`;
      return i.url
        ? `<a class="r-loc r-link r-mono" href="${esc(i.url)}" target="_blank" rel="noopener" title="在代码仓库中查看">${text}${icon('external-link')}</a>`
        : `<span class="r-loc r-mono">${text}</span>`;
    };
    const when = (i) => {
      if (!i.introducedAt) return '';
      return `${esc(i.introducedAt)}${i.author ? `<span class="r-when-sub">${esc(i.author)}</span>` : ''}`;
    };
    return `
    <table class="table r-table">
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
          <td>${sevLabel(i.severity)}</td>
          <td>
            <div class="r-issue-title">${esc(TYPE_BY_ID[i.type].label)}</div>
            ${i.message ? `<div class="r-issue-desc">${esc(i.message)}</div>` : ''}
          </td>
          <td>${loc(i)}</td>
          ${hasDate ? `<td class="r-when">${when(i)}</td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>
`;
  }

  function renderDetail(app) {
    const typeCount = new Set(app.issues.map((i) => i.type)).size;
    root.innerHTML = `
    ${topbar()}
    <div class="r-header">
      <nav class="r-eyebrow" aria-label="面包屑">
        <a href="#/">${esc(R.title || '代码扫描报告')}</a>${icon('chevron-right')}<span>${esc(app.name)}</span>
      </nav>
      <h1 class="r-title">${esc(app.name)}${app.path ? `<span class="r-title-sub r-mono">${link(app.url, esc(app.path))}</span>` : ''}</h1>
      <p class="r-lead">共 <strong>${app.total} 个</strong>问题${app.sev.blocker ? `，其中 <span class="r-sev-text">${app.sev.blocker} 个阻断级</span>需要在下次发布前修复` : '，没有阻断级问题'}。</p>
    </div>

    <section class="r-overview" data-layout="stats" aria-label="概览">
      <div class="r-stats">
        <div class="r-stat">
          <div class="r-stat-label">问题总数</div>
          <div class="r-stat-value">${app.total}</div>
        </div>
        <div class="r-stat">
          <div class="r-stat-label">问题种类</div>
          <div class="r-stat-value">${typeCount}</div>
        </div>
      </div>
      ${sevbar(app.sev)}
    </section>

    <section class="r-section">
      <div class="r-section-head">
        <h2 class="r-h2">问题列表<small>${app.total} 个</small></h2>
        <label class="r-search">${icon('search')}<span class="sr-only">搜索问题</span>
          <input class="input" type="search" placeholder="搜索问题" value="${esc(state.detail.q)}" data-input="detail-q"></label>
      </div>
      <div class="r-table-wrap" id="detail-table">${detailTable(app)}</div>
    </section>`;
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
    if (app) renderDetail(app);
    else renderList();
    const title = R.title || '代码扫描报告';
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
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) {
      const a = action.dataset.action;
      if (a === 'theme') {
        const dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('report-theme', dark ? 'dark' : 'light'); } catch (_) {}
        render();
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
})();
