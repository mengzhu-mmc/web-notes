# async/await 实现原理

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
