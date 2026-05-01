# 现代 CSS 冷门实用 API 与魔法属性

在常规业务开发中，我们往往被框架组件库包裹，只用到最基础的 CSS 属性。但如果深入 CSS 规范的演进，有许多冷门但极具“杀伤力”的 API，它们能够用一行代码解决曾经需要几百行 JS 才能搞定的痛点。

掌握这些“别人不知道的 API”，是拉开技术差距、展现技术深度的绝佳切入点。

---

## 1. 极致的体验控制：`overscroll-behavior` (防滚动穿透)

**痛点场景**：当一个内部可滚动的弹窗（Modal）或侧边栏滚动到底部时，继续滚动鼠标滚轮，会导致**背后的整个页面也跟着滚动**（这叫“滚动穿透”或“滚动链 Scroll Chaining”）。
**过去的做法**：JS 监听 `touchmove` 或 `wheel` 事件，各种 `e.preventDefault()` 并判断滚动高度，坑极大。
**现在的杀招**：

```css
.modal-body {
  overflow-y: auto;
  /* 魔法属性：到达滚动边界时，不将滚动行为传递给父元素 */
  overscroll-behavior: contain;
  /* 甚至可以阻止浏览器的原生拉拽刷新（Pull-to-refresh） */
  /* overscroll-behavior-y: none; */
}
```

## 2. 图像与视频对象适配：`object-fit` 和 `object-position`

**痛点场景**：用户上传的头像或商品图比例不一，直接设宽高会被严重拉伸变形（变胖/变瘦）。
**过去的做法**：用 `background-image` 配合 `background-size: cover` 和 `background-position: center`。但 `img` 标签对 SEO 更好，也方便懒加载。
**现在的杀招**：将 `background-size` 的逻辑直接搬到了 `<img>` 和 `<video>` 标签上！

```css
.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  /* 保持比例裁剪填充（cover），或者保持比例缩放适应（contain） */
  object-fit: cover;
  /* 还可以调整裁剪聚焦的位置，比如聚焦人脸靠上的位置 */
  object-position: center 20%;
}
```

## 3. 丝滑滚动与对齐：`scroll-snap-type` (CSS 原生轮播图/全屏滚动)

**痛点场景**：实现像抖音/TikTok 那样的“一滑一整屏”，或者商品列表横向滑动时，松手自动吸附对齐到下一个商品边缘。
**过去的做法**：引入 Swiper.js，或者手写极其复杂的 `touchstart/move/end` 缓动算法。
**现在的杀招**：CSS 滚动捕捉机制（Scroll Snap）。

```css
/* 1. 给父容器设置滚动吸附模式（Y轴、强制吸附） */
.full-page-container {
  overflow-y: scroll;
  height: 100vh;
  scroll-snap-type: y mandatory; /* x 轴横排则用 x mandatory */
}

/* 2. 给每个子页面设置对齐点（顶部对齐、居中对齐等） */
.page-section {
  height: 100vh;
  scroll-snap-align: start; /* 松手后，自动将此元素的 start(顶部) 吸附到视口的 start */
}
```

## 4. 文本排版大杀器：`text-wrap: balance` & `pretty`

**痛点场景**：一段居中的大标题（如 H1），由于屏幕变窄导致折行。默认折行方式会把**最后一个单词**孤零零地掉到下一行，形成“孤字”（Orphan），排版极丑。
**过去的做法**：手动加 `<br>` 或者通过 JS 动态计算宽度折行。
**现在的杀招**（Chrome 114+ / 117+ 引入）：

```css
h1.title {
  /* Balance：浏览器会自动计算，让多行文本的宽度尽可能均衡，避免“头重脚轻” */
  /* 特别适合短文本标题！千万不要用在长篇段落上，非常消耗性能 */
  text-wrap: balance;
}

p.article {
  /* Pretty：专门为长段落设计，它只关心“防止段落的最后一行出现单个单词”，性能比 balance 好得多 */
  text-wrap: pretty;
}
```

## 5. 动态计算尺寸：`clamp()` (响应式排版终极解)

**痛点场景**：字体大小或元素的宽度，要在手机上最小是 16px，在宽屏上最大是 32px，中间区域随着视口宽度（vw）线性放大。
**过去的做法**：写无数个 `@media` 媒体查询去断点覆盖。
**现在的杀招**：CSS 提供了 `min()`, `max()`, 以及最强大的 `clamp()` 数学函数。

```css
.responsive-title {
  /* clamp(最小值, 首选首选推荐值, 最大值) */
  /* 在 400px 到 800px 屏幕宽度之间，字体会平滑过渡，不需要任何媒体查询 */
  font-size: clamp(1rem, 4vw, 2rem);
}

.flexible-card {
  width: clamp(300px, 50%, 600px);
}
```

## 6. 原生弹窗与顶层：`<dialog>` & `popover` 机制

**痛点场景**：写一个全局对话框/抽屉。最痛苦的就是 `z-index` 层级管理，不管你设多高，遇到父级有 `overflow: hidden` 或者被隔离在新的层叠上下文（比如父级加了 `transform`），弹窗就会被无情截断。
**过去的做法**：React Portal 挂载到 Body。
**现在的杀招**：浏览器原生提供的顶层（Top Layer）机制。不在同一个 DOM 树渲染平面，彻底免疫 `z-index` 冲突。

```html
<!-- HTML 原生支持 -->
<dialog id="myDialog">
  <p>我是原生对话框</p>
  <form method="dialog"><button>关闭</button></form>
</dialog>

<script>
  // 显示模态框（自带遮罩，且默认阻止背后页面交互！）
  document.getElementById("myDialog").showModal();
</script>

<style>
  /* 自定义原生背后的遮罩层 */
  ::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }
</style>
```

> **补充（2024 新特性）**：`<div popover id="my-pop">` 属性更为激进，连 JS 的 `showModal()` 都不用写，直接通过 `<button popovertarget="my-pop">点我</button>` 就能触发脱离层叠上下文的弹出层。

## 7. 一行代码实现暗黑模式：`color-scheme`

**痛点场景**：支持暗黑模式时，浏览器的默认滚动条、原生表单控件（input/checkbox）、页面背景依然是刺眼的亮色。
**现在的杀招**：告诉浏览器当前页面支持的主题模式。

```css
:root {
  /* 告诉浏览器你的页面可以适配亮色和暗色 */
  /* 浏览器会自动把默认背景变成黑色，文字变白，滚动条和原生控件也会变成暗黑风格！ */
  color-scheme: light dark;
}
```

## 8. CSS 原生隔离沙箱：`@scope` (2024+)

**痛点场景**：在一个庞大的老项目里插入一段新代码，或者写一个第三方组件，极度害怕自己的 CSS 被外面的全局样式污染（或者污染外面）。
**过去的做法**：BEM 命名规范（`.block__element--modifier`）、CSS Modules、Vue Scoped 编译时添加 Hash 属性。
**现在的杀招**：原生 CSS 作用域！

```css
/* 定义一个作用域，范围是 .card 内部，但遇到 .card-slot 时停止（甜甜圈作用域 / Donut Scope） */
@scope (.card) to (.card-slot) {
  /* 这里的 img 只会影响 .card 里的 img，且不会影响 .card-slot 里的 img */
  img {
    border-radius: 8px;
  }
  /* :scope 伪类代表作用域根元素本身，即 .card */
  :scope {
    background: #fff;
  }
}
```
