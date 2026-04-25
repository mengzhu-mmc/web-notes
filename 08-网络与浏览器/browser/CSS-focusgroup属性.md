# focusgroup HTML 属性 — 声明式键盘导航

> 来源：[Chrome Developers Blog](https://developer.chrome.com/blog/focusgroup-rfc?hl=en) | 日期：2026-03-05

## 核心内容

`focusgroup` 是一个 **提案中的 HTML 属性**（目前处于 Origin Trial），由微软通过 OpenUI 社区组提出，Chrome/Edge 支持。用一个属性替代传统 "roving tabindex" 模式所需的大量 JS 代码，为 toolbar、tablist、menu、listbox 等复合控件提供原生方向键导航。

## 关键知识点

- **解决问题**：传统 roving tabindex 需要监听方向键、手动更新 tabindex，还要处理 RTL/disabled/动态增删，每个框架（React、Angular CDK、Fluent UI）都自己实现一遍
- **使用方法**：直接在容器上加 `focusgroup` 属性
- **浏览器自动处理**：
  - 方向键导航（尊重书写方向 RTL/LTR）
  - 自动折叠为单个 Tab stop（无需手动设置 `tabindex="-1"`）
  - 焦点记忆（离开再回来恢复上次焦点位置）
  - 提供合适的 ARIA role
- **试用方式**：开启 `about://flags` 中的 Experimental Web Platform features，或 Origin Trial 注册

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

- [[Web Accessibility ARIA]]
- [[键盘导航最佳实践]]

---

→ 内容与 `01-HTML-CSS/CSS新特性/` 目录相关，属 HTML/浏览器新特性分类，可归入该目录
