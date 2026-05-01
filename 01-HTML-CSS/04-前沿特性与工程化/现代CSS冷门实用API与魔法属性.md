# 现代 CSS 冷门实用 API 与魔法属性

在常规业务开发中，我们往往被框架组件库包裹，只用到最基础的 CSS 属性。但如果深入 CSS 规范的演进，有许多冷门但极具“杀伤力”的 API，它们能够用一行代码解决曾经需要几百行 JS 才能搞定的痛点。

掌握这些“别人不知道的 API”，是拉开技术差距、展现技术深度的绝佳切入点。

---

## 1. 极致的体验控制：`overscroll-behavior` (彻底解决防滚动穿透难题)

**痛点场景深扒**：在移动端或 PC 端，当一个内部可滚动的组件（如抽屉侧边栏 Sidebar、地区选择器、或者弹窗内的长列表 Modal）被滚动到顶端或底部时。如果你继续用力滑动/滚动鼠标滚轮，浏览器的默认行为是将这个多余的“滚动能量”**向上传递给父容器（甚至直接传递给 body）**，导致**背后的整个页面跟着乱窜**。
这种现象被称为“滚动穿透”或“滚动链（Scroll Chaining）”。

**过去极其痛苦的做法**：你需要用 JS 监听容器的 `touchstart`、`touchmove` 事件，精准计算当前内容的 `scrollTop`、`offsetHeight` 和 `scrollHeight`。在滑动到底部且手指继续向下的瞬间，触发 `e.preventDefault()` 来阻止浏览器的默认滚动传递。这不仅会使得滚动失去原生惯性（极其生硬），还容易误伤子元素内部的正常滚动，并且在 iOS Safari 上存在各种坑爹的回弹 Bug。

**现在的 CSS 一行杀招**：

```css
.modal-body {
  /* 必须先设置内部滚动 */
  overflow-y: auto;

  /* 魔法属性 1：到达自身滚动边界时，绝不将滚动行为沿着 DOM 树向上传递给父级 */
  overscroll-behavior: contain;

  /* 魔法属性 2：如果设为 none，不仅阻止滚动传递，连当前容器本身的“触底弹性回弹/过度滚动动画(overscroll glow)”也一起干掉 */
  /* 甚至可以用来干掉手机浏览器默认的“下拉刷新（Pull-to-refresh）”动作 */
  overscroll-behavior-y: none;
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

## 4. 文本排版的大杀器：告别丑陋断行的 `text-wrap` 家族

在传统的响应式设计中，文本排版一直是 CSS 的弱项，尤其是涉及到断行（Line Breaking）的美学问题。

**痛点场景深扒：**

1. **标题“孤岛”问题（Orphans）**：假设你有一个大标题 `<h1>构建下一代极速现代Web应用</h1>`。当屏幕变窄时，排版可能会变成：
   第一行：`构建下一代极速现代Web应`
   第二行：`用`
   这种最后一个字/单词被孤零零地甩在下一行的情况，在设计美学上被称为“孤字 / 孤行”，是非常丑陋的“头重脚轻”。
2. **过去痛苦的做法**：要么由设计师手动指定 `<br>` 的断点，要么引入复杂的 JS 库（如 `balance-text.js`），利用二分查找法动态计算出容器的最佳宽度来强制折行。

**现代 CSS 的原生大招（Chrome 114+）：**

```css
h1.title {
  /* Balance (均衡)：浏览器渲染引擎会自动在后台计算多种换行方案 */
  /* 它会尽量使得每一行的文字宽度近似相等，彻底消灭头重脚轻的情况。 */
  /* 性能警告！：因为要计算最佳断点，它的渲染开销非常大！ */
  /* 规范规定：balance 仅限于对短文本（通常是 6 行以内的标题或副标题）生效，切勿用于大段正文！ */
  text-wrap: balance;
}

p.article {
  /* Pretty (美观)：专为长篇大论的正文设计的大修补！ */
  /* 与 balance 需要平衡每一行不同，pretty 只关注一件事：“绝不能让段落的最后一行出现孤零零的一个单词或汉字”。 */
  /* 它会在上一行提前折断几个词，让最后一行稍微丰满一些。性能比 balance 快得多，适合用作全局正文排版。 */
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
