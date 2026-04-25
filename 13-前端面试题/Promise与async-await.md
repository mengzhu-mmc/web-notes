# Promise & async/await

> 面试频率：⭐⭐⭐⭐⭐ | 难度：高 | 最后更新：2026-03-31

---

## Promise 状态机

Promise 有三种状态，且**不可逆**：

```
pending（等待）→ fulfilled（成功）
             → rejected（失败）
```

```js
const p = new Promise((resolve, reject) => {
  // resolve(value)  → fulfilled
  // reject(reason)  → rejected
  // 抛出异常        → rejected
});

p.then(
  (value) => { /* fulfilled */ },
  (reason) => { /* rejected */ }
);
// .catch(fn) 等价于 .then(null, fn)
// .finally(fn) 无论成功/失败都执行，不接收参数
```

### 链式调用

```js
fetch('/api/user')
  .then((res) => res.json())         // 返回新 Promise
  .then((data) => data.name)         // 继续链式
  .then((name) => console.log(name))
  .catch((err) => console.error(err)) // 捕获任意前面的错误
  .finally(() => console.log('done'));
```

**链式调用关键：** 每个 `.then` 返回新 Promise，上一个的返回值作为下一个的 `value`。

---

## 手写 Promise.all

```js
// 全部成功才 resolve，任一失败立即 reject
Promise.myAll = function (promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([]);
    const results = [];
    let count = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then((val) => {
        results[i] = val;
        count++;
        if (count === promises.length) resolve(results);
      }, reject); // 任一失败直接 reject
    });
  });
};

// 使用
Promise.myAll([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3]
```

## 手写 Promise.race

```js
// 返回第一个完成（resolve 或 reject）的结果
Promise.myRace = function (promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((p) => {
      Promise.resolve(p).then(resolve, reject);
    });
  });
};
```

## 手写 Promise.allSettled

```js
// 等所有 Promise 完成，无论成功失败，返回状态数组
Promise.myAllSettled = function (promises) {
  return Promise.myAll(
    promises.map((p) =>
      Promise.resolve(p).then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason })
      )
    )
  );
};

// 使用
Promise.myAllSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3),
]).then(console.log);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'error' },
//   { status: 'fulfilled', value: 3 }
// ]
```

---

## async/await 原理

**本质：Generator + 自动执行器（co 库思想）**

```js
// async/await 可以等价转换为 Generator
async function fetchUser() {
  const res = await fetch('/api/user');
  const data = await res.json();
  return data;
}

// 等价的 Generator 写法
function* fetchUserGen() {
  const res = yield fetch('/api/user');
  const data = yield res.json();
  return data;
}

// 自动执行器（简化版）
function run(genFn) {
  return new Promise((resolve, reject) => {
    const gen = genFn();
    function step(nextFn) {
      let next;
      try {
        next = nextFn();
      } catch (e) {
        return reject(e);
      }
      if (next.done) return resolve(next.value);
      Promise.resolve(next.value).then(
        (val) => step(() => gen.next(val)),
        (err) => step(() => gen.throw(err))
      );
    }
    step(() => gen.next());
  });
}
```

---

## 常见陷阱

### 1. 错误捕获

```js
// ❌ 错误：没有捕获 async 函数内的错误
async function bad() {
  const data = await fetch('/api'); // 失败时会 unhandledRejection
}

// ✅ 方案1：try/catch
async function good1() {
  try {
    const data = await fetch('/api');
  } catch (err) {
    console.error(err);
  }
}

// ✅ 方案2：.catch() 包装
async function good2() {
  const data = await fetch('/api').catch((err) => {
    console.error(err);
    return null; // 返回默认值
  });
  if (!data) return;
}
```

### 2. 并发控制（串行 vs 并行）

```js
// ❌ 串行（慢）：总耗时 = t1 + t2
async function serial() {
  const a = await fetchA(); // 等 A 完成
  const b = await fetchB(); // 再等 B
  return [a, b];
}

// ✅ 并行（快）：总耗时 = max(t1, t2)
async function parallel() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  return [a, b];
}

// ✅ 并行启动，分别 await
async function parallel2() {
  const promiseA = fetchA(); // 立即启动
  const promiseB = fetchB(); // 立即启动
  const a = await promiseA;  // 等结果
  const b = await promiseB;
  return [a, b];
}
```

### 3. forEach 里用 async（陷阱）

```js
// ❌ forEach 不等待 async 回调
async function wrong() {
  const ids = [1, 2, 3];
  ids.forEach(async (id) => {
    await fetchUser(id); // 这些并发了，但 forEach 不知道
  });
  console.log('done'); // 立即打印，不等 fetch
}

// ✅ 用 for...of 顺序执行
async function sequential() {
  for (const id of [1, 2, 3]) {
    await fetchUser(id);
  }
  console.log('done'); // 真正等待
}

// ✅ 用 Promise.all 并发执行
async function concurrent() {
  await Promise.all([1, 2, 3].map((id) => fetchUser(id)));
  console.log('done');
}
```

---

## 面试考点

### 常见问法

1. "Promise 有哪几种状态？能转换吗？"
2. "手写 Promise.all"
3. "async/await 和 Promise 有什么关系？"
4. "await 后面如果是非 Promise 值会怎样？"
5. "如何让多个请求并发执行？"

### 答题要点

- **Promise 状态**：pending/fulfilled/rejected，只能从 pending 转换，且不可逆
- **await 本质**：`await` 会暂停函数执行，等待 Promise resolve，等价于 `.then`
- **await 非 Promise**：会被 `Promise.resolve()` 包装，立即 resolve
- **并发**：用 `Promise.all` 而非多个串行 `await`
- **错误处理**：async 函数内部必须用 try/catch 或 .catch()，否则错误会变成 unhandledRejection
- **Promise.all vs allSettled**：all 有一个失败就全失败；allSettled 等全部完成返回所有状态

---

`#javascript` `#promise` `#async-await` `#interview` `#frontend`
