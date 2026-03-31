# async/await 实现原理

## 相关笔记

- [异步编程与 EventLoop](../异步编程与EventLoop.md) — 宏任务微任务、async/await 执行顺序
- [Promise 实现原理](./Promise实现原理.md) — 手写 SimplePromise

## 面试高频考点

- async/await 的本质是什么？
- 如何手写一个 async/await？
- Generator 函数和 async 函数的关系？

---

## 一、核心原理

async/await 本质上是 **Generator 函数 + Promise** 的语法糖。

### 实现思路（3 个关键点）

**1. 状态机制 — Generator 的暂停与恢复**

利用 Generator 函数的 `yield` 关键字实现函数执行的暂停，通过 `generator.next()` 方法恢复执行。每次 `yield` 返回一个包含 `{value, done}` 的对象。

**2. 自动执行器 — 递归推进执行流程**

包装一个自动执行函数，不断调用 `next()` 方法。当 `done: false` 时继续执行，`done: true` 时结束。关键在于等待异步操作完成后，将结果传入下一次 `next(result)`。

**3. Promise 包装 — 处理异步结果**

将每个 `yield` 的值包装成 Promise。Promise resolve 后将结果传给下一次迭代，reject 时通过 `generator.throw()` 抛出错误。整个函数返回一个 Promise，支持链式调用。

## 二、手写实现

```js
function asyncToGenerator(generatorFunc) {
  return function () {
    const gen = generatorFunc.apply(this, arguments);

    return new Promise((resolve, reject) => {
      function step(key, arg) {
        let result;
        try {
          result = gen[key](arg);
        } catch (error) {
          return reject(error);
        }

        const { value, done } = result;

        if (done) {
          return resolve(value);
        } else {
          // 将 value 包装成 Promise，继续递归
          return Promise.resolve(value).then(
            (val) => step('next', val),
            (err) => step('throw', err)
          );
        }
      }

      step('next');
    });
  };
}
```

## 三、使用示例

```js
// Generator 版本
function* fetchData() {
  const data1 = yield fetch('/api/1');
  const data2 = yield fetch('/api/2');
  return data2;
}

// 转换为 async/await 等价形式
const asyncFetch = asyncToGenerator(fetchData);
asyncFetch().then((result) => console.log(result));

// 等价于原生写法
async function fetchData() {
  const data1 = await fetch('/api/1');
  const data2 = await fetch('/api/2');
  return data2;
}
```

## 四、执行流程

```
async function() {
  ↓
  Generator函数 + 自动执行器
  ↓
  yield 暂停 → 等待Promise → 获取结果 → next(结果) → 继续执行
  ↓
  最终返回Promise
}
```

本质：用同步的写法（Generator），配合自动化的执行器（递归 + Promise），实现异步操作的顺序执行。

---

## 五、Generator 函数原理

Generator 函数是 async/await 的底层基础，理解它是深入理解异步的关键。

### 基本概念

Generator 函数使用 `function*` 声明，执行后返回一个**迭代器对象**（不是立即执行函数体）。每次调用 `.next()` 执行到下一个 `yield` 暂停。

```js
function* gen() {
  console.log('start')
  const result1 = yield '第一个值'   // 暂停，返回 '第一个值'
  console.log('result1:', result1)    // 下次 next() 时恢复，result1 = 传入的参数
  const result2 = yield '第二个值'
  return '完成'
}

const g = gen()
console.log(g.next())        // start → { value: '第一个值', done: false }
console.log(g.next('hi'))    // result1: hi → { value: '第二个值', done: false }
console.log(g.next())        // { value: '完成', done: true }
console.log(g.next())        // { value: undefined, done: true }
```

### 核心机制：暂停 & 传值

| 操作 | 说明 |
|------|------|
| `yield expr` | 暂停执行，将 `expr` 作为 `{value, done}` 中的 `value` 返回 |
| `g.next(val)` | 恢复执行，`val` 成为上一个 `yield` 表达式的返回值 |
| `g.throw(err)` | 在 Generator 内部抛出错误，可被 try/catch 捕获 |
| `g.return(val)` | 强制终止，返回 `{value: val, done: true}` |

### Generator + Promise 配合

```js
function* fetchUser() {
  try {
    const user = yield fetch('/api/user').then(r => r.json())
    const posts = yield fetch(`/api/posts/${user.id}`).then(r => r.json())
    return posts
  } catch (err) {
    console.error('请求失败:', err)
  }
}
```

---

## 六、手写自动执行器（co 库核心）

著名的 `co` 库就是为 Generator 写的自动执行器。下面是简化版实现：

```js
function co(generatorFunc) {
  return new Promise((resolve, reject) => {
    const gen = generatorFunc()

    function handle(result) {
      // Generator 已完成
      if (result.done) return resolve(result.value)
      
      // 将 yield 的值包装成 Promise
      Promise.resolve(result.value).then(
        (val) => {
          try {
            // 将成功值传回 Generator，并继续执行
            handle(gen.next(val))
          } catch (e) {
            reject(e)
          }
        },
        (err) => {
          try {
            // 将错误注入 Generator，触发内部 catch
            handle(gen.throw(err))
          } catch (e) {
            reject(e)
          }
        }
      )
    }

    try {
      handle(gen.next()) // 启动 Generator
    } catch (e) {
      reject(e)
    }
  })
}

// 使用
co(fetchUser).then(posts => console.log(posts))
```

**与 `asyncToGenerator` 的区别**：`co` 接收 Generator 函数本身；`asyncToGenerator` 返回一个包装后的函数（更接近 Babel 对 async 函数的编译方式）。

---

## 七、错误处理陷阱

### 陷阱1：await 错误被静默吞掉

```js
// ❌ 危险：如果 fetchData 抛出，后续代码不执行，但错误被忽略
async function bad() {
  const data = await fetchData().catch(console.error) // 错误被 catch 消化
  data.name // 如果 fetchData 失败，data 是 undefined，这里会报错
}

// ✅ 正确：明确处理失败情况
async function good() {
  const data = await fetchData().catch(err => {
    console.error(err)
    return null // 明确的默认值
  })
  if (!data) return // 提前返回
  data.name // 安全
}
```

### 陷阱2：并发 await 写成串行

```js
// ❌ 串行执行：总耗时 = 请求A + 请求B（假设各 500ms，总计 1000ms）
async function serial() {
  const a = await fetchA() // 等 fetchA 完成
  const b = await fetchB() // 再等 fetchB
}

// ✅ 并发执行：总耗时 ≈ max(请求A, 请求B)（总计约 500ms）
async function parallel() {
  const [a, b] = await Promise.all([fetchA(), fetchB()])
}
```

### 陷阱3：循环中的 async/await

```js
const ids = [1, 2, 3]

// ❌ forEach 中 await 不生效（forEach 不等待异步）
ids.forEach(async (id) => {
  await fetchUser(id) // 实际上并发触发，且 forEach 不会等待
})

// ✅ 方案一：for...of 串行
for (const id of ids) {
  await fetchUser(id) // 真正的串行
}

// ✅ 方案二：Promise.all 并发
await Promise.all(ids.map(id => fetchUser(id)))
```

### 陷阱4：顶层 await 的注意事项

```js
// ESM 模块中可以直接使用顶层 await（Top-level await）
// 但它会阻塞模块的导入方！

// data.mjs
export const data = await fetch('/api/data').then(r => r.json())
// ⚠️ 任何 import data.mjs 的模块都要等这个 await 完成才能继续

// 建议：顶层 await 只用于初始化，避免耗时操作
```
