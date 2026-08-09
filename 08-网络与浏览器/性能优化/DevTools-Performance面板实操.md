# Chrome DevTools Performance 面板实操

> 性能优化的第一步永远是度量。Lighthouse 告诉你「哪里不及格」，Performance 面板告诉你「具体是哪一行代码在拖后腿」。

## 面试高频考点

- Performance 面板的火焰图（Flame Chart）横轴和纵轴分别代表什么？
- Bottom-Up 和 Call Tree 有什么区别？Self time 和 Total time 怎么区分？
- 什么是长任务（Long Task）？为什么阈值定在 50ms？如何在面板里找到它？
- 怎么识别强制同步布局（Forced Synchronous Layout）？看到什么形态就该警觉？
- 页面点击没反应 / 滚动掉帧，你的排查路径是什么？

---

## 一、录制前的准备

录制前的环境配置直接决定数据可信度。**准备做错了，后面的分析全是噪声。**

### 1.1 必须用隐身模式（Incognito）

普通窗口里，扩展（Extension）的 content script 会注入到页面，它们的执行会混进 Main 轨道的火焰图，表现为你完全不认识的匿名函数占了几十毫秒。React DevTools、Vue DevTools、广告拦截、密码管理器都是常见污染源。

隐身模式默认禁用所有扩展，Chrome 以「干净状态」运行页面，录制结果才是页面自身的性能画像。

> 💡 如果必须用扩展（比如要同时看 React DevTools Profiler），那就明确知道哪些帧是扩展带来的，分析时主动排除。

### 1.2 CPU 节流（CPU throttling）的使用规范

开发机通常是高性能设备，**本地看不出问题 ≠ 用户看不出问题**。中低端安卓机的单核性能可能只有开发机的 1/4 ~ 1/6。

| 节流档位 | 模拟设备 | 使用场景 |
| --- | --- | --- |
| No throttling（不节流） | 开发机本身 | 只想看「代码逻辑本身的调用关系」，不看绝对耗时 |
| 4x slowdown | 中高端移动设备 | 移动端 Web 常规回归，日常首选 |
| 6x slowdown | 中低端移动设备 | 复现「只有低端机才卡」的用户反馈 |

规范：

1. **优化前后必须用同一档节流对比**，否则数据没有可比性。
2. 判断「是不是长任务」时开节流，因为不节流时 40ms 的任务在低端机上就是 200ms 的长任务。
3. 定位「具体哪个函数慢」时可以不节流，节流只是等比放大，不改变调用结构。
4. 节流只影响 CPU，**不影响 GPU 合成和网络**，所以它不能模拟低端机的 GPU 瓶颈。

### 1.3 Network 节流与禁用缓存

| 配置 | 何时开 | 何时不要开 |
| --- | --- | --- |
| Network 节流（Slow 4G / Fast 4G） | 分析加载阶段（LCP/FCP、资源瀑布、请求串行依赖） | 分析运行时交互（点击、滚动）时开了只会拖长录制、干扰读图 |
| Disable cache（禁用缓存） | 测**首次访问**（新用户）的加载性能 | 测**二次访问**性能，或分析运行时交互 |

> ⚠️ 常见错误：分析「点击按钮卡顿」时开着 Slow 4G + Disable cache，结果火焰图里一大半是资源加载，真正的 JS 长任务被挤成一条线。

### 1.4 录制时长控制

**核心原则：录制时长控制在 3 ~ 5 秒，只覆盖你要分析的那一个动作。**

```
❌ 错误做法（录了 30 秒）
[───────── 加载 ─────────][─ 滚动 ─][─ 点击 ─][─ 输入 ─][─ 空闲 ─]
 ↑ 火焰图被压缩到看不清，Summary 饼图混杂了所有阶段，无法归因

✅ 正确做法（录了 3 秒，只覆盖一次点击）
                         [─ 点击 ─]
 ↑ 长任务清晰可见，Interactions 轨道只有一条，Bottom-Up 直接指向罪魁祸首
```

两种录制入口的区别：

| 入口 | 行为 | 适用 |
| --- | --- | --- |
| **Record**（圆点按钮） | 从点击开始录，手动停止 | 运行时交互：点击、滚动、动画、输入 |
| **Reload and record**（刷新箭头按钮） | 自动刷新页面并从导航开始录，页面加载完自动停 | 加载阶段：FCP / LCP / 首屏白屏 |

操作要点：

1. 点 Record 后**先等 1 秒**再执行操作，让起点有一段基线空闲，方便对比。
2. 操作做完**立刻停止**，不要挂着录制去看结果。
3. 复现不稳定的卡顿时，宁可多录几次短的，也不要录一次长的。

---

## 二、面板结构：逐轨道讲解

打开录制结果，从上到下是若干条轨道（Track）。**不要每次都从头看到尾，按现象直接跳到对应轨道。**

```
┌──────────────────────────────────────────────────────────┐
│ 概览区（Overview）  CPU 折线 + NET + 屏幕截图缩略图        │  ← 先在这里框选时间段
├──────────────────────────────────────────────────────────┤
│ Network      ──▭▭▭──▭▭──────  资源瀑布                    │
│ Frames       ▮▮▮▮▮▯▮▮  每一帧的呈现情况                    │
│ Timings      │FCP  │LCP    │DCL │L    关键时间点标记        │
│ Interactions ──[ Pointer: click ]──  交互事件条            │
│ Main         ▓▓▓░░▓▓▓▓▓▓░░  主线程火焰图（最核心）          │
│ Raster / GPU ──▭▭▭────  光栅化与 GPU 线程                  │
├──────────────────────────────────────────────────────────┤
│ 详情区：Summary │ Bottom-Up │ Call Tree │ Event Log        │  ← 四大视图
└──────────────────────────────────────────────────────────┘
```

### 2.1 轨道速查表

| 轨道 | 显示内容 | 什么时候看它 |
| --- | --- | --- |
| **概览区 CPU 折线** | 主线程 CPU 占用随时间变化，颜色同 Summary 分类 | 第一眼定位「哪个时间段最忙」，然后框选缩放 |
| **Network** | 每个请求的排队/等待/下载分段瀑布 | 首屏慢、请求串行、大文件阻塞、TTFB 高 |
| **Frames** | 每一帧的绘制情况，掉帧帧会被标出 | 动画不流畅、滚动掉帧、掉到多少 FPS |
| **Timings** | FP / FCP / LCP / DCL / L 标记，以及你自己打的 `performance.mark` | 归因加载指标：LCP 落在哪个时刻、之前发生了什么 |
| **Interactions** | 每次点击/键入的交互条，长交互会被标红 | **调 INP 的第一现场**，见 2.3 |
| **Main** | 主线程完整调用栈火焰图 | 几乎所有卡顿问题的最终落点，长任务在这里定位 |
| **Raster / GPU** | 光栅化线程与 GPU 线程的工作 | 主线程很空但画面还是卡 → 怀疑绘制/合成瓶颈 |

> ⚠️ 图层（Layer）的检查不在 Performance 轨道里，要配合独立的 **Layers 面板** 和 **Rendering 抽屉**（Layer borders / Paint flashing / Frame Rendering Stats）一起用，见 2.5。

### 2.2 Timings 轨道：读懂加载标记

| 标记 | 全称 | 含义 |
| --- | --- | --- |
| **FP** | First Paint | 首次绘制任何像素（可能只是背景色） |
| **FCP** | First Contentful Paint | 首次绘制有意义内容（文字/图片） |
| **LCP** | Largest Contentful Paint | 最大内容元素绘制完成，Good < **2.5s** |
| **DCL** | DOMContentLoaded | HTML 解析完毕、同步脚本执行完 |
| **L** | Load | 所有资源（含图片）加载完毕 |

使用姿势：**先在 Timings 上找到 LCP 的时间点，再向左看 Main 和 Network，回答「LCP 之前主线程在忙什么、关键资源什么时候才到」。** 这是首屏归因最快的路径。

你也可以往这条轨道里加自己的标记：

```js
// 在业务关键节点打标记，录制后直接出现在 Timings 轨道
performance.mark("app:hydrate-start");
hydrateApp();
performance.mark("app:hydrate-end");

// measure 会在轨道上画出一段带长度的区间，比两个孤立的点更直观
performance.measure("app:hydrate", "app:hydrate-start", "app:hydrate-end");
```

### 2.3 Interactions 轨道：INP 调试的第一现场

这条轨道把每一次点击、键入、触摸画成一个横条，条的长度就是「从用户操作到下一帧绘制」的整体耗时——也就是 **INP（Interaction to Next Paint）** 的单次样本。INP 的 Good 阈值是 **< 200ms**。

```
Interactions  ─────[  Pointer  ██████████████████  ]──────
                    │        │                  │
                    │        │                  └─ Presentation Delay（等绘制）
                    │        └─ Processing Time（事件回调执行）
                    └─ Input Delay（主线程被占，事件在排队）

Main          ─[ 长任务 ▓▓▓▓▓ ]─[ click handler ▓▓▓▓ ]─[ Layout/Paint ]─
                ↑ 这段导致 Input Delay
```

排查顺序：

1. 在 Interactions 轨道找到最长的那一条，看它总时长有没有超 200ms。
2. **把这一条与下方 Main 轨道垂直对齐**，看这段时间里主线程在干什么。
3. 判断三段中哪段最长：
   - 交互条开头有一大块与它重叠的**已有任务** → Input Delay 问题 → 拆长任务。
   - 交互条中段是自己的 `click` handler 在跑 → Processing Time 问题 → 减少回调里的同步工作。
   - 交互条末尾一大段 Recalculate Style / Layout / Paint → Presentation Delay 问题 → 减少渲染工作量。

> 💡 INP 只统计点击、键盘、触摸，**不含 hover 和 scroll**，所以滚动掉帧要看 Frames 轨道，不要在 Interactions 里找。

### 2.4 Frames 轨道：掉帧看这里

60 FPS 意味着每帧预算 **16.7ms**（`1000 / 60`）。Frames 轨道把每一帧画成一个方块，鼠标悬停能看到该帧的耗时；未能按时呈现的帧会被明显标出（部分呈现 / 丢弃）。

概览区的 CPU 折线上方如果出现**红色条**，同样代表这段时间帧率掉得已经影响体验。

判断逻辑：

```
帧块又宽又连续掉  → 每帧的工作量本身超预算（JS 太重 / 布局太重）
帧块偶发单个掉    → 某次一次性长任务插进来（比如懒加载解析大 JSON）
帧正常但视觉卡    → 怀疑不在主线程：看 Raster / GPU 轨道，或图层过多
```

### 2.5 GPU 与图层的配套检查

| 现象 | 检查手段 |
| --- | --- |
| 主线程很空闲，画面依然卡 | 看 GPU / Raster 轨道是否长期繁忙 |
| 怀疑图层爆炸（过度 `will-change`） | 打开 **Layers 面板**，看合成层数量与内存 |
| 想知道到底哪块区域在重绘 | Rendering 抽屉勾选 **Paint flashing**，重绘区域会闪绿框 |
| 想实时看 FPS 与 GPU 内存 | Rendering 抽屉勾选 **Frame Rendering Stats** |

> ⚠️ `will-change: transform` 是提升合成层的常用手段，但**滥用会导致图层数量暴增、GPU 内存飙升**，反而更卡。用 Layers 面板确认层数，不要凭感觉加。

---

## 三、火焰图（Flame Chart）怎么读

Main 轨道里那一片彩色的锯齿状图形就是火焰图。**90% 的新手误读都来自搞错坐标轴含义。**

```
时间 ──────────────────────────────────────────────▶  横轴 = 时间轴（不是调用次数！）

  ┌──────────────────────────────────────────┐
  │ Task                                     │  第 0 层：浏览器任务
  ├──────────────────────────────────────────┤
  │ Event: click                             │  第 1 层
  ├───────────────────────┬──────────────────┤
  │ handleClick           │ (匿名函数)        │  第 2 层：handleClick 调用了下层
  ├───────┬───────────────┤                  │
  │ parse │ renderList    │                  │  第 3 层
  │       ├────┬────┬─────┤                  │
  │       │ f1 │ f2 │ f3  │                  │  第 4 层
  └───────┴────┴────┴─────┴──────────────────┘
     ▲                ▲
     │                └─ 宽度 = 该函数（含其所有子调用）占用的时间
     └─ 纵轴 = 调用栈深度，上层调用下层
```

四条读图铁律：

1. **横轴是时间，不是调用次数。** 同一函数被调用 100 次会在横轴上出现 100 个窄条，而不是一个高条。
2. **纵轴是调用栈深度，上层调用下层。** Chrome 的 Performance 面板是「向下生长」的火焰图（有些工具叫 icicle / 冰柱图），最外层的浏览器任务在最上面，最深的业务函数在最下面。
3. **宽度代表耗时。** 找性能问题就是**找最宽的那一块**，然后往下钻，直到宽度不再由某一个子调用主导——那一层就是真正的瓶颈。
4. **深度本身不是问题。** 栈很深只说明调用层级多，只要每层都很窄就没事；宽而浅的一块反而更值得看。

### 3.1 颜色分类

| 颜色 | 分类 | 代表的事件 | 主要成因 |
| --- | --- | --- | --- |
| 🟡 黄色 | **Scripting** | Evaluate Script、Function Call、事件回调、GC | JS 执行太重 |
| 🟣 紫色 | **Rendering** | Recalculate Style、Layout | 样式命中范围大、布局被强制触发 |
| 🟢 绿色 | **Painting** | Paint、Composite Layers | 绘制区域大、图层多、阴影/滤镜昂贵 |
| ⚪ 灰色 | **System / Other** | Task、浏览器内部工作 | 通常是外层容器，不是瓶颈本身 |
| 🔵 蓝色 | **Loading** | Parse HTML、请求相关 | HTML/资源解析 |

记忆口诀：**黄 JS、紫布局、绿绘制、灰系统。** 看到大片紫色紧跟大片黄色交替出现，直接怀疑强制同步布局（见第六节）。

### 3.2 红色三角警告标记

事件条右上角出现**红色小三角**，表示 DevTools 检测到了一个已知性能反模式，鼠标悬停会给出具体说明。最常见的两类：

| 位置 | 提示含义 | 处理 |
| --- | --- | --- |
| 灰色 **Task** 条上带红三角 + 条上有红色斜纹阴影区 | 这是一个**长任务**，斜纹部分就是超出 50ms 的阻塞时间 | 展开调用栈拆任务，见第五节 |
| 紫色 **Layout** / **Recalculate Style** 上带红三角 | **Forced reflow is a likely performance bottleneck**（强制同步布局） | 读写分离，见第六节 |

> 💡 悬停红三角能直接看到「触发 reflow 的那一行 JS」的链接，点击可跳到 Sources 面板对应行，这是最快的定位方式。

---

## 四、四大视图：Summary / Bottom-Up / Call Tree / Event Log

详情区四个 Tab 的作用完全不同。**先在火焰图上框选一段时间，四个视图都会只统计这段区间——不框选直接看是最常见的浪费。**

| 视图 | 回答的问题 | 形态 | 什么时候用 |
| --- | --- | --- | --- |
| **Summary** | 这段时间花在哪一类工作上？ | 饼图 + 各分类耗时 | 第一步定性：是 JS 问题、布局问题还是绘制问题 |
| **Bottom-Up** | 哪个函数**自身**最耗时？ | 按 Self time 降序的扁平列表，可展开看调用来源 | **排查具体慢函数的首选** |
| **Call Tree** | 耗时是**从哪儿被调进来**的？ | 自顶向下的调用树，按 Total time 展示 | 知道慢函数了，要找它的调用来源和父子关系 |
| **Event Log** | 事件**按时间顺序**是怎么发生的？ | 时间序列表，可按类型/耗时过滤 | 追时序：谁先谁后、某个事件是不是被别的事件推迟了 |

### 4.1 Self time vs Total time（新手最容易搞错的点）

```js
function outer() {
  // 自身逻辑：5ms
  doOwnWork();      // 5ms
  inner();          // 95ms
}

function inner() {
  heavyLoop();      // 95ms
}
```

| 函数 | Total time（总耗时） | Self time（自身耗时） |
| --- | --- | --- |
| `outer` | 100ms（含所有子调用） | **5ms**（只算它自己的代码） |
| `inner` | 95ms | 0ms（都在 `heavyLoop` 里） |
| `heavyLoop` | 95ms | **95ms** |

**Total time = Self time + 所有子调用耗时。**

- 只看 Total time：`outer` 100ms 最高，容易误判「优化 `outer`」——但 `outer` 自己只花了 5ms，改它没用。
- 看 Self time：`heavyLoop` 95ms，这才是真正要动手的地方。

所以：

```
定位「该改哪个函数」→ Bottom-Up，按 Self time 排序（默认就是）
定位「为什么这个函数会被调用这么多次」→ Call Tree，看 Total time 与调用链
```

> ⚠️ 反过来说，Total time 高但 Self time 低的函数不是不重要——它可能**调用次数过多**。这时优化方向不是函数内部，而是「少调用它」（缓存、`React.memo`、去重、批处理）。

### 4.2 一个典型的四视图连招

```
1. Summary   → Scripting 占 78%，Rendering 15%     → 定性：JS 问题
2. Bottom-Up → 第一行 formatCurrency  Self 210ms   → 定位：这个函数最重
3. 展开 Bottom-Up 的调用来源 → renderTable → 得知它在表格渲染里被调
4. Call Tree → 看到 renderTable 一次渲染调用了 formatCurrency 5000 次
5. 结论：不是函数慢，是调用次数太多 → 加缓存 / 虚拟列表
6. 改完再录一次，同样节流档位，对比 Summary 的 Scripting 占比与 Bottom-Up 第一行
```

---

## 五、Long Task 定位实战

### 5.1 什么是长任务，为什么阈值是 50ms

**长任务（Long Task）= 主线程上一个执行时间超过 50ms 的任务。** 任务执行期间主线程无法响应输入、无法渲染，用户就感到「卡住了」。

50ms 这个数字来自 **RAIL 模型的响应预算**：用户操作后 **100ms 内**必须有反馈，否则会感到延迟。但这 100ms 不能全给你的回调——浏览器自己还要做事件分发、样式计算、布局、绘制。于是把预算切成两半：**留给 JS 的安全额度约 50ms**，剩下 50ms 留给浏览器完成渲染。所以「单个任务不超过 50ms」成为工程上的硬线。

```
用户点击
   │
   ├─ 0 ────────────── 50ms ────────────── 100ms
   │  │◀ JS 执行预算 ▶│◀ 浏览器渲染预算 ▶│
   │                                       │
   └───────────── 用户感知的「即时」边界 ────┘

任务 > 50ms ⇒ 后来的输入必须排队 ⇒ Input Delay 上升 ⇒ INP 变差
```

相关指标：**TBT（Total Blocking Time）= 所有长任务超出 50ms 的部分之和**，它是 Lighthouse 里 INP 的实验室代理指标。

### 5.2 在面板里找到它

1. 在 Main 轨道找**灰色 Task 条上带红三角、并且条上有红色斜纹阴影**的块。
2. 斜纹部分就是超出 50ms 的阻塞时间，条越宽问题越大。
3. 在这个 Task 上框选，切到 **Bottom-Up**，Self time 第一行就是嫌疑函数。
4. 点击函数名右侧的源码位置（形如 `bundle.js:1234`），跳转 Sources 面板到具体行。
5. 如果跳过去是压缩代码，确认构建产物是否上传了 **Source Map**——没有 Source Map 的生产包在面板里基本没法读。

代码侧也可以主动上报，不依赖手动录制：

```js
// 用 PerformanceObserver 常态化监听长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.duration > 50 才会被上报为 longtask
    console.log("Long Task:", entry.duration, entry.attribution);
  }
});
observer.observe({ type: "longtask", buffered: true });
```

### 5.3 常见成因分类与对策

| 成因 | 火焰图特征 | 对策 |
| --- | --- | --- |
| **大量同步计算** | 一个很宽的黄色块，栈很浅，底部是循环函数 | 时间切片（`scheduler.yield()` / `setTimeout(0)`）、Web Worker |
| **超长列表渲染** | 同一个组件函数在横轴上重复出现成百上千次 | 虚拟列表（react-window / @tanstack/virtual）、分页 |
| **强制同步布局** | 黄紫交替的锯齿，紫块带红三角 | 读写分离，见第六节 |
| **大 JSON 解析** | 一个宽的 `JSON.parse` 块，几乎无子调用 | 拆分接口、流式解析、移到 Worker、后端裁剪字段 |
| **第三方脚本** | 陌生域名的 Evaluate Script 占据大块 | `async` / `defer`、延迟到交互后加载、用 Facade 模式替代 |
| **过度 GC** | 密集的 Minor GC 黄色小块 | 减少循环内对象创建、复用对象、避免闭包持有大数据 |

拆分长任务的标准写法：

```js
// ❌ 反例：一次性处理 10000 条，主线程被占 500ms，期间点击完全无响应
function processAll(items) {
  items.forEach((item) => heavyProcess(item));
}

// ✅ 正例：每 50 条让出一次主线程，浏览器可以插空处理输入和绘制
async function processAll(items) {
  for (let i = 0; i < items.length; i++) {
    heavyProcess(items[i]);
    if (i % 50 === 0) {
      await scheduler.yield(); // 无此 API 时退化为 setTimeout(resolve, 0)
    }
  }
}
```

---

## 六、强制同步布局（Forced Synchronous Layout）的识别

### 6.1 它是什么

浏览器为了性能，会把样式和布局的计算**攒到一帧的末尾批量做**。但如果 JS 在修改了 DOM 之后**立刻读取布局属性**，浏览器为了返回正确的值，只能**当场同步跑一遍 Layout**——这就是强制同步布局。在循环里反复触发，就叫**布局抖动（Layout Thrashing）**。

### 6.2 面板里的识别特征

```
✅ 正常：一帧里样式和布局各做一次
Main  ─[ JS ▓▓▓▓▓▓▓▓ ][ Style ░ ][ Layout ░ ][ Paint ▒ ]─

❌ 布局抖动：黄紫交替的锯齿形态，紫块上带红三角
Main  ─[JS▓][S░][L░][JS▓][S░][L░][JS▓][S░][L░][JS▓][S░][L░]─
              △        △          △          △
              └── Recalculate Style 与 Layout 被反复强制唤起
```

三个识别信号，命中任意一个就要查：

1. 紫色 **Layout** 或 **Recalculate Style** 事件上有**红色三角**，悬停提示 `Forced reflow is a likely performance bottleneck`。
2. 火焰图出现**黄-紫-黄-紫高频交替的锯齿**，而不是「一大段黄 + 一段紫」。
3. Summary 里 Rendering 占比异常高，但页面 DOM 其实没多少变化。

### 6.3 会触发强制同步布局的属性清单

**读这些属性时，如果之前有未结算的 DOM 写入，就会强制布局：**

| 类别 | 属性 / 方法 |
| --- | --- |
| 尺寸 | `offsetWidth` `offsetHeight` `clientWidth` `clientHeight` `scrollWidth` `scrollHeight` |
| 位置 | `offsetTop` `offsetLeft` `clientTop` `clientLeft` `scrollTop` `scrollLeft` |
| 综合 | `getBoundingClientRect()` `getClientRects()` |
| 样式 | `window.getComputedStyle(el)`（读取布局相关属性时） |
| 其他 | `el.focus()` `el.scrollIntoView()` `range.getBoundingClientRect()` |

### 6.4 读写分离的修复

```js
// ❌ 反例：循环里读写交替，每次迭代都强制一次同步布局（N 次 Layout）
function shrinkAll(items) {
  items.forEach((el) => {
    const h = el.offsetHeight;            // 读 → 强制 Layout
    el.style.height = h / 2 + "px";       // 写 → 使布局失效
  });
}

// ✅ 正例：先批量读、再批量写，整段只触发一次 Layout
function shrinkAll(items) {
  const heights = items.map((el) => el.offsetHeight); // 阶段一：只读
  items.forEach((el, i) => {
    el.style.height = heights[i] / 2 + "px";          // 阶段二：只写
  });
}
```

```js
// ❌ 反例：在 scroll 回调里直接读 getBoundingClientRect，每次滚动都强制布局
window.addEventListener("scroll", () => {
  items.forEach((el) => {
    const rect = el.getBoundingClientRect();
    el.classList.toggle("visible", rect.top < window.innerHeight);
  });
});

// ✅ 正例：可见性判断交给 IntersectionObserver，完全不读布局属性
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.classList.toggle("visible", entry.isIntersecting);
  });
});
items.forEach((el) => io.observe(el));
```

```js
// ✅ 正例：无法避免读写混合时，用 rAF 把「写」推到下一帧，切断同步链
function measureThenMutate(el) {
  const rect = el.getBoundingClientRect(); // 读在当前帧
  requestAnimationFrame(() => {
    el.style.transform = `translateY(${rect.height}px)`; // 写在下一帧
  });
}
```

> 💡 动画尽量只改 `transform` / `opacity`，它们走合成（Compositing）路径，**不触发 Layout 和 Paint**，从根上绕开这个问题。

---

## 七、React 应用专项

### 7.1 两个 Profiler 的分工

| 工具 | 看到的东西 | 局限 |
| --- | --- | --- |
| **React DevTools → Profiler** | 每次 commit 的火焰图、各组件 render 耗时、为什么重渲染（Why did this render） | 只看得到 React 内部，看不到浏览器 Layout/Paint/GC |
| **Chrome DevTools → Performance** | 完整主线程：React 调度 + 浏览器渲染 + 网络 + GC | 默认只显示函数名，不知道哪个函数属于哪个组件 |

实战顺序：**先用 Chrome Performance 判断「问题在不在 JS」，如果在 JS 且栈里全是 React 内部函数（`performWorkOnRoot`、`beginWork`、`commitRoot` 等），再切到 React DevTools Profiler 定位具体组件。**

### 7.2 React 19.2 的 Performance Tracks

React 19.2 起，React 会把自己的工作直接写进 Chrome Performance 面板，作为自定义轨道显示：

| 轨道 | 显示内容 | 怎么读 |
| --- | --- | --- |
| **Scheduler** | React 各优先级的调度工作（如 Blocking、Transition 等泳道） | 同步更新表现为**一整段长任务**；`startTransition` 的更新表现为**多段短任务**，中间夹着浏览器处理输入和绘制的空隙 |
| **Components** | 组件树的 render 与 effect 层级轨迹 | 直接看出哪棵子树的 render / effect 最宽，等价于「组件级火焰图」 |

用它可以回答两个之前很难回答的问题：

1. **我的 `startTransition` 到底生效了吗？** → Scheduler 轨道上是多段短任务就生效了，是一整段长任务就没生效。
2. **是哪个组件的 effect 太重？** → Components 轨道上找最宽的 effect 段。

### 7.3 区分「渲染慢」和「浏览器绘制慢」

这是 React 性能排查里最关键的一次分叉：

```
Main 轨道上那一大块，主体是什么颜色？
        │
   ┌────┴────────────────────┐
   │                         │
 🟡 黄色为主               🟣🟢 紫/绿为主
 = React 在算              = 浏览器在排版和画
   │                         │
   ├ 栈里是 beginWork /       ├ 大量 Recalculate Style
   │ 组件函数                 │ → 选择器命中范围太大、
   │ → React「渲染慢」         │   动态类名/内联样式滥用
   │                         │
   ├ 对策：memo /             ├ 大量 Layout（带红三角）
   │ useMemo / 虚拟列表 /      │ → 强制同步布局，见第六节
   │ startTransition /        │
   │ 状态下移                  ├ 大量 Paint / Composite
   │                         │ → DOM 节点过多、阴影滤镜昂贵、
   └ 用 React DevTools        │   图层过多
     Profiler 进一步定位组件    └ 对策：减少 DOM、简化样式、
                                content-visibility
```

判定口诀：**黄色归 React，紫绿归浏览器。** 组件数量正常但紫色巨大，说明问题在 CSS 和 DOM 结构，改 `memo` 是白费力气。

### 7.4 React 特有陷阱

```js
// ❌ 反例：effect 里同步读布局，React commit 阶段被强制 Layout 拖长
useEffect(() => {
  const h = ref.current.getBoundingClientRect().height;
  setHeight(h); // 还会再触发一次渲染
}, [items]);

// ✅ 正例：用 ResizeObserver 代替手动测量，避免 commit 阶段同步布局
useEffect(() => {
  const ro = new ResizeObserver(([entry]) => {
    setHeight(entry.contentRect.height);
  });
  ro.observe(ref.current);
  return () => ro.disconnect();
}, []);
```

---

## 八、实战排查手册

按「现象」直接查表，不要每次都从零开始摸。

| 现象 | 先看哪条轨道 | 用哪个视图 | 典型定位结果 | 修复方向 |
| --- | --- | --- | --- | --- |
| **首屏白屏久** | Timings（LCP 位置）+ Network | Summary → Bottom-Up | 主 JS 包过大、Evaluate Script 一整块；或 LCP 图片请求太晚 | 代码分割、SSR/骨架屏、`preload` LCP 图片 |
| **点击后无响应** | Interactions（对齐 Main） | Bottom-Up | 交互条被前置长任务挡住，或 handler 自身很宽 | 拆长任务、`scheduler.yield()`、防抖 |
| **输入框打字卡** | Interactions | Bottom-Up + Call Tree | 每次 `keydown` 触发整棵大列表重渲染 | `useDeferredValue`、`startTransition`、防抖 |
| **滚动掉帧** | Frames + Main | Event Log（按时间追） | scroll 回调里 `getBoundingClientRect` 锯齿 | `IntersectionObserver`、`passive` 监听、节流 |
| **动画不流畅** | Frames + Main + GPU | Summary | Painting 占比高，或 Layout 反复触发 | 只动 `transform`/`opacity`、`will-change` |
| **列表操作卡** | Main | Bottom-Up | 同一组件函数在横轴重复上千次 | 虚拟列表、`React.memo`、分页 |
| **越用越慢** | 概览 CPU 折线 + Memory 面板 | Bottom-Up | JS Heap 锯齿基线持续上移 | 查未清理的定时器/监听器/闭包引用 |

### 8.1 标准排查步骤

```
① 复现
   隐身模式 + 目标节流档（移动端 4x）+ 只录 3~5 秒目标动作

② 定性
   Summary 看饼图 → 是 Scripting / Rendering / Painting / Loading 哪一类

③ 定位
   Main 轨道找最宽的块 → 框选 → Bottom-Up 按 Self time 看第一行

④ 落到代码
   点击函数右侧源码位置跳 Sources（生产包需 Source Map）
   若栈里全是框架内部函数 → 转 React DevTools Profiler 定位组件

⑤ 归因
   Call Tree 确认「是函数本身慢，还是被调用次数太多」
   Event Log 确认「是不是被别的事件推迟了」

⑥ 修复 + 验证
   同一节流档、同一操作再录一次
   对比三项：Summary 分类占比、Bottom-Up 第一行 Self time、长任务数量
   加上线上验证：web-vitals 采集 INP/LCP 看真实用户分布
```

### 8.2 验证修复的三条硬指标

| 指标 | 从哪看 | 达标线 |
| --- | --- | --- |
| 最长任务时长 | Main 轨道最宽的 Task | 单个任务 < **50ms** |
| 交互响应 | Interactions 轨道最长条 | INP < **200ms** |
| 首屏 | Timings 轨道 LCP 标记 | LCP < **2.5s** |

---

## 九、常见坑与误区

### 9.1 录制时长过长

录了 30 秒，火焰图被横向压缩到每个函数只有 1 像素宽，Summary 混杂了加载、交互、空闲三个阶段的数据，什么结论都得不出来。**永远只录你要分析的那一个动作。**

### 9.2 把 Total time 当 Self time

看到 `App` 组件 Total time 800ms 就去优化 `App`——但 `App` 自身只花了 2ms，800ms 全在子树里。**Bottom-Up 默认按 Self time 排序，就是为了避免这个错误。** 见 4.1。

### 9.3 忘开 CPU 节流

开发机上 30ms 的任务在中低端安卓上就是 180ms 的长任务。**本地不节流跑出来的「一切正常」毫无参考价值。** 反过来也要注意：开着 6x 节流去测「函数绝对耗时」并向别人汇报数字，同样是误导。

### 9.4 开发模式 vs 生产构建

React 开发模式带了大量额外开销，**比生产构建慢很多**：

| 差异项 | 开发模式 | 生产构建 |
| --- | --- | --- |
| 警告与不变量检查 | 全量保留 | 被 `NODE_ENV=production` 剔除 |
| `StrictMode` 双调用 | render / effect 被刻意执行两次 | 不双调用 |
| 代码压缩 | 无 | Terser 压缩、Tree Shaking |
| 组件栈信息收集 | 收集 | 精简 |

**结论：性能数据必须在生产构建上测。** 在开发模式下看到的组件 render 耗时可以用来比较「哪个组件更重」，但绝不能当作用户实际感受到的耗时。

反过来，只测生产包也有坑——**生产包务必配 Source Map**，否则 Bottom-Up 里全是 `t`、`e`、`n` 这种压缩后的一个字母，根本没法定位。

### 9.5 其他容易踩的

| 误区 | 纠正 |
| --- | --- |
| 不框选就直接看 Summary | 四大视图都只统计当前选中区间，不框选等于统计整段录制 |
| 在滚动问题里找 Interactions 轨道 | INP 不含 scroll，滚动看 Frames |
| 一次录制就下结论 | 卡顿常有波动，至少录 3 次取稳定形态 |
| 看到红三角就无脑改 | 先看提示内容和它的耗时占比，30 μs 的强制 reflow 不值得改 |
| 只信本地面板数据 | 面板是实验室数据（Lab），必须配合线上 RUM（Field）交叉验证 |
| 用 Lighthouse 分数替代 Performance 分析 | Lighthouse 告诉你「不及格」，Performance 才告诉你「哪一行代码」 |

---

## 十、面试高频问答

### Q1：Performance 面板的火焰图怎么读？横轴纵轴分别是什么？

火焰图的**横轴是时间轴，不是调用次数**——这是最常被搞错的点。同一个函数被调 100 次，会在横轴上出现 100 个窄条，而不是变成一个高条。**纵轴是调用栈深度，上层调用下层**，Chrome 里是向下生长的，最上面是浏览器的 Task，越往下是越深的业务函数。**块的宽度代表这个函数连同它所有子调用的总耗时**，所以找瓶颈就是找最宽的块，然后一层层往下钻，直到宽度不再由某个单一子调用主导，那一层就是真正的瓶颈。颜色也有固定含义：黄色是 Scripting（JS 执行）、紫色是 Rendering（样式计算和布局）、绿色是 Painting（绘制和合成）、灰色是 System、蓝色是 Loading。记「黄 JS、紫布局、绿绘制」就够用了。

### Q2：Bottom-Up 和 Call Tree 有什么区别？Self time 和 Total time 怎么区分？

Total time 是一个函数连同它所有子调用的总耗时，Self time 只算这个函数自己代码的耗时，关系是 **Total = Self + 所有子调用**。比如 `outer` 里调了 `inner` 95ms，自己只干了 5ms，那 `outer` 的 Total 是 100ms 但 Self 只有 5ms——只看 Total 就会误判去优化 `outer`，其实白费力气。

Bottom-Up 是把所有函数拉平、按 Self time 降序排，用来回答「**该改哪个函数**」，排查具体慢函数就用它。Call Tree 是自顶向下的调用树、按 Total time 展示，用来回答「**这个耗时是从哪儿被调进来的、调了多少次**」。实际连招是：Bottom-Up 找到 Self time 最高的函数，再用 Call Tree 确认它是函数本身慢，还是被调用次数太多——后者的修法完全不同，是加缓存或 `memo`，而不是改函数内部。

### Q3：什么是长任务？为什么阈值是 50ms？怎么在面板里定位？

长任务是主线程上执行超过 **50ms** 的任务，期间主线程无法响应输入也无法渲染，用户就感觉卡住。50ms 来自 **RAIL 模型的 100ms 响应预算**：用户操作后 100ms 内必须有反馈，但这 100ms 不能全给 JS，浏览器自己还要做事件分发、样式计算、布局和绘制，所以对半分，**给 JS 的安全额度就是 50ms**。相关指标 TBT 就是所有长任务超出 50ms 部分之和。

定位方法：在 Main 轨道找灰色 Task 条上**带红色三角、且有红色斜纹阴影**的块，斜纹部分就是超出 50ms 的阻塞时间；在这个块上框选，切 Bottom-Up 看 Self time 第一行，点函数右侧的源码位置跳到 Sources 具体行。常见成因是大量同步计算、超长列表渲染、强制同步布局、大 JSON 解析和第三方脚本。修法是时间切片（`scheduler.yield()`）、Web Worker、虚拟列表。

### Q4：怎么识别强制同步布局？看到什么形态就该警觉？

强制同步布局是指 JS 修改了 DOM 之后**立刻读取布局属性**，浏览器为了返回正确值只能当场同步跑一遍 Layout，破坏了它「攒到帧末批量做」的优化；在循环里反复触发就叫布局抖动。

面板里三个识别信号：一是紫色 **Layout** 或 **Recalculate Style** 事件上有**红色三角**，悬停提示 `Forced reflow is a likely performance bottleneck`，还能点进源码那一行；二是火焰图出现**黄-紫-黄-紫的高频交替锯齿**，而不是一大段黄加一段紫；三是 Summary 里 Rendering 占比异常高但页面其实没多少变化。

触发它的属性主要是 `offsetTop`/`offsetHeight`/`clientWidth`/`scrollTop`/`getBoundingClientRect()`/`getComputedStyle()` 这一类。修法是**读写分离**：先用一次遍历批量读完所有需要的值，再用第二次遍历批量写，整段只触发一次 Layout；实在避不开就用 `requestAnimationFrame` 把写推到下一帧；可见性判断这类场景直接换 `IntersectionObserver`，根本不读布局属性。

### Q5：调 React 应用性能时，怎么区分是「React 渲染慢」还是「浏览器绘制慢」？

看 Main 轨道那一大块的主体颜色。**黄色为主说明 React 在算**，展开栈能看到 `beginWork`、`commitRoot` 或组件函数名，这属于渲染慢，对策是 `React.memo`、`useMemo`、虚拟列表、`startTransition`、状态下移，然后转 React DevTools Profiler 定位到具体组件。**紫色和绿色为主说明浏览器在排版和绘制**：大量 Recalculate Style 通常是选择器命中范围太大或内联样式滥用；大量带红三角的 Layout 是强制同步布局；大量 Paint/Composite 是 DOM 节点过多、阴影滤镜昂贵或图层太多，这些改 `memo` 完全没用，得减少 DOM、简化样式、上 `content-visibility`。

React 19.2 起还可以直接看 React 写进面板的自定义轨道：**Scheduler 轨道**能验证 `startTransition` 是否生效——生效表现为多段短任务、中间夹着浏览器处理输入的空隙，没生效就是一整段长任务；**Components 轨道**是组件级火焰图，能直接看出哪棵子树的 render 或 effect 最宽。另外别忘了性能数据必须在生产构建上测，开发模式有警告检查和 StrictMode 双调用，比生产慢很多。

---

## 相关笔记

- [Web Vitals：INP 指标详解](./Web%20Vitals与INP指标详解.md) — INP 三段拆解、采集方式与优化手段
- [前端性能优化全景](./前端性能优化全景.md) — 优化手段总览与导航
- [大量 DOM 节点优化方案](./大量DOM节点优化方案.md) — 虚拟列表与 DOM 批量操作
- [浏览器专业术语表](../浏览器原理/相关词汇备注.md) — 面板事件名中英对照与渲染管线概念
- [页面渲染流程与优化](../浏览器原理/渲染/页面渲染流程与优化.md) — 关键渲染路径与重排重绘
- [React 性能优化指南](../../05-React/React性能优化指南.md) — memo / useMemo / startTransition 决策树
- [React Fiber 与 Concurrent Mode 详解](../../05-React/React_Fiber与Concurrent_Mode详解.md) — 时间切片与并发更新的验证方法
- [React 19.2 实践心智模型](../../05-React/React19.2实践心智模型.md) — Performance Tracks 等 19.2 稳定能力
- [前端性能优化完全指南](../../11-项目实战/前端性能优化完全指南.md) — 分层优化正典
- [课程笔记-第20讲：如何进行性能分析的自动化实现](../../10-Git与工具/课程笔记/课程笔记-第20讲：如何进行性能分析的自动化实现.md) — Lighthouse 架构与 Chrome DevTools Protocol 自动化
