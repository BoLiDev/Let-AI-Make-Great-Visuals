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
| taste-skill（design-taste-frontend） | 2.5.1，`npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend` | [`taste-skill/scan-report.html`](taste-skill/scan-report.html) | 技能面向公司官网。自带的检查门跑满三轮未通过，剩 29 项未过，多数是官网规则不适用于报告。耗时约 22 分钟 |

尚未做：不带技能的对照组；其他候选技能（impeccable、Anthropic frontend-design、ui-ux-pro-max、hallmark）。
