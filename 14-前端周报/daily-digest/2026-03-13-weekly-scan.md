# 前端周报扫描 — 2026-03-13

> 来源：张鑫旭博客、CSS-Tricks、JavaScript Weekly #776 (Mar 10)

---

## 🔥 重点文章

### 1. HTML dialog 元素新增 closedBy 属性
- **来源**: 张鑫旭 (2026-03-09)
- **链接**: https://www.zhangxinxu.com/wordpress/2026/03/html-dialog-closedby/
- **要点**:
  - `<dialog closedBy="any">` 支持点击蒙层关闭弹框，无需 JS
  - 三个枚举值：`any`（全部允许）、`closerequest`（仅 Esc + close()）、`none`（仅 JS close()）
  - 默认行为：`showModal()` → closerequest，`show()` → none
  - JS API: `dialog.closedBy` 可读写
  - Safari 暂不支持，有 Polyfill: `dialog-closedby-polyfill`

### 2. Popover API vs Dialog API 选型指南
- **来源**: CSS-Tricks / Zell Liew (2026-03-02, 更新 03-10)
- **链接**: https://css-tricks.com/popover-api-or-dialog-api-which-to-choose/
- **要点**:
  - **Popover API** → 适用于大多数弹出层（自动焦点管理、ARIA 连接、轻关闭）
  - **Dialog API (showModal)** → 仅用于模态对话框（自动 inert、焦点陷阱、屏幕阅读器隔离）
  - Popover API 内置功能远强于 Dialog API（无需 JS 写 aria-expanded 等）
  - Dialog 在不用 showModal 时缺少自动焦点管理和轻关闭
  - 未来 invoker commands 提案将让 Dialog API 同样简便

### 3. HTML interestfor 属性与 Hover popover
- **来源**: 张鑫旭 (2026-03-04)
- **链接**: https://www.zhangxinxu.com/wordpress/2026/03/css-interestfor-invoker-target-source/
- **要点**: 纯 HTML+CSS 实现任意 Hover 悬停交互效果，关键属性 `interestfor`

---

## 📰 JavaScript Weekly #776 (Mar 10) 要闻

### 重大发布
- **Solid 2.0.0 Beta** — 原生 async 支持，computations 可返回 Promise/async iterables；`<Suspense>` 退役，改为 `<Loading>`；新增 `action()` 原语
- **TypeScript 6.0 RC** — 为 Go 驱动的 TS 7.0 做铺垫，主要是 tsconfig.json 变更
- **Astro 6.0** — dev 模式使用 Vite Environment API，新增 Fonts API
- **Node.js 25.8.0** — 新增 `--permission-audit` 选项（权限模型 warning-only 模式）
- **React Native 0.85 RC.0**
- **ESLint v10.0.3**
- **Knockout 3.5.2** — 经典 MVVM 库 6 年来首次更新

### TC39 动态
- 第 113 次会议进行中，**Temporal API 升级 stage 4** 提上议程

### 值得关注的工具
- **ArkType 2.2** — TypeScript 类型即运行时校验器，新增 `type.fn` 运行时校验函数
- **SQLite JS 1.3** — 在 JS 中编写自定义 SQLite 函数
- **melonJS 18.0** — 轻量 HTML5 2D 游戏引擎

### 精选文章
- **Patreon: 7 年 TypeScript 迁移 11000 个文件** — JS→TS 大型迁移实战
- **Wikipedia 遭 JS 蠕虫攻击** — 利用 Wikimedia 全局脚本漏洞破坏 4000 页面

---

## 📊 CSS-Tricks 近期
- **What's !important #6** — `:heading` 伪类、`border-shape`、文本中间截断等新特性速览
- **z-index 的价值** — 堆叠上下文管理策略
- **居中绝对定位元素的新方法** — 3 行 CSS 搞定

---

*下次扫描: 2026-03-14 或 2026-03-15*
