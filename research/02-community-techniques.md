# 02 · 社区经验：怎样让 LLM / 编码 Agent 做出不"AI 味"的设计

> 调研日期：2026-11-22。角度：X/Twitter、Reddit、Hacker News、博客、中文社区里的从业者经验。
> 打包好的 skill / system prompt、组件库、截图评估工具由其他调研文档深入覆盖，这里只在它们是"某条经验的出处"时提及。

## 0. 先说明：哪些我核实过，哪些没有

本次会话的网络只放行了 GitHub raw 和 claude.com。X、Hacker News、Reddit、dev.to、个人博客、知乎/少数派/公众号**全部无法直接打开**，只能通过搜索引擎的摘要间接获取。因此每条来源都带一个标记：

| 标记 | 含义 |
|---|---|
| **[一手]** | 我直接读到了原文（GitHub 仓库文件、claude.com 官方博客） |
| **[摘要]** | 只看到了搜索引擎对该页面的摘要/片段，原文未打开；引文措辞可能与原文有出入 |
| **[转述]** | 原帖（多为 X 推文或 HN/Reddit 评论）没看到，是别的文章或仓库转述的 |

需要特别说明的缺口：

- **Reddit 原帖一条都没拿到**。Reddit 上的结论全部来自一份对 Reddit 的数据挖掘（§1.2），不是我逐帖读的。
- **歸藏、宝玉本人关于"前端去 AI 味"的原创长文没有搜到**。歸藏能核实的是他的 PPT skill 源文件（一手）；宝玉能确认的只是他翻译了 Anthropic 那篇博客（摘要）。
- 小红书、即刻、微信公众号基本搜不到可引用的内容。
- 想补全的话，需要在会话网络设置里放行 `news.ycombinator.com`、`reddit.com`、`x.com`、`adriankrebs.ch`、`world.hey.com`、`posthog.com`、`dev.to`、`zhuanlan.zhihu.com` 等域名后重跑。

---

## ★ 成因分析：为什么 AI 做的设计"像 AI 做的"、"用着别扭"、"看着不干净"（优先阅读）

这三个问题常被混在"AI slop"一个词里，但社区给出的成因并不相同，对应的修法也不同。下面分开整理。编号 A/B/C 在最后的对照表里复用。

一个贯穿三者的总纲，来自 Signs of AI design [一手]（<https://github.com/febbhav/signs-of-ai-design>）："Judge the absence of decisions, not the presence of a style … The tell is not that Inter is a bad typeface. The tell is Inter, unchosen, next to twenty other unchosen defaults." 三类问题的共同根源都是**某个本该有人做的决定没有人做**，区别在于缺的是哪一种决定：风格决定（A）、使用场景决定（B）、还是主次与一致性决定（C）。

### A. 为什么"一眼像 AI"

**A1. 分布收敛：模型输出的是训练数据的中位数。**
- Anthropic [一手]："Distributional convergence. During sampling, models predict tokens based on statistical patterns in training data. Safe design choices–those that work universally and offend no one–dominate web training data. Without direction, Claude samples from this high-probability center."（<https://claude.com/blog/improving-frontend-design-through-skills>）
- avoid-ai-design catalog [一手]："A model trained on a decade of Tailwind tutorials, shadcn starters, and GitHub snippets regresses to the visual median of that corpus. It does not choose indigo; indigo is the average."
- Reddit 帖子里的说法 [转述，原帖未见]：模型默认"tries not to offend anybody, so it picks the most generic choices possible"。

**A2. 生成工具共用一条很窄的工具链，工具链的默认值被复制了几百万次。**
- Signs of AI design [一手]："the generators share a narrow toolchain: Tailwind CSS, shadcn/ui, Lucide icons, Framer Motion."
- 具体传导路径 [一手]：Lucide 随 shadcn 自带，所以图标都一样；"Geist … is v0's default because it is Vercel's typeface, so it saturates v0 output"；Inter 是 Next.js / Vercel 示例里的字体 [摘要]。
- 靛蓝紫的来历：Tailwind UI 当年把按钮默认做成 `bg-indigo-500`（Adam Wathan 2025 年 8 月的玩笑式道歉，[转述]）。
- Reddit 数据佐证 [一手]：具体特征里被提到最多的正是"shadcn/Tailwind 默认套件"，排在紫色之前（见 §1.2）。

**A3. 反馈循环。** AI 生成的紫色网站上线后进入下一轮训练数据，分布继续向同一方向偏 [摘要，多篇博客；合理但没有对照研究]。

**A4. "逃离默认值"的指令本身又收敛。** 大家用同一批 skill、同一份禁用清单、同一份推荐字体名单，模型就集体滑到下一个引力井（奶油底 + 衬线 + 赤陶）。Bakaus [摘要]：模型"overfitted to their own stylistic gravity wells"，每禁一项就换到另一组默认选择。deslop [一手]："swapping Inter for one of these became so universal that the swap itself is now the tell." 详见 §1.1。

**A5. 没有具体的品牌和主题输入，只能给出"不带任何信息"的设计。**
- 花叔 [摘要]：紫渐变、emoji 图标、左边框卡片"之所以是 slop，不是因为它们本身丑，而是因为它们是 AI 默认模式下的产物，不携带任何品牌信息"。
- Kosta Canatselis [摘要]："Slop is design with no author."
- MindStudio [摘要]：不指定 token 时模型会隐式生成一套，"That implicit set is where the generic aesthetics live."

**A6. 相似性主要住在页面结构里，换皮没用。** catalog 对"千篇一律的区块顺序"的解释 [一手]："The architecture is where most of the sameness lives. Color and font fixes never touch it, which is why a re-skinned page still reads as generated." 这解释了为什么只改配色和字体之后页面仍然像 AI 做的。

**A7. 文案和数据也是中位数。** 模型因为"中位数页面有一个"而生成信任条、logo 墙、统计数字，哪怕这些关系并不存在 [一手：Signs of AI design，"Generators emit the trust bar because the median page has one; some shipped pages carry fully hallucinated logo sets"]。

### B. 为什么"用着别扭"

**B1. 只为演示的"快乐路径"生成，状态被跳过。**
- Kosta Canatselis [摘要]："AI-built screens optimise for the demo, and the demo always has data."
- catalog [一手]："The polish gap. Generated UI renders the happy path and skips the states a craftsperson would build. Missing focus is also an accessibility defect."
- 多篇博客 [摘要]：最常缺的是 loading、error、empty、hover、focus；而且这个问题**在截图里看不出来**，所以评审时会漏过（<https://foundey.com/blog/ai-slop-in-ux-design>）。

**B2. 模型写代码时看不到渲染结果，更看不到运行中的交互。**
- Signs of AI design 对动效不协调的解释 [一手]："tutorials teach effects in isolation, and the model never sees its output run."
- HN 评论 [摘要]：模型"usually can't 'see' the results of the UI changes"，贴截图才能校准。
- 后果包括：文字溢出、图片撑破、标题一字一行、内容压到页码区。歸藏的 checklist 里 P0 项全是这一类 [一手]，他的修法是写脚本量溢出像素、等动画稳定后再截图。

**B3. 动效是"撒上去的"，不是为某个状态变化设计的。**
- catalog [一手]："Motion sprinkled on rather than designed."
- Emil Kowalski [一手]：agent 经常选错动画配料，例如进场动画该用 `ease-out` 却用 `ease-in`，"All these small things compound."
- Laith0003 [一手]：常规操作用了 600ms 动画；每个元素滚动时都淡入；永不停止的脉冲点。修法是"Motion serves meaning: state change, transition, attention."

**B4. 装饰件冒充功能件，传达了并不存在的状态或顺序。**
- catalog [一手]：状态标签"signal 'app-like' without carrying state"；脉冲圆点"signals activity the page does not have"；01/02/03 编号"imitates rigor"，因为"Numbering encodes order"。
- 假窗口装饰、假终端 hero 同理。
- **"点了没反应的假按钮/假控件"**：这是协调方举的例子，我**没有找到点名这一条并给出成因的来源**。它在逻辑上属于 B1 + B4（为截图生成、控件只是视觉填充），但这是我的推断，不是引用。

**B5. 没有按任务排优先级，信息架构是模板的而不是内容的。**
- Kosta [摘要]："layouts that show everything, all at once."
- PostHog 的第一步 [摘要]：先用一句话写清用户的 "job to be done"，后面所有设计由它决定。说明默认情况下这一步是缺的。
- 中文教程的提示词模板 [摘要] 同样把"目标用户、核心任务、页面清单、必须覆盖的状态"放在视觉约束之前，并主张"少堆形容词、先写任务和规则再补风格"。
- 移动端"是把桌面版拉窄，没有重排层级" [摘要]（<https://wikivibe.ru/en/vibe-design/ux-i-interfeisy/ai-ui-vs-human-ui-gde-granitsa/>）。

**B6. 逐屏、逐次生成，屏与屏之间对不上。** "登录页和仪表盘不匹配" [摘要]（<https://uxmagic.ai/blog/single-screen-ai-design-dead-end>）。成因见 C4。

**B7. 可访问性默认值差。** Bakaus 的统计 [摘要]：90% 以上的生成页面不满足对比度下限；另有删掉 focus outline 不补、hover-only 交互在触屏上失效、不尊重 `prefers-reduced-motion` [一手：Laith0003、deslop]。

### C. 为什么"看着不干净"

**C1. 用容器和装饰代替层级决定。** 这是被引用最多的一条。
- Signs of AI design [一手]："Every content block boxed, then boxes nested inside boxes, because containment feels organized and avoids real hierarchy decisions."
- catalog [一手]：卡片套卡片是 "Containers standing in for hierarchy"；标题里单独强调一个词是 "the instant-emphasis move of a page with no real type hierarchy"；单字族单字重是 "No hierarchy decision was made"。

**C2. 过度添加：每个"看起来像设计"的零件都被加到每个地方。**
- catalog 对 eyebrow、中点元信息、等宽小标签、箭头的解释 [一手]："Every piece reads as 'designed,' so models add them everywhere."
- Laith0003 [一手]："The AI default is more — more gradients, more glow, more shadow, more motion, more emoji. Restraint is harder to fake and reads as confidence." 修法是每页只选 2–4 个效果。
- 花叔转述的 Claude Design 提示词 [摘要，未核实原文]：不要添加用户没要求的内容，添加的元素会损害设计时要反驳。

**C3. 所有东西权重相同，所以没有东西领头。**
- 间距 [一手：catalog]："Even spacing makes a flat hierarchy. Nothing is emphasized because everything breathes the same."
- 颜色 [一手：catalog]："AI spreads color evenly and avoids commitment. Intentional brands do the opposite: one dominant color carries the page, an accent punctuates it." Signs of AI design 补充了原因：鲜明的配色"statistically rare in the median of training data"。
- 圆角与内边距 [摘要]：所有东西都是同一个 16px 圆角和 24px 内边距时页面就平了，"Nothing leads your eye because everything is shouting at the same volume"（<https://smoothui.dev/blog/ai-design-slop>）。
- 字重 [一手：Anthropic]：默认是 400 对 600 这种弱对比，所以他们要求 "100/200 weight vs 800/900 … Size jumps of 3x+, not 1.5x"。

**C4. 模型没有记忆也拿不到你的真实 token，每次重新生成都从中位数重建。**
- catalog [一手]："Slop is *convergence*: every site looks the same. Drift is *divergence from your own system* … A model has no memory of your design and no access to your real tokens, so a page regenerated from scratch (a new prompt, a fresh chat, 'now build the FAQ') is reconstructed from the training median instead of from your site."
- 具体表现 [摘要]：模型会"优化"数值，16px 回来变成 15px 或 17px；用近似的 Tailwind 工具类代替规定间距；分多次 prompt 生成的组件之间漂移累积（<https://overlayqa.com/blog/vibe-coding-problems/>，<https://techblog.geekyants.com/your-vibe-code-has-no-memory-design-md-fixes-that>）。
- 反例提醒 [摘要]：有人发现模型"看到了 token，做出来看着对，其实是错的"，以及只存在于 Figma、不在代码里的设计系统挡不住漂移。

**C5. 代码层的草率直接显示在画面上。** 颜色和间距是散落的字面值而不是 token、`transition: all`、z-index 军备竞赛、声明了却没加载的字体（"declaring is not shipping"）[一手：deslop、catalog]。

**C6. 没有视觉反馈（同 B2）。** 对齐偏差、溢出、拥挤这些"不干净"的直接来源，写代码时都看不见。

### 另一种视角：不是没品位，是没约束

realfast 的文章标题就是论点 [摘要]："AI doesn't have bad taste. It's just missing constraints." 同一个 prompt 加上 token 系统、组件库、关于间距/圆角/交互状态的硬规则，就能得到一致的设计（<https://www.realfast.ai/blog/ai-doesnt-have-bad-taste>）。这和 Bakaus、Emil Kowalski 的"agent 没有好品位、最后 5–20% 做不了"并不矛盾：约束能解决 B 和 C 的大部分，A 的最后一段（真正有辨识度）仍然要靠人给方向。

### 成因 → 修法对照

| 成因 | 属于 | 对应修法 | 修法出处 | 备注 |
|---|---|---|---|---|
| A1 分布收敛 | 像 AI | 给出明确的美学方向；把审美翻译成字体/动效/背景/主题这些代码维度 | §2.1、§2.3 | 只说"别用 X"不够，见 A4 |
| A2 工具链默认值 | 像 AI | 先定 token 并改掉 shadcn 默认主题；自选图标集和字体 | §2.5、§2.2 | 外行最容易认出的一项，优先处理 |
| A4 逃逸也收敛 | 像 AI | 从主题本身推导配色和字体；检测规则按组合触发；清单要定期更新 | §2.3、§1.4、§3.1 | 推荐字体名单会过期 |
| A5 无品牌输入 | 像 AI | 参考驱动（截图、DESIGN.md、已有代码库）；开工前提问 | §2.4、§2.6 | |
| A6 结构同质 | 像 AI | 换版式而不只是换皮；提供多种版式骨架；围绕一个中心意象建页 | §2.3、§2.6 | 改色改字解决不了 |
| A7 中位数文案与假数据 | 像 AI | 给真实内容；没有就诚实占位 | §2.7 | |
| B1 只做快乐路径 | 别扭 | 把状态（空/加载/错误/hover/focus/禁用）写成必做清单；缺状态时停下来问 | §2.4、§2.8 | 截图评审查不出来，必须靠清单或代码检查 |
| B2 / C6 看不到渲染结果 | 别扭 + 不干净 | 截图反馈循环；溢出测量脚本；等动画稳定再截图 | §2.4、§2.6 | 对静态版式有效，对交互流程帮助有限 |
| B3 动效是撒上去的 | 别扭 | 动效只服务状态变化；每页一个有语义的动效；写明缓动与时长规则 | §2.6、§2.10 | |
| B4 装饰冒充功能 | 别扭 | 规则：编号只用于真有顺序的内容，标签必须携带信息，状态点必须对应真实状态 | §1.3、§1.4 | |
| B5 无任务优先级 | 别扭 | 先写一句话的 job to be done；提示词先写任务和内容再写风格 | §2.5、§2.6 | |
| B6 / C4 无记忆导致漂移 | 别扭 + 不干净 | DESIGN.md / token 写进代码并每次加载；模板是唯一类名来源；事后校验是否真用了 | §2.5、§2.6 | 只有 token 不够，还要校验 |
| B7 可访问性默认值差 | 别扭 | 确定性检查：对比度、focus、reduced-motion | §2.8 | 可完全自动化 |
| C1 容器代替层级 | 不干净 | 禁止卡片套卡片；卡片只用于真正的分组；用字号、字重、留白表达层级 | §1.3、§2.2 | |
| C2 过度添加 | 不干净 | 每页限定效果数量；"不添加未被要求的内容"；内容放不下先删文案或拆页 | §2.6、§2.7 | |
| C3 一切等权重 | 不干净 | 极端的字重和字号对比；一个主色加一个强调色；区块间距随重要性变化 | §2.2、§2.1 | |
| C5 代码层草率 | 不干净 | lint 式确定性扫描并挂到 hook | §2.8 | |

**读这张表的三个结论：**

1. **"像 AI"和另外两个问题可以分开治。** 一个页面可以完全避开 AI 特征却仍然别扭、杂乱（catalog 对漂移的原话："a product can dodge the clichés and still fall apart across pages"）；反过来，紫色渐变的页面也可以很好用。社区的注意力大多在 A 上，但对非设计师用户，B 和 C 往往更影响实际观感。
2. **B 和 C 的大部分成因可以用硬约束和确定性检查解决**（token、模板、状态清单、对比度与溢出检查）。A 不行，A 需要每次有一个来自内容的方向输入。
3. **截图反馈只覆盖一部分。** 它能发现溢出、对齐、拥挤（C6、部分 B2），发现不了缺失状态（B1）、失效交互和信息架构问题（B5）。这些需要清单或代码层检查。

---

## 1. "AI 味"的具体特征清单

### 1.1 最重要的一个认识：AI 味有"两代"，第三代正在形成

这是 2026 年社区里最有价值的共识，直接影响我们怎么写 skill。

**第一代（2024–25）：训练数据的中位数。** 紫/靛蓝渐变、全站 Inter、居中 hero 加三张图标卡片、原封不动的 shadcn。

**第二代（2026）："有品位的逃逸"也收敛了。** 大家都学会禁紫色之后，模型逃到了另一套同样千篇一律的默认值。avoid-ai-design 的 catalog 这样概括 Anthropic `frontend-design` skill 现在自己点名的五个聚类 [一手：catalog 原文；它对 Anthropic skill 的引述我未逐字比对]（<https://github.com/funboy322/avoid-ai-design/blob/main/references/ai-tells-catalog.md>）：

1. 暖奶油底 + 高对比衬线 + 赤陶/陶土色强调（`#F4F1EA` + `#D97757`，后者正是 Claude 自己界面的强调色）
2. 近黑底 + 单一荧光绿或朱红强调，常配等宽字体
3. "大报版式"：发丝线、零圆角、密集报纸分栏
4. SaaS 卡片套件：一模一样的圆角卡、同一个圆角值、同一个柔灰阴影
5. 模板装饰件：加宽字距的全大写 eyebrow 小标、`A · B · C` 中点元信息、`WORD — fragment` 标签、等宽字体小标签、每个链接后面一个 `→`

Paul Bakaus（Impeccable 作者）的说法 [摘要]："Instrument Serif italic headlines on warm beige are not bad design. Today's antidote to slop becomes tomorrow's slop the moment everyone reaches for it."（文章《Impeccable by Design》，<https://x.com/pbakaus/article/2069111016366170524>）。他在播客里称之为 "this beige Claude design where everything is nice serif fonts. It just becomes slop through repetition" [摘要]（<https://www.itshipped.fm/episodes/36>）。他发布 Impeccable 3.5 时给出的数字 [摘要，推文本身未打开]：跨多次生成，**74% 的页面用了奶油色默认背景，76% 用了极端字距，90% 以上不满足对比度下限**（<https://x.com/pbakaus/status/2060208540992880794>）。

Impeccable README 里的对照图很能说明问题 [一手]：同一模型同一 brief，不加 skill 的结果是 "the tasteful default: cream page, thin serif, italic accent, pill buttons"（<https://github.com/pbakaus/impeccable>）。

**厂商也开始点名自己的默认值** [一手：catalog 转述 OpenAI 文档]：OpenAI 的 GPT-5.4/5.5 前端指南让模型避开紫色之外，还要避开 "beige/cream/sand/tan"、"dark blue/slate"、"brown/orange/espresso"、单色相的 one-note 配色、渐变光球和 bokeh、以及把卡片当默认容器（<https://developers.openai.com/api/docs/guides/frontend-prompt>）。

**第三代** [一手：catalog]：设计趋势预测里已经出现"手工感反 AI"（颗粒、手写字、剪贴簿拼贴）。主题撑得起时是正当选择，为了"显得像人做的"而用，就是下一个反射动作。

> 对本项目的含义：**不能靠"禁用清单 + 推荐替代品"解决问题**，替代品会立刻成为新默认。判断标准应该是 catalog 里那句："would you have arrived here for any similar page? If yes, it is a default."

### 1.2 哪些特征真的被普通人认出来（有数据）

J. Carter Johnson 挖了 Reddit [一手：仓库 README 与 CSV]（<https://github.com/JCarterJohnson/vibecoded-design-tells>）：扫描 47 个子版块 3,214,533 帖，其中 46,971 帖相关，再从 125 个典型帖子里抓了 3,033 条评论。按评论提及占比排序：

| 排名 | 特征 | 评论占比 |
|---|---|---|
| 1 | "一眼 AI / 没灵魂 / slop"（整体观感） | 6.4% |
| 2 | "全都长一个样 / 模板感" | 6.1% |
| 3 | shadcn / Tailwind 默认套件 | 2.5% |
| 4 | 紫色（"AI purple"） | 2.3% |
| 5 | 到处渐变 / 渐变文字 | 2.0% |
| 6 | 动画太多 / Framer 式淡入 | 1.1% |
| 7 | 圆角 / 药丸按钮 | 0.8% |
| 8 | 暗色 + 霓虹发光 | 0.7% |
| 9 | 文案里的 emoji（✨🚀） | 0.5% |
| 10 | 通用无衬线（Inter / Geist） | 0.4% |
| 10 | 三栏功能卡 | 0.4% |
| … | 玻璃拟态 0.2%、居中一切 0.2%、bento 0.1% | |

两个要点：

- **最大的抱怨不是某个具体特征，而是"一眼能认出来"**。作者的原话："The loudest complaint is not any single feature. It is that the sites are recognizable on sight."
- **推特上最常被嘲笑的 bento、玻璃拟态、极光渐变排在最底部**，"mesh / blob / aurora 背景"在复核时被判为关键词误报。作者提醒这是"vocal, online opinion"的代理指标，相对顺序比绝对百分比可信。

Adrian Krebs 的 Show HN 研究 [摘要，原文未打开]（<https://www.adriankrebs.ch/blog/design-slop/>）：用无头浏览器对 1,590 个 Show HN 站点跑确定性的 CSS/DOM 检查。4 个以上特征的占 22%（347 个），2–3 个的占 32%（508 个），0–1 个的占 46%（735 个）；10.7% 的站点 CTA 按钮用紫色系。他自称人工抽检误报约 5–10%，并说这些设计 "not really [bad], just uninspired"。模式数量各家转述不一（15 或 16 个）。HN 讨论帖 <https://news.ycombinator.com/item?id=47864393>（235 条评论）[转述]，最常见的反驳是"这只是 Tailwind"和"设计师在 AI 之前就这么干"。

另一个数字 [转述：catalog 引 Build to Launch]：120 个 AI 生成页面里 57 个带 6 个以上特征，只有 20 个带 2 个以下（<https://buildtolaunch.substack.com/p/fix-ai-slop-website-design>）。结论是**看叠加，不看单点**。

### 1.3 完整清单（按类别）

综合自以下一手来源：avoid-ai-design catalog（81 条）、deslop RULES（48 条，<https://github.com/iRehmanAhmad/deslop/blob/main/docs/RULES.md>）、Laith0003 的 Ban List（<https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list>）、febbhav 的 Signs of AI design（<https://github.com/febbhav/signs-of-ai-design>）、Impeccable README。标 ★ 的是多个来源都判为"外行也能认出"的。

**配色与渐变**

- ★ 紫/靛蓝到蓝的对角渐变，典型值 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- ★ 渐变填充的标题文字（`bg-clip-text`）
- 靛蓝/紫色 CTA 按钮；默认蓝色按钮
- "VibeCode purple" 暗色主题；暗色 + 青色/霓虹发光
- 没人要求却给了暗色模式
- 怯懦、均匀分布的配色（没有主次）
- 彩色发光 box-shadow；所有卡片都发光
- 装饰性光球、bokeh、渐变 blob；旋转的彩虹渐变边框
- 所有渐变都是 135°
- 灰色文字放在彩色背景上；弱化文字低于 WCAG AA
- 一个色相假装成两个；单色相 one-note 配色
- 第二代：奶油 + 赤陶；奶油 + 衬线 + 鼠尾草绿；近黑 + 单一荧光绿；祖母绿/青绿作为"逃离紫色"的备胎；深蓝/slate（`#0f172a`）；棕/浓缩咖啡 + 橙
- 未改主题的 shadcn token（zinc/slate、原样的 `components.json`、没动过的 `--radius`）

**字体排印**

- ★ Inter（或系统字体栈）包办一切，没有搭配、没有展示字体
- "替代默认字体"本身成了特征：Space Grotesk、Geist、Instrument Serif、Fraunces
- Next.js 站点上原封不动的 Geist
- 无衬线标题里夹一个衬线斜体强调词；标题里给一个词单独上色/加粗/划线
- 超大斜体衬线展示标题
- 反射性的全大写 eyebrow 小标；每个标题上方都有一个 kicker
- 等宽字体当装饰用（HN 评论提到 "the console-ish font Claude seems to love" [转述]）
- 单一字族、单一字重、扁平的字号阶梯（全是 400/500）
- 正文加宽字距；正文全大写；极端字距
- 一切居中对齐；标题 Title Case Everything
- 展示标题折成 5–6 行
- CSS 里声明了字体但根本没加载

**布局与构图**

- ★ 居中 hero 模板：药丸徽章 + 大标题 + 副标题 + 两个按钮
- ★ 三张一模一样的图标置顶功能卡
- 千篇一律的区块顺序：hero → logo 墙 → 功能 → 数据 → 定价 → CTA
- 三档定价 + 中间那档带 "Most Popular" 光环
- 默认的四栏等宽页脚
- 通用数据/社会证明条；一个大数字加小标签当 hero
- 装饰性的 01 / 02 / 03 编号（内容其实没有顺序）；三步式 "How it works"
- bento 网格作为默认构图
- hero 背后淡淡的网格或点阵
- 均匀的内边距，没有节奏（每个区块都是 80px）
- 两个视觉权重相同的 CTA（"Get Started" / "Learn More"）
- 移动端 `h-screen` hero 把内容全挡在首屏以下
- 一次性展示所有东西的布局（Kosta Canatselis："layouts that show everything, all at once" [摘要]）

**组件与表面**

- ★ 原封不动的 shadcn/ui 默认样式
- `rounded-2xl shadow-lg` 套在所有东西上；所有元素同一个 `border-radius: 12px`
- 卡片套卡片；所有内容都包进卡片
- 反射性的玻璃拟态 / `backdrop-blur`；毛玻璃导航栏
- 彩色左边框（或上边框）强调卡片。Krebs 说它相当于设计里的 em-dash [转述]
- 标题上方的药丸徽章
- 图标放在带底色的圆角方块里，再叠在标题上方
- 默认的暗色 SaaS 卡片；"幽灵卡片"
- Aceternity / Magic UI 的现成特效组件
- 状态标签堆砌；脉冲的状态圆点；带底色圆圈里的对勾；对勾功能列表
- 假的窗口装饰（macOS 红绿灯圆点的假终端 hero，产品却不是开发者工具）
- 缺失的组件状态：没有 hover / focus / active / disabled；删掉 focus outline 又不补
- 没有空状态、加载态、错误态（Kosta："AI-built screens optimise for the demo, and the demo always has data" [摘要]）
- 库默认配色的图表、默认 toast、默认 modal、默认 spinner

**动效与交互**

- 每个区块、每张卡片都是同一个向上淡入（"fade in from below at 600ms with 100ms stagger"）
- 每张卡片 hover 都上浮；`hover:scale-105` 到处都是
- bounce / elastic 缓动
- 数字 count-up 动画；标题打字机效果
- 自动滚动的 logo 条；永不停止的旋转环、脉冲点、弹跳箭头
- 每个区块都有视差
- 零散的微交互，没有编排；动效之间不协调
- `transition: all`；动画 width/height 引起重排
- 不尊重 `prefers-reduced-motion`
- 抄来的 "Linear glow"

**图标与图像**

- ★ emoji 当功能图标、当导航、当标题前缀（✨🚀🔥）
- "Lucide 五件套"：Sparkles 代表 AI、Zap 代表快、Shield 代表安全、Check 代表好处、BarChart3 代表分析，再加每个 CTA 上的 ArrowRight
- 混用图标风格（线性 + 填充 + emoji + 插画）
- "多元团队围着笔记本"的图库照片；抽象科技网格背景图
- AI 生成的 3D 光泽 blob；塑料感插画和生成的头像
- 用 SVG 硬画人脸、硬画插画（花叔的清单里点名 [摘要]）
- 占位身份与媒体：DiceBear 头像、每条评价都是五星

**文案与内容**

- 空泛的愿景式标题："Elevate your workflow"、"Reimagine What's Possible"
- 填充动词：Empower / leverage / unlock / seamless / powerful
- 通用 CTA："Get Started"、"Learn More"；"Welcome to" 开头的 hero
- "Not X. Y." 句式口号；三连排比口号
- ★ 假数据与假背书："Trusted by 10,000+ teams"、"1,234 users"、"$99.99"、"100% satisfaction"
- John Doe / Jane Doe / "Sarah J., CEO"；TechCorp / Acme Inc.
- 上线了还留着 Lorem ipsum
- em-dash 滥用
- 无顺序含义的编号列表

**代码层指纹**

- 生成器签名没删；`<!-- Hero Section -->` 式的区块注释
- div soup；z-index 军备竞赛；`!important` 滥用
- 没有设计 token（颜色、间距全是散落的字面值）

**跨页一致性**

- ★ 设计系统漂移：第二页的字体、颜色、圆角、导航、页脚和第一页不一样，或者无视你已选定的设计

### 1.4 不该过度标记的东西

avoid-ai-design catalog 的校准规则 [一手]，值得原样采纳：

- **brief 优先。** 用户要奶油配赤陶、要终端风、要居中 hero，就把它做好。
- **判断组合，不判断单点。** deslop 的做法 [一手]：奶油底单独出现是"选纸"，衬线单独出现是"选字"，两个一起才触发。它的原则是 "Chosen design is design; defaults are slop."
- 一个用得好、和品牌挂钩的渐变不是 slop。
- 玻璃拟态、bento、极光背景被过度归罪，数据显示它们作为特征排名很低。
- 数字本身就是产品时（状态页、价格、看板），大数字 hero 是对的。
- 克制且有意图的极简不是"怯懦"。
- 特征只说明"有一个没人做过决定的默认值"，**不证明是模型做的**。

---

## 2. 被报告有效的具体做法

### 2.1 把审美目标翻译成可实现的前端代码维度（Anthropic 应用 AI 团队）

来源 [一手]：Anthropic 博客《Improving frontend design through Skills》，2025-11-12（<https://claude.com/blog/improving-frontend-design-through-skills>）。

- 成因解释："Distributional convergence … Safe design choices–those that work universally and offend no one–dominate web training data. Without direction, Claude samples from this high-probability center."
- 核心方法："think about frontend design the way a frontend engineer would. The more you can map aesthetic improvements to implementable frontend code, the better Claude can execute."
- 四个最容易见效的维度：**字体、动效、背景、主题**。
- **提示的"高度"要对**：避开两个极端，"low-altitude hardcoded logic like specifying exact hex codes" 和 "vague high-altitude guidance that assumes shared context"。
- 一个有意思的观察："the mandate to use more interesting fonts seems to encourage the model to improve other aspects of the design as well." 即**字体是杠杆最大的单点**。
- 他们的通用提示只有约 400 token，做成 skill 按需加载，不常驻上下文。

中文社区的传播 [摘要]：宝玉翻译了全文（<https://baoyu.io/translations/improving-frontend-design-through-skills>）；meng shao 在 X 上做了解读，称"Prompting for better frontend output"一段"值得重新看几遍"（<https://x.com/shao__meng/status/1992581217666121896>）。

### 2.2 字体优先

- Anthropic 博客里的字体提示 [一手]：禁用 "Inter, Roboto, Open Sans, Lato, default system fonts"；推荐按气质选：代码感用 JetBrains Mono / Fira Code / Space Grotesk，编辑感用 Playfair Display / Crimson Pro，技术感用 IBM Plex / Source Sans 3，独特感用 Bricolage Grotesque / Newsreader。规则："Use extremes: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x." "Pick one distinctive font, use it decisively."
- Kosta Canatselis（Mania Design，2026-07-23）[摘要]："change the font before you change anything else."（<https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/>）
- **注意时效性**：上面推荐的 Space Grotesk、Playfair Display 现在已经进了 deslop 和 avoid-ai-design 的"替代默认字体"黑名单 [一手]。deslop 的修法是："choose a face for what it says about the brand, not because it is the current default alternative."
- 歸藏的字体分工 [一手：guizang-ppt-skill SKILL.md]："标题用衬线,正文用非衬线,元数据用等宽"；瑞士风格下"大字字重 200……字号越大越细"，并"**禁止** 600/700/800 大字"（<https://github.com/op7418/guizang-ppt-skill>）。

### 2.3 先承诺一个明确的美学方向，而且方向要从主题里推导

- Anthropic 博客 [一手]：用模型已经很懂的命名主题来沟通（例子是 RPG 主题：羊皮纸纹理、华丽边框、中世纪衬线）。
- HN 帖《Slightly reducing the sloppiness of AI generated front end》（2026-06-12，<https://news.ycombinator.com/item?id=48504912>）[摘要]：作者发现要求 "Qt 桌面应用风格" 能明显降低 slop 感。评论里的解释是标准网页设计选项太多、模型只能猜，强制桌面风格收窄了选择空间。有人推荐 98.css。这是**用一个约束强的既有范式压缩设计空间**的例子。
- avoid-ai-design 的修法 [一手]："Derive the ground and accent from the subject (its materials, place, era, signage), not from 'warm and editorial.'" 整个 catalog 的总纲："replace a default with a decision."
- Impeccable 的对照 [一手]：加 skill 之后，同一个民宿页面 "is built around one picture: the house at night, seen from the water"。即**围绕一个具体的中心意象来建页面**。
- 歸藏的 skill 只给两套互斥的完整风格，并明令"风格 A 和 B **不能混用**""一份 deck 只用一套主题,不要中途换色""不要混搭……会彻底违和" [一手]。

### 2.4 参考驱动：截图、命名风格、DESIGN.md

- **截图参考**。HN 评论 [摘要]："the screenshot helps it calibrate how to adjust stuff, as it usually can't 'see' the results of the UI changes."（<https://news.ycombinator.com/item?id=42439456>）多篇博客的建议：截一张你欣赏的应用，说明要学的是它的**哪一方面**（密度、色调还是布局），例如 "match this spacing and hierarchy, use my colors" [摘要]。中文教程补充：只给一张图是常见错误，要给真实浏览器截图、完整首屏、多种状态 [摘要]（<https://blog.csdn.net/namexingyun/article/details/161582426>）。
- **DESIGN.md**。Google Labs 定了格式（<https://github.com/google-labs-code/design.md>）；VoltAgent 的 awesome-design-md 收录了从 Stripe、Linear、Vercel 等真实站点提取的规范（<https://github.com/VoltAgent/awesome-design-md>），发布十天约 3.5 万星 [摘要]。知乎上的理由 [摘要]：比起截图，文本规范"AI 能直接读懂"，省去先视觉识别再推测的一步（<https://zhuanlan.zhihu.com/p/2055998476350240739>）。常见组合用法：把截图喂给视觉模型，让它生成 design.md 把风格固化下来以便复用。
- **从你喜欢的 UI 里推导设计系统**，而不是每次重新生成 [摘要：HN 48504912 评论]。
- **Figma MCP**：把变量、样式、组件作为结构化上下文而不是一张待模仿的图 [摘要]（<https://www.eleken.co/blog-posts/figma-to-claude-code>）。配套纪律："Do not implement anything yet"（先检查再动手）；复用已有组件和 token；设计稿缺加载/空/错误/禁用/移动端状态时停下来问。

### 2.5 先定 token，再生成页面

- MindStudio 的观察 [摘要]：不指定 token 时模型会隐式生成一套，"That implicit set is where the generic aesthetics live."（<https://www.mindstudio.ai/blog/build-design-system-claude-design-no-ai-aesthetics>）
- 规则引用**语义 token** 而非字面值，同一套规则就能跨品牌使用 [摘要]。
- PostHog《An engineer's guide to vibe design》（Lior Neu-ner，约 2025-06）[摘要]：先用 Coolors 或 Figma 做好配色，再让模型映射成设计 token；开工前用一句话写清用户的 "job to be done"；最后 10% 按六条设计原则打磨（<https://newsletter.posthog.com/p/an-engineers-guide-to-vibe-design>）。
- 中文实验文章 [摘要]：先去 coolors.co 选好配色，把色值写进提示词，并明确要求使用 frontend-design skill，效果明显好于默认蓝紫（<https://blog.csdn.net/weixin_49113487/article/details/156156508>）。
- 歸藏的做法更硬 [一手]：主题全部内置在模板的 token 区块里，"**不要改那个区块**"；"不要把用户给的 hex 值直接写进页面——走品牌色脚本"。底色不用 `#FFFFFF`、字色不用 `#000000` [摘要]。
- avoid-ai-design [一手]：多页工作时把方向一次性写进 `DESIGN.md`，"so page two cannot drift from page one"。

### 2.6 模板 + 现成版式，而不是从零写

这条主要来自歸藏的 skill [一手]，对我们做幻灯片和报告尤其相关：

- "**不要从零写 slide**。打开对应的 layouts 文件,里面有 10 种现成布局骨架,每种都是完整可粘贴的 `<section>` 代码块。"
- "**模板是唯一的类名来源**——不要发明新类名。"
- 先问清再动手："不要基于猜测就开始写 slide——一旦结构定错,后期翻修代价很高。"（受众、时长、素材、图片来源、主题色、硬约束等 7 个问题）
- 生成后对照 checklist，里面是"真实迭代过程中踩过的所有坑"，P0 项包括 emoji、图片撑破、标题换行、字体分工。
- 具体硬规则的例子："用 Lucide,不用 emoji"；"中文大标题 ≤ 5 字且 `nowrap`(避免 1 字 1 行)"；"图片只能用标准比例"；"每页一个语义化动效 recipe——不是统一 fade-up……**禁止**所有页用同一个 generic 配方"；内容放不下时"先删减文案、拆成两页、换更适合的版式,不要把字号压到 10/11/12/13px"。
- 截图验证的细节："截图前等入场动效稳定(约 1-2 秒),不要把动画中间态当成版式问题。"

taste-skill 的 2.5 版同样走了"规则 + 现成素材 + 完工闸门"路线 [一手]：自带 UI 片段、图表、照片库和一个 Stop hook 闸门（<https://github.com/Leonxlnx/taste-skill>）。

### 2.7 给真实内容，不要占位

- Laith0003 Ban List 的第一条原则 [一手]："Specificity beats genericity." 例子：不写 "1,234 users"，写 "1,284 partners across 14 cities"；不写 "Empower your team with our innovative platform"，写 "Loyalty for cafes. Points, tiers, vouchers. No app required."
- 花叔（Huashu Design，自称逆向了 Claude Design）[摘要]："没图标就留灰色方块+文字标签,别画烂SVG。没数据就写,别编造看起来像数据的假数据。" 以及"好的高保真设计不是从白纸开始的,是从已有的设计上下文里长出来的"（<https://x.com/AlchainHust/status/2046493878656913568>，<https://www.uisdc.com/huashu-design>）。
- Kosta Canatselis [摘要]：把每一行文案用真人的口吻重写。
- taste-skill [一手]："Show real product UI and real photographs."
- uxplanet 的建议 [摘要]：自己写 UI 文案、自己换图标，模型默认的通用图标是很强的 AI 特征（<https://uxplanet.org/5-tips-to-prevent-generic-web-design-in-claude-code-7cc044760453>）。

### 2.8 约束清单，但要配"改成什么"，并且用确定性检查兜底

- 写法上，好的清单每条都有 Don't / Do 配对（Laith0003 [一手]）。只列禁令的问题见 §3.1。
- **确定性扫描器 + hook** 是 2026 年的主流做法。Impeccable [一手]："62 deterministic rules … No LLM, no API key"，并强调 "This is where most slop gets caught: without the hook, the detector only runs when someone remembers to run it." avoid-ai-design 给了 `PostToolUse` hook 配置，编辑一引入 P0/P1 特征，模型当轮就看到并修掉 [一手]。
- deslop 公开了自己的基准 [一手]：30 个页面上 AI 组平均 36 分、人工组 2.9 分，最佳阈值准确率 83.3%，并列出了误判案例（一个 1997 年手写主页、一个 Art Deco 酒店页被误报）。这说明**扫描器有用但不是裁判**。
- 允许豁免：Impeccable 可以为品牌字体加白名单并写理由；deslop 说品牌真的是紫色渐变时 "gets a one-line justification, not a redesign"。

### 2.9 多方案生成再挑选

- 证据偏弱，我没找到有分量的一手帖子。能确认的只有：unslop-ui 的演示把一个 prompt 变成四个不同的、都通过扫描的设计 [一手]；Design with AI newsletter 让 Claude 出三个高保真线框方案 [摘要]；一篇第三方文章称 Claude Code 的 `/design` skill 走"描述 → 给几个选项 → 选一个 → 调整 → 实现"的循环 [摘要，未核实]。
- 逻辑上它与 §3.2（模型不能判断品位）互补：让人来挑。

### 2.10 分段、迭代、让人做最后判断

- PostHog 文章评论里的流程 [摘要]：把 v0 的设计拆成小块（header、第一行、各列），一次只移植一块；附上那块的组件代码和截图；要求保留 v0 的"外观"但用代码库已有的组件和逻辑；让模型动手前先问清歧义；每个新 UI 部分开新对话。
- Impeccable README [一手]：它在**已有界面**上最强，"point it at a page or a component and iterate"，从零建新页是 "that harder mode"。建议从一个组件开始。
- Bakaus [摘要]："Even frontier models cannot close the final 5 to 20 percent of work required to take a product from good to great."
- Emil Kowalski [一手：README]："Agents don't have great taste." 他的例子：进场动画该用 `ease-out` 却用了 `ease-in`；该用半透明阴影却用了实线边框。"All these small things compound." 他的方法是把这些小错误逐条列出来并写明修法（<https://github.com/emilkowalski/skills>，文章 <https://emilkowal.ski/ui/agents-with-taste>）。

### 2.11 输出格式本身：HTML 而非 Markdown

和本项目的范围直接相关。Thariq Shihipar（Claude Code 团队）2026 年 5 月的《The Unreasonable Effectiveness of HTML》[摘要] 主张让 Claude 用 HTML 输出计划、代码评审、PR 总结等，理由是更丰富的视觉、颜色、图表和更易分享，并附 20 个示例（<https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html>）。Simon Willison 的回应 [摘要]：他从 GPT-4 时代就习惯给 LLM 写 Markdown，现在认为这个默认值可能该变了（<https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/>）。

---

## 3. 分歧，以及被报告无效的做法

### 3.1 "禁用清单"到底有没有用

- **支持**：Anthropic 博客 [一手] 说点名默认值立刻见效（"Tell Claude to 'avoid Inter and Roboto' … and results improve immediately"）。
- **反对**：Bakaus 在 AI Engineer 演讲里的观点 [摘要]：禁 slop 不管用，模型过拟合到自己的风格引力井，每禁一个就滑到下一组默认选择（<https://ai.engineer/talks/SQMCtZX3trg-dark-arts-skill-engineering-paul-bakaus>）。avoid-ai-design 作者的自述是最好的证据 [一手]：它自己的第一个 demo 落进了奶油配赤陶；v0.4 重做后又落进了 "navy on blue-grey with a blue ramp: one-note"。
- 中文社区也有人问过同样的问题 [摘要]："用 prompt 去掉 AI 味，会不会又变成一种 AI 味"。
- **目前的折中**：禁令只作为检测手段；生成时给的是"从主题推导方向"的正向指令；成对规则而非单点规则。

### 3.2 模型能不能自己评审设计

- Bakaus [摘要，媒体标题]："AI Models Can't Be Trusted to Judge Design Taste"，以及 "removing slop doesn't produce taste"。他在 3.5 发布推文里说，包括 Impeccable 自己和 Anthropic 的 frontend-design 在内的流行设计 skill "weren't actually very good at...design"。
- 另一边，截图反馈循环被普遍认为有用（§2.4），2024 年一篇 arXiv 论文发现 GPT-4 对 UI 稿的反馈"有时不准，但多数设计专家仍觉得有用" [摘要]（<https://arxiv.org/html/2403.13139v1>）。
- 实际做法：确定性规则查能查的；模型评审拆成独立角色（Impeccable 的 critique 起两个 agent [摘要]）；品位判断留给人。

### 3.3 截图 vs 文本规范

- 文本派（DESIGN.md）：模型直接读，无损。
- 截图派：一段文字描述在模型重建时会丢信息，直接给图更好 [摘要]。
- HN 上的怀疑 [摘要]："They can implement it if you give them a screenshot, but that's not designing something."
- UI 架构师的反例 [摘要]：组件"看到了 token，做出来看着对，其实是错的"，即**只有 token 不够**。

### 3.4 "AI slop"这个框架本身

- HN 上反复出现的反驳 [转述/摘要]："It's just Tailwind"；"designers did this before AI"；"this says more about 'modern' UI than it does about AI slop"。
- Krebs 本人不认为这些设计"差"，只是"没灵感" [摘要]。
- Kosta Canatselis 的定义更有用 [摘要]："Slop isn't bad design in the old sense: misaligned buttons, clashing colours, broken layouts. Slop is design with no author." 他还说 slop "isn't a bug you prompt your way out of"。

### 3.5 被报告无效或有害的做法

| 做法 | 问题 | 来源 |
|---|---|---|
| 模糊形容词（"modern"、"clean"、"make it pop"） | 什么都没确定，模型退回默认值 | [摘要] <https://peerlist.io/meltedme_dev/articles/stop-asking-ai-to-make-it-modern> |
| 一句模糊 prompt 生成整个产品 | 应先收集参考、建系统，再让 agent 建页面 | [摘要] <https://www.ai.joaoqueiros.com/blog/ai-ui-design-workflow-design-systems-tokens> |
| 把 Inter 换成"推荐字体" | 替换本身成了特征 | [一手] deslop `replacement-default-font` |
| 不改就装市面上的 skill | 仍然产出通用结果 | [摘要] MindStudio |
| 让 skill 一次到位 | 有作者在两个品牌上反复测试才找到 skill 失效处；Claude Design 被抱怨"反复忘记之前的反馈"且没用好现有 UI 库 | [摘要] HN <https://news.ycombinator.com/item?id=47806725> |
| 单点特征就判定 | 误报淹没信号；复古手写页、Art Deco 页被误判 | [一手] deslop SlopBench |
| 把个人品位写成普适规则 | 评论指出 "No bounce easing" 是 Bakaus 的品位而非真理；OpenAI 要求标题零字距、禁用随视口缩放的字号，catalog 认为那是品位不是特征 | [摘要] / [一手] |
| 指定精确 hex 这类过低层的硬编码，或过高层的空话 | 两个极端都不好 | [一手] Anthropic 博客 |
| 相信"pixel perfect"的宣传 | 没有独立测量支持，需用视觉回归测试验证 | [摘要] |

### 3.6 成因的说法：有趣但未证实

"都怪 Tailwind 的 indigo-500" 来自 Adam Wathan 2025 年 8 月的一条玩笑式道歉推文 [转述，原推未见，各家引文措辞不一]，大意是为五年前把 Tailwind UI 每个按钮都做成 `bg-indigo-500` 道歉。训练数据反馈循环的解释合理，但没有对照研究。

---

## 4. 值得关注的人与资源

**英文**

| 谁 | 为什么值得看 | 链接 |
|---|---|---|
| Paul Bakaus（@pbakaus，jQuery UI 作者） | Impeccable；"slop is a moving target"；公布生成结果统计；skill 工程方法论 | <https://github.com/pbakaus/impeccable> · <https://impeccable.style> |
| Emil Kowalski（Vercel / Linear 背景） | 动效与细节规则；《Agents with Taste》 | <https://github.com/emilkowalski/skills> · <https://emilkowal.ski/ui/agents-with-taste> |
| Jakub Krehel | make-interfaces-feel-better：光学对齐、同心圆角、阴影、点击区域；interfaces.dev 杂志 | <https://github.com/jakubkrehel/make-interfaces-feel-better> |
| Adrian Krebs | Show HN 设计 slop 量化研究 | <https://www.adriankrebs.ch/blog/design-slop/> |
| J. Carter Johnson | Reddit 320 万帖挖掘出的特征排名，数据和脚本公开 | <https://github.com/JCarterJohnson/vibecoded-design-tells> |
| Kosta Canatselis（Mania Design） | 设计师视角："design with no author"；缺失状态 | <https://www.mania.design/blog/spot-the-slop-a-ui-designers-guide-to-fixing-ai-defaults/> |
| Thariq Shihipar / Simon Willison | HTML 作为 agent 输出格式 | 见 §2.11 |
| Anthropic 应用 AI 团队 | 博客 + cookbook + frontend-design skill（现已自列二代默认值） | <https://claude.com/blog/improving-frontend-design-through-skills> · <https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics> |
| Lior Neu-ner（PostHog） | 工程师做设计的完整流程 | <https://newsletter.posthog.com/p/an-engineers-guide-to-vibe-design> |

**特征目录（可直接当我们的检查清单素材）**

- avoid-ai-design catalog：81 条，每条有检测信号、成因、修法、来源，分 P0/P1/P2，并有"不该过度标记"一节。目前最完整。<https://github.com/funboy322/avoid-ai-design>
- Signs of AI design（febbhav）：每条带"可靠度"和"是否仍活跃"标注，还覆盖 AI 生成图片。<https://github.com/febbhav/signs-of-ai-design>
- deslop：48 条规则 + 2026 默认值包 + RTL 包 + 公开基准。<https://github.com/iRehmanAhmad/deslop>
- Laith0003 Ban List：Don't/Do 配对写法的范例，含交互与组件类。<https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list>

**中文**

| 谁 | 为什么值得看 | 链接 |
|---|---|---|
| 歸藏（@op7418，guizang.ai） | guizang-ppt-skill：模板 + 版式库 + checklist 的完整范例，对幻灯片场景最有参考价值 | <https://github.com/op7418/guizang-ppt-skill> |
| 花叔（@AlchainHust） | Huashu Design：从 Claude Design 提示词蒸馏；占位原则、"从已有上下文里长出来" | <https://github.com/alchaincyf/huashu-design>（仓库地址来自搜索摘要，未核实） |
| 宝玉（baoyu.io） | Anthropic 前端设计博客的中文翻译 | <https://baoyu.io/translations/improving-frontend-design-through-skills> |
| meng shao（@shao__meng） | 对同一篇博客的中文解读 | <https://x.com/shao__meng/status/1992581217666121896> |
| 知乎 / 掘金《实测 Awesome-design-md》 | DESIGN.md 的中文实测 | <https://zhuanlan.zhihu.com/p/2055998476350240739> |

---

## 5. 对本项目的启示

1. **不要只做禁用清单。** 清单会过期（Space Grotesk 一年内从"推荐"变成"特征"），而且会把模型推向下一个默认值。核心机制应该是"迫使每个页面做出从内容推导的决定"，清单只用于事后检测。
2. **检测规则按组合触发、允许带理由豁免。** 这是 deslop 和 avoid-ai-design 用自己的误报换来的教训。
3. **提供完整的、互斥的风格套件和现成版式**，而不是让模型自由组合。歸藏的 skill 是目前最接近我们"组件库 + 准则"构想的社区实例，非设计师也能用。
4. **token 先行并写入文件**，防止跨页漂移。漂移是被标为 P0 的问题。
5. **字体是杠杆最大的单点**，但字体选择要随主题变化，不能硬编码一份推荐名单。
6. **优先防住外行也能认出的少数几项**：未改的 shadcn/Tailwind 默认、紫色渐变、渐变文字、emoji 图标、居中 hero 加三卡、假数据。
7. **真实内容与诚实占位**要写成硬规则：没有数据就明说，不编造。
8. **状态设计**（空、加载、错误、hover、focus）是 demo 导向生成最常漏掉的，报告和文档类输出同样适用。
9. **把确定性检查挂到 hook 上**，不依赖模型自觉，也不依赖模型的审美判断。
10. **为人留出挑选和最后打磨的位置。** 多位从业者都认为最后 5–20% 模型做不了。
