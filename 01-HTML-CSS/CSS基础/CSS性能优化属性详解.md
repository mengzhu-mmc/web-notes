# CSS 性能优化属性详解

## 一、contain 属性

`contain` 属性告诉浏览器某个元素及其内容尽可能独立于文档树的其余部分，从而优化渲染性能。

`contain: layout` 隔离元素内部的布局变化，不影响外部元素，适用于独立组件和卡片列表。`contain: paint` 限制元素内容不会绘制到边界外，类似 `overflow: hidden` 但性能更好。`contain: content` 等同于 `contain: layout paint`，适用于内容频繁变化的独立模块。`contain: strict` 是最严格的隔离，等同于 `size layout paint style`。

```css
.card-list .card {
  contain: layout; /* 每个卡片的内部布局变化不会触发整个列表重排 */
}
```

## 二、will-change 属性

`will-change` 提前告知浏览器元素将要发生的变化，让浏览器提前做优化（如创建合成层）。

常用值：`transform`（变换优化）、`opacity`（透明度优化）、`scroll-position`（滚动优化）。

最佳实践：在动画开始前添加（如 `:hover` 时），动画结束后移除（设为 `auto`）。不要对所有元素使用（`* { will-change: transform }` 会消耗大量内存），不要长期保持。

```css
.button:hover { will-change: transform; }
.button:active { transform: scale(0.95); }
```

## 三、content-visibility

```css
.long-article section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* 设置预估高度 */
}
```

跳过不可见内容的渲染，显著提升长列表/长页面性能，类似虚拟滚动的效果。

## 四、GPU 加速技巧

使用 `transform: translateX(100px)` 代替 `left: 100px`（GPU 加速 vs CPU 渲染）。使用 `opacity: 0` 代替 `visibility: hidden`（触发合成层）。`backface-visibility: hidden` 隐藏 3D 变换时的背面，减少渲染计算。`transform: translateZ(0)` 强制创建合成层。

## 五、其他优化属性

`pointer-events: none` 忽略点击事件，减少事件处理开销。`font-display: swap` 优化字体加载，立即显示备用字体避免 FOIT（Flash of Invisible Text）。

## 六、综合优化示例

```css
/* 高性能组件卡片 */
.performance-card {
  contain: layout paint;
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
  will-change: transform;
  transform: translateZ(0);
}

/* 无限滚动列表项 */
.list-item {
  contain: content;
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;
}
```

## 七、现代 CSS 特性补充（CSS 架构与布局）

### @layer — 级联层（CSS Cascade Layers）

`@layer` 用于显式管理 CSS 的优先级层次，解决大型项目中样式覆盖混乱的问题（Chrome 99+）。

```css
/* 声明层的顺序（越靠后优先级越高）*/
@layer base, components, utilities;

@layer base {
  /* 基础样式，优先级最低 */
  button {
    padding: 8px 16px;
    border: 1px solid gray;
  }
}

@layer components {
  /* 组件样式 */
  .btn-primary {
    background: blue;
    color: white;
  }
}

@layer utilities {
  /* 工具类，优先级最高 */
  .mt-4 {
    margin-top: 16px;
  }
}

/* 不在任何 layer 中的样式，优先级高于所有 layer */
.override {
  color: red; /* 总是能覆盖 layer 内的样式 */
}
```

**应用场景**：引入第三方 CSS 库时，将其放在低优先级层，避免覆盖自己的样式：

```css
/* 将 antd/tailwind 等第三方样式放在最底层 */
@layer third-party {
  @import url('antd/dist/reset.css');
}

/* 自己的样式默认在 layer 之外，优先级更高，不会被覆盖 */
.my-button {
  background: green;
}
```

### `@container` — 容器查询

相比 `@media`（基于视口宽度），容器查询基于**父容器的尺寸**来响应式布局，组件可以真正自适应（Chrome 105+）。

```css
/* 1. 先给容器设置 container-type */
.card-container {
  container-type: inline-size; /* 监听宽度变化 */
  container-name: card;        /* 可选：给容器命名 */
}

/* 2. 子元素根据容器尺寸调整样式 */
@container (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}

@container (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}

/* 使用命名容器（当嵌套时避免歧义） */
@container card (min-width: 600px) {
  .card-title {
    font-size: 1.5rem;
  }
}
```

```html
<!-- 同一个卡片组件，放在不同宽度的容器里，样式自动适配 -->
<aside style="width: 200px">
  <div class="card-container">
    <div class="card">窄布局</div>
  </div>
</aside>

<main style="width: 800px">
  <div class="card-container">
    <div class="card">宽布局</div>
  </div>
</main>
```

**`@media` vs `@container`**：媒体查询是"页面级响应式"，适合整体布局；容器查询是"组件级响应式"，适合复用组件。

### CSS 嵌套（Native CSS Nesting）

Chrome 112+ 原生支持 CSS 嵌套，无需 Sass/Less 预处理器（但要注意选择器语法差异）。

```css
/* 原生 CSS 嵌套 */
.card {
  padding: 16px;
  border-radius: 8px;

  /* 嵌套子元素选择器（需要 & 或直接嵌套） */
  .title {
    font-size: 1.2rem;
    font-weight: bold;
  }

  /* & 代表父选择器 */
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  &.active {
    border-color: blue;
  }

  /* 嵌套媒体查询 */
  @media (max-width: 600px) {
    padding: 8px;
  }

  /* 嵌套容器查询 */
  @container (min-width: 400px) {
    display: flex;
  }
}

/* 注意：纯标签选择器嵌套需要加 & 前缀（避免歧义）*/
.list {
  & li {      /* ✅ 推荐写法 */
    color: gray;
  }
  /* li { }  ← Chrome 120 以前不支持直接嵌套标签选择器 */
}
```

**与 Sass 的区别**：
- 原生嵌套中标签选择器需要 `&` 前缀（Sass 不需要）
- 原生嵌套支持 `@media` / `@container` 等规则嵌套
- 编译后产物与 Sass 相同，但省去了编译步骤

---

## 八、性能监控

关键指标：FCP（First Contentful Paint）、LCP（Largest Contentful Paint）、CLS（Cumulative Layout Shift）、FID（First Input Delay）。可使用 `PerformanceObserver` API 监控 `layout-shift` 等性能条目。
