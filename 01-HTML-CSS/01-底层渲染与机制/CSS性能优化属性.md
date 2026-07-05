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
.button:hover {
  will-change: transform;
}
.button:active {
  transform: scale(0.95);
}
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

## 五、创建合成层（Compositing Layer）的方式

> ⚠️ 先厘清：这里的「图层」指合成阶段的 **合成层 / GraphicsLayer**（Composite 阶段的性能行为，GPU 单独栅格化的一块位图），与「层叠上下文 Stacking Context」（Layout/Paint 阶段管 Z 轴谁盖谁的语义）是**两回事**。**能建层叠上下文 ≠ 会提升成合成层。**

### 按可靠程度分三档

**第一档：几乎必然独立成层（显式提升）**

| 方式                                              | 说明                                   |
| ------------------------------------------------- | -------------------------------------- |
| `transform: translateZ(0)` / `translate3d(0,0,0)` | 经典 hack 式强制提层，触发 3D 上下文   |
| 3D `transform`（带 Z 轴变换）                     | 进入 3D 渲染上下文，静态写上即提层     |
| `will-change: transform / opacity / filter`       | **现代最推荐**——语义化预声明「我要变」 |
| `<video>` / `<canvas>` / `<iframe>` / WebGL       | 内容本身由独立管线绘制                 |

**第二档：动画 / 交互进行时成层**

| 方式                                        | 说明                         |
| ------------------------------------------- | ---------------------------- |
| 正在跑的 `transform` / `opacity` 动画或过渡 | 动画期间提层，结束后可能回收 |
| `filter` 动画                               | 变化期间提层                 |
| `position: fixed`（部分浏览器 / 滚动场景）  | 为滚动时不重绘而单独成层     |

**第三档：隐式提升（被动、易踩坑）**

| 方式                    | 说明                                                       |
| ----------------------- | ---------------------------------------------------------- |
| **重叠提升（overlap）** | 已提层元素上方重叠了普通元素，后者被迫也提层，避免层级错乱 |

> ⚠️ 第三档是「**层爆炸（Layer Explosion）**」的元凶：给列表某项加 `will-change`，其上方重叠的兄弟被连累一起提层，层数暴涨 → 内存飙升甚至卡顿。

### 「4W」记忆口诀

- **W-transform**：3D 变换 / `translateZ(0)`
- **W-will-change**：`will-change: transform|opacity`（现代首选）
- **W-媒体元素**：`video / canvas / iframe / webgl`
- **W-动画中**：`transform`/`opacity`/`filter` 动画运行时

例外记忆点：**重叠（overlap）是被动提层**，会引发层爆炸。

### 两个高频易错点

**① 静态 `opacity` 一般不提层。** 和 `transform: translateZ(0)`（静态写上就提层）不同，静态的 `opacity: 0.5` 通常**不提层**；只有在**动画/过渡进行中**或用 **`will-change: opacity`** 预声明时才提层。原因：opacity 只影响「位图怎么贴上去」的透明度系数，只有预期它连续变化时才值得花内存单独提层。

**② `will-change` 提层「跟着值走」，不是万能开关。** 是否提层取决于你声明的是**哪个属性**：

| `will-change` 的值                         | 是否创建合成层                   |
| ------------------------------------------ | -------------------------------- |
| `transform` / `opacity` / `filter`         | ✅ 会（这些能靠合成层加速）      |
| `top` / `left` / `margin` / `width` 等几何 | ❌ 不会（走 Layout，提层无意义） |
| `scroll-position`                          | ⚠️ 非普通合成层，是滚动优化      |
| `contents`                                 | ❌ 不提层                        |

> 换句话说：`will-change` 只是「提前告诉浏览器我要变这个属性」，能否提成层由**那个属性本身能不能用合成层加速**决定。

### 关键误区：能提层 ≠ 改动免重绘

真正做到「改动零重绘、只走合成」的**只有 `transform` 和 `opacity`**：`filter` 即便提层，改参数仍要重新栅格化；`will-change` 只是提示；`<video>` 每帧都在重栅格化。所以高性能动画黄金法则依旧是：**只用 `transform` + `opacity` 驱动动画**。

> 💡 各版本 Blink 对「`will-change: filter` / 静态 opacity 到底提不提层」的实现细节有差异，上面是**主流通行规律**而非逐条 spec 硬保证。最权威的验证：Chrome DevTools → **Layers 面板**看每层的 "Compositing Reasons"，会直接写明该层因何被提升。

## 六、其他优化属性

`pointer-events: none` 忽略点击事件，减少事件处理开销。`font-display: swap` 优化字体加载，立即显示备用字体避免 FOIT（Flash of Invisible Text）。

## 七、综合优化示例

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

## 八、性能监控

关键指标：FCP（First Contentful Paint）、LCP（Largest Contentful Paint）、CLS（Cumulative Layout Shift）、FID（First Input Delay）。可使用 `PerformanceObserver` API 监控 `layout-shift` 等性能条目。
