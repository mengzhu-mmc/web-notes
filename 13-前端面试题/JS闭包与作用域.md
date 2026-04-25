# JS 闭包与作用域

> 面试频率：⭐⭐⭐⭐⭐ | 难度：中 | 最后更新：2026-03-31

## 相关笔记

- [闭包深入理解（知识笔记版）](../02-JavaScript/函数与作用域/闭包深入理解.md) — 完整原理、表现形式、内存泄漏处理

---

## 什么是闭包

**技术定义：** 闭包是指函数能够记住并访问其词法作用域（Lexical Scope），即使该函数在其词法作用域之外执行。

**通俗解释：** 函数"记住了"自己被定义时所处的环境变量。就算那个环境已经执行完了，函数依然能访问那些变量。

```js
function makeCounter() {
  let count = 0; // 这个变量被"记住"了
  return function () {
    count++;
    return count;
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
counter(); // 3
// makeCounter 执行完了，但 count 还活着
```

---

## 作用域类型

- **全局作用域**：整个脚本可访问
- **函数作用域**：`var` 声明，函数内有效
- **块级作用域**：`let` / `const`，`{}` 内有效（ES6+）

```js
var a = 1;    // 全局
function foo() {
  var b = 2;  // 函数作用域
  if (true) {
    let c = 3;  // 块级作用域
    console.log(a, b, c); // 1 2 3
  }
  // console.log(c); // ReferenceError
}
```

---

## 经典面试题：循环里的闭包陷阱

### 问题代码

```js
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i); // 输出 3 3 3，不是 0 1 2
  }, 100);
}
```

**原因：** `var` 没有块级作用域，所有回调共享同一个 `i`，等到 setTimeout 执行时 `i` 已经是 3。

### 解法 1：用 `let`（推荐）

```js
for (let i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i); // 0 1 2 ✅
  }, 100);
}
// let 每次迭代创建新的块级绑定
```

### 解法 2：IIFE（立即执行函数）

```js
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(function () {
      console.log(j); // 0 1 2 ✅
    }, 100);
  })(i);
}
// 每次迭代通过参数 j 捕获当前值
```

### 解法 3：bind

```js
function log(i) {
  console.log(i);
}
for (var i = 0; i < 3; i++) {
  setTimeout(log.bind(null, i), 100); // 0 1 2 ✅
}
```

---

## 闭包的实际应用

```js
// 1. 数据私有化（模块模式）
function createPerson(name) {
  let _age = 0; // 私有变量
  return {
    getName: () => name,
    getAge: () => _age,
    birthday: () => _age++,
  };
}

// 2. 函数柯里化
function multiply(x) {
  return (y) => x * y;
}
const double = multiply(2);
double(5); // 10

// 3. once 函数（只执行一次）
function once(fn) {
  let called = false;
  return function (...args) {
    if (!called) {
      called = true;
      return fn.apply(this, args);
    }
  };
}
```

---

## 内存泄漏风险

闭包会持有外部变量的引用，如果使用不当会造成内存泄漏：

```js
// ❌ 危险：DOM 引用 + 闭包 = 内存泄漏
function bindEvent() {
  const el = document.getElementById('btn'); // 大 DOM 对象
  el.addEventListener('click', function () {
    console.log(el.id); // 闭包持有 el 引用
  });
}

// ✅ 修复：只保存需要的值
function bindEvent() {
  const el = document.getElementById('btn');
  const id = el.id; // 只保留 id 字符串
  el.addEventListener('click', function () {
    console.log(id);
  });
  // 如果 el 不再需要，可以手动置 null
}
```

**最佳实践：**
- 不需要的闭包变量及时置 `null`
- 事件监听器在不用时 `removeEventListener`
- 避免在循环中创建大量闭包

---

## 面试考点

### 常见问法

1. "什么是闭包？能举个例子吗？"
2. "以下代码输出什么？为什么？"（循环 + setTimeout）
3. "闭包有什么缺点？"
4. "如何用闭包实现私有变量？"

### 答题要点

- **定义要精准**：函数 + 词法环境的组合，能访问外部函数的变量
- **循环陷阱必背**：`var` 共享引用 → 用 `let` / IIFE / bind 解决
- **内存泄漏**：闭包会延长变量生命周期，注意 DOM 引用
- **应用场景**：模块模式、防抖/节流、柯里化、once

---

`#javascript` `#closure` `#scope` `#interview` `#frontend`
