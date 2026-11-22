# 01 · 现有的"让 AI 做出好设计"打包方案调研（skills / system prompts / 规则文件 / 设计规范格式）

> 调研日期：2026-11-22。范围：以"打包好的方案"为主（skill、系统提示词、规则文件、设计规范格式）。社区经验贴、组件库/CSS 框架、截图评估回路由其他调研覆盖，这里只在与方案机制直接相关时提及。
>
> **核实标记**
> - ✅ = 我直接读了一手源文件（GitHub raw 的 SKILL.md / README / LICENSE / 提示词原文）
> - ◐ = 只读了 README 或部分文件，内部 reference / 脚本没读
> - ⚠️ = 没读到一手来源，只有二手信息（搜索摘要、第三方文章），可能不准
>
> Star 数来自 2026-11-22 当天抓取的 GitHub 页面（四舍五入值），仅作量级参考。

---

## 0. 一页结论

1. **这个赛道在 2026 年已经非常拥挤**，头部仓库都在 10 万 star 量级：anthropics/skills（~199k）、ui-ux-pro-max（~153k）、awesome-design-md（~129k）、taste-skill（~120k）、impeccable（~115k）、hallmark（~59k）。但它们**几乎全部瞄准"营销落地页/公司官网"**。
2. **方案已经明显分成三代**：
   - 第一代（2025）：一段提示词，"别用 Inter、别用紫色渐变、大胆一点"。
   - 第二代（2026 上半年）：提示词 + 禁用清单 + 风格库/字体库/调色板库 + 多命令。
   - 第三代（2026 下半年）：**"发牌"（脚本随机/按行业分配主题、字体、布局）+ 真浏览器里跑的确定性 lint + 收尾闸门（Stop hook）+ 全新上下文的评审子代理**。提示词在其中的比重越来越小。
3. **"反 slop 提示词"自己制造了第二波 slop**。Anthropic 最新版 `frontend-design` 直接把"奶油底 + 衬线标题 + 陶土色点缀"（也就是上一版 skill 的典型产物）列为 AI 味特征。**禁用清单有保质期，会把模型推向下一个默认值**。
4. **对我们最重要的空白**：报告、API 文档、数据可视化这类"阅读型/操作型"输出几乎没人认真做。最接近的是 Kami（文档排版，~12.6k star）、frontend-slides / guizang-ppt / huashu-design（HTML 幻灯片），以及 impeccable 里一小段 "Read / Operate" 模式说明。**"扫描报告""API 文档"没有任何现成方案**。
5. **许可证很友好**：主要方案都是 MIT 或 Apache-2.0，可以借鉴甚至直接改写（保留版权与 NOTICE 即可）。例外是泄露的 v0 / Lovable 系统提示词（版权归原公司，只能学思路，不要照搬原文）和部分字体、图片资产。

---

## 1. Anthropic 官方

### 1.1 `frontend-design` skill ✅

- 链接：<https://github.com/anthropics/skills/tree/main/skills/frontend-design>（同一份文件也在 `anthropics/claude-plugins-official` 的 frontend-design 插件里，我比对过字节数一致）
- 热度：anthropics/skills 仓库 ~199k star，是所有后来者的起点（impeccable、hallmark 的 README 都写明源自或受它启发）。
- 许可证：Apache-2.0（skill 目录下 `LICENSE.txt`，已读）。
- 结构：**单个 SKILL.md，约 9.4KB，没有 references、脚本、资产**。
- **注意：当前版本已被重写**，和 2025 年广为流传的那版（"pick an extreme: brutally minimal, maximalist chaos…"）差别很大。当前版的机制：
  1. **角色与赌注设定**：`Approach this as the design lead at a design studio known for giving every client a distinct visual identity… This client has already rejected proposals that felt cliché or templated`
  2. **从题材出发**：先确定主题、受众、页面的首要任务；`The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from`
  3. **点名当前的 AI 默认样貌（校准清单，不是禁令）**，共五类：奶油底 + 衬线 + 陶土色（`often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell`）；近黑底 + 酸性绿/朱红；报纸式细线零圆角；SaaS 卡片套件；模板化装饰（全大写 eyebrow、中点连接的 meta 串、`→` 贴在链接后面、等宽字体做小标签）。
  4. **关键措辞**：`All traits are legitimate for some briefs, but they are defaults rather than choices` 以及 `the brief's own words always win`。
  5. **两遍流程**：先写一份紧凑的设计计划（4–6 个命名色值、字体及角色、用一句话 + ASCII 线框描述布局、原则），**再对照 brief 自查"这是不是我对任何类似页面都会给出的默认答案"**，改掉后才写代码。
  6. **克制**：`Spend your boldness in one place.`，以及香奈儿那句"出门前摘掉一件配饰"。
  7. **质量底线不宣扬**：响应式、键盘焦点、reduced motion、对比度。
  8. **文案也是设计**：整整一节讲 UX 文案（按钮写清动作、错误信息不道歉不含糊、空状态是行动邀请）。
  9. 提到截图自查：`taking screenshots to review if your environment supports it — a picture is worth 1000 tokens`。
- 弱点：
  - 纯提示词，没有任何强制手段；模型可以"读完然后照旧"。
  - 默认假设是 web 页面和 hero；对报告、文档、仪表盘几乎没有具体指导。
  - 没有字体清单、没有 token 模板、没有组件，**对非设计师用户帮助有限**：它要求模型"做出选择"，但用户无法判断选择好不好。
  - 二手来源称旧版会稳定产出"奶油色"（⚠️ 来自搜索摘要中的 claudecodehq / capitalandcompute 文章，原文因网络限制没读到）；新版自己承认了这一点，可视为间接印证。

### 1.2 Cookbook：*Frontend Aesthetics: A Prompting Guide* ✅

- 链接：<https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb>
- 结构：一个 notebook，核心是一段约 250 词的 `DISTILLED_AESTHETICS_PROMPT`，外加两个"隔离提示词"示例。
- 三条策略（原文）：`Guide specific design dimensions`、`Reference design inspirations`、`Call out common defaults`。
- 值得借的原文：
  - `You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic.`
  - `Dominant colors with sharp accents outperform timid, evenly-distributed palettes.`
  - `one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions`
  - 字体隔离提示词：`Use extremes: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.`，以及 `State your choice before coding.`
  - **主题锁定**示例（Solarpunk）：一段 5 行的风格约束就能让多次生成保持一致。
- 弱点：
  - 这段提示词本身已经成为 slop 的来源：它推荐的 Playfair Display、Space Grotesk、"分层渐变背景""错峰入场动画"，正是当前官方 skill 和 impeccable 点名的 AI 味。它自己也承认 `You still tend to converge on common choices (Space Grotesk, for example)`。
  - 被大量 skill 原样复制（例如 frontend-slides 的 SKILL.md 里一字不差地嵌了这一段）。
  - 管理后台表格的示例也加了"氛围背景"，说明它没有区分"表达型页面"和"工具型页面"。

### 1.3 其他设计相关官方 skill

| skill | 核实 | 是什么 | 机制 | 对我们的意义 |
|---|---|---|---|---|
| `theme-factory` | ✅ SKILL.md | 10 套预设主题（配色 + 字体配对），可套用到幻灯片、文档、报告、落地页 | `themes/` 目录每套一个文件 + 一份 `theme-showcase.pdf`；**先给用户看图再选**，不合适再现场生成新主题 | **"主题 = 一个小文件"的最简形态**；明确覆盖 "slides, docs, reportings"。主题名偏通用（Ocean Depths、Tech Innovation），深度很浅 |
| `canvas-design` | ✅ 前 1/3 | 生成海报/静态视觉（PNG/PDF） | **两步法：先写一份"设计哲学/艺术运动宣言"（.md），再据此创作**；强调 90% 视觉、10% 文字 | "先承诺一个有名字的方向，再执行"机制的原型 |
| `web-artifacts-builder` | ✅ | React + Tailwind + shadcn/ui 脚手架，最后打包成单个 HTML | `scripts/init-artifact.sh`、`bundle-artifact.sh`；设计指导只有一句：`avoid using excessive centered layouts, purple gradients, uniform rounded corners, and Inter font` | **"打包成单文件 HTML"的流程可参考**；设计部分几乎为零 |
| `brand-guidelines` | ◐ 只下载未细读 | 套用 Anthropic 品牌色与字体 | 固定品牌 token | 品牌锁定的最小示例 |
| `pptx` | ✅ 设计相关部分 | 生成 .pptx | 主题先行（`THEME` 对象）；`Dominance over equality: One color should dominate (60-70% visual weight)`；`If swapping your colors into a completely different presentation would still "work," you haven't made specific enough choices`；`Commit to a visual motif`；一份 Avoid 清单；**渲染缩略图做视觉 QA** | 幻灯片领域目前最细的官方指导；"安全字体清单"的思路（区分 QA 可信与不可信字体）值得学 |

许可证：README 称"many skills in this repo are open source (Apache 2.0)"，我确认了 frontend-design 和 theme-factory 目录下的 LICENSE.txt 是 Apache-2.0；其他 skill 复用前需逐个看目录内的 LICENSE.txt。

### 1.4 Claude Design ⚠️

- 仅来自搜索摘要，未读一手页面：Anthropic Labs 于 2026-04-17 发布的可视化设计工作区；会读代码库和设计文件为团队生成 design system；可导出 PDF / PPTX / 独立 HTML；6 月增加 `/design-sync` 与 Claude Code 同步；9 月起可在任意对话里使用。
- 相关一手页面（未读）：<https://www.anthropic.com/news/claude-design-anthropic-labs>
- 意义：官方路线也是"**先建立 design system，再让一切输出引用它**"，而不是每次靠提示词临场发挥。

---

## 2. 社区头部 skill

### 2.1 Impeccable（pbakaus/impeccable）✅ SKILL.md + craft-floor + operate；其余 reference ◐

- 链接：<https://github.com/pbakaus/impeccable> ｜ 文档 <https://impeccable.style/docs>
- 热度：~115k star，6.8k fork。作者 Paul Bakaus。Apache-2.0。README 明示 `Impeccable started from Anthropic's frontend-design skill`。
- 当前版本 4.10.0，已经远不是"一个 skill"：
  - **1 个 SKILL.md（路由器，~12.7KB）+ 每个命令一份 reference**（按需加载：`new-work.md` 35KB、`new-work-world.md` 20KB、`craft-floor.md`、`operate.md`、`critique-rubric.md` 等）。
  - **24 个命令**，是一套"设计动词词汇表"：`bolder` / `quieter` / `distill` / `colorize` / `typeset` / `layout` / `animate` / `delight` / `overdrive`（调方向），`critique` / `audit`（评审），`polish` / `harden` / `clarify` / `adapt` / `optimize` / `onboard`（收尾），`shape` / `init` / `document` / `extract`（规划与建档）。
  - **确定性检测器**：`62 deterministic rules… No LLM, no API key`。可作为编辑后 hook、CLI（`npx impeccable detect`，支持 JSON / SARIF / GitHub 注解）、Chrome 扩展运行。对比度、过小文字等规则需要渲染页面。
  - **项目上下文文件**：`PRODUCT.md`（产品是谁用的、要做什么、约束）和 `DESIGN.md`（现有视觉系统）。
  - 自带二进制引擎、截图命令（`impeccable shot`）、字体下载（`font-fetch`）、浏览器内实时变体模式。
- 关键机制与可借鉴原文：
  - **四种模式（对我们极重要）**：按"访客成功是什么样"划分界面
    - `Persuade`（落地页、营销）、`Operate`（应用界面、仪表盘、工具）、`Read`（文档、文章、指南、changelog）、`Experience`（作品集、展示）
    - `Scale ambition to the surface's mode… On Operate and Read, ambition shows as precision and restraint, and patterns the visitor already knows earn their place.`
    - `Choose the mode from the requested surface, not the product. A tool's landing page is still Persuade; a fashion house's documentation is still Read`
  - **Operate 模式下的"slop"定义完全相反**：`Product UI's failure mode isn't flatness, it's strangeness without purpose… The bar is earned familiarity. The tool should disappear into the task.` 并允许系统字体、标准导航、高密度表格；`Fixed rem scale, not fluid`；字号比例 1.125–1.2；`Accent color used for primary actions, current selection, and state indicators only, not decoration`。
  - **Craft floor = 可验证的检查，而不是意图**：正文与占位符对比度 ≥4.5:1；正文行宽 65–75ch；`more space above a heading than below it`；阴影要有偏移和柔和模糊；状态齐全（hover / disabled / loading / error / empty）。
  - **"浏览器表面"**：`Text selection, the caret, custom scrollbars, focus rings, underline offset, and the numerals in tabular data all ship with browser defaults… This is the cheapest signal that a page was built rather than assembled, and the one models skip most reliably.`
  - **Refuse 清单，带哲学说明**：`These are the category's defaults, not bans: the brief's own words can earn any of them. Reaching for one when the axis is free means you were not deciding`。条目包括：同尺寸"图标 + 标题 + 文字"卡片当页面结构（`nested cards are always wrong`）、大数字 + 小标签的 hero-metric 模板、标题上方的 eyebrow（这一条是硬禁令）、无意义的 01/02/03 编号、渐变文字、装饰性玻璃模糊、**圆角盒子单侧色条**、硬偏移阴影、sparkline / 进度环充当内容、`Monospace as a costume for "technical"`、emoji 充当图标。
  - **`The brief wins.`**：`Redirecting a clear brief toward your taste is failure.`
  - **先看再改，批量看**：`Verify by looking at the rendered result at the sizes it ships at… batch the checks: fix what one look shows before looking again.`
- 弱点 / 批评：
  - **复杂度极高**：二进制下载、hook 在模型权限之外运行、遥测（开始新设计时会从 impeccable.style 拉取"视觉方向目录"，关闭遥测也不会停止这个请求）。对"非设计师想要开箱即用"偏重。
  - README 自己承认：`Impeccable is strongest on interfaces that already exist`，从零新建是"harder mode"。
  - 重心仍是网站和应用界面；Read 模式只有一段话加上 operate.md 里的附注，没有报告、文档的专门模板。
  - 新建落地页的最强路径依赖图像生成（先出效果图再照着搭）。

### 2.2 taste-skill（Leonxlnx/taste-skill）✅ README + SKILL.md 开头 + v1 的规则部分

- 链接：<https://github.com/Leonxlnx/taste-skill> ｜ 旧版在 <https://github.com/Leonxlnx/taste-skill-classics>
- 热度：~120k star，8k fork。MIT。当前 `tasteskill 2.5.1`。
- **v1（经典版）机制**（单文件 21KB）：
  - 顶部三个 1–10 的"旋钮"：`DESIGN_VARIANCE`、`MOTION_INTENSITY`、`VISUAL_DENSITY`，后面的规则按旋钮值分支。
  - 大写强硬禁令：`THE LILA BAN: The "AI Purple/Blue" aesthetic is strictly BANNED`、`NO Inter Font: Banned. Use Geist, Outfit, Cabinet Grotesk, or Satoshi`、`NO 3-Column Card Layouts`、`ANTI-CENTER BIAS`、`ANTI-EMOJI POLICY`、`NO Pure Black`、`NO Generic Names: "John Doe"…`。
  - 有价值的情境规则：`Serif fonts are strictly BANNED for Dashboard/Software UIs`；`DASHBOARD HARDENING: For VISUAL_DENSITY > 7, generic card containers are strictly BANNED. Use logic-grouping via border-t, divide-y, or purely negative space.`
  - 工程防呆：`NEVER use h-screen… ALWAYS use min-h-[100dvh]`、只动画 transform / opacity。
- **v2.5（当前）彻底转向脚本驱动**：
  - 9 条"House rules"高于一切（如 `One section per screen`、`Equal left and right content edges`、`No caption or description under any image`）。
  - **先分类业务类型**（software / gaming / tech / product / service / place），类型决定一切。
  - **"发牌"**：`scripts/start.mjs` 按行业发调色板和 Google Fonts 配对（`library/palettes.json`、`library/type.json`）；`deal.mjs` 从 11 种测试过的 hero 布局里发一种。
  - **从固定起点开始**：`assets/starter.html` + `system.css` + `layout.css`。
  - **真实素材库**：内置 Wikimedia Commons 照片、真实品牌图标解析脚本。
  - **真浏览器检查 + 收尾闸门**：`consistency.mjs` 在 1440 / 1024 / 768 / 390 下渲染并逐条输出 PASS / WARN / FAIL；`gate.mjs` 作为 **Stop hook** 写进 SKILL.md 的 frontmatter，`holds the finish until no fixable FAIL is left, three rounds at most`；还有 `copy-lint.mjs` 检查文案。
- 弱点：
  - v1 是典型的"换一套默认值"：禁了 Inter 就全是 Geist / Satoshi，禁了居中就全是左右分栏，禁了三列卡片就全是 bento。大写 BANNED 的语气对新模型容易过度触发。
  - v2.5 范围极窄：**只做公司官网**，规则高度具体（"每屏一个 section""每页一到两个 moment"），本质上是一个带检查器的模板系统，产物会有明显的"taste-skill 味"。
  - 依赖 Node 22+ 和 Chrome；复杂度高。
  - 示例页面里有 shader、WebGL、滚动场景，对报告和文档类输出是反面教材。

### 2.3 UI UX Pro Max（nextlevelbuilder/ui-ux-pro-max-skill）✅ README + SKILL.md 前半

- 链接：<https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>
- 热度：~153k star，16k fork。MIT。
- 结构：**CSV 数据库 + Python BM25 搜索脚本**，SKILL.md 主要教模型怎么查库。
  - 数据量（README 自述）：80 种可搜索 UI 风格（51 种启用）、194 套按产品类型对应的调色板、74 组字体配对、141 条 UX 准则、25 种图表类型建议、22 种技术栈。
  - `search.py "<query>" --design-system` 输出一整套推荐：页面模式、风格、颜色、字体、关键效果、**"AVOID (Anti-patterns)"**、**交付前检查清单**；可导出 DTCG 或 CSS token。
  - 可用 `--persist` 把结果写成 `design-system/MASTER.md` + 分页面覆盖文件（README 提到，细节 ◐）。
- 关键机制：**用检索代替模型的品味**——"行业 → 风格 / 配色 / 字体"的查表映射；按优先级排序的规则类别表（可访问性 > 触控 > 性能 > 风格选择 > …）；交付前清单（`No emojis as icons`、`cursor-pointer on all clickable elements`、对比度 4.5:1、375 / 768 / 1024 / 1440 响应式）。
- 弱点：
  - **查表式推荐本身就是模板化**：SPA 永远是 soft pink + Cormorant Garamond，fintech 永远是深蓝。产出"合格、得体、无趣"，是另一种一致的平庸。
  - 风格库里把 Glassmorphism、Claymorphism、Neumorphism、"AI-Native UI" 当正面选项，和其他方案的禁用清单直接冲突。
  - 数据质量靠数量取胜（194 × 1:1 调色板明显是批量生成的），没有渲染验证环节。
  - 有 25 种图表类型建议，但只是"选哪种图"的表格，不涉及图表本身的视觉质量。

### 2.4 Hallmark（Nutlope/hallmark）✅ README + SKILL.md 前 60 行 —— 2026 新进者

- 链接：<https://github.com/Nutlope/hallmark> ｜ <https://www.usehallmark.com>
- 热度：~59k star。MIT。Together AI 出品。README 的 "Inspired by" 列出了 impeccable、frontend-design、Open Design、Kami、taste-skill、huashu-design、UI UX Pro Max、Emil Kowalski's skills、Web Interface Guidelines——**是这一代方案的集大成者，也是最好的"相关项目索引"**。
- 机制：
  - **三层闸门**：`Floor`（永不放行：对比度、焦点、reduced motion、编造的事实、手机布局坏掉）、`Reflex`（模型的条件反射；**可以在记录理由后豁免**）、`Finish`（工艺细节，不阻塞交付）。
  - **16 条 Floor 写在 SKILL.md 最前面**，`Binds every output in every harness, none of it waivable, even when nothing else is read.` 例如：
    - `Every colour and every font goes through a token declared at :root… No literal colour or font-family past the token block.`
    - `Never one italic word inside a roman heading.`
    - `Never an invented metric, testimonial, logo wall or case-study count.`
    - `Never an eyebrow, and never a label in tracked capitals or small caps`
    - `Never middle-dot-joined meta strings, arrows glued to link text, or decorative status dots.`
    - `Never a purple-to-blue gradient, a card inside a card, an emoji as an icon`
    - `About 80 words on any one screen`
  - **50 个主题，每个是一种"材质"**（纸张、字体、颜色、表面、自带组件和纹理）并配一张成品图；`theme.mjs deal` 每次发三个供选，并**读日志避免连续构建撞车**（`a dealt direction so consecutive builds do not converge`）。
  - **先单独做 hero**，渲染后"冷评审"，再做其余部分。
  - `sloplint.mjs --render` 在 8 个宽度下检查；之后**由全新上下文的子代理做最终评审**（`A fresh-context reviewer gets the last word`）。
  - **决策留痕**：每个页面的 CSS 第一行注释是 "Hallmark stamp"，记录所做决定和豁免。
  - 尊重现有系统：根目录有 `DESIGN.md` 就视为锁定系统，覆盖一切。
  - 755 张开放许可照片的索引（只存链接，不存文件），明确不用 Unsplash / Pexels / Pixabay（其条款禁止 AI 工具选图）。
- 弱点：
  - 仍然只做网站和新页面。
  - 二手来源称该仓库 2026 年 8 月后没有推送（⚠️ 未核实）。
  - `About 80 words on any one screen` 这类规则对报告和文档完全不适用。

### 2.5 huashu-design（alchaincyf/huashu-design，花叔）✅ SKILL.md 前半 + LICENSE

- 链接：<https://github.com/alchaincyf/huashu-design>
- 热度：~30k star。**2026-05-14 起改为 MIT**（此前是"个人免费、商用需授权"，LICENSE 已读）。v3.5.0。
- 范围比别人宽：**HTML 高保真原型、1920×1080 HTML 幻灯片、时间轴动画/视频、信息图与可视化、App Store 宣传图**；明确不做生产级 Web App。
- 机制：
  - 角色设定：`你是设计师，不是写HTML的程序员`；标准是 `产出要让人认不出是AI做的`。
  - **多角色工作室**（艺术总监、品牌研究员、视觉设计师、动效设计师、前端工程师、文案），并强调 `媒介变了，主导角色就要换——做幻灯片时别像网页，做动画时别像Dashboard`。
  - **任何新设计都先出三个方向初稿让用户选**（写在 description 里，"指定风格/品牌也不豁免"）。
  - **两条轨道**：`放手做`（强模型）与 `照着走`（读 `references/steady-track.md`：先写逐屏稿、从做到位的样张改起、逐条对清单）。**轻量模型（haiku / flash / mini）、不能看图的环境、脚本报警时直接走稳妥轨道**。这是我见到的唯一一个明确按模型能力分流的方案。
  - **"窄桥"**：少数必须照字面执行的硬规则，其余都可以超越。第 0 条是"事实验证先于假设"（先搜索核实产品事实）。
  - 也点名了 Claude 的默认审美：`暖奶油底、高反差衬线标题、陶土色点缀、全大写小标签、01/02/03 编号`。
  - `polish.py` 之类脚本会报"连续几屏只有文字和框"。
- 弱点：中文语境为主；严重依赖图像生成和真实品牌资产；流程重（三个方向 + 多轮打磨）。

### 2.6 Superdesign ✅ 两份 README

- 旧版 IDE 扩展：<https://github.com/superdesigndev/superdesign>（README 标注 `no longer actively maintained`）。当年的机制是往 Cursor / Claude Code 写入规则文件（`design.mdc`），在画布里并排出多个方案——`Why design one option when you can explore ten?`。旧规则文件原文我没取到（⚠️ 路径 404）。
- 新版 skill：<https://github.com/superdesigndev/superdesign-skill>。**本质是一个付费云产品的 CLI 客户端**（`npm install -g @superdesign/cli` + `superdesign login`）：搜索提示词/风格库、抽取品牌、在云端画布生成和分支草稿。覆盖 UI、**演示文稿**（先批准大纲）、海报等图形。
- 弱点：核心能力闭源且在服务器端，不可复用；对我们只有"多方案并排 + 分支迭代"这个交互思路有参考价值。

### 2.7 Emil Kowalski's skills ◐ 仅 README

- 链接：<https://github.com/emilkowalski/skills> ｜ <https://aiforui.dev/skills>
- 定位：动画与交互细节（缓动、时长等），作者来自 Vercel / Linear。README 的观点值得记：`All the skills here are a side-effect of domain-expertise. AI doesn't replace such expertise, it amplifies what you can get out of it`。
- 各 skill 内容与许可证未读。

### 2.8 OpenDesign（nexu-io/open-design）◐ 仅 README 片段

- 链接：<https://github.com/nexu-io/open-design>。README 自称庆祝 100K star（⚠️ 未在 GitHub 页面核实）。Apache-2.0。
- 是一个"AI 设计代理工作台"（桌面/云应用），内置 skills、设计模板、design systems、插件；把社区 skill 原样打包进来（例如 `guizang-ppt` 以 MIT 原文收录）。
- 对我们的意义：**证明"skill + 模板 + design system 三件套"是当前主流形态**；它的 skills / design-templates 目录可以当素材库浏览。

---

## 3. 非网站输出：幻灯片与文档（与我们最相关）

### 3.1 Kami（tw93/kami）✅ README + SKILL.md 大部分 —— **最值得细读的一个**

- 链接：<https://github.com/tw93/kami>
- 热度：~12.6k star。MIT（代码和模板）。**字体另计**：默认中文字体 TsangerJinKai02（仓耳今楷）仅个人免费、商用需授权；Source Han Serif K、JetBrains Mono 为 OFL。
- 定位：`Good content deserves good paper.` 给 agent 一套排版规则和模板，输出 PDF / PNG / 可编辑 PPTX。**九种文档模板**：简历、一页纸、白皮书/长文档、信件、作品集、幻灯片、**研报（equity report）**、changelog、落地页；另有社交卡片。
- 机制（和网站类 skill 思路几乎相反）：
  - **单一固定审美**：衬线字体 + 暖色纸底 + 墨蓝强调色，每种语言全页只用一种字体。不追求"每次都不一样"，追求"每次都好"。
  - **`Copy the template into the working directory; never write HTML from scratch. CSS stays untouched during a content fill.`** 改样式必须同时改 `references/design.md` 和所有兄弟模板。
  - **动手前锁定契约**：语言、模板、输出格式、页数或长度目标、视觉验收标准、验证命令，用一行话告诉用户。
  - **提问预算**：`Infer first. Ask at most once, in one compact question with at most two parts`。
  - **内容与排版分离**：内容先写成 `content.json`，对照 `references/schemas/<type>.json` 校验（`--check-content`），再排版。
  - **缺口报告**：模板需要而输入没有的东西汇总成一张表；文档内标 `[DATA NEEDED: what]`；`Never fill a gap with a guess`；`do not pad slots (three real projects do not become five)`。
  - **图表不手画**：`Charts from data… are generated, never drawn by hand`，写数据 spec 后用脚本生成 SVG；18 种现成示意图 SVG。
  - **减法原则**：`Tables separate rows with whitespace first and neutral hairlines second; decoration earns its place only by encoding data, state, grouping, or a relationship`。
  - **分层阅读**：`Read the lowest tier that covers the task`（CHEATSHEET → 模板 → schema → 完整 design.md）。
  - **交付检查**：`--deliver` 检查 HTML（占位符残留、Markdown 残留、图表与数据一致、内容覆盖率）并渲染 PDF 再检查（页数契约、实际绘制 CJK 的字体、密度、孤行）；然后**逐页看图**；每轮修最显眼的三个问题，最多三轮；最后做一次脱离自身推理的"fresh review"。
  - `Never hide a content problem by shrinking type first.`
- 弱点：
  - 只有一种审美（就是当前被点名的"暖纸 + 衬线"那一类），品牌适配有限。
  - 面向打印/PDF（WeasyPrint），不是交互式 HTML；Windows 需要 WSL。
  - 没有扫描报告、API 文档、仪表盘这类技术文档模板。

### 3.2 frontend-slides（zarazhangrui/frontend-slides）✅ SKILL.md 前 60 行 + README 片段

- 链接：<https://github.com/zarazhangrui/frontend-slides> ｜ 模板库 <https://github.com/zarazhangrui/beautiful-html-templates>（34 套模板，MIT）
- 热度：~33k star。MIT。
- 机制：
  - **零依赖单文件 HTML**。
  - **`Show, Don't Tell`**：`Generate visual previews, not abstract choices. People discover what they want by seeing it.` description 里直接写着 `Helps non-designers discover their aesthetic through visual exploration rather than abstract choices`——**和我们的用户画像完全一致**。
  - **固定 1920×1080 舞台整体缩放**（`NON-NEGOTIABLE`），不做响应式重排；必须原样包含 `viewport-base.css`。
  - **内容密度模式**：先问是"阅读型"还是"演讲型"幻灯片，再决定每页信息量。
  - **渐进披露**：先读轻量风格索引，用户选定后才加载该模板完整的 `design.md`。
  - 模板库有 `index.json` + `AGENTS.md`，教 agent 如何按 brief 匹配模板、克隆、改内容。
  - 记录了具体的 CSS 坑：不要用 `display:none` 切换幻灯片；`-clamp()` 会被静默忽略。
- 弱点：审美指导部分直接照搬 Anthropic cookbook 那段提示词（含"氛围背景""错峰动画"），自带上一代 slop 基因；强调 "animation-rich"。

### 3.3 guizang-ppt-skill（op7418，歸藏）✅ SKILL.md 前 40 行

- 链接：<https://github.com/op7418/guizang-ppt-skill>（MIT，据 OpenDesign README 转述；仓库 LICENSE 未直接读 ⚠️）
- 机制：**只提供两种深度打磨的风格**——"电子杂志 × 电子墨水"（`像 Monocle 杂志贴上了代码`）和"瑞士国际主义"（`像 Massimo Vignelli + Helvetica Forever`，功能色四选一）；每种有完整模板 HTML、主题文件、布局文件；P0 / P1 / P2 检查清单；功能完整（演讲者视图、讲稿备注、计时）。
- 启示：**"美学锚点"用一句具体的文化参照来描述，比形容词有效**；少而精的风格比 80 种风格库更可控。
- 弱点：WebGL 背景偏花哨；风格只有两种。

---

## 4. 设计规范格式：DESIGN.md

### 4.1 Google `design.md` 规范 ✅ README + spec 片段

- 链接：<https://github.com/google-labs-code/design.md>（~29k star，Apache-2.0，版本标 `alpha`）；Stitch 官方文档 <https://stitch.withgoogle.com/docs/design-md/overview/>（⚠️ 未读）
- 是什么：`A format specification for describing a visual identity to coding agents.` 两层结构：
  - **YAML token**（front matter 或各节内的 yaml 代码块）：`colors`、`typography`、`rounded`、`spacing`、`motion`、`components`，支持 `{colors.primary}` 引用。`The tokens are the normative values. The prose provides context for how to apply them.`
  - **Markdown 正文**，固定章节顺序：Overview、Colors、Typography、Layout、Elevation & Depth、Shapes、Motion、Voice & Content Strategy、Components、**Do's and Don'ts**。
- 工具：`npx @google/design.md lint`（校验结构、断掉的 token 引用、**WCAG 对比度**，输出 JSON）、`diff`（检测 token 回归）、`export`（导出 Tailwind v3 / v4、**W3C DTCG**）。
- 值得借的示例：颜色配了角色说明——`Tertiary (#B8422E): "Boston Clay" — the sole driver for interaction.`
- 弱点：
  - 描述的是**品牌视觉身份**，不是"什么是好设计"。token 再正确，布局和层级照样可以很差。
  - 章节设计面向产品 UI；没有图表配色、表格、长文排版、打印、幻灯片版式这些概念。
  - 仍是 alpha。

### 4.2 awesome-design-md（VoltAgent）✅ README + 一份样例开头

- 链接：<https://github.com/VoltAgent/awesome-design-md> ｜ <https://getdesign.md>
- 热度：~129k star。MIT。徽章显示 84 份 DESIGN.md。
- 是什么：从真实网站（Claude、Stripe、Linear、Vercel…）"分析提取"出的 DESIGN.md 合集。用法：`Copy a DESIGN.md into your project, tell your AI agent "build me a page that looks like this"`。
- 样例结构（Claude 那份，33KB）：YAML token 约 300 行 + Overview / Colors / Typography / Layout / Elevation / Shapes / Components / Do's and Don'ts / Responsive Behavior / Iteration Guide / **Known Gaps**。
- 弱点：
  - **法律与品牌风险**：MIT 只覆盖文件本身；内容是他人品牌的设计语言，还引用了专有字体（如 Copernicus / Tiempos）。照着做等于仿冒别人的品牌，不适合作为我们的默认风格。
  - 文件是 AI 从网站反推的，准确性没有保证（样例自己有 "Known Gaps" 一节）。
  - 仓库有明显的商业化倾向（赞助位、付费请求）。
  - 复制品牌 ≠ 学会设计；对报告和文档没有帮助。

### 4.3 Stitch Skills（google-labs-code/stitch-skills）◐ 仅 README

- 链接：<https://github.com/google-labs-code/stitch-skills>（Apache-2.0；star 数未取）
- 三个插件：`stitch-design`、`stitch-build`、`stitch-utilities`。相关 skill：`extract-design-md`（从前端源码提取 DESIGN.md）、`design-md`（分析 Stitch 项目生成 DESIGN.md）、`enhance-prompt`（把模糊想法扩写成带 UI/UX 关键词的提示词）、`taste-design`（生成"高端、反通用"的 DESIGN.md，显然源自 taste-skill）。
- 需要 Stitch MCP 服务；各 SKILL.md 未读。

---

## 5. 商业产品的系统提示词（设计部分）

> v0 与 Lovable 的提示词来自第三方泄露合集 <https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools>（仓库自身标 GPL-3.0，但**提示词版权属于各公司**，真实性与时效性无法验证 ⚠️）。Bolt 的来自开源仓库，可信。只学思路，不要照搬原文。

### 5.1 v0（Vercel）✅ 读了泄露文本的 Design Guidelines 一节

- 机制：**数量硬上限 + token 强制**。
  - `ALWAYS use exactly 3-5 colors total.`（1 个主色 + 2–3 个中性色 + 1–2 个强调色）
  - `NEVER use purple or violet prominently, unless explicitly asked for`
  - `Avoid gradients entirely unless explicitly asked for. Use solid colors.` 若必须用：同类色、最多 2–3 个色标、`NEVER mix opposing temperatures`
  - `ALWAYS limit to maximum 2 font families total.`；正文行高 1.4–1.6；不小于 14px
  - `If you override a components background color, you MUST override its text color to ensure proper contrast`
  - `DO NOT use direct colors like text-white, bg-white, bg-black, etc. Everything must be themed via the design tokens`
  - 标题用 `text-balance` / `text-pretty`；间距用 gap，不混用 margin
  - `NEVER generate abstract shapes like gradient circles, blurry squares, or decorative blobs as filler elements`；`NEVER use emojis as icons`；**不要手画地图 SVG**，用地图库
  - 结尾：`Ship something interesting rather than boring, but never ugly. Utilize the GenerateDesignInspiration tool before any design work.`（**先调用"设计灵感"工具再动手**）
- 评价：这是"保底"思路的代表，目标是**永不难看**而不是惊艳。对非设计师和报告类输出，这套保守约束比"大胆一点"更对路。

### 5.2 Lovable ✅ 读了泄露文本的 Design guidelines

- 机制：**design system 至上**。
  - `CRITICAL: The design system is everything. You should never write custom styles in components`
  - `USE SEMANTIC TOKENS FOR COLORS, GRADIENTS, FONTS, ETC.`
  - 流程：先写"这个需求让人联想到什么、可以借鉴哪些已有的优秀设计"，列出颜色 / 渐变 / 动画 / 字体，**先改 `index.css` 和 `tailwind.config.ts`，再写组件**；给 shadcn 组件加自定义 variant 而不是在使用处覆盖。
  - 具体防呆：`shadcn outline variants are not transparent by default so if you use white text it will be invisible`。
  - 不留占位图，直接生成图片。
- 弱点：鼓励 `leverage colors and animations` 来"避免无聊"，容易过度装饰。

### 5.3 Bolt（bolt.diy 开源提示词）✅ 读了 `new-prompt.ts` 的 design_instructions

- 链接：<https://github.com/stackblitz-labs/bolt.diy/blob/main/app/lib/common/prompts/new-prompt.ts>（仓库许可证未读 ⚠️）
- 机制：**形容词轰炸 + 自问清单**。`Create breathtaking, immersive designs that feel like bespoke masterpieces, rivaling the polish of Apple, Stripe, or luxury brands`；`ask: "Would this design make Apple or Stripe designers pause and take notice?"`；`Ensure designs feel alive and modern with dynamic elements like gradients, glows, or parallax effects`；字体建议 `pair a modern sans-serif (e.g., Inter) with an elegant serif (e.g., Playfair Display)`。
- 有用的一点：支持用户传入 `designScheme`（FONT / PALETTE / FEATURES）参数化注入。
- 评价：**反面教材**。它要求的"渐变、发光、视差"和推荐的 Inter + Playfair，恰好是其他所有方案禁用清单上的条目。"像 Apple 一样"这类目标对模型没有可操作信息。

---

## 6. Vercel Web Interface Guidelines ✅ README + command.md 前半

- 链接：<https://github.com/vercel-labs/web-interface-guidelines>（~1.2k star，MIT）
- 是什么：一份"界面细节决策清单"（Interactions / Animations / Layout / Content / Forms / Performance / Design / Copywriting），附带 `command.md`（可作为 `/web-interface-guidelines <file>` 审查命令）和 `AGENTS.md`。
- 定位：**工艺与可访问性底线，不管审美方向**。适合当我们的"地板"素材。
- 可借的条目：
  - `Layered shadows. Mimic ambient + direct light with at least two layers.`
  - `Nested radii. Child radius ≤ parent radius & concentric so curves align.`
  - `Hue consistency. On non-neutral backgrounds, tint borders/shadows/text toward the same hue.`
  - `Interactions increase contrast.`
  - `Set the appropriate color-scheme` / `theme-color`
  - `Never transition: all`；只动画 `transform` / `opacity`；尊重 `prefers-reduced-motion`
  - 审查命令的输出要求：`sacrifice grammar for brevity. High signal-to-noise.`
- 弱点：大量条目针对交互式应用（表单、hydration、URL 状态），对静态报告只有三分之一适用；不解决"好不好看"。

---

## 7. 综合分析

### 7.1 反复出现的机制（按出现频率）

| # | 机制 | 谁在用 | 评价 |
|---|---|---|---|
| 1 | **点名 AI 默认样貌 / 禁用清单** | 几乎全部 | 有效但有保质期；见 7.2 |
| 2 | **动手前先承诺方向**（写计划、给方向起名、列 token） | frontend-design、canvas-design、Lovable、cookbook（`State your choice before coding`）、Kami（契约） | 稳定有效，成本低 |
| 3 | **token 强制**（所有颜色/字体走 `:root` 变量，禁止字面值） | v0、Lovable、Hallmark Floor #1、design.md | 一致性的最大单一来源，且**可机器检查** |
| 4 | **预置风格/主题库 + 选择** | theme-factory（10）、Hallmark（50）、ui-ux-pro-max（80）、beautiful-html-templates（34）、guizang（2）、Kami（1） | 对非设计师最有用；少而精胜过多而浅 |
| 5 | **"发牌"：由脚本而非模型选方向** | taste-skill v2、Hallmark、ui-ux-pro-max（检索） | 直接绕开"模型总选同一个"的根因 |
| 6 | **真浏览器渲染 + 确定性 lint** | impeccable（62 条）、Hallmark sloplint、taste-skill consistency、Kami `--deliver`、design.md lint | 第三代方案的核心；把规则从"希望模型遵守"变成"不通过就不能交付" |
| 7 | **收尾闸门 / hook** | taste-skill（Stop hook）、impeccable（编辑后 hook）、Hallmark（可选 hook） | 强制力最强，但依赖宿主支持 |
| 8 | **全新上下文的评审者** | Hallmark、Kami、impeccable（critique 可委派） | 自己评自己的作品偏宽松，换上下文有效 |
| 9 | **按界面类型分流规则** | impeccable（Persuade / Operate / Read / Experience）、taste-skill（业务类型）、frontend-slides（密度模式）、huashu（主导角色） | **对我们是必需品**：报告和落地页的"好"是两回事 |
| 10 | **从模板/起点文件开始，而非从零写** | Kami、taste-skill v2、frontend-slides、guizang、web-artifacts-builder | 质量下限最稳 |
| 11 | **先给用户看图再选**（多方案并排） | theme-factory、frontend-slides、huashu（三方向）、superdesign | 非设计师无法用语言描述偏好，但能指认 |
| 12 | **项目级持久设计文件** | DESIGN.md、PRODUCT.md、`design-system/MASTER.md` | 解决跨会话、跨页面一致性 |
| 13 | **不编造内容**（指标、证言、logo 墙、占位图） | Hallmark、Kami、huashu（事实验证）、Lovable | 报告类输出尤其关键 |
| 14 | **文案规范** | frontend-design（整节）、taste-skill copy-lint、impeccable `clarify` | AI 味有一半来自文案 |
| 15 | **质量底线不声张**（对比度、焦点、reduced motion） | 全部 | 共识 |
| 16 | **按模型能力分流** | 仅 huashu-design | 少见但合理 |

### 7.2 什么真的有效，什么是 cargo cult

**看起来真的有效（多个独立方案收敛到同一做法，且越新的版本越倚重）**

1. **确定性检查 > 提示词**。impeccable、taste-skill、Hallmark、Kami 的演化方向完全一致：把规则写成脚本，在渲染结果上跑。这是唯一能"保证"的手段。
2. **token 强制 + 数量上限**（v0 的 3–5 色、2 字体）。简单、可检查、直接决定一致性。
3. **从好模板改，而不是从零生成**。Kami 的 `never write HTML from scratch` 是最直白的表述。
4. **由外部（脚本或用户）决定方向**。模型的品味分布是坍缩的，让它"自由选择"必然趋同；发牌或让用户看图选，都是把选择权移出模型。
5. **按界面类型换规则**。impeccable 对 Operate / Read 的结论（克制、熟悉感、固定字号、强调色只用于状态）与落地页规则几乎相反。
6. **"默认值而非禁令"的措辞 + `the brief wins`**。新版 frontend-design 和 impeccable 都改成了这种说法，避免模型过度回避或违背用户明确要求。
7. **先看渲染结果再改，限定轮数**（Kami：每轮三个问题，最多三轮；taste-skill：最多三轮）。
8. **具体的文化参照**作为美学锚点（"像 Monocle 杂志贴上了代码"）比形容词有效。

**Cargo cult / 已被证伪或有副作用**

1. **形容词轰炸**（Bolt：`breathtaking… masterpieces… Apple-level`）。没有可操作信息。
2. **"用 X 字体代替 Inter"式的替换清单**。结果是全网 Space Grotesk、Geist、Playfair、Satoshi。cookbook 自己都在提示词里承认了。
3. **"大胆""出人意料""加氛围背景和错峰动画"作为通用建议**。cookbook 2025 版的产物如今就是被点名的 slop；对报告、文档、仪表盘更是有害。
4. **全大写 `BANNED` / `CRITICAL` / `NEVER`**。taste-skill v1 的风格；新一代方案（frontend-design、impeccable、Kami）的语气都平静得多，并解释原因。
5. **巨型风格数据库**（ui-ux-pro-max 的 80 风格 × 194 调色板）。数量大于质量，行业 → 配色的查表产生的是"得体的平庸"，且库内包含其他方案明令禁止的风格。
6. **复制别人品牌的 DESIGN.md**。得到的是仿冒品，而不是设计能力。
7. **禁用清单本身是移动靶**：2024 年的特征是紫蓝渐变，2026 年是奶油底 + 衬线 + 陶土色、eyebrow 标签、`→` 链接。**任何写死的清单都会在 6–12 个月内变成新 slop 的定义**。结论：清单要做成**可更新的数据**，并且永远配合"由外部决定方向"的机制，而不能单独依赖。

（说明：以上"有效性"判断主要基于各方案的演化方向和相互印证，**没有任何一个方案公布了对照实验数据**。cookbook 有三组前后对比截图，impeccable 和 taste-skill 的 README 有对比图，都是作者自选样例。）

### 7.3 许可证与可复用性

| 来源 | 许可证 | 能否复用 |
|---|---|---|
| anthropics/skills：frontend-design、theme-factory | Apache-2.0 ✅ 已读 LICENSE | 可改写、可分发，需保留许可证与修改声明 |
| anthropics/skills 其他 skill | README 称"many… Apache 2.0" | 逐个确认目录内 LICENSE.txt |
| claude-cookbooks 提示词 | ⚠️ 未核实仓库许可证 | 思路可用；原文引用前先确认 |
| pbakaus/impeccable | Apache-2.0 ✅（浏览器扩展内含 MPL-2.0 与 OFL 部件，见其 NOTICE.md） | 可复用 skill 与 reference，保留 NOTICE |
| Leonxlnx/taste-skill、classics | MIT ✅ | 可复用；内置照片各有各的许可证 |
| nextlevelbuilder/ui-ux-pro-max-skill | MIT ✅ | 可复用 CSV 数据（质量需筛选） |
| Nutlope/hallmark | MIT ✅（照片索引中的图片各自许可） | 可复用 |
| alchaincyf/huashu-design | MIT ✅（2026-05-14 起；更早版本有商用限制） | 可复用当前版本 |
| tw93/kami | MIT ✅（代码与模板）；**仓耳今楷字体商用需授权** | 模板和规则可复用，换掉字体 |
| zarazhangrui/frontend-slides、beautiful-html-templates | MIT ✅（README 声明） | 可复用 |
| op7418/guizang-ppt-skill | MIT ⚠️（经 OpenDesign README 转述） | 复用前读其 LICENSE |
| google-labs-code/design.md、stitch-skills | Apache-2.0 ✅ | 规范格式可直接采用 |
| VoltAgent/awesome-design-md | MIT ✅，但内容是第三方品牌设计语言 | **不建议直接使用**；格式可参考 |
| vercel-labs/web-interface-guidelines | MIT ✅ | 可复用条目 |
| v0 / Lovable 泄露提示词 | 版权归原公司 | **只借鉴思路，不照搬原文** |
| bolt.diy 提示词 | ⚠️ 未读 LICENSE | 思路即可（也没什么值得搬的） |
| nexu-io/open-design | Apache-2.0（README 声明），内含的第三方 skill 各自许可 | 可浏览取材 |

通用注意：字体（商用授权、OFL）、照片（CC BY / CC BY-SA 需署名）、图标库各有许可，与代码许可证分开计算。

### 7.4 现有方案都没填上的空白（我们的机会）

1. **报告类输出（扫描报告、审计报告、分析报告）完全空白**。
   - 没有任何方案提供：严重级别配色体系、发现项卡片、摘要 → 详情的层级、长表格、代码/日志片段、证据截图、可折叠明细、打印/PDF 友好、目录与锚点导航。
   - Kami 最接近（研报、白皮书），但面向打印、单一审美、无技术报告模板。
2. **API 文档 / 技术文档空白**。impeccable 的 Read 模式只有原则性的一段话；没有端点卡片、参数表、请求/响应示例、代码高亮主题、侧边导航这些组件级指导。
3. **数据可视化的视觉质量空白**。ui-ux-pro-max 只有"选哪种图"的表；Kami 有脚本生成图表；Vercel 只有一句 `Use color-blind-friendly palettes`。**没有方案把图表配色、坐标轴、标注、图例与页面 token 系统打通**。
4. **现有禁用清单对非网站输出部分失效甚至有害**。例如"每屏约 80 词""每屏一个 section""必须有 hero""卡片是懒惰容器""等宽字体是装腔作势"——对报告和 API 文档，高密度、卡片、等宽字体、表格恰恰是正确选择。**需要一套按输出类型分别定义的"slop 是什么"**（impeccable 的 Operate 定义"没有目的的陌生感"是很好的起点）。
5. **面向"非设计师"的验收机制薄弱**。多数方案假设用户能判断"方向对不对"。只有 frontend-slides、theme-factory、huashu 采用"看图选"；没有方案提供"用户不懂设计也能确认合格"的客观清单 + 截图证据。
6. **零依赖、离线、单文件**。第三代方案普遍需要 Node 22 + Chrome + 网络（taste-skill、Hallmark、impeccable 的二进制与遥测）。报告常常要作为单个 HTML 附件发送、离线打开、打印，现有方案很少把这当作第一约束（frontend-slides 和 web-artifacts-builder 是例外）。
7. **跨输出类型的一致性**。没有方案能让同一个项目的报告、文档、幻灯片共享一套 token 而各自使用适合的版式规则。DESIGN.md 管 token 但不管各媒介的版式；theme-factory 有这个意图但只有颜色和字体。
8. **规则的时效维护**。只有 impeccable（在线目录 + 遥测）和 Hallmark（构建日志防撞车）在处理"趋同会随时间移动"的问题，且都只针对网站。
9. **组件库与 skill 的结合**。多数方案要么只有提示词（frontend-design），要么是整页模板（Kami、taste-skill）。**"一套经过设计的、可组合的报告/文档组件 + 教 agent 如何组合的 skill"这一中间形态没有人做**——这正是本仓库设想的方向。
10. **没有公开的效果评估**。全行业靠自选的前后对比图。谁先做出可复现的对照评估，谁就有说服力（评估回路由另一份调研覆盖）。

### 7.5 给本项目的直接建议（从本调研推出）

- **采用的骨架**：按输出类型分流（借 impeccable 的 Read / Operate 概念，细化成 report / docs / slides / viz）→ 每种类型有模板起点和组件（借 Kami、frontend-slides）→ 所有样式走 token（借 v0 / Hallmark Floor / design.md 格式）→ 少量精做的主题由用户看图选或由脚本分配（借 theme-factory / Hallmark / guizang）→ 渲染后跑确定性检查并限定修复轮数（借 Kami / taste-skill / impeccable）。
- **token 格式**直接兼容 Google design.md（Apache-2.0，带 lint 和 DTCG 导出），不要自己发明。
- **规则分三层**（借 Hallmark）：不可豁免的底线 / 可记录理由后豁免的条件反射 / 不阻塞的工艺项。
- **禁用清单做成按类型区分、可更新的数据文件**，措辞用"这是默认值而非选择"，并保留 `the brief wins`。
- **内容诚信规则**对报告是头等大事：不编造数据，缺口显式标注（借 Kami 的 `[DATA NEEDED]` 与缺口报告）。
- **保持零依赖单文件输出**作为硬约束，检查脚本可选增强、缺席时退化为清单自查。
- 优先细读的一手材料（按价值排序）：Kami 的 `references/design.md` 与 `anti-patterns.md`、impeccable 的 `operate.md` / `craft-floor.md` / `critique-rubric.md`、Hallmark 的 `references/gates.md` 与 `sloplint.mjs`、frontend-slides 的 `STYLE_PRESETS.md`、Anthropic `pptx` skill 的设计一节。**这些内部文件本次大多没有读到，属于后续工作**。

---

## 8. 未能核实 / 未覆盖的内容汇总

- Claude Design：仅搜索摘要，未读 Anthropic 官方页面。
- Stitch 官方 DESIGN.md 文档页：未读（读的是 `google-labs-code/design.md` 仓库的规范，应为同一格式的正式版本）。
- v0、Lovable 提示词：来自第三方泄露仓库，真实性与版本时间无法确认。
- Superdesign 旧版 `design.mdc` 规则原文：未取到。
- impeccable 的 62 条检测规则明细、`new-work.md`、`critique-rubric.md`；Hallmark 的 `gates.md`、`sloplint.mjs`、主题文件；taste-skill 的 `layout-v4.md` 与脚本；Kami 的 `references/design.md`、`anti-patterns.md`；ui-ux-pro-max 的 CSV 内容：均未读（只读了入口 SKILL.md / README）。
- Emil Kowalski skills、stitch-skills 的各 SKILL.md 内容与前者的许可证：未读。
- Star 数未取到的：stitch-skills、superdesign（两个仓库）、open-design（README 自称 100K）、guizang-ppt-skill、emilkowalski/skills、beautiful-html-templates、x1xhlol 合集。
- 关于"旧版 frontend-design 稳定产出奶油色""Hallmark 自 8 月后未更新""antislop / unslop-ui 等小项目"的说法来自搜索摘要中的第三方文章（capitalandcompute.net、claudecodehq.com），原文因网络策略未能抓取。
- 各方案的实际效果：没有做任何实测对比，以上评价基于文本阅读。
