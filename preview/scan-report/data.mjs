// 模拟数据：对一个 monorepo 的代码扫描结果。固定随机种子，每次生成结果一致。

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20261120);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

const GITLAB = 'https://gitlab.example.com/platform/web-monorepo';

export const SEVERITIES = [
  { id: 'blocker', label: '阻断', icon: 'octagon-alert', hint: '发布前必须修复' },
  { id: 'high', label: '严重', icon: 'triangle-alert', hint: '本迭代内修复' },
  { id: 'medium', label: '一般', icon: 'circle-alert', hint: '排期修复' },
  { id: 'low', label: '提示', icon: 'info', hint: '建议优化' },
];

export const TYPES = [
  {
    id: 'hardcoded-secret', label: '硬编码密钥', severity: 'blocker',
    messages: ['源码中包含明文 AccessKey', '源码中包含明文的第三方服务 Token', '测试账号密码写入了配置文件'],
    files: ['src/config/oss.ts', 'src/services/sms.ts', 'src/utils/sign.ts', 'config/env.prod.ts'],
  },
  {
    id: 'unsafe-html', label: '不安全的 HTML 注入', severity: 'blocker',
    messages: ['未经转义的用户输入被写入 innerHTML', '富文本内容未经过滤直接渲染'],
    files: ['src/components/RichText.tsx', 'src/pages/detail/Comment.tsx', 'src/components/Notice.vue'],
  },
  {
    id: 'cross-app-import', label: '跨应用直接引用', severity: 'high',
    messages: ['直接引用了 apps/{other} 的内部模块，应改为通过 packages/ 共享', '通过相对路径引用了 apps/{other}/src 下的文件'],
    files: ['src/pages/index.tsx', 'src/hooks/useUser.ts', 'src/components/Header.tsx', 'src/services/order.ts', 'src/store/cart.ts'],
  },
  {
    id: 'circular-dependency', label: '循环依赖', severity: 'high',
    messages: ['模块之间存在循环依赖，共 {n} 个文件成环', '与 packages/shared-utils 互相依赖'],
    files: ['src/store/index.ts', 'src/services/index.ts', 'src/utils/request.ts', 'src/router/guards.ts'],
  },
  {
    id: 'phantom-dependency', label: '未声明依赖', severity: 'medium',
    messages: ['使用了 {pkg}，但未在 package.json 中声明', '依赖 {pkg} 由其他子应用提升而来，未显式声明'],
    files: ['src/utils/date.ts', 'src/utils/format.ts', 'src/components/Chart.tsx', 'src/pages/list/index.tsx', 'src/hooks/useQuery.ts'],
  },
  {
    id: 'deprecated-api', label: '废弃 API 调用', severity: 'medium',
    messages: ['调用了已废弃的 @platform/request v1 接口', '使用了将在下个大版本移除的 legacyRouter', '调用了已废弃的埋点方法 track()'],
    files: ['src/services/api.ts', 'src/router/index.ts', 'src/utils/tracker.ts', 'src/pages/home/index.tsx', 'src/components/Form.tsx'],
  },
  {
    id: 'oversized-bundle', label: '入口体积超限', severity: 'medium',
    messages: ['入口包体积 {size} KB，超过 500 KB 上限', '首屏同步加载了 {pkg} 全量包'],
    files: ['src/main.ts', 'src/entry.tsx', 'src/app.tsx'],
  },
  {
    id: 'duplicate-version', label: '依赖版本不一致', severity: 'low',
    messages: ['{pkg} 的版本与仓库基线不一致', '{pkg} 同时存在两个大版本'],
    files: ['package.json'],
  },
];

const PKGS = ['lodash', 'dayjs', 'axios', 'echarts', 'moment', 'qs', 'classnames', 'immer', 'uuid', 'antd'];
const AUTHORS = ['陈思远', '林晓彤', '王梓涵', '赵一鸣', '周雨欣', '吴承泽', '郑可馨', '孙浩然', '李牧之', '黄静怡', '徐嘉树', '何婉清'];

const TEAMS = ['交易前端组', '商家平台组', '增长组', '基础体验组', '数据产品组', '风控组'];

// [目录名, 中文名, 团队下标, 问题量级]。量级 0 表示没有问题。
const APP_DEFS = [
  ['checkout', '收银台', 0, 5], ['cart', '购物车', 0, 3], ['order-center', '订单中心', 0, 4],
  ['payment-result', '支付结果页', 0, 1], ['refund', '退款售后', 0, 2], ['invoice', '发票', 0, 0],
  ['merchant-admin', '商家后台', 1, 5], ['merchant-onboarding', '商家入驻', 1, 2], ['goods-publish', '商品发布', 1, 3],
  ['merchant-finance', '商家结算', 1, 0], ['store-decoration', '店铺装修', 1, 4], ['merchant-im', '商家客服', 1, 0],
  ['marketing-activity', '营销活动', 2, 4], ['coupon', '优惠券', 2, 2], ['invite', '邀请有礼', 2, 0],
  ['lottery', '抽奖', 2, 1], ['landing-builder', '落地页搭建', 2, 3], ['share-card', '分享卡片', 2, 0],
  ['home', '首页', 3, 2], ['search', '搜索', 3, 1], ['product-detail', '商品详情', 3, 3],
  ['user-center', '个人中心', 3, 0], ['login', '登录注册', 3, 1], ['message-center', '消息中心', 3, 0],
  ['address', '地址管理', 3, 0], ['feedback', '意见反馈', 3, 0], ['help-center', '帮助中心', 3, 0],
  ['settings', '设置', 3, 0], ['data-dashboard', '数据大盘', 4, 4], ['report-builder', '报表搭建', 4, 2],
  ['metric-explorer', '指标探索', 4, 0], ['ab-console', '实验平台', 4, 0], ['tracking-admin', '埋点管理', 4, 0],
  ['risk-console', '风控控制台', 5, 3], ['audit-log', '审计日志', 5, 0], ['blacklist', '名单管理', 5, 0],
  ['appeal', '申诉处理', 5, 0], ['logistics-tracking', '物流跟踪', 0, 0], ['live-stream', '直播', 2, 0],
  ['member', '会员', 2, 0], ['points-mall', '积分商城', 2, 0], ['about', '关于我们', 3, 0],
];

const SCAN_DATE = new Date('2026-11-20T03:00:00+08:00');
const DAY = 86400000;

const sha = () => Array.from({ length: 8 }, () => '0123456789abcdef'[int(0, 15)]).join('');
const iso = (d) => d.toISOString().slice(0, 10);

let issueSeq = 1000;

function makeIssue(app, type, forceNew) {
  const others = APP_DEFS.filter((a) => a[0] !== app.dir);
  const message = pick(type.messages)
    .replace('{other}', pick(others)[0])
    .replace('{pkg}', pick(PKGS))
    .replace('{n}', int(3, 7))
    .replace('{size}', int(540, 980));
  const file = pick(type.files);
  const line = file === 'package.json' ? int(12, 60) : int(8, 420);
  // 引入时间：大多数是存量问题，少数在上次扫描之后引入。
  const isNew = forceNew || rand() < 0.07;
  const ageDays = isNew ? int(0, 6) : int(9, 640);
  const introducedAt = new Date(SCAN_DATE.getTime() - ageDays * DAY - int(0, DAY - 1));
  const commit = sha();
  const path = `apps/${app.dir}/${file}`;
  return {
    id: `SCAN-${issueSeq++}`,
    type: type.id,
    severity: type.severity,
    message,
    file: path,
    line,
    introducedAt: iso(introducedAt),
    ageDays,
    isNew,
    author: pick(AUTHORS),
    commit,
    mr: int(4200, 9800),
    url: `${GITLAB}/-/blob/${commit}/${path}#L${line}`,
  };
}

function buildApp([dir, name, teamIdx, level]) {
  const app = { dir, name, team: TEAMS[teamIdx], path: `apps/${dir}`, url: `${GITLAB}/-/tree/main/apps/${dir}`, issues: [] };
  if (level === 0) return app;
  const total = [0, int(1, 3), int(4, 8), int(9, 15), int(16, 24), int(26, 38)][level];
  // 阻断级问题只出现在少数应用里。
  const blockerCount = { checkout: 3, 'merchant-admin': 2, 'store-decoration': 1, 'risk-console': 2, 'landing-builder': 1 }[dir] || 0;
  const blockers = TYPES.filter((t) => t.severity === 'blocker');
  const rest = TYPES.filter((t) => t.severity !== 'blocker');
  const weights = [5, 2, 6, 4, 2, 5]; // 对应 rest 的顺序
  const bag = rest.flatMap((t, i) => Array(weights[i]).fill(t));
  for (let i = 0; i < blockerCount; i++) app.issues.push(makeIssue(app, pick(blockers), i === 0 && dir === 'checkout'));
  for (let i = blockerCount; i < total; i++) app.issues.push(makeIssue(app, pick(bag), false));
  return app;
}

const apps = APP_DEFS.map(buildApp);

export const report = {
  repo: 'platform/web-monorepo',
  repoUrl: GITLAB,
  branch: 'main',
  commit: 'a41f9c2e',
  scannedAt: '2026-11-20 03:00',
  prevScannedAt: '2026-11-13',
  prevTotal: null, // 在下面计算
  severities: SEVERITIES,
  types: TYPES.map(({ id, label, severity }) => ({ id, label, severity })),
  apps,
};

const total = apps.reduce((n, a) => n + a.issues.length, 0);
const newCount = apps.reduce((n, a) => n + a.issues.filter((i) => i.isNew).length, 0);
const fixedSinceLast = 9;
report.fixedSinceLast = fixedSinceLast;
report.prevTotal = total - newCount + fixedSinceLast;
