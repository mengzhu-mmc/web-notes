# 每日前端扫描 - 2026-03-17

## 🔥 本周重磅：Vite+ 正式开源

**来源**: 掘金前端本周最热
**链接**: https://juejin.cn/frontend

尤雨溪于 3月13日 宣布 **Vite+** 以 MIT 协议全量开源，官网 [viteplus.dev](https://viteplus.dev)。

### 核心要点
- **不是 Vite 升级版，是全新物种** — 一个二进制文件，统一整条前端工具链
- **定位**: "The Unified Toolchain for the Web"
- **合并 7 个项目**: Vite + Vitest + Oxlint + Oxfmt + Rolldown + tsdown + Vite Task → 统一 CLI `vp`
- **两段式设计**: `vp`（全局 CLI）+ `vite-plus`（项目本地包）

### 命令覆盖

| 类别 | 命令 | 替代 |
|------|------|------|
| 开发 | `vp dev` | vite dev |
| 检查 | `vp check` | tsc + ESLint + Prettier |
| Lint | `vp lint` | ESLint |
| 格式化 | `vp fmt` | Prettier |
| 测试 | `vp test` | Jest/Vitest |
| 构建 | `vp build` | vite build |
| 库打包 | `vp pack` | tsup/tsdown |
| Monorepo | `vp run` | turborepo/nx |
| 暂存检查 | `vp staged` | lint-staged |
| 环境管理 | `vp env` | nvm |
| 项目创建 | `vp create` | create-vite |
| 迁移 | `vp migrate` | 手动迁移 |

### 意义
以前需要 npm/pnpm + Vite + ESLint + Prettier + Jest + nvm 各自配置维护，现在 `vp` 一个命令全包。这是前端工具链整合的标志性事件。

---

## 🌐 web.dev: Web Platform 2026年2月新特性

**来源**: web.dev
**链接**: https://web.dev/blog/web-platform-02-2026

Chrome 145、Firefox 148、Safari 26.3 稳定版发布，新特性汇总：

### CSS 新特性
- **`text-justify` 属性** (Chrome 145) — 更精细的文本对齐控制
- **`column-wrap` / `column-height`** (Chrome 145) — 多列布局列可换行，避免水平溢出
- **`shape()` CSS 函数** (Firefox 148) — 用 CSS 语法定义自定义形状 (clip-path/offset-path)
- **`overflow` 支持替换元素** (Firefox 148) — img/video 等可用 overflow 属性

### HTML/DOM
- **Customizable `<select>` listbox** (Chrome 145) — select 可完全自定义渲染
- **HTML Sanitizer API** (Firefox 148) — 安全过滤 HTML，防 XSS

### JavaScript
- **`Iterator.zip()` / `Iterator.zipKeyed()`** (Firefox 148) — 多数据源元素分组迭代
- **Origin API** (Chrome 145) — 封装 origin 概念的新对象

### 安全/性能
- **Device Bound Session Credentials (DBSC)** (Chrome 145) — 会话绑定设备，防 cookie 盗用
- **Zstandard (Zstd) 压缩** (Safari 26.3) — 更快解压、更高压缩比

### Beta 预览 (Chrome 146 / Firefox 149)
- CSS scroll-triggered animations (Chrome 146)
- Sanitizer API (Chrome 146)
- `popover="hint"` (Firefox 149)
- Close Watcher API (Firefox 149)

---

## 📝 web.dev: Baseline Digest 2026年1月

**来源**: web.dev
**链接**: https://web.dev/blog/baseline-digest-jan-2026

### Baseline Newly Available
- **`:active-view-transition` 伪类** — 视图过渡期间样式化根元素
- **Service Worker 支持 JS Modules** — `type: 'module'` 选项
- **Navigation API** — 替代 History API，专为 SPA 设计的现代导航方案
- **`rcap` / `rch` / `rex` / `ric` CSS 单位** — 根字体相关的排版单位
  - `rcap` = 根字体大写字母高度
  - `rch` = 根字体 "0" 字符宽度
  - `rex` = 根字体 x-height
  - `ric` = 根字体 CJK 表意文字宽度（国际化布局利器）

### Baseline Widely Available
- **Two-value CSS `display` 属性** — 如 `display: block flex`

---

## 张鑫旭博客近期文章（已有笔记，跳过重复）
- dialog closedBy 属性 (3/9) → 已录入
- interestfor 悬停 popover (3/4) → 已录入
