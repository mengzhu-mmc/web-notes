# Node.js 现代特性（Node 22 LTS）

> 整理 Node.js 22 LTS 核心新特性、内置工具链及面试高频考点。

---

## 一、Node.js 22 LTS 新特性

### 1.1 原生 `require(esm)` —— ES Module 无缝互操作

Node.js 22 正式支持在 **CommonJS 模块中直接 `require()` ES Module**，不再需要动态 `import()` 包裹。

```js
// Before Node 22：必须用动态 import
const { foo } = await import('./esm-module.mjs');

// Node 22+：可以直接 require（同步）
// 前提：目标 ESM 不含顶层 await
const { foo } = require('./esm-module.mjs');
```

**注意事项：**
- 目标 ESM 文件不能有顶层 `await`，否则报错
- 需要 `--experimental-require-module` flag（22.x），或在更高版本默认开启
- 解决了大量生态包迁移到纯 ESM 后 CJS 项目的兼容问题

---

### 1.2 内置 `fetch` 和 `WebSocket`

从 Node 18 引入、Node 21 稳定，Node 22 LTS 正式内置：

```js
// fetch —— 无需 node-fetch，直接用
const res = await fetch('https://api.example.com/data');
const json = await res.json();

// WebSocket —— 无需 ws 包，直接用
const ws = new WebSocket('wss://echo.websocket.org');
ws.onopen = () => ws.send('hello');
ws.onmessage = (e) => console.log(e.data);
```

**面试考点：**
- 内置 `fetch` 基于 `undici`，性能优于社区 `node-fetch`
- `WebSocket` 是 WHATWG 标准实现，与浏览器 API 保持一致

---

### 1.3 `--watch` 模式（文件变更自动重启）

```bash
# 监听文件变更，自动重启 Node 进程
node --watch server.js

# 只监听特定路径
node --watch-path=./src server.js
```

**对比 nodemon：**

| 特性 | `--watch` | nodemon |
|------|-----------|---------|
| 安装 | 内置，零依赖 | 需 `npm i -D nodemon` |
| 配置 | 有限 | 功能丰富（nodemon.json）|
| 适用 | 简单开发场景 | 复杂项目/生产级开发服务器 |

---

## 二、`node:test` 内置测试框架

Node 18 引入、Node 22 稳定的内置测试框架，无需安装 Jest/Mocha。

### 2.1 基础用法

```js
// test/sum.test.js
import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sum } from '../src/sum.js';

describe('sum()', () => {
  it('adds two numbers', () => {
    assert.equal(sum(1, 2), 3);
  });

  it('handles negatives', () => {
    assert.equal(sum(-1, -2), -3);
  });
});

// 运行
// node --test
// node --test test/**/*.test.js
```

### 2.2 异步测试 & Mock

```js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('async test', async (t) => {
  const fn = mock.fn(async () => 'mocked');
  const result = await fn();
  assert.equal(result, 'mocked');
  assert.equal(fn.mock.calls.length, 1);
});
```

### 2.3 对比 Jest / Vitest

| 特性 | `node:test` | Jest | Vitest |
|------|-------------|------|--------|
| 安装 | 内置，零依赖 | `npm i -D jest` | `npm i -D vitest` |
| 速度 | 快（无 transform）| 中等 | 极快（Vite）|
| TypeScript | 需 `--require ts-node` | 需 babel/ts-jest | 原生支持 |
| Snapshot | ❌ 暂不支持 | ✅ | ✅ |
| Coverage | `--experimental-test-coverage` | 内置 | 内置 |
| 生态/Mock | 基础 | 丰富 | 丰富 |
| 适用场景 | 工具库/简单场景 | 大型项目 | Vite 项目 |

**结论：** 纯 Node 工具库 / CI 场景可用 `node:test` 降低依赖；前端项目依然推荐 Vitest。

---

## 三、Corepack —— 包管理器版本锁定

`Corepack` 是 Node.js 16.9+ 内置工具，用于管理 `pnpm` / `yarn` 的版本，确保团队使用一致的包管理器版本。

### 3.1 启用 Corepack

```bash
# 启用 Corepack（首次需要）
corepack enable

# 为当前项目固定 pnpm 版本
corepack use pnpm@9.1.0

# 这会在 package.json 中写入：
# "packageManager": "pnpm@9.1.0+sha256.xxxx"
```

### 3.2 `package.json` 配置

```json
{
  "packageManager": "pnpm@9.1.0+sha256.abc123"
}
```

当有人用错误版本的 pnpm 执行命令时，Corepack 会自动安装正确版本或报错拦截。

### 3.3 常用命令

```bash
# 激活对应包管理器
corepack enable pnpm
corepack enable yarn

# 准备（预下载）指定版本
corepack prepare pnpm@9.1.0 --activate

# 查看当前状态
corepack --version
```

---

## 四、AsyncLocalStorage —— 请求链路追踪

`AsyncLocalStorage` 是 Node.js 12.17+ 引入的 API，解决异步上下文中"传递请求 ID"的痛点，是实现链路追踪（APM/日志关联）的核心工具。

### 4.1 核心原理

类似浏览器的 `localStorage`，但作用于**异步调用链**。在 `run()` 方法创建的上下文中，所有子异步调用都能通过 `getStore()` 获取同一份数据，无需手动传参。

### 4.2 完整代码示例：Express 请求追踪

```js
// context.js —— 创建全局 AsyncLocalStorage 实例
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();
```

```js
// middleware.js —— 在请求入口注入 requestId
import { randomUUID } from 'node:crypto';
import { requestContext } from './context.js';

export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  
  // 将 requestId 注入异步上下文，后续所有调用都能获取
  requestContext.run({ requestId, startTime: Date.now() }, () => {
    res.setHeader('x-request-id', requestId);
    next();
  });
}
```

```js
// logger.js —— 任意位置自动获取 requestId，无需传参
import { requestContext } from './context.js';

export function log(message, data = {}) {
  const store = requestContext.getStore();
  const requestId = store?.requestId ?? 'no-context';
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    message,
    ...data,
  }));
}
```

```js
// userService.js —— 业务层直接用 log，无需关心 requestId
import { log } from './logger.js';

export async function getUserById(id) {
  log('查询用户', { userId: id });          // 自动带上 requestId
  
  // 模拟数据库查询
  await new Promise(r => setTimeout(r, 50));
  
  log('查询完成', { userId: id });
  return { id, name: 'maomengchao' };
}
```

```js
// server.js —— 组合起来
import express from 'express';
import { requestIdMiddleware } from './middleware.js';
import { getUserById } from './userService.js';
import { log } from './logger.js';

const app = express();
app.use(requestIdMiddleware);

app.get('/user/:id', async (req, res) => {
  log('收到请求');
  const user = await getUserById(req.params.id);
  log('请求完成');
  res.json(user);
});

app.listen(3000);

// 日志输出示例（两个并发请求）：
// {"requestId":"uuid-A","message":"收到请求"}
// {"requestId":"uuid-B","message":"收到请求"}
// {"requestId":"uuid-A","message":"查询用户","userId":"1"}
// {"requestId":"uuid-B","message":"查询用户","userId":"2"}
// 每条日志自动关联到各自的请求，不会混淆 ✅
```

### 4.3 进阶用法：嵌套上下文

```js
requestContext.run({ requestId: 'outer' }, () => {
  console.log(requestContext.getStore()); // { requestId: 'outer' }
  
  requestContext.run({ requestId: 'inner' }, () => {
    console.log(requestContext.getStore()); // { requestId: 'inner' }
  });
  
  console.log(requestContext.getStore()); // { requestId: 'outer' }（不受影响）
});
```

---

## 五、面试考点：Node.js 与浏览器 EventLoop 的核心差异

### 5.1 宏观差异

| 维度 | Node.js | 浏览器 |
|------|---------|--------|
| 实现 | libuv（C 库）| 浏览器引擎（各异）|
| 阶段 | 6 个明确阶段 | 宏任务 + 微任务队列 |
| `setImmediate` | ✅ 有（check 阶段）| ❌ 无 |
| `process.nextTick` | ✅ 有（优先级最高）| ❌ 无 |
| I/O 类型 | 文件、网络、子进程 | 网络（XHR/fetch）|

### 5.2 Node.js 事件循环 6 个阶段（精简版）

```
timers ──> pending callbacks ──> idle/prepare ──> poll ──> check ──> close callbacks
   ↑                                                                         |
   └─────────────────────────────────────────────────────────────────────────┘
```

- **timers**：执行 `setTimeout` / `setInterval` 到期的回调
- **poll**：获取 I/O 事件，执行大多数回调；若队列空，等待新 I/O 或跳到 check
- **check**：执行 `setImmediate` 回调
- **close callbacks**：执行关闭事件回调（如 socket 关闭）

### 5.3 微任务执行时机（关键差异！）

**浏览器：** 每个宏任务执行完，清空**所有**微任务队列

**Node.js（v11 之前）：** 每个**阶段**结束后才清空微任务  
**Node.js（v11+）：** 与浏览器对齐，每个**宏任务**（定时器等）执行完立即清空微任务

```js
// 验证代码（Node 11+，行为与浏览器一致）
setTimeout(() => {
  console.log('timer 1');
  Promise.resolve().then(() => console.log('promise 1'));
}, 0);

setTimeout(() => {
  console.log('timer 2');
  Promise.resolve().then(() => console.log('promise 2'));
}, 0);

// 输出：timer 1 → promise 1 → timer 2 → promise 2
```

### 5.4 `process.nextTick` vs `Promise` 优先级

```js
Promise.resolve().then(() => console.log('Promise'));
process.nextTick(() => console.log('nextTick'));

// 输出：nextTick → Promise
// 原因：nextTick 队列优先级高于 Promise 微任务队列
```

**记忆口诀：** `nextTick > Promise微任务 > setImmediate > setTimeout(0)`

---

## 关联笔记

- [[Node.js面试核心知识点]] —— 事件循环、模块系统、Stream 等全面梳理
- [[Node.js事件循环详解]] —— 事件循环深度解析
- [[Node.js模块系统深入解析]] —— CJS / ESM 模块系统
- [[Node.js-Stream流与中间件机制]] —— Stream 与中间件
