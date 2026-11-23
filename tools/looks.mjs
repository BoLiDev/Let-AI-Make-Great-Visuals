// 预览用的"外观"定义：Basecoat 风格包 + 我们的主题变量 + 字体。
export const looks = [
  { id: 'baseline', name: '对照组', note: '未改动的 shadcn：Basecoat 默认风格 Vega，Geist 字体，纯灰阶。', basecoat: 'vega', fonts: ['geist', 'geist-mono'], theme: null },
  { id: 'ink', name: 'Ink 工程文档', note: '直角、墨色、细线。IBM Plex Sans + Plex Mono。', basecoat: 'sera', fonts: ['ibm-plex-sans', 'ibm-plex-mono'], theme: 'themes/ink.css' },
  { id: 'slate', name: 'Slate 蓝灰', note: '带蓝调的中性色，概览放在面板里。Hanken Grotesk + JetBrains Mono。', basecoat: 'nova', fonts: ['hanken-grotesk', 'jetbrains-mono'], theme: 'themes/slate.css' },
  { id: 'graphite', name: 'Graphite 控制台', note: '默认深色，等宽标题，琥珀色强调。Instrument Sans + JetBrains Mono。', basecoat: 'lyra', fonts: ['instrument-sans', 'jetbrains-mono'], theme: 'themes/graphite.css', defaultDark: true },
  { id: 'moss', name: 'Moss 柔和', note: '绿调暖灰，大圆角。Instrument Sans + Geist Mono。', basecoat: 'maia', fonts: ['instrument-sans', 'geist-mono'], theme: 'themes/moss.css' },
  { id: 'onyx', name: 'Onyx 黑白灰', note: 'Moss 的形状，黑白灰配色，绿色表示向好、浅红表示风险。默认深色。', basecoat: 'maia', fonts: ['instrument-sans', 'geist-mono'], theme: 'themes/onyx.css', defaultDark: true },
];
