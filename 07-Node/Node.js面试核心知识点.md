# Node.js 面试核心知识点

## 关联笔记

- [[09-网络与浏览器/浏览器原理/01_浏览器功能与组成]]
- [[02-JavaScript/异步编程/EventLoop]]

---

## 一、事件循环（Event Loop）

### 1.1 Node.js 事件循环与浏览器的区别

这是 Node 面试出现频率最高的问题。Node.js 的事件循环基于 libuv，分为 6 个阶段，与浏览器的事件循环有本质区别。

```
Node.js 事件循环的 6 个阶段（每个阶段都有一个 FIFO 队列）：

   ┌───────────────────────────┐
┌─>│         timers            │  执行 setTimeout / setInterval 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  执行系统操作的回调（如 TCP 错误）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  仅内部使用
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │          poll              │  获取新的 I/O 事件，执行 I/O 回调
│  └─────────────┬─────────────┘  （几乎所有回调都在这里执行，除了定时器、close、setImmediate）
│  ┌─────────────┴─────────────┐
│  │         check             │  执行 setImmediate 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      close callbacks      │  执行 close 事件回调（如 socket.on('close')）
│  └───────────────────────────┘
```

### 1.2 微任务的执行时机

```javascript
// Node.js 中微任务在每个阶段切换时执行（Node 11+ 与浏览器行为一致）
// 微任务优先级：process.nextTick > Promise.then > queueMicrotask

setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));

// 输出顺序：nextTick → promise → timeout → immediate
// （timeout 和 immediate 的顺序在主模块中不确定，但在 I/O 回调中 immediate 一定先于 timeout）
```

### 1.3 经典面试题

```javascript
const fs = require('fs');

// 在 I/O 回调中，setImmediate 一定先于 setTimeout
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// 输出：immediate → timeout
// 原因：I/O 回调在 poll 阶段执行，执行完后进入 check 阶段（setImmediate），
//       然后才是下一轮的 timers 阶段（setTimeout）
```

> [!tip] 面试回答要点
> 浏览器的事件循环是"一个宏任务 → 清空所有微任务 → 渲染 → 下一个宏任务"。Node.js（11+）也是每执行一个宏任务就清空微任务，但它有 6 个阶段，且有 `process.nextTick`（优先级高于 Promise）和 `setImmediate`（check 阶段）这两个浏览器没有的 API。

---

## 二、模块系统

### 2.1 CommonJS 与 ES Module 的区别

| 维度 | CommonJS (require) | ES Module (import) |
|------|-------------------|-------------------|
| 加载时机 | 运行时加载 | 编译时静态分析 |
| 输出 | 值的拷贝（修改不影响原模块） | 值的引用（实时绑定） |
| 循环依赖 | 返回已执行部分的导出 | 通过引用可以获取最终值 |
| this 指向 | 指向当前模块的 exports | undefined |
| 顶层 await | 不支持 | 支持（Node 14.8+） |
| Tree Shaking | 不支持（动态结构） | 支持（静态结构） |

### 2.2 require 的加载机制

```javascript
// require() 的完整流程：
// 1. 路径解析（Module._resolveFilename）
//    - 核心模块（fs、path）→ 直接返回
//    - 相对/绝对路径 → 按 .js → .json → .node 顺序尝试
//    - 第三方模块 → 从当前目录的 node_modules 逐级向上查找

// 2. 缓存检查（Module._cache）
//    - 如果已缓存，直接返回 module.exports（不会重复执行）

// 3. 模块编译执行
//    - .js  → 包裹在函数中执行
//    - .json → JSON.parse
//    - .node → C++ 扩展，用 dlopen 加载

// 4. 返回 module.exports

// 模块包裹函数（这就是为什么模块中能用 __dirname 等变量）
(function(exports, require, module, __filename, __dirname) {
  // 你的模块代码
});
```

### 2.3 循环依赖问题

```javascript
// a.js
console.log('a 开始');
exports.done = false;
const b = require('./b.js'); // 此时去加载 b
console.log('在 a 中，b.done =', b.done);
exports.done = true;
console.log('a 结束');

// b.js
console.log('b 开始');
exports.done = false;
const a = require('./a.js'); // a 还没执行完，返回已执行部分的 exports
console.log('在 b 中，a.done =', a.done); // false（a 只执行了一半）
exports.done = true;
console.log('b 结束');

// 执行 node a.js 输出：
// a 开始 → b 开始 → 在 b 中，a.done = false → b 结束 → 在 a 中，b.done = true → a 结束
```

---

## 三、Stream（流）

### 3.1 四种基本流类型

```javascript
const { Readable, Writable, Transform, Duplex } = require('stream');

// Readable  - 可读流（数据源）：fs.createReadStream、http.IncomingMessage
// Writable  - 可写流（数据目标）：fs.createWriteStream、http.ServerResponse
// Duplex    - 双工流（可读可写，两端独立）：net.Socket、WebSocket
// Transform - 转换流（可读可写，输出是输入的变换）：zlib.createGzip、crypto
```

### 3.2 为什么要用 Stream？

```javascript
// ❌ 不用 Stream：一次性读入内存，大文件会导致内存溢出
const fs = require('fs');
const data = fs.readFileSync('huge-file.csv'); // 假设 2GB，直接 OOM
processData(data);

// ✅ 用 Stream：分块处理，内存占用恒定
const readStream = fs.createReadStream('huge-file.csv');
const writeStream = fs.createWriteStream('output.csv');

readStream
  .pipe(transformStream) // 管道：可读流 → 转换流 → 可写流
  .pipe(writeStream);

// pipe 自动处理了背压（backpressure）：
// 当写入速度跟不上读取速度时，自动暂停读取，避免内存堆积
```

### 3.3 手写一个 Transform 流

```javascript
const { Transform } = require('stream');

// 将输入的文本转为大写
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    // chunk 是 Buffer，需要转为字符串处理
    const upperCased = chunk.toString().toUpperCase();
    this.push(upperCased); // 推送到可读端
    callback(); // 通知处理完成
  }

  _flush(callback) {
    // 流结束前的最后处理（可选）
    this.push('\n--- END ---\n');
    callback();
  }
}

// 使用
process.stdin
  .pipe(new UpperCaseTransform())
  .pipe(process.stdout);
```

---

## 四、中间件模型

### 4.1 Express 中间件（线性模型）

```javascript
// Express 中间件是线性执行的，通过 next() 传递控制权
const express = require('express');
const app = express();

// 中间件本质：(req, res, next) => void
app.use((req, res, next) => {
  console.log('中间件1 - 开始');
  next(); // 调用下一个中间件
  console.log('中间件1 - 结束'); // next() 后的代码在后续中间件执行完后才执行
});

app.use((req, res, next) => {
  console.log('中间件2 - 开始');
  next();
  console.log('中间件2 - 结束');
});

app.get('/', (req, res) => {
  res.send('Hello');
});

// 请求 / 时输出：
// 中间件1 - 开始 → 中间件2 - 开始 → 中间件2 - 结束 → 中间件1 - 结束
```

### 4.2 Koa 洋葱模型

```javascript
// Koa 的中间件基于 async/await，形成"洋葱模型"
const Koa = require('koa');
const app = new Koa();

app.use(async (ctx, next) => {
  console.log('1 - 进入');
  await next();
  console.log('1 - 离开');
});

app.use(async (ctx, next) => {
  console.log('2 - 进入');
  await next();
  console.log('2 - 离开');
});

app.use(async (ctx) => {
  console.log('3 - 核心处理');
  ctx.body = 'Hello';
});

// 输出：1-进入 → 2-进入 → 3-核心处理 → 2-离开 → 1-离开
```

### 4.3 手写 Koa compose（洋葱模型核心）

```javascript
// koa-compose 的核心实现（面试高频手写题）
function compose(middlewares) {
  return function (ctx) {
    let index = -1;

    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error('next() 被多次调用'));
      index = i;

      const fn = middlewares[i];
      if (!fn) return Promise.resolve();

      try {
        // 将 dispatch(i+1) 作为 next 传给当前中间件
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}
```

> [!important] 面试高频
> Express 和 Koa 中间件的区别：Express 基于回调，Koa 基于 async/await。Koa 的洋葱模型让每个中间件都能在 next() 前后执行逻辑（比如计算请求耗时），Express 虽然 next() 后也能写代码，但不如 Koa 直观。

---

## 五、进程与集群

### 5.1 child_process（子进程）

```javascript
const { exec, spawn, fork } = require('child_process');

// exec：执行 shell 命令，缓冲输出（适合短命令）
exec('ls -la', (err, stdout, stderr) => {
  console.log(stdout);
});

// spawn：流式处理，适合长时间运行的进程
const child = spawn('node', ['heavy-task.js']);
child.stdout.on('data', (data) => console.log(`输出: ${data}`));
child.on('close', (code) => console.log(`退出码: ${code}`));

// fork：专门用于创建 Node.js 子进程，内置 IPC 通信
// parent.js
const child = fork('./worker.js');
child.send({ type: 'start', data: [1, 2, 3] }); // 发送消息
child.on('message', (msg) => console.log('收到:', msg)); // 接收消息

// worker.js
process.on('message', (msg) => {
  const result = msg.data.reduce((a, b) => a + b, 0);
  process.send({ type: 'result', data: result }); // 回传结果
});
```

### 5.2 Cluster 模块（多进程集群）

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`主进程 ${process.pid} 启动`);

  // 根据 CPU 核数创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // 工作进程退出后自动重启
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 退出，重新启动...`);
    cluster.fork();
  });
} else {
  // 工作进程共享同一个 TCP 端口
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`由进程 ${process.pid} 处理\n`);
  }).listen(8000);

  console.log(`工作进程 ${process.pid} 启动`);
}

// 原理：主进程监听端口，通过 round-robin（轮询）将连接分发给工作进程
// 实际项目中通常用 PM2 来管理，它封装了 Cluster 并提供了更多功能
```

---

## 六、Buffer 与文件操作

### 6.1 Buffer 基础

```javascript
// Buffer 是 Node.js 中处理二进制数据的类，类似于整数数组但大小固定

// 创建
const buf1 = Buffer.alloc(10);           // 10 字节，初始化为 0
const buf2 = Buffer.from('hello');       // 从字符串创建
const buf3 = Buffer.from([0x68, 0x65]); // 从数组创建

// 编码转换
const buf = Buffer.from('你好', 'utf-8');
console.log(buf.toString('base64'));  // '5L2g5aW9'
console.log(buf.toString('hex'));     // 'e4bda0e5a5bd'

// Buffer 与 Stream 的关系：
// Stream 中传输的 chunk 默认就是 Buffer
// 这就是为什么 stream 的 data 事件中需要 chunk.toString()
```

---

## 七、常用内置模块速览

```javascript
// path - 路径处理（跨平台安全）
const path = require('path');
path.join('/foo', 'bar', 'baz');     // '/foo/bar/baz'
path.resolve('foo', 'bar');          // '/当前工作目录/foo/bar'（返回绝对路径）
path.basename('/foo/bar/baz.js');    // 'baz.js'
path.extname('index.html');          // '.html'
path.dirname('/foo/bar/baz');        // '/foo/bar'

// fs - 文件系统（推荐用 promises API）
const fs = require('fs/promises');
await fs.readFile('file.txt', 'utf-8');
await fs.writeFile('file.txt', 'content');
await fs.mkdir('dir', { recursive: true });
await fs.readdir('dir');

// events - 事件发射器
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();
emitter.on('data', (payload) => console.log(payload));
emitter.emit('data', { msg: 'hello' });

// http - HTTP 服务
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});
server.listen(3000);
```

---

## 八、面试常见问答

### Q1：Node.js 为什么是单线程却能处理高并发？

Node.js 的"单线程"指的是 JS 执行线程只有一个，但底层的 libuv 维护了一个线程池（默认 4 个线程）来处理文件 I/O、DNS 查询等操作，网络 I/O 则使用操作系统的异步机制（epoll/kqueue/IOCP）。所以 Node.js 是"单线程事件驱动 + 非阻塞 I/O"模型，适合 I/O 密集型场景，不适合 CPU 密集型场景。

### Q2：Node.js 如何处理 CPU 密集型任务？

有几种方案：使用 `worker_threads`（工作线程）将计算任务放到独立线程；使用 `child_process.fork()` 创建子进程；使用 Cluster 模块利用多核 CPU；将计算任务交给 C++ Addon 或 WebAssembly；或者使用消息队列将任务分发到专门的计算服务。

### Q3：process.nextTick 和 setImmediate 的区别？

`process.nextTick` 在当前操作完成后、事件循环继续之前执行（微任务，优先级最高）。`setImmediate` 在事件循环的 check 阶段执行（宏任务）。`process.nextTick` 如果递归调用会阻塞事件循环（"饿死" I/O），`setImmediate` 不会。官方推荐优先使用 `setImmediate`。

### Q4：如何优雅地处理 Node.js 中的错误？

同步代码用 try/catch；异步回调遵循 error-first 模式（第一个参数是 error）；Promise 用 .catch() 或 async/await + try/catch；全局兜底用 `process.on('uncaughtException')` 和 `process.on('unhandledRejection')`，但这两个只应用于日志记录和优雅退出，不应该用来恢复程序状态。

### Q5：Node.js 中的内存泄漏如何排查？

常见原因包括：全局变量持续增长、闭包引用未释放、事件监听器未移除（EventEmitter 默认最多 10 个监听器会警告）、定时器未清除、大对象缓存无上限。排查工具有 `--inspect` 配合 Chrome DevTools 的 Memory 面板、`heapdump` 模块生成堆快照、`clinic.js` 进行性能诊断。
