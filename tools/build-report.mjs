#!/usr/bin/env node
// 用模板和数据生成单文件 HTML 报告。
// 用法：node tools/build-report.mjs <data.json> [-o 输出.html] [--template scan-report] [--theme moss]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, renderReport } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (names, fallback) => {
  const i = args.findIndex((a) => names.includes(a));
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const out = flag(['-o', '--out'], null);
const template = flag(['--template'], 'scan-report');
const theme = flag(['--theme'], 'moss');
const dataPath = args[0];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!dataPath) fail('用法：node tools/build-report.mjs <data.json> [-o 输出.html] [--template scan-report] [--theme moss]');
if (!existsSync(join(ROOT, 'templates', template, 'app.js'))) fail(`未知模板 "${template}"`);

let data;
try {
  data = JSON.parse(readFileSync(resolve(dataPath), 'utf8'));
} catch (e) {
  fail(`无法读取或解析 ${dataPath}：${e.message}`);
}

const { validate } = await import(pathToFileURL(join(ROOT, 'templates', template, 'validate.mjs')));
const errors = validate(data);
if (errors.length) fail(`数据不符合模板要求：\n- ${errors.join('\n- ')}`);

let html;
try {
  html = renderReport({ template, data, theme });
} catch (e) {
  fail(e.message);
}
const target = resolve(out || dataPath.replace(/\.json$/, '') + '.html');
writeFileSync(target, html);
console.log(`${target}  (${Math.round(html.length / 1024)} KB)`);
