# Node.js Stream 流与中间件机制

> 掌握 Node.js 中两个核心概念：Stream 流（高效处理大数据的基础）和中间件模式（Express/Koa 的架构核心）。

## 面试高频考点

1. **什么是 Stream？为什么要用流而不是直接读取文件？**
2. **Stream 的四种类型分别是什么？**
3. **pipe 方法的原理是什么？**
4. **背压（Backpressure）是什么？如何处理？**
5. **Express 和 Koa 中间件的区别？洋葱模型是什么？**
6. **如何手写一个简单的中间件系统？**

---

## 一、Stream 流基础

### 1.1 为什么需要 Stream？

```javascript
// ❌ 不用 Stream：一次性读取整个文件到内存
const fs = require('fs');
const data = fs.readFileSync('bigfile.mp4'); // 1GB 文件 → 占用 1GB 内存
res.end(data);

// ✅ 用 Stream：边读边发，内存始终只占用一小块 Buffer（默认 64KB）
const readable = fs.createReadStream('bigfile.mp4');
readable.pipe(res); // 内存占用极低，且响应更快（不用等全部读完）
```

**核心优势**：
- **内存效率**：不需要一次性加载全部数据
- **时间效率**：数据一到就开始处理，无需等待全部加载
- **可组合性**：通过 `pipe` 将多个流串联，形成数据处理管道

### 1.2 四种 Stream 类型

| 类型 | 说明 | 典型例子 |
|------|------|---------|
| **Readable（可读流）** | 数据来源，只能读不能写 | `fs.createReadStream`、`http.IncomingMessage`、`process.stdin` |
| **Writable（可写流）** | 数据终点，只能写不能读 | `fs.createWriteStream`、`http.ServerResponse`、`process.stdout` |
| **Duplex（双工流）** | 可读可写，但读写相互独立 | `net.Socket`（TCP 连接） |
| **Transform（转换流）** | 可读可写，输出是输入的变换结果 | `zlib.createGzip()`（压缩）、`crypto.createCipher()`（加密） |

### 1.3 Readable 流的两种模式

```javascript
const fs = require('fs');
const readable = fs.createReadStream('file.txt', { encoding: 'utf-8' });

// 模式一：流动模式（Flowing Mode）—— 数据自动推送
// 通过监听 'data' 事件或调用 pipe() 进入流动模式
readable.on('data', (chunk) => {
  console.log('收到数据块:', chunk.length, '字节');
});
readable.on('end', () => {
  console.log('读取完毕');
});
readable.on('error', (err) => {
  console.error('读取出错:', err);
});

// 模式二：暂停模式（Paused Mode）—— 手动控制读取节奏
// 默认就是暂停模式，需要手动调用 read()
readable.on('readable', () => {
  let chunk;
  // read() 返回 null 表示没有更多数据
  while ((chunk = readable.read(64)) !== null) {
    console.log('手动读取:', chunk);
  }
});
```

### 1.4 Writable 流

```javascript
const fs = require('fs');
const writable = fs.createWriteStream('output.txt');

// write() 返回 false 表示内部缓冲区已满，应该暂停写入（背压信号）
const canContinue = writable.write('第一行数据\n');

if (!canContinue) {
  // 等待 drain 事件再继续写入
  writable.once('drain', () => {
    writable.write('缓冲区已清空，继续写入\n');
  });
}

// 写完后必须调用 end()，否则文件不会关闭
writable.end('最后一行\n', () => {
  console.log('写入完成，文件已关闭');
});
```

---

## 二、pipe 与背压（Backpressure）

### 2.1 pipe 的工作原理

`pipe` 是 Stream 最常用的 API，它自动处理了背压问题：

```javascript
// pipe 的简化实现原理
Readable.prototype.pipe = function(dest) {
  this.on('data', (chunk) => {
    const ok = dest.write(chunk);
    if (!ok) {
      // 背压：下游处理不过来了，暂停上游
      this.pause();
    }
  });

  dest.on('drain', () => {
    // 下游缓冲区清空，恢复上游
    this.resume();
  });

  this.on('end', () => {
    dest.end();
  });

  return dest; // 返回 dest 支持链式调用
};

// 实际使用
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())       // 压缩
  .pipe(crypto.createCipher('aes-256-cbc', 'key')) // 加密
  .pipe(fs.createWriteStream('output.gz.enc'));     // 写入
```

### 2.2 背压（Backpressure）问题

```
生产者（Readable）速度 >> 消费者（Writable）速度
→ 数据堆积在内存缓冲区
→ 内存溢出 / 程序崩溃

解决方案：
1. 使用 pipe()（自动处理背压）
2. 手动监听 drain 事件
3. 使用 pipeline() 工具函数（Node 10+，自动处理错误和清理）
```

```javascript
const { pipeline } = require('stream/promises');

// pipeline 比 pipe 更安全：自动处理错误，防止内存泄漏
async function compress(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  );
  console.log('压缩完成');
}
```

### 2.3 自定义 Transform 流

```javascript
const { Transform } = require('stream');

// 实现一个将文本转大写的 Transform 流
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    // chunk 是 Buffer，需要先转字符串
    const upperCased = chunk.toString().toUpperCase();
    // push 将数据推入可读端
    this.push(upperCased);
    // callback 表示本次转换完成，可以处理下一个 chunk
    callback();
  }
}

// 使用
process.stdin
  .pipe(new UpperCaseTransform())
  .pipe(process.stdout);
// 输入 "hello" → 输出 "HELLO"
```

---

## 三、中间件模式（Middleware Pattern）

### 3.1 什么是中间件？

中间件是一种**函数组合模式**，将请求处理拆分为多个独立的、可复用的函数，每个函数负责一个单一职责（日志、鉴权、解析 body、错误处理等）。

```
请求 → [中间件1] → [中间件2] → [中间件3] → 路由处理器 → 响应
                                                         ↓
响应 ← [中间件1] ← [中间件2] ← [中间件3] ←────────────────
```

### 3.2 Express 中间件（线性模型）

Express 中间件是**线性执行**的，通过 `next()` 传递控制权：

```javascript
const express = require('express');
const app = express();

// 中间件签名：(req, res, next) => void
// 错误处理中间件签名：(err, req, res, next) => void

// 1. 应用级中间件（全局）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // 必须调用 next()，否则请求会被挂起
});

// 2. 路由级中间件
app.use('/api', (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: '未授权' });
    // 注意：return 防止继续执行，不需要调用 next()
  }
  req.user = verifyToken(token); // 将数据挂载到 req 上传递给后续中间件
  next();
});

// 3. 路由处理器
app.get('/api/users', (req, res) => {
  res.json({ user: req.user });
});

// 4. 错误处理中间件（必须放在最后，且有 4 个参数）
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Express 中间件执行顺序：严格按照注册顺序，线性执行
// 调用 next(err) 会跳过普通中间件，直接进入错误处理中间件
```

### 3.3 Koa 中间件（洋葱模型）

Koa 使用 `async/await` + `compose` 实现**洋葱模型**，中间件可以在 `await next()` 前后分别执行逻辑：

```javascript
const Koa = require('koa');
const app = new Koa();

// Koa 中间件签名：async (ctx, next) => void
// ctx 是 req 和 res 的封装对象

// 中间件1：计时器
app.use(async (ctx, next) => {
  const start = Date.now();
  console.log('→ 进入中间件1');
  await next(); // 暂停，进入下一个中间件
  // next() 返回后，继续执行
  console.log('← 离开中间件1');
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

// 中间件2：日志
app.use(async (ctx, next) => {
  console.log('→ 进入中间件2');
  await next();
  console.log('← 离开中间件2');
  console.log(`${ctx.method} ${ctx.url} - ${ctx.status}`);
});

// 路由处理
app.use(async (ctx) => {
  console.log('→ 路由处理器');
  ctx.body = 'Hello World';
  console.log('← 路由处理器');
});

// 执行顺序（洋葱模型）：
// → 进入中间件1
// → 进入中间件2
// → 路由处理器
// ← 路由处理器
// ← 离开中间件2
// ← 离开中间件1
```

### 3.4 手写 koa-compose（洋葱模型核心）

```javascript
// koa-compose 源码简化版（面试必备）
function compose(middlewares) {
  return function(ctx) {
    // index 用于防止同一个中间件多次调用 next()
    let index = -1;

    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error('next() 被多次调用'));
      }
      index = i;

      const fn = middlewares[i];
      if (!fn) {
        // 所有中间件执行完毕
        return Promise.resolve();
      }

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

// 使用示例
const middlewares = [
  async (ctx, next) => {
    ctx.result = [];
    ctx.result.push('A-before');
    await next();
    ctx.result.push('A-after');
  },
  async (ctx, next) => {
    ctx.result.push('B-before');
    await next();
    ctx.result.push('B-after');
  },
  async (ctx) => {
    ctx.result.push('C');
  }
];

const fn = compose(middlewares);
const ctx = {};
fn(ctx).then(() => {
  console.log(ctx.result);
  // ['A-before', 'B-before', 'C', 'B-after', 'A-after']
});
```

---

## 四、Express vs Koa 对比

| 对比维度 | Express | Koa |
|---------|---------|-----|
| **中间件模型** | 线性（Linear） | 洋葱（Onion） |
| **异步处理** | 回调 / Promise（需手动处理） | 原生 async/await |
| **内置功能** | 路由、静态文件、模板引擎等 | 极简内核，几乎无内置功能 |
| **错误处理** | 4 参数错误中间件 | try/catch + ctx.app.emit('error') |
| **社区生态** | 非常成熟，插件丰富 | 相对较小，但质量高 |
| **适用场景** | 快速开发、中小型项目 | 需要精细控制、高性能场景 |

```javascript
// Express 错误处理（需要显式传递 err）
app.get('/user', async (req, res, next) => {
  try {
    const user = await getUser();
    res.json(user);
  } catch (err) {
    next(err); // 必须手动传给错误中间件
  }
});

// Koa 错误处理（更优雅）
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
    ctx.app.emit('error', err, ctx); // 触发全局错误事件
  }
});
```

---

## 五、实战：用 Stream 实现大文件上传处理

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const filename = req.headers['x-filename'] || 'upload.gz';
    const savePath = path.join(__dirname, 'uploads', filename);

    try {
      // req 本身就是 Readable 流
      // 边接收边压缩边写入，内存占用极低
      await pipeline(
        req,                              // 可读流：HTTP 请求体
        zlib.createGzip(),                // 转换流：gzip 压缩
        fs.createWriteStream(savePath)    // 可写流：写入文件
      );

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, path: savePath }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  }
});

server.listen(3000, () => console.log('上传服务启动在 3000 端口'));
```

---

## 六、面试常见问答

**Q1：Stream 和 Buffer 的关系是什么？**

Buffer 是 Node.js 中存储二进制数据的固定大小内存块。Stream 在传输数据时，每个 `chunk`（数据块）默认就是一个 Buffer 对象。Stream 是数据流动的管道，Buffer 是管道中流动的"水"。当 Stream 的消费速度跟不上生产速度时，数据会暂时存储在内部的 Buffer 队列中（即背压缓冲区）。

**Q2：为什么 Koa 比 Express 更适合处理异步？**

Express 的中间件是线性的，`next()` 返回的是 `void`，无法感知后续中间件的完成状态。如果后续中间件抛出异步错误，Express 无法自动捕获，必须手动 `try/catch` + `next(err)`。Koa 的 `next()` 返回 Promise，`await next()` 会等待后续所有中间件执行完毕，天然支持异步错误冒泡，错误处理更简洁。

**Q3：洋葱模型有什么实际应用价值？**

洋葱模型让中间件可以在请求处理的"前"和"后"都执行逻辑，非常适合：计时统计（前记录开始时间，后计算耗时）、请求/响应日志（前记录请求，后记录响应状态）、事务处理（前开启事务，后提交或回滚）、缓存（前检查缓存，后写入缓存）。这些场景在 Express 线性模型中实现起来更复杂。

**Q4：如何在 Node.js 中处理大文件而不撑爆内存？**

核心原则是"流式处理"：使用 `fs.createReadStream` 代替 `fs.readFile`，使用 `pipeline` 串联处理步骤（压缩、加密、写入），避免将整个文件内容存入变量。对于 HTTP 响应，直接 `pipe` 到 `res` 对象。对于数据库操作，使用支持流式查询的驱动（如 MySQL2 的 `queryStream`）。

**Q5：中间件中的 `next` 不调用会怎样？**

在 Express 中，如果不调用 `next()`，请求会被"挂起"，客户端会一直等待直到超时。在 Koa 中，如果不 `await next()`，后续中间件不会执行，但当前中间件正常返回后请求会结束（如果 `ctx.body` 已设置）。实际开发中，忘记调用 `next()` 是常见 bug，表现为接口无响应。
