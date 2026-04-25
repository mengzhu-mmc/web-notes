# JavaScript 一页速记

> 来源：[牛客网-面试题-JavaScript.md](../牛客网-面试题-JavaScript.md) | ~40 题浓缩

---

## 数据类型

- **8 种**：7 原始（`undefined/null/boolean/number/string/bigint/symbol`）+ 1 引用（`object`）
- **判断**：`typeof`（null 有 bug）→ `Object.prototype.toString.call()` 万能 → `Array.isArray()` 判数组
- `typeof null === 'object'` 是历史 Bug（底层 type tag 为 0）
- **原始类型**：栈中值拷贝；**引用类型**：堆中值 + 栈中指针（赋值是引用拷贝）
- `NaN` 是 number 类型，`Number.isNaN()` 才是正确检测（全局 `isNaN` 有误导）
- `0.1 + 0.2 !== 0.3`：IEEE 754 浮点精度，用 `Number.EPSILON` 或转整数运算

## `==` vs `===`

- `===` 不转类型，`==` 先转再比
- `null == undefined` → true；`[] == false` → true（`[]→''→0`，`false→0`）
- **推荐始终用 `===`**

## 原型链与继承

- `__proto__`（实例指向原型）≠ `prototype`（构造函数属性）
- 查找规则：自身 → `__proto__` → 原型的 `__proto__` → … → `null`
- **5 种继承**：原型链（共享引用问题）、借用构造函数（方法不复用）、组合（主流）、寄生组合（最优）、ES6 class
- `instanceof`：沿原型链查找，`A instanceof B` = `B.prototype` 是否在 A 的原型链上

## 闭包与作用域

- 闭包 = 函数 + 它引用的外部变量环境（能"记住"定义时的作用域）
- **用途**：数据私有化、函数工厂、防抖节流、模块化
- **内存泄漏**：闭包持有外部变量引用，不及时释放 → 定时器/事件监听器需注意
- `var`（函数作用域 + 提升）vs `let/const`（块级作用域 + TDZ）

## this 绑定

- **4 种规则**（优先级：new > call/apply/bind > 对象方法 > 默认）
- 箭头函数：没有自己的 this，继承外层词法作用域的 this
- `call/apply/bind`：`call(obj, a, b)` / `apply(obj, [a, b])` / `bind(obj)` 返回新函数

## 异步与事件循环

- **调用栈** → **微任务**（Promise.then、queueMicrotask）→ **宏任务**（setTimeout、setInterval）
- 每个宏任务执行完后，清空所有微任务，再取下一个宏任务
- Promise 状态：pending → fulfilled/rejected（不可逆）
- `async/await` = Promise 语法糖，`await` 后面非 Promise 会 `Promise.resolve()` 包装

## ES6+

- `Map`（任意 key、有序）vs `Object`（字符串/symbol key、无序）
- `Set`（去重）→ `[...new Set(arr)]` 一行去重
- `Proxy`（拦截对象操作）/ `Reflect`（提供默认行为）→ Vue3 响应式基础
- `Symbol`：唯一值，解决属性名冲突，元编程钩子（`Symbol.iterator` 等）

## 内存管理

- **标记清除**（主流）：从根出发标记可达对象，清除未标记
- **泄漏场景**：未清理的定时器/事件监听器/闭包引用/DOM 引用
- **排查**：Chrome DevTools Memory → Heap Snapshot / Allocation timeline

## 手写题骨架

| 题 | 核心思路 |
|---|---|
| 防抖 | `setTimeout` + `clearTimeout`，最后一次触发后执行 |
| 节流 | 时间戳或定时器，间隔内只执行一次 |
| 深拷贝 | 递归 + Map 处理循环引用 + 特殊类型（Date/RegExp/Map/Set） |
| Promise.all | 计数器，全部 resolve 才 resolve，任一 reject 就 reject |
| instanceof | 沿 `__proto__` 链查找 `prototype` |
