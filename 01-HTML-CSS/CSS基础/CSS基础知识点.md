# CSS 基础知识点

## 盒模型

### 标准盒模型 vs IE 盒模型

标准盒模型（`box-sizing: content-box`，默认值）：`width`/`height` 只包含内容区域（content），总宽度 = width + padding + border + margin。

IE 盒模型（`box-sizing: border-box`）：`width`/`height` 包含 content + padding + border，总宽度 = width + margin。

**实际计算**：设 `width: 200px; padding: 20px; border: 5px; margin: 10px`：

- 标准盒模型可视宽度：200 + 20×2 + 5×2 = 250px，内容区 200px
- IE 盒模型可视宽度：200px，内容区 200 - 20×2 - 5×2 = 150px

**现代开发推荐**：全局使用 `border-box`，更符合直觉，百分比宽度 + padding 不会导致溢出：

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

**获取元素尺寸的 API**：`offsetWidth`/`offsetHeight` 包含 border，`clientWidth`/`clientHeight` 不含 border，`getBoundingClientRect()` 返回精确渲染尺寸，`getComputedStyle()` 获取 CSS 计算值。

---

## 替换元素与非替换元素

可替换元素的展现效果不由 CSS 控制，宽高由其加载的内容决定（当然 CSS 可以覆盖）。

浏览器去下载 `src` 属性给到的图片，用图片资源替换掉 `img` 标签，浏览器在下载前并不知道图片的宽高。

**MDN 定义**：
> 可替换元素（replaced element）的展现效果不是由 CSS 来控制的。这些元素是一种外部对象，它们外观的渲染，是独立于 CSS 的。CSS 可以影响可替换元素的位置，但不会影响到可替换元素自身的内容。

典型替换元素：`<iframe>`、`<video>`、`<img>`、`<embed>`

仅在特定情况下被作为替换元素处理：`<input>`、`<audio>`、`<canvas>`

---

## link 与 @import 的区别

```html
<link rel="stylesheet" href="myCss.css" type="text/css">

<style>
  @import url("./myCss.css");
</style>
```

1. **从属关系**：`link` 是 HTML 标签，可加载 CSS、定义 rel/rss 等属性；`@import` 是 CSS 语法规则，只能导入样式表
2. **兼容性**：`link` 作为 HTML 元素无兼容性问题；`@import` 是 CSS2.1 语法，老版本浏览器不识别
3. **JS 操作**：可通过 JS 操作 DOM 插入 `link` 标签动态修改样式；`@import` 无法通过 DOM 方法操作
4. **加载时机**：`link` 同步加载；`@import` 异步加载，等页面结构全部加载完后才加载 CSS

---

## 响应式布局方案

### 媒体查询（Media Query）

推荐移动端优先（Mobile First），基础样式为移动端，通过 `min-width` 逐步增强。

常用断点：576px（小屏手机）、768px（平板）、992px（桌面）、1200px（大屏）、1400px（超大屏）。

```css
/* 基础样式（移动端） */
.container { width: 100%; padding: 15px; }

/* 平板 */
@media (min-width: 768px) {
  .container { max-width: 750px; margin: 0 auto; }
}

/* 桌面端 */
@media (min-width: 1024px) {
  .container { max-width: 1200px; }
}
```

常用媒体特性：`min-width`/`max-width`、`orientation: portrait/landscape`、`prefers-color-scheme: dark`、`-webkit-min-device-pixel-ratio: 2`（高清屏）。

### rem 方案

`rem` 相对于根元素（html）的 `font-size`，通过 JS 动态计算根字体大小实现等比缩放：

```javascript
// 设计稿 750px，基准 100px
function recalc() {
  const clientWidth = document.documentElement.clientWidth;
  document.documentElement.style.fontSize = 100 * (clientWidth / 750) + 'px';
}
// 设计稿上 200px 的元素 → CSS 写 width: 2rem
```

### vw/vh 方案

`1vw` = 视口宽度的 1%，`1vh` = 视口高度的 1%。设计稿 750px 下 `1px = 0.1333vw`，可配合 PostCSS 插件（`postcss-px-to-viewport`）自动转换。

### 方案对比

| 方案 | 适用场景 | 特点 |
|------|---------|------|
| 媒体查询 | PC 端响应式 | 断点式适配 |
| rem | 移动端 H5 | 等比缩放，需 JS |
| vw/vh | 移动端 H5 | 纯 CSS，无需 JS，兼容性略差 |

---

## CSS 现代特性（2024~2026）

### @layer 级联层

`@layer` 允许开发者显式声明 CSS 的优先级层级，解决大型项目中选择器权重混乱的问题（Chrome 99+，全面支持）。

```css
/* 声明层级顺序：后面的层优先级更高 */
@layer base, components, utilities;

@layer base {
  a { color: blue; }
}

@layer components {
  .btn { color: green; } /* 优先级高于 base 层 */
}

@layer utilities {
  .text-red { color: red !important; } /* 最高层 */
}

/* 未放入任何层的样式，优先级高于所有 @layer 内的样式 */
a { color: purple; } /* 这会覆盖 @layer base 中的规则 */
```

**核心用途**：
- 管理第三方 CSS 库与业务样式的优先级（把第三方库丢进低优先级层）
- 替代 `!important` 的滥用，让优先级可预测

```css
/* 将第三方库降到最低层 */
@layer vendor {
  @import url('bootstrap.css');
}
/* 业务样式可以轻松覆盖，无需提高选择器权重 */
.btn { background: red; } /* 直接覆盖 bootstrap 的 .btn */
```

---

### container 容器查询

基于**父容器尺寸**而非视口尺寸来应用样式，解决了组件级响应式的核心痛点（Chrome 105+，全面支持）。

```css
/* 1. 将父容器设为查询容器 */
.card-wrapper {
  container-type: inline-size; /* 监听行内尺寸（宽度） */
  container-name: card;        /* 可选：命名容器 */
}

/* 2. 在子元素中基于容器宽度响应 */
@container card (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
  .card__image {
    width: 200px;
  }
}

@container (max-width: 399px) {
  .card {
    display: block;
  }
}
```

**与媒体查询对比**：
| | 媒体查询 | 容器查询 |
|---|---|---|
| 基准 | 视口宽度 | 父容器宽度 |
| 适用 | 页面级布局 | 组件级布局 |
| 复用性 | 同一组件在不同容器位置表现不同需重写 | 组件自适应容器，完美复用 |

---

### :has() 父选择器

CSS 史上最受期待的特性，实现"父元素根据子元素状态变化"（Chrome 105+，Safari 15.4+，Firefox 121+）。

```css
/* 选中含有 img 的 figure 元素 */
figure:has(img) {
  border: 1px solid #ddd;
  padding: 8px;
}

/* 选中"含有 checked 状态 input"的 form */
form:has(input:checked) {
  background: #e8f5e9;
}

/* 表单验证：包含 :invalid 输入框时，提交按钮变灰 */
form:has(:invalid) button[type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}

/* 导航栏含有下拉菜单时，增加 padding */
nav:has(.dropdown:hover) {
  padding-bottom: 20px;
}

/* 相邻兄弟的等价效果（前一个 p:hover 时，后一个 p 变色）*/
p:has(+ p:hover) {
  color: gray;
}
```

---

### color-mix() 函数

在 CSS 中直接混合颜色，无需预处理器（Chrome 111+，全面支持）。

```css
/* 语法：color-mix(in <color-space>, color1 [percent], color2 [percent]) */

.btn-primary {
  /* 将 blue 和 white 各 50% 混合 */
  background: color-mix(in srgb, blue 50%, white);
}

/* 利用 CSS 变量创建色调系统 */
:root {
  --brand: #3b82f6;
}

.tint-10  { background: color-mix(in srgb, var(--brand) 10%, white); }
.tint-20  { background: color-mix(in srgb, var(--brand) 20%, white); }
.tint-50  { background: color-mix(in srgb, var(--brand) 50%, white); }
.shade-20 { background: color-mix(in srgb, var(--brand) 80%, black); }

/* transparent 混合实现带透明度效果 */
.overlay {
  background: color-mix(in srgb, red 30%, transparent);
  /* 等价于 rgba(255, 0, 0, 0.3) */
}
```

---

### CSS 嵌套语法（原生 `&`）

无需 Sass/Less，浏览器原生支持嵌套选择器（Chrome 112+，全面支持）。

```css
/* 传统写法（需要预处理器） */
/* .card { } .card:hover { } .card .title { } */

/* 原生嵌套写法 */
.card {
  padding: 16px;
  border-radius: 8px;

  /* & 代表父选择器 .card */
  &:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,.1);
  }

  /* 后代选择器（可省略 &）*/
  & .title {
    font-size: 1.2em;
    font-weight: bold;
  }

  /* 直接子元素 */
  & > p {
    color: #666;
  }

  /* BEM 变体（注意：必须用 & 开头，否则解析为后代选择器）*/
  &--featured {
    border: 2px solid gold;
  }

  /* 媒体查询也可以嵌套 */
  @media (max-width: 768px) {
    padding: 8px;
    & .title { font-size: 1em; }
  }
}
```

> **注意**：`&` 必须出现在嵌套规则开头，`div & span` 这类写法在浏览器中行为可能与预期不同，建议保持简单嵌套层级。
