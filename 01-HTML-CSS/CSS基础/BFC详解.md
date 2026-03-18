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

```css
.bfc-float {
  float: left; /* 副作用：脱离文档流，需清除浮动 */
}
```

**position 属性：** `position: absolute` 或 `position: fixed`

```css
.bfc-position {
  position: absolute; /* 副作用：脱离文档流 */
}
```

**display 属性：** `inline-block`、`flex`、`inline-flex`、`grid`、`inline-grid`、`table-cell`、`flow-root`（最推荐，无副作用）

```css
/* inline-block */
.bfc-inline-block {
  display: inline-block; /* 副作用：行内排列 */
}

/* flow-root — 最推荐，语义明确，无副作用 */
.bfc-flow-root {
  display: flow-root;
}
```

**overflow 属性：** `hidden`、`auto`、`scroll`（只要不是 `visible` 都可以）

```css
.bfc-overflow {
  overflow: hidden; /* 副作用：裁剪溢出内容 */
  /* overflow: auto 或 scroll 也可以，但会出现滚动条 */
}
```

**其他：** `contain: layout/content/paint`、`column-count` 或 `column-width` 不为 auto、根元素 `<html>` 本身就是 BFC

## 三、BFC 经典应用场景

### 场景一：清除浮动（解决父元素高度塌陷）

**问题：** 子元素全部浮动后，父元素高度变为 0（塌陷）。

```html
<div class="parent">
  <div class="child float-left">浮动子元素</div>
  <div class="child float-left">浮动子元素</div>
</div>
```

```css
.float-left {
  float: left;
  width: 100px;
  height: 100px;
}

/* ❌ 父元素高度塌陷为 0 */
.parent { background: lightblue; }

/* ✅ 触发父元素的 BFC，使其包裹浮动子元素 */
.parent {
  display: flow-root; /* 推荐 */
  /* 或 overflow: hidden; */
  background: lightblue;
}
```

> 💬 **面试一句话：** 父元素触发 BFC 后，计算高度时会将浮动子元素纳入计算，解决高度塌陷问题。

---

### 场景二：阻止外边距折叠（Margin Collapsing）

**问题：** 相邻块级元素（或父子元素）的垂直 margin 会发生合并，取较大值。

```html
<!-- 父子 margin 折叠：子元素的 margin-top "穿透"到父元素外 -->
<div class="parent">
  <div class="child">子元素</div>
</div>
```

```css
.child { margin-top: 20px; }

/* ❌ 子元素的 margin-top 折叠到父元素外面 */
.parent { background: lightblue; }

/* ✅ 父元素触发 BFC，隔离内部 margin，防止折叠 */
.parent {
  display: flow-root;
  background: lightblue;
}
```

```html
<!-- 相邻兄弟元素 margin 折叠：两个 div 间距取 max(20px, 30px) = 30px -->
<div style="margin-bottom: 20px;">上方元素</div>
<div style="margin-top: 30px;">下方元素</div>

<!-- ✅ 用 BFC 容器隔离其中一个，阻止折叠 -->
<div style="margin-bottom: 20px;">上方元素</div>
<div style="display: flow-root;">  <!-- BFC 容器 -->
  <div style="margin-top: 30px;">下方元素</div>
</div>
```

> 💬 **面试一句话：** 同一个 BFC 内的相邻块级元素 margin 会折叠；将元素放入独立 BFC 后，与外部 BFC 的 margin 不再合并。

---

### 场景三：防止文字环绕（自适应两栏布局）

**问题：** 左侧元素浮动后，右侧文字会围绕浮动元素排列（环绕效果）。

```html
<div class="container">
  <div class="left">左侧图片/侧边栏</div>
  <div class="right">右侧文字内容，希望独立成一列，不环绕左侧浮动元素...</div>
</div>
```

```css
.left {
  float: left;
  width: 120px;
  height: 120px;
  margin-right: 12px;
  background: lightcoral;
}

/* ❌ 右侧文字会环绕左侧浮动元素 */
.right { background: lightblue; }

/* ✅ 右侧触发 BFC，BFC 区域不与浮动元素重叠，自动形成两栏 */
.right {
  display: flow-root; /* 宽度自动适应剩余空间 */
  background: lightblue;
}
```

> 💬 **面试一句话：** BFC 区域不会与浮动元素重叠，利用这个特性可以实现简单的自适应两栏布局，左栏固定宽度浮动，右栏触发 BFC 自适应。

---

## 四、最佳实践

- `overflow: hidden` — 最常用，但会裁剪溢出内容
- `display: flow-root` — 专门用来创建 BFC，无副作用，**最推荐**
