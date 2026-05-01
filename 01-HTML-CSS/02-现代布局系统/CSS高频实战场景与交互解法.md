# CSS 高频实战场景与交互解法

告别死记硬背属性，基于真实业务场景，提取最优雅的 CSS 解决方案。

---

## 场景一：完美的 Sticky Footer（粘性页脚）

**痛点场景**：一个经典的后台管理页面或文章展示页。当页面内容很少时，页脚（Footer）会跟着内容跑到屏幕中间，下面留出一大片空白，极丑；当内容足够多时，页脚又需要被正常推到底部，跟随滚动。
**过去的做法**：用 JS 计算 `window.innerHeight - headerHeight - contentHeight`，动态赋高度，非常容易出 Bug 且屏幕拉伸时需防抖。
**优雅解法（Flexbox）**：

```css
/* 页面最外层容器（通常是 body 或 #app） */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* 最小高度撑满整屏 */
}

.main-content {
  /* 魔法属性：让主体内容区域吸收所有剩余空间 */
  /* 当内容不足时，它会自动撑开把 footer 挤到底部；当内容多时，它由内容自身撑开 */
  flex: 1;
}

.footer {
  /* 正常写高和样式即可，无需绝对定位 */
  height: 60px;
}
```

## 场景二：响应式网格布局（告别 @media 查询）

**痛点场景**：商品列表页或数据卡片页，在 PC 端显示 4 列，在平板显示 2 列，在手机显示 1 列。
**过去的做法**：写长串的 `@media (max-width: 768px)` 和断点覆盖。
**现代解法（CSS Grid 自动填充）**：

```css
.card-list {
  display: grid;
  gap: 16px; /* 卡片间距 */

  /* 终极杀招：auto-fit + minmax */
  /* 语义：列宽最小 250px，如果有剩余空间，平分剩余空间（1fr）；空间不够塞下 250px，就自动换行！ */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
```

_仅需这 2 行核心代码，完成适配所有屏幕尺寸的流式卡片布局！_

---

## 场景三：幽灵遮罩层（事件穿透机制）

**痛点场景**：产品要求在页面上浮动一个带有渐变半透明色的“氛围蒙层”，或者页面飘落全屏的雪花动画。但这会带来一个致命问题：**蒙层盖住了下方的按钮，导致用户无法点击内容**。
**过去的做法**：通过 JS 计算点击坐标 `document.elementFromPoint(x, y)` 强行分发事件，或者避免使用全屏遮罩。
**优雅解法（指针事件拦截）**：

```css
.ghost-overlay {
  position: absolute;
  inset: 0; /* 等同于 top:0; right:0; bottom:0; left:0; */
  background: linear-gradient(rgba(0, 0, 0, 0.5), transparent);
  z-index: 999;

  /* 魔法属性：让元素失去物理实态，鼠标点击、悬浮(hover)等所有事件直接“穿透”到下层元素 */
  pointer-events: none;
}
```

## 场景四：纯 CSS 骨架屏（Skeleton Loading）动画

**痛点场景**：数据请求尚未返回时，需要展示一个闪烁的灰色占位块（骨架屏）来安抚用户情绪。
**错误做法**：引入庞大的第三方骨架屏 UI 库，或者使用 GIF 动图。
**优雅解法（线性渐变 + 背景动画）**：

```css
.skeleton-box {
  background-color: #f3f3f3;
  border-radius: 4px;

  /* 用线性渐变画一道倾斜的“高光” */
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.5) 20%,
    rgba(255, 255, 255, 0) 40%
  );
  background-size: 200% 100%;

  /* 动起来！背景坐标位移 */
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
```
