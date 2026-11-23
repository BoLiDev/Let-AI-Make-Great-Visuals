// 校验扫描报告的数据。返回错误信息数组，空数组表示通过。
const SEVERITIES = ['blocker', 'high', 'medium', 'low'];

export function validate(d) {
  const errors = [];
  const err = (msg) => errors.length < 20 && errors.push(msg);
  if (!d || typeof d !== 'object') return ['数据必须是一个 JSON 对象'];
  if (!Array.isArray(d.types) || !d.types.length) err('types 必须是非空数组');
  if (!Array.isArray(d.apps) || !d.apps.length) err('apps 必须是非空数组');
  if (errors.length) return errors;

  const typeIds = new Set();
  d.types.forEach((t, i) => {
    if (!t.id || !t.label) err(`types[${i}] 缺少 id 或 label`);
    if (!SEVERITIES.includes(t.severity)) err(`types[${i}].severity 必须是 ${SEVERITIES.join(' / ')} 之一，现在是 ${JSON.stringify(t.severity)}`);
    if (typeIds.has(t.id)) err(`types 里的 id 重复：${t.id}`);
    typeIds.add(t.id);
  });

  const appIds = new Set();
  d.apps.forEach((a, i) => {
    if (a.id === undefined || a.id === '' || !a.name) err(`apps[${i}] 缺少 id 或 name`);
    if (appIds.has(a.id)) err(`apps 里的 id 重复：${a.id}`);
    appIds.add(a.id);
    if (a.issues !== undefined && !Array.isArray(a.issues)) err(`apps[${i}].issues 必须是数组`);
    (Array.isArray(a.issues) ? a.issues : []).forEach((it, j) => {
      const at = `apps[${i}].issues[${j}]`;
      if (!typeIds.has(it.type)) err(`${at}.type 是 ${JSON.stringify(it.type)}，不在 types 里`);
      if (!it.file) err(`${at} 缺少 file`);
      if (it.severity !== undefined && !SEVERITIES.includes(it.severity)) err(`${at}.severity 无效：${JSON.stringify(it.severity)}`);
      if (it.introducedAt !== undefined && Number.isNaN(Date.parse(it.introducedAt))) err(`${at}.introducedAt 不是有效日期：${JSON.stringify(it.introducedAt)}（用 YYYY-MM-DD）`);
    });
  });
  return errors;
}
