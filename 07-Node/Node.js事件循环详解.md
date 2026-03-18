# Node.js 事件循环详解

> 深入理解 Node.js 异步编程的核心机制，掌握事件循环的各个阶段及其与浏览器事件循环的区别。

## 面试高频考点

1. **Node.js 事件循环与浏览器事件循环的区别？**
2. **setTimeout/setImmediate 的执行顺序？**
3. **process.nextTick 和 Promise.then 哪个先执行？**
4. **Node.js 中微任务和宏任务的处理时机？**
5. **事件循环的各个阶段分别是什么？**

---

## 一、Node.js 事件循环架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Node.js 运行时                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   用户代码   │    │   事件循环   │    │    线程池        │  │
│  │  (同步代码)  │───→│  (Event Loop)│←───│ (libuv threads) │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────┼─────────────────────────────┐   │
│  │                         ↓                             │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │   │
│  │  │  timers │ │  poll   │ │  check  │ │ close   │ ... │   │
│  │  │ 阶段    │ │ 阶段    │ │ 阶段    │ │ callbacks│    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │   │
│  │                    事件循环阶段                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| **Event Loop** | Node.js 处理异步操作的核心机制，由 libuv 库实现 |
| **Phase（阶段）** | 事件循环分为多个阶段，每个阶段处理特定类型的回调 |
| **Microtask（微任务）** | `process.nextTick` 和 `Promise.then` |
| **Macrotask（宏任务）** | `setTimeout`、`setInterval`、`setImmediate`、I/O 回调等 |

---

## 二、事件循环的六个阶段

Node.js 事件循环按顺序执行以下六个阶段：

```
┌───────────────────────┐
│     timers 阶段        │ ← 执行 setTimeout/setInterval 回调
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│  pending callbacks    │ ← 执行系统操作的回调（如 TCP 错误）
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│   idle/prepare 阶段    │ ← 内部使用，开发者无需关注
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│      poll 阶段         │ ← 执行 I/O 回调，轮询新事件
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│     check 阶段         │ ← 执行 setImmediate 回调
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│  close callbacks 阶段  │ ← 执行 close 事件回调（如 socket.close）
└───────────────────────┘
           ↓
    回到 timers 阶段（循环）
```

### 2.1 各阶段详解

#### **timers 阶段**

- 执行 `setTimeout` 和 `setInterval` 的回调
- **注意**：定时器的回调不一定在精确的时间点执行，而是在到达时间后**尽可能快**地执行

```javascript
setTimeout(() => {
  console.log('timer 回调');
}, 100);
```

#### **poll 阶段（核心阶段）**

- 检索新的 I/O 事件
- 执行 I/O 相关的回调（除了 timers、check、close 阶段的回调）
- **关键行为**：
  - 如果 poll 队列不为空，按顺序同步执行回调
  - 如果 poll 队列为空：
    - 如果有 `setImmediate` 待执行，进入 check 阶段
    - 否则，阻塞等待新的 I/O 事件

```javascript
const fs = require('fs');

// I/O 回调在 poll 阶段执行
fs.readFile('file.txt', (err, data) => {
  console.log('I/O 回调在 poll 阶段执行');
});
```

#### **check 阶段**

- 专门执行 `setImmediate` 的回调
- `setImmediate` 设计目的是在 poll 阶段完成后立即执行

```javascript
setImmediate(() => {
  console.log('setImmediate 回调在 check 阶段执行');
});
```

---

## 三、微任务队列：nextTick 与 Promise

### 3.1 微任务的执行时机

**关键规则**：
- `process.nextTick` 的优先级**高于** `Promise.then`
- 微任务在每个**阶段完成后**、进入下一阶段前执行
- 如果微任务队列不为空，会**清空整个队列**后才继续

```javascript
console.log('1. 同步代码开始');

setTimeout(() => {
  console.log('2. setTimeout（timers 阶段）');
}, 0);

setImmediate(() => {
  console.log('3. setImmediate（check 阶段）');
});

Promise.resolve().then(() => {
  console.log('4. Promise.then（微任务）');
});

process.nextTick(() => {
  console.log('5. process.nextTick（微任务，优先级最高）');
});

console.log('6. 同步代码结束');

// 输出顺序：
// 1. 同步代码开始
// 6. 同步代码结束
// 5. process.nextTick（微任务，优先级最高）
// 4. Promise.then（微任务）
// 2. setTimeout（timers 阶段）
// 3. setImmediate（check 阶段）
```

### 3.2 nextTick 的危险性

`process.nextTick` 可以递归调用，导致**饿死事件循环**：

```javascript
// ⚠️ 危险代码：会导致事件循环阻塞
function dangerous() {
  process.nextTick(dangerous);
}
dangerous();
// 事件循环永远无法进入下一阶段！
```

**最佳实践**：
- 优先使用 `setImmediate`，它会在 I/O 事件后执行，不会饿死事件循环
- `process.nextTick` 仅用于需要立即执行的特定场景

---

## 四、经典面试题解析

### 4.1 setTimeout vs setImmediate

```javascript
setTimeout(() => {
  console.log('setTimeout');
}, 0);

setImmediate(() => {
  console.log('setImmediate');
});
```

**答案**：执行顺序**不确定**

**原因**：
- 如果代码在主模块中执行，两者都在 timers 阶段后进入事件循环
- `setTimeout(fn, 0)` 实际最小延迟约为 1-4ms（取决于系统）
- 如果事件循环启动耗时超过 1ms，`setTimeout` 先执行；否则 `setImmediate` 可能先执行

**但在 I/O 回调中，顺序是确定的**：

```javascript
const fs = require('fs');

fs.readFile('file.txt', () => {
  setTimeout(() => {
    console.log('setTimeout');  // 后执行
  }, 0);
  
  setImmediate(() => {
    console.log('setImmediate'); // 先执行
  });
});
```

**原因**：I/O 回调在 poll 阶段执行，poll 阶段后会进入 check 阶段执行 `setImmediate`，然后下一轮循环才到 timers 阶段执行 `setTimeout`。

### 4.2 综合执行顺序题

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  process.nextTick(() => console.log('3'));
  Promise.resolve().then(() => console.log('4'));
}, 0);

process.nextTick(() => {
  console.log('5');
  process.nextTick(() => console.log('6'));
});

Promise.resolve().then(() => {
  console.log('7');
  process.nextTick(() => console.log('8'));
});

setImmediate(() => {
  console.log('9');
});

console.log('10');
```

**答案**：`1 10 5 6 7 8 2 3 4 9`

**解析**：
1. 同步代码：`1`、`10`
2. 第一轮微任务：`nextTick 队列 [5]` → 执行 5，新增 `nextTick 队列 [6]` → 执行 6
3. 第一轮微任务：`Promise 队列 [7]` → 执行 7，新增 `nextTick 队列 [8]` → 执行 8（nextTick 优先级高）
4. timers 阶段：`2`，然后执行该阶段后的微任务 `3`、`4`
5. check 阶段：`9`

---

## 五、Node.js vs 浏览器事件循环

| 特性 | 浏览器 | Node.js |
|------|--------|---------|
| **宏任务来源** | `setTimeout`、`setInterval`、I/O、UI 渲染 | `setTimeout`、`setInterval`、`setImmediate`、I/O、close 事件 |
| **微任务** | `Promise.then`、`MutationObserver` | `process.nextTick`、`Promise.then` |
| **微任务优先级** | `Promise.then` 唯一微任务 | `process.nextTick` > `Promise.then` |
| **事件循环阶段** | 无明确阶段划分 | 6 个明确阶段 |
| **特殊 API** | 无 | `setImmediate`、`process.nextTick` |
| **I/O 处理** | 通过 Web APIs | 通过 libuv 线程池 |

### 5.1 浏览器事件循环简化版

```
┌─────────────────────────────────────────┐
│              浏览器事件循环               │
├─────────────────────────────────────────┤
│  1. 执行同步代码                         │
│  2. 执行所有微任务（Promise、MutationObserver）│
│  3. 执行一个宏任务（setTimeout、I/O 等）  │
│  4. 回到步骤 2                           │
└─────────────────────────────────────────┘
```

### 5.2 Node.js 事件循环简化版

```
┌─────────────────────────────────────────┐
│            Node.js 事件循环              │
├─────────────────────────────────────────┤
│  1. 执行同步代码                         │
│  2. 执行 process.nextTick 队列           │
│  3. 执行 Promise.then 队列               │
│  4. 进入事件循环阶段（timers → poll → check）│
│  5. 每个阶段结束后执行步骤 2、3           │
│  6. 循环直到没有待处理事件               │
└─────────────────────────────────────────┘
```

---

## 六、实际应用场景

### 6.1 使用 setImmediate 替代 setTimeout(fn, 0)

```javascript
// 不推荐
setTimeout(() => {
  doSomething();
}, 0);

// 推荐
setImmediate(() => {
  doSomething();
});
```

**原因**：`setImmediate` 设计目的就是尽快执行，不需要等待最小延迟时间。

### 6.2 在 I/O 操作后延迟执行

```javascript
const fs = require('fs');

fs.readFile('config.json', (err, data) => {
  // I/O 完成后，优先执行 setImmediate
  setImmediate(() => {
    console.log('I/O 完成后立即执行');
  });
  
  // 下一轮循环才执行
  setTimeout(() => {
    console.log('下一轮循环执行');
  }, 0);
});
```

### 6.3 拆分耗时任务避免阻塞

```javascript
function processLargeArray(array) {
  const chunk = array.splice(0, 100);
  
  // 处理这一批数据
  processChunk(chunk);
  
  if (array.length > 0) {
    // 让出事件循环，处理其他 I/O
    setImmediate(() => processLargeArray(array));
  }
}
```

---

## 七、总结

### 核心要点

1. **事件循环阶段**：timers → pending callbacks → idle/prepare → poll → check → close callbacks
2. **微任务优先级**：`process.nextTick` > `Promise.then`
3. **微任务执行时机**：每个阶段结束后、进入下一阶段前
4. **setTimeout vs setImmediate**：主模块中不确定，I/O 回调中 setImmediate 先执行
5. **避免 nextTick 递归**：可能导致事件循环饿死

### 记忆口诀

```
timers 定时器先执行，poll 轮询 I/O 忙
check 检查 Immediate，close 关闭回调放
nextTick 优先级最高，Promise 微任务随后
阶段结束清微任务，事件循环永不休
```

---

## 参考资源

- [Node.js 官方文档 - Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [libuv 设计文档](http://docs.libuv.org/en/v1.x/design.html)
- [Node.js 技术栈 - 事件循环](https://www.nodejs.red/#/nodejs/event-loop)
