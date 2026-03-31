# Scoped Custom Element Registries（作用域自定义元素注册表）

> 来源：[Chrome Developers Blog](https://developer.chrome.com/blog/scoped-registries?hl=en) | 日期：2026-03-09

## 核心内容

Chrome/Edge 146 起正式默认启用 **Scoped Custom Element Registries**（由 Microsoft Edge 团队主导开发）。

之前所有自定义元素都注册在全局 `window.customElements`，多个独立库定义同名标签（如 `<my-button>`）会直接报错崩溃。Scoped Registry 允许创建独立的注册表，彻底解决 micro-frontend 场景下的命名冲突问题。

## 关键知识点

- **创建独立注册表**：`new CustomElementRegistry()` 替代全局 `window.customElements`
- **三种作用域方式**：
  1. **Shadow Root**：`attachShadow({ mode:'open', customElementRegistry: registry })`
  2. **独立文档**：`registry.initialize(doc)` 绑定到 `createHTMLDocument()` 创建的文档
  3. **单个元素**：`document.createElement('tag', { customElementRegistry: registry })`
- **声明式 Shadow DOM 支持**：`<template shadowrootmode="open" shadowrootcustomelementregistry>` 配合 `registry.initialize(shadow)`

## 代码示例

```js
// 创建独立注册表
const registry = new CustomElementRegistry();
registry.define('my-card', class extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Hello from scoped registry!';
  }
});

// 绑定到 Shadow Root
const shadow = host.attachShadow({
  mode: 'open',
  customElementRegistry: registry,
});
shadow.innerHTML = '<my-card></my-card>';
```

## 面试相关

- 什么是 Custom Elements naming collision 问题？如何解决？
- Scoped Registry 和全局 `window.customElements` 的区别？
- micro-frontend 组件隔离方案有哪些？

## 相关笔记

- [[Web Components 基础]]
- [[Shadow DOM]]

---

→ 内容与 `01-HTML-CSS/CSS新特性/` 目录相关（Web Components / Shadow DOM 分类），可归入该目录
