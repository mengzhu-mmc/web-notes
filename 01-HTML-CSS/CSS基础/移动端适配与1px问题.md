# 移动端适配与 1px 问题

---

## 一、基本概念

### 物理像素 vs CSS 像素（逻辑像素）

- **物理像素**：屏幕上真实的发光点（硬件）
- **CSS 像素**：代码里写的 `1px`（逻辑单位）
- **设备像素比（DPR）**：`DPR = 物理像素 / CSS像素`

iPhone 14 的 DPR = 3，意味着 CSS 写的 `1px` 实际由 3×3 = 9 个物理像素渲染。

```javascript
// 获取 DPR
window.devicePixelRatio // iPhone 14 返回 3
```

---

## 二、1px 问题

### 问题原因

设计稿上的"1px 边框"是指**1个物理像素**。但 CSS `border: 1px` 在 DPR=3 的屏幕上会渲染成 3 个物理像素宽，比设计稿的要粗。

### 解决方案

#### 方案一：`transform: scaleY(0.5)` — 最常用

```css
.border-1px {
  position: relative;
}
.border-1px::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #e5e5e5;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}
```

**原理**：先画 1px（CSS像素），再用 `scaleY(0.5)` 压缩成 0.5px，在 DPR=2 的屏幕上刚好对应 1 个物理像素。

**四条边版本**：

```css
.border-1px::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 200%; /* 放大2倍 */
  height: 200%;
  border: 1px solid #e5e5e5;
  border-radius: 4px; /* 如需圆角同样需要 ×2 */
  transform: scale(0.5);
  transform-origin: 0 0;
  box-sizing: border-box;
  pointer-events: none;
}
```

#### 方案二：`viewport` meta 缩放（整体方案）

```html
<!-- 根据 DPR 动态设置 viewport 缩放 -->
<meta name="viewport" content="width=device-width, initial-scale=0.5">
```

```javascript
const dpr = window.devicePixelRatio;
const meta = document.querySelector('meta[name=viewport]');
meta.setAttribute('content', `width=device-width, initial-scale=${1/dpr}`);
```

**原理**：把整个页面缩小 1/DPR，所有尺寸按物理像素精确渲染。  
⚠️ **缺点**：影响全局所有元素的尺寸，需要重新设计整套样式，改造成本高。

#### 方案三：`border-image` + SVG（兼容方案）

```css
.border-1px {
  border: 1px solid transparent;
  border-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='none' stroke='%23E5E5E5' stroke-width='0.5'/></svg>") 1 stretch;
}
```

#### 方案四：`box-shadow` 模拟

```css
.border-1px {
  box-shadow: 0 0 0 0.5px #e5e5e5;
}
```

⚠️ 某些安卓机不支持 0.5px，效果不统一。

#### 方案五：直接写 `0.5px`（仅 iOS 支持）

```css
.border-1px {
  border: 0.5px solid #e5e5e5;
}
```

⚠️ Android 不支持，会显示为 0px（不显示）。

### 方案对比

| 方案 | 适用场景 | 兼容性 | 推荐度 |
|------|---------|--------|--------|
| `scaleY(0.5)` | 单条边 | ✅ 全兼容 | ⭐⭐⭐⭐⭐ |
| `scale(0.5)` 四边 | 四条边+圆角 | ✅ 全兼容 | ⭐⭐⭐⭐ |
| viewport 缩放 | 整体项目 | ✅ 全兼容 | ⭐⭐⭐（改造成本高） |
| `0.5px` | iOS H5 | ❌ 仅 iOS | ⭐⭐ |
| box-shadow | 简单场景 | ⚠️ 部分安卓有问题 | ⭐⭐⭐ |

---

## 三、移动端适配方案

### 核心问题

不同手机屏幕尺寸不同，设计稿（通常 375px 或 750px）如何等比适配到所有屏幕。

### 方案一：rem + JS 动态根字体

```javascript
// 设计稿 750px，基准 100px
(function() {
  function setRem() {
    const clientWidth = document.documentElement.clientWidth;
    // 750px 设计稿 → 根字体 100px，其他按比例
    document.documentElement.style.fontSize = 100 * (clientWidth / 750) + 'px';
  }
  setRem();
  window.addEventListener('resize', setRem);
})();
```

```css
/* 设计稿上 200px 的元素 */
.element {
  width: 2rem; /* 200 / 100 = 2 */
}
```

**优点**：兼容性好，方案成熟（手淘 flexible.js）  
**缺点**：需要 JS，字体大小不跟着缩放（需单独处理）

### 方案二：vw / vh（推荐，纯 CSS）

```css
/* 设计稿 750px，1px = 100/750 vw ≈ 0.1333vw */
.element {
  width: 26.667vw; /* 200 / 750 * 100 */
}
```

**工程化写法**：配合 PostCSS 插件 `postcss-px-to-viewport` 自动转换，代码里直接写 px：

```javascript
// vite.config.js
import pxToViewport from 'postcss-px-to-viewport';
export default {
  css: {
    postcss: {
      plugins: [pxToViewport({
        viewportWidth: 750, // 设计稿宽度
        unitPrecision: 5,
        viewportUnit: 'vw',
        exclude: [/node_modules/]
      })]
    }
  }
}
```

**优点**：纯 CSS，无需 JS，代码直观  
**缺点**：极大/极小屏幕可能布局过大/过小，需配合 `max-width` 限制

### 方案三：媒体查询断点（适合 PC 响应式）

```css
/* 移动端优先 */
.container { width: 100%; }

@media (min-width: 768px) {
  .container { max-width: 750px; margin: 0 auto; }
}
@media (min-width: 1024px) {
  .container { max-width: 1200px; }
}
```

### 方案四：Flexible + rem（手淘方案，了解即可）

阿里手淘的 `lib-flexible` 方案：将视口分成 10 份，每份为 1rem，配合 `postcss-pxtorem` 自动转换。现已被 vw 方案替代，了解即可。

### 方案对比

| 方案 | 适用场景 | 推荐度 |
|------|---------|--------|
| vw/vh + PostCSS | 移动端 H5，新项目首选 | ⭐⭐⭐⭐⭐ |
| rem + JS | 兼容性要求高的老项目 | ⭐⭐⭐⭐ |
| 媒体查询 | PC端响应式、多断点布局 | ⭐⭐⭐ |
| Flexible.js | 已废弃，了解即可 | ⭐⭐ |

---

## 四、其他移动端常见问题

### 点击延迟 300ms

原因：早期移动端浏览器等待 300ms 判断是否双击缩放。

解决：
```html
<!-- 禁用缩放，浏览器直接取消 300ms 延迟 -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

或使用 `touch-action: manipulation`：

```css
html { touch-action: manipulation; }
```

### iOS 安全区域（刘海屏）

```css
.footer {
  padding-bottom: env(safe-area-inset-bottom);
  /* 兼容旧语法 */
  padding-bottom: constant(safe-area-inset-bottom);
}
```

HTML 需开启：
```html
<meta name="viewport" content="viewport-fit=cover">
```

### 滚动回弹（橡皮筋效果）

```css
/* 局部滚动开启回弹 */
.scroll-container {
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
}
```
