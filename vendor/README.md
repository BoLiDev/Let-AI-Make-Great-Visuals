# vendor

拷入仓库的第三方文件。产出物在构建时把它们内联进 HTML，运行时不访问外网。

| 目录 | 来源（npm 包与版本） | 许可证 | 内容 |
|---|---|---|---|
| `basecoat/` | `basecoat-css` 1.2.1 | MIT | 八套风格的预编译 CSS（`dist/basecoat-<风格>.cdn.min.css`）和 `dist/js/all.min.js` |
| `fonts/geist`, `fonts/geist-mono` | `@fontsource-variable/geist`、`geist-mono` 5.3.0 | OFL-1.1 | 拉丁子集 woff2 |
| `fonts/hanken-grotesk`, `fonts/instrument-sans`, `fonts/jetbrains-mono`, `fonts/ibm-plex-sans` | `@fontsource-variable/*` 5.3.0 | OFL-1.1 | 拉丁子集 woff2 |
| `fonts/ibm-plex-mono` | `@fontsource/ibm-plex-mono` 5.3.0 | OFL-1.1 | 拉丁子集 woff2（400/500/600） |
| `icons/lucide/` | `lucide-static` 1.77.0 | ISC | 目前用到的图标子集 |

许可证取自各 npm 包的 `license` 字段和包内的 LICENSE 文件；尚未审计 Basecoat 预编译 CSS 中包含的第三方代码（Tailwind 的 preflight 等）。公司内使用前需要复核。

中文不内置字体，使用系统字体栈。
