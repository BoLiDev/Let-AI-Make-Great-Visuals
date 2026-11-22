# 03 · 构建基础调研：组件库 / CSS / Token / 字体 / 图表 / 图示 / 幻灯片 / 文档 / 图标

> 调研日期：2026-11-22。目标场景：coding agent 一次性写出的**单文件、无构建、可选离线、明暗双主题**的 HTML（可视化解释 > 报告 > 技术文档 > 幻灯片 > 之后才是真实网站）。
> 本文只管"用什么砖"，不管 prompt/skill 包装、社区经验与评测闭环（由其他调研覆盖）。

## 0. 结论先行

1. **主体 CSS 应该自建一个很薄的 token + 组件层**（约 15–25KB，直接内联），而不是采用现成组件库。现成库要么依赖运行时编译（Tailwind browser）、要么长相就是"AI 默认脸"（shadcn 默认主题、daisyUI、Pico），要么对"报告 / 解释页 / 幻灯片"这类排版型产物覆盖很差（它们几乎都是为 App UI 设计的）。
2. 但 **token 的命名沿用 shadcn/ui 的约定**（`--background / --foreground / --card / --muted / --primary / --border / --ring / --chart-1..5`），色阶取 Radix Colors 的 12 级语义，缓动 / 阴影 / 尺寸可参考 Open Props。这样模型"天生会用"，还能直接导入 tweakcn 等主题。
3. **图表默认：手写 SVG（简单图）→ Observable Plot（数据图）→ ECharts 6（强交互 / 仪表盘）**。图示默认手写 SVG / HTML+CSS，复杂图才用 Mermaid 12，并且必须走 `base` 主题 + 从 token 映射的 `themeVariables`。
4. **幻灯片默认自写**：固定 16:9 舞台 + 横向翻页的约 150 行 JS（frontend-slides、guizang-ppt-skill 这两个最流行的 skill 都是这条路线）。reveal.js 6 作为需要演讲者视图 / 插件时的备选。可编辑 PPTX 走 pptxgenjs 原生生成，不走 HTML 转换。
5. **离线分三档**：A 零依赖（只有内联 CSS + 内联 SVG）；B CDN 固定版本 + 降级；C 把库内联进文件。Mermaid（5.4MB）、D2（8.2MB）、Scalar（4.5MB）体积太大，离线时只能在生成阶段预渲染成 SVG / 静态 HTML。
6. **中文字体默认用系统字体栈**，不要内嵌整套 CJK 字体。标题想要有个性的中文字时，联网用 Google Fonts / 中文网字计划的分包，离线用 `pyftsubset` 只抽用到的几十个字再 base64 内嵌。

## 关于核实程度

| 标记 | 含义 |
|---|---|
| 【实测】 | 本次从 npm registry 拉取 tarball 直接读取或测量（版本号、发布日期、许可证、文件体积、文件清单、README 内容） |
| 【搜索】 | 来自本次网页搜索结果的摘要，未打开原始页面逐字核对 |
| 【未核实】 | 来自我的既有知识或推断，本次没有找到来源或无法访问 |

本次会话的网络限制：`cdn.jsdelivr.net`、`mermaid.js.org` 等站点无法直接访问，GitHub API 不可用，所以 **CDN URL 的可用性、star 数、各项目文档细节均未直接核实**。体积数据是 npm 包内文件的大小，gzip 为本地 `gzip -c` 默认级别，CDN 上的 brotli 会更小。"模型用得稳不稳"一栏全部是我的判断，不是测量结果，建议在评测闭环里实测。

---

## 1. CSS 框架 / 设计 token / 组件库

### 1.1 对比

| 方案 | 最新版本【实测】 | 无构建单文件用法 | 体积【实测】 | 默认长相 | 模型使用可靠度（判断） | 离线 |
|---|---|---|---|---|---|---|
| [Tailwind CSS v4](https://tailwindcss.com/docs/installation/play-cdn) `@tailwindcss/browser` | 4.3.5（2026-11-06） | 一个 `<script>`，浏览器内即时编译；主题写在 `<style type="text/tailwindcss">` 的 `@theme` 里 | 280KB / gz 73KB（JS） | 无默认组件，但模型写出来的就是"Tailwind 脸" | 很高，但常混用 v3 写法 | 需内联 280KB 的编译器 |
| [daisyUI 5](https://daisyui.com/) | 5.8.2（2026-11-20） | CSS 文件 + Tailwind browser 脚本 | `daisyui.css` 1154KB / gz 66KB；`themes.css` 37KB | 圆润、彩色，辨识度高，35 套主题【未核实数量】 | 高（类名语义化：`btn`、`card`） | 差（体积大） |
| [shadcn/ui](https://ui.shadcn.com/docs/theming) | — | 不能：React + 构建 | — | 中性灰、细边框，当下最典型的"AI 生成感" | 模型极熟 | — |
| [Basecoat](https://basecoatui.com/)（shadcn 的原生 HTML 移植） | 1.2.1（2026-11-21） | `basecoat.cdn.min.css` + 可选 JS | CSS 287KB / gz 29KB；`all.min.js` 53KB / gz 13KB | 同 shadcn；另有 Vega / Nova / Maia / Lyra / Mira / Luma / Sera / Rhea 八套 style pack | 中（类名新，模型训练数据少） | 可（内联 29KB gz） |
| [Franken UI](https://franken-ui.dev/)（shadcn 风格 + UIkit 行为） | 2.1.2（2026-01-18） | `core.min.css` + `core.iife.js` | 191KB / gz 25KB + JS 233KB / gz 75KB | 同 shadcn | 低到中（`uk-*` 属性容易写错） | 一般 |
| [Open Props](https://open-props.style/) | 1.7.23（2026-01-31）；2.0 仍是 beta【搜索】 | 一个 CSS，只提供变量 | 28KB / gz 7KB；`normalize.min.css` 8KB | 没有组件，只有 token；自带 oklch 色板 | 中（变量名要查表） | 好 |
| [Pico CSS](https://picocss.com/) | 2.1.1（2025-03-15，一年半未发版） | 一个 CSS，classless 版可零 class | 81KB / gz 11KB；classless 69KB / gz 10KB | 干净，但一眼能认出是 Pico | 高（写语义 HTML 即可） | 好 |
| [Oat](https://github.com/knadh/oat)（knadh） | 1.1.0（2026-11-01） | CSS + 小 JS，语义标签自动出样式 | 31KB / gz 7KB + JS 11KB / gz 3KB | 朴素、克制 | 高 | 好 |
| [UnoCSS runtime](https://unocss.dev/integrations/runtime) | 66.13.0（2026-11-13） | 一个 `<script>`，同样是浏览器内生成 | 186KB / gz 51KB | 同 Tailwind | 中（preset 差异多） | 需内联 |
| [Web Awesome](https://webawesome.com/)（Shoelace 继任） | 3.15.0（2026-11-17） | autoloader + 主题 CSS；3.5 起有免登录公共 CDN【搜索】 | 主题 CSS 17–26KB；组件按需加载，共 85 个组件目录 | 三套免费主题：default / awesome / shoelace | 中（`wa-*` 标签，模型常写成旧的 `sl-*`） | 差（按需加载的多文件） |
| [Shoelace](https://shoelace.style/) | 2.20.1（2025-03-11），已停更【搜索】 | — | — | — | 模型熟，但已过时 | — |
| [Material Web](https://github.com/material-components/material-web) | 2.5.0（2026-07-15），2024-06 起维护模式【搜索】 | ESM import | — | Material 3，辨识度高但"谷歌味" | 低 | 差 |
| [Radix Colors](https://www.radix-ui.com/colors) | 3.0.0（2023-10，稳定未更新） | 每个色一个 CSS 文件（共 126 个） | 每文件约 1KB | 仅色板：12 级阶梯，每级有明确用途，明暗成对 | 中 | 好（拷值即可） |
| [Tufte CSS](https://edwardtufte.github.io/tufte-css/) | 1.9.0（2026-06-25） | 一个 CSS | 6KB / gz 1KB | 强烈的学术 / 书籍感，侧注 | 高（纯语义标签 + 少量 class） | 好（字体需另备） |
| 其他 classless：[missing.css](https://missing.style/) 1.3.0、[MVP.css](https://andybrewer.github.io/mvp/) 1.18.0、[simple.css](https://simplecss.org/) 2.3.7、[sakura](https://github.com/oxalorg/sakura) 1.5.1 | 【实测版本】 | 一个 CSS | 均很小【未测】 | 都是"默认好看的文档"，彼此相似 | 高 | 好 |

来源：Tailwind Play CDN 文档（官方写明仅用于开发）[tailwindcss.com](https://tailwindcss.com/docs/installation/play-cdn)；Basecoat [github.com/hunvreus/basecoat](https://github.com/hunvreus/basecoat)；Franken UI [npmjs.com/package/franken-ui](https://npmjs.com/package/franken-ui)；Web Awesome 与 Shoelace 的关系 [blog.fontawesome.com](https://blog.fontawesome.com/how-does-web-awesome-stack-up-against-shoelace/)、公共 CDN [blog.fontawesome.com](https://blog.fontawesome.com/wa-3-5-public-cdn-and-wa-page-for-everyone/)；Material Web 维护模式 [github.com/material-components/material-web/discussions/5642](https://github.com/material-components/material-web/discussions/5642)；Oat [github.com/knadh/oat](https://github.com/knadh/oat)；tweakcn [github.com/jnsahaj/tweakcn](https://github.com/jnsahaj/tweakcn)。

### 1.2 哪些有辨识度，哪些模型用得稳

- **模型最稳的是 Tailwind 工具类和 Chart.js / ECharts 这类高频库**，但稳的代价是趋同：圆角卡片 + 灰边框 + indigo/紫色渐变 + Inter，正是要摆脱的那张脸。可靠度和辨识度在现成库上基本是反向的。
- **有自己长相的**：Tufte CSS（学术）、daisyUI 的部分主题（retro / cyberpunk / lofi 等）、Material Web、Basecoat 的 style pack（本次只确认了名字，没看到实际效果）。
- **只给 token 不给长相的**（Open Props、Radix Colors）最适合做我们的原料：它们解决"数值选得好不好"，不规定最终风格。
- **shadcn 的真正价值在变量约定**，不在组件：模型对 `--background`、`--muted-foreground`、`--chart-1` 这套名字非常熟，tweakcn 等编辑器导出的主题就是这套变量的 oklch 取值【搜索】。沿用它，等于白拿模型的先验和一个现成的主题生态。

### 1.3 建议

- 自建薄层，结构为三层：**原始 token（色阶、字号阶、间距、圆角、阴影、缓动）→ 语义 token（shadcn 命名）→ 约 30–40 个面向"排版型产物"的组件**（callout、指标卡、带注释的图表容器、表格、时间线、步骤、对比栏、代码块、脚注 / 侧注、封面、目录、严重度徽章等）。App 型组件（下拉、对话框、表单校验）第一期不做。
- 用现代 CSS 免构建：`oklch()`、`light-dark()`、`color-mix()`、`@layer`、原生嵌套、容器查询、`text-wrap: balance/pretty`【未核实各特性的最低浏览器版本，建议以 Baseline 2024 为线自行确认】。
- 明暗主题：`color-scheme: light dark` + `light-dark()`，再提供 `[data-theme]` 手动覆盖。
- 风格差异全部放在"主题文件"里（只改 token + 少量组件变体），组件 class 名不变。这样模型只需要学一套 class。

### 1.4 坑

- **Tailwind v3 / v4 混写**：模型常写 `cdn.tailwindcss.com`（v3）和 `tailwind.config = {...}`，而 v4 是 `@tailwindcss/browser@4` + CSS 内 `@theme`。v4 要求 Safari 16.4+ / Chrome 111+ / Firefox 128+【搜索】。
- Tailwind browser 是运行时编译：首屏闪烁、JS 被禁用就全裸、官方明确说不用于生产。`@apply` 和 `@plugin`（如 typography 插件）在浏览器版里是否可用**未核实**。
- Basecoat 的 `basecoat.cdn.min.css` 是否完全不依赖 Tailwind 脚本，本次只看到文件名，**未核实**。
- daisyUI 的 CDN CSS 有 1.1MB，不适合内联。
- Web Awesome 的组件是按需加载的多文件，离线单文件基本不可行；Pro 组件收费。
- classless 库在"报告"上够用，一到图表容器、指标卡、封面这些就得自己补，补的部分才是决定观感的部分。

---

## 2. 字体与排版

### 2.1 西文字体（均为 Google Fonts 上的 OFL 字体，许可证条款【未核实】逐个确认）

| 用途 | 推荐（避开 Inter / Roboto / Arial） | 气质 |
|---|---|---|
| 无衬线正文 / UI | Geist、IBM Plex Sans、Instrument Sans、Figtree、Hanken Grotesk、Public Sans、Atkinson Hyperlegible Next | 中性但不撞脸 |
| 无衬线标题 | Bricolage Grotesque、Schibsted Grotesk、Manrope、Sora、Space Grotesk（已被用滥，慎用） | 有性格 |
| 衬线正文 | Source Serif 4、Newsreader、Literata、Crimson Pro、Spectral | 长文、报告 |
| 衬线标题 | Fraunces、Instrument Serif、Playfair Display（已被用滥）、Gloock、Young Serif | 编辑 / 杂志感 |
| 等宽 | JetBrains Mono、IBM Plex Mono、Geist Mono、Commit Mono、Martian Mono | 代码、数据标签 |

Fontshare（[fontshare.com](https://www.fontshare.com/)）的 Satoshi、General Sans、Cabinet Grotesk、Clash Display、Switzer、Sentient、Zodiak 质量很高，但走的是 ITF Free Font License：可免费商用，**不能再分发字体文件**【搜索确认 Satoshi 用此许可；"不可再分发"这一点未核实】。所以只能从它的 CDN 引用，不能放进我们的仓库，也不适合离线档。另外 Satoshi 只有拉丁字符【搜索】。

**推荐搭配**（每个主题固定一组，不让模型临场挑）：

| 主题方向 | 标题 | 正文 | 等宽 |
|---|---|---|---|
| 编辑 / 杂志 | Fraunces | Instrument Sans 或 Source Serif 4 | JetBrains Mono |
| 分析报告 | Newsreader | IBM Plex Sans | IBM Plex Mono |
| 技术文档 | Geist | Geist | Geist Mono |
| 瑞士 / 国际主义 | Schibsted Grotesk 或 Hanken Grotesk（单一字族，靠字号字重拉反差） | 同左 | Commit Mono |
| 稳妥的超级家族 | Source Serif 4 | Source Sans 3 | Source Code Pro |

### 2.2 中文字体

| 字体 | 许可 | 网页加载方式 | 备注 |
|---|---|---|---|
| 思源黑体 / Noto Sans SC、思源宋体 / Noto Serif SC | OFL【实测 Fontsource 包标注 OFL-1.1】 | Google Fonts 自动按 `unicode-range` 切成上百个分包，只下载用到的字【未核实分包数】 | 最稳的联网选择 |
| [霞鹜文楷](https://github.com/lxgw/LxgwWenKai) | OFL【未核实】 | npm 包 `lxgw-wenkai-screen-web` 1.530.0【实测】：996 个 woff2 分包，单个 `result.css` 就有 218KB | 有手写温度，适合叙事类；CSS 本身太大，不能内联 |
| 得意黑 Smiley Sans | OFL【未核实】 | 需自行分包 | 斜体展示字，只用于标题 |
| 阿里巴巴普惠体、MiSans、HarmonyOS Sans、OPPO Sans | 各家免费商用协议【未核实】 | 需自行分包 | 分发条款各不相同，不建议放进仓库 |

分包工具：[cn-font-split](https://github.com/KonghaYao/cn-font-split) 7.4.3【实测版本】，[中文网字计划](https://chinese-font.netlify.app/)提供现成的分包 CDN【搜索】。

**离线 / 默认方案：系统字体栈**

```css
--font-sans-cjk: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei",
                 "Noto Sans CJK SC", "Source Han Sans SC", sans-serif;
--font-serif-cjk: "Songti SC", "Source Han Serif SC", "Noto Serif CJK SC", "SimSun", serif;
--font-kai-cjk: "Kaiti SC", "STKaiti", "KaiTi", serif;
```

西文字体写在中文字体前面，这样拉丁字符和数字用西文字体、汉字回落到中文字体。

**中文排版要点**【均未核实浏览器支持细节】：
- 必须写 `lang="zh-CN"`（影响汉字字形变体选择和标点处理）。
- 正文行高 1.7–1.9，比西文大；不要给中文加负字距。
- 中文没有斜体，强调用加粗、着重号（`text-emphasis`）或换楷体。
- 中英混排的间距可用 `text-autospace`，标点挤压用 `text-spacing-trim`，支持度需确认。
- Windows 上没有好看的系统宋体（只有中易宋体），衬线风格的中文在 Windows 离线时会明显掉档，主题里要接受这一点或改用黑体。

**小技巧**：封面 / 幻灯片标题只有几十个字时，用 `pyftsubset`（fonttools）按实际用字抽子集，再 base64 内嵌，通常只有几十 KB【未实测】。这是离线档里唯一现实的"有个性的中文标题字"方案。

### 2.3 字号阶与长文样式

| 资源 | 用途 | 判断 |
|---|---|---|
| [Utopia](https://utopia.fyi/)（`utopia-core` 1.6.0【实测】） | 用 `clamp()` 生成随视口流动的字号 / 间距阶 | 适合网站与解释页；我们可以直接把算好的 `clamp()` 值写死进 token |
| 固定模数阶（1.2 或 1.25） | 报告、文档 | 更可控，打印一致 |
| 幻灯片 | 用容器查询单位（`cqw`）或固定 1920×1080 舞台整体缩放 | 字号必须和舞台绑定，不能跟视口文本阶走 |
| [Tufte CSS](https://edwardtufte.github.io/tufte-css/) | 长文、侧注、边注图 | 值得借鉴的是侧注和版心宽度的做法，不必整体采用 |
| [@tailwindcss/typography](https://github.com/tailwindlabs/tailwindcss-typography) 0.5.20【实测】 | `prose` 长文样式 | 数值调得好，但依赖构建；可参考其比例自己写一个 `.prose` |

长文硬规则建议写进组件层：版心 60–75 字符（中文 30–38 字）、标题 `text-wrap: balance`、段落 `text-wrap: pretty`、数字列用 `font-variant-numeric: tabular-nums`。

### 2.4 坑

- 字体联网失败时回落到系统字体，布局不能因此崩：标题别依赖某个字体的特定宽度。
- Google Fonts 在中国大陆的可达性不稳定【未核实现状】，中文用户场景要么用系统字体，要么换镜像或中文网字计划。
- claude.ai Artifact 这类沙箱只允许从 Google Fonts 加载样式表（见本会话的 Artifact 工具说明），Fontshare 的 CSS 在那里加载不了。
- 可变字体的 `opsz`、`wght` 轴要显式设置，否则 Fraunces 这类字体的效果出不来。

---

## 3. 图表 / 数据可视化

### 3.1 对比

| 库 | 版本【实测】 | 体积【实测】 | 默认观感 | 主题化 | 明暗 | 模型可靠度（判断） |
|---|---|---|---|---|---|---|
| 手写 SVG | — | 0 | 完全由我们决定 | 直接用 CSS 变量 | 天然支持 | 数据点少（约 30 个以内）时高；坐标要让 agent 用脚本算，别心算 |
| [Observable Plot](https://observablehq.com/plot/getting-started) | 0.6.19（2026-11-05） | 206KB / gz 67KB，另需 D3 274KB / gz 90KB | 克制、接近出版物；默认用 `currentColor` | 通过选项和 CSS | 文字和轴线自动跟随文字色 | 中到高：API 短（一行一个 mark），但训练数据比 Chart.js 少 |
| [ECharts](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature) | 6.1.0（2026-05-19） | 1095KB / gz 360KB | v6 换了新默认主题，图例默认移到底部【搜索】 | 主题对象；v6 支持 `setTheme()` 运行时切换【搜索】 | 监听 `prefers-color-scheme` 后调 `setTheme('dark')` | 高（中文语料尤其多），配置冗长 |
| [Chart.js](https://www.chartjs.org/) | 4.6.1（2026-10-22） | 205KB / gz 69KB | 一眼能认出的默认样子（灰网格、顶部图例） | 全局 `Chart.defaults` | 需手动设文字 / 网格色 | 最高 |
| [Vega-Lite](https://vega.github.io/vega-lite/) | 6.5.0（2026-10-08） | vega-lite 251KB + vega 500KB + vega-embed 59KB（gz 共约 270KB） | 学术默认样式，可识别 | `config` 对象 / vega-themes | 需切换 config | 中到高：JSON 规格可用 schema 校验，是优点 |
| [uPlot](https://github.com/leeoniya/uPlot) | 1.6.32（2025-03） | 49KB / gz 21KB | 很素 | 手动 | 手动 | 低到中；只适合大量时间序列 |
| [D3](https://d3js.org/) | 7.9.2（2026-11-03） | 274KB / gz 90KB | 无默认 | 完全手写 | 手写 | 中：代码量大，容易出细节错 |

来源：Plot 官方入门（UMD 需先加载 D3，再加载 Plot；可下载到本地离线使用）[observablehq.com/plot/getting-started](https://observablehq.com/plot/getting-started)；ECharts 6 新特性与升级指南 [echarts.apache.org](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature)、[upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide)。

### 3.2 建议

按复杂度分三级，写进 skill 的决策表：

1. **手写 SVG**：单个指标、迷你图、少量柱 / 线、带注释的概念图。零依赖，离线档唯一选择，风格完全受控。配一个生成坐标的小脚本或内联的十几行绘图辅助函数。
2. **Observable Plot + D3**：常规数据图的默认。原因是默认观感最接近"编辑部图表"，颜色跟随 `currentColor` 所以明暗几乎免费，代码短。
3. **ECharts 6**：需要缩放、联动、tooltip 丰富、地图 / 桑基 / 关系图等，或者仪表盘类报告。

不论哪一级，都提供**从 CSS 变量读取调色板的统一适配函数**（读 `--chart-1..N`、`--foreground`、`--border`），避免每个图各配各的颜色。

### 3.3 坑

- Canvas 类库（Chart.js、ECharts 默认渲染器）读不到 CSS 变量，必须用 JS 取 `getComputedStyle` 后传入，主题切换时要重绘。ECharts 可选 SVG 渲染器。
- ECharts 6 默认布局变了，模型按 v5 的经验写的 `grid` / `legend` 位置可能不对；官方提供 `echarts/theme/v5.js` 还原旧布局【搜索】。
- Chart.js 默认配色和图例位置是强烈的"默认感"，要用就必须全局覆盖 defaults。
- 模型容易给图表加多余的东西：渐变填充、阴影、3D、每根柱一个颜色。这些要在指南里明令禁止，属于其他调研的范围，这里只提醒砖本身不会替你挡住。
- Vega 系要三个脚本，离线内联约 810KB，不划算。

---

## 4. 图示（流程 / 架构 / 关系）

### 4.1 对比

| 方案 | 版本【实测】 | 体积【实测】 | 观感与主题化 | 适用 |
|---|---|---|---|---|
| 手写 SVG / HTML+CSS（grid 布局 + SVG 连线） | — | 0 | 完全受控，可用我们的 token 和字体 | 节点少（约 12 个以内）的讲解图、架构图。质量上限最高 |
| [Mermaid](https://mermaid.js.org/config/theming.html) | 12.3.0（2026-11-03） | `mermaid.min.js` 5408KB / gz 1550KB | v12 起流程图、时序图、类图、ER、状态图等默认改为 `redux-color` 主题 + `neo` 外观；另有 `redux`、`neo`、`neutral`、`dark`、`forest`、`default` 及其暗色版；**只有 `base` 主题能用 `themeVariables` 改**；外观可选 `classic` / `neo` / `handDrawn` | 节点多、需要自动布局的图 |
| [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)（Craft 出品） | 1.1.3（2026-02-26） | npm 包只有 ESM `dist/index.js` | 支持流程、状态、时序、类、ER、XY 图共 6 类；15 套主题；用 CSS 变量换肤；同步渲染；可出 ASCII | 想要比 Mermaid 更干净的输出，且能接受打包或在生成阶段预渲染 |
| [D2](https://d2lang.com/)（`@terrastruct/d2`） | 0.1.33（2025-08-17，npm 一年多未更新） | 浏览器包 8195KB（内含 WASM） | 默认比 Mermaid 好看，有主题和 `sketch` 手绘模式 | 只建议用 CLI 在生成阶段预渲染成 SVG |
| [rough.js](https://roughjs.com/) | 4.6.6（2023-11，稳定） | 27KB / gz 8KB | 手绘质感，可画任意形状 | 给手写 SVG 加手绘风格；体积小，可内联 |
| [svg2roughjs](https://github.com/fskpf/svg2roughjs) 3.2.3、[mermaid-to-excalidraw](https://github.com/excalidraw/mermaid-to-excalidraw) 3.6.0 | 【实测版本】 | 【未测】 | 把现成 SVG / Mermaid 转成手绘风 | 可选的后处理 |

来源：Mermaid 主题文档（本次从 GitHub 仓库的 `docs/config/theming.md` 读取）[github.com/mermaid-js/mermaid](https://github.com/mermaid-js/mermaid/blob/develop/docs/config/theming.md)；Mermaid 12.0.0 发行说明转载 [newreleases.io](https://newreleases.io/project/github/mermaid-js/mermaid/release/mermaid@12.0.0)；D2.js README（包内）。beautiful-mermaid 的 GitHub 仓库地址**未核实**，npm 包名确认无误。

### 4.2 让 Mermaid 不像默认

```js
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',                 // 只有 base 接受 themeVariables
  look: 'neo',                   // 或 'handDrawn' / 'classic'
  themeVariables: {              // 只接受十六进制色值，不认颜色名
    primaryColor: '#f4f1ea', primaryTextColor: '#1a1a1a', primaryBorderColor: '#1a1a1a',
    lineColor: '#1a1a1a', fontFamily: 'var 不可用，需写字体名', fontSize: '15px'
  }
});
```

- `themeVariables` 只认 hex【搜索】，所以我们的 oklch token 需要在主题文件里另存一份 hex，或用 JS 换算后传入。
- 明暗切换要重新 `initialize` 并重绘。
- `base` 主题在 `neo` 外观下默认给节点边框上渐变，设置了自定义 `nodeBorder` 才会关掉【搜索，二手来源】。
- v12 是破坏性版本（要求 Safari 17.4+），旧图会重新布局和换色；想回到旧样子要同时设 `layout: dagre`、`theme: default`、`look: classic`【搜索】。
- 模型写的 Mermaid 语法出错率不低（特殊字符、引号、中文标点），渲染失败时整块空白。需要失败时显示源码的降级。

### 4.3 建议

- **默认手写**，并在组件库里给出可复制的图示配方：横向流程、分层架构、时序、状态机、对比矩阵、时间线。每个配方是一段 HTML + CSS grid + 少量 SVG 连线，节点文字是真实 HTML 文本（可选中、可换行、字体一致）。
- 节点数多到手排不动时用 Mermaid 12，按 4.2 套主题。
- 离线档：在生成阶段把 Mermaid / D2 预渲染成 SVG 再内联（Mermaid 用 `mmdc`，D2 用 CLI）。不要内联 5MB 的运行时。
- 手绘风格作为一个可选主题，用 rough.js（8KB gz）。

---

## 5. 幻灯片

### 5.1 对比

| 方案 | 版本【实测】 | 单文件 / 无构建 | 默认观感 | 备注 |
|---|---|---|---|---|
| 自写：固定 16:9 舞台 + 横向翻页或 CSS scroll-snap | — | 天然单文件 | 完全受控 | 约 150 行 JS 即可覆盖键盘、触屏、进度、总览、打印 |
| [reveal.js](https://revealjs.com/upgrading/) | 6.0.2（2026-09-10） | 可（CDN 的 JS + CSS） | 自带主题都很"reveal" | 116KB / gz 30KB + CSS 52KB；v6 改用 Vite 构建、ESM 改为 `.mjs`、插件注册方式变了【搜索】；有演讲者视图、PDF 导出 |
| [Marp](https://marp.app/)（`@marp-team/marp-core`） | 4.4.0（2026-07-17） | 需要 CLI 转换，产物是单文件 HTML | 默认主题朴素 | Markdown 写起来最省；可导出 PDF / PPTX【搜索】，PPTX 默认是每页一张图，可编辑导出为实验特性【未核实】 |
| [Slidev](https://sli.dev/) | 53.1.0（2026-11-05） | 不行，Vue + Vite 构建 | 主题生态丰富 | 适合人长期维护的技术演讲，不适合 agent 一次写完 |
| [impress.js](https://impress.js.org/) | 1.1.0（2020-04，停更） | 可 | 3D 画布转场 | 不建议 |
| [frontend-slides](https://github.com/zarazhangrui/frontend-slides)（Zara Zhang 的 skill） | — | 零依赖单文件 | 多套预设风格，另有可选的 bold template pack | 固定 16:9；先出 3 个风格预览让用户选；自带 `viewport-base.css`、PPT 内容提取脚本、PDF 导出脚本【实测 README】。第三方站点显示约 2 万多 star【搜索，未核实】 |
| [guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)（歸藏） | — | 单文件 HTML，横向翻页 | 两套视觉系统：电子杂志 × 电子墨水、瑞士国际主义 | 杂志风 10 种布局，瑞士风 22 种锁定版式；演讲者模式、计时排练、低性能静态模式【实测 README】。第三方站点称许可证为 AGPL-3.0【搜索，未核实】 |

来源：reveal.js 升级指南 [revealjs.com/upgrading](https://revealjs.com/upgrading/)；两个 skill 的 README 本次直接读取。

### 5.2 两个流行 skill 给我们的启示

- 它们都**不用任何幻灯片框架**，直接写单文件 HTML + 内联 CSS/JS。说明对 agent 而言，框架带来的约束（主题系统、DOM 结构）反而妨碍做出有辨识度的版面。
- 都靠**有限的、锁定的版式集合**保证质量（guizang 的 22 种锁定版式、frontend-slides 的风格预设），而不是让模型自由发挥。
- guizang 把踩过的坑写进 `checklist.md`，frontend-slides 把视口适配抽成 `viewport-base.css`：可复用的是这些"底座文件"，这正是我们组件库该提供的东西。
- 许可证提醒：若 guizang-ppt-skill 确为 AGPL-3.0，只能学思路，不能拷代码和模板。

### 5.3 HTML → PPTX 路线

| 路线 | 工具 | 可编辑 | 判断 |
|---|---|---|---|
| 原生生成 | [PptxGenJS](https://github.com/gitbrent/PptxGenJS) 4.0.1（2025-06）【实测】 | 是，真正的文本框和原生图表 | 最可靠。Anthropic 官方 pptx skill 就是让模型直接写 pptxgenjs 脚本【实测 SKILL.md】。但等于另做一套版式，和 HTML 视觉只能做到"同主题" |
| DOM 转换 | [dom-to-pptx](https://github.com/atharva9167j/dom-to-pptx) 2.1.2（2026-09）【实测】 | 是，把 DOM 元素转成形状和文本 | 浏览器包 3682KB；复杂 CSS（渐变、混合模式、滤镜）的还原度需实测；有无头 CLI 和演讲者备注支持【搜索】 |
| 截图入册 | 浏览器截图 + 每页一张图 | 否 | 观感 100% 一致，但不能改字 |
| PDF | 浏览器打印 | 否 | 最省事，很多场合已经够用 |
| Marp | marp-cli | 默认否 | 只适合 Marp 自己的版式 |

### 5.4 建议与坑

- 第一期：自写舞台 + 版式库，导出只做 PDF（打印样式）。PPTX 作为独立路线，用 pptxgenjs 按同一套 token 生成，不承诺与 HTML 像素一致。
- 舞台用固定设计尺寸（如 1920×1080）整体 `scale`，或容器查询单位。不要让文字随视口宽度自由重排，否则每台机器换行都不一样。
- 每页内容溢出是最常见的失败：需要版式自带内容上限（标题字数、要点条数），这部分交给评测闭环。
- 动效、WebGL 背景要有关闭开关和 `prefers-reduced-motion` 降级。

---

## 6. 文档与报告模板、打印

### 6.1 对比

| 方案 | 版本【实测】 | 单文件 | 体积【实测】 | 判断 |
|---|---|---|---|---|
| [Scalar](https://scalar.com/products/api-references/integrations/html-js) | 1.82.1（2026-11-20） | 一个 HTML + CDN 脚本 + OpenAPI | `standalone.js` 4510KB / gz 1299KB | 当下最现代的 API 文档观感，自带主题、暗色、请求调试 |
| [Redoc](https://github.com/Redocly/redoc) | 3.2.0（2026-11-19） | `redoc.standalone.js`；Redocly CLI 的 `build-docs` 可产出零依赖单文件【未核实】 | 2333KB / gz 661KB | 经典三栏，稳定，观感偏旧 |
| [Stoplight Elements](https://github.com/stoplightio/elements) | 9.0.30（2026-11-21） | Web Component + CSS | 【未测】 | 可用，观感中规中矩 |
| [Starlight](https://starlight.astro.build/) | 0.43.1（2026-11-13） | 不行，Astro 构建 | — | 第 5 类"真实文档站"的首选；它的信息架构（侧栏、页内目录、提示框、标签页、步骤）值得照着做成我们的单文件文档模板 |
| 自写文档模板 | — | 是 | 小 | 没有 OpenAPI 的技术文档、报告，用自己的组件层 |

代码高亮：highlight.js 11.11.1 的 `highlight.min.js` 124KB / gz 41KB，Prism 1.30.0 核心 56KB / gz 16KB【实测】；Shiki 4.6.0 质量最好但要异步加载语法和主题，不适合单文件。更好的做法是**生成阶段就把代码着色成带 class 的 `<span>`**，运行时零依赖，颜色走 token。

### 6.2 打印 / PDF

| 方案 | 状态 | 判断 |
|---|---|---|
| 原生打印 CSS | Chrome 131 起支持 `@page` 边距盒，可用纯 CSS 写页眉页脚和页码【搜索】[developer.chrome.com/blog/print-margins](https://developer.chrome.com/blog/print-margins)；Firefox 的对应 bug 仍未关闭【搜索】，Safari【未核实】 | 默认方案。报告模板自带 `@media print`：`@page { size: A4; margin }`、`break-inside: avoid`、`print-color-adjust: exact`、隐藏交互控件、展开折叠内容 |
| [Paged.js](https://pagedjs.org/) | npm 最新 0.4.3（2023-07）【实测】；团队在做破坏性的 2.0 重构【搜索】 | polyfill 491KB / gz 94KB。只有需要跨浏览器的书籍级排版（脚注、交叉引用页码、目录页码）才值得用 |
| WeasyPrint / Prince / Vivliostyle | 【未核实】 | 命令行出 PDF 的备选，超出单文件范围 |

### 6.3 报告设计参考【均未核实，凭既有知识列出】

- 数据叙事：The Pudding、Our World in Data、Financial Times / NYT / Bloomberg 的图表新闻、Observable 的 notebook。
- 研究 / 分析报告：Stripe 的年度信、Distill.pub 的论文版式、各咨询公司的公开报告。
- 安全 / 扫描报告没有公认的范例；建议我们自己定版式：摘要结论 → 严重度分布 → 发现列表（每条含证据、影响、修复）→ 附录，严重度配色从 token 里的语义色取。

### 6.4 坑

- Scalar / Redoc 的独立包以 MB 计，离线只能内联或预渲染；Scalar 官方示例默认用 `latest`，必须固定版本。
- 从 `file://` 打开时，`fetch` 外部 OpenAPI 文件会被跨域策略拦截，规格要内联进 HTML。
- 暗色主题打印会很费墨且对比差：打印样式要强制切回浅色 token。
- 图表在打印时要么是 SVG，要么 canvas 需在打印前按纸面宽度重绘。

---

## 7. 图标

| 图标集 | 版本【实测】 | 数量【实测，按包内 SVG 文件数】 | 风格 | 无构建用法 |
|---|---|---|---|---|
| [Lucide](https://lucide.dev/guide/version-1) | 1.77.0（2026-11-20），ISC | 2410 | 2px 描边，圆角端点；v1 起移除了所有品牌图标【搜索】 | `lucide-static` 里每个图标一个 SVG，直接拷进 HTML；UMD 全量包 487KB，不要整包加载 |
| [Phosphor](https://phosphoricons.com/) | core 2.1.1（2024-03）、web 2.1.2（2025-03），MIT | 每种字重 1512 | 六种字重（thin / light / regular / bold / fill / duotone），性格最丰富 | 拷 SVG；或图标字体（每字重 CSS 约 80KB + woff2 约 150KB） |
| [Tabler Icons](https://tabler.io/icons) | 3.52.0（2026-11-14），MIT | 描边 5491 + 填充 1054 | 2px 描边，数量最多 | 拷 SVG |
| [Heroicons](https://heroicons.com/) | 2.2.0（2024-11），MIT | 324（24px 描边） | Tailwind 官方，数量少 | 拷 SVG |
| [Iconify](https://iconify.design/)（`iconify-icon` 3.0.5） | MIT | 聚合上百套 | — | Web Component 按需从 API 取图标，只能联网用 |

建议：
- 默认 Lucide（中性、模型熟），需要性格时换 Phosphor 的 duotone 或 thin。同一产物只用一套、一种字重。
- **在 skill 里随附一份精选子集**（约 100–150 个，按用途命名：状态、严重度、文件类型、箭头、常见概念），做成一个可检索的 `icons.json` 或 SVG sprite。agent 从里面拷路径，不要凭记忆写 `<path d="...">`。
- 图标用 `stroke="currentColor"`，尺寸跟随字号（`1em` / `1.25em`），装饰性图标加 `aria-hidden="true"`。

坑：
- 模型凭记忆写的 SVG 路径经常是错的或走形的，这是最常见的图标问题。
- 用 emoji 当图标是明显的 AI 痕迹，而且各平台渲染不一致。
- Lucide v1 没有品牌图标，需要 logo 时用 [Simple Icons](https://simpleicons.org/) 并注意商标条款。
- "Lucide v1 去掉 UMD"的说法【搜索】指的应是框架包；原生 `lucide` 包里本次实测仍有 `dist/umd/lucide.min.js`。

---

## 8. 风格参考与设计系统合集

| 资源 | 内容 | 对我们的用处 |
|---|---|---|
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 从真实网站提炼的 `DESIGN.md` 合集，README 徽章显示 84 份【实测 README】，含 Linear、Stripe、Vercel 等【搜索】 | 直接可读的"命名风格"素材；不同来源对同一品牌的描述互相矛盾【搜索】，质量需逐份甄别 |
| [DESIGN.md 规范](https://stitch.withgoogle.com/docs/design-md/overview/)（Google Stitch 提出）【搜索】 | 给 agent 读的纯文本设计系统文档格式 | 我们的主题文件可以同时导出一份 DESIGN.md，便于和其他工具互通 |
| [getdesign.md](https://getdesign.md/) | 同一批 DESIGN.md 的站点 | 同上 |
| [The Component Gallery](https://component.gallery/design-systems) | 约 95 个真实设计系统的组件对照【搜索】 | 给组件命名、查某个组件各家怎么做 |
| [Design Systems Surf](https://designsystems.surf/about) | 按组件整理的设计系统数据库【搜索】 | 同上 |
| [tweakcn](https://github.com/jnsahaj/tweakcn) | shadcn 变量体系的可视化主题编辑器和社区主题【搜索】 | 采用 shadcn 命名后，这些主题可直接作为我们的主题原料 |
| 公开设计系统【未核实，凭既有知识】 | GitHub Primer、IBM Carbon、Shopify Polaris、Adobe Spectrum、Atlassian、GOV.UK、USWDS、Radix Themes、Vercel Geist | 取 token 结构和文档写法 |
| 灵感站【未核实】 | Refero、Mobbin、Godly、Awwwards | 人工选型时看，agent 用不上 |

建议把风格做成**抽象原型**而不是品牌克隆，每个原型一份主题文件 + 一段给模型的描述：

| 原型 | 关键特征 | 适合 |
|---|---|---|
| 编辑 / 杂志（NYT、Monocle 一类） | 衬线标题、窄版心、发丝线、克制的单一强调色、图注和脚注 | 解释页、长报告 |
| 瑞士 / 国际主义 | 严格网格、无衬线、极端字号对比、直角、单一高饱和色 | 幻灯片、事实型报告 |
| 精密工具（Linear、Vercel 一类） | 暗色为主、紧字距、等宽数字、细边框、微弱光感 | 技术文档、仪表盘 |
| 金融 / 文档型（Stripe 一类） | 浅色、层次分明的表格和代码、柔和阴影 | API 文档、对外报告 |
| 学术 / Tufte | 侧注、小型多图、极低装饰 | 研究类解释 |
| 手绘 / 白板 | rough.js 线条、手写感字体 | 概念讲解、草图阶段 |

注意：直接以品牌命名并复刻其外观有商标和商业外观方面的风险，对外描述用"某某风格启发"更稳妥。

---

## 9. 推荐技术栈

### 9.1 默认栈：自有薄层 + Plot / SVG

| 层 | 选择 | 离线档怎么办 |
|---|---|---|
| CSS | 自建 token + 约 30–40 个排版型组件，全部内联；token 用 shadcn 命名、oklch、`light-dark()` | 本来就内联 |
| 主题 | 6 个左右的风格原型，每个只是一份 token 文件 + 字体搭配 | 同上 |
| 西文字体 | 每个主题固定一组 Google Fonts，带完整回落栈 | 回落到系统字体，版式不依赖特定字宽 |
| 中文字体 | 系统字体栈；联网时可选 Noto Serif SC / 霞鹜文楷分包 | 标题字可抽子集 base64 内嵌 |
| 图表 | 手写 SVG → Observable Plot 0.6 + D3 7 → ECharts 6 | 手写 SVG；或内联 Plot + D3（约 480KB） |
| 图示 | 手写 SVG / HTML+CSS 配方；复杂图用 Mermaid 12 `base` 主题 | 生成阶段预渲染成 SVG |
| 幻灯片 | 自写 16:9 舞台 + 锁定版式库；打印出 PDF | 本来就零依赖 |
| PPTX | pptxgenjs 独立路线，同一套 token | — |
| 文档 | 自写文档模板（借 Starlight 的信息架构）；有 OpenAPI 时用 Scalar | 代码高亮在生成阶段完成；Scalar 无法离线 |
| 打印 | 原生 `@media print` + `@page` | — |
| 图标 | Lucide 精选子集，内联 SVG | 本来就内联 |

所有 CDN 依赖固定到确切版本，统一走 jsDelivr（claude.ai Artifact 允许的来源之一），并写好加载失败时的降级显示。

### 9.2 备选 A：Tailwind v4 browser + Basecoat（或 daisyUI）

- 适合：第 5 类真实网站的原型、表单和交互多的 App 型页面、需要模型"闭眼就能写对"的场合。
- 优点：模型最熟；组件现成；shadcn 主题生态直接可用。
- 缺点：运行时编译（73KB gz 的 JS、首屏闪烁、官方不建议生产）；离线要内联编译器；长相趋同，必须靠自定义 `@theme` 和 style pack 才能拉开；对报告、解释页、幻灯片帮助有限。
- 定位：作为"网站 / App"任务的专用栈，不作为默认。

### 9.3 备选 B：语义 HTML 底座（Oat 或 Pico classless）+ Open Props token + 少量自写组件

- 适合：纯文档、简单报告、想要最少 class 的场合；或者作为自有薄层成熟之前的过渡。
- 优点：体积极小（7–11KB gz）、模型几乎不可能写错、离线无压力。
- 缺点：长相是库的长相；图表容器、指标卡、封面等决定观感的部分仍需自己写；Pico 已一年半未发版。
- 定位：最低成本的起步方案，也可作为"极简"主题的实现方式。

---

## 10. 自建 token + 组件层，还是采用现成库

### 支持自建

1. **产物类型不匹配**：现成库是为 App UI 做的（按钮、表单、对话框）。我们的前三类产物需要的是带注释的图表、指标卡、发现条目、时间线、侧注、封面、幻灯片版式，这些哪个库都没有，无论如何都得自己写。
2. **辨识度**：现成库的默认样子就是模型训练数据里的众数。要做出不一样的东西，必须控制 token 和组件的最终形态。
3. **单文件与离线**：自建层 15–25KB，可以整段内联，没有运行时、没有版本漂移。Tailwind browser、Web Awesome、daisyUI 都做不到这一点。
4. **可评测、可约束**：class 是有限集合，可以写 lint 检查"是否只用了组件库里的 class、是否写死了颜色"，这是评测闭环的抓手。
5. **多主题**：组件不变、只换 token 文件，天然支持多风格和明暗；也能同时导出 DESIGN.md 和 pptxgenjs 用的主题对象。
6. **流行的 skill 已经在这么做**：frontend-slides 的 `viewport-base.css`、guizang 的模板与 checklist，本质都是自建底座。

### 反对自建

1. **模型没见过我们的 class**：每次都要把用法塞进上下文，占 token，还可能被模型忽略而退回 Tailwind 习惯。缓解：沿用 shadcn 变量名；class 名取最常见的语义词（`card`、`callout`、`badge`、`stat`）；组件文档做成可按需加载的短片段。
2. **维护成本**：可访问性、浏览器差异、打印、RTL、长内容溢出，这些成熟库已经踩过的坑要自己再踩一遍。缓解：第一期不做交互复杂的组件，交互型需求转交备选 A。
3. **质量取决于我们的设计能力**：自建不等于好看，token 取值差一点整体就平庸。缓解：色阶直接取 Radix Colors，缓动和阴影取 Open Props，比例参考 Tailwind typography，不自己发明数值。
4. **生态为零**：没有现成主题和社区示例。缓解：兼容 shadcn 变量后可导入 tweakcn 主题。

### 判断

自建，但范围要窄：**只自建"排版型产物"需要而现成库没有的部分，数值全部借用成熟来源，命名贴近模型已有的习惯**。App 型交互组件不自建，交给 Tailwind + Basecoat 这条备选栈。这个取舍的前提是"模型在给了组件文档后会老实用我们的 class"，这一点本调研无法验证，需要评测闭环先跑一轮对照（自建层 vs Tailwind browser vs classless）再定。

---

## 11. 未核实事项汇总

- 各 CDN URL 的实际可达性（本会话无法访问 jsDelivr）；Basecoat CDN 版是否独立于 Tailwind 脚本；Tailwind browser 是否支持 `@plugin`。
- 所有 star 数、guizang-ppt-skill 的 AGPL-3.0 许可证、frontend-slides 的许可证。
- 字体许可证细节（Fontshare 的再分发限制、各中文厂商字体协议、霞鹜文楷与得意黑的 OFL）。
- Google Fonts 在中国大陆的可达性现状；中文排版相关 CSS 属性的浏览器支持。
- Marp 可编辑 PPTX 导出、Redocly `build-docs` 单文件产物、dom-to-pptx 对复杂 CSS 的还原度。
- Safari 对 `@page` 边距盒的支持；Paged.js 2.0 的进度。
- beautiful-mermaid 的仓库地址与浏览器端可用的打包形式；D2.js 的主题参数名。
- 第 6.3、8 节中标注为既有知识的范例与设计系统清单。
- 全文"模型可靠度"一栏均为判断，没有测量。
