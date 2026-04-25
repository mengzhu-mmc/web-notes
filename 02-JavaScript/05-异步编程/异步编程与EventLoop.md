# 异步编程与 Event Loop

> 面试高频考点 | JS 异步机制核心

## 相关笔记

- [async/await 实现原理](./异步编程/async-await实现原理.md) — Generator 原理、手写自动执行器
- [Promise 实现原理](./异步编程/Promise实现原理.md) — 手写 SimplePromise、Promise/A+ 规范

## Event Loop 事件循环（面试必考）

JavaScript 是单线程语言，通过事件循环机制实现异步非阻塞。

### 执行模型

JS 引擎维护一个调用栈（Call Stack）和多个任务队列。执行流程如下：

1. 执行当前宏任务（第一个宏任务是整体 script 代码）
2. 宏任务执行完毕后，清空所有微任务队列
3. 浏览器可能进行渲染（requestAnimationFrame 在此时执行）
4. 取下一个宏任务，重复上述过程

```
┌─────────────────────────────────┐
│         宏任务执行               │
│  (script / setTimeout / ...)    │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│      清空所有微任务              │
│  (Promise.then / queueMicrotask │
│   / MutationObserver)           │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│      浏览器渲染（可能）          │
│  (requestAnimationFrame)        │
└──────────────┬──────────────────┘
               ↓
          下一个宏任务 ...
```

### 宏任务与微任务

**宏任务（Macro Task）**：script 整体代码、setTimeout、setInterval、setImmediate（Node）、I/O、UI rendering

**微任务（Micro Task）**：Promise.then/catch/finally、queueMicrotask、MutationObserver、process.nextTick（Node，优先级最高）

### 经典面试题

```js
console.log('1')

setTimeout(() => {
  console.log('2')
  Promise.resolve().then(() => console.log('3'))
}, 0)

Promise.resolve().then(() => {
  console.log('4')
  setTimeout(() => console.log('5'), 0)
})

console.log('6')

// 输出：1 → 6 → 4 → 2 → 3 → 5
```

分析过程：同步代码先执行输出 1、6；然后清空微任务队列输出 4（同时注册了 setTimeout-5）；接着执行下一个宏任务 setTimeout 输出 2，其中注册的微任务立即执行输出 3；最后执行 setTimeout-5 输出 5。

### async/await 的本质

`async/await` 是 Generator + Promise 的语法糖。`await` 后面的代码相当于放在 `.then()` 的回调中：

```js
async function foo() {
  console.log('a')
  await bar()
  console.log('b')  // 相当于 bar().then(() => console.log('b'))
}

async function bar() {
  console.log('c')
}

foo()
console.log('d')

// 输出：a → c → d → b
```

---

## Promise 核心知识

### 三种状态

`pending`（进行中）→ `fulfilled`（已成功）或 `rejected`（已失败）。状态一旦改变就不可逆，这叫做 resolved（已定型）。

### 基本用法

```js
const p = new Promise((resolve, reject) => {
  // resolve 和 reject 只有第一次调用有效
  resolve('成功')
  reject('失败')  // 无效，状态已经变为 fulfilled
})

p.then(value => console.log(value))   // '成功'
 .catch(err => console.log(err))      // 不会执行
 .finally(() => console.log('完成'))   // 总会执行
```

关键点：Promise 构造函数中的代码是同步执行的，`.then` 中的回调才是微任务。

### 链式调用

`.then()` 返回一个新的 Promise，因此可以链式调用。回调中 return 的值会作为下一个 `.then` 的参数；如果 return 一个 Promise，则等待该 Promise 决议后再继续：

```js
fetch('/api/user')
  .then(res => res.json())           // return Promise
  .then(data => data.id)             // return 普通值
  .then(id => fetch(`/api/posts/${id}`))
  .then(res => res.json())
  .catch(err => console.error(err))  // 捕获链中任意位置的错误
```

最佳实践：始终使用 `.catch()` 而不是 `.then(null, onRejected)`，因为 `.catch` 能捕获前面所有 `.then` 中的错误。

### 静态方法

```js
// 全部成功才成功，一个失败就失败
Promise.all([p1, p2, p3]).then(([r1, r2, r3]) => {})

// 全部决议（无论成功失败），返回每个结果的状态和值
Promise.allSettled([p1, p2]).then(results => {
  // [{status: 'fulfilled', value: ...}, {status: 'rejected', reason: ...}]
})

// 谁先决议用谁的结果
Promise.race([p1, p2]).then(fastest => {})

// 谁先成功用谁，全部失败才失败（ES2021）
Promise.any([p1, p2]).then(firstSuccess => {})

// 快捷创建
Promise.resolve(value)  // 创建一个 fulfilled 的 Promise
Promise.reject(reason)  // 创建一个 rejected 的 Promise
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
    setTimeout(() => reject(new Error('Timeout')), ms)
  )
  return Promise.race([promise, timeout])
}

// ✅ 新写法：AbortSignal.timeout
try {
  const res = await fetch('/api/data', {
    signal: AbortSignal.timeout(5000) // 5 秒超时
  })
  const data = await res.json()
} catch (err) {
  if (err.name === 'TimeoutError') {
    console.log('请求超时')
  }
}
```

### structuredClone() — 原生深拷贝

`structuredClone` 是原生深拷贝 API（Chrome 98+、Node 17+），替代 `JSON.parse(JSON.stringify())`：

```js
// JSON 方案的缺陷
const obj = { date: new Date(), map: new Map([['key', 1]]), fn: () => {} }
const bad = JSON.parse(JSON.stringify(obj))
// bad.date → 字符串（不是 Date 对象）
// bad.map  → {} （Map 丢失）
// bad.fn   → undefined（函数丢失）

// ✅ structuredClone：支持 Date/Map/Set/RegExp/ArrayBuffer/Blob，支持循环引用
const good = structuredClone(obj) // 注意：函数仍然会抛出错误
good.date instanceof Date   // true ✅
good.map instanceof Map     // true ✅

// 不支持的类型（会抛出 DataCloneError）
structuredClone({ fn: () => {} }) // ❌ 函数不支持
structuredClone(document.body)    // ❌ DOM 节点不支持
```

详见：[深拷贝方案对比.md](../深拷贝方案对比.md)

---

## 实用异步模式

### 并发控制

限制同时进行的异步操作数量，避免瞬间发出大量请求：

```js
async function asyncPool(limit, items, fn) {
  const results = []
  const executing = new Set()
  
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item))
    results.push(p)
    executing.add(p)
    
    const clean = () => executing.delete(p)
    p.then(clean, clean)
    
    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }
  
  return Promise.all(results)
}

// 使用：最多同时 3 个请求
await asyncPool(3, urls, url => fetch(url))
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
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
const results = await concurrentControl(tasks, 3); // 最多同时 3 个
```

### 超时控制

```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  )
  return Promise.race([promise, timeout])
}

// 使用：5 秒超时
const data = await withTimeout(fetch('/api/data'), 5000)
```

### 错误重试

```js
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, delay * (i + 1)))
    }
  }
}

// 使用：最多重试 3 次，间隔递增
const data = await retry(() => fetch('/api/data').then(r => r.json()))
```
