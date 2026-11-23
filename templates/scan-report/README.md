# 扫描报告模板

把"按子应用（或模块、服务、仓库）分组的问题清单"生成一份单文件 HTML 报告。只需要提供数据，版式、文案和交互都由模板决定。

- **列表页**：一句结论、问题总数和受影响子应用数、严重程度分布条（图例只标颜色含义，悬停看分项数字）、子应用表格（可搜索，可按阻断数或问题数排序）、问题种类分布。
- **详情页**：点击某个子应用进入，版式与列表页一致：一句结论、问题总数和种类数、严重程度分布、问题表格（严重程度、种类和说明、代码位置链接、引入时间和作者），可搜索，可按严重程度或引入时间排序。

模板有意保持简单：不做与上次扫描的对比、不展示趋势和新增。

## 用法

```bash
node tools/build-report.mjs data.json -o report.html
```

- 只依赖 Node，不需要安装任何包。
- 产出是一个零外部依赖的 HTML（约 0.4 MB 加数据大小），可离线打开。
- 数据不合要求时命令会失败，并逐条指出哪个字段有问题。
- 可选 `--theme <名字>` 换外观，默认 `moss`。

示例数据见 [`example/data.json`](example/data.json)（由 `example/generate.mjs` 生成）。

## 数据格式

```jsonc
{
  "title": "代码扫描报告",              // 可选，默认"代码扫描报告"
  "repo": { "name": "platform/web-monorepo", "url": "https://..." }, // 可选
  "branch": "main",                     // 可选
  "commit": "a41f9c2e",                 // 可选
  "scannedAt": "2026-11-20",            // 可选；不显示在页面上，只用于计算"N 天前"，YYYY-MM-DD
  "footnote": "扫描范围：apps/*",        // 可选，页脚说明

  "types": [                            // 必填：问题种类
    { "id": "hardcoded-secret", "label": "硬编码密钥", "severity": "blocker" }
  ],

  "apps": [                             // 必填：所有被扫描的子应用，没有问题的也列出
    {
      "id": "checkout",                 // 必填，唯一
      "name": "收银台",                  // 必填
      "path": "apps/checkout",          // 可选；问题的 file 以它开头时会省略这一段
      "team": "交易前端组",              // 可选；全部缺省时不显示这一列
      "url": "https://...",             // 可选，目录链接
      "issues": [
        {
          "type": "hardcoded-secret",   // 必填，对应 types 里的 id
          "file": "apps/checkout/src/config/oss.ts", // 必填
          "line": 42,                   // 可选
          "message": "源码中包含明文 AccessKey",       // 可选，一句话说明
          "url": "https://gitlab.../oss.ts#L42",     // 可选，代码位置链接
          "introducedAt": "2026-08-01", // 可选，YYYY-MM-DD；全部缺省时不显示这一列
          "author": "陈思远",            // 可选
          "severity": "high"            // 可选，覆盖种类的默认严重程度
        }
      ]
    }
  ]
}
```

`severity` 只能是四级之一：`blocker`（阻断）、`high`（严重）、`medium`（一般）、`low`（提示）。

## 文件

- `app.js`：页面渲染与交互
- `validate.mjs`：数据校验
- `example/`：示例数据及其生成脚本
