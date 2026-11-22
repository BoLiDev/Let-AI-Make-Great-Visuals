# 04 · 评估与反馈闭环：如何度量并持续提升 Agent 的视觉产出质量

> 调研日期：2026-11-22。角度：验证与迭代（自动检查 + 人类品味在环）。
> 其他文档覆盖 prompt/skill 包、社区技巧、组件库，本文不重复。

## 可信度标注

本次会话的网络白名单只放行了部分域名。`arxiv.org` 和 `designarena.ai` 无法直接访问，相关内容只能依赖搜索摘要。每条结论按下列标记区分：

| 标记 | 含义 |
|---|---|
| **[已核实]** | 本次直接读取了一手来源原文 |
| **[摘要]** | 只看到搜索引擎返回的摘要，未读原文；引用具体数字前请自行核对 |
| **[记忆]** | 来自我的既有知识，本次未联网核实 |
| **[推断]** | 我基于上述证据做的判断，不是任何来源的结论 |

---

## 0. 结论先行

1. **最有据可依的做法是"生成者与评审者分离 + 用少量带分数的示例校准评审者"**。Anthropic 自己的实验明确说，模型给自己的作品打分时会稳定偏高；单独调一个"多疑的评审者"比让生成者自我批评容易得多。
2. **审美没有通用真值，单个人的品味反而是更好的标尺**。DesignPref 中 20 位职业设计师的两两偏好一致性只有 Krippendorff α≈0.25；用单个设计师的少量标注训练出的模型，胜过用 20 倍数据训练的聚合模型 [摘要]。这正好支持本仓库"一个有品味的人做验证者"的设定。
3. **VLM 当评委只能算"中等可靠"**：能筛掉明显的坏结果，但在审美维度上与人类一致性有限，且有位置偏差和自我偏好。它适合做预筛和找问题，不适合做最终裁决。
4. **确定性检查便宜且值得先做**：溢出、重叠、截断、对比度、字体/颜色数量、slop 模式扫描都能用 Playwright 加几十行脚本完成，可以在人看之前挡掉"破损"类问题，让人的时间只花在"品味"上。
5. **"什么最有效"几乎没有严格的消融实验**。Anthropic 的前端 skill 博文、impeccable 的 README 都只有前后对比图，没有量化评估。这是本仓库可以自己补上的空白，也是评估体系值得先建的原因。

---

## 1. Agent 自我批评闭环：渲染 → 截图 → 视觉模型批评 → 修改

### 1.1 Anthropic 的 generator / evaluator 实验 [已核实]

来源：[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)（二手报道：[InfoQ](https://www.infoq.com/news/2026/04/anthropic-three-agent-harness-ai)）

这是目前最接近"官方一手证据"的材料。要点：

**四条前端评分标准（原文）**

- **Design quality**: "Does the design feel like a coherent whole rather than a collection of parts?"
- **Originality**: "Is there evidence of custom decisions, or is this template layouts, library defaults, and AI-generated patterns?"
- **Craft**: "Technical execution: typography hierarchy, spacing consistency, color harmony, contrast ratios."
- **Functionality**: "Usability independent of aesthetics."

权重："I emphasized design quality and originality over craft and functionality." 原因是 craft 和 functionality 模型默认就做得不错，平庸出在前两项。

**关于自评偏宽（原文）**

- 模型评价自己作品时 "tend to respond by confidently praising the work—even when, to a human observer, the quality is obviously mediocre."
- 它们 "reliably skew positive when grading their own work."
- 独立评审者仍是偏宽容的 LLM，但 "tuning a standalone evaluator to be skeptical turns out to be far more tractable."

**校准方式**："I calibrated the evaluator using few-shot examples with detailed score breakdowns." 作用是让评审者的判断对齐作者的偏好，并减少多轮之间的分数漂移。

**做法细节**：评审者拿到 Playwright MCP，先实际操作页面再逐项打分并写批评；每次生成跑 5–15 轮，完整一次最长约 4 小时。

**把"美不美"换成"是否符合原则"**："Is this design beautiful?" 难以稳定回答，而 "does this follow our principles for good design?" 给了模型具体的评分依据（搜索摘要转述该文，措辞请以原文为准）。

**评审者的失败模式**

- 会"发现真实问题，然后说服自己这不算大事并放行"。
- 测试流于表面，不探查边界情况。
- 后期轮次仍漏掉小的布局问题和不直观的交互。

**成本**：复古游戏制作器的例子里，单 agent 20 分钟 $9，完整 harness 6 小时 $200，作者自己说 "over 20x more expensive"。作者的原则是评审者 "worth the cost when the task sits beyond what the current model does reliably solo"，并且随模型变强他删掉了 sprint 拆分等部件。

**对本仓库的含义 [推断]**：对"一页报告、一张图表"这种单次生成的任务，多轮评审闭环的成本很可能不划算；一次截图自查加确定性检查更合适。多轮闭环留给整站这类复杂产出。

### 1.2 Claude Code 官方指引 [已核实]

来源：[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)

- 把浏览器截图与设计稿并排，是官方列出的"给 Claude 一个可运行的检查"的方式之一。
- 要求 Claude 给出**证据**（运行的命令及输出，或截图），而不是一句"都通过了"。
- 独立评审有效的原因是它没看过生成过程："A fresh reviewer does help, because it hasn't seen your reasoning"；同时说明把同一任务交给 subagent 并不会让答案更好。
- 可以用 `.claude/agents/` 里只给只读工具的 subagent 做评审，这个限制由 Claude Code 强制执行。
- 一个重要警告："A reviewer that's asked to find problems will always find *something*." 全部照改会过度修饰。**评审输出必须分级，只修高优先级问题**。

Anthropic 官方 `frontend-design` skill 当前版本也内置了这一步 [已核实]（[SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md)）："Critique your own work as you build, taking screenshots to review if your environment supports it"，并且要求先写出 token 计划、对照 brief 审查后才开始写代码。它没有正式 checklist，但点名了多组"生成痕迹"（五类 AI 设计套路、排版痕迹、动效套路等）。

### 1.3 社区的 design-review 工作流

**OneRedOak design-review agent** [已核实]（[agent 文件](https://raw.githubusercontent.com/OneRedOak/claude-code-workflows/main/design-review/design-review-agent.md)）

- 八个阶段：Preparation → Interaction and User Flow → Responsiveness → Visual Polish → Accessibility (WCAG 2.1 AA) → Robustness → Code Health → Content and Console。
- 视口：1440 / 768 / 375。
- 分级：`[Blocker]` / `[High-Priority]` / `[Medium-Priority]` / `[Nitpick]`。
- 原则："Live Environment First"、"Problems Over Prescriptions"（描述问题和影响，不直接给技术方案）、有截图为证。
- 未见任何有效性数据。

**impeccable（pbakaus）** [已核实]（[仓库](https://github.com/pbakaus/impeccable)、[audit.md](https://raw.githubusercontent.com/pbakaus/impeccable/main/skill/reference/audit.md)、[critique.md](https://raw.githubusercontent.com/pbakaus/impeccable/main/skill/reference/critique.md)）

这是目前结构最完整的"评审命令"参考，值得直接借鉴其结构：

- **确定性检测器** `npx impeccable detect`：README 称 "62 deterministic rules"，"No LLM, no API key"。源码文件只跑模式规则；需要渲染的规则（低对比度、过小文字）在扫描 URL 时才跑。支持 JSON / SARIF 输出和行内忽略。点名的痕迹包括 Inter 用于一切、紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方的圆角方形图标块。（第三方镜像写的是 25 条规则，应是旧版本，以仓库为准。）
- **`/audit`**：代码层技术检查，不是设计评审。五个维度各 0–4 分，共 20 分：Accessibility、Performance、Theming、Responsive Design、Implementation Integrity。问题分 P0–P3。提醒 "Keep P3s few: a long tail of minor issues buries the ones that matter."
- **`/critique`**：两个**相互隔离**的评估再合成。
  - Assessment A：LLM 像设计总监一样评审，**在看到检测器输出之前**先判断设计的独特性。
  - Assessment B：检测器加浏览器证据。
  - 原文要求两者 "MUST run as two isolated sub-agents"；不隔离的运行必须在报告开头标 DEGRADED。
  - 评分用 Nielsen 十条启发式，每条 0–4，共 40 分。
  - "Design Specificity Verdict"：这套设计能否被"一个毫不相关的产品"原样拿去用。这是一个很实用的 slop 判别问题。
  - 有忽略列表（`.impeccable/critique/ignore.md`）、结果持久化和最近五次的趋势。
- **有效性**：README 没有任何评测或量化结果，只有一组同模型同 brief 的并排对比。

**Chrome DevTools MCP** [摘要]（[Chrome 博文](https://developer.chrome.com/blog/chrome-devtools-mcp)、[Addy Osmani](https://addyosmani.com/blog/devtools-mcp/)）：提供截图、DOM 快照、执行页面 JS、读 console；官方示例是在 1280px 和 375px 下检查布局、截图、修复后再查。

**Playwright MCP 的局限** [摘要]（[Argos](https://argos-ci.com/blog/playwright-mcp-visual-testing)）：自身没有基线、没有 diff、没有 CI 评审流程，回归检查要另配视觉测试工具。注意该来源是视觉测试厂商。

**幻灯片场景** [摘要]：现有 pptx 类 skill 的常见做法是生成缩略图网格后让评审者检查文字是否被页眉、形状或边缘切掉；[Hands On Deck](https://skills.every.to/skills/hands-on-deck) 建议每张或每小批幻灯片交给一个上下文干净的 subagent 审，避免图片历史堆积。

### 1.4 失败模式汇总

| 失败模式 | 证据 | 对策 |
|---|---|---|
| 自评偏宽 | Anthropic harness 文 [已核实] | 评审者与生成者分离；评审者不看生成过程 |
| 发现问题后自我说服放行 | 同上 [已核实] | 评审输出结构化，问题一旦列出就必须给处置结论 |
| 被要求找问题就一定找得到，导致过度修改 | Claude Code best practices [已核实] | 严格分级，只修 P0/P1；限制轮数 |
| 分数多轮漂移 | Anthropic harness 文 [已核实] | few-shot 带分数示例校准 |
| 评委自我偏好 | 多篇 LLM-judge 论文 [摘要]，见 §3.3 | 结构化多维度评分；必要时换模型当评委 |
| 位置偏差（两图比较时偏向某一侧） | TASTE、G-FOCUS 等 [摘要] | ABBA：两种顺序各判一次，不一致记为平局 |
| 截图看不出的问题（溢出几像素、对比度差一点） | [推断] | 交给确定性检查，不交给 VLM |

---

## 2. 确定性检查：哪些可以便宜地自动化

### 2.1 检查清单与实现方式

下表的"实现方式"多数是 [记忆] 或 [推断]，属于常规 Web API 用法；我本次没有逐项实测。

| 类别 | 检查项 | 实现方式 | 成本 | 误报风险 |
|---|---|---|---|---|
| 破损 | 页面横向溢出 | `document.documentElement.scrollWidth > innerWidth` | 极低 | 低 |
| 破损 | 元素内容溢出 | `scrollWidth > clientWidth + 1`、`scrollHeight > clientHeight + 1` | 低 | 中，需要容差 |
| 破损 | 文字被省略号截断 | `text-overflow: ellipsis` 且 `scrollWidth > clientWidth` | 低 | 低 |
| 破损 | 文本元素互相重叠 | 两两比较 `getBoundingClientRect()`，排除祖先/后代关系 | 低 | 中，刻意叠放会误报 |
| 破损 | 元素超出视口或幻灯片边界 | rect 与固定画布尺寸比较 | 极低 | 低 |
| 破损 | 图片加载失败、console 报错 | `img.naturalWidth === 0`、监听 `console`/`pageerror` | 极低 | 低 |
| 破损 | 字体回退（声明的字体没加载到） | `document.fonts.check()` | 低 | 低 |
| 可读性 | 对比度 | axe-core `color-contrast` 规则；或自己算 WCAG 比值 / APCA | 低 | 中 |
| 可读性 | 正文字号过小、行长过长 | 计算样式 + 每行字符数估算 | 低 | 低 |
| 一致性 | 字体族数量、字号档位数量 | 遍历可见文本节点的计算样式并去重 | 低 | 低 |
| 一致性 | 颜色数量 | 收集文字色、背景色、边框色，按色差聚类后计数 | 低 | 中 |
| 一致性 | 间距是否落在刻度上 | 收集 margin/padding/gap，检查是否为 4 或 8 的倍数 | 低 | 中 |
| 一致性 | 圆角、阴影种类数 | 同上去重计数 | 低 | 低 |
| Slop | 默认字体、紫蓝渐变、渐变文字、玻璃拟态、卡片嵌套、emoji 当图标 | 正则扫描 CSS，加计算样式；或直接跑 `npx impeccable detect --json` | 低 | 中 |
| 响应式 | 多视口重复以上检查 | 1440 / 768 / 375 各跑一次 | 低 | 低 |
| 回归 | 像素对比 | Playwright `toHaveScreenshot` | 低 | 高，对生成式产出基本不适用 |

### 2.2 现成工具

- **axe-core / Lighthouse / pa11y** [记忆]：无障碍为主。axe 的对比度规则在背景是渐变或图片时往往给出"无法判定"而非通过或失败，这一点我本次没有核实到来源，使用时请留意 incomplete 结果。
- **APCA** [摘要]（[apca-w3](https://github.com/Myndex/apca-w3)、[介绍](https://github.com/Myndex/apca-introduction)）：感知更准的对比度算法，区分明暗极性，对深色的对比度评估比 WCAG 2 严格得多。注意三点：仍是 beta（0.1.9）；采纳它的标准（WCAG 3）仍在制定中；许可证有限制。另外这些优点主要出自 APCA 作者本人。**建议**：以 WCAG 2 AA 为硬门槛，APCA 仅作参考分。
- **stylelint + 设计 token 约束** [记忆，未核实]：`stylelint-declaration-strict-value` 这类插件可以强制颜色、字号只能取变量。对本仓库的含义是：组件库若全部走 CSS 变量，"是否出现裸十六进制色值"就是一条一行正则的检查。
- **impeccable detect** [已核实]：可直接当 slop 扫描器用，有 JSON 输出。
- **布局健壮性工具** [摘要]：[boxy](https://github.com/luptonm/boxy)、[agnt 的 layout-robustness](https://standardbeagle.github.io/agnt/api/frontend/layout-robustness)。经验提示：`transform: scale()` 或小数宽度会产生约 0.5px 的假溢出，需要容差；Playwright 自带的"可见性"定义不足以做这类测试（[issue #9923](https://github.com/microsoft/playwright/issues/9923)）。
- **视觉回归（Argos、Chromatic、BackstopJS 等）** [记忆]：对"每次生成都不同"的产出不适用。它的用途是守护**组件库本身**不被改坏。

### 2.3 两个原则 [推断]

1. **确定性检查只回答"有没有坏"，不回答"好不好看"**。全部通过的页面完全可能是平庸的。不要把通过率当成质量分。
2. **数量类检查给范围不给硬门槛**。例如"字体族 ≤ 2、字号档位 ≤ 6"作为警告。把它们做成硬性规则会把风格压扁，这与 skill-creator 关于避免 "oppressively constrictive MUSTs" 的告诫一致。

---

## 3. 基准与研究

### 3.1 人类投票类榜单

- **WebDev Arena（LMArena）** [摘要]（[发布文](https://news.lmarena.ai/webdev-arena)、[Simon Willison](https://simonwillison.net/2024/Dec/16/webdev-arena/)）：用户出题，两个匿名模型各建一个 web app，用户投票；排名用 Bradley-Terry。题目分 11 大类，最大三类是 Website Design 15.3%、Game Development 12.1%、Clone Development 11.6%。技术栈实际偏 React + TypeScript + Tailwind。旧榜显示 66,698 票，更新至 2025-12-16，之后并入 Code Arena。
- **Design Arena** [摘要，官网无法访问]（[about](https://designarena.ai/about)、[YC 页面](https://www.ycombinator.com/companies/design-arena)）：同一 prompt 一次性发给各模型，每次抽四个模型，匿名两两投票，Elo/Bradley-Terry 排名；票数少的标记为 preliminary。第三方分析（[Sacra](https://sacra.com/chat/h/82db263c-eb7d-460b-83cd-21556926a03d/)）指出它向榜上模型所属的实验室出售访问和数据，存在利益冲突的疑虑。**未能核实**：它的具体品类划分（是否单列数据可视化、幻灯片）。

**局限 [推断]**：这类榜单比较的是"模型"，不是"skill"；投票者是大众而非你；一次性生成、无上下文。它们对本仓库的价值是**方法**（匿名、两两、Bradley-Terry）和**题目分类**，不是结论。

### 3.2 自动评测基准

- **Design2Code** [摘要]（[NAACL 2025](https://preview.aclanthology.org/setup/2025.naacl-long.199)）：484 个真实网页，度量的是"还原参考截图"的保真度（Block-Match、Text、Position、Color，外加 CLIP），不度量审美。与本仓库的目标只有间接关系。
- **ArtifactsBench** [摘要]（[arXiv 2507.04952](https://arxiv.org/abs/2507.04952)）：用双 MLLM 评委按每题 10 维 checklist 打分。报告的数字是与 WebDev Arena **排名**一致性 94.4%，以及在一个 280 例专家研究中两两一致性最高 90.95%。注意 94.4% 是模型排名层面的一致，不是单个样本层面的。
- **UIClip** [摘要]（[arXiv 2404.12500](https://arxiv.org/abs/2404.12500)）：给 UI 截图打设计质量分的专用模型，在 12 位设计师评分的数据上与真值排名一致性最高。
- **UICrit** [摘要]（[arXiv 2407.08850](https://arxiv.org/abs/2407.08850)）：983 个移动 UI、3,059 条设计师批评。论文主张用它做 few-shot 能提升 LLM 的 UI 反馈质量；我记忆中的"提升 55%"这一数字**未能核实**。

### 3.3 VLM 当设计评委到底准不准

| 研究 | 发现 | 标记 |
|---|---|---|
| [MLLM as a UI Judge](https://arxiv.org/abs/2510.08783)（2025-10） | GPT-4o、Claude、Llama 在 30 个界面上对比人类判断：某些维度接近人类，另一些偏离；绝对评分的相关性为"中等偏强"。具体数字未取得 | [摘要] |
| [WebDevJudge](https://arxiv.org/abs/2510.18560)（ICLR 2026） | LLM 评委与人类专家之间存在显著差距；原因包括难以识别功能等价、难以验证可行性、存在偏差。仓库 README 未给数字 | [摘要] + 仓库页 [已核实] |
| [TASTE](https://arxiv.org/abs/2605.20731)（2026-05，平面设计） | 6 个开源 VLM 评委和 3 个专用美学打分器，与 5 位设计师多数意见的宏观一致性**都不超过 0.55**；VLM 在位置偏差与内容敏感度之间互相折衷，加大模型规模不提升准确率。训练一个小的成对差分头可达 0.611，单个评分者上限 0.741 | [摘要] |
| [VisJudge-Bench](https://arxiv.org/abs/2510.22373)（数据可视化） | 审美是当前模型最难的维度；微调后的专用模型优于通用大模型 | [摘要] |
| [UI2Code^N](https://arxiv.org/abs/2511.08195) | VLM 评委在两两判断上与人一致，但分数层面相关性中等（Pearson 0.65，Spearman 0.44） | [摘要] |
| [DesignPref](https://arxiv.org/abs/2511.20513)（2025-11） | 20 位职业设计师、12k 组两两比较；二元偏好 Krippendorff α≈0.25；28.5% 的比较分歧极大；个性化模型用少 20 倍的样本胜过聚合模型 | [摘要] |
| 自我偏好系列（[2410.21819](https://arxiv.org/abs/2410.21819)、[2604.22891](https://arxiv.org/abs/2604.22891)、[EMNLP 2026 Findings](https://aclanthology.org/2026.findings-emnlp.1571.pdf)） | 评委倾向给自己的输出高分；结构化多维度评估平均降低该偏差 31.5%；也有研究认为控制了质量和严厉度后，大部分表面偏好消失 | [摘要] |
| [Fooling the LVLM Judges](https://arxiv.org/abs/2505.15249) | 图上的视觉操纵（如叠加指令文字）能改变评委分数；CoT 和去偏提示只能减轻 | [摘要] |

**综合判断 [推断]**

- **两两比较比绝对打分可靠**。多项研究里两两判断与人一致，而分数层面只有中等相关。
- **VLM 评委的可信用途是"排除明显更差的那个"和"列出具体问题"**，不是给出可信的审美分数。上面 TASTE 的 0.55 来自平面设计和较小的开源模型，不能直接套到前沿模型评 HTML 页面上，但方向一致。
- **既然设计师之间都只有 α≈0.25，"对齐大众审美的评委"本身就不是好目标**。更现实的目标是"对齐你一个人的评委"，而 DesignPref 的结果说明这用很少的样本就可能做到。

### 3.4 2025–2026 的"品味"评测

没有找到针对"AI slop 视觉设计"的实证研究。能找到的是文本 slop 的度量（[arXiv 2509.19163](https://arxiv.org/abs/2509.19163)）以及评论性文章。直接以"taste"命名并与设计相关的是上面的 TASTE 和 DesignPref。

---

## 4. 人在环的偏好采集：把"我更喜欢 A"变成持久的规则

### 4.1 Anthropic skill-creator 的评测方法 [已核实]

来源：[SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)、[发布博文（2026-03-03）](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)

这是与本仓库最直接相关的现成方法，建议直接采用其骨架：

- **测试 prompt**：先写 2–3 个真实的测试 prompt，存 `evals/evals.json`，起初不带断言。
- **带 skill 与基线同时跑**："spawn two subagents in the same turn — one with the skill, one without." 改进已有 skill 时，基线是旧版本的快照。
- **主观产出不强加断言**："don't force assertions onto things that need human judgment." 设计类产出以定性人审为主。
- **人审界面**：用自带的 `generate_review.py` 生成查看器，逐例填反馈，结果落到 `feedback.json`。"Empty feedback means the user thought it was fine."
- **迭代目录**：`<skill-name>-workspace/iteration-1/`、`iteration-2/`……第二轮起传 `--previous-workspace` 以显示上一轮的产出和反馈。
- **盲比（可选）**："give two outputs to an independent agent without telling it which is which"，用 `agents/comparator.md` 判定、`agents/analyzer.md` 分析赢在哪。文档说多数用户用不到，人审循环通常就够。
- **防过拟合**：避免 "fiddly overfitty changes, or oppressively constrictive MUSTs"；解释原因而不是下死命令；全大写的 ALWAYS/NEVER 是警示信号。
- **分析断言质量**：留意 "assertions that always pass regardless of skill (non-discriminating)"。
- **基础模型已经能过的 eval** 说明 skill 的那部分技巧可能不再需要。这对本仓库很重要：模型升级后要重跑基线，删掉已无增益的规则。

已知局限 [摘要]：社区反馈弱断言会让结果失真；优化循环直接调 API，每轮都有费用。

### 4.2 Hamel Husain 的 "Critique Shadowing" [摘要]

来源：[Creating a LLM-as-a-Judge That Drives Business Results](https://hamel.dev/blog/posts/llm-judge/)、[Simon Willison 的摘要](https://simonwillison.net/2024/Oct/30/llm-as-a-judge/)、[Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/evals)

- 找**一位**领域专家（一位比多位好，为的是标准一致）。
- 不用 1–5 分，用**通过/不通过**，并写一段批评说明理由。
- 批评要详细到可以直接放进 LLM 评委的 few-shot 提示里。
- 迭代评委提示，直到它与专家的判定一致；用留出数据检查，分别看真阳性率和真阴性率。
- 先做错误分析（开放式记笔记，再归类成主题），**评分标准是错误分析的产出，而不是前提**。

这套方法与"一个有品味的非设计师做验证者"的设定几乎完全吻合。

### 4.3 自动优化（DSPy / GEPA）[摘要]

来源：[GEPA 仓库](https://github.com/gepa-ai/gepa)、[gskill 博文](https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents)

- GEPA 的 `optimize_anything` 可以优化任意文本产物，包括 skill；评估器返回分数加诊断文字。
- `gskill` 在编程任务上的报告：Jinja 仓库基线 55% → 带学到的 skill 82%。
- **没有找到**用人类两两偏好作为反馈信号的文档；其反馈形式是标量分数加诊断文本。作者自己也说非软件工程任务还有待探索。

**判断 [推断]**：现阶段不建议上自动优化。它需要一个可信的自动评分器，而 §3.3 表明审美维度上这个评分器还不存在；用不可靠的评委做优化目标，会把 skill 优化到"讨好评委"。等积累了几十条你的两两判断、并验证过评委与你的一致率之后再考虑。

### 4.4 把偏好沉淀为持久资产的几种形式 [推断]

按"每条反馈的信息量"从高到低：

1. **金标准样例库**：你明确认可的产出，连同"好在哪"的一句话。既是生成时的参考，也是评审者的 few-shot 校准集。
2. **反例库**：你否决的产出，连同"坏在哪"。Anthropic 的校准做法需要高分和低分两端的示例。
3. **成文原则**：从多次反馈中归纳出的规则，附带原因。只在同类问题出现**两次以上**时才写成规则，避免为单个样例过拟合。
4. **确定性检查**：能机械判定的规则下沉为脚本，不再占用 skill 的篇幅和你的注意力。

---

## 5. 什么最有效：证据盘点

**坦白说，没有找到在"视觉质量"上对比"示例 / 规则 / 组件库 / 批评循环"的严格消融。** 现有证据如下：

| 手段 | 证据 | 强度 |
|---|---|---|
| 文字规则与反模式清单 | Anthropic [前端 skill 博文](https://claude.com/blog/improving-frontend-design-through-skills) [已核实]：约 400 token 的提示就明显改变产出；但全文无任何量化评估，只有前后截图。文中还承认模型会收敛到新的常见选择："You still tend to converge on common choices (Space Grotesk, for example) across generations." | 弱（仅演示），且有"换一种 slop"的副作用 |
| 指定具体美学或主题 | 同上：点名一种风格能得到统一的外观 | 弱（仅演示） |
| 更丰富的工具栈（React + Tailwind + shadcn/ui） | 同上的 web-artifacts-builder：作者的"假设"，以两组对比图支持 | 弱 |
| 独立评审循环 | Anthropic harness 文 [已核实]：多轮后质量明显提升，出现过单次生成做不到的跃迁；代价是 20 倍以上的成本，且随模型进步收益下降 | 中（一手定性报告加成本数据，无对照统计） |
| few-shot 校准评审者 | 同上：对齐作者偏好、减少漂移 | 中（定性） |
| 个性化少量样本 | DesignPref [摘要]：单人少量标注胜过 20 倍聚合数据 | 中（论文，但对象是评估模型而非生成） |
| 结构化参考（设计稿结构、截图） | [VISTA](https://arxiv.org/abs/2605.26144) [摘要]：从纯文字到加入截图和 Figma 结构，视觉保真度上升。但度量的是"还原度"不是"审美" | 中，间接相关 |
| 自动学习 skill | GEPA gskill 55% → 82% [摘要]，编程任务 | 对设计任务无证据 |
| 确定性检测 | impeccable [已核实]：无量化评估 | 无数据 |

**我的排序 [推断]**，按预期收益除以成本：

1. **组件库加设计 token**：把"好看"从生成时的决策变成默认值，方差最小。
2. **确定性检查**：近乎免费，挡掉破损。
3. **你认可的参考样例（截图加代码）**：比抽象规则传递的信息多，也最能体现你的个人品味。
4. **一次截图自查**：成本低，能抓到渲染后才看得见的问题。
5. **成文规则与反模式清单**：有效，但容易膨胀，且会催生新的套路。
6. **多轮独立评审循环**：效果最强但最贵，留给复杂产出。

这个排序正是评估体系要去验证的假设。**建议把它当作第一批消融实验的题目**（见 §6.6），而不是当作结论。

---

## 6. 给本仓库的具体评估设计

设计目标：**你每轮只花 5–10 分钟**，只做机器做不了的事（判断哪个更好、说出哪里不对）；其余全部自动化。

### 6.1 目录结构

```
evals/
  prompts.json            # 基准题集
  fixtures/               # 每题固定的输入数据（CSV、OpenAPI、大纲等）
  checks/run-checks.mjs   # 确定性检查，输出 checks.json
  rubric.md               # 自评与评审用的评分标准
  calibration/            # 你标注过的高分/低分样例，供评审者 few-shot
  runs/<日期>-<变体A>-vs-<变体B>/
    <题目id>/{A,B}/index.html, shot-1440.png, shot-375.png, checks.json
    review.html           # 盲审页面
    votes.json            # 你的投票与批注
  LEDGER.md               # 每轮结论：改了什么、胜率、沉淀了哪些规则
gallery/
  golden/                 # 你认可的样例
  rejected/               # 你否决的样例及原因
```

### 6.2 基准题集（16 题，四类各 4 题）

每类的四题按同一思路取：一道常规题、一道内容密集题、一道内容稀少题、一道带刁难条件的题。**内容必须固定**（放在 `fixtures/`），否则比较的是文案而不是设计。prompt 用普通用户的口吻写，不带任何设计指示，这样才能测出 skill 的增益。

**A. 数据可视化**

| id | prompt 概要 | 考察点 |
|---|---|---|
| viz-1 | 根据 `sales.csv`（12 个月 × 4 条产品线）做一页销售趋势图表 | 常规多系列折线，图例与配色 |
| viz-2 | 根据 `survey.csv`（18 个问题的李克特量表结果）做可视化 | 密集；图表类型选择，小多图 |
| viz-3 | 只有三个数字（本季营收、同比、目标完成率），做一张展示 | 稀少；克制，不堆装饰 |
| viz-4 | `latency.csv` 含极端离群值和 35 字符长的类别名，做对比图 | 刁难；标签溢出，坐标轴处理 |

**B. 报告**

| id | prompt 概要 | 考察点 |
|---|---|---|
| rep-1 | 把 `incident.md`（约 800 字事故复盘）做成 HTML 报告 | 常规；层级，行长，时间线 |
| rep-2 | 把 `benchmark.md`（3 张大表、6 张图的占位数据、2000 字）做成技术报告 | 密集；表格排版，图文节奏 |
| rep-3 | 把一段 150 字的周报做成一页 | 稀少；不靠填充撑版面 |
| rep-4 | 中英混排、含代码块、脚注和一张 14 列宽表的研究摘要 | 刁难；宽表，混排字体，窄屏 |

**C. API 文档**

| id | prompt 概要 | 考察点 |
|---|---|---|
| api-1 | 根据 `petstore.yaml`（8 个端点）生成 API 文档页 | 常规；导航，代码块，参数表 |
| api-2 | 根据 `large.yaml`（40 个端点、嵌套 schema）生成文档 | 密集；信息架构，可扫读性 |
| api-3 | 只有一个函数签名和三行说明，写一页 SDK 快速上手 | 稀少 |
| api-4 | 含很长的 URL、深层嵌套 JSON 示例和多语言代码切换 | 刁难；代码溢出，标签页 |

**D. 幻灯片**

| id | prompt 概要 | 考察点 |
|---|---|---|
| deck-1 | 根据 `outline.md` 做 8 页产品介绍幻灯片 | 常规；版式变化，节奏 |
| deck-2 | 一份数据很多的季度回顾，10 页，每页都有图表或表格 | 密集；单页信息量控制 |
| deck-3 | 一场 5 分钟闪电演讲，5 页，每页一句话 | 稀少；大字排版 |
| deck-4 | 某页必须放下一段 120 字的引文加一张 6 行表格 | 刁难；固定画布内不溢出 |

说明：

- 后续加"网站"类别时照同样四种取法追加。
- **保留 4 题作为留出集**（每类 1 题），平时迭代不看它们，只在准备发布新版本 skill 时跑一次，用来发现过拟合。
- 每题每个变体默认生成 1 份。若某次结论接近五五开，再各生成 3 份看方差。

### 6.3 自动检查脚本清单

单一入口 `node evals/checks/run-checks.mjs <html路径>`，用 Playwright 在 1440×900 和 375×812 下各跑一次（幻灯片用固定的 1920×1080，逐页检查），输出 `checks.json` 和截图。

**硬性失败（任一命中即判该产出"破损"，不进入人审，直接退回重生成）**

1. `console-errors`：存在 `pageerror` 或资源加载失败。
2. `page-overflow-x`：页面出现横向滚动。
3. `slide-overflow`：幻灯片内任一元素超出画布，或页面内容高度超过画布。
4. `text-clipped`：文本元素 `scrollWidth/Height` 超过 `client` 尺寸 1px 以上，且 `overflow` 不是 `visible`。
5. `text-overlap`：两个无祖先关系的文本元素 rect 相交面积超过较小者的 10%。
6. `broken-image`：`naturalWidth === 0`。
7. `font-fallback`：声明的首选字体未加载成功。
8. `contrast-fail`：正文文字 WCAG 对比度低于 4.5:1（大字 3:1）。直接用 axe-core 的 `color-contrast` 规则；axe 判定不了的记为警告。
9. `chart-label-collision`（仅可视化）：SVG `<text>` 元素之间 rect 相交。

**警告（写入报告，交给评审者和你参考，不自动判负）**

10. `font-families > 2`。
11. `font-sizes > 6` 个不同档位。
12. `colors > 8`（按色差聚类后，不计图表的数据色）。
13. `spacing-off-scale`：超过 20% 的间距值不是 4 的倍数。
14. `radius-kinds > 3`、`shadow-kinds > 3`。
15. `tiny-text`：存在小于 12px 的正文。
16. `long-lines`：正文行长超过约 90 个西文字符或 45 个汉字。
17. `raw-hex`：样式中出现未走 CSS 变量的色值（组件库落地后启用）。
18. `slop-patterns`：命中下列任一项即列出——首选字体是 Inter / Roboto / Arial / system-ui；紫到蓝或紫到粉的渐变；渐变文字（`background-clip: text`）；`backdrop-filter` 玻璃拟态；卡片内嵌套卡片；emoji 充当图标；每个区块都带入场动画。可直接调用 `npx impeccable detect --json` 并合并结果。
19. `apca-low`：APCA 参考分偏低（仅提示）。

**先实现 1–8 和 18**，这九项覆盖了绝大多数"一眼就坏"的情况。其余按你在人审中实际反复看到的问题再加。

溢出与重叠检查的核心大致如下（示意，未实测）：

```js
// 在 page.evaluate 中运行
const TOL = 1;
const els = [...document.querySelectorAll('body *')].filter(e => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
});
const clipped = els.filter(e => {
  const s = getComputedStyle(e);
  const clips = s.overflowX !== 'visible' || s.overflowY !== 'visible';
  return clips && (e.scrollWidth > e.clientWidth + TOL || e.scrollHeight > e.clientHeight + TOL);
});
const pageOverflowX = document.documentElement.scrollWidth > window.innerWidth + TOL;
// 重叠：只取直接包含文本的叶子元素，两两比较 rect，跳过互为祖先/后代的组合
```

### 6.4 自评与评审用的评分标准（草案）

用法分两处：

- **生成时自查**（skill 内）：只做第一部分，一次，不循环。
- **独立评审**（评估时，由不看生成过程的 subagent 执行）：三部分都做，并附 `calibration/` 中的示例。

评审者的输入只有：原始 prompt、截图（桌面和窄屏）、`checks.json`。**不给生成过程，不告知用了哪个版本的 skill。**

**第一部分：通过/不通过门槛（任一不通过即为不通过，须写明位置）**

- G1 没有任何内容被截断、重叠或溢出（对照截图与 `checks.json`）。
- G2 三秒内能看出这页是什么、最重要的信息是哪一条。
- G3 所有文字在其背景上清晰可读。
- G4 窄屏下内容可用，没有横向滚动。
- G5 没有占位符、乱码、虚构的装饰性数据或与内容无关的图标。

**第二部分：五个维度，每项 1–4 分，每项必须引用截图中的具体证据**

| 维度 | 4 分的样子 | 1 分的样子 |
|---|---|---|
| **层级与聚焦** | 视线路径明确；主次有三层以内的清晰区分；每屏只有一个重点 | 所有东西一样大一样重；重点靠加粗和颜色到处喊 |
| **排版** | 字号档位少而有对比；行长行距舒适；数字对齐；中西文混排协调 | 字号杂乱；行过长或过挤；默认字体未经任何处理 |
| **间距与对齐** | 间距有明确的刻度和节奏；相关的靠近、无关的分开；边缘对齐 | 间距随意；元素拥挤或漂浮；对齐线混乱 |
| **色彩** | 一个主色加克制的强调色；颜色有语义；中性色占多数 | 多种饱和色并存；渐变和阴影充当装饰；颜色无含义 |
| **针对性** | 视觉选择明显出自这份内容和这个读者；换一个不相干的主题就不成立 | 可以原样套给任何产品的模板感（借自 impeccable 的 Design Specificity Verdict） |

按产出类型追加一项：

- **可视化**：图表类型是否匹配数据关系；是否直接标注而非依赖图例；墨水是否都在表达数据。
- **报告**：能否只读标题和首句就掌握要点；表格是否易于横向比较。
- **API 文档**：能否在十秒内找到某个端点及其参数；代码示例是否可直接复制。
- **幻灯片**：每页是否只讲一件事；各页版式是否有变化又保持统一；后排能否看清。

权重：沿用 Anthropic 的思路，**"针对性"和"层级与聚焦"权重加倍**，因为模型默认在排版、间距的基本功上已经不差，平庸出在这两项。这个权重是起点，按你的实际否决理由调整。

**第三部分：问题清单**

- 最多列 5 条，按 P0（破损）/ P1（明显影响阅读或观感）/ P2（打磨）分级。
- 每条写"在哪、是什么、为什么是问题"，不直接给代码改法。
- 必须先写一条"哪里做得好"，避免评审者为挑错而挑错。
- **只有 P0 和 P1 触发修改**；修改最多一轮。

**给评审者的固定指示**

- 你不是作者。默认立场是怀疑：平庸的作品应得 2 分，不是 3 分。
- 列出的问题不得在结论中被淡化；若认为不重要，就不要列。
- 不确定时写"不确定"，不要补全一个判断。

### 6.5 人工 A/B 盲审流程（每轮 5–10 分钟）

**一轮只验证一个改动。** 例如"加入组件库 vs 不加"、"规则写法甲 vs 乙"、"带参考样例 vs 不带"。

**准备（全自动，由 agent 执行）**

1. 两个变体各自对 12 道日常题生成产出（留出的 4 题不跑）。
2. 跑确定性检查。命中硬性失败的重生成一次；仍失败则保留并标记"破损"，该题直接判对方胜，不占用你的时间。
3. 可选：VLM 评审者做两两预判，按 ABBA 两种顺序各判一次，不一致记为"无法判定"。**预判结果不展示给你**，只用于事后计算评委与你的一致率。
4. 生成 `review.html`：每题一屏，左右并排两张截图，**左右随机、不显示变体名**，可点击打开实际页面。

**你的操作（每题约 20–30 秒）**

- 按键投票：`←` 左边好、`→` 右边好、`↓` 差不多、`x` 两个都不行。
- 可选：勾选原因标签（层级 / 排版 / 间距 / 色彩 / 模板感 / 内容处理 / 破损），或写一句话。**只在你有明确感受时才写。**
- 可选：给特别好的打星（进 `gallery/golden/`），给特别差的打叉（进 `gallery/rejected/`）。

投票存为 `votes.json`。按 skill-creator 的约定，没写批注表示没意见。

**判定规则**

- 去掉"差不多"之后看胜场。12 题中一方赢 **10 题及以上**才算显著（双侧符号检验 p≈0.039）；9 比 3 的 p≈0.146，不足以下结论。
- 没达到显著：**默认保留更简单的那个变体**。这是防止 skill 无限膨胀的关键纪律。
- "两个都不行"达到 3 题以上：说明问题不在这次改动上，回到错误分析。
- 题目少的时候不要用 Elo。Elo 和 Bradley-Terry 适合多个变体长期循环比较；两个变体、十几道题，胜场加符号检验更诚实。

**每轮之后的沉淀（agent 执行，你过目）**

1. 把你的批注按主题归类（即 Hamel 所说的错误分析），写入 `LEDGER.md`。
2. 同一类问题**跨题出现两次以上**才转化为资产，并按下面的顺序优先选靠前的形式：
   - 能机械判定 → 加一条确定性检查。
   - 能由组件或 token 解决 → 改组件库的默认值。
   - 需要判断力 → 加一个正例和一个反例到样例库。
   - 以上都不行 → 才写成一条带原因的规则。
3. 把打星和打叉的样例连同你的一句话存入 `gallery/`，并同步到 `calibration/` 供评审者做 few-shot。
4. 计算 VLM 预判与你的一致率，记入 `LEDGER.md`。**一致率稳定超过约 85% 之前，VLM 评委不得替代你做决定**；达到之后，可以让它先筛掉它有把握的题，只把分歧题交给你，把每轮时间进一步压缩。（85% 是我给的经验阈值，属 [推断]。）
5. 每隔几轮以及每次基础模型升级后，跑一次"当前 skill vs 无 skill"和留出题，确认增益还在、没有过拟合，并删掉已不产生增益的规则。

### 6.6 建议的前几轮实验

按 §5 的假设排序，每轮一个问题：

1. **基线轮**：无 skill vs Anthropic 官方 `frontend-design` skill。目的不是比输赢，而是让你看一遍 24 份产出、做一次开放式批注，得到第一份"你在意什么"的清单。评分标准应当由这一轮修订，而不是照搬 §6.4。
2. **组件库轮**：有组件库和 token vs 仅文字规则。
3. **样例轮**：带 3 个你认可的参考样例 vs 不带。
4. **自查轮**：生成后做一次截图自查 vs 不做。同时记录耗时和 token，算性价比。
5. **评审循环轮**：一次自查 vs 独立评审者循环两轮。预期只在幻灯片和未来的网站类别上有明显收益。

每轮结论连同胜场数写进 `LEDGER.md`。几轮之后，这份台账本身就是目前公开资料里缺少的那种消融证据。

---

## 7. 未能核实或需要注意的事项

- `arxiv.org` 与 `designarena.ai` 在本次会话中无法访问。§3 中所有论文的数字均来自搜索摘要，**引用前请核对原文**。如需我直接读原文，需要在会话的网络设置中放行这两个域名。
- MLLM as a UI Judge 与 WebDevJudge 的具体一致率数字未取得。
- UICrit 的 "55%" 提升未能核实。
- Design Arena 的品类划分、投票量未能核实；其利益冲突问题来自第三方分析。
- ArtifactsBench 的 94.4% 是模型排名层面与 WebDev Arena 的一致性，不是逐样本与人的一致率；论文自身的表述在不同位置不完全一致 [摘要]。
- axe-core 对渐变和图片背景的处理、stylelint token 插件的行为，来自我的既有知识，本次未核实。
- §6.3 的脚本是示意，未运行过。阈值（重叠 10%、颜色 8 种、间距 20% 等）是起点，需要按实际误报情况调整。
- impeccable 的规则数在不同来源不一致（仓库 README 为 62，某镜像为 25），以仓库为准。
- 未找到任何针对"规则 vs 示例 vs 组件库 vs 批评循环"在视觉质量上的对照消融；§5 的排序是我的推断。
