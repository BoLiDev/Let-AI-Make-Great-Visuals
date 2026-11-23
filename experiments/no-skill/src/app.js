/* 扫描报告：渲染与交互。数据在 window.REPORT，图标在 window.ICONS（构建时注入）。 */
(function () {
  const R = window.REPORT;
  const root = document.getElementById('app');
  const TITLE = R.title || '代码扫描报告';

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
  const icon = (name) => `<span class="ic" aria-hidden="true">${window.ICONS[name] || ''}</span>`;
  const ext = (url, inner, cls = '') => (url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : `<span class="${cls}">${inner}</span>`);
  const appHref = (a) => `#/app/${encodeURIComponent(a.id)}`;

  const countBySev = (issues) => {
    const c = { blocker: 0, high: 0, medium: 0, low: 0 };
    for (const i of issues) c[i.severity]++;
    return c;
  };

  const scanDay = Date.parse(String(R.scannedAt || '').slice(0, 10));
  const ageOf = (date) => {
    const t = Date.parse(date);
    return Number.isNaN(t) || Number.isNaN(scanDay) ? null : Math.max(0, Math.round((scanDay - t) / 86400000));
  };
  const ago = (days) => {
    if (days === null || days === undefined) return '';
    if (days <= 0) return '当天';
    if (days < 30) return `${days} 天前`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前`;
    const y = Math.floor(days / 365);
    const m = Math.floor((days - y * 365) / 30);
    return m ? `${y} 年 ${m} 个月前` : `${y} 年前`;
  };

  const apps = R.apps.map((a) => {
    const issues = (a.issues || []).map((i) => ({
      ...i,
      severity: i.severity || TYPE_BY_ID[i.type].severity,
      age: i.introducedAt ? ageOf(i.introducedAt) : null,
      app: a,
    }));
    const app = { ...a, issues, total: issues.length, sev: countBySev(issues) };
    for (const i of issues) i.app = app;
    return app;
  });
  const dirty = apps.filter((a) => a.total > 0);
  const clean = apps.filter((a) => a.total === 0);
  const allIssues = apps.flatMap((a) => a.issues);
  const totals = countBySev(allIssues);
  const total = allIssues.length;
  const maxAppTotal = Math.max(1, ...dirty.map((a) => a.total));
  const hasTeam = apps.some((a) => a.team);
  const hasDate = allIssues.some((i) => i.introducedAt);
  // 默认顺序：阻断多的在前，其次问题多的在前。详情页的上一个/下一个也按这个顺序。
  const ranked = [...dirty].sort((a, b) => b.sev.blocker - a.sev.blocker || b.total - a.total);

  const freshDetail = () => ({ q: '', sev: null, type: null, mode: 'type', dir: 'desc' });
  const state = { list: { q: '', sort: 'blocker', dir: 'desc' }, detail: freshDetail() };

  /* ---------- 公共片段 ---------- */

  function sevbar(counts, cls = '', scale = 1) {
    const present = SEV.filter((s) => counts[s.id]);
    if (!present.length) return '';
    const label = present.map((s) => `${s.label} ${counts[s.id]}`).join('，');
    return `<div class="sevbar ${cls}" role="img" aria-label="${label}" style="width:${Math.max(scale * 100, 3)}%">${present
      .map((s) => `<span data-sev="${s.id}" title="${s.label} ${counts[s.id]}" style="flex:${counts[s.id]} 0 0"></span>`)
      .join('')}</div>`;
  }

  const sevTag = (id) => `<span class="sev" data-sev="${id}"><i></i>${SEV_BY_ID[id].label}</span>`;

  function topbar() {
    const dark = document.documentElement.classList.contains('dark');
    const tip = dark ? '切换到浅色' : '切换到深色';
    const repo = R.repo || {};
    return `
    <header class="topbar">
      <a class="brand" href="#/">${esc(TITLE)}</a>
      <div class="meta">
        ${repo.name ? `<span>${icon('folder-git-2')}${ext(repo.url, esc(repo.name), 'mono')}</span>` : ''}
        ${R.branch ? `<span>${icon('git-branch')}<span class="mono">${esc(R.branch)}</span></span>` : ''}
        ${R.commit ? `<span>${icon('git-commit-horizontal')}<span class="mono">${esc(R.commit)}</span></span>` : ''}
        ${R.scannedAt ? `<span>${icon('clock')}扫描于 <span class="num">${esc(R.scannedAt)}</span></span>` : ''}
      </div>
      <button type="button" class="iconbtn" data-action="theme" aria-label="${tip}" title="${tip}">${icon(dark ? 'sun' : 'moon')}</button>
    </header>`;
  }

  // 四个严重程度的数字块。onPick 存在时是筛选按钮（详情页），否则是静态数字。
  function sevTiles(counts, sum, active, clickable) {
    return `<div class="tiles">${SEV.map((s) => {
      const n = counts[s.id];
      const pct = sum ? Math.round((n / sum) * 100) : 0;
      const inner = `<span class="tile-label"><i></i>${s.label}</span><span class="tile-num">${n}</span><span class="tile-pct">${n ? `占 ${pct < 1 ? '&lt;1' : pct}%` : '无'}</span>`;
      return clickable
        ? `<button type="button" class="tile" data-sev="${s.id}" data-pick-sev="${s.id}" aria-pressed="${active === s.id}" ${n ? '' : 'disabled'} title="只看${s.label}问题">${inner}</button>`
        : `<div class="tile" data-sev="${s.id}" ${n ? '' : 'data-zero'}>${inner}</div>`;
    }).join('')}</div>`;
  }

  // 种类分布：按严重程度从高到低，同级按数量。clickable 时点击可筛选。
  function typeBars(issues, active, clickable) {
    const rows = R.types
      .map((t) => ({ ...t, n: issues.filter((i) => i.type === t.id).length }))
      .filter((t) => t.n)
      .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.n - a.n);
    if (!rows.length) return '';
    const max = Math.max(...rows.map((t) => t.n));
    const tag = clickable ? 'button type="button"' : 'div';
    return `<div class="types">${rows.map((t) => `
      <${tag} class="type-row" data-sev="${t.severity}" ${clickable ? `data-pick-type="${esc(t.id)}" aria-pressed="${active === t.id}" title="只看「${esc(t.label)}」"` : ''}>
        <span class="type-name">${esc(t.label)}</span>
        <span class="type-track"><span class="type-fill" style="width:${(t.n / max) * 100}%"></span></span>
        <span class="type-n num">${t.n}</span>
      </${clickable ? 'button' : 'div'}>`).join('')}</div>`;
  }

  function loc(i, prefix) {
    const short = prefix && i.file.startsWith(prefix) ? i.file.slice(prefix.length) : i.file;
    const cut = short.lastIndexOf('/') + 1;
    const text = `<span class="loc-dir">${esc(short.slice(0, cut))}</span><span class="loc-file">${esc(short.slice(cut))}${i.line ? `:${i.line}` : ''}</span>`;
    return i.url
      ? `<a class="loc mono" href="${esc(i.url)}" target="_blank" rel="noopener" title="在代码仓库中打开 ${esc(i.file)}${i.line ? `:${i.line}` : ''}">${text}${icon('external-link')}</a>`
      : `<span class="loc mono">${text}</span>`;
  }

  const when = (i) => (i.introducedAt ? `<span class="num">${esc(i.introducedAt)}</span><span class="sub">${ago(i.age)}</span>` : '<span class="sub">未知</span>');
  const who = (i) => `${i.author ? esc(i.author) : ''}${i.mr ? `<span class="sub mono">${esc(i.mr)}</span>` : ''}`;

  function sortTh(scope, key, label, cls = '') {
    const s = state[scope];
    const on = s.sort === key;
    return `<th scope="col" class="${cls}" ${on ? `aria-sort="${s.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}>
      <button type="button" class="sortbtn" data-sort="${scope}:${key}" ${on ? 'data-on' : ''} title="按${label}排序">${label}${icon(on ? (s.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down')}</button></th>`;
  }

  const empty = (text, action) => `<div class="empty">${icon('search-x')}<strong>${text}</strong><button type="button" class="btn" data-action="${action}">清除筛选</button></div>`;

  /* ---------- 列表页 ---------- */

  function listTable() {
    const { q, sort, dir } = state.list;
    const kw = q.trim().toLowerCase();
    const key = sort === 'total' ? (a) => a.total : (a) => a.sev[sort] * 100000 + a.total;
    const rows = dirty
      .filter((a) => !kw || [a.id, a.name, a.path, a.team].some((v) => v && String(v).toLowerCase().includes(kw)))
      .sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    if (!rows.length) return empty('没有匹配的子应用', 'reset-list');
    const n = (v, sev) => (v ? `<td class="n"${sev ? ` data-sev="${sev}"` : ''}>${v}</td>` : '<td class="n zero">0</td>');
    return `
    <table class="tbl tbl-apps">
      <thead><tr>
        <th scope="col">子应用</th>
        ${hasTeam ? '<th scope="col" class="narrow-hide">负责团队</th>' : ''}
        ${SEV.map((s) => sortTh('list', s.id, s.label, 'n')).join('')}
        ${sortTh('list', 'total', '合计', 'n')}
        <th scope="col" class="bar-col narrow-hide">分布</th>
      </tr></thead>
      <tbody>${rows.map((a) => `
        <tr data-href="${appHref(a)}">
          <td><a class="app-name" href="${appHref(a)}">${esc(a.name)}</a>${a.path ? `<span class="app-path mono">${esc(a.path)}</span>` : ''}</td>
          ${hasTeam ? `<td class="narrow-hide muted">${esc(a.team || '')}</td>` : ''}
          ${n(a.sev.blocker, 'blocker')}${n(a.sev.high)}${n(a.sev.medium)}${n(a.sev.low)}
          <td class="n total">${a.total}</td>
          <td class="bar-col narrow-hide">${sevbar(a.sev, 'sm', a.total / maxAppTotal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function blockerTable() {
    const rows = allIssues.filter((i) => i.severity === 'blocker').sort((a, b) => ranked.indexOf(a.app) - ranked.indexOf(b.app) || (a.age ?? 1e9) - (b.age ?? 1e9));
    if (!rows.length) return '';
    return `
    <section class="section" id="blockers">
      <div class="section-head"><h2>全部阻断问题<small>${rows.length} 个，需在发布前修复</small></h2></div>
      <div class="tbl-wrap"><table class="tbl tbl-issues">
        <thead><tr><th scope="col">子应用</th><th scope="col">问题</th><th scope="col">代码位置</th>${hasDate ? '<th scope="col">引入时间</th><th scope="col" class="narrow-hide">引入人</th>' : ''}</tr></thead>
        <tbody>${rows.map((i) => `
          <tr>
            <td class="nowrap"><a class="app-name" href="${appHref(i.app)}">${esc(i.app.name)}</a></td>
            <td><span class="issue-type">${esc(TYPE_BY_ID[i.type].label)}</span>${i.message ? `<span class="issue-msg">${esc(i.message)}</span>` : ''}</td>
            <td>${loc(i, i.app.path ? i.app.path.replace(/\/?$/, '/') : '')}</td>
            ${hasDate ? `<td class="when">${when(i)}</td><td class="who narrow-hide">${who(i)}</td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table></div>
    </section>`;
  }

  // 一句话结论：阻断问题在哪些子应用。
  function lead() {
    const withBlocker = ranked.filter((a) => a.sev.blocker);
    if (!withBlocker.length) return `<p class="lead">${dirty.length} 个子应用存在问题，<strong>没有阻断级问题</strong>。</p>`;
    return `<p class="lead"><strong class="danger">${totals.blocker} 个阻断问题</strong>集中在 ${withBlocker.length} 个子应用：${withBlocker
      .map((a) => `<a href="${appHref(a)}">${esc(a.name)}</a> <span class="num">${a.sev.blocker}</span>`)
      .join('、')}。<a class="jump" href="#blockers" data-action="jump-blockers">查看明细${icon('arrow-down')}</a></p>`;
  }

  function renderList() {
    if (!total) {
      root.innerHTML = `${topbar()}<div class="empty big">${icon('circle-check')}<strong>未发现问题</strong><span>已扫描 ${apps.length} 个子应用</span></div>`;
      return;
    }
    root.innerHTML = `
    ${topbar()}
    <section class="overview" aria-label="概览">
      <div class="ov-main">
        <div class="headline">
          <div class="big-stat"><span class="big-num">${total}</span><span class="big-label">个问题</span></div>
          <div class="big-stat"><span class="big-num">${dirty.length}<small>/ ${apps.length}</small></span><span class="big-label">个子应用受影响</span></div>
        </div>
        ${sevbar(totals, 'lg')}
        ${sevTiles(totals, total, null, false)}
        ${lead()}
      </div>
      <div class="ov-side">
        <h2 class="side-title">问题种类</h2>
        ${typeBars(allIssues, null, false)}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>存在问题的子应用<small>${dirty.length} 个，点击查看问题明细</small></h2>
        <label class="search">${icon('search')}<span class="sr-only">搜索子应用</span>
          <input type="search" placeholder="搜索名称、路径或团队" value="${esc(state.list.q)}" data-input="list-q"></label>
      </div>
      <div class="tbl-wrap" id="list-table">${listTable()}</div>
      ${clean.length ? `
      <details class="clean">
        <summary>${icon('chevron-right')}${icon('circle-check')}另有 ${clean.length} 个子应用未发现问题</summary>
        <ul>${clean.map((a) => `<li>${esc(a.name)}${a.path ? `<span class="mono">${esc(a.path)}</span>` : ''}</li>`).join('')}</ul>
      </details>` : ''}
    </section>
    ${blockerTable()}
    ${R.footnote ? `<footer class="footer">${esc(R.footnote)}</footer>` : ''}`;
  }

  /* ---------- 详情页 ---------- */

  function detailRows(app) {
    const { q, sev, type } = state.detail;
    const kw = q.trim().toLowerCase();
    return app.issues.filter(
      (i) =>
        (!sev || i.severity === sev) &&
        (!type || i.type === type) &&
        (!kw || [TYPE_BY_ID[i.type].label, SEV_BY_ID[i.severity].label, i.message, i.file, i.author, i.mr].some((v) => v && String(v).toLowerCase().includes(kw)))
    );
  }

  function detailTable(app) {
    const { mode, dir } = state.detail;
    const rows = detailRows(app);
    if (!rows.length) return empty('没有符合条件的问题', 'reset-detail');
    const prefix = app.path ? app.path.replace(/\/?$/, '/') : '';
    // dir=desc 表示最近引入的在前。
    const byTime = (a, b) => (dir === 'desc' ? (a.age ?? 1e9) - (b.age ?? 1e9) : (b.age ?? -1) - (a.age ?? -1));
    const timeTh = hasDate
      ? `<th scope="col" aria-sort="${dir === 'desc' ? 'descending' : 'ascending'}"><button type="button" class="sortbtn" data-on data-action="flip-time" title="切换引入时间的先后顺序">引入时间${icon(dir === 'desc' ? 'arrow-down' : 'arrow-up')}</button></th><th scope="col" class="narrow-hide">引入人</th>`
      : '';
    const tail = (i) => `<td>${loc(i, prefix)}</td>${hasDate ? `<td class="when">${when(i)}</td><td class="who narrow-hide">${who(i)}</td>` : ''}`;

    let body;
    if (mode === 'type') {
      const groups = R.types
        .map((t) => ({ t, items: rows.filter((i) => i.type === t.id).sort(byTime) }))
        .filter((g) => g.items.length)
        .sort((a, b) => SEV_RANK[a.items[0].severity] - SEV_RANK[b.items[0].severity] || b.items.length - a.items.length);
      body = groups.map((g) => `
        <tbody>
          <tr class="grp" data-sev="${g.items[0].severity}"><th colspan="${hasDate ? 4 : 2}" scope="colgroup">${sevTag(g.items[0].severity)}<span class="grp-name">${esc(g.t.label)}</span><span class="grp-n">${g.items.length} 个</span></th></tr>
          ${g.items.map((i) => `<tr><td class="msg">${i.severity !== g.items[0].severity ? sevTag(i.severity) : ''}${esc(i.message || g.t.label)}</td>${tail(i)}</tr>`).join('')}
        </tbody>`).join('');
    } else {
      body = `<tbody>${[...rows].sort(byTime).map((i) => `
        <tr><td class="msg"><span class="issue-type">${sevTag(i.severity)}${esc(TYPE_BY_ID[i.type].label)}</span>${i.message ? `<span class="issue-msg">${esc(i.message)}</span>` : ''}</td>${tail(i)}</tr>`).join('')}</tbody>`;
    }
    return `
    <table class="tbl tbl-issues" data-mode="${mode}">
      <thead><tr><th scope="col">问题</th><th scope="col">代码位置</th>${timeTh}</tr></thead>
      ${body}
    </table>`;
  }

  function detailToolbar(app) {
    const { sev, type, mode } = state.detail;
    const n = detailRows(app).length;
    const filtered = sev || type || state.detail.q.trim();
    const chips = [sev ? `<button type="button" class="chip" data-pick-sev="${sev}" title="取消筛选">${SEV_BY_ID[sev].label}${icon('x')}</button>` : '', type ? `<button type="button" class="chip" data-pick-type="${esc(type)}" title="取消筛选">${esc(TYPE_BY_ID[type].label)}${icon('x')}</button>` : ''].join('');
    return `
      <h2>问题明细<small>${filtered ? `显示 ${n} / ${app.total} 个` : `${app.total} 个`}</small>${chips}</h2>
      <div class="tools">
        <div class="seg" role="group" aria-label="排列方式">
          <button type="button" data-mode="type" aria-pressed="${mode === 'type'}">按种类分组</button>
          <button type="button" data-mode="time" aria-pressed="${mode === 'time'}">按引入时间</button>
        </div>
        <label class="search">${icon('search')}<span class="sr-only">搜索问题</span>
          <input type="search" placeholder="搜索说明、文件或引入人" value="${esc(state.detail.q)}" data-input="detail-q"></label>
      </div>`;
  }

  function renderDetail(app) {
    const idx = ranked.indexOf(app);
    const prev = ranked[idx - 1];
    const next = ranked[idx + 1];
    const oldest = app.issues.reduce((m, i) => (i.age !== null && (m === null || i.age > m.age) ? i : m), null);
    const facts = [
      app.team ? `<span><span class="muted">负责团队</span>${esc(app.team)}</span>` : '',
      app.path ? `<span><span class="muted">目录</span>${ext(app.url, esc(app.path), 'mono link')}</span>` : '',
      oldest ? `<span><span class="muted">最早的问题引入于</span><span class="num">${esc(oldest.introducedAt)}</span></span>` : '',
    ].join('');
    const pager = (a, label, ic, cls) => (a ? `<a class="pager ${cls}" href="${appHref(a)}" title="${label}：${esc(a.name)}">${cls === 'prev' ? icon(ic) : ''}<span>${esc(a.name)}</span>${cls === 'next' ? icon(ic) : ''}</a>` : '');
    root.innerHTML = `
    ${topbar()}
    <div class="crumbs">
      <a class="back" href="#/">${icon('arrow-left')}全部子应用</a>
      <span class="pagers"><span class="muted num">${idx + 1} / ${ranked.length}</span>${pager(prev, '上一个', 'arrow-left', 'prev')}${pager(next, '下一个', 'arrow-right', 'next')}</span>
    </div>
    <section class="overview" aria-label="概览">
      <div class="ov-main">
        <h1 class="title">${esc(app.name)}<span class="title-n"><b class="num">${app.total}</b> 个问题</span></h1>
        <div class="facts">${facts}</div>
        ${sevbar(app.sev, 'lg')}
        <div id="detail-tiles">${sevTiles(app.sev, app.total, state.detail.sev, true)}</div>
      </div>
      <div class="ov-side">
        <h2 class="side-title">问题种类<small>点击筛选</small></h2>
        <div id="detail-types">${typeBars(app.issues, state.detail.type, true)}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head" id="detail-toolbar">${detailToolbar(app)}</div>
      <div class="tbl-wrap" id="detail-table">${detailTable(app)}</div>
    </section>
    ${R.footnote ? `<footer class="footer">${esc(R.footnote)}</footer>` : ''}`;
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
    if (app) renderDetail(app);
    else renderList();
    document.title = app ? `${app.name} | ${TITLE}` : TITLE;
  }

  let lastApp = null;
  window.addEventListener('hashchange', () => {
    if (location.hash === '#blockers') return;
    const app = currentApp();
    if (app && app.id !== lastApp) state.detail = freshDetail();
    lastApp = app ? app.id : null;
    render();
    window.scrollTo(0, 0);
  });

  const refreshList = () => (document.getElementById('list-table').innerHTML = listTable());
  function refreshDetail(keepSearchFocus) {
    const app = currentApp();
    document.getElementById('detail-table').innerHTML = detailTable(app);
    document.getElementById('detail-tiles').innerHTML = sevTiles(app.sev, app.total, state.detail.sev, true);
    document.getElementById('detail-types').innerHTML = typeBars(app.issues, state.detail.type, true);
    if (keepSearchFocus) {
      // 只更新计数，不重建输入框，避免打字时丢失焦点。
      const n = detailRows(app).length;
      const filtered = state.detail.sev || state.detail.type || state.detail.q.trim();
      document.querySelector('#detail-toolbar h2 small').textContent = filtered ? `显示 ${n} / ${app.total} 个` : `${app.total} 个`;
    } else {
      document.getElementById('detail-toolbar').innerHTML = detailToolbar(app);
    }
  }

  root.addEventListener('input', (e) => {
    const k = e.target.dataset.input;
    if (k === 'list-q') { state.list.q = e.target.value; refreshList(); }
    if (k === 'detail-q') { state.detail.q = e.target.value; refreshDetail(true); }
  });

  root.addEventListener('click', (e) => {
    const t = e.target;
    const sortEl = t.closest('[data-sort]');
    if (sortEl) {
      const key = sortEl.dataset.sort.split(':')[1];
      const s = state.list;
      if (s.sort === key) s.dir = s.dir === 'asc' ? 'desc' : 'asc';
      else { s.sort = key; s.dir = 'desc'; }
      refreshList();
      return;
    }
    const sevEl = t.closest('[data-pick-sev]');
    if (sevEl) {
      const v = sevEl.dataset.pickSev;
      state.detail.sev = state.detail.sev === v ? null : v;
      refreshDetail();
      return;
    }
    const typeEl = t.closest('[data-pick-type]');
    if (typeEl) {
      const v = typeEl.dataset.pickType;
      state.detail.type = state.detail.type === v ? null : v;
      refreshDetail();
      return;
    }
    const modeEl = t.closest('[data-mode]');
    if (modeEl && modeEl.tagName === 'BUTTON') {
      state.detail.mode = modeEl.dataset.mode;
      refreshDetail();
      return;
    }
    const action = t.closest('[data-action]');
    if (action) {
      const a = action.dataset.action;
      if (a === 'theme') {
        const dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('report-theme', dark ? 'dark' : 'light'); } catch (_) {}
        render();
      }
      if (a === 'flip-time') { state.detail.dir = state.detail.dir === 'desc' ? 'asc' : 'desc'; refreshDetail(); }
      if (a === 'reset-list') { state.list.q = ''; render(); }
      if (a === 'reset-detail') { state.detail = { ...freshDetail(), mode: state.detail.mode }; render(); }
      if (a === 'jump-blockers') {
        e.preventDefault();
        const el = document.getElementById('blockers');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const row = t.closest('tr[data-href]');
    if (row && !t.closest('a, button')) location.hash = row.dataset.href;
  });

  lastApp = currentApp() ? currentApp().id : null;
  render();
})();
