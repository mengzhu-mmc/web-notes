# focusgroup HTML 属性 — 声明式键盘导航

> 来源：[Chrome Developers Blog](https://developer.chrome.com/blog/focusgroup-rfc?hl=en) | 首次记录：2026-03-05 | 状态复核：2026-08-12

## 核心内容

`focusgroup` 是一个声明式 HTML 属性，用于替代传统 roving tabindex 模式中的大量通用 JavaScript，为 toolbar、tablist、menu、listbox 等复合控件提供方向键导航。它在 2026 年 3 月仍处于试验阶段，随后随 Chrome 150 在 2026 年 6 月进入稳定版。

## 关键知识点

- **解决问题**：传统 roving tabindex 需要监听方向键、手动更新 tabindex，还要处理 RTL/disabled/动态增删，每个框架（React、Angular CDK、Fluent UI）都自己实现一遍
- **使用方法**：直接在容器上加 `focusgroup` 属性
- **浏览器自动处理**：
  - 方向键导航（尊重书写方向 RTL/LTR）
  - 自动折叠为单个 Tab stop（无需手动设置 `tabindex="-1"`）
  - 焦点记忆（离开再回来恢复上次焦点位置）
  - 提供合适的 ARIA role
- **兼容策略**：Chrome 150+ 可直接使用；其他浏览器需要特性检测，并保留 roving tabindex 降级实现

## 代码示例

```html
<!-- 传统方式：需要大量 JS -->
<div role="toolbar" id="toolbar">
  <button tabindex="0">Bold</button>
  <button tabindex="-1">Italic</button>
  <button tabindex="-1">Underline</button>
</div>

<!-- focusgroup：零 JS -->
<div focusgroup="toolbar" aria-label="Text formatting">
  <button>Bold</button>
  <button>Italic</button>
  <button>Underline</button>
</div>
```

## 面试相关

- 什么是 roving tabindex 模式？为什么需要它？
- 键盘无障碍访问（a11y）的最佳实践？
- HTML 新属性提案流程（OpenUI → Origin Trial → 标准化）？

## 相关笔记

- Web Accessibility ARIA（待补专题）
- 键盘导航最佳实践（待补专题）

---

→ 内容与 `01-HTML-CSS/CSS新特性/` 目录相关，属 HTML/浏览器新特性分类，可归入该目录
