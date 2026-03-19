# 防抖节流与 Promise 手写实现

> 前端面试必考手写题，深入理解防抖节流的原理差异，掌握 Promise 的核心实现机制。

## 面试高频考点

1. **防抖（debounce）和节流（throttle）的区别？**
2. **手写一个 Promise.all、Promise.race？**
3. **实现一个支持 cancel 的防抖函数？**
4. **手写 Promise 的 then、catch、finally？**
5. **如何实现 Promise.allSettled？**

---

## 一、防抖（Debounce）

### 1.1 原理

防抖：在事件触发后**等待一段时间**，如果在这段时间内再次触发，则**重新计时**。只有等待期间没有新触发，才执行函数。

**应用场景**：
- 搜索框输入（减少请求次数）
- 窗口 resize（避免频繁计算）
- 表单验证（用户输入完成后再验证）

```
时间轴：━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
触发：   ↑    ↑      ↑        ↑
执行：                        ●
         └─等待─┘
              └──重新等待──┘
                    └──重新等待──┘
                              └──执行
```

### 1.2 基础实现

```javascript
function debounce(fn, delay) {
  let timer = null;
  
  return function(...args) {
    // 清除之前的定时器
    if (timer) clearTimeout(timer);
    
    // 设置新的定时器
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

// 使用示例
const handleSearch = debounce((query) => {
  console.log('搜索:', query);
  // 发送请求
}, 500);

input.addEventListener('input', (e) => {
  handleSearch(e.target.value);
});
```

### 1.3 立即执行版本

```javascript
function debounce(fn, delay, immediate = false) {
  let timer = null;
  
  return function(...args) {
    const callNow = immediate && !timer;
    
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) {
        fn.apply(this, args);
      }
    }, delay);
    
    if (callNow) {
      fn.apply(this, args);
    }
  };
}

// immediate = true：首次触发立即执行，后续防抖
// immediate = false：基础防抖，延迟执行
```

### 1.4 支持取消的版本

```javascript
function debounce(fn, delay, immediate = false) {
  let timer = null;
  
  const debounced = function(...args) {
    const callNow = immediate && !timer;
    
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) {
        fn.apply(this, args);
      }
    }, delay);
    
    if (callNow) {
      fn.apply(this, args);
    }
  };
  
  // 添加取消方法
  debounced.cancel = function() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  
  return debounced;
}

// 使用示例
const debouncedSearch = debounce(search, 500);

// 组件卸载时取消
componentWillUnmount() {
  debouncedSearch.cancel();
}
```

---

## 二、节流（Throttle）

### 2.1 原理

节流：在**固定时间间隔内**，无论触发多少次，只执行**一次**函数。

**应用场景**：
- 滚动加载更多（控制请求频率）
- 鼠标移动（控制绘制频率）
- 游戏技能冷却（防止连点）

```
时间轴：━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
触发：   ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑
执行：   ●        ●        ●        ●
         └─间隔─┘└─间隔─┘└─间隔─┘
```

### 2.2 定时器版本

```javascript
function throttle(fn, interval) {
  let timer = null;
  
  return function(...args) {
    if (!timer) {
      fn.apply(this, args);
      
      timer = setTimeout(() => {
        timer = null;
      }, interval);
    }
  };
}

// 特点：第一次立即执行，之后按间隔执行
```

### 2.3 时间戳版本

```javascript
function throttle(fn, interval) {
  let lastTime = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// 特点：按时间间隔执行，可能第一次不会立即执行
```

### 2.4 双保险版本（首次立即 + 最后一次）

```javascript
function throttle(fn, interval) {
  let lastTime = 0;
  let timer = null;
  
  return function(...args) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);
    
    if (remaining <= 0) {
      // 超过间隔，立即执行
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      // 在间隔内，设置延迟执行最后一次
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// 特点：
// 1. 首次立即执行
// 2. 间隔内多次触发，只执行第一次和最后一次
```

---

## 三、防抖 vs 节流对比

| 特性 | 防抖 (Debounce) | 节流 (Throttle) |
|------|-----------------|-----------------|
| **执行时机** | 停止触发后执行 | 按固定间隔执行 |
| **执行次数** | 触发多次只执行最后一次 | 固定间隔内只执行一次 |
| **典型应用** | 搜索框、表单验证 | 滚动加载、鼠标移动 |
| **类比** | 电梯关门（最后一人进入后延迟关门） | 水龙头滴水（固定频率） |

```javascript
// 记忆口诀
// 防抖：停止后才执行（delay 后执行）
// 节流：固定频率执行（interval 间隔执行）
```

---

## 四、Promise 手写实现

### 4.1 Promise 基础结构

```javascript
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
    
    const resolve = (value) => {
      if (this.state === PENDING) {
        this.state = FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach(fn => fn());
      }
    };
    
    const reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach(fn => fn());
      }
    };
    
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  
  then(onFulfilled, onRejected) {
    // 实现见下文
  }
}
```

### 4.2 then 方法实现

```javascript
then(onFulfilled, onRejected) {
  // 参数默认值
  onFulfilled = typeof onFulfilled === 'function' 
    ? onFulfilled 
    : value => value;
  onRejected = typeof onRejected === 'function'
    ? onRejected
    : reason => { throw reason };
  
  const promise2 = new MyPromise((resolve, reject) => {
    const handleFulfilled = () => {
      setTimeout(() => {
        try {
          const x = onFulfilled(this.value);
          resolvePromise(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };
    
    const handleRejected = () => {
      setTimeout(() => {
        try {
          const x = onRejected(this.reason);
          resolvePromise(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };
    
    if (this.state === FULFILLED) {
      handleFulfilled();
    } else if (this.state === REJECTED) {
      handleRejected();
    } else {
      this.onFulfilledCallbacks.push(handleFulfilled);
      this.onRejectedCallbacks.push(handleRejected);
    }
  });
  
  return promise2;
}

// 处理 then 返回值的函数
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected'));
  }
  
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false;
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(x, 
          y => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch (error) {
      if (called) return;
      called = true;
      reject(error);
    }
  } else {
    resolve(x);
  }
}
```

### 4.3 catch 和 finally 实现

```javascript
catch(onRejected) {
  return this.then(null, onRejected);
}

finally(onFinally) {
  return this.then(
    value => MyPromise.resolve(onFinally()).then(() => value),
    reason => MyPromise.resolve(onFinally()).then(() => { throw reason })
  );
}
```

### 4.4 静态方法实现

```javascript
// Promise.resolve
static resolve(value) {
  if (value instanceof MyPromise) {
    return value;
  }
  return new MyPromise(resolve => resolve(value));
}

// Promise.reject
static reject(reason) {
  return new MyPromise((_, reject) => reject(reason));
}

// Promise.all
static all(promises) {
  return new MyPromise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }
    
    const results = [];
    let completedCount = 0;
    
    if (promises.length === 0) {
      return resolve(results);
    }
    
    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(
        value => {
          results[index] = value;
          completedCount++;
          if (completedCount === promises.length) {
            resolve(results);
          }
        },
        reason => reject(reason)
      );
    });
  });
}

// Promise.race
static race(promises) {
  return new MyPromise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }
    
    promises.forEach(promise => {
      MyPromise.resolve(promise).then(resolve, reject);
    });
  });
}

// Promise.allSettled
static allSettled(promises) {
  return new MyPromise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be an array'));
    }
    
    const results = [];
    let completedCount = 0;
    
    if (promises.length === 0) {
      return resolve(results);
    }
    
    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(
        value => {
          results[index] = { status: 'fulfilled', value };
          completedCount++;
          if (completedCount === promises.length) {
            resolve(results);
          }
        },
        reason => {
          results[index] = { status: 'rejected', reason };
          completedCount++;
          if (completedCount === promises.length) {
            resolve(results);
          }
        }
      );
    });
  });
}
```

---

## 五、Promise 使用技巧

### 5.1 串行执行 Promise

```javascript
// 串行执行多个 Promise
async function runSerial(promises) {
  const results = [];
  for (const promise of promises) {
    results.push(await promise());
  }
  return results;
}

// 使用 reduce 实现
function runSerial(promises) {
  return promises.reduce(
    (acc, promise) => acc.then(results => 
      promise().then(result => [...results, result])
    ),
    Promise.resolve([])
  );
}
```

### 5.2 限制并发数

```javascript
// 限制同时执行的 Promise 数量
async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = [];
  
  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task());
    results.push(promise);
    
    if (tasks.length >= limit) {
      const e = promise.then(() => 
        executing.splice(executing.indexOf(e), 1)
      );
      executing.push(e);
      
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  
  return Promise.all(results);
}
```

### 5.3 超时封装

```javascript
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
  
  return Promise.race([promise, timeout]);
}

// 使用
withTimeout(fetch('/api/data'), 5000)
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

---

## 六、总结

### 防抖节流速查表

```javascript
// 防抖：停止触发后才执行
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// 节流：固定频率执行
const throttle = (fn, interval) => {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn(...args);
    }
  };
};
```

### Promise 核心要点

1. **三种状态**：pending → fulfilled/rejected（不可逆）
2. **then 链式调用**：返回新的 Promise
3. **值穿透**：then 不传参数会透传值
4. **微任务**：Promise 回调是微任务，优先级高于宏任务

---

## 参考资源

- [JavaScript 高级程序设计](https://book.douban.com/subject/35175321/)
- [Promise A+ 规范](https://promisesaplus.com/)
- [lodash debounce 源码](https://github.com/lodash/lodash/blob/master/debounce.js)
- [lodash throttle 源码](https://github.com/lodash/lodash/blob/master/throttle.js)
