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
