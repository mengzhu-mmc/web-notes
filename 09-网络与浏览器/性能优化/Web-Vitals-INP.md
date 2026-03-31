# Web Vitals：INP（Interaction to Next Paint）

> INP 于 2024 年 3 月正式替代 FID，成为 Core Web Vitals 中衡量交互响应的核心指标

---

## 一、背景：为什么 FID 被替代？

**FID（First Input Delay）** 只测量用户**第一次**输入的延迟，且只测量事件排队到处理开始的时间，不包含实际执行时间和渲染时间。

**问题**：用户在浏览页面过程中会持续交互（点击、滚动、表单输入），FID 无法反映整个页面生命周期内的响应情况。

---

## 二、INP 定义

**INP（Interaction to Next Paint）** = 用户与页面交互到下一帧绘制完成的延迟时间，取该页面所有交互中的**第 98 百分位**（或对于交互次数 < 50 的页面取最差值）。

### 交互范围

INP 测量以下三类用户交互：
- **点击**（鼠标点击、触屏 tap）
- **键盘输入**（keydown、keypress、keyup）
- **触摸**（touchstart、touchend）

> ⚠️ **不包含**：悬停（hover）、滚动（scroll）

### 时间拆分

每次交互的 INP 时间由三部分组成：

```
用户交互
    │
    ▼
┌──────────────────────────────────────────────────────┐
│  Input Delay  │  Processing Time  │  Presentation    │
│  输入延迟      │  事件处理时间       │  Delay 呈现延迟  │
│（等待主线程空闲）│（JS 回调执行时间）  │（渲染到屏幕时间）│
└──────────────────────────────────────────────────────┘
    │                                                   │
    └───────────────── INP 时间 ───────────────────────┘
                                                       │
                                               下一帧绘制完成
```

---

## 三、INP 评分标准

| 评分 | 数值 | 说明 |
|------|------|------|
| ✅ Good（良好） | ≤ **200ms** | 用户几乎感觉不到延迟 |
| ⚠️ Needs Improvement（需要改进） | 200ms ~ 500ms | 用户可感知轻微卡顿 |
| ❌ Poor（差） | > **500ms** | 明显卡顿，体验很差 |

---

## 四、FID vs INP 对比

| 对比维度 | FID | INP |
|---------|-----|-----|
| **测量范围** | 仅第一次交互 | 整个页面生命周期所有交互 |
| **测量内容** | 输入延迟（到事件处理开始） | 输入延迟 + 处理时间 + 呈现延迟 |
| **计算方式** | 第一次输入的延迟值 | 第 98 百分位（最差的交互） |
| **能否提前计算** | 仅 Lab 数据无法准确模拟 | Real User Monitoring（RUM）准确 |
| **状态** | ❌ 2024年3月废弃 | ✅ 现行 Core Web Vital |
| **Good 阈值** | ≤ 100ms | ≤ 200ms |

---

## 五、如何测量 INP

### 方法一：Chrome DevTools Performance 面板

1. 打开 DevTools → Performance 标签
2. 勾选「Web Vitals」
3. 录制操作，交互事件上会显示 INP 数值

### 方法二：Lighthouse（Lab 数据）

```bash
npx lighthouse https://example.com --output html --view
# 报告中查看 INP 评分
```

> ⚠️ Lighthouse 是实验室环境，与真实用户数据（Field Data）可能有差异。

### 方法三：web-vitals JS 库（Real User Monitoring）

```javascript
import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log('INP:', metric.value, 'ms');
  console.log('Rating:', metric.rating); // 'good' | 'needs-improvement' | 'poor'
  
  // 上报到监控平台
  sendToAnalytics({
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: metric.rating,
    metric_id: metric.id,
  });
}, { reportAllChanges: true }); // 每次交互都上报
```

### 方法四：PerformanceObserver 原生 API

```javascript
// 查看长动画帧 (LoAF - Long Animation Frame)，与 INP 强相关
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) { // 超过 50ms 的帧
      console.log('Long Animation Frame:', {
        duration: entry.duration,
        scripts: entry.scripts, // 执行了哪些脚本
        startTime: entry.startTime,
      });
    }
  }
});
observer.observe({ type: 'long-animation-frame', buffered: true });

// 直接观测 event 类型
const eventObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 200) {
      console.log('Slow Interaction:', {
        name: entry.name,      // 'click' / 'keydown' 等
        duration: entry.duration,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        startTime: entry.startTime,
      });
    }
  }
});
eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
```

### 方法五：Google Search Console（真实用户数据）

- 登录 Google Search Console → Core Web Vitals 报告
- 查看 INP「差」的页面列表

---

## 六、INP 优化手段

### 1. 减少 Input Delay（输入延迟）

输入延迟通常由主线程被长任务（Long Task > 50ms）占用导致。

**方案 A：拆分长任务（Task Chunking）**

```javascript
// ❌ 一个长任务阻塞主线程
function processLargeData(items) {
  items.forEach(item => heavyProcess(item)); // 假设执行 500ms
}

// ✅ 使用 scheduler.yield() 拆分任务（Chrome 115+）
async function processLargeData(items) {
  for (let i = 0; i < items.length; i++) {
    heavyProcess(items[i]);
    
    if (i % 50 === 0) {
      // 每处理 50 条，让出主线程
      await scheduler.yield();
    }
  }
}

// 兼容方案：setTimeout(0) 或 requestIdleCallback
async function processLargeDataFallback(items) {
  for (let i = 0; i < items.length; i++) {
    heavyProcess(items[i]);
    
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

**方案 B：Web Worker 卸载计算**

```javascript
// main.js
const worker = new Worker('./data-worker.js');

// 把计算密集型任务移到 Worker
worker.postMessage({ type: 'process', data: largeData });
worker.onmessage = (e) => {
  updateUI(e.data.result); // 只在主线程更新 UI
};

// data-worker.js
self.onmessage = (e) => {
  if (e.data.type === 'process') {
    const result = heavyProcess(e.data.data); // Worker 中计算
    self.postMessage({ result });
  }
};
```

### 2. 减少 Processing Time（事件处理时间）

**方案 A：避免在事件回调中做大量同步计算**

```javascript
// ❌ 点击时同步计算
button.addEventListener('click', () => {
  const result = heavySynchronousCompute(); // 阻塞主线程
  updateDOM(result);
});

// ✅ 推迟非关键工作
button.addEventListener('click', () => {
  // 立即更新 UI 反馈（如 loading 状态）
  showLoadingState();
  
  // 推迟到下一个微任务或宏任务
  queueMicrotask(() => {
    const result = heavySynchronousCompute();
    updateDOM(result);
    hideLoadingState();
  });
});
```

**方案 B：防抖与节流（键盘输入场景）**

```javascript
// 搜索框输入优化
import { debounce } from 'lodash-es';

const handleSearch = debounce((query) => {
  fetchSearchResults(query); // 延迟请求
}, 300);

searchInput.addEventListener('input', (e) => {
  // 立即更新输入框（保证 INP 良好）
  // 延迟触发搜索
  handleSearch(e.target.value);
});
```

**方案 C：虚拟列表（大列表渲染）**

```javascript
// 使用 Virtual Scroller 只渲染可视区域
import { VirtualScroller } from '@tanstack/virtual'; // or react-window

// 替代直接渲染 10000 条数据
// 只渲染视口内的 ~20 条，点击响应极快
```

### 3. 减少 Presentation Delay（呈现延迟）

**方案 A：减少渲染阻塞（避免强制同步布局）**

```javascript
// ❌ 强制同步布局（Layout Thrashing）
function resizeAll(elements) {
  elements.forEach(el => {
    const width = el.offsetWidth; // 读取 → 触发回流
    el.style.width = (width * 2) + 'px'; // 写入 → 触发回流
  });
}

// ✅ 批量读写分离
function resizeAll(elements) {
  // 先批量读取
  const widths = elements.map(el => el.offsetWidth);
  // 再批量写入
  elements.forEach((el, i) => {
    el.style.width = (widths[i] * 2) + 'px';
  });
}
```

**方案 B：使用 content-visibility 延迟渲染屏外内容**

```css
/* 屏外区域延迟渲染，减少初始渲染工作量 */
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* 预设高度，避免滚动条跳动 */
}
```

**方案 C：CSS `will-change` 提升到合成层**

```css
/* 频繁动画的元素，提升到 GPU 合成层 */
.animated-element {
  will-change: transform;
  /* 或 transform: translateZ(0); */
}
```

### 4. React 应用专项优化

```jsx
// ❌ 每次状态更新都重新渲染整个列表
function TodoList({ todos }) {
  return todos.map(todo => <TodoItem key={todo.id} todo={todo} />);
}

// ✅ 用 memo 避免无关重渲染
const TodoItem = React.memo(({ todo }) => {
  return <div>{todo.text}</div>;
});

// ✅ startTransition 降级非紧急更新
import { startTransition, useState } from 'react';

function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    setQuery(e.target.value); // 紧急：立即更新输入框
    
    startTransition(() => {
      setResults(filterResults(e.target.value)); // 非紧急：可打断的渲染
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ResultList results={results} />
    </>
  );
}

// ✅ useDeferredValue 延迟低优先级值的更新
import { useDeferredValue } from 'react';

function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery 的更新可被打断，不影响输入响应
  const results = filterExpensiveResults(deferredQuery);
  return <ResultList results={results} />;
}
```

---

## 七、Core Web Vitals 三件套对比（2024 后）

| 指标 | 全称 | 测量内容 | Good 阈值 |
|------|------|---------|----------|
| **LCP** | Largest Contentful Paint | 最大内容渲染时间（加载速度） | ≤ 2.5s |
| **INP** | Interaction to Next Paint | 交互到绘制延迟（响应速度） | ≤ 200ms |
| **CLS** | Cumulative Layout Shift | 累计布局偏移（视觉稳定性） | ≤ 0.1 |

> 💡 FID（First Input Delay）已于 2024 年 3 月正式退役，被 INP 取代。

---

## 八、面试高频考点 🎯

### Q1：INP 是什么？为什么要替代 FID？

INP 测量页面整个生命周期内所有交互（点击/键盘/触摸）的响应延迟中位数，取第 98 百分位。

FID 只测第一次交互的输入排队延迟，且不包含事件处理时间和渲染时间，无法全面反映用户体验。INP 更全面、更准确。

### Q2：INP 时间由哪几部分组成？各自如何优化？

1. **Input Delay**（输入延迟）：主线程被长任务占用 → 拆分长任务、用 Web Worker
2. **Processing Time**（处理时间）：事件回调太慢 → 推迟非关键工作、防抖节流
3. **Presentation Delay**（呈现延迟）：渲染工作量大 → 避免强制同步布局、will-change、content-visibility

### Q3：如何在代码中采集 INP 数据？

使用 `web-vitals` 库的 `onINP()` 方法，配合 `reportAllChanges: true` 参数可以监控每次交互，上报到监控平台（如 Google Analytics、自建 RUM 系统）。

### Q4：scheduler.yield() 是什么？

Chrome 115+ 新 API，在任务执行中途主动让出主线程控制权，允许浏览器处理用户交互和渲染，然后再继续当前任务。是比 `setTimeout(0)` 更精确、更现代的任务拆分方式。

```javascript
await scheduler.yield(); // 让出主线程，优先处理用户交互
```

### Q5：React 中哪些 API 可以优化 INP？

- `startTransition()`：将非紧急状态更新标记为低优先级，可被用户交互打断
- `useDeferredValue()`：延迟某个值的更新，让紧急渲染先完成
- `React.memo()` / `useMemo()` / `useCallback()`：减少无效重渲染

---

## 相关笔记

- [[前端性能优化全景]]
- [[减少dom数量以及大量dom时的优化]]
- [[浏览器原理/存储/浏览器功能与组成]]
