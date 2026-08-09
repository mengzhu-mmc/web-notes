#!/usr/bin/env node
/**
 * 课程笔记 HTML → Markdown 清洗脚本。
 *
 * 背景：部分课程笔记是从网页直接粘贴的 HTML 片段（带 data-nodeid 属性），
 * 导致 grep 检索不到正文、Obsidian 渲染混乱、无法作为复习材料使用。
 * 本脚本把这类文件转换为标准 Markdown。
 *
 * 用法：
 *   node scripts/clean_course_html.js --dry            # 预览将要处理的文件与转换效果
 *   node scripts/clean_course_html.js --file <path>    # 只处理单个文件
 *   node scripts/clean_course_html.js                  # 处理全部
 *
 * 转换范围：标题、段落、列表、代码块、表格、强调、链接、图片、引用。
 * 同时移除课程页面尾部的「精选评论」区块。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.obsidian', '.trash']);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const fileArgIdx = args.indexOf('--file');
const singleFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

/**
 * 判定是否为 HTML 粘贴稿。
 *
 * 判据只认 `data-nodeid`——课程站导出的 HTML 必带这个属性。
 * 早期版本还用「块级标签数量」做兜底判据，结果把含大量 JSX 的 React 笔记
 * （`</div>`、`</span>` 满篇）误判为粘贴稿，转换时剥掉了示例代码里的标签。
 * 因此这里去掉数量兜底，并额外要求标记出现在代码块之外，
 * 避免「正常笔记里贴了一段 HTML 源码作为示例」被误伤。
 */
function isHtmlPaste(text) {
  if (!/data-nodeid=/.test(text)) return false;
  return /data-nodeid=/.test(stripFences(text));
}

/** 剥掉围栏代码块，用于判定时排除示例代码的干扰。 */
function stripFences(text) {
  const lines = text.split('\n');
  let fence = null;
  const kept = [];
  for (const line of lines) {
    const m = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (m) {
      const char = m[1][0];
      const len = m[1].length;
      if (fence === null) fence = { char, len };
      else if (char === fence.char && len >= fence.len && m[2].trim() === '') fence = null;
      continue;
    }
    if (!fence) kept.push(line);
  }
  return kept.join('\n');
}

const ENTITIES = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&middot;': '·',
  '&times;': '×',
  '&divide;': '÷',
  '&copy;': '©',
  '&reg;': '®',
};

function decodeEntities(s) {
  let out = s;
  for (const [k, v] of Object.entries(ENTITIES)) out = out.split(k).join(v);
  return out.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** 去掉所有标签属性噪音后再取纯文本，用于行内内容。 */
function inlineToMd(html) {
  let s = html;
  // 行内代码优先，避免其内部内容被后续规则改写
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => '`' + decodeEntities(c.replace(/<[^>]+>/g, '')).trim() + '`');
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, c) => `**${c.trim()}**`);
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, c) => `*${c.trim()}*`);
  s = s.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, (_, c) => `~~${c.trim()}~~`);
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, c) => {
    const textContent = c.replace(/<[^>]+>/g, '').trim();
    return href && !href.startsWith('#') ? `[${textContent}](${href})` : textContent;
  });
  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, (_, alt, src) => `![${alt}](${src})`);
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (_, src) => `![](${src})`);
  s = s.replace(/<br\s*\/?>/gi, '  \n');
  s = s.replace(/<[^>]+>/g, ''); // 剩余标签一律剥离
  return decodeEntities(s).replace(/[ \t]+/g, ' ').trim();
}

/**
 * 课程源站的语言标记归一化。
 * - `data-language` 是主流形式，`class="lang-*"` 为另一种。
 * - `xml` 在前端课程里实际几乎都是 HTML 片段；`plain`/`text` 无需高亮。
 * - `java` 保留原样：无法可靠区分「真 Java」与「误标的 JS」，不做猜测性改写。
 */
const LANG_MAP = {
  xml: 'html',
  plain: '',
  text: '',
  '': '',
};

function normalizeLang(lang) {
  if (!lang) return '';
  const l = lang.toLowerCase().trim();
  return l in LANG_MAP ? LANG_MAP[l] : l;
}

/** 从 <code> 开标签里提取语言：支持 data-language 与 class="lang-xxx" 两种写法。 */
function extractLang(codeTag) {
  const byData = codeTag.match(/data-language="([^"]*)"/i);
  if (byData) return normalizeLang(byData[1]);
  const byClass = codeTag.match(/class="[^"]*?lang(?:uage)?-([\w+#-]+)/i);
  if (byClass) return normalizeLang(byClass[1]);
  return '';
}

function convert(html) {
  let s = html;

  // 移除课程页尾部的「精选评论/留言」区块及其后所有内容。
  // 两种形态都要覆盖：HTML 标题 <h3>精选评论</h3>，以及已是 Markdown 的 ### 精选评论。
  s = s.replace(/<h[1-6][^>]*>\s*精选(留言|评论)[\s\S]*$/i, '');
  s = s.replace(/^#{1,6}\s*精选(留言|评论)\s*$[\s\S]*$/im, '');

  // 代码块：<pre><code data-language="js"> 或 class="lang-js" → ```js
  s = s.replace(/<pre[^>]*>\s*(<code[^>]*>)([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, codeTag, code) => {
    const lang = extractLang(codeTag);
    const body = decodeEntities(code.replace(/<[^>]+>/g, '')).replace(/\n+$/, '');
    return `\n\`\`\`${lang}\n${body}\n\`\`\`\n`;
  });
  // 裸 <pre>
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    const body = decodeEntities(code.replace(/<[^>]+>/g, '')).replace(/\n+$/, '');
    return `\n\`\`\`\n${body}\n\`\`\`\n`;
  });

  // 表格
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tbl) => {
    const rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
      [...r[1].matchAll(/<(t[hd])[^>]*>([\s\S]*?)<\/\1>/gi)].map((c) => inlineToMd(c[2]) || ' '),
    );
    if (!rows.length) return '';
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r) => [...r, ...Array(width - r.length).fill(' ')];
    const lines = [`| ${pad(rows[0]).join(' | ')} |`, `| ${Array(width).fill('---').join(' | ')} |`];
    for (const r of rows.slice(1)) lines.push(`| ${pad(r).join(' | ')} |`);
    return `\n${lines.join('\n')}\n`;
  });

  // 引用
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => {
    const body = inlineToMd(c.replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, ''));
    return '\n' + body.split('\n').filter(Boolean).map((l) => `> ${l.trim()}`).join('\n> \n') + '\n';
  });

  s = convertLists(s);

  // 标题
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lv, c) => {
    const t = inlineToMd(c);
    return t ? `\n${'#'.repeat(Number(lv))} ${t}\n` : '';
  });

  // 段落
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => {
    const t = inlineToMd(c);
    return t ? `\n${t}\n` : '';
  });

  s = s.replace(/<hr\s*\/?>/gi, '\n---\n');
  s = s.replace(/<\/?(div|span|section|article|figure|figcaption|tbody|thead)[^>]*>/gi, '');
  s = inlineLeftovers(s);

  // 归一化空行
  return s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trim() + '\n';
}

/**
 * 列表转换：课程稿里存在 <li> 内嵌 <ul>/<ol> 的多级列表，
 * 用非贪婪正则会在内层 </ul> 处提前收尾并留下孤立的 </li>，
 * 因此这里按标签配对扫描，从最内层向外逐层展开，并按层级缩进。
 */
function convertLists(html) {
  let s = html;
  let guard = 0;
  // 反复处理「不含嵌套列表的最内层列表」，直到没有列表标签为止
  while (/<(ul|ol)[^>]*>/i.test(s) && guard++ < 100) {
    const before = s;
    s = s.replace(/<(ul|ol)[^>]*>((?:(?!<(?:ul|ol)[^>]*>)[\s\S])*?)<\/\1>/gi, (_, tag, body) => {
      let n = 0;
      const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => {
        const raw = m[1];
        // 已在内层轮次转换好的 Markdown 子列表：抽出来，缩进后挂到父项下
        const lines = raw
          .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
          .replace(/<\/?p[^>]*>/gi, '\n')
          .split('\n')
          .map((l) => l.trimEnd())
          .filter((l) => l.trim() !== '');
        const own = [];
        const nested = [];
        for (const line of lines) {
          if (/^\s*(?:-|\d+\.)\s/.test(line)) nested.push(line);
          else own.push(inlineToMd(line));
        }
        n += 1;
        const marker = tag.toLowerCase() === 'ol' ? `${n}.` : '-';
        const head = own.filter(Boolean).join(' ');
        const child = nested.map((l) => `  ${l}`).join('\n');
        return [`${marker} ${head}`.trimEnd(), child].filter(Boolean).join('\n');
      });
      return `\n${items.join('\n')}\n`;
    });
    if (s === before) break; // 无法继续匹配，避免死循环
  }
  // 兜底：清掉任何残留的列表标签，防止孤立闭合标签留在正文里
  return s.replace(/<\/?(ul|ol|li)[^>]*>/gi, '');
}

/** 处理散落在纯文本行里的行内标签与实体。 */
function inlineLeftovers(s) {
  return s
    .split('\n')
    .map((line) => (/<[a-z][^>]*>/i.test(line) || /&\w+;|&#\d+;/.test(line) ? inlineToMd(line) : line))
    .join('\n');
}

const targets = singleFile
  ? [path.resolve(ROOT, singleFile)]
  : walk(ROOT).filter((f) => isHtmlPaste(fs.readFileSync(f, 'utf8')));

console.log(`${dryRun ? '[预览] ' : ''}待处理 HTML 粘贴稿：${targets.length} 个\n`);

let changed = 0;
for (const file of targets) {
  const raw = fs.readFileSync(file, 'utf8');
  if (!singleFile && !isHtmlPaste(raw)) continue;
  const out = convert(raw);
  const rel = path.relative(ROOT, file);

  if (dryRun) {
    console.log(`--- ${rel}`);
    console.log(`    ${raw.split('\n').length} 行 → ${out.split('\n').length} 行`);
    if (singleFile) console.log('\n' + out.split('\n').slice(0, 40).join('\n'));
  } else {
    fs.writeFileSync(file, out);
    changed++;
  }
}

if (!dryRun) console.log(`已清洗 ${changed} 个文件。`);
