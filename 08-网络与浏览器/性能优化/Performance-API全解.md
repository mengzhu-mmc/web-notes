# Performance API 全解

> 浏览器性能数据的唯一真实来源：从 entryType 家族、Navigation/Resource Timing，到 User Timing、Element Timing、LoAF 与 Server Timing，最后组装成一套可上线的采集器

## 面试高频考点

- `performance.getEntriesByType()` 和 `PerformanceObserver` 有什么区别？`buffered: true` 到底解决了什么问题？
- 已废弃的 `performance.timing` 和现行的 `PerformanceNavigationTiming` 差别在哪？为什么前者被废弃？
- Resource Timing 里 `transferSize` / `encodedBodySize` / `decodedBodySize` 分别是什么？怎么用它们判断资源是否命中缓存？
- 为什么跨域资源的耗时字段全是 0？怎么修？
- `longtask` 只能告诉你「卡了 50ms」，怎么定位到具体是哪行代码？

---

## 一、Performance API 家族全景

所有性能数据都以 **PerformanceEntry（性能条目）** 的形式存在于浏览器的性能缓冲区（Performance Timeline）中，通过 `entryType` 区分种类。每个 entry 至少有 4 个基础字段：

| 字段 | 含义 |
| --- | --- |
| `name` | 条目名称（资源 URL、mark 名称、事件类型等，语义随 entryType 变化） |
| `entryType` | 条目类型（下表的字符串） |
| `startTime` | 相对于 time origin（时间原点）的高精度毫秒时间戳 |
| `duration` | 持续时长，部分类型恒为 0 |

### 1.1 entryType 全表

| entryType 字符串 | 接口类型 | 测什么 | 什么时候用 |
| --- | --- | --- | --- |
| `navigation` | `PerformanceNavigationTiming` | 主文档导航全过程：DNS / TCP / TLS / TTFB / DOM 解析 / load | 首屏拆解、TTFB 归因、判断是刷新还是前进后退 |
| `resource` | `PerformanceResourceTiming` | 每个子资源（JS/CSS/图片/XHR/fetch）的加载瀑布 | 找慢资源、算缓存命中率、看压缩率与 HTTP 版本 |
| `paint` | `PerformancePaintTiming` | `first-paint` 与 `first-contentful-paint` | 采集 FP / FCP |
| `largest-contentful-paint` | `LargestContentfulPaint` | 最大内容元素的渲染时间，含 `element` / `url` / `size` | 采集 LCP 并定位到具体 DOM 元素 |
| `layout-shift` | `LayoutShift` | 单次布局偏移的 `value` / `hadRecentInput` / `sources` | 累加计算 CLS，定位偏移元素 |
| `first-input` | `PerformanceEventTiming` | 首次输入延迟（FID，已退役指标） | 兼容老监控；新项目不再采 |
| `event` | `PerformanceEventTiming` | 每次交互事件的 `processingStart` / `processingEnd` / `duration` | 计算 INP，分析慢交互 |
| `element` | `PerformanceElementTiming` | 被 `elementtiming` 属性标记元素的渲染时间 | 采集「业务定义的首屏元素」（未必是 LCP） |
| `mark` | `PerformanceMark` | `performance.mark()` 打的自定义时间点 | 业务打点、DevTools Timings 轨道可视化 |
| `measure` | `PerformanceMeasure` | `performance.measure()` 计算的自定义区间 | 组件渲染耗时、接口链路耗时 |
| `longtask` | `PerformanceLongTaskTiming` | 主线程上超过 50ms 的任务 | 粗粒度发现阻塞，TBT 估算 |
| `long-animation-frame` | `PerformanceLongAnimationFrameTiming` | 长动画帧（LoAF）及其中每段脚本的归因信息 | INP 归因主力，能定位到函数与源码位置 |
| `visibility-state` | `VisibilityStateEntry` | 页面可见性变化的时间点（`visible` / `hidden`） | 判断指标是否在后台产生，剔除脏数据 |
| `back-forward-cache-restoration` | `BackForwardCacheRestoration` | bfcache 恢复的时间点与恢复后 pageshow 时机 | 处理 bfcache 恢复后的指标重置与重复上报 |
| `taskattribution` | `TaskAttributionTiming` | longtask 的归因容器（iframe 级别，粒度很粗） | 基本被 LoAF 取代，不建议依赖 |

> ⚠️ 兼容性提醒：`element`、`long-animation-frame`、`layout-shift`、`largest-contentful-paint` 目前仅 Chromium 系支持；Safari 只有 `navigation` / `resource` / `paint` / `mark` / `measure` 这一批基础类型。生产采集必须做能力检测，不能裸调。

### 1.2 能力检测的正确姿势

```js
// ❌ 直接 observe 不支持的 type 会抛错，且会中断后续采集代码
observer.observe({ type: "long-animation-frame", buffered: true });

// ✅ 先查 supportedEntryTypes（静态属性，一次判断即可）
function supports(type) {
  return (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes?.includes(type)
  );
}

if (supports("long-animation-frame")) {
  observer.observe({ type: "long-animation-frame", buffered: true });
}

// ✅ 兜底也可以 try/catch 包裹，observe 不支持的 type 会抛 TypeError
try {
  observer.observe({ type: "element", buffered: true });
} catch (e) {
  /* 该浏览器不支持 Element Timing，静默降级 */
}
```

---

## 二、两种读取方式：拉取式 vs 订阅式

这是所有采集脚本的第一个分水岭，写错了会**静默丢数据**。

### 2.1 拉取式（Pull）：performance.getEntries*

```js
// 三个同步查询方法，返回当前缓冲区里的快照
performance.getEntries(); // 所有条目
performance.getEntriesByType("resource"); // 按 entryType 过滤
performance.getEntriesByName("https://cdn.example.com/app.js", "resource"); // 按 name 过滤

// 典型用法：拿主文档导航条目（永远只有一条）
const nav = performance.getEntriesByType("navigation")[0];
console.log("TTFB:", nav.responseStart - nav.requestStart);
```

### 2.2 订阅式（Push）：PerformanceObserver

```js
const po = new PerformanceObserver((list, observer) => {
  // list 是 PerformanceObserverEntryList，只包含「本次回调新增」的条目
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.name, entry.startTime, entry.duration);
  }
  // observer.disconnect(); // 只需一次时立刻断开
});

po.observe({ type: "resource", buffered: true });
```

`observe()` 的两种写法不能混用：

```js
// ✅ 单类型写法：支持 buffered / durationThreshold 等附加选项
po.observe({ type: "resource", buffered: true });

// ✅ 多类型写法：一次订阅多个，但 entryTypes 不支持 buffered 与任何附加选项
po.observe({ entryTypes: ["paint", "longtask", "layout-shift"] });

// ❌ type 与 entryTypes 同时传会抛错
po.observe({ type: "paint", entryTypes: ["resource"], buffered: true });
```

### 2.3 buffered: true 的语义（采集脚本必须理解）

`buffered: true` 的含义是：**把 Observer 创建之前浏览器已经产生并缓存的历史条目，也一并投递给这次回调**。

```
时间轴 ──────────────────────────────────────────────────────────►
  │            │              │                    │
time origin   FCP 产生      LCP 产生          采集脚本异步加载完成
  │            │              │                  new PerformanceObserver()
  │            └──── 已进入浏览器缓冲区 ────┘                    │
  │                                                             │
  │  buffered: false → 回调只能收到「此刻之后」的新条目 → FCP/LCP 全部丢失
  │  buffered: true  → 回调首次触发即补发缓冲区中的 FCP/LCP → 数据完整
```

对 FCP、LCP、`navigation` 这类**在采集脚本执行前就已经发生**的一次性指标，`buffered: true` 不是优化项，而是**正确性前提**。这也是 `web-vitals` 库内部一律带 `buffered: true` 的原因。

### 2.4 为什么不能只用 getEntriesByType

| 问题 | 说明 | 后果 |
| --- | --- | --- |
| **时机太晚** | 必须等到某个时间点才去拉，拉之前无法感知 | 早期资源可能已被 `clearResourceTimings()` 或缓冲区淘汰 |
| **缓冲区上限** | `resource` 缓冲区默认约 250 条，满了以后新条目**直接丢弃**（并触发 `resourcetimingbufferfull` 事件） | 长会话/资源多的页面后半段资源全部采不到 |
| **拿不到"最终值"** | LCP 会随渲染推进多次更新，CLS 需要持续累加 | 单次快照拿到的是中间值，不是最终指标 |
| **不支持阈值过滤** | 无法像 `durationThreshold` 那样只关心慢交互 | 只能全量拉回来自己过滤，开销更大 |
| **无法感知增量** | 每次都是全量快照，需要自己去重 | 重复上报 |

**结论：一律用 `PerformanceObserver` + `buffered: true` 订阅；`getEntriesByType` 只用于「此刻取一次确定不再变化的值」**，最典型的就是 `navigation` 那唯一一条。

```js
// ✅ 生产采集的标准形态
function observe(type, callback, options = {}) {
  if (!supports(type)) return null;
  const po = new PerformanceObserver((list) => list.getEntries().forEach(callback));
  po.observe({ type, buffered: true, ...options });
  return po;
}

// ❌ 反面写法：脚本异步加载，等 window.onload 才拉，FCP/LCP 早已错过或被覆盖
window.addEventListener("load", () => {
  const paints = performance.getEntriesByType("paint"); // 可能为空数组
});
```

---

## 三、Navigation Timing Level 2：PerformanceNavigationTiming

主文档导航的全景耗时，整个页面生命周期内**只有一条** entry。

```js
const nav = performance.getEntriesByType("navigation")[0];
// 或订阅式（能拿到 prerender 等特殊场景的准确值）
observe("navigation", (entry) => report(parseNav(entry)));
```

### 3.1 完整时序图

所有字段都是**相对 time origin（时间原点）的毫秒数**，可以直接相减。

```
                      PerformanceNavigationTiming 时序（单位 ms，相对 startTime=0）
startTime / fetchStart
  │
  ├─ redirectStart ──────── redirectEnd            重定向（跨域重定向时两者均为 0）
  │
  ├─ workerStart                                   Service Worker 启动（无 SW 时为 0）
  │
  ├─ fetchStart
  │     │
  │     ├─ domainLookupStart ── domainLookupEnd     DNS 查询
  │     │
  │     ├─ connectStart ─────────────── connectEnd  TCP 建连
  │     │        └─ secureConnectionStart ─┘        TLS 握手（http 时为 0）
  │     │
  │     ├─ requestStart                             请求发出
  │     │      └──────── responseStart              首字节到达  ← TTFB 终点
  │     │                    └───── responseEnd     响应体接收完毕
  │     │
  │     ▼
  ├─ domInteractive                                 DOM 树构建完成（document.readyState = 'interactive'）
  │
  ├─ domContentLoadedEventStart ── domContentLoadedEventEnd    DCL 回调执行
  │
  ├─ domComplete                                    DOM 与所有子资源就绪
  │
  └─ loadEventStart ─────────── loadEventEnd        onload 回调执行  ← 页面加载终点

  ├─ unloadEventStart ── unloadEventEnd             上一个同源文档的 unload（跨域为 0）
```

### 3.2 各阶段计算公式

```js
function parseNav(nav) {
  return {
    // 网络阶段
    重定向: nav.redirectEnd - nav.redirectStart,
    SW启动: nav.workerStart > 0 ? nav.fetchStart - nav.workerStart : 0,
    DNS: nav.domainLookupEnd - nav.domainLookupStart,
    TCP: nav.connectEnd - nav.connectStart,
    // TLS：secureConnectionStart 为 0 说明是 http，不能直接相减
    TLS: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
    TTFB: nav.responseStart - nav.requestStart,
    内容下载: nav.responseEnd - nav.responseStart,

    // 解析与渲染阶段
    DOM解析: nav.domInteractive - nav.responseEnd,
    DCL回调: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
    资源加载: nav.domComplete - nav.domContentLoadedEventEnd,
    Load回调: nav.loadEventEnd - nav.loadEventStart,

    // 关键复合指标（相对 startTime，即 0，可直接取值）
    首字节: nav.responseStart,
    DCL: nav.domContentLoadedEventEnd,
    Load: nav.loadEventEnd,
    总耗时: nav.duration, // 等价于 loadEventEnd
  };
}
```

> ⚠️ 三个高频坑：
> 1. `secureConnectionStart` 在 HTTP 站点上是 **0**，`connectEnd - 0` 会得到一个巨大的假 TLS 耗时。
> 2. `duration` 对 `navigation` 条目等于 `loadEventEnd`；若在 load 之前读取，`loadEventEnd` / `domComplete` 均为 **0**，必须在 load 之后（或用 Observer）读取。
> 3. 跨域重定向、跨域 unload 出于安全会被置 0，不要拿 0 当"耗时为 0"。

### 3.3 与已废弃的 performance.timing 字段对照

`performance.timing`（Navigation Timing **Level 1**）已在标准中标记为 **deprecated（废弃）**，仅为兼容保留。新代码一律用 `PerformanceNavigationTiming`。

| 旧：`performance.timing.*`（废弃） | 新：`PerformanceNavigationTiming.*`（现行） | 备注 |
| --- | --- | --- |
| `navigationStart` | `startTime`（恒为 0） | 新 API 以 time origin 为零点，无需该字段 |
| `unloadEventStart` / `unloadEventEnd` | `unloadEventStart` / `unloadEventEnd` | 同名 |
| `redirectStart` / `redirectEnd` | `redirectStart` / `redirectEnd` | 同名 |
| `fetchStart` | `fetchStart` | 同名 |
| `domainLookupStart` / `domainLookupEnd` | `domainLookupStart` / `domainLookupEnd` | 同名 |
| `connectStart` / `connectEnd` | `connectStart` / `connectEnd` | 同名 |
| `secureConnectionStart` | `secureConnectionStart` | 同名 |
| `requestStart` | `requestStart` | 同名 |
| `responseStart` / `responseEnd` | `responseStart` / `responseEnd` | 同名 |
| `domLoading` | **已移除** | 新标准不再提供，用 `responseEnd` 近似替代 |
| `domInteractive` | `domInteractive` | 同名 |
| `domContentLoadedEventStart` / `End` | `domContentLoadedEventStart` / `End` | 同名 |
| `domComplete` | `domComplete` | 同名 |
| `loadEventStart` / `loadEventEnd` | `loadEventStart` / `loadEventEnd` | 同名 |
| `performance.navigation.type`（数字 0/1/2/255） | `type`（字符串枚举） | 旧的是魔法数字，新的是可读字符串 |
| `performance.navigation.redirectCount` | `redirectCount` | 迁移到导航条目上 |
| —— | `transferSize` / `encodedBodySize` / `decodedBodySize` | 旧 API 完全没有体积信息 |
| —— | `nextHopProtocol` | 旧 API 看不到 HTTP 版本 |
| —— | `serverTiming` | 旧 API 无 Server Timing |
| —— | `activationStart` | 旧 API 无预渲染支持 |
| —— | `criticalCHRestart` | 新增，Client Hints 重启耗时 |

**为什么旧 API 被废弃：**

| 维度 | `performance.timing`（旧） | `PerformanceNavigationTiming`（新） |
| --- | --- | --- |
| 时间基准 | **Unix 绝对时间戳**（毫秒，如 `1712345678901`） | **相对 time origin 的偏移量**（如 `312.4`） |
| 精度 | 整数毫秒 | `DOMHighResTimeStamp`，亚毫秒（微秒级小数） |
| 受系统时钟影响 | ❌ 会：用户改系统时间、NTP 校时都会让差值失真甚至为负 | ✅ 不会：基于单调时钟（monotonic clock） |
| 计算方式 | 必须先减 `navigationStart` 才有意义 | 直接是相对值，随取随用 |
| 是否进 Performance Timeline | ❌ 不是 PerformanceEntry，`PerformanceObserver` 观测不到 | ✅ 是标准 entry，可被订阅 |
| 是否支持多次导航 / SPA | ❌ 单一全局对象 | ✅ entry 化设计，可扩展 |

```js
// ❌ 废弃写法：绝对时间戳相减，受系统时钟跳变影响，精度只有 1ms
const t = performance.timing;
const ttfb = t.responseStart - t.navigationStart;
const dcl = t.domContentLoadedEventEnd - t.navigationStart;

// ✅ 现行写法：相对时间，直接可用，高精度
const nav = performance.getEntriesByType("navigation")[0];
const ttfb2 = nav.responseStart; // 已经是相对 time origin 的值
const dcl2 = nav.domContentLoadedEventEnd;
```

### 3.4 type：区分导航来源

| `type` 值 | 含义 | 采集时的处理建议 |
| --- | --- | --- |
| `navigate` | 普通导航（点链接、输地址、表单提交） | 正常上报，这是首屏指标的主样本 |
| `reload` | 刷新（F5 / `location.reload()`） | 单独打标，缓存状态与首次访问差异大 |
| `back_forward` | 通过历史记录前进/后退恢复 | 极可能命中缓存，耗时不可与 navigate 混算 |
| `prerender` | 页面被预渲染（Speculation Rules 等） | **必须用 `activationStart` 校正**，否则指标会偏小到失真 |

```js
const nav = performance.getEntriesByType("navigation")[0];
report({ navType: nav.type, redirectCount: nav.redirectCount });

// 只把 navigate 作为"冷启动首屏"的统计口径
if (nav.type === "navigate") reportColdStart(nav);
```

### 3.5 activationStart：预渲染场景的时间校正

预渲染（prerender）时，页面在后台就已经开始加载和渲染，`startTime`（time origin）落在**用户真正看到页面之前**。用户实际感知的起点是 `activationStart`（页面被激活的时刻）。

```
预渲染场景时间轴：

time origin(0)                    activationStart          用户看到页面
     │                                  │                        │
     ├──── 后台预渲染：请求、解析、绘制 ──┤                        │
     │                                  ├── 激活后剩余工作 ──────┤
     │                                  │
     │←──── 这段用户完全无感知 ─────────→│
     │
  原始 LCP.startTime = 1800ms（含后台时间，虚低不可信）
  用户感知 LCP = 1800 - activationStart(1500) = 300ms  ← 真实体验
```

```js
function getActivationStart() {
  const nav = performance.getEntriesByType("navigation")[0];
  // 非预渲染时 activationStart 为 0，公式天然兼容
  return nav?.activationStart ?? 0;
}

// ✅ 所有"时间点型"指标（FCP / LCP / element 等）都要做这个减法并夹到 0
function toVisibleTime(entryStartTime) {
  return Math.max(entryStartTime - getActivationStart(), 0);
}

// 判断当前是否处于预渲染中
if (document.prerendering) {
  document.addEventListener("prerenderingchange", () => {
    // 激活后再开始业务埋点，避免把预渲染阶段当成用户行为
  }, { once: true });
}
```

---

## 四、Resource Timing：PerformanceResourceTiming

每个子资源（脚本、样式、图片、字体、XHR/fetch、EventSource 等）都会产生一条 `resource` 条目。字段与 `navigation` 高度重合（两者都继承自 `PerformanceResourceTiming`），额外多出 `initiatorType`、`renderBlockingStatus` 等。

### 4.1 单资源瀑布拆解

```js
function parseResource(r) {
  return {
    url: r.name, // 资源完整 URL
    类型: r.initiatorType,
    协议: r.nextHopProtocol, // 'h2' / 'http/1.1' / 'h3'
    排队: r.requestStart > 0 ? r.requestStart - r.startTime : 0,
    重定向: r.redirectEnd - r.redirectStart,
    DNS: r.domainLookupEnd - r.domainLookupStart,
    TCP: r.connectEnd - r.connectStart,
    TLS: r.secureConnectionStart > 0 ? r.connectEnd - r.secureConnectionStart : 0,
    TTFB: r.responseStart - r.requestStart,
    下载: r.responseEnd - r.responseStart,
    总耗时: r.duration, // = responseEnd - startTime
  };
}

observe("resource", (r) => {
  if (r.duration > 1000) console.warn("慢资源", parseResource(r));
});
```

### 4.2 initiatorType：区分资源来源

| `initiatorType` | 来源 | 典型用途 |
| --- | --- | --- |
| `script` | `<script>` | 统计 JS 总体积与总耗时 |
| `link` | `<link>`（CSS、preload、prefetch 等） | 关键 CSS 阻塞分析 |
| `css` | CSS 内部引用（`url()` 背景图、`@import`） | 找出被 CSS 拖慢的隐性资源 |
| `img` | `<img>` / `<image>` | 首屏图片优化，常与 LCP 关联 |
| `image` | CSS `image-set()` 等图片来源 | 同上 |
| `iframe` | `<iframe>` | 第三方嵌入耗时 |
| `xmlhttprequest` | `XMLHttpRequest` | 接口耗时（老代码/老 SDK） |
| `fetch` | `fetch()` | 接口耗时（现代代码，含 SWR/React Query） |
| `beacon` | `navigator.sendBeacon()` | 监控自身上报开销 |
| `video` / `audio` | 媒体元素 | 媒体首帧优化 |
| `navigation` | 仅出现在 `navigation` 条目上 | 主文档自身 |
| `other` | 无法归类（如 Service Worker 内部发起） | 兜底桶 |

```js
// ✅ 按类型聚合，一眼看出瓶颈在哪一类资源
const byType = performance.getEntriesByType("resource").reduce((acc, r) => {
  const t = (acc[r.initiatorType] ??= { count: 0, duration: 0, transferSize: 0 });
  t.count++;
  t.duration += r.duration;
  t.transferSize += r.transferSize;
  return acc;
}, {});
console.table(byType);
```

### 4.3 三个体积字段：transferSize / encodedBodySize / decodedBodySize

| 字段 | 含义 | 是否含 HTTP 头 | 是否含压缩 |
| --- | --- | --- | --- |
| `transferSize` | 网络上**实际传输**的字节数 = 响应头 + 压缩后响应体 | ✅ 含 | 压缩后 |
| `encodedBodySize` | **压缩后**的响应体字节数（不含头） | ❌ 不含 | 压缩后 |
| `decodedBodySize` | **解压后**的响应体字节数（不含头），等于资源原始大小 | ❌ 不含 | 解压后 |

三者关系：`transferSize ≈ 响应头开销 + encodedBodySize`，而 `decodedBodySize ≥ encodedBodySize`。

**由此可以推导出两个非常实用的判断：**

```js
function analyzeCache(r) {
  // 判断缓存命中
  // transferSize === 0            → 强缓存命中（disk/memory cache，完全没走网络）
  // transferSize > 0 且很小(约300B以内) 且 encodedBodySize === 0 → 协商缓存命中（304，只传了响应头）
  // 否则                          → 真实下载
  let cacheState = "network";
  if (r.transferSize === 0 && r.decodedBodySize > 0) {
    cacheState = "memory-or-disk-cache"; // 强缓存
  } else if (r.transferSize > 0 && r.encodedBodySize === 0 && r.decodedBodySize === 0) {
    cacheState = "304-not-modified"; // 协商缓存
  }

  // 判断压缩率（Gzip / Brotli 是否真的生效）
  const compressed = r.encodedBodySize > 0 && r.decodedBodySize > 0;
  const ratio = compressed ? 1 - r.encodedBodySize / r.decodedBodySize : 0;

  return {
    cacheState,
    压缩率: compressed ? (ratio * 100).toFixed(1) + "%" : "未压缩或跨域不可见",
    // ratio 约等于 0 说明压缩没开（或是图片等本身不可压缩的二进制）
    压缩是否生效: compressed && ratio > 0.1,
    响应头开销: r.transferSize > 0 ? r.transferSize - r.encodedBodySize : 0,
  };
}

// ✅ 统计缓存命中率：性能大盘里最有说服力的一个数
const all = performance.getEntriesByType("resource");
const hit = all.filter((r) => r.transferSize === 0 && r.decodedBodySize > 0).length;
console.log("缓存命中率:", ((hit / all.length) * 100).toFixed(1) + "%");

// ❌ 错误用法：用 transferSize 当资源原始体积去算"包大小"
// 强缓存命中时它是 0，会把体积统计成 0
const wrongTotal = all.reduce((s, r) => s + r.transferSize, 0);
// ✅ 想统计资源原始体积用 decodedBodySize
const rightTotal = all.reduce((s, r) => s + r.decodedBodySize, 0);
```

### 4.4 nextHopProtocol：看 HTTP 版本

`nextHopProtocol` 返回 ALPN 协议 ID，可用来验证 HTTP/2、HTTP/3 是否真的生效。

| 值 | 协议 |
| --- | --- |
| `http/1.1` | HTTP/1.1 |
| `h2` | HTTP/2 |
| `h3` | HTTP/3（QUIC） |
| `""`（空字符串） | 跨域且未配置 `Timing-Allow-Origin`，或来自缓存/Service Worker |

```js
// ✅ 上线后校验 CDN 的 HTTP/2、HTTP/3 覆盖情况
const protocols = {};
for (const r of performance.getEntriesByType("resource")) {
  const p = r.nextHopProtocol || "(unknown/cross-origin)";
  protocols[p] = (protocols[p] || 0) + 1;
}
console.table(protocols);
```

### 4.5 跨域资源字段被置 0 的坑与 Timing-Allow-Origin

这是实战**必踩**的坑。出于隐私考虑（防止通过耗时侧信道探测用户网络与缓存状态），跨域资源默认只暴露 `name` / `startTime` / `duration` / `responseEnd` / `initiatorType` 等最基础信息，其余细粒度字段全部被置 0：

```js
// 一个未配置 TAO 的跨域 CDN 资源，读出来是这样：
{
  name: "https://cdn.other.com/lib.js",
  startTime: 320.5,
  duration: 180.2,          // ✅ 总耗时可见
  redirectStart: 0,          // ❌ 被置 0
  redirectEnd: 0,            // ❌
  domainLookupStart: 0,      // ❌ DNS 不可见
  domainLookupEnd: 0,        // ❌
  connectStart: 0,           // ❌ TCP 不可见
  connectEnd: 0,             // ❌
  secureConnectionStart: 0,  // ❌ TLS 不可见
  requestStart: 0,           // ❌ TTFB 无法计算
  responseStart: 0,          // ❌
  transferSize: 0,           // ❌ 体积不可见
  encodedBodySize: 0,        // ❌
  decodedBodySize: 0,        // ❌
  nextHopProtocol: "",       // ❌ 协议不可见
  serverTiming: []           // ❌ Server Timing 不可见
}
```

**解法：让资源所在域返回 `Timing-Allow-Origin` 响应头。**

```
# 只允许指定来源读取（推荐，最小暴露面）
Timing-Allow-Origin: https://www.myapp.com

# 允许任意来源读取（内部 CDN 可用，公网资源慎用）
Timing-Allow-Origin: *
```

```nginx
# Nginx 示例：给自家 CDN 静态资源加上 TAO
location ~* \.(js|css|png|jpg|webp|woff2)$ {
  add_header Timing-Allow-Origin "https://www.myapp.com" always;
}
```

> ⚠️ 两个关键点：
> 1. `Timing-Allow-Origin` 与 CORS 的 `Access-Control-Allow-Origin` 是**两个独立的头**。配了 CORS 不等于配了 TAO；`crossorigin` 属性也不能替代 TAO（但对 LCP 图片，`crossorigin` + CORS 是获取 `LargestContentfulPaint.url` 相关精细信息的前提）。
> 2. 采集代码必须**主动识别**这种情况，否则会把一堆 0 当成"耗时为 0"上报，导致大盘 TTFB 被严重低估。

```js
// ✅ 采集时先判定字段可见性，跨域不可见的字段直接不上报（而不是上报 0）
function isTimingVisible(r) {
  // requestStart 为 0 且 duration > 0 → 说明细粒度字段被隐藏
  return r.requestStart > 0;
}

observe("resource", (r) => {
  const base = { url: r.name, type: r.initiatorType, duration: r.duration };
  if (isTimingVisible(r)) {
    report({ ...base, ...parseResource(r), ...analyzeCache(r) });
  } else {
    report({ ...base, timingRestricted: true }); // 打标，便于反查缺 TAO 的域
  }
});
```

### 4.6 缓冲区管理：setResourceTimingBufferSize / clearResourceTimings

`resource` 缓冲区默认上限约 **250 条**，**满了之后新条目被直接丢弃**（不是覆盖旧的）。长会话 SPA 极易撞上。

```js
// 扩大缓冲区（必须在资源加载前尽早执行，通常放在 HTML 头部内联脚本）
performance.setResourceTimingBufferSize(500);

// 清空已处理的条目，释放内存
performance.clearResourceTimings();

// 缓冲区满时的事件（只在满的那一刻触发一次）
performance.addEventListener("resourcetimingbufferfull", () => {
  flushResourceEntries(); // 先把现有数据处理/上报掉
  performance.clearResourceTimings(); // 再清空，让后续资源能继续被记录
});
```

| 方法 | 作用 | 注意 |
| --- | --- | --- |
| `setResourceTimingBufferSize(n)` | 设置 `resource` 缓冲区容量 | 只影响 `resource`；调小到低于当前条目数不会立即删除已有条目 |
| `clearResourceTimings()` | 清空所有 `resource` 条目 | 清完后 `getEntriesByType('resource')` 返回空数组 |
| `clearMarks(name?)` | 清空 mark（可指定名称） | 长期运行的 SPA 需定期清理 |
| `clearMeasures(name?)` | 清空 measure（可指定名称） | 同上 |

> ✅ 最佳实践：用 `PerformanceObserver` 订阅 `resource`，条目一到就处理成聚合数据，然后 `clearResourceTimings()`。这样既不会撞缓冲区上限，也不会长期占用内存。**注意：一旦有多方（如监控 SDK 与业务代码）同时调用 `clearResourceTimings()`，会互相清掉对方还没读的数据——所以清理动作应该由单一方负责。**

---

## 五、User Timing：performance.mark / performance.measure

浏览器给的指标都是"通用"的，业务自己的关键路径（比如「点击下单按钮 → 支付面板可交互」）只能自己打点。这就是 User Timing。

### 5.1 基础用法

```js
// 打一个时间点（mark），entryType 为 'mark'
performance.mark("checkout-start");
await loadPaymentPanel();
performance.mark("checkout-panel-ready");

// 计算两点之间的区间（measure），entryType 为 'measure'
performance.measure("checkout-duration", "checkout-start", "checkout-panel-ready");

const [m] = performance.getEntriesByName("checkout-duration", "measure");
console.log(m.duration); // 区间耗时
console.log(m.startTime); // 区间起点（= checkout-start 的 startTime）
```

`measure()` 有三种参数形态，容易记混：

```js
// 形态 1：两个 mark 名 —— 最常用
performance.measure("name", "startMark", "endMark");

// 形态 2：只给 startMark —— 终点默认为「调用 measure 的当下」
performance.measure("name", "startMark");

// 形态 3：options 对象 —— 唯一能挂 detail、也唯一能直接传数字时间戳
performance.measure("name", {
  start: "startMark", // 可以是 mark 名，也可以是数字（相对 time origin 的 ms）
  end: "endMark", // 同上
  // duration: 120,   // 也可以给 start + duration 或 duration + end（三者只能给两个）
  detail: { orderId: "A123" },
});

// ❌ 引用不存在的 mark 名会抛 SyntaxError
performance.measure("bad", "mark-that-never-existed");

// ✅ 打点前置保护，避免打点代码把业务搞崩
function safeMeasure(name, start, end) {
  try {
    if (!performance.getEntriesByName(start, "mark").length) return;
    performance.measure(name, start, end);
  } catch (e) {
    /* 打点失败绝不能影响业务 */
  }
}
```

### 5.2 detail 字段：给打点挂业务信息

`mark()` 和 `measure()` 都支持 `detail`，可以放任意可结构化克隆（structured clone）的值。这是把**技术耗时**和**业务上下文**绑在一起的关键。

```js
performance.mark("api-request-start", {
  detail: { api: "/api/order/create", method: "POST", retry: 0 },
  // startTime 也可以手动指定（相对 time origin 的 ms），用于补录已发生的事件
  // startTime: 1234.5,
});

performance.measure("api-request", {
  start: "api-request-start",
  detail: { api: "/api/order/create", status: 200, size: 2048, cached: false },
});

// 读取时 detail 原样可用
observe("measure", (entry) => {
  report({
    name: entry.name,
    duration: entry.duration,
    ...entry.detail, // 业务维度直接进上报字段，可按 api / status 下钻
  });
});
```

| 特性 | `mark` | `measure` |
| --- | --- | --- |
| entryType | `mark` | `measure` |
| `duration` | 恒为 **0** | 区间耗时 |
| `startTime` | 打点时刻（或 options 指定） | 区间起点 |
| 支持 `detail` | ✅ | ✅ |
| DevTools 显示形态 | Timings 轨道上的**竖线标记** | Timings 轨道上的**横向色块** |

### 5.3 与 DevTools Performance 面板联动（最实用的调试技巧）

`mark` 和 `measure` 会**自动出现在 Chrome DevTools Performance 面板的 Timings 轨道**（新版 Chrome 中为 "Performance" 面板的 Timings / Extension 轨道）上，和火焰图、Network 瀑布、Layout Shift 完全时间对齐。这意味着：

```
DevTools Performance 面板（录制后的视图）

  Timings   ├─ FCP ─┤        ▼ checkout-start        ▼ panel-ready
            │                 ├──── checkout-duration(320ms) ────┤
            │                        ▼ render-start
            │                        ├── ListRender(180ms) ──┤
  ─────────────────────────────────────────────────────────────────
  Main      ▓▓▓ Parse ▓▓▓  ░░░ Evaluate Script ░░░  ▓▓▓▓ Task(210ms) ▓▓▓▓
            │                                        └─ 这里就是 ListRender 慢的原因
  ─────────────────────────────────────────────────────────────────
  Network   ═══ app.js ═══   ═══ /api/order ═══
```

**你的 measure 色块横跨在哪段火焰图上方，就能立刻看出这 320ms 里主线程到底在干什么** —— 不用再靠 `console.time` 猜。

Chrome 还支持通过 `detail.devtools` 自定义在面板上的展示（扩展轨道、颜色、分组），用于把业务阶段做成独立轨道：

```js
performance.measure("首屏数据请求", {
  start: "fetch-start",
  end: "fetch-end",
  detail: {
    devtools: {
      dataType: "track-entry",
      track: "业务关键路径", // 自定义轨道名
      trackGroup: "MyApp",
      color: "primary",
      tooltipText: "首屏三个接口并发请求",
    },
  },
});
```

> 💡 配套技巧：`console.timeStamp()` 也会在面板上留下标记；而 `performance.mark/measure` 的优势是**同时能被采集上报**，一套打点既服务线下调试也服务线上监控。

### 5.4 React 组件级耗时打点实战

```js
// hooks/useRenderTiming.js —— 测量组件从开始渲染到 commit 后的耗时
import { useEffect, useRef } from "react";

export function useRenderTiming(componentName) {
  const startMark = `${componentName}-render-start`;
  // 渲染函数体内执行 → 对应 render 阶段开始
  performance.mark(startMark);

  useEffect(() => {
    // useEffect 在 commit 后执行 → 对应 DOM 已更新
    try {
      performance.measure(`⚛️ ${componentName}`, {
        start: startMark,
        detail: { component: componentName, phase: "mount-to-commit" },
      });
    } catch {}
    return () => {
      performance.clearMarks(startMark);
      performance.clearMeasures(`⚛️ ${componentName}`);
    };
  }, []);
}

function ProductList({ items }) {
  useRenderTiming("ProductList");
  return items.map((i) => <ProductCard key={i.id} {...i} />);
}
```

```js
// 更精准的方案：用 React 官方 Profiler 的回调，再转成 measure 进面板
import { Profiler } from "react";

function onRenderCallback(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  // phase: 'mount' | 'update' | 'nested-update'
  performance.measure(`⚛️ ${id} (${phase})`, {
    start: startTime, // Profiler 给的就是相对 time origin 的 ms，可直接用
    duration: actualDuration,
    detail: { component: id, phase, baseDuration },
  });
}

<Profiler id="ProductList" onRender={onRenderCallback}>
  <ProductList items={items} />
</Profiler>;
```

```js
// 异步数据流打点：把接口耗时和渲染耗时拆开，才知道慢在哪一段
async function loadPage() {
  performance.mark("page-load-start");

  const data = await fetchData();
  performance.mark("page-data-ready");
  performance.measure("① 数据请求", "page-load-start", "page-data-ready");

  await renderWithData(data); // 等到实际 paint 后 resolve
  performance.mark("page-rendered");
  performance.measure("② 渲染", "page-data-ready", "page-rendered");
  performance.measure("③ 首屏总耗时", "page-load-start", "page-rendered");
}
```

Vue 侧同理，Vue 3 在**开发模式**下本身就会自动打 `mark/measure`（如 `<ComponentName> render`、`<ComponentName> patch`），生产模式不打；自定义打点可以放在 `onBeforeMount` / `onMounted` 里：

```js
import { onBeforeMount, onMounted } from "vue";

export function useRenderTiming(name) {
  onBeforeMount(() => performance.mark(`${name}-start`));
  onMounted(() => {
    try {
      performance.measure(`🟢 ${name}`, `${name}-start`);
    } catch {}
  });
}
```

---

## 六、Element Timing：拿到任意关键元素的渲染时间

LCP 只告诉你「**最大**的那个元素何时渲染完」，但业务上关心的元素往往不是 LCP 元素。Element Timing 让你显式指定要测哪个元素。

### 6.1 用法：elementtiming 属性

```html
<!-- 给关键元素加 elementtiming 属性，属性值就是 entry.identifier -->
<img src="/hero.webp" elementtiming="hero-banner" alt="首屏主图" />
<h1 elementtiming="page-title">商品标题</h1>
<div elementtiming="price-block" class="price">￥1,299</div>
```

```js
observe("element", (entry) => {
  report({
    metric: "element-timing",
    identifier: entry.identifier, // elementtiming 属性值，如 'hero-banner'
    renderTime: toVisibleTime(entry.renderTime), // 元素实际绘制到屏幕的时间
    loadTime: entry.loadTime, // 图片资源加载完成时间（文本元素为 0）
    url: entry.url, // 图片 URL（文本元素为空字符串）
    intersectionRect: entry.intersectionRect, // 元素在视口中的可见矩形
    naturalWidth: entry.naturalWidth, // 图片原始宽高，可用来发现"大图小用"
    naturalHeight: entry.naturalHeight,
    id: entry.id, // 元素的 HTML id 属性
  });
});
```

> ⚠️ 规范限制：`elementtiming` 只对**图片元素**（`<img>`、`<image>`、`<video>` 的 poster、CSS `background-image`）和**包含文本节点的块级元素**生效。给一个空 `<div>` 加上它不会产生任何 entry。

### 6.2 关键字段与 LCP 的关系

| 维度 | `largest-contentful-paint` | `element` |
| --- | --- | --- |
| 测哪个元素 | 浏览器自动选出的**最大**内容元素 | 你用 `elementtiming` **手动指定**的元素 |
| 数量 | 全页面最终 1 个（过程中会多次更新） | 每个被标记的元素各 1 条 |
| 标识字段 | `element`（DOM 引用）、`url`、`size` | `identifier`、`id`、`url` |
| 是否随渲染更新 | ✅ 会被更大的元素取代 | ❌ 每个元素只报一次（首次渲染） |
| 是否需要改 HTML | ❌ 零侵入 | ✅ 必须加属性 |
| 典型用途 | Core Web Vitals 达标 | 业务自定义首屏、关键元素 SLA |

### 6.3 什么场景真的需要它

| 场景 | 为什么 LCP 不够 |
| --- | --- |
| 首屏主图不是最大元素 | 电商页面顶部 banner 是业务核心，但页面下方有一张更大的详情长图抢走了 LCP 归属 |
| 关键数字（价格、余额） | 文本块小，永远不会成为 LCP，但用户看不到价格就等于页面没加载完 |
| 多个关键元素要分别定 SLA | LCP 只有一个值，无法回答「标题什么时候出来、价格什么时候出来」 |
| LCP 被骨架屏/占位图污染 | 骨架屏大块占位被判为 LCP，真实内容渲染时间反而丢了 |
| 视频封面（poster） | poster 可能不参与 LCP 竞争，但它就是用户看到的第一帧 |

```js
// ✅ 组合用法：LCP 保达标，Element Timing 保业务口径
const businessFirstPaint = {};
const CRITICAL = ["hero-banner", "page-title", "price-block"];

observe("element", (entry) => {
  if (!CRITICAL.includes(entry.identifier)) return;
  businessFirstPaint[entry.identifier] = toVisibleTime(entry.renderTime);

  // 所有关键元素都渲染完 → 业务定义的"首屏完成"
  if (CRITICAL.every((k) => businessFirstPaint[k] != null)) {
    report({
      metric: "business-fmp",
      value: Math.max(...Object.values(businessFirstPaint)), // 取最晚的那个
      breakdown: businessFirstPaint,
    });
  }
});
```

---

## 七、Long Task 与 LoAF：从「知道卡了」到「知道谁卡的」

### 7.1 longtask 的局限

```js
observe("longtask", (entry) => {
  console.log({
    name: entry.name, // 'self' / 'same-origin-descendant' / 'cross-origin-unreachable' ...
    startTime: entry.startTime,
    duration: entry.duration, // > 50ms
    attribution: entry.attribution, // TaskAttributionTiming[]，只有容器级信息
  });
});
```

`longtask` 的 `attribution` 数组里是 `TaskAttributionTiming`，字段只有：

| 字段 | 值 |
| --- | --- |
| `containerType` | `'window'` / `'iframe'` / `'embed'` / `'object'` |
| `containerSrc` | 容器的 src |
| `containerId` | 容器的 id 属性 |
| `containerName` | 容器的 name 属性 |

`entry.name` 的取值也只是**归属范围**的粗描述：

| `name` | 含义 |
| --- | --- |
| `self` | 长任务发生在当前 window（frame）本身 |
| `same-origin-ancestor` / `-descendant` / `same-origin` | 同源的祖先 / 后代 / 其他 frame |
| `cross-origin-ancestor` / `-descendant` / `cross-origin-unreachable` | 跨域 frame，细节不可见 |
| `multiple-contexts` / `unknown` | 多个上下文 / 无法归因 |

**核心问题：`longtask` 只告诉你「主线程被占用了 180ms，发生在本窗口」，完全不知道是哪个脚本、哪个函数、哪一行。** 线上拿到一堆 `{ name: 'self', duration: 180 }`，无法采取任何行动。

另外两个次级局限：

- **50ms 硬阈值**：49ms 的任务不上报，但十个 49ms 连排一样卡。
- **只覆盖"任务"，不覆盖"渲染"**：任务结束后的样式计算、布局、绘制耗时不在 `duration` 里，而这部分正是 INP 的 Presentation Delay。

### 7.2 long-animation-frame（LoAF）：2024 年后 INP 归因的关键 API

LoAF 的观测单位从「任务」升级为「**动画帧**」——包含该帧内所有任务 + 渲染工作，默认在帧总时长超过 50ms 时上报。

```js
observe("long-animation-frame", (entry) => {
  console.log({
    startTime: entry.startTime, // 帧开始时间
    duration: entry.duration, // 帧总时长（含渲染）
    renderStart: entry.renderStart, // 渲染工作开始时间（requestAnimationFrame 回调起点）
    styleAndLayoutStart: entry.styleAndLayoutStart, // 样式计算与布局开始时间
    blockingDuration: entry.blockingDuration, // ★ 阻塞时长
    firstUIEventTimestamp: entry.firstUIEventTimestamp, // 该帧内第一个 UI 事件的时间戳
    scripts: entry.scripts, // ★ PerformanceScriptTiming[]，归因核心
  });
});
```

**帧结构 ASCII 图：**

```
       LoAF：一个长动画帧的内部结构

 startTime                renderStart        styleAndLayoutStart      startTime+duration
    │                          │                     │                        │
    ├── 任务 A ──┤├── 任务 B ──┤                     │                        │
    │  (scripts[0])  (scripts[1])                    │                        │
    │                          ├─ rAF 回调 ─┤        ├─ Style ─┤├─ Layout ─┤  │
    │                          │ (scripts[2])│       │         ││          │  │
    │←───────── 脚本执行阶段 ──→│←── 渲染阶段（Render）──────────────────────→│
    │                                                                          │
    │←──────────────────── duration（帧总时长）───────────────────────────────→│
    │
    │←── blockingDuration：帧内所有 >50ms 任务超出 50ms 的部分之和 ──→
                                    （用于估算对交互的实际阻塞）
```

### 7.3 entry.scripts[]：能直接定位到代码位置

数组元素是 `PerformanceScriptTiming`（`entryType` 为 `'script'`），这才是 LoAF 的杀手级能力：

| 字段 | 含义 | 示例值 |
| --- | --- | --- |
| `invoker` | **谁触发**了这段脚本 | `'BUTTON#submit.onclick'`、`'Window.requestAnimationFrame'`、`'https://a.com/app.js'` |
| `invokerType` | 触发类型 | `'user-callback'` / `'event-listener'` / `'resolve-promise'` / `'reject-promise'` / `'classic-script'` / `'module-script'` |
| `sourceURL` | 脚本**源文件 URL** | `'https://a.com/chunk-vendor.js'` |
| `sourceFunctionName` | **函数名** | `'handleSubmit'` |
| `sourceCharPosition` | 函数在源文件中的**字符偏移量** | `48213` |
| `executionStart` | 编译结束、开始执行的时间 | 用 `executionStart - startTime` 得到编译耗时 |
| `startTime` / `duration` | 该段脚本的起止与耗时 | —— |
| `forcedStyleAndLayoutDuration` | 该脚本内**强制同步布局**（layout thrashing）的耗时 | 直接暴露布局抖动 |
| `pauseDuration` | 同步阻塞耗时（`alert` / 同步 XHR 等） | —— |
| `window` / `windowAttribution` | 所属 window 与归属关系（`'self'` / `'descendant'` / `'ancestor'` / `'same-page'` / `'other'`） | —— |

`sourceURL` + `sourceCharPosition` 组合起来，配合 sourcemap 就能**还原到源码的具体行列**：

```js
observe("long-animation-frame", (entry) => {
  // 只上报真正影响交互的帧
  if (entry.blockingDuration < 50) return;

  // 找出该帧内最耗时的那段脚本 —— 归因的第一嫌疑人
  const worst = entry.scripts.reduce(
    (a, b) => (b.duration > (a?.duration ?? 0) ? b : a),
    null,
  );

  report({
    metric: "loaf",
    frameDuration: entry.duration,
    blockingDuration: entry.blockingDuration,
    // 渲染阶段耗时 = 帧结束 - 渲染开始（对应 INP 的 Presentation Delay）
    renderDuration: entry.renderStart > 0 ? entry.startTime + entry.duration - entry.renderStart : 0,
    styleAndLayout:
      entry.styleAndLayoutStart > 0
        ? entry.startTime + entry.duration - entry.styleAndLayoutStart
        : 0,
    // ★ 精确归因：一条上报就能定位到人、到文件、到函数、到字符位置
    culprit: worst && {
      invoker: worst.invoker,
      invokerType: worst.invokerType,
      sourceURL: worst.sourceURL,
      sourceFunctionName: worst.sourceFunctionName,
      sourceCharPosition: worst.sourceCharPosition, // 配合 sourcemap 反解行列
      duration: worst.duration,
      compileTime: worst.executionStart - worst.startTime,
      forcedLayout: worst.forcedStyleAndLayoutDuration, // > 0 说明存在强制同步布局
    },
  });
});
```

### 7.4 longtask vs LoAF 对比

| 维度 | `longtask` | `long-animation-frame`（LoAF） |
| --- | --- | --- |
| 观测单位 | 单个任务 | 整个动画帧（多任务 + 渲染） |
| 是否包含渲染耗时 | ❌ 不含 | ✅ 含（`renderStart` / `styleAndLayoutStart`） |
| 归因粒度 | 容器级（window / iframe） | **脚本级**（URL + 函数名 + 字符位置） |
| 强制同步布局可见 | ❌ | ✅ `forcedStyleAndLayoutDuration` |
| 阻塞量化 | 只有 `duration` | `blockingDuration`，更贴近对交互的真实影响 |
| 与 INP 的关系 | 只能解释 Input Delay 的一部分 | 可解释 INP 三段中的全部 |
| 触发阈值 | 任务 > 50ms | 帧 > 50ms（默认，Chrome 中不可配置） |
| 浏览器支持 | Chromium + 部分其他 | Chrome 123+（Chromium 独占） |
| 建议 | 作为兜底/趋势观测 | **归因主力**，能用就用 |

### 7.5 与 INP 联合归因

真正的 INP 排查是把 `event` 条目和 LoAF 条目按时间对齐：

```js
const loafBuffer = [];
observe("long-animation-frame", (entry) => {
  loafBuffer.push(entry);
  if (loafBuffer.length > 30) loafBuffer.shift(); // 只留最近 30 帧
});

observe(
  "event",
  (evt) => {
    if (evt.duration < 200) return; // 只查慢交互（超过 INP Good 阈值）
    const evtEnd = evt.startTime + evt.duration;

    // 找出与该交互时间区间重叠的 LoAF 帧
    const related = loafBuffer.filter(
      (f) => f.startTime + f.duration > evt.startTime && f.startTime < evtEnd,
    );

    report({
      metric: "slow-interaction",
      eventName: evt.name, // 'click' / 'keydown' / 'pointerup' ...
      inputDelay: evt.processingStart - evt.startTime,
      processingTime: evt.processingEnd - evt.processingStart,
      presentationDelay: evtEnd - evt.processingEnd,
      // 把每一帧里的脚本摊平，得到完整嫌疑列表
      scripts: related.flatMap((f) =>
        f.scripts.map((s) => ({
          fn: s.sourceFunctionName,
          url: s.sourceURL,
          pos: s.sourceCharPosition,
          invokerType: s.invokerType,
          duration: s.duration,
        })),
      ),
    });
  },
  { durationThreshold: 40 }, // 只订阅 >=40ms 的事件，降低开销（最小有效值为 16）
);
```

> 💡 `web-vitals` v4+ 的 `onINP(cb, { reportAllChanges })` 回调里，`metric.attribution` 已经内置了 LoAF 归因信息（`longAnimationFrameEntries`、`longestScript` 等），生产项目直接用库比手写更稳。

---

## 八、Server Timing：把后端耗时带到前端

TTFB 慢，到底是网络慢还是后端慢？`Server-Timing` 响应头让服务端把内部耗时拆解直接告诉前端，实现前后端一体化归因。

### 8.1 响应头格式

```
Server-Timing: <name>;dur=<duration>;desc="<description>"
```

多个指标用逗号分隔，`dur` 单位为毫秒（可为小数），`desc` 可选：

```
Server-Timing: db;dur=120.5;desc="MySQL 查询",
               cache;dur=2.1;desc="Redis",
               render;dur=45;desc="SSR 渲染",
               total;dur=180,
               app;desc="order-service-v2"
```

### 8.2 服务端设置示例

```js
// Node / Express 中间件
function serverTiming(req, res, next) {
  const marks = {};
  const t0 = process.hrtime.bigint();
  const metrics = [];

  res.startTiming = (name) => (marks[name] = process.hrtime.bigint());
  res.endTiming = (name, desc) => {
    if (!marks[name]) return;
    const dur = Number(process.hrtime.bigint() - marks[name]) / 1e6; // ns → ms
    metrics.push(`${name};dur=${dur.toFixed(1)}${desc ? `;desc="${desc}"` : ""}`);
  };

  // ⚠️ 必须在响应头发出之前写入，所以要挂在 writeHead 之前
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = (...args) => {
    const total = Number(process.hrtime.bigint() - t0) / 1e6;
    metrics.push(`total;dur=${total.toFixed(1)}`);
    res.setHeader("Server-Timing", metrics.join(", "));
    return originalWriteHead(...args);
  };
  next();
}

app.get("/api/order", async (req, res) => {
  res.startTiming("db");
  const order = await db.query("SELECT ...");
  res.endTiming("db", "MySQL 查询");

  res.startTiming("cache");
  const user = await redis.get(`user:${order.uid}`);
  res.endTiming("cache", "Redis");

  res.json({ order, user });
});
```

```nginx
# Nginx：把上游耗时与自身处理耗时暴露出去
# $upstream_response_time / $request_time 单位是秒，需要乘 1000
add_header Server-Timing "upstream;dur=${upstream_response_time}000, edge;dur=${request_time}000" always;

# ⚠️ 跨域场景下，前端要读到 serverTiming 同样需要 TAO
add_header Timing-Allow-Origin "https://www.myapp.com" always;
```

### 8.3 前端读取

`serverTiming` 字段挂在 `PerformanceResourceTiming` 上（`navigation` 条目也继承了它），元素类型为 `PerformanceServerTiming`，只有三个字段：`name` / `duration` / `description`。

```js
// 读主文档的后端耗时
const nav = performance.getEntriesByType("navigation")[0];
for (const st of nav.serverTiming) {
  console.log(st.name, st.duration, st.description);
  // 'db' 120.5 'MySQL 查询'
}

// ✅ 一体化归因：把 TTFB 拆成「后端耗时」和「网络耗时」
function splitTTFB(entry) {
  const ttfb = entry.responseStart - entry.requestStart;
  const server = entry.serverTiming.find((s) => s.name === "total")?.duration ?? 0;
  return {
    ttfb,
    backend: server, // 后端真实处理耗时
    network: Math.max(ttfb - server, 0), // 剩下的就是网络往返 + 排队
    breakdown: Object.fromEntries(entry.serverTiming.map((s) => [s.name, s.duration])),
  };
}

// 接口维度：给每个 XHR/fetch 都带上后端耗时
observe("resource", (r) => {
  if (r.initiatorType !== "fetch" && r.initiatorType !== "xmlhttprequest") return;
  if (!r.serverTiming?.length) return; // 跨域无 TAO 时为空数组
  report({ metric: "api-timing", url: r.name, ...splitTTFB(r) });
});
```

| 注意点 | 说明 |
| --- | --- |
| 只能在响应头中设置 | 响应体已开始发送后无法追加，长流式响应的总耗时拿不到 |
| 跨域需要 TAO | 没有 `Timing-Allow-Origin` 时 `serverTiming` 恒为**空数组** |
| 不要泄露敏感信息 | `desc` 里别放 SQL 原文、内部 IP、内部服务拓扑等 |
| DevTools 原生支持 | Network 面板的 Timing 标签会自动展示 Server Timing 分段，零成本可视化 |
| `duration` 可省略 | 只给 `desc` 可用于传纯标签（如机房、版本号），此时 `duration` 为 0 |

---

## 九、采集上报实战

把前面的 API 组装成一个能上线的采集器。难点不在调 API，而在**上报时机、bfcache、采样、SPA 重置**这四件事。

### 9.1 上报时机：为什么不能用 unload

```
页面生命周期与上报时机

  active ──────► hidden ──────► frozen ──────► 进入 bfcache（可恢复）
    │              │                                   │
    │              │                                   └─► pageshow(persisted=true) 恢复
    │              │
    │              └─► terminated（真正销毁）
    │
  ┌──────────────────────────────────────────────────────────────┐
  │ ❌ unload / beforeunload：注册监听器会让页面失去 bfcache 资格   │
  │    且在移动端经常根本不触发 → 数据丢失 + 破坏后退秒开           │
  │ ✅ visibilitychange → hidden：移动端切后台、锁屏都会触发，最可靠 │
  │ ✅ pagehide：作为 Safari 等场景的兜底                          │
  └──────────────────────────────────────────────────────────────┘
```

| 事件 | 移动端可靠性 | 是否破坏 bfcache | 建议 |
| --- | --- | --- | --- |
| `unload` | 极低（iOS 基本不触发） | ✅ 破坏 | ❌ 绝对不用 |
| `beforeunload` | 低 | ✅ 破坏（部分场景） | ❌ 不用于上报 |
| `visibilitychange`（→ hidden） | 高 | ❌ 不破坏 | ✅ **首选** |
| `pagehide` | 中高 | ❌ 不破坏 | ✅ 兜底并用 |
| `load` | 高，但太早 | ❌ | 仅用于导航类指标 |

### 9.2 sendBeacon 为什么比 fetch 合适

| 维度 | `navigator.sendBeacon` | `fetch` / `XHR` |
| --- | --- | --- |
| 页面卸载后能否继续发送 | ✅ 浏览器接管，页面关了照样发完 | ❌ 页面销毁时请求被取消 |
| 是否阻塞卸载/下一页导航 | ❌ 完全异步，不阻塞 | ⚠️ `keepalive` 也可能受限于并发/体积 |
| 优先级 | 最低优先级，不与业务资源竞争带宽 | 正常优先级，会抢带宽 |
| 体积上限 | 约 **64KB**（超出返回 `false`） | 大得多 |
| 能否读响应 | ❌ 只返回 `true`/`false`（是否成功入队） | ✅ |
| 请求方法 | 固定 `POST` | 任意 |

```js
function send(url, payload) {
  const body = JSON.stringify(payload);

  // ✅ 优先 sendBeacon：页面卸载时最可靠，且不抢带宽
  if (navigator.sendBeacon) {
    // 用 Blob 指定 Content-Type，否则默认是 text/plain
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return; // 返回 false 说明超 64KB 或队列满
  }

  // ✅ 兜底：fetch + keepalive（同样能在卸载后继续，但体积限制更严）
  fetch(url, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});

  // ❌ 反面写法：卸载时用普通 fetch，请求会被直接取消
  // fetch(url, { method: 'POST', body });
}
```

### 9.3 bfcache 恢复与重复上报

从 bfcache 恢复的页面**没有重新导航**：time origin 不变、`navigation` 条目还是老的、已上报的 LCP/FCP 不会重来。如果不处理，会出现两类问题：

1. **重复上报**：`visibilitychange` 会在恢复后再次进入 hidden 时触发，把同一份数据再发一次。
2. **指标失真**：恢复后的用户交互产生的 INP，如果继续累加到上次的会话里，口径就混了。

```js
// bfcache 恢复检测：两种途径
// 途径 1：pageshow 事件的 persisted 标志（兼容性最好）
window.addEventListener("pageshow", (e) => {
  if (e.persisted) onBFCacheRestore(e.timeStamp);
});

// 途径 2：back-forward-cache-restoration entryType（更精确，能拿到恢复耗时）
observe("back-forward-cache-restoration", (entry) => {
  // entry.startTime 恢复开始时间；entry.pageshowEventStart / pageshowEventEnd
  onBFCacheRestore(entry.startTime, {
    pageshowDuration: entry.pageshowEventEnd - entry.pageshowEventStart,
  });
});
```

```js
// ✅ 用「已上报标记 + 会话 ID 重置」双管齐下
let reported = false; // 本次会话是否已 flush
let sessionId = uuid(); // 会话标识，恢复后重置

function flush(reason) {
  if (reported || !Object.keys(buffer).length) return;
  reported = true; // ★ 防重复的关键
  send(REPORT_URL, { sessionId, reason, metrics: buffer });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush("hidden");
});
window.addEventListener("pagehide", () => flush("pagehide"));

function onBFCacheRestore(restoreTime, extra) {
  flush("before-bfcache-restore"); // 先把老数据发掉
  // ★ 重置状态，开启新会话
  reported = false;
  sessionId = uuid();
  buffer = {};
  timeOriginOffset = restoreTime; // 后续指标以恢复时刻为新零点
  report({ metric: "bfcache-restore", ...extra });
}
```

> 💡 `web-vitals` 库已经内置处理：bfcache 恢复后它会重新采集 LCP/FCP/CLS/INP，并给出**新的 `metric.id`**（同一 metric 的 id 变了就代表新会话），同时 `metric.navigationType` 会变成 `'back-forward-cache'`。手写采集器很难做到同样完备，生产环境建议用库 + 自定义补充。

### 9.4 采样策略

```js
// ✅ 会话级采样：同一会话要么全采要么全不采，避免同一用户数据缺片段
const SAMPLE_RATE = 0.1; // 10%
function decideSampling() {
  // 用 sessionStorage 让同一会话内决策一致（含 SPA 路由切换）
  const cached = sessionStorage.getItem("perf-sampled");
  if (cached !== null) return cached === "1";
  const sampled = Math.random() < SAMPLE_RATE;
  sessionStorage.setItem("perf-sampled", sampled ? "1" : "0");
  return sampled;
}

// ❌ 反面写法：每次上报独立随机，导致同一用户的 FCP 采到了、LCP 丢了，无法做关联分析
// if (Math.random() < 0.1) send(...)
```

| 策略 | 做法 | 适用 |
| --- | --- | --- |
| 会话级采样 | 会话开始时决策一次，全程一致 | 默认方案，保证指标可关联 |
| 分层采样 | 核心页面 100%，长尾页面 1% | 页面数量多、重要性差异大 |
| 异常全采 | 指标超阈值（LCP > 4s、INP > 500ms）时 100% 上报 | 保证坏样本不被采样丢掉 |
| 白名单全采 | 内部用户 / 灰度用户全采 | 灰度期观测 |
| 上报合并 | 一次会话所有指标攒在一起，hidden 时一次发出 | 降低请求数（配合 64KB 上限） |

```js
// ✅ 组合：采样 + 异常全采
function shouldReport(metric) {
  if (isAnomaly(metric)) return true; // 坏样本永不丢
  return decideSampling();
}
function isAnomaly(m) {
  const th = { LCP: 4000, INP: 500, CLS: 0.25, TTFB: 1800 };
  return th[m.name] != null && m.value > th[m.name];
}
```

### 9.5 SPA 路由切换下的指标重置

SPA 的痛点：`navigation` 条目、`paint` 条目、LCP 都只对**首次硬导航**有效。路由切换后不会产生新的 FCP/LCP，但用户实实在在经历了一次"页面加载"。

```
SPA 路由切换时各指标的行为

  硬导航 /home ────────────► 软导航 /detail ────────────► 软导航 /list
     │                            │                           │
  navigation ✅ 产生一条         ❌ 不再产生                 ❌ 不再产生
  paint(FCP)  ✅ 产生            ❌ 不再产生                 ❌ 不再产生
  LCP         ✅ 有最终值        ❌ 已锁定，不更新            ❌ 不更新
  CLS         ✅ 开始累加        ⚠️ 继续累加（跨路由污染）    ⚠️ 继续累加
  INP/event   ✅ 采集            ✅ 继续采集（需按路由分桶）  ✅ 继续
  resource    ✅ 采集            ✅ 继续（需按时间窗切分）    ✅ 继续
  mark/measure ✅               ✅ ★ 软导航只能靠自己打点     ✅
```

```js
// ✅ SPA 软导航采集：用 User Timing 自建"路由级首屏"
let currentRoute = location.pathname;
let routeStartMark = null;
let clsBaseline = 0; // CLS 分段基线

function onRouteChange(nextRoute) {
  // 1. 结算上一个路由
  if (routeStartMark) {
    try {
      performance.measure(`route:${currentRoute}`, routeStartMark);
    } catch {}
  }
  flush("route-change"); // 上报上一个路由的数据（注意重置 reported）

  // 2. 重置状态，开启新路由会话
  reported = false;
  buffer = {};
  currentRoute = nextRoute;
  clsBaseline = totalCLS; // ★ CLS 按路由分段，避免跨路由污染
  routeStartMark = `route-start:${nextRoute}`;
  performance.mark(routeStartMark, { detail: { route: nextRoute } });
  resourceWindowStart = performance.now(); // ★ resource 也按时间窗切分
}

// React Router v6 接法
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    onRouteChange(location.pathname);
  }, [location.pathname]);
  return null;
}

// 路由内容渲染完成时结算"软导航首屏"
// —— 关键：要在真实 paint 之后，用双层 rAF 或 requestPostAnimationFrame 近似
function markRouteReady(route) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      performance.measure(`soft-nav-fcp:${route}`, {
        start: `route-start:${route}`,
        detail: { route, type: "soft-navigation" },
      });
    });
  });
}
```

> 💡 Chrome 正在推进 **Soft Navigations API**（`entryType` 为 `soft-navigation`，并让 `paint` / `largest-contentful-paint` 在软导航后重新产生），目前仍在实验阶段（需 flag 开启），生产不可依赖。现阶段 SPA 路由级首屏只能靠 User Timing 自建。

### 9.6 完整采集器骨架

```js
// perf-collector.js —— 建议内联到 HTML 头部或作为最先执行的脚本
const REPORT_URL = "https://rum.example.com/collect";
let buffer = {};
let reported = false;
let sessionId = crypto.randomUUID();
let totalCLS = 0;

// ---------- 基础设施 ----------
const supports = (t) =>
  typeof PerformanceObserver !== "undefined" &&
  PerformanceObserver.supportedEntryTypes?.includes(t);

function observe(type, cb, opts = {}) {
  if (!supports(type)) return null;
  try {
    const po = new PerformanceObserver((list) => list.getEntries().forEach(cb));
    po.observe({ type, buffered: true, ...opts });
    return po;
  } catch {
    return null;
  }
}

const activationStart = () =>
  performance.getEntriesByType("navigation")[0]?.activationStart ?? 0;
const toVisibleTime = (t) => Math.max(t - activationStart(), 0);
const put = (k, v) => (buffer[k] = v);

// ---------- 1. 导航与网络分段 ----------
observe("navigation", (nav) => {
  put("nav", {
    type: nav.type,
    redirectCount: nav.redirectCount,
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    tcp: nav.connectEnd - nav.connectStart,
    tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
    ttfb: toVisibleTime(nav.responseStart),
    download: nav.responseEnd - nav.responseStart,
    domInteractive: toVisibleTime(nav.domInteractive),
    dcl: toVisibleTime(nav.domContentLoadedEventEnd),
    load: toVisibleTime(nav.loadEventEnd),
    server: Object.fromEntries((nav.serverTiming ?? []).map((s) => [s.name, s.duration])),
  });
});

// ---------- 2. FCP ----------
observe("paint", (e) => {
  if (e.name === "first-contentful-paint") put("FCP", toVisibleTime(e.startTime));
});

// ---------- 3. LCP（取最后一条，且在 hidden 时定格）----------
observe("largest-contentful-paint", (e) => {
  put("LCP", {
    value: toVisibleTime(e.startTime),
    element: e.element?.tagName,
    url: e.url,
    size: e.size,
  });
});

// ---------- 4. CLS（会话窗口累加）----------
let sessionValue = 0;
let sessionEntries = [];
observe("layout-shift", (e) => {
  if (e.hadRecentInput) return; // 用户主动交互引起的偏移不计入
  const first = sessionEntries[0];
  const last = sessionEntries[sessionEntries.length - 1];
  // 会话窗口：间隔 <1s 且总长 <5s 归为同一窗口
  if (sessionValue && e.startTime - last.startTime < 1000 && e.startTime - first.startTime < 5000) {
    sessionValue += e.value;
    sessionEntries.push(e);
  } else {
    sessionValue = e.value;
    sessionEntries = [e];
  }
  totalCLS = Math.max(totalCLS, sessionValue); // CLS 取最大会话窗口
  put("CLS", totalCLS);
});

// ---------- 5. INP + LoAF 归因 ----------
const loafBuffer = [];
observe("long-animation-frame", (f) => {
  loafBuffer.push(f);
  if (loafBuffer.length > 20) loafBuffer.shift();
});

const interactions = [];
observe(
  "event",
  (e) => {
    if (!e.interactionId) return; // 只统计真实交互（有 interactionId 的）
    interactions.push(e.duration);
    interactions.sort((a, b) => b - a);
    // 近似 INP：取第 98 百分位 ≈ 每 50 次交互允许一个更差值
    const idx = Math.min(Math.floor(interactions.length / 50), interactions.length - 1);
    const inp = interactions[idx];
    put("INP", inp);

    if (e.duration >= 200) {
      const end = e.startTime + e.duration;
      const scripts = loafBuffer
        .filter((f) => f.startTime + f.duration > e.startTime && f.startTime < end)
        .flatMap((f) => f.scripts ?? [])
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3)
        .map((s) => ({
          fn: s.sourceFunctionName,
          url: s.sourceURL,
          pos: s.sourceCharPosition,
          invoker: s.invoker,
          invokerType: s.invokerType,
          dur: s.duration,
          forcedLayout: s.forcedStyleAndLayoutDuration,
        }));
      put("slowInteractions", [...(buffer.slowInteractions ?? []), {
        name: e.name,
        duration: e.duration,
        inputDelay: e.processingStart - e.startTime,
        processing: e.processingEnd - e.processingStart,
        presentation: end - e.processingEnd,
        scripts,
      }].slice(-5));
    }
  },
  { durationThreshold: 40 },
);

// ---------- 6. 资源聚合（避免逐条上报）----------
const resAgg = {};
observe("resource", (r) => {
  const t = (resAgg[r.initiatorType] ??= { count: 0, dur: 0, size: 0, cached: 0, restricted: 0 });
  t.count++;
  t.dur += r.duration;
  t.size += r.decodedBodySize; // ★ 用 decodedBodySize 而非 transferSize
  if (r.transferSize === 0 && r.decodedBodySize > 0) t.cached++;
  if (r.requestStart === 0) t.restricted++; // 跨域缺 TAO，打标便于治理
  put("resources", resAgg);
});

// ---------- 7. 业务自定义打点 ----------
observe("measure", (m) => {
  put("measures", { ...(buffer.measures ?? {}), [m.name]: { d: m.duration, ...m.detail } });
});
observe("element", (e) => {
  put("elements", { ...(buffer.elements ?? {}), [e.identifier]: toVisibleTime(e.renderTime) });
});

// ---------- 8. 上报 ----------
function flush(reason) {
  if (reported || !Object.keys(buffer).length) return;
  if (!shouldReport({ name: "LCP", value: buffer.LCP?.value ?? 0 })) return;
  reported = true;
  const body = JSON.stringify({
    sessionId,
    reason,
    url: location.href,
    ua: navigator.userAgent,
    // 网络与设备信息，用于分桶排除环境噪声
    conn: navigator.connection?.effectiveType,
    rtt: navigator.connection?.rtt,
    mem: navigator.deviceMemory,
    cpu: navigator.hardwareConcurrency,
    metrics: buffer,
  });
  if (!navigator.sendBeacon?.(REPORT_URL, new Blob([body], { type: "application/json" }))) {
    fetch(REPORT_URL, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
  }
}

// ✅ 正确的上报时机组合
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush("hidden");
});
window.addEventListener("pagehide", () => flush("pagehide"));

// ✅ bfcache 恢复：先结算旧会话，再开新会话
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  flush("bfcache-leave");
  reported = false;
  sessionId = crypto.randomUUID();
  buffer = { bfcacheRestore: true };
});

// ❌ 绝对不要写这两行：会让页面失去 bfcache 资格
// window.addEventListener('unload', flush);
// window.addEventListener('beforeunload', flush);
```

### 9.7 采集器自检清单

| 检查项 | 为什么 |
| --- | --- |
| 所有 `observe` 都带 `buffered: true` | 否则脚本执行前产生的 FCP/LCP 全部丢失 |
| 所有 entryType 都做了 `supportedEntryTypes` 检测 | Safari 不支持 LoAF/element，裸调会抛错中断整个采集 |
| 时间点指标都减了 `activationStart` | 预渲染场景下指标虚低到失真 |
| 用 `visibilitychange` + `pagehide`，无 `unload` | 保证移动端不丢数据、不破坏 bfcache |
| `sendBeacon` 失败时有 `keepalive` 兜底 | 超 64KB 或队列满时 `sendBeacon` 返回 `false` |
| 上报有 `reported` 幂等标记 | 否则 hidden/pagehide 会重复发两次 |
| bfcache 恢复重置了 sessionId 与 buffer | 否则新旧数据混算 |
| 资源数据做了聚合，不逐条上报 | 一个页面几百条 resource，全量上报会打爆带宽与后端 |
| 跨域缺 TAO 的字段没被当 0 上报 | 会让大盘 TTFB 严重低估 |
| 采样是会话级的 | 否则同一用户指标残缺，无法关联分析 |
| SPA 路由切换重置了 buffer 与 CLS 基线 | 否则跨路由污染 |
| 采集代码全程 try/catch，不抛错 | 监控代码不能反过来搞崩业务 |

---

## 十、面试高频问答 🎯

### Q1：`performance.getEntriesByType()` 和 `PerformanceObserver` 有什么区别？`buffered: true` 解决了什么问题？

前者是拉取式的同步快照，后者是订阅式的推送。生产采集必须用 Observer，原因有三个：一是**时机问题**，采集脚本通常是异步加载的，等它执行时 FCP、LCP 可能早就发生了，同步拉取拿不到；二是**缓冲区上限**，resource 缓冲区默认只有 250 条，满了以后新条目直接丢弃，拉取式只能拿到残缺数据；三是 LCP 会随渲染多次更新、CLS 需要持续累加，单次快照拿到的是中间值不是最终值。

`buffered: true` 的语义是：把 Observer 创建**之前**浏览器已经缓存的历史条目也一并投递给回调。所以它对 FCP、LCP、navigation 这些一次性早期指标不是优化项，而是正确性前提。`web-vitals` 库内部一律带这个参数就是这个原因。注意它只在 `{ type: 'x' }` 单类型写法下生效，`entryTypes` 数组写法不支持。

### Q2：`performance.timing` 和 `PerformanceNavigationTiming` 有什么区别？为什么前者被废弃？

`performance.timing` 是 Navigation Timing Level 1，已被标记为废弃；`PerformanceNavigationTiming` 是 Level 2，是现行标准。核心区别是**时间基准**：旧 API 的字段都是 Unix 绝对时间戳，精度只有整数毫秒，而且基于系统时钟——用户改时间或者 NTP 校时都会让差值失真甚至算出负数；新 API 的字段全是相对 time origin 的偏移量，基于单调时钟，精度到微秒级，而且不需要减 `navigationStart` 就能直接用。

另外新 API 是标准的 PerformanceEntry，能被 `PerformanceObserver` 订阅，还新增了 `transferSize`、`nextHopProtocol`、`serverTiming`、`activationStart` 这些旧 API 完全没有的字段；`type` 也从 0/1/2 的魔法数字变成了 `navigate`/`reload`/`back_forward`/`prerender` 字符串。旧 API 里的 `domLoading` 在新标准中被直接移除了。

### Q3：`transferSize`、`encodedBodySize`、`decodedBodySize` 分别是什么？怎么判断资源命中了缓存？

`transferSize` 是网络上实际传输的字节数，包含响应头加上压缩后的响应体；`encodedBodySize` 是压缩后的响应体大小，不含头；`decodedBodySize` 是解压后的原始大小，也不含头。

判断缓存有两条规则：`transferSize` 为 0 而 `decodedBodySize` 大于 0，说明命中了**强缓存**，完全没走网络；`transferSize` 有值但很小（几百字节以内）而 `encodedBodySize` 为 0，说明是 **304 协商缓存**，只传了响应头。压缩率用 `1 - encodedBodySize / decodedBodySize` 算，接近 0 就说明 Gzip/Brotli 没生效。

一个常见错误是拿 `transferSize` 去统计包体积——强缓存命中时它是 0，会把体积算成 0，正确做法是用 `decodedBodySize`。

### Q4：为什么跨域资源的耗时字段全是 0？怎么修？

出于隐私考虑，浏览器防止站点通过耗时侧信道探测用户的网络状况和缓存状态。跨域资源默认只暴露 `name`、`startTime`、`duration`、`responseEnd`、`initiatorType` 这几个粗粒度字段，`domainLookupStart/End`、`connectStart/End`、`requestStart`、`responseStart`、三个体积字段、`nextHopProtocol`、`serverTiming` 全部被置 0 或置空。

解法是让资源所在的域返回 `Timing-Allow-Origin` 响应头，值可以是具体来源或 `*`。注意它和 CORS 的 `Access-Control-Allow-Origin` 是两个独立的头，配了 CORS 不等于配了 TAO，`crossorigin` 属性也不能替代。

实战上更重要的一点是：采集代码必须主动识别这种情况——用 `requestStart === 0` 判定字段不可见，然后打标而不是上报 0，否则一堆 0 混进大盘会把 TTFB 严重低估。

### Q5：`longtask` 只知道卡了 50ms，怎么定位到具体代码？

用 `long-animation-frame`（LoAF），这是 2024 年后 INP 归因的关键 API。`longtask` 的 `attribution` 只有容器级信息（window 还是 iframe），`name` 也只是 `self`、`same-origin-descendant` 这种归属描述，线上拿到一堆 `{ name: 'self', duration: 180 }` 完全没法行动；而且它不包含任务结束后的样式计算和布局绘制耗时，正好漏掉了 INP 的 Presentation Delay。

LoAF 把观测单位从「任务」升级为「动画帧」，包含帧内所有任务加渲染工作。关键是 `entry.scripts[]` 数组，每一项都有 `invoker`（谁触发的，比如 `BUTTON#submit.onclick`）、`invokerType`（`event-listener`/`resolve-promise` 等）、`sourceURL`、`sourceFunctionName`、`sourceCharPosition`——配合 sourcemap 就能反解到源码具体行列。另外 `forcedStyleAndLayoutDuration` 直接暴露强制同步布局耗时，`blockingDuration` 比 `duration` 更贴近对交互的真实阻塞。

实战做法是缓存最近若干条 LoAF，再把慢的 `event` 条目按时间区间去匹配重叠的帧，取里面最耗时的脚本作为第一嫌疑人。生产项目直接用 `web-vitals` v4+ 的 `metric.attribution` 更稳，它已经内置了这套归因。

---

## 相关笔记

- [Web Vitals：INP 指标详解](./Web%20Vitals与INP指标详解.md) — INP 三段拆解与优化手段，本篇 LoAF 归因的上游
- [前端性能优化全景](./前端性能优化全景.md) — 优化手段总览，第一章的指标采集在本篇有系统化展开
- [大量 DOM 节点优化方案](./大量DOM节点优化方案.md) — 长任务与强制同步布局的具体治理
- [页面渲染流程与优化](../浏览器原理/渲染/页面渲染流程与优化.md) — 理解 LoAF 里 Style / Layout 阶段的前置知识
- [缓存机制](../浏览器原理/缓存/缓存机制.md) — 强缓存与协商缓存，对应本篇的体积字段判定
- [HTTP 请求头与响应头](../HTTP协议/HTTP请求头与响应头.md) — `Timing-Allow-Origin` 与 `Server-Timing` 所属的头部体系
- [第 04 讲：首屏时间指标采集方法](../课程笔记/性能优化/第04讲：首屏时间指标采集方法.md) — 该篇使用的是已废弃的 `performance.timing`，字段对照见本篇第三章
- [React 性能优化指南](../../05-React/React性能优化指南.md) — 配合 User Timing 做组件级耗时归因
- [前端性能优化完全指南](../../11-项目实战/前端性能优化完全指南.md) — 分层优化正典






