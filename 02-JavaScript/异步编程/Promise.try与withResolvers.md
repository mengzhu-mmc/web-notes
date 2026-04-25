# Promise 新增静态方法：try() 和 withResolvers()

> 来源：[张鑫旭博客 JS 分类](https://www.zhangxinxu.com/wordpress/category/js/) | 日期：2026-03

## 核心内容

Promise 新增两个静态方法，解决实际开发中的高频痛点：
- `Promise.try(fn)`：统一包装同步/异步函数
- `Promise.withResolvers()`：在 Promise 外部控制 resolve/reject

---

## 1. Promise.try()

### 解决什么问题？

当某个函数可能同步也可能异步返回时，统一包装为 Promise 的写法很繁琐：

```javascript
// ❌ 直接 resolve(fn()) — 同步错误不会走 .catch()
function run(fn) {
  return new Promise(resolve => resolve(fn())); 
  // 如果 fn() 同步抛错，不会被 Promise catch！
}

// ❌ 绕一个 then — 正确但绕
function run(fn) {
  return Promise.resolve().then(() => fn());
}
```

### 使用 Promise.try()

```javascript
// ✅ 简洁正确
function run(fn) {
  return Promise.try(fn);
  // 同步错误 → rejected promise
  // 同步返回值 → resolved promise  
  // 返回 Promise → 透传
}

// 实际使用
Promise.try(() => {
  const data = JSON.parse(userInput); // 可能同步抛错
  return fetchData(data); // 可能返回 Promise
})
.then(result => console.log(result))
.catch(err => console.error('统一处理所有错误:', err));
```

### 面试考点

- 同步异常在 Promise 链中的传播机制
- `new Promise(resolve => resolve(fn()))` 的陷阱（同步错误逃脱了 reject）
- `Promise.try` vs `Promise.resolve().then()` 的语义区别

---

## 2. Promise.withResolvers()

### 解决什么问题？

有时需要在 Promise 外部（如事件回调中）控制 resolve/reject：

```javascript
// 以前的写法（丑陋的 resolve 外漏）
let resolve, reject;
const promise = new Promise((res, rej) => {
  resolve = res;  // 外漏
  reject = rej;
});

// 某个事件回调中
eventEmitter.on('done', () => resolve(result));
```

### 使用 Promise.withResolvers()

```javascript
// ✅ 更语义化
const { promise, resolve, reject } = Promise.withResolvers();

// 在任意地方调用
setTimeout(() => resolve('done'), 1000);
eventEmitter.on('error', (err) => reject(err));

// 使用 promise
await promise;
```

### 实际使用场景

```javascript
// 将 callback 风格 API 转为 Promise（更简洁版）
function imageLoaded(src) {
  const { promise, resolve, reject } = Promise.withResolvers();
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
  return promise;
}

// 可取消的 Promise（结合 AbortController）
function createCancellable() {
  const { promise, resolve, reject } = Promise.withResolvers();
  return {
    promise,
    cancel: () => reject(new Error('cancelled')),
    done: resolve
  };
}
```

## 面试相关

- 解释 `Promise.try` 的设计动机（同步/异步统一错误处理）
- `Promise.withResolvers()` 与 `new Promise(...)` 的区别（结构 vs 闭包）
- 延迟 Promise（Deferred Pattern）是什么？`withResolvers` 是其官方实现
- 浏览器/Node.js 版本支持情况

## 相关笔记

- [[02-JavaScript/Promise基础]]
- [[02-JavaScript/异步编程模式]]
