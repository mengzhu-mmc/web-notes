# Chrome 147 元素级 View Transitions（并发 & 嵌套）

> 来源：[Chrome for Developers](https://developer.chrome.com/blog/element-scoped-view-transitions?hl=en) | 日期：2026-03-27

## 核心内容

Chrome 147 正式发布 **Element-scoped View Transitions（元素级视图过渡）**，允许在 DOM 子树上调用 `Element.startViewTransition()` 启动局部视图过渡，而不必像以前那样只能在整个 `document` 上触发。

这解决了以前 View Transitions API 的三大痛点：
1. **不能并发** — 同一时刻只能有一个 document 级别的过渡
2. **不能嵌套** — 嵌套过渡会互相干扰
3. **fixed 定位元素层叠问题** — 过渡期间 `position: fixed` 的元素会错位

## 关键知识点

- **调用方式变更**：`element.startViewTransition(callback)` 代替 `document.startViewTransition()`
- **Scope root 默认自参与（self-participating）**：scope 根元素自身也参与过渡
- **自动包含嵌套伪元素**：通过 nested view transition groups 实现
- **自动 `contain: layout` + `view-transition-scope: all`**：在过渡期间自动应用到 scope root
- **独立性**：各个元素的过渡互不干扰，页面其他部分保持可交互

## 代码示例

```js
// 以前：整个 document 触发（无法并发）
document.startViewTransition(() => {
  updateList();
});

// 现在：在特定元素上触发（可并发）
listElement.startViewTransition(() => {
  updateList();
});

// 两个列表可同时独立触发过渡
listA.startViewTransition(() => shuffleA());
listB.startViewTransition(() => shuffleB()); // 并发执行，互不影响
```

## 典型场景

- 列表项的拖拽重排动画（多列表独立动效）
- 图片 Grid 过滤 + 侧边栏展开，同时运行不冲突
- 局部组件切换动效，不影响全页面交互

## 面试相关

- View Transitions API 是什么？和 CSS 动画的区别？
- 为什么之前 View Transitions 不能并发？Chrome 147 如何解决？
- `document.startViewTransition` vs `element.startViewTransition` 的适用场景？

## 浏览器支持

- Chrome 147（Stable）✅
- 其他浏览器暂不支持（需 progressive enhancement）

## 相关笔记

- [[browser]] — 浏览器新特性目录

---

→ 内容与 `01-HTML-CSS/CSS新特性/` 目录相关（View Transitions 动效分类），同类文件见 `01-HTML-CSS/CSS新特性/2026-03-30-scroll-triggered-animations.md`，可归入该目录
