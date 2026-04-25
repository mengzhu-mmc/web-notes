# CSS 现代布局特性 2026

> 收录 CSS Grid 子网格、Masonry 布局、Anchor Positioning 三大布局新特性。

---

## subgrid — CSS Grid 子网格

### 是什么

`subgrid` 允许子元素参与**父网格的轨道（track）**，而不是创建独立的网格。解决了卡片列表中"各卡片内部元素无法对齐"的经典难题（Chrome 117+，Firefox 71+，Safari 16+）。

### 代码示例

```css
/* 父网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto auto; /* 标题、内容、底部 */
  gap: 24px;
}

/* 子项继承父网格的行轨道 */
.card {
  display: grid;
  grid-row: span 3;           /* 占据父网格的 3 行 */
  grid-template-rows: subgrid; /* 继承父网格的行轨道！ */
  gap: 0;
}

.card__header  { /* 自动对齐到父网格第1行 */ }
.card__content { /* 自动对齐到父网格第2行 */ }
.card__footer  { /* 自动对齐到父网格第3行 */ }
```

```html
<div class="grid">
  <article class="card">
    <h2 class="card__header">短标题</h2>
    <p class="card__content">这张卡片的内容很多，占了很多行...</p>
    <footer class="card__footer">查看详情 →</footer>
  </article>

  <article class="card">
    <h2 class="card__header">这是一个很长的卡片标题，会换行显示</h2>
    <p class="card__content">内容较少。</p>
    <footer class="card__footer">查看详情 →</footer>
  </article>
</div>
<!-- 即使标题高度不同，所有卡片的 footer 都会对齐到同一水平线 -->
```

**列方向 subgrid**：

```css
.item {
  grid-column: 1 / -1;          /* 横跨所有列 */
  display: grid;
  grid-template-columns: subgrid; /* 继承父网格的列轨道 */
}
```

### 兼容性

| 浏览器 | 支持版本 |
|--------|---------|
| Chrome | 117+ ✅ |
| Firefox | 71+ ✅ |
| Safari | 16+ ✅ |
| Edge | 117+ ✅ |

**Can I Use**: https://caniuse.com/css-subgrid — 全球支持率约 90%+（2026）

---

## masonry — 瀑布流布局（实验性）

### 是什么

原生 CSS 瀑布流布局，无需 JavaScript 计算，让高度不一的元素自动排列成紧凑的多列瀑布流效果。目前处于**实验性阶段**，各浏览器实现不一。

> ⚠️ **状态（2026.03）**：W3C CSS Working Group 仍在讨论语法。Chrome 实验性支持（需 flag），Firefox 需手动开启，Safari 18.0+ 正式支持（WebKit 阵营率先落地）。

### 代码示例

**语法一（W3C 草案 + Safari 支持）**：

```css
.masonry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: masonry; /* 行方向使用 masonry 算法 */
  gap: 16px;
}
```

**语法二（旧提案，部分浏览器）**：

```css
.masonry-grid {
  display: masonry;
  masonry-template-tracks: repeat(3, 1fr);
  gap: 16px;
}
```

```html
<div class="masonry-grid">
  <div class="item" style="height: 200px">卡片 1</div>
  <div class="item" style="height: 350px">卡片 2（高）</div>
  <div class="item" style="height: 150px">卡片 3（矮）</div>
  <div class="item" style="height: 280px">卡片 4</div>
  <!-- 元素会自动填充到最短的列中，无需 JS -->
</div>
```

**降级方案（JS 实现）**：

```css
/* 不支持 masonry 时，退回普通 grid */
.masonry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* 特性检测 */
@supports (grid-template-rows: masonry) {
  .masonry-grid {
    grid-template-rows: masonry;
  }
}
```

```js
// JS 降级：CSS columns 模拟瀑布流
// 或使用 Masonry.js 库
```

### 兼容性

| 浏览器 | 状态 |
|--------|------|
| Safari | 18.0+ 正式支持 ✅ |
| Chrome | 实验性（`#enable-experimental-web-platform-features`）⚠️ |
| Firefox | 实验性（`layout.css.grid-template-masonry-value.enabled`）⚠️ |
| Edge | 跟随 Chrome ⚠️ |

**关注跟踪**：https://caniuse.com/css-masonry

---

## anchor-positioning — 锚点定位（Chrome 125+）

### 是什么

CSS Anchor Positioning 允许一个元素（浮动层）相对于另一个任意元素（锚点）定位，不再受 `position: relative` 父容器限制。完美解决 Tooltip、Popover、下拉菜单的定位难题（Chrome 125+，正式发布）。

### 代码示例

**基本用法**：

```html
<button class="anchor-btn">悬停我</button>
<div class="tooltip">这是提示文字</div>
```

```css
/* 1. 定义锚点 */
.anchor-btn {
  anchor-name: --my-anchor; /* 给元素命名为锚点 */
}

/* 2. 浮动层相对锚点定位 */
.tooltip {
  position: absolute;
  position-anchor: --my-anchor; /* 绑定锚点 */

  /* anchor() 函数：anchor(<锚点名>, <锚点边> ) */
  top: anchor(bottom);     /* tooltip 顶部 = 锚点底部 */
  left: anchor(center);    /* tooltip 左边 = 锚点中心 */
  transform: translateX(-50%); /* 水平居中 */

  /* margin-trim 等可配合使用 */
  margin-top: 8px;
}
```

**自动翻转（inset-area）**：

```css
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;

  /* inset-area 语法（更简洁）：声明相对方位 */
  inset-area: top center; /* 显示在锚点上方居中 */

  /* 空间不足时自动翻转到下方 */
  position-try-fallbacks: flip-block;
}
```

**动态锚点（JS 绑定）**：

```js
// 动态设置锚点（适用于列表中每一行的操作菜单）
function showMenu(triggerEl, menuEl) {
  triggerEl.style.anchorName = '--row-anchor';
  menuEl.style.positionAnchor = '--row-anchor';
  menuEl.showPopover();
}
```

**Popover + Anchor 组合（最佳实践）**：

```html
<button id="trigger" anchor="my-menu" popovertarget="my-menu">
  打开菜单
</button>

<ul id="my-menu" popover>
  <li>选项 1</li>
  <li>选项 2</li>
</ul>
```

```css
#my-menu {
  position: absolute;
  inset-area: bottom span-right; /* 锚点下方，向右展开 */
  margin: 4px 0;
  position-try-fallbacks: flip-block, flip-inline;
}
```

### 兼容性

| 浏览器 | 状态 |
|--------|------|
| Chrome | 125+ ✅ 正式支持 |
| Edge | 125+ ✅ 正式支持 |
| Firefox | 实验性（flag）⚠️ |
| Safari | 开发中 🚧 |

**Can I Use**: https://caniuse.com/css-anchor-positioning

> **降级方案**：使用 [Floating UI](https://floating-ui.com/) 或 Popper.js 作为 JS 降级。

---

## 相关笔记

- [CSS 基础知识点（含 @layer / container / :has 等现代特性）](../CSS基础/CSS基础知识点.md)
- [CSS 新特性总览](./2026-03-30-web-platform-march-2026.md)
- [dialog-closedby](./dialog-closedby.md)
