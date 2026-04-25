# 手写：Promise 并发控制

> 面试频率：⭐⭐⭐⭐⭐ | 难度：中

---

## 题目要求

实现函数 `limitConcurrency(tasks, limit)`，满足：
- `tasks`：异步任务函数数组，每个函数调用后返回 Promise
- `limit`：最大并发数
- 最多同时运行 `limit` 个 Promise
- 所有任务完成后，按原始顺序返回结果数组
- 某个任务失败不影响其他任务继续执行（类似 `Promise.allSettled`）

```typescript
// 调用示例
const tasks = [
  () => fetch('/api/1'),
  () => fetch('/api/2'),
  () => fetch('/api/3'),
  // ...100 个请求
];

const results = await limitConcurrency(tasks, 3); // 最多同时 3 个
```

---

## 思路分析

### 方案一：Promise 池（推荐，面试标准答案）

```
初始状态：并发池为空，有 limit 个"槽位"

核心思路：
  1. 先启动 min(limit, tasks.length) 个任务，填满并发池
  2. 每当一个任务完成（无论成功/失败），立即从队列取下一个任务补进来
  3. 所有任务都进入队列后，等待最后的任务完成

可视化（limit=2）：
  时间 →
  slot1: [task1......完成] → [task3...完成] → [task5...]
  slot2: [task2...完成]    → [task4......完成]
```

**关键点**：
- 用递归"自补位"：任务完成后，同一个槽位立刻认领下一个任务
- 保持原始顺序：用 `results[index]` 按索引存结果，而非 push

### 方案二：`Promise.race` 控制池

维护一个运行中任务的 Set，每次 `await Promise.race(running)` 等待最快完成的任务释放槽位，再填入下一个。

---

## 完整实现

### 实现一：递归自补位（推荐）

```typescript
async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let currentIndex = 0; // 下一个待执行任务的索引

  // 每个"worker"代表一个并发槽位，不断认领任务直到队列为空
  async function worker() {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;  // 原子性地认领当前索引
      try {
        const value = await tasks[index]();
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  // 启动 limit 个 worker，并发运行
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
```

### 实现二：Promise.race 控制池（另一种常见写法）

```typescript
async function limitConcurrency2<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const running = new Set<Promise<void>>();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const index = i;

    // 将任务包装，完成后从 running 中移除自身
    const p: Promise<void> = task().then(
      result => {
        results[index] = result;
        running.delete(p);
      },
      err => {
        running.delete(p);
        throw err; // 如需 allSettled 语义，这里改为存 rejected 结果
      }
    );

    running.add(p);

    // 池满时，等待最快完成的任务腾出位置
    if (running.size >= limit) {
      await Promise.race(running);
    }
  }

  // 等待剩余任务
  await Promise.all(running);
  return results;
}
```

### 实现三：通用并发限制器（可复用版）

```typescript
class ConcurrencyLimit {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    // 如果并发已满，进入等待队列
    if (this.running >= this.limit) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      // 唤醒队列中等待的下一个任务
      this.queue.shift()?.();
    }
  }
}

// 使用方式
const limiter = new ConcurrencyLimit(3);
const results = await Promise.all(
  tasks.map(task => limiter.run(task))
);
```

---

## 测试用例

```typescript
// 模拟耗时任务
function delay(ms: number, id: number): () => Promise<string> {
  return () =>
    new Promise(resolve => setTimeout(() => resolve(`task-${id}`), ms));
}

// 测试 1：基础并发限制
async function test1() {
  const startTimes: number[] = [];
  const endTimes: number[] = [];

  const tasks = [100, 200, 150, 80, 120].map((ms, i) => {
    return () => {
      startTimes[i] = Date.now();
      return delay(ms, i)().then(result => {
        endTimes[i] = Date.now();
        return result;
      });
    };
  });

  const start = Date.now();
  const results = await limitConcurrency(tasks, 2);
  const total = Date.now() - start;

  console.log('results:', results.map(r => r.status === 'fulfilled' ? r.value : r.reason));
  // 预期：['task-0', 'task-1', 'task-2', 'task-3', 'task-4']（顺序保持）
  console.log(`total time: ${total}ms`);
  // limit=2, 最优路径约 300ms（slot1: 100+150=250, slot2: 200+80+120=400 → 约400ms）
}

// 测试 2：错误处理
async function test2() {
  const tasks = [
    () => Promise.resolve('ok-1'),
    () => Promise.reject(new Error('fail!')),
    () => Promise.resolve('ok-3'),
  ];

  const results = await limitConcurrency(tasks, 2);
  console.log(results);
  // [
  //   { status: 'fulfilled', value: 'ok-1' },
  //   { status: 'rejected', reason: Error('fail!') },
  //   { status: 'fulfilled', value: 'ok-3' },
  // ]
}

// 测试 3：limit 大于任务数
async function test3() {
  const tasks = [1, 2, 3].map(i => () => Promise.resolve(i));
  const results = await limitConcurrency(tasks, 10); // limit > tasks.length
  console.log(results.map(r => r.status === 'fulfilled' && r.value));
  // [1, 2, 3]
}

test1();
test2();
test3();
```

---

## 追问与扩展

### Q1：如果要求失败立即中止所有任务怎么改？

```typescript
// 用 AbortController 实现可取消版本
async function limitConcurrencyWithAbort<T>(
  tasks: ((signal: AbortSignal) => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const controller = new AbortController();
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length && !controller.signal.aborted) {
      const index = currentIndex++;
      results[index] = await tasks[index](controller.signal);
    }
  }

  try {
    const workers = Array.from(
      { length: Math.min(limit, tasks.length) },
      () => worker()
    );
    await Promise.all(workers);
    return results;
  } catch (err) {
    controller.abort(); // 任意 worker 失败，取消其他
    throw err;
  }
}
```

### Q2：如何限制速率（rate limiting）？

不同于并发限制（控制同时进行的数量），速率限制控制单位时间内的请求数：

```typescript
// 令牌桶：每 interval ms 补充一个令牌
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private maxTokens: number, private interval: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + (elapsed / this.interval) * this.maxTokens);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // 等待令牌补充
    await new Promise(resolve => setTimeout(resolve, this.interval));
    return this.acquire();
  }
}
```

### Q3：p-limit 库的核心实现原理？

[p-limit](https://github.com/sindresorhus/p-limit) 本质上就是"方案三"的精简版 —— 维护运行中任务计数 + 等待队列，用 `queue.shift()()` 唤醒下一个任务。生产环境推荐直接使用。

### Q4：Node.js 环境下如何限制文件 IO 并发？

```typescript
import pLimit from 'p-limit';
import { readFile } from 'fs/promises';

const limit = pLimit(5); // 最多同时读 5 个文件

const files = ['a.txt', 'b.txt', /* ... */ 'z.txt'];
const contents = await Promise.all(
  files.map(f => limit(() => readFile(f, 'utf8')))
);
```
