# make-interfaces-feel-better：按技能的 Review Output Format 输出

## Scope and Coverage

模式 `full`（未指定时的默认）。范围：`preview/out/scan-report-moss.html` 的列表页和 `#/app/checkout` 详情页，对应源码 `templates/scan-report/app.js`、`components/report.css`、`themes/moss.css`。无框架，原生 JS 拼字符串；样式体系是 Basecoat（Maia）预编译 CSS + 手写 CSS 变量，修改全部用同一体系表达（`src/report.css`、`src/theme.css`、`src/app.js`），没有引入第二套。边界：vendored Basecoat 本身不改，只在本层覆盖。下表的“位置”指原版文件行号，“After”已全部落到本目录的 `src/`。

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | 两页全部文字；`check.mjs` 读取计算样式 | 3 条 |
| Surfaces | 概览、表格、按钮、输入框、链接；`check.mjs` 逐个探测点击区域 | 4 条 |
| Animations | 主题切换、排序、搜索、行悬停、首次打开；CDP 把播放速率设为 10% 逐帧读数 | 4 条 |
| Icons | 全部 Lucide 图标的描边、尺寸、状态 | 2 条 |
| Performance | 所有元素及伪元素的 `transition-property` 计算值 | 1 条 |

## Findings

#### Concentric border radius
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `themes/moss.css:29`、`components/report.css:239` | 概览面板 16px 圆角、24px 内边距，里面只有 999px 的分布条，圆角之间没有关系 | 外框 20px = 瓦片 12px + 内边距 8px（`--shell-radius: calc(var(--tile-radius) + var(--shell-pad))`） | 嵌套圆角应同心 |

#### Shadows for elevation, borders for structure
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `themes/moss.css:35`、`report.css:428` | 表格只有一条顶线，概览靠灰底，outline 按钮用实色边框 | 概览、表格、种类分布、返回按钮、筛选按钮统一用技能给出的三层透明阴影 `--shadow-border`，悬停换 `--shadow-border-hover`；深色下是一圈 `oklch(1 0 0 / 0.08)`。行分隔线、顶栏底线、输入框边框保留为边框 | 层级用阴影，结构用边框 |

#### Minimum hit area
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `app.js:97`（主题按钮 32px）、`app.js:81`（排序按钮约 28px）、`app.js:216`（代码位置链接约 20px 高）、`app.js:254`（面包屑约 20px）、`report.css:598`（summary 约 20px）、搜索框 36px | 可点范围等于可见范围 | 主题按钮和搜索框做到 40px；排序、位置链接、仓库链接、路径链接、返回、筛选按钮用 `::after` 补到 40px 高；summary `min-height: 40px` | 桌面密集界面至少 40x40，且互不重叠 |

#### Optical alignment
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `report.css:488`（排序按钮 `padding: 4px 6px`）、主题按钮 | 文字加图标的按钮两侧内边距相等；40px 图标按钮会让图标离内容区右缘 10px | 图标一侧少 2px（排序 8/6，返回 10/12）；图标按钮 `margin-right: -10px`，让图标而不是按钮对齐右缘 | 视觉对齐优先于几何对齐 |

#### Interruptible animations / contextual icon animations
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `app.js:80`、`app.js:97`、`app.js:326-328`、`app.js:303-304` | 切主题时整页 `innerHTML` 重建，太阳和月亮直接替换；排序时整张表连表头重建，箭头直接替换 | 顶栏只渲染一次，表头不重建只换 `tbody`；每个位置的图标都留在 DOM 里叠放，用过渡交叉淡入淡出：scale 0.25→1、opacity 0→1、blur 4px→0，300ms，`cubic-bezier(0.2, 0, 0, 1)`（项目没有 motion 库，按技能走 CSS 方案） | 状态切换的图标要有进有出，而且能被打断 |
| LOW | `app.js:180`（`type="search"`） | 靠浏览器自带的清除叉 | 自己的清除按钮，有内容时用同一组数值入场、退场；隐藏时 `visibility: hidden` 且 `tabindex=-1` | 同上 |

#### Split and stagger enter
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `app.js:340` | 首次打开整页同时出现 | 标题、概览、表格区、种类区四块依次间隔 100ms，`opacity + translateY(12px) + blur(4px)`，400ms ease-out；只在首次打开播放，路由切换时去掉 `is-entering` 不重播 | 不常见的整页入场拆块错开；高频操作不加 |

#### Scale on press
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | Basecoat `.btn:active`（`translate-y: 1px`）、`report.css:488` | 按钮按下位移 1px，排序按钮没有反馈 | 所有按钮 `:active { scale: 0.96 }`，`transition-property: scale, background-color, color, box-shadow`，150ms ease-out；表格行和文字链接不加（相当于技能里的 `static`） | 按压反馈统一为 0.96 |

#### Motion restraint
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `report.css:473`、`report.css:616`、`report.css:658` | `120ms ease`；减少动效只关了 transition | 行悬停只有 100ms `background-color` ease-out，行尾箭头常驻、只变色；`prefers-reduced-motion` 同时关掉过渡和入场动画，颜色、图标、`aria-sort`、`aria-pressed` 这些静态提示都在 | 高频交互不做定制动画；动效不是唯一反馈 |

#### Font smoothing
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `report.css:73` | `-webkit-font-smoothing` 设在 `body`，没有 `-moz-osx-font-smoothing` | 两条都设在 `html` | 在根上设一次 |

#### Tabular numbers
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `app.js:179`（标题旁的“20 个”）、图例 | 计数是静态的；大数字用了 tabular-nums | 计数随搜索和筛选变化（“5 / 20 个”），和筛选按钮、图例里的数字一起用 `tabular-nums`；概览的大数字是静态展示数字，按技能的表格去掉 | 会变的数字和数字列用等宽数字 |

#### Text wrapping
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `report.css:223`、`report.css:535` | 只有 h1 有 `balance` | h2 加 `balance`；问题说明、页脚、导语加 `pretty` | 标题均衡，短正文避免孤字 |

#### Icon stroke and sizing
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `report.css:103`、`:157`、`:505`、`:549`、`:581` | 描边 1.75px；尺寸有 13 / 14 / 16 / 22px；表头 500 字重 | 紧邻图标的文字全部是 400 字重，描边统一 1.5px；尺寸只用 16 和 20 | 描边跟随文字字重，一套图标一个粗细，用原生网格尺寸 |
| LOW | 行尾 | 可点击的行没有指示 | 行尾加常驻的 chevron-right，状态只靠 `currentColor` 变色 | 一个 SVG，状态由 CSS 颜色驱动 |

#### Never use `transition: all`
| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `vendor/basecoat/css/maia.min.css` 的 `.btn` | `transition-property: all` | 在本层覆盖为明确的四个属性；输入框和表格行也改成只列用到的属性 | 只过渡会变的属性 |

## Considered but Rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| 列表行悬停 | 悬停时让行尾箭头用图标动画入场 | 行悬停是技能点名的高频交互，只给底色过渡；箭头常驻 |
| 列表和详情之间切换 | 给路由切换加退出和入场动画 | 来回切换是重复操作；技能说动效不提供信息时直接移除 |
| 全页 | Image outlines | 页面没有任何图片（`document.images.length === 0`），不适用 |
| 筛选按钮选中态 | 用 fill 图标变体表示选中 | vendored Lucide 只有描边图标，再引一套就是混用图标库；选中态改用底色 + `aria-pressed` |
| 任意元素 | `will-change` | 没有观察到首帧卡顿，技能要求不预先加 |

不适用且未列入的：`initial={false}` / motion 库相关（项目没有 motion 依赖；等价处理是图标在首次渲染时就处于终态，不播入场）、RTL 图标翻转（中文单语报告）、按钮的 `static` prop（没有组件体系，用“不加 :active 规则”表达）。

## Verification and Verdict

1. **Verification**
   - `node build.mjs`：生成 `scan-report.html`，480 KB，单文件。
   - `node shot.mjs`：1280x1000、2x 的 `list.png`、`detail.png`；两页 `scrollWidth == clientWidth`，无控制台错误。
   - `node check.mjs`（完整输出见 `review/check-output.json`）：
     - 计算样式里 `transition-property` 含 `all` 的元素和伪元素：0。
     - 点击区域：两页所有链接、按钮、输入框逐个从中心向四周探测 `elementFromPoint`，小于 40x40 的 0 个，被别的可点元素盖住中心的 0 个。
     - 运行时的非 `file:` / `data:` 请求：0；图片数量 0。
     - 走查：点行进详情、返回按钮回列表、键盘回车进详情、浏览器后退、筛选（阻断 3 / 28）、搜索（“交易” 5 / 20）、空状态和清除、按引入时间排序（`aria-sort` 更新）、按住按钮时 `scale` 为 0.96，全部通过。
     - 10% 速度（CDP `Animation.setPlaybackRate 0.1`）：主题图标 600ms 时两个图标分别是 opacity 0.47 / 0.53、scale 0.60 / 0.65、blur 2.1 / 1.9px；1200ms 时再点一次，100ms 后数值从 0.17 / 0.83 附近折返而不是跳回起点，最后回到初始状态。入场在 2500ms 时四块 opacity 为 0.82 / 0.55 / 0.21 / 0.00，切到详情页后不重播。
     - 深色：卡片阴影是单圈 `oklch(1 0 0 / 0.08)`；390px 宽两页都没有页面级横向溢出；`prefers-reduced-motion` 下动画数为 0、内容直接可见。
   - **Not verified**：`-webkit-font-smoothing` 和 `-moz-osx-font-smoothing` 的实际效果（只在 macOS 生效，这里是 Linux Chromium）；Safari、Firefox 下的表现；`:active` 缩放和悬停过渡的手感只读了数值，没有人眼在 10% 速度下看过；键盘焦点环只验证了回车导航，没有逐个截图；390px 下表格在卡片内横向滚动，未做窄屏专门版式。
2. **Verdict**：`Approve`（针对本目录的成品：以上各条都已落实，没有遗留的可执行问题）。未验证项见上一条。
