#!/usr/bin/env node
/**
 * 笔记链接巡检：扫描全仓 Markdown 的本地相对链接与 Obsidian 双链，报告失效目标。
 *
 * 用法：
 *   npm run audit:links          # 扫描并打印报告，有断链时退出码为 1
 *   npm run audit:hard           # 仅将确定失效的相对链接作为阻断错误
 *   node scripts/audit_links.js --json   # 输出 JSON，便于接入 CI
 *
 * 设计要点：
 * - 跳过围栏代码块与行内代码，避免把 webpack 正则、剩余参数 `...args` 误判为链接。
 * - 校验相对链接时忽略 #锚点，仅判断文件/目录是否存在。
 * - 额外报告课程导入残留的纯数字双链（如 [[4849]]），这类链接在 Obsidian 中永远点不开。
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([".git", "node_modules", ".obsidian", ".trash"]);
const asJson = process.argv.includes("--json");
const hardOnly = process.argv.includes("--hard");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/**
 * 用等长空格替换代码块与行内代码，保持字符偏移不变，便于后续按行定位。
 * 围栏用 3 个以上反引号，结束围栏长度需不小于开始围栏（笔记里有嵌套三反引号的 ````js 块）。
 */
function maskCode(text) {
  const lines = text.split("\n");
  let fence = null; // { char, len }
  const masked = lines.map((line) => {
    const m = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (m) {
      const char = m[1][0];
      const len = m[1].length;
      if (fence === null) {
        fence = { char, len };
        return " ".repeat(line.length);
      }
      // 结束围栏：同字符、长度不小于开始、且不带 info string
      if (char === fence.char && len >= fence.len && m[2].trim() === "") {
        fence = null;
      }
      return " ".repeat(line.length);
    }
    return fence ? " ".repeat(line.length) : line;
  });
  // 行内代码
  return masked.join("\n").replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length));
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const files = walk(ROOT);
const markdowns = files.filter((f) => f.endsWith(".md"));

const brokenLinks = [];
const brokenWiki = [];
const spaceLinks = [];
let totalLocal = 0;

// Obsidian 双链解析：按「文件名（可不带扩展名）」在全仓匹配
const basenames = new Set();
for (const f of files) {
  basenames.add(path.basename(f));
  basenames.add(path.basename(f, path.extname(f)));
}

for (const file of markdowns) {
  const raw = fs.readFileSync(file, "utf8");
  const text = maskCode(raw);
  const rel = path.relative(ROOT, file);

  // Markdown 相对链接：[text](target)。
  // 目标允许含空格，因为仓库里有「Webpack5核心特性 - 一页速记.md」这类文件名；
  // 未编码的空格在 GitHub 上会截断链接，单独归类为 spaceLinks 报告。
  const linkRe = /\[([^\]]*)\]\(([^)]+?)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = linkRe.exec(text))) {
    let target = m[2].trim();
    // 非文件协议一律跳过（含 chrome:// devtools:// about: 等浏览器内部页面）
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
    target = target.split("#")[0];
    if (!target) continue;
    // 既无路径分隔符又无扩展名的，多为伪代码里的参数名（如 [value](value)），不是文件引用
    if (!target.includes("/") && !path.extname(target)) continue;
    totalLocal++;

    let decoded = target;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      /* 保留原样 */
    }
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) {
      brokenLinks.push({
        file: rel,
        line: lineOf(text, m.index),
        target: m[2],
      });
    } else if (/\s/.test(target)) {
      // 文件存在但路径含未编码空格：Obsidian 能跳转，GitHub 会断
      spaceLinks.push({ file: rel, line: lineOf(text, m.index), target: m[2] });
    }
  }

  // Obsidian 双链：[[目标]] 或 [[目标|别名]]
  const wikiRe = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  while ((m = wikiRe.exec(text))) {
    const name = m[1].trim();
    if (!name) continue;
    const hit =
      basenames.has(name) ||
      basenames.has(`${name}.md`) ||
      basenames.has(path.basename(name));
    if (hit) continue;

    brokenWiki.push({
      file: rel,
      line: lineOf(text, m.index),
      target: `[[${name}]]`,
      kind: classifyWiki(name),
    });
  }
}

/**
 * 判断失效双链的性质，避免把「代码字面量」和「外部文档引用」当成待修的导航断链：
 * - literal：算法笔记里的数组字面量，如 [[1,0]]、[["X"]]，本就不是链接。
 * - citation：引用外部文档的标注，如 [[gating – React]]，含破折号或引号。
 * - navigation：真正的内部笔记跳转，需要修（目标改名、移动或从未创建）。
 */
function classifyWiki(name) {
  if (/^[\d\s,.'"[\]]+$/.test(name) || /^".*"$/.test(name)) return "literal";
  if (/[–—]|^".*"/.test(name) || /\s[–—]\s/.test(name)) return "citation";
  return "navigation";
}

if (asJson) {
  console.log(
    JSON.stringify(
      { totalLocal, brokenLinks, spaceLinks, brokenWiki },
      null,
      2,
    ),
  );
} else {
  const nav = brokenWiki.filter((b) => b.kind === "navigation");
  const noise = brokenWiki.length - nav.length;

  console.log(
    `扫描 Markdown 文件：${markdowns.length} 个，本地相对链接：${totalLocal} 条\n`,
  );

  console.log(`失效相对链接：${brokenLinks.length} 条`);
  for (const b of brokenLinks)
    console.log(`  ${b.file}:${b.line}  ->  ${b.target}`);

  console.log(
    `\n路径含未编码空格：${spaceLinks.length} 条（Obsidian 可跳转，GitHub 会截断）`,
  );
  for (const b of spaceLinks)
    console.log(`  ${b.file}:${b.line}  ->  ${b.target}`);

  console.log(`\n失效导航双链：${nav.length} 条`);
  for (const b of nav) console.log(`  ${b.file}:${b.line}  ->  ${b.target}`);

  console.log(`\n已忽略 ${noise} 条非导航双链（代码字面量、外部文档引用标注）`);

  const hardErrors = brokenLinks.length + spaceLinks.length;
  const total = hardErrors + nav.length;
  console.log(total === 0 ? "\n全部链接可达。" : `\n合计 ${total} 处待修复。`);
  if (hardOnly && nav.length > 0) {
    console.log(
      `硬错误 ${hardErrors} 处；另有 ${nav.length} 条待补导航，不阻断本次检查。`,
    );
  }
  process.exit((hardOnly ? hardErrors : total) > 0 ? 1 : 0);
}

process.exit(0);
