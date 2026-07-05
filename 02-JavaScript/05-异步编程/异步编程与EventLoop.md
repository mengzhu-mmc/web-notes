# 异步编程与 Event Loop

> 面试高频考点 | JS 异步机制核心

## 相关笔记

- [async/await 实现原理](./异步编程/async-await实现原理.md) — Generator 原理、手写自动执行器
- [Promise 实现原理](./异步编程/Promise实现原理.md) — 手写 SimplePromise、Promise/A+ 规范

## Event Loop 事件循环（面试必考）

JavaScript 是单线程语言，通过事件循环机制实现异步非阻塞。

### 执行模型（浏览器）

JS 引擎维护一个调用栈（Call Stack）和多个任务队列。浏览器的一次事件循环「tick」远不止「宏任务→微任务」两步，完整流程如下：

1. **取一个宏任务**：从任务队列中取出**一个**宏任务执行（第一个宏任务是整体 script 代码）。注意每一轮只取一个宏任务，而不是清空整个宏任务队列。
2. **清空微任务**：宏任务执行完（调用栈清空）后，把微任务队列**全部**执行完；微任务执行过程中新产生的微任务也会在本轮一并清空。
3. **判断是否需要渲染**：浏览器根据显示器刷新率（通常 60Hz≈16.6ms）决定这一 tick 是否渲染。**不是每个 tick 都渲染**——若距上次渲染时间太短，会跳过渲染步骤。
4. **渲染阶段（如需要）**，内部按固定顺序执行一系列子步骤：
   - 执行 `requestAnimationFrame` 回调（在样式/布局计算**之前**，是修改动画属性的最佳时机）
   - 执行 `IntersectionObserver` 回调
   - 计算样式（Recalculate Style）→ 布局（Layout / Reflow）
   - 执行 `ResizeObserver` 回调（在 Layout 之后、Paint 之前，可能触发再次 Layout）
   - 绘制（Paint）→ 合成上屏（Composite）
5. **空闲阶段（如有富余时间）**：若本帧还有空闲时间，执行 `requestIdleCallback` 回调。
6. 回到第 1 步，取下一个宏任务。

```
┌──────────────────────────────────────────┐
│  ① 取一个宏任务执行                        │
│     (script / setTimeout / MessageChannel)│
└───────────────────┬──────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  ② 清空所有微任务                          │
│     (Promise.then / queueMicrotask         │
│      / MutationObserver)                   │
└───────────────────┬──────────────────────┘
                    ↓
          需要渲染？（受刷新率节流）
                    ↓ 是
┌──────────────────────────────────────────┐
│  ③ 渲染阶段（子步骤有序执行）              │
│     requestAnimationFrame 回调             │
│       ↓                                    │
│     IntersectionObserver 回调              │
│       ↓                                    │
│     样式计算 → 布局(Layout)                │
│       ↓                                    │
│     ResizeObserver 回调                    │
│       ↓                                    │
│     绘制(Paint) → 合成(Composite)          │
└───────────────────┬──────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  ④ 空闲阶段（如有富余）                    │
│     requestIdleCallback 回调               │
└───────────────────┬──────────────────────┘
                    ↓
              下一个宏任务 ...
```

**几个关键结论**：

- **微任务在每个宏任务之后、渲染之前清空**。所以在微任务里无限追加微任务会**饿死渲染**（页面卡死不刷新）。
- **`requestAnimationFrame` 不是宏任务也不是微任务**，它属于渲染阶段的专用回调，执行时机固定在「样式/布局计算之前」，因此在 rAF 里改样式不会造成本帧多余的重排。
- **渲染受刷新率节流**：连续多个 `setTimeout(fn, 0)` 之间不一定都夹着渲染，只有到了浏览器认为该刷新的时刻才渲染一次。
- 「还有哪些环节」——除了 rAF，一次渲染 tick 里还穿插着 `IntersectionObserver`、`ResizeObserver` 回调，以及帧末的 `requestIdleCallback`（空闲回调）。

### 宏任务与微任务

**宏任务（Macro Task）**：script 整体代码、setTimeout、setInterval、setImmediate（Node）、I/O、UI rendering

**微任务（Micro Task）**：Promise.then/catch/finally、queueMicrotask、MutationObserver、process.nextTick（Node，优先级最高）

### 经典面试题

```js
console.log("1");

setTimeout(() => {
  console.log("2");
  Promise.resolve().then(() => console.log("3"));
}, 0);

Promise.resolve().then(() => {
  console.log("4");
  setTimeout(() => console.log("5"), 0);
});

console.log("6");

// 输出：1 → 6 → 4 → 2 → 3 → 5
```

分析过程：同步代码先执行输出 1、6；然后清空微任务队列输出 4（同时注册了 setTimeout-5）；接着执行下一个宏任务 setTimeout 输出 2，其中注册的微任务立即执行输出 3；最后执行 setTimeout-5 输出 5。

### async/await 的本质

`async/await` 是 Generator + Promise 的语法糖。`await` 后面的代码相当于放在 `.then()` 的回调中：

```js
async function foo() {
  console.log("a");
  await bar();
  console.log("b"); // 相当于 bar().then(() => console.log('b'))
}

async function bar() {
  console.log("c");
}

foo();
console.log("d");

// 输出：a → c → d → b
```

---

## Node.js 事件循环

Node 的事件循环由 **libuv** 实现，和浏览器**不是同一套模型**。浏览器只区分「宏任务/微任务」，而 Node 把宏任务细分成了**六个有序阶段（phase）**，每个阶段都有自己的回调队列。

### 六个阶段

事件循环按固定顺序循环执行这六个阶段，每进入一个阶段就执行该阶段队列里的回调：

```
   ┌───────────────────────────┐
┌─>│   timers                  │  执行 setTimeout / setInterval 到期回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │   pending callbacks       │  执行上一轮延迟到本轮的 I/O 回调（如某些 TCP 错误）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │   idle, prepare           │  仅供 libuv 内部使用
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐   ┌───────────────┐
│  │   poll                    │<──┤ 传入连接、数据  │  ★ 核心阶段
│  └─────────────┬─────────────┘   └───────────────┘  取 I/O 事件、执行 I/O 回调，
│  ┌─────────────┴─────────────┐                      队列空时可能在此阻塞等待
│  │   check                   │  执行 setImmediate 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤   close callbacks         │  执行 close 事件回调（如 socket.on('close')）
   └───────────────────────────┘
```

- **timers**：执行 `setTimeout` / `setInterval` 中已到期的回调。
- **pending callbacks**：执行被推迟到本次循环的系统级 I/O 回调。
- **idle, prepare**：libuv 内部使用，业务代码接触不到。
- **poll（轮询，核心）**：取回 I/O 事件并执行其回调；若队列为空，会在此**阻塞等待**新的 I/O（有 timer 到期或有 `setImmediate` 时则不阻塞，尽快进入下一阶段）。
- **check**：执行 `setImmediate` 回调。
- **close callbacks**：执行 `'close'` 事件回调。

### 微任务：process.nextTick 与 Promise

Node 里有**两个**优先级不同的微任务队列，它们不属于上面六个阶段，而是**在每个阶段切换之间被清空**：

1. **`process.nextTick` 队列**——优先级**最高**，先清空。
2. **Promise 微任务队列**（`.then` / `queueMicrotask` / `await` 后续）——其次清空。

> 关键：Node 在**每个阶段的每个回调执行完后**，都会先清空 `nextTick` 队列，再清空 Promise 微任务队列，然后才继续下一个回调 / 进入下一阶段。这一点和浏览器「一个宏任务之后清一次微任务」的粒度是一致的（现代 Node 已对齐浏览器行为）。

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
Promise.resolve().then(() => console.log("promise"));
process.nextTick(() => console.log("nextTick"));

console.log("sync");

// 输出：sync → nextTick → promise → timeout → immediate
// 同步代码 sync 最先；退出前清微任务：nextTick 高于 promise；
// 之后进入事件循环：timers 阶段的 timeout 早于 check 阶段的 immediate
```

### setTimeout(fn, 0) vs setImmediate 的顺序

在**主模块**里两者顺序**不确定**，取决于进入事件循环时 timer 是否已到期（受进程启动耗时影响）：

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
// 主模块中：顺序不确定，可能 timeout→immediate，也可能 immediate→timeout
```

但在 **I/O 回调内部**，顺序是**确定的**——`setImmediate` **总是先于** `setTimeout`。因为 I/O 回调在 poll 阶段执行，执行完紧接着就是 check 阶段（`setImmediate`），而 timers 要等下一轮循环：

```js
const fs = require("fs");
fs.readFile(__filename, () => {
  setTimeout(() => console.log("timeout"), 0);
  setImmediate(() => console.log("immediate"));
});
// 稳定输出：immediate → timeout
```

### 浏览器 vs Node 事件循环对比

| 维度       | 浏览器                                          | Node.js                                            |
| ---------- | ----------------------------------------------- | -------------------------------------------------- |
| 宏任务组织 | 单一/少数任务队列                               | 六个有序阶段（timers/pending/poll/check/close 等） |
| 微任务     | 一种（Promise / queueMicrotask 等）             | 两种：`process.nextTick`（更高优先级）+ Promise    |
| 微任务时机 | 每个宏任务后清空一次                            | 每个阶段的每个回调后清空（先 nextTick 再 Promise） |
| 渲染       | 有渲染阶段（rAF / 样式 / 布局 / 绘制）          | 无渲染概念                                         |
| 特有 API   | `requestAnimationFrame` / `requestIdleCallback` | `setImmediate`（check 阶段）/ `process.nextTick`   |

---

## Promise 核心知识

### 三种状态

`pending`（进行中）→ `fulfilled`（已成功）或 `rejected`（已失败）。状态一旦改变就不可逆，这叫做 resolved（已定型）。

### 基本用法

```js
const p = new Promise((resolve, reject) => {
  // resolve 和 reject 只有第一次调用有效
  resolve("成功");
  reject("失败"); // 无效，状态已经变为 fulfilled
});

p.then((value) => console.log(value)) // '成功'
  .catch((err) => console.log(err)) // 不会执行
  .finally(() => console.log("完成")); // 总会执行
```

关键点：Promise 构造函数中的代码是同步执行的，`.then` 中的回调才是微任务。

### 链式调用

`.then()` 返回一个新的 Promise，因此可以链式调用。回调中 return 的值会作为下一个 `.then` 的参数；如果 return 一个 Promise，则等待该 Promise 决议后再继续：

```js
fetch("/api/user")
  .then((res) => res.json()) // return Promise
  .then((data) => data.id) // return 普通值
  .then((id) => fetch(`/api/posts/${id}`))
  .then((res) => res.json())
  .catch((err) => console.error(err)); // 捕获链中任意位置的错误
```

最佳实践：始终使用 `.catch()` 而不是 `.then(null, onRejected)`，因为 `.catch` 能捕获前面所有 `.then` 中的错误。

### 静态方法

```js
// 全部成功才成功，一个失败就失败
Promise.all([p1, p2, p3]).then(([r1, r2, r3]) => {});

// 全部决议（无论成功失败），返回每个结果的状态和值
Promise.allSettled([p1, p2]).then((results) => {
  // [{status: 'fulfilled', value: ...}, {status: 'rejected', reason: ...}]
});

// 谁先决议用谁的结果
Promise.race([p1, p2]).then((fastest) => {});

// 谁先成功用谁，全部失败才失败（ES2021）
Promise.any([p1, p2]).then((firstSuccess) => {});

// 快捷创建
Promise.resolve(value); // 创建一个 fulfilled 的 Promise
Promise.reject(reason); // 创建一个 rejected 的 Promise
```

### Promise.all vs Promise.allSettled 的选择

`Promise.all` 适合"全部成功才有意义"的场景（如并行请求多个必要数据）。`Promise.allSettled` 适合"需要知道每个结果"的场景（如批量操作，部分失败不影响其他）。

---

## 现代 Promise API 补充

### AbortSignal.timeout() — 简洁超时控制（Chrome 103+）

比自己手写 `Promise.race` + `setTimeout` 更简洁：

```js
// 旧写法：手动 Promise.race
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms),
  );
  return Promise.race([promise, timeout]);
}

// ✅ 新写法：AbortSignal.timeout
try {
  const res = await fetch("/api/data", {
    signal: AbortSignal.timeout(5000), // 5 秒超时
  });
  const data = await res.json();
} catch (err) {
  if (err.name === "TimeoutError") {
    console.log("请求超时");
  }
}
```

### structuredClone() — 原生深拷贝

`structuredClone` 是原生深拷贝 API（Chrome 98+、Node 17+），替代 `JSON.parse(JSON.stringify())`：

```js
// JSON 方案的缺陷
const obj = { date: new Date(), map: new Map([["key", 1]]), fn: () => {} };
const bad = JSON.parse(JSON.stringify(obj));
// bad.date → 字符串（不是 Date 对象）
// bad.map  → {} （Map 丢失）
// bad.fn   → undefined（函数丢失）

// ✅ structuredClone：支持 Date/Map/Set/RegExp/ArrayBuffer/Blob，支持循环引用
const good = structuredClone(obj); // 注意：函数仍然会抛出错误
good.date instanceof Date; // true ✅
good.map instanceof Map; // true ✅

// 不支持的类型（会抛出 DataCloneError）
structuredClone({ fn: () => {} }); // ❌ 函数不支持
structuredClone(document.body); // ❌ DOM 节点不支持
```

详见：[深拷贝方案对比.md](../深拷贝方案对比.md)

---

## 实用异步模式

### 并发控制

限制同时进行的异步操作数量，避免瞬间发出大量请求：

```js
async function asyncPool(limit, items, fn) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

// 使用：最多同时 3 个请求
await asyncPool(3, urls, (url) => fetch(url));
```

接收任务函数数组（而非数据 + 转换函数）的写法：

```js
// 控制最大并发数（接收 task 函数数组）
async function concurrentControl(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

// 使用示例
const tasks = urls.map((url) => () => fetch(url).then((r) => r.json()));
const results = await concurrentControl(tasks, 3); // 最多同时 3 个
```

### 超时控制

```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms),
  );
  return Promise.race([promise, timeout]);
}

// 使用：5 秒超时
const data = await withTimeout(fetch("/api/data"), 5000);
```

### 错误重试

```js
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
}

// 使用：最多重试 3 次，间隔递增
const data = await retry(() => fetch("/api/data").then((r) => r.json()));
```
