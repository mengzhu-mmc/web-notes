# HTML interestfor 属性 — 纯 HTML hover popover

> 来源：张鑫旭博客 2026-03-04

## 是什么

`interestfor` 属性可以实现**纯 HTML + CSS 的 hover popover 效果**，无需任何 JavaScript。

## 基本用法

```html
<button interestfor="myPopover">Hover me</button>
<div id="myPopover" popover>悬浮内容</div>
```

鼠标悬浮 button 时，对应的 popover 自动展示。

## 意义

继 Popover API 支持点击交互后，现在 hover 交互也可以纯 HTML/CSS 实现，大幅减少 JS 交互代码。

## 关联知识

- `popover` 属性 / Popover API
- `popovertarget` 属性（点击触发）
- `interestfor` 属性（hover 触发）

#HTML #popover #interestfor #原生API
