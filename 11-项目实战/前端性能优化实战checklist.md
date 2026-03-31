# 前端性能优化实战 Checklist

> 面试高频考点 + 实际落地参考。每项标注：**难度** / **收益** / **实现成本**
>
> 难度：⭐低 ⭐⭐中 ⭐⭐⭐高
> 收益：🔥低 🔥🔥中 🔥🔥🔥高
> 实现成本：💰低 💰💰中 💰💰💰高

---

## 一、Core Web Vitals 优化

> Google 搜索排名权重指标，2024年 INP 正式替代 FID。面试必问。

### 核心指标目标值

| 指标 | 全称 | 含义 | 及格线 | 优秀 |
|------|------|------|--------|------|
| **LCP** | Largest Contentful Paint | 最大内容渲染时间 | < 2.5s | < 1.5s |
| **INP** | Interaction to Next Paint | 交互响应延迟（2024替代FID） | < 200ms | < 100ms |
| **CLS** | Cumulative Layout Shift | 累积布局偏移 | < 0.1 | < 0.05 |

---

### 1.1 LCP 优化

**LCP 元素通常是：** 首屏大图、Hero 图片、大段文字块、视频封面

#### ✅ 优化手段

**图片优化（收益最高）**
```html
<!-- 对 LCP 图片使用 fetchpriority="high" -->
<img src="hero.webp" fetchpriority="high" loading="eager" alt="hero" />

<!-- 避免懒加载 LCP 图片！！ -->
<!-- ❌ <img loading="lazy" /> 会推迟 LCP 加载 -->
```

- 难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰
- 将 LCP 图片转为 **WebP / AVIF** 格式，体积减少 30%~70%
- 使用 `<picture>` 标签做格式降级兼容

**预连接 & 预加载**
```html
<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="//cdn.example.com" />
<!-- 预连接（省 TLS 握手时间） -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin />
<!-- 预加载 LCP 图片 -->
<link rel="preload" as="image" href="/hero.webp" />
<!-- 预加载关键字体 -->
<link rel="preload" as="font" href="/fonts/main.woff2" crossorigin />
```

- 难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰

**减少服务端响应时间（TTFB）**
- 使用 CDN 分发静态资源
- 开启 HTTP/2 多路复用
- SSR / ISR 缓存 HTML 片段

- 难度 ⭐⭐ / 收益 🔥🔥🔥 / 成本 💰💰

---

### 1.2 INP 优化

**INP 差的根本原因：** 主线程被长任务（Long Task > 50ms）阻塞

#### ✅ 优化手段

**拆分长任务**
```javascript
// ❌ 一个长任务阻塞 100ms+
function processItems(items) {
  items.forEach(item => heavyCompute(item));
}

// ✅ 用 scheduler.yield() 让出主线程（Chrome 115+）
async function processItems(items) {
  for (const item of items) {
    heavyCompute(item);
    await scheduler.yield(); // 让浏览器处理用户输入
  }
}

// 降级方案：setTimeout(0) 分片
function processInChunks(items, chunkSize = 50) {
  let index = 0;
  function processChunk() {
    const end = Math.min(index + chunkSize, items.length);
    while (index < end) heavyCompute(items[index++]);
    if (index < items.length) setTimeout(processChunk, 0);
  }
  processChunk();
}
```

- 难度 ⭐⭐ / 收益 🔥🔥🔥 / 成本 💰💰

**防抖 & 节流事件处理**
```javascript
// 输入框防抖（300ms 无操作才触发）
const handleInput = debounce((e) => fetchSuggestions(e.target.value), 300);

// 滚动节流（每 16ms 执行一次，对齐 60fps）
const handleScroll = throttle(() => updateScrollPosition(), 16);
```

- 难度 ⭐ / 收益 🔥🔥 / 成本 💰

**避免强制同步布局（Layout Thrashing）**
```javascript
// ❌ 读写交替，触发多次强制回流
elements.forEach(el => {
  const height = el.offsetHeight; // 读（触发回流）
  el.style.height = height + 10 + 'px'; // 写
});

// ✅ 批量读，再批量写
const heights = elements.map(el => el.offsetHeight); // 批量读
elements.forEach((el, i) => el.style.height = heights[i] + 10 + 'px'); // 批量写
```

- 难度 ⭐⭐ / 收益 🔥🔥 / 成本 💰

---

### 1.3 CLS 优化

**CLS 的根本原因：** 元素在渲染后发生位移（图片无尺寸、异步内容插入、字体切换）

#### ✅ 优化手段

**给图片 / 视频设置宽高占位**
```html
<!-- ✅ 给图片设置 width/height，浏览器提前计算布局空间 -->
<img src="photo.jpg" width="800" height="600" alt="" />

<!-- CSS 方案：aspect-ratio -->
<style>
.img-wrapper {
  aspect-ratio: 4 / 3; /* 提前占位，防止布局偏移 */
}
</style>
```

- 难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰

**字体加载策略**
```css
/* font-display: optional — 加载超时直接用系统字体，零 CLS */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: optional;
}
```

- 难度 ⭐ / 收益 🔥🔥 / 成本 💰

**动态内容插入用 transform 替代影响布局的属性**
```css
/* ❌ 会触发回流 */
.toast { top: 10px; }

/* ✅ transform 不触发布局，不影响 CLS */
.toast { transform: translateY(10px); }
```

---

## 二、首屏优化

### 2.1 代码分割（Code Splitting）

**难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰**

```javascript
// React 路由级懒加载（最常见）
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));

// 带错误边界的完整写法
<Suspense fallback={<PageSkeleton />}>
  <Dashboard />
</Suspense>

// 组件级懒加载（重型组件：编辑器、图表等）
const RichEditor = lazy(() => import('./components/RichEditor'));
const Chart = lazy(() =>
  import('./components/Chart').then(m => ({ default: m.BarChart }))
);
```

Vite 自动代码分割配置：
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-antd': ['antd'],
          'vendor-charts': ['echarts'],
        }
      }
    }
  }
}
```

---

### 2.2 资源预加载策略

**难度 ⭐ / 收益 🔥🔥 / 成本 💰**

```html
<!-- preload：当前页面一定会用到，提高加载优先级 -->
<link rel="preload" as="script" href="/main.js" />
<link rel="preload" as="style" href="/critical.css" />
<link rel="preload" as="font" href="/font.woff2" crossorigin />
<link rel="preload" as="image" href="/hero.webp" />

<!-- prefetch：下一页可能用到，利用空闲时间提前下载 -->
<link rel="prefetch" href="/next-page-bundle.js" />
```

JS 动态预加载（鼠标悬停时触发）：
```javascript
// 用户悬停按钮时预加载详情页
button.addEventListener('mouseenter', () => {
  import('./pages/Detail'); // 触发预加载，不阻塞
});
```

---

### 2.3 骨架屏（Skeleton Screen）

**难度 ⭐⭐ / 收益 🔥🔥 / 成本 💰💰**

骨架屏的核心价值：**降低用户感知等待时间，减少 CLS**

```jsx
// React 骨架屏实现
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-avatar" />
      <div className="skeleton-line" style={{ width: '60%' }} />
      <div className="skeleton-line" style={{ width: '80%' }} />
    </div>
  );
}

// CSS 动画
.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 2.4 关键 CSS 内联（Critical CSS）

**难度 ⭐⭐⭐ / 收益 🔥🔥 / 成本 💰💰💰**

将首屏渲染所需 CSS 内联到 `<head>`，消除渲染阻塞：
```html
<head>
  <!-- 内联关键 CSS，避免白屏 -->
  <style>
    /* 首屏布局关键样式 */
    .header { display: flex; height: 60px; }
    .hero { min-height: 400px; }
  </style>
  <!-- 非关键 CSS 异步加载 -->
  <link rel="preload" href="/styles.css" as="style" onload="this.rel='stylesheet'" />
</head>
```

工具推荐：`critical`（npm包）、Vite 插件 `vite-plugin-critical`

---

## 三、运行时优化

### 3.1 虚拟列表（Virtual List）

**难度 ⭐⭐⭐ / 收益 🔥🔥🔥 / 成本 💰💰**

**使用场景：** 列表条目 > 500 条，且需要全量展示（不能分页）

**原理：** 只渲染可视区域的 DOM 节点（通常 10-20条），滚动时复用节点

```jsx
// 使用 react-window（推荐）
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style} className="list-item">
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}        // 容器高度
      itemCount={items.length}
      itemSize={50}       // 每行高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 不定高虚拟列表 → 用 VariableSizeList 或 react-virtual
```

面试数据：
- 10万条数据全量渲染 → 页面卡顿（内存占用可达 500MB+）
- 虚拟列表后 → 始终只有 ~20 个 DOM 节点，帧率稳定 60fps

---

### 3.2 Web Worker

**难度 ⭐⭐⭐ / 收益 🔥🔥🔥 / 成本 💰💰💰**

**使用场景：** 计算密集型任务（数据处理、图像处理、加解密、复杂算法）放入 Worker，避免阻塞主线程

```javascript
// worker.js
self.onmessage = function(e) {
  const { data } = e;
  // 耗时计算（如大数组排序、CSV 解析）
  const result = heavyCompute(data);
  self.postMessage(result);
};

// main.js
const worker = new Worker('/worker.js');
worker.postMessage(largeData);
worker.onmessage = (e) => {
  console.log('计算结果:', e.data);
};

// Vite 中使用 Worker
import MyWorker from './worker.js?worker';
const worker = new MyWorker();
```

**适合场景清单：**
- 大数组过滤/排序/聚合（如 10万行表格数据处理）
- 文件 MD5 计算
- 图片压缩/滤镜处理
- 复杂的 JSON 序列化/反序列化
- ❌ 不适合：DOM 操作（Worker 无法访问 DOM）

---

### 3.3 WebAssembly（WASM）使用场景

**难度 ⭐⭐⭐ / 收益 🔥🔥🔥 / 成本 💰💰💰**

**使用场景：** 需要接近原生性能的密集计算

| 场景 | 代表产品 | 性能提升 |
|------|----------|----------|
| 视频编解码 | Bilibili WebCodecs | 3-10x |
| 图像处理 | Photoshop Web | 可行性突破 |
| 加解密运算 | 各类 Web 加密库 | 2-5x |
| 物理引擎/3D | Three.js + Ammo.js | 2-4x |
| 音频处理 | WebAudio Worklet | 延迟降低 |

```javascript
// 使用 WASM 模块（以 ffmpeg.wasm 为例）
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });
await ffmpeg.load();
ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
await ffmpeg.run('-i', 'input.mp4', 'output.mp4');
const data = ffmpeg.FS('readFile', 'output.mp4');
```

**面试回答要点：** WASM 是 Web 的"底层加速器"，不是替代 JS，而是补充——JS 做 UI 交互，WASM 做计算密集型任务。

---

### 3.4 React 渲染优化

**难度 ⭐⭐ / 收益 🔥🔥 / 成本 💰**

```javascript
// useMemo 缓存计算结果
const sortedList = useMemo(
  () => items.slice().sort((a, b) => b.score - a.score),
  [items]
);

// useCallback 稳定回调引用，防止子组件不必要重渲染
const handleClick = useCallback((id) => {
  setSelected(id);
}, []); // 依赖为空，引用永不变

// React.memo 包裹纯组件
const ListItem = React.memo(({ item, onClick }) => (
  <div onClick={() => onClick(item.id)}>{item.name}</div>
));

// useTransition 标记非紧急更新（React 18+）
const [isPending, startTransition] = useTransition();
startTransition(() => {
  setSearchResult(heavyFilter(keyword)); // 不阻塞输入响应
});
```

---

## 四、构建优化

### 4.1 Tree Shaking

**难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰**

**原理：** 静态分析 ESM `import/export`，删除未使用代码

```javascript
// ✅ 支持 Tree Shaking：具名导入
import { debounce } from 'lodash-es'; // 只打包 debounce

// ❌ 不支持 Tree Shaking：默认导入整个包
import _ from 'lodash'; // 整个 lodash 都打包进去（~72KB gzipped）
```

确保 Tree Shaking 生效的条件：
1. 使用 **ESM** 格式（`import/export`，不是 CommonJS `require`）
2. 第三方包有 `package.json` 中的 `"sideEffects": false` 声明
3. Vite/Webpack production 模式（默认开启）

---

### 4.2 Bundle 分析

**难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰**

```bash
# Vite 项目
pnpm add -D rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,        // 构建后自动打开报告
      filename: 'stats.html',
      gzipSize: true,    // 显示 gzip 后体积
    })
  ]
}
```

```bash
# Webpack 项目
npx webpack-bundle-analyzer stats.json
```

**分析后常见优化动作：**

| 发现 | 解决方案 |
|------|----------|
| 某个包体积异常大（如 moment.js） | 替换为 date-fns / dayjs |
| 同一个包被打包两次（版本冲突） | 检查 pnpm/yarn resolutions |
| 第三方库未 Tree Shaking | 改为具名导入 |
| 组件库全量引入 | 配置按需导入（antd: `import { Button } from 'antd'`） |

---

### 4.3 压缩 & 缓存策略

**难度 ⭐ / 收益 🔥🔥🔥 / 成本 💰**

**文件名 Hash（缓存破坏）**
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        // [hash] 保证内容变更后文件名变化，强制更新缓存
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  }
}
```

**Gzip / Brotli 压缩**
```javascript
// vite-plugin-compression
import viteCompression from 'vite-plugin-compression';

export default {
  plugins: [
    viteCompression({ algorithm: 'brotliCompress' }) // Brotli > Gzip（体积减少20%）
  ]
}
```

**HTTP 缓存策略（Nginx 配置）**
```nginx
# JS/CSS 含 Hash 文件名 → 强缓存（1年）
location ~* \.(js|css)$ {
  expires 365d;
  add_header Cache-Control "public, immutable";
}

# HTML 文件 → 协商缓存（每次验证）
location ~* \.html$ {
  add_header Cache-Control "no-cache";
}
```

---

## 五、性能监控与度量

### 5.1 使用 Web Vitals SDK 采集数据

```javascript
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }) {
  // 上报到监控平台
  analytics.track('WebVitals', { metric: name, value, id });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

### 5.2 Performance DevTools 核心用法

| 工具 | 用途 |
|------|------|
| Lighthouse | 一键生成 CWV 评分 + 优化建议 |
| Performance 面板 | 录制运行时帧率、长任务分析 |
| Network 面板 | 瀑布图分析资源加载顺序 |
| Coverage 面板 | 检测未使用的 JS/CSS 代码 |

---

## 六、优化优先级速查

> **按性价比排序，面试时按此顺序答**

| 优先级 | 优化项 | 难度 | 收益 | 成本 |
|--------|--------|------|------|------|
| 🥇 P0 | 图片格式 WebP/AVIF + 压缩 | ⭐ | 🔥🔥🔥 | 💰 |
| 🥇 P0 | 路由懒加载（代码分割） | ⭐ | 🔥🔥🔥 | 💰 |
| 🥇 P0 | LCP 图片 preload | ⭐ | 🔥🔥🔥 | 💰 |
| 🥈 P1 | Bundle 分析 + 大包替换 | ⭐ | 🔥🔥🔥 | 💰 |
| 🥈 P1 | Tree Shaking + 按需引入 | ⭐ | 🔥🔥🔥 | 💰 |
| 🥈 P1 | 骨架屏 | ⭐⭐ | 🔥🔥 | 💰💰 |
| 🥈 P1 | 防抖/节流 + 避免Layout Thrashing | ⭐ | 🔥🔥 | 💰 |
| 🥉 P2 | 虚拟列表（大数据量场景） | ⭐⭐⭐ | 🔥🔥🔥 | 💰💰 |
| 🥉 P2 | Web Worker（计算密集） | ⭐⭐⭐ | 🔥🔥🔥 | 💰💰💰 |
| 🥉 P2 | Brotli 压缩 | ⭐ | 🔥🔥 | 💰 |
| ⚡ P3 | Critical CSS 内联 | ⭐⭐⭐ | 🔥🔥 | 💰💰💰 |
| ⚡ P3 | WebAssembly | ⭐⭐⭐ | 🔥🔥🔥 | 💰💰💰 |

---

## 相关链接

- [[单页面和多页面应用场景总结]] - SPA 首屏优化场景
- [[前端面试项目亮点提炼指南]] - 如何将优化经历说成亮点
- [[简历优化指南]] - 性能优化数据如何写进简历
