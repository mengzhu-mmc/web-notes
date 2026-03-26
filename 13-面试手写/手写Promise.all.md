# 手写 Promise 静态方法

> 面试高频：Promise.all / race / allSettled / any 手写

---

## 一、Promise.all — 全部成功才成功

```javascript
Promise.myAll = function(promises) {
  if (!Array.isArray(promises)) {
    return Promise.reject(new TypeError('参数必须是数组'));
  }

  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    const len = promises.length;

    if (len === 0) { resolve(results); return; }

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        value => {
          results[index] = value;  // 保持顺序
          count++;
          if (count === len) resolve(results);
        },
        reason => reject(reason)   // 任意一个失败立即 reject
      );
    });
  });
};

// 测试
Promise.myAll([
  Promise.resolve(1),
  Promise.resolve(2),
  3  // 普通值也支持
]).then(console.log); // [1, 2, 3]

Promise.myAll([
  Promise.resolve(1),
  Promise.reject('error')
]).catch(console.log); // 'error'
```

### 关键细节

**为什么用 `Promise.resolve(promise)` 而不是 `promise.then()`？**

`Promise.resolve()` 统一处理同步值和 Promise。直接调用 `promise.then()` 当传入普通值时会报 TypeError。

**为什么必须用 `count` 计数器而不是 `results.length`？**

数组的稀疏性：`results[2] = 'c'` 赋值后 `results.length` 已经是 3，但前两个还没完成。`count` 每完成一个才 +1，准确表示完成数量。

---

## 二、Promise.race — 谁先决议用谁

```javascript
Promise.myRace = function(promises) {
  if (!Array.isArray(promises)) {
    return Promise.reject(new TypeError('参数必须是数组'));
  }

  return new Promise((resolve, reject) => {
    promises.forEach(promise => {
      // 第一个决议（成功或失败）就决定结果，后续的 resolve/reject 无效
      Promise.resolve(promise).then(resolve, reject);
    });
  });
};

// 应用场景：超时控制
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`超时 ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}
```

---

## 三、Promise.allSettled — 全部决议（ES2020）

```javascript
Promise.myAllSettled = function(promises) {
  if (!Array.isArray(promises)) {
    return Promise.reject(new TypeError('参数必须是数组'));
  }

  return new Promise(resolve => {
    const results = [];
    let count = 0;
    const len = promises.length;

    if (len === 0) { resolve(results); return; }

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        value => {
          results[index] = { status: 'fulfilled', value };
          if (++count === len) resolve(results);
        },
        reason => {
          results[index] = { status: 'rejected', reason };
          if (++count === len) resolve(results);  // 注意：永远 resolve，不 reject
        }
      );
    });
  });
};

// 测试
Promise.myAllSettled([
  Promise.resolve(1),
  Promise.reject('err'),
  Promise.resolve(3)
]).then(console.log);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'err' },
//   { status: 'fulfilled', value: 3 }
// ]
```

**与 Promise.all 的区别**：allSettled 永远 resolve（返回每个 Promise 的状态和结果），适合批量操作"需要知道每个结果"的场景；all 只要有一个失败就立即 reject。

---

## 四、Promise.any — 谁先成功用谁（ES2021）

```javascript
Promise.myAny = function(promises) {
  if (!Array.isArray(promises)) {
    return Promise.reject(new TypeError('参数必须是数组'));
  }

  return new Promise((resolve, reject) => {
    const errors = [];
    let count = 0;
    const len = promises.length;

    if (len === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then(
        value => resolve(value),  // 任意成功就 resolve
        reason => {
          errors[index] = reason;
          if (++count === len) {
            // 全部失败才 reject，抛出 AggregateError
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
};
```

---

## 五、四种方法对比

| 方法 | 成功条件 | 失败条件 | 结果 |
|------|---------|---------|------|
| `Promise.all` | 全部成功 | 任意失败 | 成功值数组 / 第一个失败原因 |
| `Promise.race` | 最快决议（成功或失败） | 同左 | 最快的那个结果 |
| `Promise.allSettled` | 全部决议（永不失败） | — | 每个结果的 `{status, value/reason}` |
| `Promise.any` | 任意成功 | 全部失败 | 最快成功的值 / `AggregateError` |

### 选择指南

- 需要**全部成功才有意义**（如并行获取必要数据）→ `Promise.all`
- 需要**知道每个结果**（如批量操作，部分失败也 OK）→ `Promise.allSettled`
- 需要**最快的那个**（如多个备用接口，竞速）→ `Promise.race`
- 需要**任意成功**（如多 CDN 切换，哪个好用哪个）→ `Promise.any`
