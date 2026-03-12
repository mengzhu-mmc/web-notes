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

## 七、性能监控

关键指标：FCP（First Contentful Paint）、LCP（Largest Contentful Paint）、CLS（Cumulative Layout Shift）、FID（First Input Delay）。可使用 `PerformanceObserver` API 监控 `layout-shift` 等性能条目。
