# Promise 实现原理

## 相关笔记

- [异步编程与 EventLoop](../异步编程与EventLoop.md) — Promise 链式调用、静态方法、并发控制
- [async/await 实现原理](./async-await实现原理.md) — Promise + Generator 语法糖原理

## 面试高频考点

- Promise 的三种状态及转换规则？
- 手写一个简易版 Promise？
- `.catch()` 回调执行后为什么是 resolve 而不是 reject？
- Promise/A+ 规范的核心要点？

---

## 一、核心概念

Promise 有三种状态：`pending`（等待）、`fulfilled`（成功）、`rejected`（失败）。状态一旦改变就不可逆，只能从 pending 变为 fulfilled 或 rejected。

## 二、手写 SimplePromise

```js
class SimplePromise {
  constructor(executor) {
    this.status = 'pending';
    this.value = undefined;
    this.reason = undefined;
    this.fulfilledCallbacks = [];
    this.rejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status === 'pending') {
        this.status = 'fulfilled';
        this.value = value;
        this.fulfilledCallbacks.forEach((fn) => fn());
      }
    };

    const reject = (reason) => {
      if (this.status === 'pending') {
        this.status = 'rejected';
        this.reason = reason;
        this.rejectedCallbacks.forEach((fn) => fn());
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    // 值穿透处理
    onFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason;
          };

    return new SimplePromise((resolve, reject) => {
      const handleFulfilled = () => {
        try {
          const res = onFulfilled(this.value);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };

      const handleRejected = () => {
        try {
          const res = onRejected(this.reason);
          resolve(res); // 注意：这里是 resolve，不是 reject
        } catch (err) {
          reject(err);
        }
      };

      if (this.status === 'fulfilled') {
        setTimeout(handleFulfilled, 0);
      } else if (this.status === 'rejected') {
        setTimeout(handleRejected, 0);
      } else {
        this.fulfilledCallbacks.push(() => setTimeout(handleFulfilled, 0));
        this.rejectedCallbacks.push(() => setTimeout(handleRejected, 0));
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }
}
```

## 三、关键设计：rejected 回调后为什么 resolve？

这是 Promise 最精妙的设计之一。`.catch()` 或 `onRejected` 的目的是**处理错误并恢复**，而不是继续传递错误。

```js
// 错误被处理后恢复正常
Promise.reject('出错了')
  .catch((err) => {
    console.log('处理错误:', err);
    return '已恢复'; // 返回正常值
  })
  .then((value) => {
    console.log('继续执行:', value); // ✅ 会执行："已恢复"
  });
```

### 决策规则

```
执行 onRejected
      ↓
  有异常吗？
    ↙   ↘
  是      否
  ↓       ↓
reject   正常返回值
         ↓
      resolve ✅（错误已处理）
```

| 场景 | 代码 | 新 Promise 状态 |
| --- | --- | --- |
| catch 返回值 | `return 'ok'` | ✅ fulfilled |
| catch 不返回 | `console.log()` | ✅ fulfilled (undefined) |
| catch 抛错误 | `throw err` | ❌ rejected |
| catch 返回 rejected Promise | `return Promise.reject()` | ❌ rejected |

## 四、Promise/A+ 规范核心

> 2.2.7.1 无论是 onFulfilled 还是 onRejected，只要**返回值**，新 Promise 就 resolve。
> 2.2.7.2 只有**抛出异常**，新 Promise 才 reject。

## 五、实际应用场景

```js
// API 重试
function fetchData(url) {
  return fetch(url)
    .catch((err) => {
      console.log('第一次失败，重试...');
      return fetch(url);
    })
    .catch((err) => {
      console.log('第二次也失败，使用默认数据');
      return { default: true }; // 恢复正常
    })
    .then((data) => {
      console.log('最终数据:', data); // ✅ 会执行
    });
}
```

简记规则：

```js
.catch(err => {
  return value;  // → resolve(value) ✅ 恢复
  throw error;   // → reject(error) ❌ 继续错误
})
```
