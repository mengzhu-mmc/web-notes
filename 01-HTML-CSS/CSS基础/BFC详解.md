# BFC 详解

## 面试高频考点

- 什么是 BFC？
- 如何触发 BFC？
- BFC 有什么作用？

---

## 一、什么是 BFC

BFC（Block Formatting Context，块级格式化上下文）是一个独立的渲染区域，内部元素的布局不会影响外部元素。

## 二、触发 BFC 的方式

**float 属性：** `float: left` 或 `float: right`

**position 属性：** `position: absolute` 或 `position: fixed`

**display 属性：** `inline-block`、`flex`、`inline-flex`、`grid`、`inline-grid`、`table-cell`、`flow-root`（最推荐，无副作用）

**overflow 属性：** `hidden`、`auto`、`scroll`（只要不是 `visible` 都可以）

**其他：** `contain: layout/content/paint`、`column-count` 或 `column-width` 不为 auto、根元素 `<html>` 本身就是 BFC

## 三、最佳实践

- `overflow: hidden` — 最常用，但会裁剪溢出内容
- `display: flow-root` — 专门用来创建 BFC，无副作用，**最推荐**
