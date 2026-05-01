# iOS 与移动端高频兼容性坑位指南

在移动端 H5 战场，尤其是面对 iOS Safari 与国产 Android 各种魔改 Webview，往往隐藏着大量违反直觉的兼容性大坑。

---

## 场景一：iOS Safari 底部的“流氓工具栏”遮挡（100vh 陷阱）

**痛点场景**：你希望写一个全屏高度的首屏页面，自信地写下了 `height: 100vh`。结果在 iOS Safari 打开，**页面底部的按钮被 Safari 自带的地址栏/工具栏挡住了！** 因为 iOS 依然把被工具栏遮盖的部分算进了 `100vh` 的高度。
**过去痛苦的做法**：JS 获取 `window.innerHeight` 动态赋值给高度。
**现代 CSS 破局解法（新视口单位）**：

CSS 原生引入了 `dvh` (Dynamic Viewport Height，动态视口高度) 和 `svh` (Small Viewport Height，最小视口高度)。

```css
.full-screen-page {
  /* 退路：兼容老机型 */
  height: 100vh;
  /* 杀招：动态适应地址栏的收起和展开，真实可用高度 */
  height: 100dvh;
}
```

## 场景二：iOS 按钮点击自带灰色半透明背景块

**痛点场景**：你在移动端 H5 写了一个漂亮的渐变按钮或者带图标的 div 按钮。但在苹果手机上，只要用户手指一按（哪怕只是轻触滑动路过），这个按钮就会立马闪过一块巨丑的**半透明灰色方块**。
**问题成因**：iOS Safari 内置的链接点击高亮反馈机制（Tap Highlight）。
**一行代码秒杀**：

```css
button,
a,
.clickable-div {
  /* 干掉默认的点击高亮颜色 */
  -webkit-tap-highlight-color: transparent;
}
```

## 场景三：iOS 滑动极其生硬（失去惯性）

**痛点场景**：你实现了一个内部可滚动的 div（比如抽屉或长列表）。在 Android 上滑动如丝般顺滑，到了 iPhone 上就像是在滑一块充满摩擦力的木板，划一下动一下，**手指离开屏幕，滑动立马停止，毫无惯性**。
**问题成因**：iOS 对于非 `body` 级别的普通 `overflow: scroll` 容器，默认关闭了惯性滑动。
**一行代码秒杀（专治 iOS）**：

```css
.scroll-container {
  height: 300px;
  overflow-y: scroll;
  /* 开启硬件加速级的惯性平滑滚动 (Momentum Scrolling) */
  -webkit-overflow-scrolling: touch;
}
```

## 场景四：表单输入框字体变大导致 iOS 强行放大整个页面

**痛点场景**：一个精心排版的 H5 登录页，用户点击 Input 输入框准备打字的一瞬间，**整个网页突然被强制放大了（Zoom in）**，导致输入框边缘的关闭按钮都跑出了屏幕，体验灾难。
**问题成因**：iOS 系统设定的强制保护机制——如果发现 Input 的 `font-size` 小于 16px，系统会认为字太小了用户看不清，自动放大整个网页（即使你设置了 viewport 的 `user-scalable=no` 在新版 iOS 也会被强制突破）。
**优雅解法（规避系统线）**：

绝不要用 JS 去阻止缩放，而是**顺应机制**：

1. 确保所有 H5 输入框 `input`, `textarea` 的 `font-size` **至少为 16px**。
2. 如果 UI 设计师非要 14px 的输入框视觉怎么办？利用 `transform`！

```css
/* 曲线救国方案 */
.ios-safe-input {
  /* 满足苹果大爷的要求 */
  font-size: 16px;

  /* 想要视觉上的 14px？ (14/16 = 0.875) */
  transform: scale(0.875);
  transform-origin: left center;
}
```

## 场景五：异形屏与刘海/灵动岛适配（安全区）

**痛点场景**：iPhone X 之后，H5 全屏页面的顶部文案被“刘海”挡住，底部按钮被系统“Home指示条（黑线）”挡住。
**优雅解法（安全区环境变量）**：

1. 必须先在 `<meta name="viewport">` 声明中加入 `viewport-fit=cover` 告诉浏览器接管全屏。
2. 使用 CSS 环境变量 `safe-area-inset-*` 给元素留白。

```css
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  width: 100%;

  /* 给底部的 Home 黑线留出呼吸空间 */
  /* constant 是为了兼容老 iOS，env 是现代标准 */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

## 场景六：Android 与 iOS 同码不同效的“天坑”（极其高频）

在移动端开发中，最让前端工程师抓狂的不是某种效果实现不了，而是**同一段极为普通的 CSS，在 iOS 和 Android 上表现出截然不同的视觉 Bug**。以下是四大最经典的“同码不同效”场景及其解法：

### 6.1 单行文本垂直居中（`line-height` 偏上/偏下）

**痛点场景**：你写了一个高度为 24px 的按钮或标签，设置了 `height: 24px; line-height: 24px; font-size: 12px;`。

- **iOS 表现**：完美垂直居中。
- **Android 表现**：文字整体**偏上**（部分机型偏下），就像被削掉了一点头皮。
  **问题成因**：Android 和 iOS 对字体的 Baseline（基线）计算机制完全不同。尤其是中文字体在 Android 某些系统默认字体下，Ascender（升部）和 Descender（降部）极度不平衡。且在字号小于 `14px` 且高度为奇数时，Android 渲染引擎计算出的留白像素无法被平分，直接产生物理级偏差。

**优雅破局解法（Flex 强杀）**：
彻底抛弃用 `line-height = height` 来实现垂直居中这种上古时代的做法！

```css
.badge-tag {
  /* 放弃固定 line-height 的执念 */
  /* line-height: 24px;  <- 删掉 */

  display: flex;
  align-items: center; /* Flex 的魔法：强制基于物理盒子居中，而非字体基线 */
  justify-content: center;
  height: 24px;
  font-size: 12px;

  /* 如果还有微小偏差，利用 transform scale 放大容器缩小字体 */
}
```

### 6.2 圆角被溢出内容破坏（`border-radius` 失效）

**痛点场景**：你有一个带圆角的父容器，里面装了一张图片或者一块背景色区域。为了防止里面的图片把父容器的圆角顶破，你写了：

```css
.card {
  border-radius: 12px;
  overflow: hidden;
}
```

- **Android 表现**：完美切出圆角。
- **iOS Safari 表现**：如果子元素内部有 `transform` 动画，或者某些复合层级较高，**iOS 的 `overflow: hidden` 会突然失效**，四个直角会刺破父容器的圆角漏出来！

**优雅破局解法（强制创建遮罩蒙层）**：
这是 iOS Webkit 内核的历史遗留 Bug。需要用一个 Hack 属性强制把父容器提升到 3D 渲染层并强行隔离边界。

```css
.card {
  border-radius: 12px;
  overflow: hidden;

  /* 专治 iOS 遮罩失效的 Hack 神器 */
  -webkit-backface-visibility: hidden;
  -webkit-transform: translate3d(0, 0, 0);

  /* 现代浏览器更优雅的做法，强制创建隔离的层叠上下文边界 */
  isolation: isolate;
}
```

### 6.3 1px 极细边框变“大粗棍”

**痛点场景**：你按照设计稿写了 `border: 1px solid #ccc;`。

- **PC端/低端 Android**：1px 正常显示。
- **高端 Android (如 2K 屏) / 高清 iOS (Retina 屏)**：因为这些设备的屏幕 DPR（物理像素比）通常是 2 或 3，CSS 中的 1px 会被渲染成 2 个或 3 个物理像素。在手机上看起来就像是一根粗棍子，极度粗糙。

**经典破局解法（伪元素 + 0.5 倍缩放）**：
目前业界最稳妥的方案是利用伪元素画一条真实宽度的边，然后把它“压扁”到 0.5 倍，从而在 Retina 屏幕上达到极细的视觉效果。

```css
/* 以底部 1px 细线为例 */
.hairline-bottom {
  position: relative;
}

.hairline-bottom::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background-color: #ccc;

  /* 核心杀招：利用 Y 轴缩放 0.5 倍 */
  transform: scaleY(0.5);
  transform-origin: 50% 100%;
}

/* 如果是 Retina 3x 屏幕，可以通过媒体查询继续缩放 */
@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
  .hairline-bottom::after {
    transform: scaleY(0.33);
  }
}
```

### 6.4 透明度动画引发的诡异黑块（闪黑）

**痛点场景**：实现一个页面过场的渐显动画或 Modal 的淡入淡出，你使用了 `opacity: 0` 过渡到 `opacity: 1`。

- **Android 表现**：完美淡入淡出。
- **iOS 表现（特别是在原生 App 内嵌 WebView 时）**：在透明度变换的瞬间，元素周围会**闪现出一圈诡异的黑色方块或黑屏**，动画结束后黑块消失。

**问题成因**：iOS 图层合成（Composite）计算时，对 `opacity` 带有背景颜色或子元素的处理出现了丢帧/计算错误。

**优雅破局解法（开启 3D 硬件加速）**：
迫使 iOS 引擎提前将该元素视作独立的 3D 图层进行渲染准备，不再在动画瞬间进行昂贵的即时计算。

```css
.fade-in-modal {
  opacity: 0;
  transition: opacity 0.3s ease;

  /* 杀招：用微小的 3D 属性强开 GPU 硬件加速 */
  transform: translateZ(0);
  /* 辅助 Hack：隐藏背部，防止抗锯齿引发的黑边 */
  -webkit-backface-visibility: hidden;
}
```
