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
