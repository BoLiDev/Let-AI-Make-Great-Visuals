/* 扫描报告的渲染与交互。数据来自 window.REPORT，图标来自 window.ICONS（构建时注入）。 */
(function () {
  const R = window.REPORT;
  const SEV = R.severities;
  const SEV_RANK = Object.fromEntries(SEV.map((s, i) => [s.id, i]));
  const SEV_BY_ID = Object.fromEntries(SEV.map((s) => [s.id, s]));
  const TYPE_BY_ID = Object.fromEntries(R.types.map((t) => [t.id, t]));
  const root = document.getElementById('app');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<span class="r-icon ${cls}" aria-hidden="true">${window.ICONS[name] || ''}</span>`;
  const sum = (arr, fn) => arr.reduce((n, x) => n + fn(x), 0);

  function countBySev(issues) {
    const c = { blocker: 0, high: 0, medium: 0, low: 0 };
    for (const i of issues) c[i.severity]++;
    return c;
  }

  // 预计算每个子应用的统计
  const apps = R.apps.map((a) => ({
    ...a,
    total: a.issues.length,
    sev: countBySev(a.issues),
    fresh: a.issues.filter((i) => i.isNew).length,
  }));
  const dirty = apps.filter((a) => a.total > 0);
  const clean = apps.filter((a) => a.total === 0);
  const allIssues = apps.flatMap((a) => a.issues);
  const totals = countBySev(allIssues);
  const total = allIssues.length;
  const maxAppTotal = Math.max(...dirty.map((a) => a.total));
  const teams = [...new Set(dirty.map((a) => a.team))];

  const state = {
    list: { q: '', team: '', sort: 'blocker', dir: 'desc' },
    detail: { type: '', sev: '', onlyNew: false, sort: 'severity', dir: 'asc' },
  };

  function sevbar(counts, { size, scale = 1 } = {}) {
    const n = SEV.reduce((s, x) => s + counts[x.id], 0);
    const label = SEV.filter((s) => counts[s.id]).map((s) => `${s.label} ${counts[s.id]}`).join('，');
    const segs = SEV.filter((s) => counts[s.id])
      .map((s) => `<span data-sev="${s.id}" style="flex:${counts[s.id]} 0 0"></span>`)
      .join('');
    const width = n ? Math.max(scale * 100, 4) : 0;
    return `<div class="r-sevbar" ${size ? `data-size="${size}"` : ''} role="img" aria-label="${label}" title="${label}" style="width:${width}%">${segs}</div>`;
  }

  const sevLabel = (id) => `<span class="r-sev" data-sev="${id}">${icon(SEV_BY_ID[id].icon)}${SEV_BY_ID[id].label}</span>`;

  function ago(days) {
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
    return `
    <header class="r-topbar">
      <div class="r-meta">
        <span>${icon('folder-git-2')}<strong class="r-mono">${esc(R.repo)}</strong></span>
        <span>${icon('git-branch')}<span class="r-mono">${esc(R.branch)}</span></span>
        <span>${icon('git-commit-horizontal')}<span class="r-mono">${esc(R.commit)}</span></span>
        <span>${icon('clock')}扫描于 <span class="r-num">${esc(R.scannedAt)}</span></span>
      </div>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-action="theme" aria-label="${dark ? '切换到浅色' : '切换到深色'}" title="${dark ? '切换到浅色' : '切换到深色'}">${icon(dark ? 'sun' : 'moon')}</button>
    </header>`;
  }

  /* ---------- 列表页 ---------- */

  function listRows() {
    const { q, team, sort, dir } = state.list;
    const kw = q.trim().toLowerCase();
    let rows = dirty.filter((a) => (!team || a.team === team) && (!kw || a.dir.includes(kw) || a.name.includes(kw)));
    const key = { blocker: (a) => a.sev.blocker * 1000 + a.total, total: (a) => a.total, fresh: (a) => a.fresh * 1000 + a.total }[sort];
    rows = rows.slice().sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    return rows;
  }

  function listTable() {
    const rows = listRows();
    if (!rows.length) {
      return `<div class="r-empty">${icon('search-x')}<strong>没有匹配的子应用</strong><span>换一个关键词，或清除筛选条件。</span>
        <button type="button" class="btn" data-variant="outline" data-size="sm" data-action="reset-list">清除筛选</button></div>`;
    }
    const num = (n, cls = '') => `<td class="is-num ${n ? cls : 'is-zero'}">${n || '0'}</td>`;
    return `
    <table class="table r-table">
      <thead>
        <tr>
          <th scope="col">子应用</th>
          <th scope="col" class="r-hide-narrow">负责团队</th>
          <th scope="col" class="is-num" ${ariaSort('list', 'blocker')}>${sortBtn('list', 'blocker', '阻断')}</th>
          <th scope="col" class="is-num" ${ariaSort('list', 'total')}>${sortBtn('list', 'total', '问题数')}</th>
          <th scope="col" class="r-cell-bar r-hide-narrow">严重程度分布</th>
          <th scope="col" class="is-num" ${ariaSort('list', 'fresh')}>${sortBtn('list', 'fresh', '本次新增')}</th>
          <th scope="col"><span class="sr-only">查看</span></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((a) => `
        <tr data-href="#/app/${a.dir}">
          <td><a class="r-app-name" href="#/app/${a.dir}">${esc(a.name)}</a><span class="r-app-path r-mono">${esc(a.path)}</span></td>
          <td class="r-hide-narrow r-muted">${esc(a.team)}</td>
          ${a.sev.blocker ? `<td class="is-num"><span class="r-sev" data-sev="blocker">${a.sev.blocker}</span></td>` : '<td class="is-num is-zero">0</td>'}
          <td class="is-num">${a.total}</td>
          <td class="r-cell-bar r-hide-narrow">${sevbar(a.sev, { size: 'sm', scale: a.total / maxAppTotal })}</td>
          ${a.fresh ? `<td class="is-num">+${a.fresh}</td>` : '<td class="is-num is-zero">0</td>'}
          <td class="is-num">${icon('chevron-right', 'r-row-go')}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function typeBars(issues) {
    const counts = R.types.map((t) => ({ ...t, n: issues.filter((i) => i.type === t.id).length })).filter((t) => t.n).sort((a, b) => b.n - a.n);
    const max = Math.max(...counts.map((t) => t.n));
    return `<div class="r-bars">${counts.map((t) => `
      <span>${esc(t.label)}</span>
      <span class="r-bars-track"><span class="r-bars-fill" data-sev="${t.severity}" style="width:${(t.n / max) * 100}%"></span></span>
      <span class="r-bars-value">${t.n}</span>`).join('')}</div>`;
  }

  function renderList() {
    const blockerApps = dirty.filter((a) => a.sev.blocker).length;
    const fresh = sum(dirty, (a) => a.fresh);
    const delta = total - R.prevTotal;
    const s = state.list;
    root.innerHTML = `
    ${topbar()}
    <div class="r-header">
      <h1 class="r-title">代码扫描报告</h1>
      <p class="r-lead">${apps.length} 个子应用中有 <strong>${dirty.length} 个</strong>存在问题，共 <strong>${total} 个</strong>。其中 <span class="r-sev-text">${totals.blocker} 个阻断级问题</span>分布在 ${blockerApps} 个子应用，需要在下次发布前修复。</p>
    </div>

    <section class="r-overview" aria-label="概览">
      <div class="r-stats">
        <div class="r-stat">
          <div class="r-stat-label">问题总数</div>
          <div class="r-stat-value">${total}</div>
          <div class="r-stat-note">较上次 <span class="${delta > 0 ? 'r-up' : 'r-down'} r-num">${delta > 0 ? '+' : ''}${delta}</span></div>
        </div>
        <div class="r-stat">
          <div class="r-stat-label">本次新增</div>
          <div class="r-stat-value">${fresh}</div>
          <div class="r-stat-note">已修复 <span class="r-down r-num">${R.fixedSinceLast}</span></div>
        </div>
        <div class="r-stat">
          <div class="r-stat-label">受影响子应用</div>
          <div class="r-stat-value">${dirty.length}<small>/ ${apps.length}</small></div>
          <div class="r-stat-note">${clean.length} 个未发现问题</div>
        </div>
      </div>
      <div>
        ${sevbar(totals)}
        <dl class="r-legend">
          ${SEV.map((x) => `
          <div class="r-legend-item">
            <dt><span class="r-dot" data-sev="${x.id}"></span>${x.label}</dt>
            <dd>${totals[x.id]}<small>${x.hint}</small></dd>
          </div>`).join('')}
        </dl>
      </div>
    </section>

    <section class="r-section">
      <div class="r-section-head">
        <h2 class="r-h2">存在问题的子应用<small>${dirty.length} 个，上次扫描 ${esc(R.prevScannedAt)}</small></h2>
        <div class="r-toolbar">
          <label class="r-search">${icon('search')}<span class="sr-only">搜索子应用</span>
            <input class="input" type="search" placeholder="搜索子应用" value="${esc(s.q)}" data-input="list-q"></label>
          <select class="select" aria-label="负责团队" data-input="list-team">
            <option value="">全部团队</option>
            ${teams.map((t) => `<option ${t === s.team ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="r-table-wrap" id="list-table">${listTable()}</div>
      <details class="r-clean">
        <summary>${icon('chevron-right', 'r-chevron')}另有 ${clean.length} 个子应用未发现问题</summary>
        <ul>${clean.map((a) => `<li>${esc(a.name)} <span class="r-mono">${esc(a.path)}</span></li>`).join('')}</ul>
      </details>
    </section>

    <section class="r-section">
      <div class="r-section-head"><h2 class="r-h2">问题种类<small>颜色表示该种类的严重程度</small></h2></div>
      ${typeBars(allIssues)}
    </section>

    <footer class="r-footer">扫描范围：<span class="r-mono">apps/*</span>，共 ${apps.length} 个子应用。规则集 v3.2，共 ${R.types.length} 条规则。</footer>`;
  }

  /* ---------- 详情页 ---------- */

  function detailRows(app) {
    const { type, sev, onlyNew, sort, dir } = state.detail;
    let rows = app.issues.filter((i) => (!type || i.type === type) && (!sev || i.severity === sev) && (!onlyNew || i.isNew));
    const key = sort === 'severity' ? (i) => SEV_RANK[i.severity] * 10000 + i.ageDays : (i) => i.ageDays;
    rows = rows.slice().sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    return rows;
  }

  function detailTable(app) {
    const rows = detailRows(app);
    if (!rows.length) {
      return `<div class="r-empty">${icon('search-x')}<strong>没有符合条件的问题</strong><span>当前筛选条件下没有结果。</span>
        <button type="button" class="btn" data-variant="outline" data-size="sm" data-action="reset-detail">清除筛选</button></div>`;
    }
    const prefix = app.path + '/';
    return `
    <table class="table r-table">
      <thead>
        <tr>
          <th scope="col" ${ariaSort('detail', 'severity')}>${sortBtn('detail', 'severity', '严重程度')}</th>
          <th scope="col">问题</th>
          <th scope="col">位置</th>
          <th scope="col" ${ariaSort('detail', 'time')}>${sortBtn('detail', 'time', '引入时间')}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((i) => `
        <tr>
          <td>${sevLabel(i.severity)}</td>
          <td>
            <div class="r-issue-title">${esc(TYPE_BY_ID[i.type].label)}${i.isNew ? '<span class="badge r-tag-new" data-variant="outline">本次新增</span>' : ''}</div>
            <div class="r-issue-desc">${esc(i.message)}</div>
          </td>
          <td><a class="r-loc r-link r-mono" href="${esc(i.url)}" target="_blank" rel="noopener" title="在 GitLab 中查看">${esc(i.file.replace(prefix, ''))}:${i.line}${icon('external-link')}</a></td>
          <td class="r-when">${esc(i.introducedAt)}
            <span class="r-when-sub">${ago(i.ageDays)} · ${esc(i.author)} · <span class="r-mono">!${i.mr}</span></span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="r-count-note">显示 ${rows.length} / ${app.total} 个问题</p>`;
  }

  function detailFilters(app) {
    const d = state.detail;
    const types = R.types.map((t) => ({ ...t, n: app.issues.filter((i) => i.type === t.id).length })).filter((t) => t.n);
    const chip = (id, label, n) => `<button type="button" class="btn" data-size="sm" data-variant="${d.type === id ? 'primary' : 'outline'}" aria-pressed="${d.type === id}" data-type="${id}">${esc(label)}<span class="r-chip-count">${n}</span></button>`;
    return `
      <div class="r-chips" role="group" aria-label="按种类筛选">
        ${chip('', '全部', app.total)}${types.map((t) => chip(t.id, t.label, t.n)).join('')}
      </div>
      <div class="r-toolbar">
        <label class="r-switch"><input type="checkbox" role="switch" class="input" data-size="sm" data-input="detail-new" ${d.onlyNew ? 'checked' : ''}>只看本次新增</label>
        <select class="select" aria-label="严重程度" data-input="detail-sev">
          <option value="">全部严重程度</option>
          ${SEV.filter((x) => app.sev[x.id]).map((x) => `<option value="${x.id}" ${x.id === d.sev ? 'selected' : ''}>${x.label}（${app.sev[x.id]}）</option>`).join('')}
        </select>
      </div>`;
  }

  function renderDetail(app) {
    root.innerHTML = `
    ${topbar()}
    <div class="r-header">
      <nav class="r-eyebrow" aria-label="面包屑">
        <a href="#/">代码扫描报告</a>${icon('chevron-right')}<span>${esc(app.name)}</span>
      </nav>
      <h1 class="r-title">${esc(app.name)}<span class="r-title-sub r-mono">${esc(app.path)}</span></h1>
      <p class="r-lead">共 <strong>${app.total} 个</strong>问题${app.sev.blocker ? `，其中 <span class="r-sev-text">${app.sev.blocker} 个阻断级</span>需要在下次发布前修复` : '，没有阻断级问题'}。${app.fresh ? `本次扫描新增 ${app.fresh} 个。` : '本次扫描没有新增。'}</p>
      <div class="r-submeta">
        <span>${icon('users')}${esc(app.team)}</span>
        <span><a class="r-link" href="${esc(app.url)}" target="_blank" rel="noopener">在 GitLab 中打开目录</a>${icon('external-link')}</span>
      </div>
    </div>

    <section class="r-overview" aria-label="概览">
      <div>
        ${sevbar(app.sev)}
        <dl class="r-legend">
          ${SEV.map((x) => `
          <div class="r-legend-item">
            <dt><span class="r-dot" data-sev="${x.id}"></span>${x.label}</dt>
            <dd class="${app.sev[x.id] ? '' : 'r-muted'}">${app.sev[x.id]}</dd>
          </div>`).join('')}
        </dl>
      </div>
      ${typeBars(app.issues)}
    </section>

    <section class="r-section">
      <div class="r-section-head" id="detail-filters">${detailFilters(app)}</div>
      <div class="r-table-wrap" id="detail-table">${detailTable(app)}</div>
    </section>`;
  }

  /* ---------- 路由与事件 ---------- */

  function currentApp() {
    const m = location.hash.match(/^#\/app\/([\w-]+)/);
    return m ? apps.find((a) => a.dir === m[1] && a.total > 0) : null;
  }

  function render() {
    const app = currentApp();
    if (app) renderDetail(app);
    else renderList();
    document.title = app ? `${app.name} · 代码扫描报告` : `代码扫描报告 · ${R.repo}`;
  }

  let lastApp = null;
  window.addEventListener('hashchange', () => {
    const app = currentApp();
    if (app && app.dir !== lastApp) state.detail = { type: '', sev: '', onlyNew: false, sort: 'severity', dir: 'asc' };
    lastApp = app ? app.dir : null;
    render();
    window.scrollTo(0, 0);
  });

  const refreshList = () => (document.getElementById('list-table').innerHTML = listTable());
  function refreshDetail(withFilters) {
    const app = currentApp();
    if (withFilters) document.getElementById('detail-filters').innerHTML = detailFilters(app);
    document.getElementById('detail-table').innerHTML = detailTable(app);
  }

  root.addEventListener('input', (e) => {
    const k = e.target.dataset.input;
    if (k === 'list-q') { state.list.q = e.target.value; refreshList(); }
    if (k === 'list-team') { state.list.team = e.target.value; refreshList(); }
    if (k === 'detail-sev') { state.detail.sev = e.target.value; refreshDetail(); }
    if (k === 'detail-new') { state.detail.onlyNew = e.target.checked; refreshDetail(); }
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
    const typeEl = e.target.closest('[data-type]');
    if (typeEl) { state.detail.type = typeEl.dataset.type; refreshDetail(true); return; }
    const action = e.target.closest('[data-action]');
    if (action) {
      const a = action.dataset.action;
      if (a === 'theme') {
        const dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('report-theme', dark ? 'dark' : 'light'); } catch (_) {}
        render();
      }
      if (a === 'reset-list') { state.list.q = ''; state.list.team = ''; render(); }
      if (a === 'reset-detail') { Object.assign(state.detail, { type: '', sev: '', onlyNew: false }); refreshDetail(true); }
      return;
    }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
  });

  lastApp = currentApp() ? currentApp().dir : null;
  window.__rerender = render;
  render();
})();
