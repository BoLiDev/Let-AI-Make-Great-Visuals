# Let AI Make Great Visuals

让 Agent 产出的 HTML（可视化、报告、API 文档、幻灯片，以后是网站）稳定地好看、干净、好用，而不是一眼 AI。

方案由四部分组成：**内置组件库 + 模板 + Skill + 评测闭环**。所有依赖都拷入仓库，产出物不访问外网。

> 当前状态：调研和方案设计已完成；第一个模板（扫描报告）可用。Skill、其他产出类型的模板和评测集尚未实现。调研原文在 [`research/`](research/)，其中每条结论都标了核实程度；不少来源只看到了搜索摘要。

## 现在能用的：扫描报告模板

```bash
node tools/build-report.mjs templates/scan-report/example/data.json -o report.html
```

提供一份 JSON 数据，得到一个零外部依赖、可离线打开的单文件 HTML 报告（列表页 + 子应用详情页）。只依赖 Node，不需要安装任何包。数据格式见 [`templates/scan-report/README.md`](templates/scan-report/README.md)。

效果：[`preview/out/scan-report-moss.html`](preview/out/scan-report-moss.html)，截图在 [`preview/screenshots/`](preview/screenshots/)。

默认外观是 Moss。另有五套外观可用 `--theme` 切换，[`preview/out/scan-report-compare.html`](preview/out/scan-report-compare.html) 可以并排比较：

| 外观 | Basecoat 风格 | 字体 | 特点 |
|---|---|---|---|
| `moss`（默认） | Maia | Instrument Sans / Geist Mono | 绿调暖灰，大圆角，概览放在面板里 |
| `onyx` | Maia | Instrument Sans / Geist Mono | Moss 的形状，黑白灰配色，默认深色 |
| `ink` | Sera | IBM Plex Sans / Mono | 直角、墨色、粗顶线 |
| `slate` | Nova | Hanken Grotesk / JetBrains Mono | 带蓝调的中性色 |
| `graphite` | Lyra | Instrument Sans / JetBrains Mono | 默认深色，琥珀色强调 |
| `baseline` | Vega（默认） | Geist | 未改动的 shadcn，仅作对照 |

目录：

- `templates/`：模板。每个模板包含页面脚本、数据校验和示例数据
- `components/report.css`：报告组件层，叠加在 Basecoat 之上
- `themes/`：外观主题，只覆盖变量
- `vendor/`：拷入的第三方文件，见 [`vendor/README.md`](vendor/README.md)
- `tools/`：`build-report.mjs` 生成报告，`build-preview.mjs` 重新生成预览，`shot.mjs` 截图和基础检查（需要 Playwright）
- `docs/preferences.md`：评审沉淀下来的审美偏好

## 一、为什么 AI 做的东西有 AI 感

三种毛病成因不同，解法也不同。

| 毛病 | 成因 | 解法 | 载体 |
|---|---|---|---|
| **看着像 AI** | 模型输出训练数据的中位数；各家生成器共用同一套工具链，默认样式一致。雷同主要在页面结构上，只换颜色字体治不好 | 方向不交给模型选：由用户或脚本从几套预设风格里选定；版式从模板骨架出发 | 风格包、模板 |
| **看着不干净** | 用卡片、图标、徽章、阴影代替层级判断，所有东西同等权重；间距字号随手写；不记得上一页用的值，越写越漂 | 颜色、字号、间距只能取 token；常用块用现成组件；限制数量（颜色、字体种类） | 组件库、token |
| **用着别扭** | 只做演示时的理想路径，空、加载、报错状态被跳过；装饰冒充功能；信息按数据结构平铺，没按读者任务组织；写的时候看不到渲染结果 | 每种产出类型有结构规范（先放什么）；渲染后做确定性检查 | 模板、检查脚本 |

两条贯穿性的结论：

- **禁用清单会过期。** 紫色渐变加 Inter 被禁之后，米色背景加衬线标题加赤陶色成了新的默认。清单只做辅助，重心放在模板和组件上。
- **提示词的作用一代比一代小。** 现有方案的演进方向是：脚本选方向、浏览器里做检查、收尾强制过关、独立评审。

## 二、方案

### 1. 内置组件库（`vendor/` + `components/`）

| 层 | 选型 | 许可证 |
|---|---|---|
| 视觉基础 | [Basecoat](https://basecoatui.com/)：shadcn 设计语言的无 React、无构建移植，自带预编译 CSS 和 shadcn 的多套风格包 | MIT |
| 自写组件层 | shadcn 没有的排版型组件：指标卡、发现条目、图表容器、时间线、侧注、封面、目录、幻灯片舞台、打印样式。只引用 shadcn 变量名，风格包可整体替换 | 自有 |
| 图表 | 优先手写 SVG；其次 Observable Plot + D3；复杂场景 ECharts | ISC / Apache-2.0 |
| 图示 | 优先手写 SVG；Mermaid 作为可选 | MIT（依赖待审计） |
| 字体 | 拉丁字体用 OFL 字体文件；中文默认系统字体栈，思源系列为可选包 | OFL-1.1 |
| 图标 | Lucide 精选子集，内联 SVG | ISC |
| 幻灯片 | 自写 16:9 舞台；需要可编辑 PPTX 时用 PptxGenJS | MIT |

核心部分约 8MB，纯报告内联后约 0.4MB。体积为调研时从 npm 包实测，许可证取自 npm 字段，拷入前需逐个核对 LICENSE 原文。

**已知风险**：未改动的 shadcn 默认外观本身就是最常见的 AI 特征。所以默认风格不能用 shadcn 的默认值，辨识度要来自非默认风格包、字体搭配和我们自己的版式。

### 2. 模板（`templates/`）

每种产出类型一套骨架，规定信息顺序和可用组件。规则按类型区分，网站的规则不照搬到报告。

- 报告：结论和严重程度在前，明细在后
- 可视化 / 讲解页
- API / 技术文档
- 幻灯片

### 3. Skill（`skill/`）

流程，而不是长篇审美说教：

1. 判断产出类型，选模板
2. 选定风格包（用户指定或脚本分配，不由模型自由发挥）
3. 只用 token 和组件填充真实内容
4. 运行内联脚本，生成零依赖单文件
5. 渲染并运行检查，不通过则修改，限制轮数

### 4. 评测闭环（`eval/`）

- **测试题**：16 道，四种类型各 4 道（常规、内容很密、内容很少、刁钻），内容固定
- **自动检查**：溢出、裁切、重叠、对比度、资源加载失败为硬性不通过；AI 味特征扫描为警告
- **人工评审**：盲选 A/B 页面，每轮几分钟，每轮只改一个变量
- **沉淀顺序**：反复出现的问题优先变成自动检查，其次是组件默认值，再次是范例，最后才是规则

## 三、路线

1. 拷入 Basecoat 和字体，做一页风格对比预览，选定 2–3 套默认风格
2. 报告类型的最小可用版本：组件层 + 报告模板 + Skill + 内联脚本
3. 评测集和 A/B 评审页，对比"有 Skill / 无 Skill"
4. 按评审结果迭代，再扩展到可视化、文档、幻灯片

## 调研

- [`research/01-existing-skills-and-prompts.md`](research/01-existing-skills-and-prompts.md)：约 20 个现有设计 Skill 和提示词方案
- [`research/02-community-techniques.md`](research/02-community-techniques.md)：成因分析、AI 味特征清单、社区做法
- [`research/03-building-blocks.md`](research/03-building-blocks.md)：组件库、字体、图表、幻灯片选型（第 12 节为内置约束下的结论）
- [`research/04-evaluation-and-feedback-loops.md`](research/04-evaluation-and-feedback-loops.md)：检查、评审和评测设计
