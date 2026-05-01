# window.devicePixelRatio 核心机制与应用场景

`window.devicePixelRatio` (DPR，设备像素比) 是一个在移动端适配、高清绘图和前端工程化中极其重要，但又经常被滥用的属性。

它返回的是**当前显示设备的物理像素（Physical Pixels）和逻辑像素（CSS Pixels）之间的比例**。
公式可以简化为：`DPR = 物理像素 / CSS像素`

---

## 核心应用场景 1：Canvas 与 WebGL 高清绘图（防模糊）

这是在实际业务开发中，我们**唯一必须强制使用 JS 去获取 DPR** 的高频场景！

**痛点场景**：
如果你在一个 `width: 300px; height: 300px` 的 Canvas 画布上画图，在 PC 或老手机（DPR=1）上很清晰。但在 Retina 屏幕（DPR=2/3）的手机上看，Canvas 内部的线条和图片会显得**异常模糊，充满锯齿**。

**问题成因**：
Canvas 就像一张 JPG 图片，它的内部坐标系统是基于它创建时的真实像素数量的。当你设置 `width=300; height=300` 时，它里面就只有 300×300 个像素点位。
但是由于 CSS 把这块布放到了 DPR 为 3 的屏幕上，手机实际上需要用 900×900 个物理发光点去照亮它，就会像强行放大低清图片一样，导致严重模糊。

**必杀解法（动态放大画布后用 CSS 强行压扁）**：

```javascript
// 1. 获取 Canvas 元素和其 CSS 设定尺寸
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const cssWidth = 300;
const cssHeight = 300;

// 2. 获取当前屏幕的真实 DPR（防呆：部分老环境可能是 null，给一个回退值 1）
const dpr = window.devicePixelRatio || 1;

// 3. 【核心放大】：将 Canvas 画布内部的实际绘图像素点放大 DPR 倍
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;

// 4. 【核心压扁】：用 CSS 控制它在页面上的展示尺寸不变
canvas.style.width = cssWidth + "px";
canvas.style.height = cssHeight + "px";

// 5. 将画笔坐标系也同步缩放（否则画出来的东西全跑到左上角了）
ctx.scale(dpr, dpr);

// 开始正常绘制，现在在 Retina 屏幕上画出来的线条也是极度丝滑锐利的！
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(300, 300);
ctx.stroke();
```

## 核心应用场景 2：根据设备清晰度动态下发不同画质的图片

**痛点场景**：
为了保证 iPhone Pro 等 3 倍屏设备上的图片不模糊，设计师切图时往往给的是 `xxx@3x.png`，也就是体积可能高达几 MB 的超清大图。
如果你为了满足高端手机，给所有低端手机或 PC 端也下发这张 `3x` 大图，不仅严重浪费带宽，还会拖慢页面首屏渲染性能（LCP 变高）。

**解法 1：JS 动态路由判断**：

```javascript
function getOptimalImage(baseSrc) {
  const dpr = window.devicePixelRatio;
  if (dpr >= 3) {
    return baseSrc + "@3x.png";
  } else if (dpr >= 2) {
    return baseSrc + "@2x.png";
  }
  return baseSrc + "@1x.png";
}

// 动态赋值给 img.src
```

**解法 2：现代 HTML 原生解法（`srcset`），连 JS 都不需要写了！**

虽然你可以用 JS 写，但现代前端工程中，更推荐利用 HTML5 提供的响应式图片标签属性，让浏览器引擎在底层自己根据硬件情况和网速去抉择下发哪张图。

```html
<!-- img 的 srcset 属性：浏览器会根据当前设备的 DPR 自动去下载对应的版本 -->
<img
  src="logo@1x.png"
  srcset="logo@1x.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="自适应超清 Logo"
/>
```

---

## （反模式）场景三：不要用 JS 计算 DPR 去解决 1px 问题

曾经的前端刀耕火种时代（如著名的淘宝 `flexible.js` 方案），会根据 `window.devicePixelRatio` 动态修改整个 HTML 的 `meta viewport` 的 `initial-scale`，从而全局解决 1px 的问题。

```javascript
// 曾经非常流行的远古流派（如淘宝旧版 flexible.js，现在已废弃）
const scale = 1 / window.devicePixelRatio;
document
  .querySelector('meta[name="viewport"]')
  .setAttribute(
    "content",
    "width=device-width,initial-scale=" +
      scale +
      ", maximum-scale=" +
      scale +
      ", minimum-scale=" +
      scale +
      ", user-scalable=no",
  );
```

**为什么现在坚决不推荐这么做？**

1. **侵入性过强**：这会导致全站所有的 CSS 逻辑像素都被推翻，第三方 UI 组件库（如 Vant、AntD Mobile）的尺寸全部失效变小。
2. **性能问题**：每次页面加载都要通过 JS 动态重写 meta，导致浏览器二次 Layout 计算。
3. **被 CSS 媒体查询和 PostCSS 取代**：如 CSS 篇所述，现在 1px 问题直接用 CSS 媒体查询 `@media (-webkit-min-device-pixel-ratio: 2)` 或者 `postcss-write-svg` 工程化插件在编译阶段即可解决。**将布局问题还给 CSS，不要麻烦 JS 去插手了。**
