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

### 高效记忆：一句口诀 + 主力/备胎

不用死背七八个属性，抓住一句话：**「根、浮、绝、非 visible 的 overflow、非普通的 display、flow-root」**。

| 触发方式                                              | 记忆钩子                                   |
| ----------------------------------------------------- | ------------------------------------------ |
| 根元素 `<html>`                                       | 页面天生的「根 BFC」，一切的起点           |
| `float` 不为 none                                     | **浮**——浮动元素自己就活在独立小世界       |
| `position: absolute / fixed`                          | **绝**——绝对定位脱离文档流，自成一体       |
| `overflow` 不为 `visible`（hidden/auto/scroll）       | 「管住溢出」→ 顺带建了个 BFC（**最常用**） |
| `display: inline-block / table-cell / flex / grid` 等 | 这些「非普通块」的显示类型                 |
| `display: flow-root`                                  | **专为造 BFC 而生**，语义化、零副作用      |

**实战只需记「主力 + 备胎」两个：**

- 日常清浮动 / 防塌陷，首选 **`overflow: hidden`**（顺口、通用），但它有裁剪溢出的副作用。
- 想干净无副作用，用 **`display: flow-root`**——「flow-root」直译就是「流的根」，词本身就说明了作用：在这里开一个新的文档流根节点。

> 💡 一句话：**日常 `overflow:hidden`，要无副作用用 `flow-root`，其余（float / 绝对定位 / flex 子项）大多是「顺带」触发，不必刻意背。**

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
.parent {
  background: lightblue;
}

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
.child {
  margin-top: 20px;
}

/* ❌ 子元素的 margin-top 折叠到父元素外面 */
.parent {
  background: lightblue;
}

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
<div style="display: flow-root;">
  <!-- BFC 容器 -->
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
.right {
  background: lightblue;
}

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

---

## 五、脱离文档流（与 BFC 的因果链）

「文档流」就是元素默认**从上到下、从左到右依次排队占位**的规则。脱离文档流 = **让元素跳出队列，不再占用原空间，也不再影响后续元素排布**。

### 5.1 脱离文档流的方式：只有「三条」

| 方式                  | 脱离程度                                                | 记忆钩子                                 |
| --------------------- | ------------------------------------------------------- | ---------------------------------------- |
| `float: left / right` | **半脱离**：块盒脱流，但行内文字仍会环绕它              | 浮动初衷是「文字绕图」，所以不敢完全脱离 |
| `position: absolute`  | **完全脱离**：参照最近的定位祖先                        | 「绝对」= 彻底不占位，别人当它不存在     |
| `position: fixed`     | **完全脱离**：参照视口（祖先有 transform 等时会被夺走） | fixed 是 absolute「钉死在屏幕上」的特例  |

**口诀：「浮动半脱、绝对全脱、固定钉屏」。**

- `position: relative` **不脱离**——只是视觉偏移，原坑位仍给它留着（高频考点，别记错）。
- `position: sticky` **不算脱离**——是「相对 + 固定」的混合，滚动到阈值前完全占位。

### 5.2 脱离文档流的作用

1. **自由定位覆盖层**：弹窗、下拉菜单、Tooltip、悬浮按钮，要「盖」在内容上而不挤占空间，靠 `absolute/fixed`。
2. **实现文字环绕**：`float` 的半脱离特性，专门做「图片左浮、文字环绕」的经典排版。
3. **构建定位基准**：「相对定位父 + 绝对定位子」做角标、关闭按钮、图上文字等精准定位。
4. **性能与层级控制**：脱流元素常单独成层，配合 `z-index` 管理层叠（接层叠上下文）。

### 5.3 因果链：把四个概念串成一条线

一个反直觉但关键的副作用：元素一旦脱流，**父容器就「看不见」它了**——算高度时不把脱流子元素算进去，导致父高度塌陷。这正是「浮动导致父元素高度塌陷 → 需要清浮动」的根源，而**清浮动的本质就是给父元素造一个 BFC**（BFC 计算高度时会把浮动子元素纳入）。

> 🔗 **一条因果链记牢四个概念**：
> **脱离文档流 → 父高度塌陷 → 清浮动 → 本质是建 BFC（BFC 会把浮动子元素纳入高度计算）**。
> 比孤立记忆牢得多。
