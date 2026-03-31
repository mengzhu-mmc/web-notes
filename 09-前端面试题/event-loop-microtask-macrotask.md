# 事件循环：宏任务与微任务

> 面试频率：⭐⭐⭐⭐⭐ | 难度：高 | 最后更新：2026-03-31

---

## 核心概念

JS 是单线程语言，通过**事件循环（Event Loop）**实现异步。每次循环（Tick）流程：

```
执行同步代码（Call Stack）
  → 清空所有微任务队列（Microtask Queue）
  → 取一个宏任务执行（Macrotask Queue）
  → 再清空微任务 → 取下一个宏任务 → ...
```

---

## 宏任务 vs 微任务

| 类型 | 包含 |
|------|------|
| **宏任务（Macrotask）** | `setTimeout`、`setInterval`、`setImmediate`（Node）、`MessageChannel`、I/O、UI rendering |
| **微任务（Microtask）** | `Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`、`async/await`（await 后面的代码） |

**关键规则：每个宏任务执行完后，必须清空所有微任务，才能执行下一个宏任务。**

---

## 执行顺序示例

### 基础示例

```js
console.log('1');          // 同步

setTimeout(() => {
  console.log('2');        // 宏任务
}, 0);

Promise.resolve().then(() => {
  console.log('3');        // 微任务
});

console.log('4');          // 同步

// 输出顺序：1 4 3 2
```

**分析：**
1. `1` - 同步，直接执行
2. setTimeout 回调加入宏任务队列
3. Promise.then 回调加入微任务队列
4. `4` - 同步，直接执行
5. 同步代码执行完，清空微任务 → `3`
6. 取宏任务 → `2`

### async/await 示例

```js
async function async1() {
  console.log('A1 start');        // 同步
  await async2();                 // async2() 同步执行，await 后面进微任务
  console.log('A1 end');          // 微任务
}

async function async2() {
  console.log('A2');              // 同步
}

console.log('start');
setTimeout(() => console.log('timeout'), 0);
async1();
console.log('end');

// 输出：start → A1 start → A2 → end → A1 end → timeout
```

**`await` 本质：** `await expr` 等价于 `Promise.resolve(expr).then(后续代码)`，await 后面的代码是微任务。

---

## 经典面试题：输出顺序分析

```js
console.log('1');

setTimeout(function () {
  console.log('2');
  new Promise(function (resolve) {
    console.log('3');
    resolve();
  }).then(function () {
    console.log('4');
  });
}, 0);

new Promise(function (resolve) {
  console.log('5');
  resolve();
}).then(function () {
  console.log('6');
});

setTimeout(function () {
  console.log('7');
  new Promise(function (resolve) {
    console.log('8');
    resolve();
  }).then(function () {
    console.log('9');
  });
}, 0);

console.log('10');

// 输出：1 5 10 6 2 3 4 7 8 9
```

**分步解析：**
- 同步：`1`, `5`（Promise 构造函数同步）, `10`
- 微任务：`6`（第一个 Promise.then）
- 宏任务1（第一个 setTimeout）：`2`, `3`（同步），然后微任务 `4`
- 宏任务2（第二个 setTimeout）：`7`, `8`（同步），然后微任务 `9`

---

## Node.js 与浏览器的差异

### 浏览器事件循环
- 标准 HTML 规范定义
- 宏任务逐个执行，每次清空微任务

### Node.js 事件循环（libuv）

Node.js 的事件循环有 **6个阶段**：

```
timers → pending callbacks → idle/prepare
  → poll → check → close callbacks → (循环)
```

| 阶段 | 内容 |
|------|------|
| timers | `setTimeout` / `setInterval` 回调 |
| poll | I/O 回调（网络、文件） |
| check | `setImmediate` 回调 |
| close callbacks | `socket.on('close')` 等 |

**Node.js 特有：**
- `setImmediate`：check 阶段，比 setTimeout(0) 在 I/O 回调中先执行
- `process.nextTick`：**优先级最高的微任务**，在每个阶段切换时先于 Promise.then 执行

```js
// Node.js 中
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));

// 输出：nextTick → promise → timeout/immediate（顺序不固定）
// 在 I/O 回调内：nextTick → promise → immediate → timeout
```

---

## 面试考点

### 常见问法

1. "说说 JS 事件循环机制"
2. "Promise 和 setTimeout 谁先执行？"
3. "以下代码输出什么？" （给一段混合代码）
4. "process.nextTick 和 Promise.then 有什么区别？"

### 答题要点

- **执行顺序**：同步 → 微任务（全部清空）→ 宏任务（一个）→ 微任务（全部）→ ...
- **微任务优先于宏任务**，这是核心
- **async/await**：await 后面的代码是微任务（Promise.then）
- **Node 差异**：多了 `process.nextTick`（微任务中优先级最高）和 `setImmediate`
- **Promise 构造函数是同步的**，.then 才是微任务

---

`#javascript` `#event-loop` `#promise` `#async` `#interview` `#frontend`
