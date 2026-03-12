# 手写 Promise.all

## 核心实现

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
          results[index] = value;
          count++;
          if (count === len) resolve(results);
        },
        reason => reject(reason)
      );
    });
  });
};
```

## 关键细节

### 为什么用 Promise.resolve(promise) 而不是 promise.then()

`Promise.resolve()` 可以统一处理同步值和 Promise。如果直接调用 `promise.then()`，当 `promise` 是普通值（如数字 `2`）时会报错 `TypeError: promise.then is not a function`。`Promise.resolve(2)` 会将同步值包装成 resolved 的 Promise，保证后续能用 `.then()` 处理。

### 为什么必须用 count 计数器而不是 results.length

JavaScript 数组的稀疏性会导致 bug。当使用 `results[index] = value` 赋值时，如果第 3 个 Promise 先完成（`results[2] = 'c'`），此时 `results.length` 已经是 3（等于 `promises.length`），但前两个 Promise 还没完成，数组实际是 `[empty × 2, 'c']`。

```javascript
const arr = [];
arr[2] = 'c';
console.log(arr.length); // 3，但实际只有 1 个元素
```

`count` 计数器每完成一个才 +1，能准确表示完成数量。
