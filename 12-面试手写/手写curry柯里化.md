# 手写柯里化（curry）

> 函数式编程经典题，考察对函数参数和闭包的掌握。

---

## 什么是柯里化

将一个多参数函数转换为一系列单参数函数的过程。

```js
// 原函数
add(1, 2, 3) // 6

// 柯里化后
curriedAdd(1)(2)(3) // 6
curriedAdd(1, 2)(3) // 6
curriedAdd(1)(2, 3) // 6
```

---

## 实现

```js
function curry(fn) {
  return function curried(...args) {
    // 收集的参数数量 >= 原函数期望的参数数量时，直接调用
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // 否则返回一个函数，继续收集参数
    return function (...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}
```

---

## 测试用例

```js
function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);

curriedAdd(1)(2)(3)   // 6
curriedAdd(1, 2)(3)   // 6
curriedAdd(1)(2, 3)   // 6
curriedAdd(1, 2, 3)   // 6

// 复用中间态
const add1 = curriedAdd(1);
const add1and2 = add1(2);
add1and2(3) // 6
add1and2(10) // 13
```

---

## 偏函数（partial application）vs 柯里化

```js
// 偏函数：固定部分参数，返回接受剩余参数的函数（一次固定，不必一个一个来）
function partial(fn, ...preArgs) {
  return function (...laterArgs) {
    return fn(...preArgs, ...laterArgs);
  };
}

const add5 = partial(add, 2, 3);
add5(10) // 15
```

| 概念 | 区别 |
|------|------|
| 柯里化 | 每次只接收一个参数（或积累直到满足 fn.length） |
| 偏函数 | 预先固定若干参数，一次返回接受剩余参数的函数 |

---

## 面试追问

| 问题 | 答案要点 |
|------|---------|
| 柯里化的应用场景？ | 参数复用、延迟计算、函数组合（compose/pipe） |
| `fn.length` 获取什么？ | 函数形参个数（不含默认参数和剩余参数） |
| 如何处理有默认参数的函数？ | `fn.length` 不计默认参数，需要手动传入期望的 arity |
| 无限柯里化怎么实现？ | 重写 `valueOf`/`toString`，每次调用都返回函数自身 |

### 无限柯里化（了解）

```js
function infiniteCurry(fn) {
  let args = [];
  const inner = (...newArgs) => {
    args = args.concat(newArgs);
    return inner;
  };
  inner.valueOf = () => fn(...args);
  inner.toString = () => String(fn(...args));
  return inner;
}

const add = (...args) => args.reduce((a, b) => a + b, 0);
const f = infiniteCurry(add);
+f(1)(2)(3)(4) // 10（通过 valueOf 触发计算）
```
