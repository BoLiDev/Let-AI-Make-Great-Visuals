# 技能对比实验

目的：找出在"报告"这个场景里效果最好的设计技能。每次只换技能，其余保持不变，最后由仓库所有者盲选。

## 固定条件

- **起点**：提交 `0588314` 的 Moss 版扫描报告（`preview/out/scan-report-moss.html` 及其源文件）。
- **数据**：`templates/scan-report/example/data.json`。
- **任务**：读完技能，按技能的指引重新设计这份报告；保留列表页和子应用详情页；外观、版式、文案、交互都可以改。
- **硬约束**：单文件 HTML、可离线打开、不访问外网；界面文字为中文。
- **隔离**：每个技能一个子代理，只能看到自己的技能，不提供 `docs/preferences.md`。产出放在 `experiments/<技能名>/`。
- 每个技能目前只跑一次，结果有随机性。

## 结果

| 技能 | 版本 / 来源 | 产出 | 备注 |
|---|---|---|---|
| taste-skill（design-taste-frontend） | 2.5.1，`npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend` | [`taste-skill/scan-report.html`](taste-skill/scan-report.html) | **不采用**（所有者评价：明显是做网站的，用来写报告很奇怪）。自带的检查门跑满三轮未通过，剩 29 项未过。耗时约 22 分钟 |
| hallmark | 2.0.0，`npx skills add nutlope/hallmark` | [`hallmark/scan-report.html`](hallmark/scan-report.html) | 按"应用界面"范围处理，关闭了官网类规则。去掉 Basecoat，随机分到 Almanac 主题，概览移到左侧栏。自带的 sloplint 通过。耗时约 9 分钟 |
| make-interfaces-feel-better | `npx skills add jakubkrehel/make-interfaces-feel-better`（注意仓库名是复数） | [`make-interfaces-feel-better/scan-report.html`](make-interfaces-feel-better/scan-report.html) | 细节打磨清单（19 条微规则），不改信息结构，保留 Moss 主题。耗时约 8 分钟 |
| 不带技能的对照组 | 无 | [`no-skill/scan-report.html`](no-skill/scan-report.html) | 去掉 Basecoat 手写 CSS；倾向于加回更多信息（结论句、占比、各级数量列、阻断问题区块）。耗时约 5 分钟 |

第二轮三个产出的盲选副本在 [`blind-round-2/`](blind-round-2/)，对应关系见其中的 `KEY.md`。

尚未做：其他候选技能（impeccable、Anthropic frontend-design、ui-ux-pro-max）。
