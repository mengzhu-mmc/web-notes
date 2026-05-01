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

### 6.1 为什么坚决不推荐用 `line-height` 做垂直居中？

**痛点场景**：前端新人最爱用的单行文本垂直居中技巧就是 `height: 24px; line-height: 24px; font-size: 12px;`。

- **iOS 表现**：完美垂直居中。
- **Android 表现**：文字整体经常**偏上**（就像被削掉了一点头皮），或者在某些机型上偏下。

**深度成因剖析（文字基线原理）**：
这就需要理解字体的排版盒子模型（Font Metrics）。一个字形的显示空间分为 `Ascender`（升部，如小写字母 d 往上长的部分）和 `Descender`（降部，如小写字母 p 往下长的部分），中间是 `Baseline`（基线）。
当使用 `line-height` 时，浏览器并不是简单地把文字居中，而是**把多余的空白空间（Leading）平均分配到 Ascender 之上和 Descender 之下**。

1. **中文字体的天生缺陷**：Android 系统的默认字体（如思源黑体/Droid Sans Fallback）和 iOS 的（PingFang SC）在设计时，系统字体内置的升降部比例（Ascender/Descender metrics）本身就是不对称的。在安卓上，文字天然就会偏离物理中心。
2. **像素取整带来的物理性破坏**：在奇数高度（例如 `height: 25px`，`font-size: 12px`）时，上下需要分配的留白是 `(25 - 12) / 2 = 6.5px`。但安卓的渲染引擎在处理小数点像素时（特别是字号 < 14px 时），**很多低端机型无法做次像素抗锯齿平滑渲染，直接采用暴力向下取整（变 6px）**，导致肉眼可见的像素级偏离。

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

### 6.3 1px 极细边框变“大粗棍”与真正发丝边（逻辑像素 vs 物理像素）

**痛点场景**：你按照设计稿写了 `border: 1px solid #ccc;`。

- **PC端/低端手机 (DPR=1)**：1px 正常显示为极细边框。
- **高清手机 (Retina屏, DPR=2/3)**：很多开发者会疑惑，DPR 越高屏幕越清晰，那 1px 渲染成 2-3 个物理像素，不还是和原来在低端机上一样粗吗？**为什么视觉上反而觉得它变“粗糙”了，需要去解决呢？**

**深度原理揭秘（不仅是物理尺寸问题，更是设计预期问题）**：

1. **DPR（Device Pixel Ratio，设备像素比）的本质**
   DPR 确实是衡量物理像素密度的。当苹果推出 Retina 屏幕时，为了保证原来的网页（比如一个 `100px` 宽的按钮）在高分屏上不会变得像蚂蚁一样小，系统做了一个强制映射：**让 1 个 CSS 逻辑像素，去点亮 2×2（或 3×3）个真实的物理发光点**。
   所以，你在 CSS 里写的 `1px`，在高分屏上的**物理绝对宽度，确实和低端机是一摸一样的**。

2. **那么，为什么要解决 1px 问题？（设计预期的悖论）**
   真正的问题在于**“相对视觉感知”**与**“设计师的期望”**！
   - **文字与图片更细腻了**：因为有了 2 倍的像素点，手机上的文字边缘抗锯齿更平滑，图片细节更丰富了。这拔高了整体的“视觉细腻度基准”。
   - **边框却还在原地踏步**：在这个极其细腻的环境下，一条由 2 排甚至 3 排发光点组成的 `1px` 边框，显得**笨重、突兀、格格不入**。
   - **设计师的真正诉求**：设计师在做 Retina 设计稿（通常是 750px 宽，两倍图）时，画的那条 1px 极细分割线，指的是**“1 个物理像素”**宽的发丝线（Hairline），而不是 CSS 里的 1 逻辑像素！

**经典破局解法（让 CSS 去点亮真正的 1个物理像素）**：
为了满足设计师“极细发丝边”的审美诉求，我们需要绕过系统的默认放大映射机制。最稳妥的方案是利用伪元素画一条占用 CSS 逻辑像素 `1px` 的边，然后利用 CSS `transform` 将其强行“压扁”。

当你在 DPR 为 2 的屏幕上，把 CSS 的 1px `scaleY(0.5)` 时：
`1 逻辑像素 × 0.5 缩放 × 2 物理映射 = 1 个真实的物理发光点`！
这样，我们就成功在高分屏上，点亮了最细的那唯一一排发光点，实现了真正的发丝边框。

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
