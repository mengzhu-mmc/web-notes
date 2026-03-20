# JavaScript 核心面试题

> 面向 2-3 年经验前端开发 | 共 40 题 | 涵盖数据类型、原型、闭包、this、异步、ES6+、内存管理、手写题

---

## 一、数据类型

### Q: JavaScript 有哪些数据类型，如何判断？

**难度**：⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

JavaScript 共有 **8 种数据类型**，分为**原始类型（Primitive）** 和 **引用类型（Reference）**：

| 类型 | 分类 | 示例 |
|---|---|---|
| `undefined` | 原始 | `let a;` |
| `null` | 原始 | `let a = null;` |
| `boolean` | 原始 | `true / false` |
| `number` | 原始 | `42 / 3.14 / NaN` |
| `string` | 原始 | `"hello"` |
| `bigint` | 原始 | `9007199254740991n` |
| `symbol` | 原始 | `Symbol('id')` |
| `object` | 引用 | `{} / [] / function` |

**判断方式对比：**

| 方法 | 适用场景 | 局限 |
|---|---|---|
| `typeof` | 基本类型判断 | `typeof null === 'object'`（历史遗留bug） |
| `instanceof` | 引用类型判断 | 跨 iframe 失效 |
| `Array.isArray()` | 判断数组 | 仅数组 |
| `Object.prototype.toString.call()` | 万能判断 | 写法稍繁琐 |

```js
// 最可靠的类型判断函数
function getType(value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

getType(null);        // 'null'
getType([]);          // 'array'
getType(new Date());  // 'date'
getType(/regex/);     // 'regexp'
getType(undefined);   // 'undefined'
getType(42);          // 'number'
```

---

### Q: `==` 和 `===` 的区别？隐式类型转换规则是什么？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

- `===`（严格相等）：**不进行类型转换**，类型不同直接返回 `false`
- `==`（宽松相等）：**先进行类型转换**，再比较值

**`==` 转换规则（Abstract Equality Comparison）：**

1. `null == undefined` → `true`（仅此一对）
2. `NaN == NaN` → `false`（NaN 不等于任何值包括自身）
3. `boolean` 先转 `number` 再比较
4. `string` 与 `number` 比较：string 转 number
5. `object` 与原始类型比较：调用 `valueOf()` → `toString()`

```js
// 经典陷阱
null == undefined  // true
null == 0          // false
null == false      // false
'' == false        // true  (false→0, ''→0)
[] == false        // true  (false→0, []→''→0)
[] == ![]          // true  (![]→false→0, []→0)

// 推荐始终用 ===
console.log(0 === false);  // false ✓
console.log(0 == false);   // true  ✗（容易踩坑）
```

---

### Q: `null` 和 `undefined` 的区别？

**难度**：⭐⭐ | **频率**：🔥🔥🔥

**答：**

| 特性 | `undefined` | `null` |
|---|---|---|
| 含义 | **未定义**（变量声明但未赋值） | **空值**（主动赋值为空） |
| typeof | `'undefined'` | `'object'`（历史遗留bug） |
| 转数字 | `NaN` | `0` |
| 使用场景 | JS 引擎自动赋值 | 开发者手动置空 |

```js
let a;
console.log(a);              // undefined（声明未赋值）
console.log(typeof a);       // 'undefined'

let b = null;
console.log(b);              // null（主动置空）
console.log(typeof b);       // 'object'（历史bug）

// 两者宽松相等
console.log(null == undefined);  // true
console.log(null === undefined); // false
```

---

## 二、原型与继承

### Q: 什么是原型链？请画出原型链的结构

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

每个 JS 对象都有一个内部属性 `[[Prototype]]`（可通过 `__proto__` 访问），指向其**原型对象**。当访问一个属性时，先在自身找，找不到就沿 `[[Prototype]]` 链向上查找，直到 `null`，这条链就叫**原型链**。

**关键关系：**
- `instance.__proto__ === Constructor.prototype`
- `Constructor.prototype.__proto__ === Object.prototype`
- `Object.prototype.__proto__ === null`

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a noise.`;
};

function Dog(name) {
  Animal.call(this, name);
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

const d = new Dog('Rex');

// 原型链：d → Dog.prototype → Animal.prototype → Object.prototype → null
console.log(d.__proto__ === Dog.prototype);              // true
console.log(d.__proto__.__proto__ === Animal.prototype); // true
console.log(d instanceof Dog);                           // true
console.log(d instanceof Animal);                        // true

// 属性查找过程
d.speak();   // 在 d 上找不到 → Dog.prototype 找不到 → Animal.prototype 找到！
```

**原型链结构图：**
```
d
└── __proto__ → Dog.prototype { constructor: Dog }
                └── __proto__ → Animal.prototype { speak: fn }
                                └── __proto__ → Object.prototype { hasOwnProperty... }
                                                └── __proto__ → null
```

---

### Q: JavaScript 有哪些继承方式？各有什么优缺点？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 继承方式 | 原理 | 优点 | 缺点 |
|---|---|---|---|
| 原型链继承 | `Child.prototype = new Parent()` | 简单 | 引用类型共享；无法传参 |
| 构造函数继承 | `Parent.call(this)` | 可传参；引用类型独立 | 方法不共享，函数重复创建 |
| 组合继承 | 原型链 + 构造函数 | 可传参；方法共享 | 父构造函数调用两次 |
| 寄生组合继承 | `Object.create()` + 构造函数 | **最优**，ES5 标准方案 | 写法稍繁琐 |
| ES6 class extends | 语法糖 | 简洁，最推荐 | 需转译低版本 |

```js
// ✅ 寄生组合继承（最优 ES5 方案）
function Parent(name) {
  this.name = name;
  this.colors = ['red', 'blue'];
}
Parent.prototype.getName = function() { return this.name; };

function Child(name, age) {
  Parent.call(this, name);  // 借用构造函数，处理实例属性
  this.age = age;
}

// 关键：用 Object.create 而非 new Parent()，避免二次调用
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

// ✅ ES6 Class（推荐）
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() { return `${this.name} speaks`; }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // 必须先调用 super
    this.breed = breed;
  }
  bark() { return 'Woof!'; }
}
```

---

### Q: `new` 操作符做了什么？手写 `new`

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`new Constructor(...args)` 执行以下步骤：
1. 创建一个空对象 `obj`
2. 将 `obj.__proto__` 指向 `Constructor.prototype`
3. 以 `obj` 为 `this` 调用构造函数
4. 如果构造函数返回对象，则返回该对象；否则返回 `obj`

```js
function myNew(Constructor, ...args) {
  // 1. 创建空对象，原型指向构造函数的 prototype
  const obj = Object.create(Constructor.prototype);
  // 2. 执行构造函数，绑定 this
  const result = Constructor.apply(obj, args);
  // 3. 如果构造函数返回了对象类型，优先返回它；否则返回 obj
  return result instanceof Object ? result : obj;
}

// 测试
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() { return `Hi, I'm ${this.name}`; };

const p = myNew(Person, 'Alice', 25);
console.log(p.name);     // 'Alice'
console.log(p.greet());  // 'Hi, I'm Alice'
console.log(p instanceof Person); // true
```

---

## 三、作用域与闭包

### Q: 什么是闭包？闭包的应用场景有哪些？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

**闭包**是指一个函数能够访问其**词法作用域**内的变量，即使该函数在其词法作用域之外被执行。

**形成条件：**
1. 函数嵌套
2. 内部函数引用外部函数的变量
3. 内部函数在外部函数执行完后仍被引用

```js
// 经典闭包示例
function makeCounter(initial = 0) {
  let count = initial;  // 外部函数的局部变量
  return {
    increment() { return ++count; },
    decrement() { return --count; },
    value() { return count; }
  };
  // count 不会被销毁，因为被返回的对象引用着
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.value();     // 12

// 两个计数器互相独立，各有自己的 count
const c2 = makeCounter(0);
c2.increment(); // 1（不影响 counter）
```

**应用场景：**
1. **私有变量**：模拟私有状态（如上例）
2. **函数工厂**：生成系列函数
3. **防抖/节流**：保存 timer 状态
4. **偏函数/柯里化**：记住部分参数
5. **模块模式**：封装内部实现

```js
// 经典陷阱：var 循环
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 输出：3 3 3（var 没有块级作用域，i 共享）

// 修复方案1：用 let
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 输出：0 1 2 ✓

// 修复方案2：IIFE 闭包
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 0))(i);
}
// 输出：0 1 2 ✓
```

---

### Q: `var`、`let`、`const` 的区别？

**难度**：⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

| 特性 | `var` | `let` | `const` |
|---|---|---|---|
| 作用域 | **函数作用域** | **块级作用域** | **块级作用域** |
| 变量提升 | ✅（提升并初始化为 undefined） | ⚠️（提升但不初始化，TDZ） | ⚠️（提升但不初始化，TDZ） |
| 重复声明 | ✅ 允许 | ❌ 不允许 | ❌ 不允许 |
| 重新赋值 | ✅ | ✅ | ❌（基本类型不可，引用类型属性可变） |
| 挂载到 window | ✅（全局 var） | ❌ | ❌ |

**TDZ（暂时性死区）：**

```js
console.log(a); // undefined（var 提升）
var a = 1;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 1;      // 从声明位置到块顶部的区域叫 TDZ

// const 必须在声明时赋值
const c;  // SyntaxError: Missing initializer in const declaration

// const 引用类型：属性可变，引用不可变
const obj = { a: 1 };
obj.a = 2;    // ✅ 可以
obj = {};     // ❌ TypeError: Assignment to constant variable
```

---

### Q: 什么是变量提升（Hoisting）？函数提升和变量提升哪个优先级高？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

JS 引擎在代码执行前会将变量声明和函数声明**提升到当前作用域顶部**：
- `var` 声明提升，初始化为 `undefined`
- `function` 声明整体提升（包括函数体）
- `let/const` 提升但不初始化（TDZ）

**函数提升优先级高于变量提升：**

```js
// 看似先声明 foo 为 undefined，再定义函数
console.log(typeof foo); // 'function'，函数声明优先

var foo = 'bar';
function foo() { return 'function'; }

// 等价于（引擎处理后）：
// function foo() { return 'function'; }  // 函数声明先提升
// var foo;                                // var 声明提升（但函数已存在，不覆盖）
// console.log(typeof foo);               // 'function'
// foo = 'bar';                           // 赋值留在原地

// 注意：函数表达式不会整体提升
console.log(bar); // undefined
var bar = function() {};
```

---

## 四、this 指向

### Q: this 的指向规则是什么？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

`this` 的值在**函数调用时**确定（箭头函数除外），遵循以下优先级（从高到低）：

| 调用方式 | this 指向 | 优先级 |
|---|---|---|
| `new` 调用 | 新创建的对象 | 最高 |
| `call/apply/bind` | 指定的第一个参数 | 高 |
| 对象方法调用 | 调用该方法的对象 | 中 |
| 普通函数调用 | `undefined`（严格模式）/ `window`（非严格） | 低 |
| 箭头函数 | **定义时**所在词法作用域的 this | 特殊（不受调用影响） |

```js
const obj = {
  name: 'obj',
  regular: function() {
    console.log(this.name); // 取决于调用方式
  },
  arrow: () => {
    console.log(this);  // 定义时的 this（此处为 window/global）
  }
};

obj.regular();          // 'obj'（对象方法调用）
const fn = obj.regular;
fn();                   // undefined（严格模式）/ window.name（非严格）

// call/apply/bind 显式绑定
obj.regular.call({ name: 'other' }); // 'other'
const bound = obj.regular.bind({ name: 'bound' });
bound(); // 'bound'

// 箭头函数的 this 继承外层
function Timer() {
  this.seconds = 0;
  setInterval(() => {
    this.seconds++;  // this → Timer 实例（箭头函数捕获外层 this）
  }, 1000);
}
```

---

### Q: `call`、`apply`、`bind` 的区别？手写 `bind`

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 方法 | 参数形式 | 执行时机 | 返回值 |
|---|---|---|---|
| `call(ctx, a, b)` | 逐个传入 | 立即执行 | 函数返回值 |
| `apply(ctx, [a, b])` | 数组传入 | 立即执行 | 函数返回值 |
| `bind(ctx, a, b)` | 逐个传入（可预置） | 返回新函数，延迟执行 | 绑定后的新函数 |

```js
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}
const user = { name: 'Alice' };

greet.call(user, 'Hello', '!');      // 'Hello, Alice!'
greet.apply(user, ['Hello', '!']);   // 'Hello, Alice!'
const greetUser = greet.bind(user, 'Hi');
greetUser('~');                      // 'Hi, Alice~'

// 手写 bind
Function.prototype.myBind = function(ctx, ...preArgs) {
  const fn = this;
  // 返回一个新函数
  return function bound(...args) {
    // 考虑 new 调用的情况：new bound() 时 this 是新实例，不应被绑定覆盖
    if (new.target) {
      return new fn(...preArgs, ...args);
    }
    return fn.apply(ctx, [...preArgs, ...args]);
  };
};

// 手写 call
Function.prototype.myCall = function(ctx, ...args) {
  ctx = ctx == null ? globalThis : Object(ctx);
  const key = Symbol('fn');
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};
```

---

## 五、异步

### Q: 请描述 JavaScript 的事件循环（Event Loop）机制

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

JS 是**单线程**的，通过**事件循环**实现异步非阻塞。

**执行流程：**
1. 执行**同步代码**（调用栈 Call Stack）
2. 同步代码执行完，清空**微任务队列（Microtask Queue）**（全部执行完）
3. 取一个**宏任务（Macrotask）**执行
4. 执行完再清空微任务队列
5. 重复 3-4

**微任务（Microtask）：** `Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`
**宏任务（Macrotask）：** `setTimeout`、`setInterval`、`setImmediate`（Node）、I/O、`requestAnimationFrame`

```js
console.log('1');                              // 同步

setTimeout(() => console.log('2'), 0);        // 宏任务

Promise.resolve()
  .then(() => console.log('3'))               // 微任务
  .then(() => console.log('4'));              // 微任务

console.log('5');                             // 同步

// 输出顺序：1 → 5 → 3 → 4 → 2
```

**更复杂的示例：**
```js
async function async1() {
  console.log('async1 start');           // 2
  await async2();
  console.log('async1 end');             // 6（await 后面等价于 .then）
}
async function async2() {
  console.log('async2');                 // 3
}

console.log('script start');             // 1
setTimeout(() => console.log('setTimeout'), 0); // 8
async1();
new Promise(resolve => {
  console.log('promise executor');       // 4
  resolve();
}).then(() => console.log('promise1'));  // 7
console.log('script end');               // 5

// 输出：script start → async1 start → async2 → promise executor
//        → script end → async1 end → promise1 → setTimeout
```

---

### Q: Promise 的原理是什么？手写 `Promise.all`、`Promise.race`、`Promise.allSettled`

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

Promise 是一个**状态机**，有三种状态：`pending` → `fulfilled` / `rejected`，状态一旦改变不可逆。

```js
// 手写 Promise.all（全部成功才成功，一个失败就失败）
Promise.myAll = function(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([]);
    const results = [];
    let count = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {
        results[i] = val;
        count++;
        if (count === promises.length) resolve(results);
      }, reject);
    });
  });
};

// 手写 Promise.race（第一个完成的决定结果）
Promise.myRace = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => Promise.resolve(p).then(resolve, reject));
  });
};

// 手写 Promise.allSettled（全部完成，无论成功失败）
Promise.myAllSettled = function(promises) {
  return Promise.myAll(
    promises.map(p =>
      Promise.resolve(p).then(
        value => ({ status: 'fulfilled', value }),
        reason => ({ status: 'rejected', reason })
      )
    )
  );
};

// 手写 Promise.any（第一个成功的决定结果）
Promise.myAny = function(promises) {
  return new Promise((resolve, reject) => {
    let errors = [];
    let count = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(resolve, err => {
        errors[i] = err;
        count++;
        if (count === promises.length) {
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
    });
  });
};
```

---

### Q: async/await 的原理是什么？与 Promise 有何关系？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`async/await` 是 **Generator + Promise 的语法糖**，本质上是对 Promise 链式调用的简化写法。

- `async` 函数返回一个 **Promise**
- `await` 暂停 async 函数的执行，等待 Promise 解决，其后的代码等价于 `.then()` 回调

```js
// async/await 写法
async function fetchUserData(userId) {
  try {
    const user = await fetchUser(userId);       // 等待 Promise
    const posts = await fetchPosts(user.id);    // 串行执行
    return { user, posts };
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
}

// 等价 Promise 写法
function fetchUserData(userId) {
  return fetchUser(userId)
    .then(user => fetchPosts(user.id).then(posts => ({ user, posts })))
    .catch(err => { console.error('Error:', err); throw err; });
}

// 并行执行（不要误用串行）
async function parallel() {
  // ❌ 串行，慢
  const a = await asyncA();
  const b = await asyncB();

  // ✅ 并行，快
  const [a, b] = await Promise.all([asyncA(), asyncB()]);
}

// 错误处理模式
async function safeRequest(url) {
  const [err, data] = await fetch(url)
    .then(r => r.json())
    .then(data => [null, data])
    .catch(err => [err, null]);

  if (err) return handleError(err);
  return data;
}
```

---

## 六、ES6+

### Q: ES6 中 Map 和 Object 的区别？Set 和 Array 的区别？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

**Map vs Object：**

| 特性 | `Map` | `Object` |
|---|---|---|
| 键的类型 | 任意类型（包括对象、函数） | 只能是 String/Symbol |
| 顺序 | **保证插入顺序** | 不完全保证（整数键按数字排） |
| 大小 | `map.size` | 需手动 `Object.keys().length` |
| 迭代 | 直接可迭代（for...of） | 需 `Object.entries()` |
| 性能 | 频繁增删时更优 | 少量固定键时更优 |

**Set vs Array：**

| 特性 | `Set` | `Array` |
|---|---|---|
| 唯一性 | **值唯一**，自动去重 | 允许重复 |
| 查找 | `O(1)` | `O(n)` |
| 索引访问 | 不支持 | 支持 |
| 适用场景 | 去重、集合运算 | 有序列表、索引访问 |

```js
// Map 示例
const map = new Map();
const keyObj = { id: 1 };
map.set(keyObj, 'value');
map.set('string', 42);
map.get(keyObj); // 'value'

// 集合运算（交集、并集、差集）
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

const union = new Set([...a, ...b]);                            // {1,2,3,4,5,6}
const intersection = new Set([...a].filter(x => b.has(x)));    // {3,4}
const difference = new Set([...a].filter(x => !b.has(x)));     // {1,2}

// 数组去重
const arr = [1, 2, 2, 3, 3, 4];
const unique = [...new Set(arr)]; // [1, 2, 3, 4]
```

---

### Q: Proxy 和 Reflect 的作用是什么？Vue3 为什么用 Proxy 替代 Object.defineProperty？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 对比项 | `Object.defineProperty` | `Proxy` |
|---|---|---|
| 拦截粒度 | 只能拦截属性的 get/set | 拦截 13 种操作（get/set/has/deleteProperty/apply等） |
| 数组支持 | ❌ 无法检测下标赋值、length变化 | ✅ 完整支持 |
| 新增属性 | ❌ 无法检测（Vue2 需 `$set`） | ✅ 自动检测 |
| 性能 | 需要遍历所有属性 | 懒代理（按需） |

```js
// Proxy 基本用法
const handler = {
  get(target, prop, receiver) {
    console.log(`Getting ${prop}`);
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    console.log(`Setting ${prop} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  },
  deleteProperty(target, prop) {
    console.log(`Deleting ${prop}`);
    return Reflect.deleteProperty(target, prop);
  }
};

const obj = new Proxy({}, handler);
obj.name = 'Alice';   // Setting name = Alice
obj.name;             // Getting name
delete obj.name;      // Deleting name

// 简易响应式系统（Vue3 核心原理）
function reactive(target) {
  return new Proxy(target, {
    get(target, key) {
      track(target, key);  // 依赖收集
      const val = Reflect.get(target, key);
      return typeof val === 'object' ? reactive(val) : val;  // 递归代理嵌套对象
    },
    set(target, key, value) {
      const result = Reflect.set(target, key, value);
      trigger(target, key);  // 触发更新
      return result;
    }
  });
}
```

**Reflect** 的作用：提供与 Proxy 拦截操作一一对应的方法，规范化对象操作行为，确保正确处理 receiver（解决 this 问题）。

---

### Q: Symbol 的用途是什么？

**难度**：⭐⭐⭐ | **频率**：🔥🔥

**答：**

`Symbol` 是 ES6 引入的**唯一值类型**，每次调用 `Symbol()` 都返回不同的值。

**主要用途：**
1. **唯一 key**：避免属性名冲突（第三方库扩展对象）
2. **内置行为定制**：`Symbol.iterator`、`Symbol.toPrimitive` 等"知名符号"
3. **私有属性（弱隐藏）**：不会出现在 `for...in` / `Object.keys()` 中

```js
// 1. 唯一 key 防冲突
const id = Symbol('id');
const user = { [id]: 123, name: 'Alice' };
Object.keys(user);  // ['name']（Symbol 不出现）

// 2. 迭代器协议
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      }
    };
  }
}

for (const n of new Range(1, 5)) {
  console.log(n);  // 1 2 3 4 5
}

// 3. Symbol.toPrimitive
const price = {
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 42;
    if (hint === 'string') return '$42';
    return true;
  }
};
+price;     // 42
`${price}`; // '$42'
```

---

## 七、内存管理

### Q: JavaScript 的垃圾回收机制是什么？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

JS 使用**自动垃圾回收（GC）**，主要算法是**标记-清除（Mark-and-Sweep）**：

1. **标记阶段**：从根对象（全局变量、调用栈中的变量）出发，遍历所有可达对象并标记
2. **清除阶段**：清除所有未被标记的对象（不可达对象）

早期浏览器使用**引用计数**，但无法处理**循环引用**（现代 V8 已废弃）。

**V8 分代回收：**
- **新生代（Scavenge）**：存储短命对象，使用 Cheney 算法（复制清除），频繁 GC
- **老生代（Mark-Sweep + Mark-Compact）**：存储长命对象，偶尔 GC

```js
// 循环引用（现代 GC 可处理，标记清除不受影响）
function createCycle() {
  const a = {};
  const b = {};
  a.ref = b;  // a → b
  b.ref = a;  // b → a（循环引用）
  // 函数执行完，a 和 b 都不可达，会被回收
}
```

---

### Q: 常见的内存泄漏场景有哪些？如何排查？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 泄漏场景 | 原因 | 解决方案 |
|---|---|---|
| 全局变量 | 意外创建全局变量（未声明直接赋值） | 严格模式 `'use strict'` |
| 未清理的定时器 | `setInterval` 持有回调引用 | 组件卸载时 `clearInterval` |
| 未移除的事件监听 | DOM 销毁但监听器未移除 | `removeEventListener` |
| 闭包引用 | 闭包持有不再需要的大对象 | 置为 null 或重新设计 |
| DOM 引用 | JS 中持有 DOM 引用，但 DOM 已从页面移除 | 用 `WeakMap` 存 DOM 引用 |
| Map/Set 存对象 | 键是对象引用，无法被 GC | 用 `WeakMap`/`WeakSet` |

```js
// ❌ 内存泄漏：DOM 引用
let element = document.getElementById('btn');
document.body.removeChild(element);
// element 变量仍持有 DOM 节点引用，节点无法被回收

// ✅ 修复
element = null;

// ❌ 内存泄漏：未清理定时器
function startPolling() {
  const data = new Array(1000000).fill('leak');
  setInterval(() => {
    console.log(data.length);  // 闭包持有 data
  }, 1000);
  // 没有返回 timer id，永远无法清理！
}

// ✅ 修复：React 组件中
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);  // 清理
}, []);

// ✅ 用 WeakMap 避免泄漏
const cache = new WeakMap();
function process(dom) {
  if (cache.has(dom)) return cache.get(dom);
  const result = heavyComputation(dom);
  cache.set(dom, result);  // DOM 被移除时，WeakMap 条目自动清除
  return result;
}
```

**排查工具：** Chrome DevTools → Memory 面板 → Heap Snapshot（堆快照），对比两次快照查找增长对象。

---

## 八、手写题系列

### Q: 手写防抖（debounce）和节流（throttle）

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

| 概念 | 防抖（Debounce） | 节流（Throttle） |
|---|---|---|
| 原理 | 连续触发时，只执行**最后一次** | 固定频率执行，**均匀分布** |
| 适用场景 | 搜索框输入、窗口 resize 完成后 | 滚动事件、鼠标移动、按钮点击限频 |

```js
// 防抖：n 毫秒内重复触发，重新计时
function debounce(fn, delay, immediate = false) {
  let timer = null;
  return function(...args) {
    const callNow = immediate && !timer;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) fn.apply(this, args);
    }, delay);
    if (callNow) fn.apply(this, args);
  };
}

// 节流：时间戳版（立即执行）
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

// 节流：定时器版（延迟执行，可控最后一次）
function throttleTimer(fn, interval) {
  let timer = null;
  return function(...args) {
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, interval);
    }
  };
}

// 使用示例
const onSearch = debounce((val) => console.log('Search:', val), 300);
const onScroll = throttle(() => console.log('scroll'), 100);
window.addEventListener('scroll', onScroll);
```

---

### Q: 手写深拷贝（deep clone）

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

```js
function deepClone(target, weakMap = new WeakMap()) {
  // 处理 null 和非对象
  if (target === null || typeof target !== 'object') return target;

  // 处理特殊类型
  if (target instanceof Date) return new Date(target);
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);
  if (target instanceof Map) {
    const map = new Map();
    target.forEach((val, key) => map.set(deepClone(key, weakMap), deepClone(val, weakMap)));
    return map;
  }
  if (target instanceof Set) {
    const set = new Set();
    target.forEach(val => set.add(deepClone(val, weakMap)));
    return set;
  }

  // 处理循环引用
  if (weakMap.has(target)) return weakMap.get(target);

  // 创建对应类型的空对象（保持原型链）
  const clone = Array.isArray(target) ? [] : Object.create(Object.getPrototypeOf(target));
  weakMap.set(target, clone);

  // 递归拷贝所有属性（包括 Symbol 键）
  const keys = [...Object.keys(target), ...Object.getOwnPropertySymbols(target)];
  for (const key of keys) {
    clone[key] = deepClone(target[key], weakMap);
  }
  return clone;
}

// 测试
const obj = {
  a: 1,
  b: { c: [1, 2, 3] },
  d: new Date(),
  e: /test/gi,
};
obj.self = obj;  // 循环引用

const cloned = deepClone(obj);
cloned.b.c.push(4);
console.log(obj.b.c);    // [1, 2, 3]（原对象不受影响）
console.log(cloned.self === cloned);  // true（循环引用正确处理）
```

---

### Q: 手写柯里化（curry）函数

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

**柯里化**：将多参数函数转换为一系列单参数函数的技术。`f(a, b, c)` → `f(a)(b)(c)`

```js
function curry(fn) {
  return function curried(...args) {
    // 如果参数已满足，直接调用
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // 否则返回函数，等待更多参数
    return function(...args2) {
      return curried.apply(this, args.concat(args2));
    };
  };
}

// 测试
const add = curry((a, b, c) => a + b + c);
console.log(add(1)(2)(3));    // 6
console.log(add(1, 2)(3));    // 6
console.log(add(1)(2, 3));    // 6
console.log(add(1, 2, 3));    // 6

// 实际应用：偏函数 + 复用
const multiply = curry((a, b) => a * b);
const double = multiply(2);
const triple = multiply(3);
[1, 2, 3].map(double);  // [2, 4, 6]
[1, 2, 3].map(triple);  // [3, 6, 9]
```

---

### Q: 手写 `Object.create` 和 `instanceof`

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

```js
// 手写 Object.create
function myCreate(proto, propertiesObject) {
  if (typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }
  function Temp() {}
  Temp.prototype = proto;
  const obj = new Temp();
  if (propertiesObject) {
    Object.defineProperties(obj, propertiesObject);
  }
  return obj;
}

// 手写 instanceof
function myInstanceof(instance, Constructor) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Right-hand side must be a function');
  }
  let proto = Object.getPrototypeOf(instance);
  const prototype = Constructor.prototype;
  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// 测试
class A {}
class B extends A {}
const b = new B();
console.log(myInstanceof(b, B));  // true
console.log(myInstanceof(b, A));  // true
console.log(myInstanceof(b, Object));  // true
console.log(myInstanceof(b, Array));   // false
```

---

### Q: 手写 `Promise.retry` — 请求失败自动重试

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

```js
// 失败后重试 n 次，全部失败才 reject
function retry(fn, times, delay = 0) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      fn()
        .then(resolve)
        .catch(err => {
          if (remaining <= 0) {
            reject(err);
          } else {
            setTimeout(() => attempt(remaining - 1), delay);
          }
        });
    }
    attempt(times);
  });
}

// 测试
let count = 0;
const unstable = () => new Promise((res, rej) => {
  count++;
  count < 3 ? rej(new Error('fail')) : res('success');
});

retry(unstable, 3, 100).then(console.log);  // 'success'（第3次成功）
```

---

### Q: 手写 `reduce` 实现 `map`、`filter`、`flat`

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

```js
// 用 reduce 实现 map
Array.prototype.myMap = function(fn) {
  return this.reduce((acc, item, i) => {
    acc.push(fn(item, i, this));
    return acc;
  }, []);
};

// 用 reduce 实现 filter
Array.prototype.myFilter = function(fn) {
  return this.reduce((acc, item, i) => {
    if (fn(item, i, this)) acc.push(item);
    return acc;
  }, []);
};

// 用 reduce 实现 flat（指定深度）
function myFlat(arr, depth = 1) {
  return arr.reduce((acc, item) => {
    if (Array.isArray(item) && depth > 0) {
      acc.push(...myFlat(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

// 测试
[1, [2, [3, [4]]]].myMap(x => x * 2);          // 报错，因为有嵌套。。正确用法：
[1, 2, 3].myMap(x => x * 2);                    // [2, 4, 6]
[1, 2, 3, 4].myFilter(x => x % 2 === 0);        // [2, 4]
myFlat([1, [2, [3, [4]]]], 2);                   // [1, 2, 3, [4]]
myFlat([1, [2, [3, [4]]]], Infinity);            // [1, 2, 3, 4]
```

---

*本文件共约 40 道题，涵盖 JS 核心全部高频考点。*
