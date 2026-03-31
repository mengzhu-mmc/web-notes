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

**🔍 深层原理**

原始类型与引用类型的本质区别在于**存储方式**和**赋值行为**：

- **原始类型**：值直接存在**栈（Stack）**中，赋值是**值拷贝**，互不影响。
- **引用类型**：值存在**堆（Heap）**中，栈中只存一个**指向堆的指针（引用地址）**，赋值是**引用拷贝**，两个变量共享同一个堆对象。

```
原始类型赋值（值拷贝）：          引用类型赋值（引用拷贝）：

let a = 1;                        let obj1 = { x: 1 };
let b = a;  // b 是独立副本        let obj2 = obj1;  // 共享同一对象
b = 2;                            obj2.x = 99;
// a 仍是 1，b 是 2               // obj1.x 也变成 99！
```

**为什么 `typeof null === 'object'`？**
这是 JS 早期实现的历史 Bug。在 V8 等引擎底层，值的类型标签（type tag）用低位 bit 表示，`000` 代表对象类型，而 `null` 的二进制表示全为 `0`，所以被误判为 `object`。这个 Bug 在 ES5 时曾提议修复但因向后兼容性被拒绝，成为永久遗留。

**`Object.prototype.toString` 为什么是万能的？**
每个对象都有内部的 `[[Class]]` 属性，`Object.prototype.toString` 会读取这个内部属性返回 `[object Xxx]` 格式字符串。即便子类重写了 toString，通过 `.call` 可以强制使用 Object 原型上的方法绕过重写，从而准确获取内部类型。

---

**💻 完整代码示例（含边界情况）**

```js
// 完整类型判断工具函数
function getType(value) {
  if (value === null) return 'null';       // 特殊处理 null
  if (value !== value) return 'nan';       // NaN !== NaN
  const type = typeof value;
  if (type !== 'object' && type !== 'function') return type;
  // 利用 Object.prototype.toString 区分对象子类型
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

// 边界情况测试
console.log(getType(null));              // 'null'
console.log(getType(undefined));         // 'undefined'
console.log(getType(NaN));               // 'nan'
console.log(getType(42));                // 'number'
console.log(getType('hello'));           // 'string'
console.log(getType(true));              // 'boolean'
console.log(getType(Symbol()));          // 'symbol'
console.log(getType(42n));               // 'bigint'
console.log(getType({}));                // 'object'
console.log(getType([]));                // 'array'
console.log(getType(new Date()));        // 'date'
console.log(getType(/abc/));             // 'regexp'
console.log(getType(function(){}));      // 'function'
console.log(getType(new Map()));         // 'map'
console.log(getType(new Set()));         // 'set'
console.log(getType(new Promise(()=>{})));  // 'promise'

// typeof 的结果汇总（含陷阱）
typeof undefined    // 'undefined'
typeof null         // 'object'  ⚠️ Bug
typeof 42           // 'number'
typeof 'str'        // 'string'
typeof true         // 'boolean'
typeof Symbol()     // 'symbol'
typeof 42n          // 'bigint'
typeof {}           // 'object'
typeof []           // 'object'  ⚠️ 无法区分数组
typeof function(){} // 'function' ⚠️ 函数是特殊的 object
```

---

**⚠️ 常见误区**

1. **误区：`typeof` 可以判断所有类型**
   - 错！`typeof null === 'object'`、`typeof [] === 'object'`，无法区分 null/数组/普通对象。

2. **误区：`instanceof` 可以跨 iframe 使用**
   - 错！不同 iframe 有不同的执行上下文，`[] instanceof Array` 在跨 iframe 场景返回 `false`，应用 `Array.isArray()`。

3. **误区：原始类型没有方法**
   - 看似有！`'hello'.toUpperCase()` 可以调用是因为 JS 引擎会**自动装箱**（autoboxing），临时将原始值包装成对应的包装对象（`String`/`Number`/`Boolean`），调用完即销毁。

4. **误区：`function` 不是对象**
   - 错！函数是一等公民，也是对象（`typeof function(){} === 'function'`，但 `function instanceof Object === true`）。

---

**🎯 面试追问**

**Q1: 为什么 `0.1 + 0.2 !== 0.3`？**

A: JS 的 `number` 类型使用 IEEE 754 **64位双精度浮点数**表示，十进制的 `0.1` 和 `0.2` 转成二进制时是无限循环小数，存储时会截断产生精度误差。解决方案：
```js
// 方案1：toFixed + parseFloat
parseFloat((0.1 + 0.2).toFixed(10)) === 0.3  // true

// 方案2：转整数运算
(0.1 * 10 + 0.2 * 10) / 10 === 0.3  // true

// 方案3：误差范围判断
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON  // true
```

**Q2: `NaN` 是什么类型？如何正确检测？**

A: `typeof NaN === 'number'`，NaN 是数字类型但表示"非数字（Not a Number）"运算结果。检测方式：
```js
Number.isNaN(NaN)    // true（推荐，不做类型转换）
isNaN('abc')         // true（全局 isNaN 会先转 number，有误导性）
Number.isNaN('abc')  // false（正确）
NaN === NaN          // false（NaN 不等于自身，是 JS 唯一自反不等式）
```

**Q3: Symbol 和 BigInt 解决了什么问题？**

A:
- `Symbol`：解决对象属性名冲突问题，每个 Symbol 值唯一，常用于定义"元编程"钩子（如 `Symbol.iterator`）。
- `BigInt`：解决 `Number.MAX_SAFE_INTEGER`（2^53-1）以上大整数精度丢失的问题，用于金融计算、密码学场景。

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

**🔍 深层原理**

`==` 的完整转换流程遵循 ECMAScript 规范中的 **Abstract Equality Comparison** 算法，可以理解为以下决策树：

```
a == b
  │
  ├─ 类型相同？→ 用 === 规则比较（特殊：NaN !== NaN）
  │
  ├─ null == undefined？→ true
  ├─ undefined == null？→ true
  ├─ null/undefined 和其他类型？→ false（不转换）
  │
  ├─ 有 NaN？→ false
  │
  ├─ number == string？→ string 转 Number 再比较
  ├─ boolean == 任何？→ boolean 先转 Number(0或1) 再比较
  │
  └─ object == 原始类型？→ 调用 ToPrimitive(object)
        ├─ 先调用 valueOf()
        └─ 再调用 toString()
        → 得到原始值后重新比较
```

**ToPrimitive 过程（对象转原始值）：**
```js
// 对象转数字场景（hint: "number"）
[].valueOf()           // [] 自身（不是原始值，继续）
[].toString()          // '' 空字符串（原始值）
Number('')             // 0

// 所以 [] == 0 → true

// 对象有自定义 valueOf
const obj = {
  valueOf() { return 42; },
  toString() { return 'hello'; }
};
obj == 42   // true（优先用 valueOf）
`${obj}`    // 'hello'（模板字符串 hint 为 'string'，优先 toString）
```

---

**💻 完整代码示例（含边界情况）**

```js
// === 规则：类型 + 值都相同（无转换）
1 === 1          // true
1 === '1'        // false（类型不同）
null === null    // true
undefined === undefined  // true
NaN === NaN      // false（特殊：NaN 不等于自身）

// == 经典陷阱（背下来！）
// 1. null/undefined 只和彼此宽松相等
null == undefined  // true
null == 0          // false  ← 很多人认为是 true
null == ''         // false
null == false      // false

// 2. Boolean 先转 Number
true == 1          // true  (true → 1)
false == 0         // true  (false → 0)
true == '1'        // true  (true → 1, '1' → 1)
false == ''        // true  (false → 0, '' → 0)
false == 'false'   // false (false → 0, 'false' → NaN, 0 !== NaN)

// 3. 对象与原始值比较（ToPrimitive）
[] == 0            // true  ([] → '' → 0)
[] == ''           // true  ([] → '')
[] == false        // true  (false → 0, [] → '' → 0)
[1] == 1           // true  ([1] → '1' → 1)
[1,2] == '1,2'     // true  ([1,2] → '1,2')

// 4. 面试神题
[] == ![]          // true
// 解析：![] → false（空数组是truthy，取反为false）
//       false → 0（boolean转number）
//       [] → '' → 0（ToPrimitive）
//       0 == 0 → true ✓

// 推荐：项目中始终用 ===，只有检测 null/undefined 时可用 ==
function isNullish(val) {
  return val == null;  // 同时检测 null 和 undefined 的惯用写法
}
```

---

**⚠️ 常见误区**

1. **误区：`null == 0` 是 true**
   - 错！`null` 只与 `undefined` 宽松相等，与数字/字符串/布尔值比较都是 `false`。规范专门处理了这个 case，不走常规转换流程。

2. **误区：`[] == false` 但 `if ([])` 是 falsy**
   - 注意：`if ([])` 是 **truthy**（空数组是真值），但 `[] == false` 是 **true**（因为 `==` 涉及类型转换）。`==` 的结果和 `if` 判断不是同一套规则。

3. **误区：`==` 一定慢于 `===`**
   - 性能差异可以忽略不计，关键是**语义正确性和可读性**，应用 `===` 不是因为快，而是因为行为可预测。

---

**🎯 面试追问**

**Q1: `+` 操作符的隐式转换规则是什么？**

A: `+` 是特殊操作符，有"字符串连接"和"数字加法"两种语义：
```js
// 1. 有一方是字符串，全部转字符串拼接
'5' + 3        // '53'
'5' + true     // '5true'

// 2. 没有字符串，转数字相加
true + true    // 2
true + false   // 1
null + 1       // 1  (null → 0)
undefined + 1  // NaN (undefined → NaN)

// 3. 对象会 ToPrimitive
[] + []        // ''   ([] → '')
[] + {}        // '[object Object]'
{} + []        // 0    ← 开头的 {} 被解析为代码块，等同于 +[]，+[] = 0
({}) + []      // '[object Object]'（括号强制为表达式）
```

**Q2: `Object.is()` 和 `===` 的区别？**

A: `Object.is()` 是严格相等的"修复版"，修复了两个特殊 case：
```js
Object.is(NaN, NaN)     // true   （=== 返回 false）
Object.is(+0, -0)       // false  （=== 返回 true）
Object.is(1, 1)         // true   （和 === 一致）
```
React、Zustand 等框架的 shallow compare 使用 `Object.is` 作为基础比较函数。

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

**🔍 深层原理**

`undefined` 和 `null` 在语义层面代表不同的"空"概念：

- **`undefined`** 是 JS 语言级别的"未初始化"信号，由引擎在以下场景自动赋予：
  - 变量声明未赋值：`let x;`
  - 函数未显式 return：`function f() {}` 返回 undefined
  - 访问对象不存在的属性：`obj.missing`
  - 函数参数未传入：`function f(a) {}; f()` → a 为 undefined

- **`null`** 是开发者主动表达"此处无值/空引用"的语义，常见于：
  - 初始化一个将来会赋对象的变量：`let user = null;`
  - 清空 DOM 引用：`element = null;`（帮助 GC）
  - JSON 序列化中的空值（JSON.stringify 会保留 null，但 undefined 会被忽略）

```
JS 引擎行为：                     开发者行为：
变量声明时              → undefined   主动清空引用       → null
访问不存在的属性        → undefined   函数返回"无数据"   → null（推荐）
函数没有 return        → undefined   DOM 查询失败       → null（querySelector 返回 null）
对象解构缺失的 key     → undefined
```

---

**💻 完整代码示例（含边界情况）**

```js
// undefined 的各种来源
let x;
console.log(x);                     // undefined（声明未赋值）
console.log(window.nonExist);       // undefined（对象不存在的属性）

function greet(name) {
  console.log(name);                // undefined（未传参）
}
greet();

function noReturn() {}
console.log(noReturn());            // undefined（无 return）

const { a, b = 'default' } = { a: 1 };
console.log(b);                     // 'default'（解构时 undefined 触发默认值）

// null 的使用场景
let user = null;          // 初始化：明确表示"还没有用户"
user = fetchUser();       // 后续赋值对象

// JSON 中的区别（重要！）
JSON.stringify({ a: undefined, b: null });  // '{"b":null}'（undefined 被忽略！）
JSON.parse('{"b":null}');                   // { b: null }

// 数学运算中的区别
null + 1        // 1   (null → 0)
undefined + 1   // NaN (undefined → NaN)
+null           // 0
+undefined      // NaN

// 空值合并运算符 ?? 的设计基于这两者
const val = null ?? 'default';       // 'default'（仅对 null/undefined 触发）
const val2 = 0 ?? 'default';         // 0（0 不是 null/undefined）
const val3 = 0 || 'default';         // 'default'（|| 对所有 falsy 触发）
```

---

**⚠️ 常见误区**

1. **误区：可选链 `?.` 对所有 falsy 值都有效**
   - 错！`?.` 只检查 `null` 或 `undefined`，`0?.toString()` 返回 `'0'` 而不是 undefined。

2. **误区：JSON 序列化时 null 和 undefined 一样**
   - 大错！`JSON.stringify` 会忽略值为 `undefined` 的属性，而 `null` 会被保留。这在前后端接口传参时是常见 Bug 来源。

3. **误区：`typeof undefined` 一定安全**
   - 对未声明变量用 typeof 安全，但对 TDZ（let/const）中的变量用 typeof 会抛 ReferenceError。

---

**🎯 面试追问**

**Q1: 如何同时检测 null 和 undefined？**

```js
// 方法1：宽松相等（最简洁）
if (value == null) { /* value 是 null 或 undefined */ }

// 方法2：空值合并/可选链
const name = user?.profile?.name ?? '匿名';

// 方法3：显式判断
if (value === null || value === undefined) { }
```

**Q2: 为什么函数参数默认值只对 undefined 生效，对 null 不生效？**

A: 设计如此。`undefined` 表示"调用者没有传值"，触发默认值是合理的；而 `null` 是调用者主动传入的"空值"，有明确语义，不应被默认值覆盖。
```js
function f(x = 10) { return x; }
f(undefined)  // 10（触发默认值）
f(null)       // null（不触发，null 是明确传入的值）
f(0)          // 0（不触发）
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

**🔍 深层原理**

原型链机制是 JS 实现**面向对象**的核心，它与传统类语言（Java/C++）有本质区别：

- 传统类继承是**复制**：子类实例化时把父类的属性/方法拷贝一份过来。
- JS 原型继承是**委托**：子类实例自身没有属性时，"委托"给原型链去查找，原型上的更改会影响所有实例。

**`Function` 和 `Object` 的鸡生蛋问题：**

```
Function.__proto__ === Function.prototype  （Function 是自身的实例！）
Function.prototype.__proto__ === Object.prototype
Object.__proto__ === Function.prototype    （Object 构造器也是函数）
Object.prototype.__proto__ === null        （原型链终点）
```

这看起来像循环依赖，但实际上是 JS 引擎在启动时特殊构造的，Function.prototype 是一个"特殊的内置函数对象"。

---

**💻 完整 ASCII 原型链图**

```
┌─────────────────────────────────────────────────────────────────┐
│                       完整原型链关系图                          │
└─────────────────────────────────────────────────────────────────┘

 实例对象 d          构造函数 Dog         构造函数 Animal
┌──────────┐         ┌───────────┐        ┌────────────────┐
│  name    │         │ prototype ├──────►│ Dog.prototype  │
│ 'Rex'    │         └───────────┘        │  constructor   │
└────┬─────┘                              │  (Dog fn)      │
     │ __proto__                          └───────┬────────┘
     │                                           │ __proto__
     └──────────────────────────────────────────►│
                                          ┌───────▼────────┐
                                          │Animal.prototype│
                                          │  speak: fn     │
                                          └───────┬────────┘
                                                  │ __proto__
                                          ┌───────▼────────┐
                                          │Object.prototype│
                                          │  toString: fn  │
                                          │  hasOwnProp: fn│
                                          └───────┬────────┘
                                                  │ __proto__
                                                 null
```

---

**⚠️ 常见误区**

1. **误区：直接修改 `__proto__` 来改变原型链**
   - `__proto__` 是非标准 API（虽然各浏览器都实现了），应使用 `Object.getPrototypeOf` / `Object.setPrototypeOf` / `Object.create`。频繁修改 `__proto__` 会破坏 V8 的内部优化机制（hidden class），导致性能下降。

2. **误区：`for...in` 遍历只能拿到自身属性**
   - 错！`for...in` 会遍历**整条原型链上所有可枚举属性**，自身属性和继承属性都会出现。如果只想要自身属性，需要 `hasOwnProperty` 过滤。

3. **误区：`prototype` 和 `__proto__` 是同一个东西**
   - 错！`prototype` 是**函数**才有的属性，指向函数的原型对象；`__proto__` 是**实例对象**的属性，指向其构造函数的 `prototype`。

---

**🎯 面试追问**

**Q1: `Object.create(null)` 创建的对象有什么特别之处？**

A: `Object.create(null)` 创建一个**没有原型链**的纯净对象（`__proto__` 为 null），没有从 Object.prototype 继承来的 `toString/hasOwnProperty` 等方法。常用于创建**纯粹的 Map/字典**，避免属性名与原型方法冲突（如 key 为 `'constructor'`、`'__proto__'` 时）。

**Q2: 如何判断某个属性是自身属性还是继承属性？**

```js
obj.hasOwnProperty('key')      // 老方式（如果 obj 重写了该方法会有问题）
Object.hasOwn(obj, 'key')      // ES2022 新增，更安全
Object.prototype.hasOwnProperty.call(obj, 'key')  // 防御性写法
```

---

## 三、核心进阶

### Q: 什么是闭包？原理、应用场景和内存泄漏风险

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

**闭包（Closure）**是指一个函数能够**访问并记住其定义时所在词法作用域**中的变量，即使该函数在其词法作用域之外被调用。

本质：**函数 + 函数定义时的词法环境（Lexical Environment）**。

```js
function outer() {
  let count = 0; // 外部变量
  return function inner() {
    count++;      // inner 记住了 outer 的作用域
    return count;
  };
}

const counter = outer(); // outer 执行完毕，count 不会被 GC 回收
counter(); // 1
counter(); // 2
counter(); // 3 —— count 持续存活，因为 inner 持有引用
```

**常见应用场景：**

1. **模拟私有变量**（封装，避免全局污染）
2. **函数工厂**（生成具有特定配置的函数）
3. **防抖/节流**（保存定时器 ID）
4. **事件处理/回调**（保存外层状态）
5. **模块化**（IIFE 实现 Module 模式）

---

**🔍 深层原理**

V8 引擎中，每个函数执行时都会创建一个 **词法环境（Lexical Environment）**，包含：
- **环境记录（Environment Record）**：存储变量绑定
- **外部词法环境引用（Outer）**：指向外层作用域的词法环境

闭包的本质是：内层函数的 `[[Environment]]` 内部槽保持着对外层词法环境的引用，只要内层函数存活，外层的词法环境对象就不会被 GC 回收。

```
outer() 执行时：
  ┌─────────────────────────┐
  │ Lexical Environment     │
  │  count: 0               │ ← 不会被 GC，因为 inner 引用了它
  │  outer: [[Outer]]→global│
  └─────────────────────────┘
         ↑ [[Environment]]
  inner() 函数对象永久持有此引用
```

**内存泄漏风险：**

```js
// ❌ 危险：DOM 元素和闭包相互引用，导致内存无法释放
function bindEvent() {
  const el = document.getElementById('btn');
  el.addEventListener('click', function handler() {
    console.log(el.textContent); // handler 持有 el 的引用
    // el 同时持有 handler（事件监听器）的引用
    // 形成循环引用，旧版 IE 无法 GC
  });
}

// ✅ 解决方案1：用完及时移除事件监听
function bindEvent() {
  const el = document.getElementById('btn');
  const handler = function() {
    console.log(el.textContent);
    el.removeEventListener('click', handler); // 用完即移除
  };
  el.addEventListener('click', handler);
}

// ✅ 解决方案2：闭包中只保留必要数据，不直接引用 DOM
function bindEvent() {
  const el = document.getElementById('btn');
  const text = el.textContent; // 只保存文本值，不保存 DOM
  el.addEventListener('click', function() {
    console.log(text); // 闭包引用的是基本值，不是 DOM
  });
}
```

---

**💻 完整代码示例**

```js
// 1. 私有变量 + 特权方法（模块模式）
function createBank() {
  let balance = 0; // 私有变量，外部无法直接访问

  return {
    deposit(amount) {
      if (amount <= 0) throw new Error('存款必须大于0');
      balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount > balance) throw new Error('余额不足');
      balance -= amount;
      return balance;
    },
    getBalance() { return balance; }
  };
}
const bank = createBank();
bank.deposit(100);   // 100
bank.withdraw(30);   // 70
bank.getBalance();   // 70
bank.balance;        // undefined（私有，无法访问）

// 2. 函数工厂
function multiplier(factor) {
  return (num) => num * factor; // 闭包捕获 factor
}
const double = multiplier(2);
const triple = multiplier(3);
double(5); // 10
triple(5); // 15

// 3. 经典循环陷阱（var + 闭包）
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 输出 3 3 3（共享同一个 i）
}

// ✅ 修复方案1：使用 let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 输出 0 1 2（每次循环独立的 i）
}

// ✅ 修复方案2：IIFE 创建新作用域
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 0); // 输出 0 1 2
  })(i);
}
```

---

**⚠️ 常见误区**

- ❌ **误区：闭包会导致所有外部变量都泄漏**
  - ✅ 现代 V8 会分析闭包实际引用了哪些变量，只保留被引用的变量，不引用的变量照常 GC。

- ❌ **误区：只有 return 函数才是闭包**
  - ✅ 任何内层函数引用外层变量都构成闭包，包括回调、事件处理器、定时器等。

- ❌ **误区：闭包中的变量是值拷贝**
  - ✅ 闭包捕获的是变量的**引用**，不是值的拷贝。外层函数对变量的修改，闭包内也能看到。

---

**🎯 面试追问**

1. **闭包是如何实现私有变量的？与 WeakMap 方案相比有何区别？**
   > 闭包通过词法作用域隔离实现私有；WeakMap 方案（`#privateField` 的 polyfill）用 WeakMap 存储实例私有状态，WeakMap 的弱引用不阻止 GC，更利于内存管理。ES2022 原生私有字段 `#field` 是语言级别的私有。

2. **如何检测代码中是否存在闭包造成的内存泄漏？**
   > 使用 Chrome DevTools → Memory → Take Heap Snapshot，观察 Closure 类型对象是否异常增多，检查 Retainers（引用链）找到持有者。

3. **闭包和作用域链有什么关系？**
   > 闭包是作用域链的**运行时体现**。每个闭包函数通过其内部的 `[[Environment]]` 持有外层词法环境，形成一条"环境链"，这就是作用域链在运行时的实际存储形式。

---

### Q: 作用域链和变量提升（var/let/const 的区别）

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

**作用域链（Scope Chain）**：JS 引擎查找变量时，从当前作用域开始，逐层向外查找，直到全局作用域，这条查找路径就是作用域链。

**变量提升（Hoisting）**：JS 引擎在执行代码前，会先扫描当前作用域，将 `var` 声明（不含赋值）和函数声明提升到作用域顶部。

| 特性 | `var` | `let` | `const` |
|---|---|---|---|
| 作用域 | 函数/全局 | 块级 | 块级 |
| 变量提升 | ✅（初始化为 undefined） | ❌（TDZ） | ❌（TDZ） |
| 重复声明 | ✅ | ❌ | ❌ |
| 必须初始化 | ❌ | ❌ | ✅ |
| 顶层全局 | 挂到 window | 不挂 | 不挂 |

```js
// var 提升
console.log(a); // undefined（提升了，但未赋值）
var a = 10;
console.log(a); // 10

// let/const 的 TDZ（Temporal Dead Zone 暂时性死区）
console.log(b); // ❌ ReferenceError: Cannot access 'b' before initialization
let b = 10;
```

---

**🔍 深层原理**

**为什么 `let/const` 不能提升？**

实际上 `let/const` **也会提升**（引擎在编译阶段同样会扫描到它们），区别在于：
- `var` 提升后初始化为 `undefined`，可以访问
- `let/const` 提升后**不初始化**，处于 TDZ（暂时性死区），访问会抛出 ReferenceError

TDZ 是规范层面的设计，目的是避免 `var` 那种"声明前可访问（但值为 undefined）"的反直觉行为。

```
代码执行阶段（创建阶段）：
var a → 提升，初始化为 undefined  → 可读（undefined）
let b → 提升，进入 TDZ          → 不可读（ReferenceError）
           ↑
           TDZ 结束于 let b = xxx 语句被执行时
```

**函数声明 vs 函数表达式的提升：**

```js
// 函数声明 —— 整体提升（声明+函数体都提升）
greet(); // ✅ 'Hello'（可以在声明前调用）
function greet() { return 'Hello'; }

// 函数表达式 —— 只提升变量，不提升函数体
greet2(); // ❌ TypeError: greet2 is not a function（greet2 此时是 undefined）
var greet2 = function() { return 'Hello'; };
```

---

**💻 完整代码示例**

```js
// 1. 作用域链演示
var x = 'global';
function outer() {
  var x = 'outer';
  function inner() {
    // 先查找自身 → 找不到 → 查找 outer → 找到 'outer'
    console.log(x); // 'outer'
  }
  inner();
}
outer();

// 2. var 的函数作用域陷阱（没有块级作用域）
if (true) {
  var leaked = 'I leaked!'; // if 块不构成 var 的作用域
}
console.log(leaked); // 'I leaked!'（泄漏到外层）

if (true) {
  let safe = 'I am safe'; // let 是块级作用域
}
console.log(safe); // ❌ ReferenceError

// 3. TDZ 示例
{
  // TDZ 开始（let x 被提升但未初始化）
  console.log(typeof x); // ❌ ReferenceError（TDZ 中，typeof 也不安全）
  let x = 5; // TDZ 结束
  console.log(x); // 5
}

// 4. const 的特性
const obj = { a: 1 };
obj.a = 2;        // ✅ 可以修改属性（对象引用不变）
obj = {};          // ❌ TypeError（不能重新赋值，改变引用）
const arr = [1, 2];
arr.push(3);      // ✅ [1, 2, 3]
arr = [];          // ❌ TypeError
```

---

**⚠️ 常见误区**

- ❌ **误区：`let/const` 完全不提升**
  - ✅ 它们也会提升（引擎编译时扫描），只是处于 TDZ 不可访问，直到声明语句执行。

- ❌ **误区：`const` 声明的是常量，值不可变**
  - ✅ `const` 只保证**绑定不变**（不能重新赋值），对于对象/数组，其内部属性仍可修改。要深度冻结需用 `Object.freeze()`。

- ❌ **误区：函数声明和函数表达式的提升行为一样**
  - ✅ 函数声明整体提升（含函数体），函数表达式只提升变量名（值为 undefined）。

---

**🎯 面试追问**

1. **什么是 TDZ？为什么要设计 TDZ？**
   > TDZ 防止了在声明前使用变量的不良模式（var 的痛点）。在 class 字段、默认参数中也存在 TDZ。

2. **为什么 `var` 在 `for` 循环中会有问题？**
   > `var` 没有块级作用域，`for` 循环的每次迭代共享同一个 `i`，所有闭包里的 `i` 都指向同一个变量。`let` 每次迭代创建新的块级 `i`，解决了这个问题。

3. **`const` 如何实现真正的不可变对象？**
   ```js
   const obj = Object.freeze({ a: 1, b: { c: 2 } });
   obj.a = 99;     // 静默失败（严格模式抛错）
   obj.b.c = 99;   // ⚠️ 仍然可修改！freeze 是浅冻结
   // 深度冻结需要递归
   function deepFreeze(obj) {
     Object.getOwnPropertyNames(obj).forEach(name => {
       const val = obj[name];
       if (typeof val === 'object' && val !== null) deepFreeze(val);
     });
     return Object.freeze(obj);
   }
   ```

---

### Q: `this` 指向的规则（4种绑定方式）

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

`this` 的值在**函数调用时**确定（而非定义时），取决于调用方式。有4种绑定规则，优先级从高到低：

| 优先级 | 绑定方式 | `this` 指向 |
|---|---|---|
| 1（最高）| `new` 绑定 | 新创建的对象 |
| 2 | 显式绑定（`call/apply/bind`） | 指定的对象 |
| 3 | 隐式绑定（方法调用 `obj.fn()`） | 调用方法的对象 |
| 4（最低）| 默认绑定（独立函数调用）| 全局对象/`undefined`（严格模式） |

```js
// 1. new 绑定
function Person(name) {
  this.name = name; // this 指向新创建的对象
}
const p = new Person('Alice');
p.name; // 'Alice'

// 2. 显式绑定
function greet() { return this.name; }
greet.call({ name: 'Bob' });    // 'Bob'
greet.apply({ name: 'Carol' }); // 'Carol'
const bound = greet.bind({ name: 'Dave' });
bound(); // 'Dave'

// 3. 隐式绑定
const obj = {
  name: 'Eve',
  greet() { return this.name; }
};
obj.greet(); // 'Eve'（this → obj）

// 4. 默认绑定
function standalone() { return this; }
standalone();       // window（浏览器非严格模式）
// 严格模式 'use strict'：this 为 undefined
```

---

**🔍 深层原理**

**箭头函数的特殊性：**

箭头函数**没有自己的 `this`**，它的 `this` 在**定义时**从外层词法作用域捕获，且**无法通过 call/apply/bind 修改**。

```js
const obj = {
  name: 'Arrow',
  // 普通函数：this 在调用时确定
  greet() {
    setTimeout(function() {
      console.log(this.name); // undefined（this 指向全局/undefined）
    }, 0);
  },
  // 箭头函数：this 继承自外层（greet 方法的 this）
  greetArrow() {
    setTimeout(() => {
      console.log(this.name); // 'Arrow'（捕获外层 this）
    }, 0);
  }
};
obj.greet();       // undefined
obj.greetArrow();  // 'Arrow'
```

**隐式丢失（this 丢失）：**

```js
const obj = {
  name: 'Obj',
  greet() { return this.name; }
};

// 赋值给变量 → 丢失隐式绑定 → 默认绑定
const fn = obj.greet;
fn(); // undefined（this 丢失）

// 作为回调传入 → 同样丢失
[1].forEach(obj.greet); // this → undefined（严格模式）
```

---

**💻 完整代码示例**

```js
// new 绑定原理（模拟 new 操作符）
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype); // 创建新对象，原型指向构造函数
  const result = Constructor.apply(obj, args);       // 执行构造函数，this 指向新对象
  return result instanceof Object ? result : obj;    // 如果构造函数返回对象，用该对象
}

// bind 的手写实现
Function.prototype.myBind = function(thisArg, ...outerArgs) {
  const fn = this;
  return function(...innerArgs) {
    return fn.apply(thisArg, [...outerArgs, ...innerArgs]);
  };
};

// call 的手写实现
Function.prototype.myCall = function(thisArg, ...args) {
  thisArg = thisArg ?? globalThis;
  const sym = Symbol('fn'); // 用 Symbol 避免属性名冲突
  thisArg[sym] = this;
  const result = thisArg[sym](...args);
  delete thisArg[sym];
  return result;
};

// 优先级验证
function test() { console.log(this.val); }
const obj1 = { val: 'obj1' };
const obj2 = { val: 'obj2' };
const bound = test.bind(obj1);
bound.call(obj2);   // 'obj1'（bind 优先于 call，bind 后 this 无法被改变）

function Ctor() { console.log(this); }
const boundCtor = Ctor.bind({ val: 'bound' });
new boundCtor();    // {} 新对象（new 优先级最高，覆盖了 bind 的绑定）
```

---

**⚠️ 常见误区**

- ❌ **误区：箭头函数的 this 是定义时的对象**
  - ✅ 箭头函数的 this 是定义时**外层词法作用域**中的 this，不是外层对象本身。在全局/模块顶层的箭头函数，this 是全局对象/undefined。

- ❌ **误区：`bind` 返回的函数可以被 `call/apply` 改变 this**
  - ✅ `bind` 创建的函数的 this 是永久绑定的，`call/apply` 对其无效（但 `new` 可以覆盖）。

- ❌ **误区：类方法中直接用 `this.method` 作为回调是安全的**
  - ✅ 类方法中 `this.handleClick` 传入 onClick 时，调用时 this 会丢失。需要在构造函数中 `this.handleClick = this.handleClick.bind(this)` 或使用箭头函数类字段。

---

**🎯 面试追问**

1. **React 中为什么要在构造函数里 bind(this)？Class Fields 如何解决这个问题？**
   > 事件回调作为独立函数调用，this 丢失。`this.fn = this.fn.bind(this)` 创建绑定版本。Class Fields 用箭头函数 `handleClick = () => {}` 捕获构造时的 this，无需手动 bind。

2. **`call` 和 `apply` 的区别，实际使用哪个更多？**
   > 区别只是参数形式：`call(ctx, a, b, c)`，`apply(ctx, [a, b, c])`。ES6 后用扩展运算符 `fn.call(ctx, ...arr)` 可替代 apply，实际使用 call 更多。

3. **`new.target` 是什么？**
   > ES6 引入，在构造函数中检测是否通过 `new` 调用。`new.target` 在普通调用时为 undefined，通过 new 调用时为构造函数本身，常用于防止函数被普通调用。

---

### Q: 事件循环（Event Loop）和宏任务/微任务

**难度**：⭐⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

JS 是**单线程**语言，通过**事件循环（Event Loop）** 机制实现非阻塞的异步操作。

**执行顺序：**
1. 执行**同步代码**（调用栈）
2. 清空**微任务队列**（每次调用栈清空后立即执行所有微任务）
3. 执行**一个宏任务**
4. 再次清空微任务队列
5. 重复 3-4

| 类型 | 典型例子 |
|---|---|
| **宏任务（Macrotask）** | `setTimeout`、`setInterval`、`setImmediate`（Node.js）、I/O、UI渲染、`<script>` |
| **微任务（Microtask）** | `Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask`、`async/await` |

```js
console.log('1');              // 同步

setTimeout(() => {
  console.log('2');            // 宏任务（排队）
}, 0);

Promise.resolve().then(() => {
  console.log('3');            // 微任务（排队）
});

console.log('4');              // 同步

// 输出顺序：1 → 4 → 3 → 2
// 原因：同步先执行完(1,4)，然后清空微任务(3)，再执行宏任务(2)
```

---

**🔍 深层原理**

**完整的 Event Loop 流程：**

```
┌─────────────────────────────────────────────────────┐
│                    Event Loop                       │
│                                                     │
│  ┌──────────────┐    ┌────────────────────────────┐ │
│  │  Call Stack  │    │     Task Queues             │ │
│  │              │    │  ┌──────────────────────┐   │ │
│  │  fn3()       │    │  │  Microtask Queue      │   │ │
│  │  fn2()       │    │  │  Promise.then, etc.   │   │ │
│  │  fn1()       │    │  └──────────────────────┘   │ │
│  └──────────────┘    │  ┌──────────────────────┐   │ │
│         ↓ 清空后     │  │  Macrotask Queue      │   │ │
│    先清空微任务 ──────→  │  setTimeout, etc.     │   │ │
│    再取一个宏任务      │  └──────────────────────┘   │ │
│                       └────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**经典面试题（综合版）：**

```js
console.log('script start');       // 1

async function async1() {
  await async2();                  // await 后面的是微任务
  console.log('async1 end');       // 5（微任务）
}

async function async2() {
  console.log('async2 start');     // 2（同步，async2 函数体本身同步执行）
}

async1();

setTimeout(() => {
  console.log('setTimeout');       // 7（宏任务）
}, 0);

new Promise((resolve) => {
  console.log('Promise start');    // 3（Promise executor 是同步的）
  resolve();
}).then(() => {
  console.log('Promise then');     // 6（微任务）
});

console.log('script end');         // 4

// 输出：script start → async2 start → Promise start → script end
//       → async1 end → Promise then → setTimeout
```

---

**💻 完整代码示例**

```js
// 微任务的插队特性
setTimeout(() => console.log('宏任务1'), 0);
setTimeout(() => console.log('宏任务2'), 0);

Promise.resolve()
  .then(() => {
    console.log('微任务1');
    // 在微任务中再添加微任务，会在本轮微任务队列中继续执行
    return Promise.resolve();
  })
  .then(() => console.log('微任务2'));

// 输出：微任务1 → 微任务2 → 宏任务1 → 宏任务2
// 注意：两个宏任务之间，如果有微任务，会先执行微任务

// queueMicrotask（显式添加微任务）
queueMicrotask(() => console.log('显式微任务'));
console.log('同步代码');
// 输出：同步代码 → 显式微任务

// Node.js 特有（了解）
// process.nextTick 优先级高于 Promise.then
// setImmediate 在 check 阶段，晚于 setTimeout(fn, 0)
```

---

**⚠️ 常见误区**

- ❌ **误区：`setTimeout(fn, 0)` 会立即执行**
  - ✅ 它会在当前同步代码和所有微任务执行完毕后，才会被取出执行，实际延迟 ≥ 4ms（浏览器规范限制最小值）。

- ❌ **误区：微任务和宏任务各执行一个就切换**
  - ✅ 每次调用栈清空后，会执行**所有**微任务（包括微任务中新产生的微任务），然后才执行下一个宏任务。如果微任务无限产生，会阻塞渲染。

- ❌ **误区：Promise executor（`new Promise(fn)`中的fn）是异步的**
  - ✅ Promise executor 是**同步**执行的，只有 `.then/.catch/.finally` 的回调才是微任务。

---

**🎯 面试追问**

1. **async/await 如何对应到 Promise 微任务？**
   > `await expr` 相当于 `Promise.resolve(expr).then(continueFn)`，await 后面的代码块是 `.then` 回调（微任务）。每个 await 会暂停函数，交还控制权给调用方。

2. **为什么要区分宏任务和微任务？**
   > 微任务的设计是为了让某些操作能在 DOM 渲染前、在两个宏任务之间及时处理（如 Promise 状态变化），避免因插入宏任务队列而引入不必要的延迟和不确定性。

3. **如何判断一道输出题的执行顺序？**
   > 口诀：先同步、后微任务、再宏任务。遇到 async 函数，函数体在 await 前是同步，await 后是微任务；遇到 new Promise，executor 同步，then 是微任务。

---

### Q: Promise 的原理和手写实现

**难度**：⭐⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

`Promise` 是异步编程的解决方案，代表一个**最终可能完成或失败的异步操作**及其结果值。

**三种状态（单向转换，不可逆）：**
- `pending` → `fulfilled`（resolved）
- `pending` → `rejected`

**核心特性：**
- 状态一旦改变不可逆
- `.then()` 返回新的 Promise（链式调用基础）
- 微任务异步（`.then` 回调在微任务队列中执行）

---

**🔍 深层原理**

Promise 的链式调用原理：每个 `.then()` 都返回一个**新的 Promise**，其状态由回调的返回值决定：
- 返回普通值 → 新 Promise fulfilled，值为该值
- 返回 Promise → 新 Promise 的状态跟随返回的 Promise
- 抛出错误 → 新 Promise rejected

---

**💻 手写 Promise（核心实现）**

```js
class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.status = MyPromise.PENDING;
    this.value = undefined;    // fulfilled 的值
    this.reason = undefined;   // rejected 的原因
    this.onFulfilledCallbacks = []; // 等待队列（异步resolve时用）
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status !== MyPromise.PENDING) return; // 状态只能改变一次
      // 如果 resolve 的是一个 Promise，要等待它
      if (value instanceof MyPromise) {
        value.then(resolve, reject);
        return;
      }
      this.status = MyPromise.FULFILLED;
      this.value = value;
      // 通知所有等待的回调（异步情况下）
      this.onFulfilledCallbacks.forEach(fn => fn(value));
    };

    const reject = (reason) => {
      if (this.status !== MyPromise.PENDING) return;
      this.status = MyPromise.REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn(reason));
    };

    try {
      executor(resolve, reject); // executor 同步执行
    } catch (err) {
      reject(err); // executor 抛错则 reject
    }
  }

  then(onFulfilled, onRejected) {
    // 保证 then 的参数是函数（值穿透）
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    onRejected = typeof onRejected === 'function' ? onRejected : r => { throw r; };

    // then 返回新 Promise
    return new MyPromise((resolve, reject) => {
      const handleFulfilled = (value) => {
        queueMicrotask(() => { // 异步执行（微任务）
          try {
            const result = onFulfilled(value);
            // 如果回调返回 Promise，等待它
            if (result instanceof MyPromise) {
              result.then(resolve, reject);
            } else {
              resolve(result);
            }
          } catch (err) {
            reject(err);
          }
        });
      };

      const handleRejected = (reason) => {
        queueMicrotask(() => {
          try {
            const result = onRejected(reason);
            if (result instanceof MyPromise) {
              result.then(resolve, reject);
            } else {
              resolve(result); // catch 后默认 resolve（错误已处理）
            }
          } catch (err) {
            reject(err);
          }
        });
      };

      if (this.status === MyPromise.FULFILLED) {
        handleFulfilled(this.value);
      } else if (this.status === MyPromise.REJECTED) {
        handleRejected(this.reason);
      } else {
        // pending 状态：先收集回调，等 resolve/reject 时调用
        this.onFulfilledCallbacks.push(handleFulfilled);
        this.onRejectedCallbacks.push(handleRejected);
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(callback) {
    return this.then(
      value => MyPromise.resolve(callback()).then(() => value),
      reason => MyPromise.resolve(callback()).then(() => { throw reason; })
    );
  }

  // 静态方法
  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let count = 0;
      if (promises.length === 0) return resolve([]);
      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(val => {
          results[i] = val;
          if (++count === promises.length) resolve(results); // 全部完成
        }, reject); // 任一失败立即 reject
      });
    });
  }

  static allSettled(promises) {
    return MyPromise.all(promises.map(p =>
      MyPromise.resolve(p).then(
        value => ({ status: 'fulfilled', value }),
        reason => ({ status: 'rejected', reason })
      )
    ));
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      promises.forEach(p => MyPromise.resolve(p).then(resolve, reject));
    });
  }

  static any(promises) {
    return new MyPromise((resolve, reject) => {
      const errors = [];
      let count = 0;
      if (promises.length === 0) return reject(new AggregateError([], 'All promises were rejected'));
      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(resolve, reason => {
          errors[i] = reason;
          if (++count === promises.length) reject(new AggregateError(errors, 'All promises were rejected'));
        });
      });
    });
  }
}
```

---

**⚠️ 常见误区**

- ❌ **误区：Promise 能取消**
  - ✅ 原生 Promise 一旦创建就无法取消。可用 `AbortController`（fetch）或第三方库（如 Bluebird）实现取消。

- ❌ **误区：`.then()` 修改的是原 Promise**
  - ✅ `.then()` 总是返回**新的 Promise**，不影响原 Promise 的状态。

- ❌ **误区：链式调用中错误只需要一个 `.catch` 就能全捕获**
  - ✅ `.catch` 只捕获链中此前的错误。`.catch` 之后的 `.then` 如果再抛错，需要额外的 `.catch`。

---

**🎯 面试追问**

1. **`Promise.all` 和 `Promise.allSettled` 的区别？**
   > `all`：全部 fulfilled 才 resolve，任一 reject 立即 reject。`allSettled`：等待所有 Promise 落定（不管 fulfilled/rejected），返回包含 status+value/reason 的数组，不会 reject。

2. **如何实现一个并发控制（限制同时执行的 Promise 数量）？**
   > 手写一个 `limitConcurrency(tasks, limit)` 函数，维护一个运行中的计数，每次计数 < limit 就取出一个任务执行，完成后再取下一个。

3. **`Promise` 链中的值穿透是什么？**
   > `.then(null)` 或 `.then(undefined)` 时，原 Promise 的值会穿透传给下一个 `.then`，这是因为 `null` 被替换为 `v => v` 的恒等函数。

---

### Q: async/await 的原理（Generator 的语法糖）

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`async/await` 本质是 **Generator + Promise + 自动执行器** 的语法糖，让异步代码以**同步方式**书写。

```js
// async/await 写法
async function fetchUser(id) {
  const user = await fetch(`/api/user/${id}`);
  const data = await user.json();
  return data;
}

// 等价的 Generator 写法（手动）
function* fetchUserGen(id) {
  const user = yield fetch(`/api/user/${id}`);
  const data = yield user.json();
  return data;
}
// 需要自动执行器（auto runner）来驱动 Generator
```

---

**🔍 深层原理**

**Generator 基础：**
- `function*` 声明，`yield` 暂停，`.next(value)` 恢复并传入值
- Generator 函数返回一个**迭代器（Iterator）**对象
- 每次 `.next()` 执行到下一个 `yield`，返回 `{ value, done }`

**async/await 的 Babel 转译结果（简化）：**

```js
// 原始 async 函数
async function fn() {
  const a = await Promise.resolve(1);
  const b = await Promise.resolve(2);
  return a + b;
}

// 转译后（核心逻辑）
function fn() {
  return _asyncToGenerator(function*() {
    const a = yield Promise.resolve(1);
    const b = yield Promise.resolve(2);
    return a + b;
  })();
}

// 自动执行器（asyncToGenerator）
function asyncToGenerator(generatorFn) {
  return function(...args) {
    const gen = generatorFn(...args);
    return new Promise((resolve, reject) => {
      function step(key, arg) {
        let result;
        try {
          result = gen[key](arg); // next(arg) 或 throw(arg)
        } catch (err) {
          reject(err);
          return;
        }
        if (result.done) {
          resolve(result.value); // Generator 执行完毕
        } else {
          // yield 的是 Promise，等待它完成后继续
          Promise.resolve(result.value).then(
            val => step('next', val),   // 成功：继续执行
            err => step('throw', err)   // 失败：抛给 Generator
          );
        }
      }
      step('next', undefined); // 启动
    });
  };
}
```

---

**💻 完整代码示例**

```js
// async 函数的各种行为
async function demo() {
  return 42; // 等价于 return Promise.resolve(42)
}
demo().then(v => console.log(v)); // 42

// await 暂停当前 async 函数
async function sequential() {
  console.log('start');
  const a = await new Promise(r => setTimeout(() => r(1), 100));
  const b = await new Promise(r => setTimeout(() => r(2), 100));
  console.log(a + b); // 3（总耗时 ~200ms，串行）
  return a + b;
}

// 并行优化（不要串行 await 无依赖的 Promise）
async function parallel() {
  const [a, b] = await Promise.all([
    new Promise(r => setTimeout(() => r(1), 100)),
    new Promise(r => setTimeout(() => r(2), 100))
  ]);
  console.log(a + b); // 3（总耗时 ~100ms，并行）
}

// await 错误处理
async function withErrorHandling() {
  try {
    const data = await fetch('/api/data');
    return await data.json();
  } catch (err) {
    console.error('请求失败:', err);
    return null; // 优雅降级
  }
}

// 顶层 await（ES2022，仅在 ESM 模块中）
// const data = await fetch('/api/config');  // 无需包裹 async 函数
```

---

**⚠️ 常见误区**

- ❌ **误区：async 函数中所有代码都是异步的**
  - ✅ async 函数中 `await` 之前的代码是**同步执行**的，`await` 之后才是异步。

- ❌ **误区：`await` 后面必须跟 Promise**
  - ✅ `await` 可以跟任何值，非 Promise 值会被 `Promise.resolve()` 包装，相当于同步取值（但仍会有一个微任务的异步间隔）。

- ❌ **误区：循环中用 forEach + async 能并发执行**
  - ✅ `forEach` 不处理返回的 Promise，async 回调中的 await 只在各自的回调作用域内生效，不会等待完成。应用 `for...of` + await（串行）或 `Promise.all(array.map(async))` （并行）。

---

**🎯 面试追问**

1. **`for await...of` 是什么？**
   > 用于遍历**异步迭代器（AsyncIterator）**，每次迭代都会 await 当前值。适合处理异步数据流（如 Node.js Readable Stream）。

2. **顶层 await 有什么限制？**
   > 只能在 ESM 模块（`type="module"` 或 `.mjs`）中使用，不能在 CJS 中用。会阻塞模块的导入，直到 await 完成。

3. **如何实现 Promise 超时控制？**
   ```js
   function withTimeout(promise, ms) {
     const timeout = new Promise((_, reject) =>
       setTimeout(() => reject(new Error(`超时 ${ms}ms`)), ms)
     );
     return Promise.race([promise, timeout]);
   }
   ```

---

### Q: 深拷贝 vs 浅拷贝的区别与实现

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

- **浅拷贝**：只拷贝对象的第一层属性，嵌套对象仍然共享引用
- **深拷贝**：递归拷贝所有层级，产生完全独立的副本

```js
// 浅拷贝
const obj = { a: 1, b: { c: 2 } };
const shallow = { ...obj };  // 或 Object.assign({}, obj)
shallow.b.c = 99;
console.log(obj.b.c); // 99（b 仍然共享引用！）

// 深拷贝
const deep = JSON.parse(JSON.stringify(obj));
deep.b.c = 99;
console.log(obj.b.c); // 2（完全独立）
```

**常用浅拷贝方法：**
- `Object.assign({}, obj)`
- `{ ...obj }` 展开运算符
- `Array.prototype.slice()`
- `Array.from()`

---

**🔍 深层原理**

`JSON.parse(JSON.stringify())` 的缺陷（仅适合纯数据对象）：
- ❌ 丢失 `undefined`、`Function`、`Symbol`
- ❌ 无法处理循环引用（报错）
- ❌ 丢失 `Date` 对象（转为字符串）
- ❌ 丢失 `RegExp`、`Map`、`Set`
- ❌ 忽略不可枚举属性和原型链

---

**💻 手写深拷贝（完整版）**

```js
function deepClone(target, map = new WeakMap()) {
  // 1. 原始类型直接返回
  if (target === null || typeof target !== 'object') return target;

  // 2. 处理特殊类型
  if (target instanceof Date) return new Date(target.getTime());
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);
  if (target instanceof Map) {
    const clonedMap = new Map();
    target.forEach((val, key) => clonedMap.set(deepClone(key, map), deepClone(val, map)));
    return clonedMap;
  }
  if (target instanceof Set) {
    const clonedSet = new Set();
    target.forEach(val => clonedSet.add(deepClone(val, map)));
    return clonedSet;
  }

  // 3. 处理循环引用（WeakMap 缓存已克隆的对象）
  if (map.has(target)) return map.get(target);

  // 4. 创建同类型的空对象（保留原型）
  const cloned = Array.isArray(target) ? [] : Object.create(Object.getPrototypeOf(target));
  map.set(target, cloned); // 记录，防止循环引用

  // 5. 递归拷贝所有属性（含 Symbol）
  [...Object.keys(target), ...Object.getOwnPropertySymbols(target)].forEach(key => {
    cloned[key] = deepClone(target[key], map);
  });

  return cloned;
}

// 测试
const obj = {
  num: 1,
  str: 'hello',
  date: new Date(),
  reg: /abc/g,
  arr: [1, [2, 3]],
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3]),
  fn: function() {},   // 函数通常不拷贝（共享引用）
};
obj.circular = obj;   // 循环引用

const cloned = deepClone(obj);
cloned.arr[1][0] = 99;
console.log(obj.arr[1][0]); // 2（独立）
```

---

**⚠️ 常见误区**

- ❌ **误区：`JSON.parse(JSON.stringify())` 是万能深拷贝**
  - ✅ 对纯 JSON 数据（字符串/数字/布尔/数组/普通对象/null）可用，但会丢失函数、Date、RegExp、undefined、Symbol、循环引用等。

- ❌ **误区：展开运算符 `{...obj}` 是深拷贝**
  - ✅ 展开运算符是**浅拷贝**，嵌套对象仍共享引用。

- ❌ **误区：structuredClone 可以克隆函数**
  - ✅ ES2022 原生 `structuredClone` 支持循环引用、Date、Map、Set、ArrayBuffer 等，但**不支持函数和 DOM 节点**。

---

**🎯 面试追问**

1. **lodash 的 `_.cloneDeep` 比手写的好在哪里？**
   > 处理了更多边界情况（WeakMap/WeakSet、Buffer、各种内置类型），且经过充分测试。生产环境推荐直接用。

2. **为什么深拷贝需要用 WeakMap 而不是 Map？**
   > WeakMap 的 key 是弱引用，不阻止 GC。深拷贝完成后，map 可以被回收，避免内存泄漏。

3. **什么场景下不需要深拷贝而用浅拷贝就够了？**
   > 对象只有一层（无嵌套），或确定嵌套的引用类型不会被修改（只读数据），或使用不可变数据模式（Immutable.js、Immer.js）。

---

### Q: 防抖（Debounce）和节流（Throttle）的区别与实现

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

| 特性 | 防抖（Debounce） | 节流（Throttle） |
|---|---|---|
| 核心思路 | 最后一次触发后等待 n ms 才执行 | 固定时间间隔内最多执行一次 |
| 执行时机 | 停止触发后执行 | 均匀执行 |
| 典型场景 | 搜索框输入、窗口 resize 结束、表单验证 | 滚动监听、鼠标移动、按钮点击频控 |

```js
// 防抖：频繁触发时，只执行最后一次
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);              // 清除上一次的定时器
    timer = setTimeout(() => {
      fn.apply(this, args);           // 等待 delay ms 后执行
    }, delay);
  };
}

// 节流：固定时间间隔执行一次
function throttle(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) { // 超过间隔才执行
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

---

**🔍 深层原理**

**防抖的两种形式：**

```js
// 1. 尾部执行（默认）：停止触发后执行
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 2. 前沿执行（leading）：触发时立即执行，之后的触发忽略
function debounceLeading(fn, delay) {
  let timer = null;
  return function(...args) {
    if (!timer) {
      fn.apply(this, args); // 立即执行
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null; // 重置，允许下次触发时再次立即执行
    }, delay);
  };
}
```

**节流的两种实现（时间戳 vs 定时器）：**

```js
// 时间戳版：触发时立即执行，最后一次可能丢失
function throttleTimestamp(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// 定时器版：延迟执行，能保证最后一次触发
function throttleTimer(fn, interval) {
  let timer = null;
  return function(...args) {
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, interval);
    }
  };
}
```

---

**💻 完整代码示例（带取消功能）**

```js
// 生产级防抖（带 cancel、flush 方法）
function debounce(fn, delay, { leading = false } = {}) {
  let timer = null;
  let lastThis, lastArgs;

  function debounced(...args) {
    lastThis = this;
    lastArgs = args;

    if (leading && !timer) {
      fn.apply(this, args); // 前沿执行
    }

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!leading) {
        fn.apply(lastThis, lastArgs); // 尾部执行
      }
      timer = null;
    }, delay);
  }

  debounced.cancel = function() {
    clearTimeout(timer);
    timer = null;
  };

  debounced.flush = function() {
    if (timer) {
      fn.apply(lastThis, lastArgs);
      debounced.cancel();
    }
  };

  return debounced;
}

// 使用示例
const handleSearch = debounce(function(query) {
  console.log('搜索:', query);
}, 300);

const handleScroll = throttle(function() {
  console.log('滚动位置:', window.scrollY);
}, 100);
```

---

**⚠️ 常见误区**

- ❌ **误区：防抖和节流的作用相同，都是减少执行次数**
  - ✅ 目的相同，但行为不同。防抖是"静止后才动"（如等用户停止输入），节流是"匀速动"（如帧率控制）。

- ❌ **误区：节流在时间窗口内一次都不执行**
  - ✅ 节流保证在每个时间间隔内**至少执行一次**（时间戳版是第一次触发立即执行）。

- ❌ **误区：防抖一定比节流更省性能**
  - ✅ 取决于场景。如果用户持续操作不停止（如 mousemove），防抖可能完全不执行，而节流保证均匀执行，更可控。

---

**🎯 面试追问**

1. **React Hooks 中如何正确使用防抖/节流？**
   > 需配合 `useCallback` + `useMemo` 或使用 `useRef` 存储定时器 ID，避免每次渲染重新创建函数。推荐使用 `use-debounce`、`ahooks` 等 hooks 库封装。

2. **防抖如何实现 immediate（立即执行）模式？**
   > 第一次调用立即执行，之后的调用在 delay 期间内被抑制，delay 结束后可以再次立即执行。见上方 `debounceLeading` 实现。

3. **requestAnimationFrame 和节流有什么关系？**
   > `rAF` 天然是约 16.7ms（60fps）的节流，适合动画、滚动性能优化，不需要手写节流。优先考虑用 `rAF` 代替 `throttle(fn, 16)`。

---

### Q: ES6+ 常用新特性

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**解构赋值（Destructuring）：**

```js
// 数组解构
const [a, b, ...rest] = [1, 2, 3, 4];
const [, second] = [1, 2];          // 跳过元素
const [x = 0, y = 0] = [1];         // 默认值（x=1, y=0）

// 对象解构
const { name, age = 18 } = { name: 'Alice' }; // 默认值
const { name: alias } = { name: 'Bob' };       // 重命名
const { a: { b: deep } } = { a: { b: 42 } };  // 嵌套解构

// 函数参数解构
function greet({ name = '匿名', age = 0 } = {}) {
  return `${name}, ${age}岁`;
}
```

**Symbol（唯一值）：**

```js
const id = Symbol('id');         // 唯一标识
const s1 = Symbol('id');
const s2 = Symbol('id');
s1 === s2;                       // false（每次创建都唯一）

// 作为对象属性（不会出现在 for...in 或 Object.keys 中）
const obj = { [Symbol('key')]: 'value' };

// 全局共享 Symbol
const shared = Symbol.for('shared');  // 全局注册表，同 key 返回同一个 Symbol
Symbol.for('shared') === shared;      // true

// 内置 Symbol（元编程钩子）
class MyArray {
  [Symbol.iterator]() { /* 自定义迭代行为 */ }
}
```

**Proxy（代理/拦截）：**

```js
const handler = {
  get(target, key, receiver) {
    console.log(`读取属性: ${String(key)}`);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    if (typeof value !== 'number') throw new TypeError('必须是数字');
    return Reflect.set(target, key, value, receiver);
  }
};

const data = new Proxy({}, handler);
data.count = 1;    // 读取属性: count
data.name = 'x';   // ❌ TypeError

// Vue3 响应式原理就是基于 Proxy
```

---

**🔍 深层原理**

**Proxy vs Object.defineProperty（Vue2 vs Vue3 响应式）：**

| 特性 | Object.defineProperty | Proxy |
|---|---|---|
| 监听范围 | 单个属性 | 整个对象 |
| 数组变化 | 需要特殊处理 | 天然支持 |
| 新增属性 | 无法检测 | 可以检测 |
| 删除属性 | 无法检测 | 可以检测 |
| 性能 | 初始化时遍历所有属性 | 懒拦截（访问时才触发） |

---

**💻 完整代码示例**

```js
// 扩展运算符（Spread）
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];       // [1, 2, 3, 4, 5]（浅拷贝）
const obj2 = { ...obj1, extra: 1 }; // 合并对象

// 与 rest 参数的区别（rest 是收集，spread 是展开）
function sum(...numbers) {           // rest: 收集参数为数组
  return numbers.reduce((a, b) => a + b, 0);
}
sum(...[1, 2, 3]);                   // spread: 展开数组作为参数

// Reflect（配合 Proxy 使用）
// Reflect 提供了 Object 操作的函数式版本，是 Proxy 拦截的对应操作
Reflect.get(obj, 'key');            // obj['key']
Reflect.set(obj, 'key', value);     // obj['key'] = value
Reflect.has(obj, 'key');            // 'key' in obj
Reflect.deleteProperty(obj, 'key'); // delete obj['key']

// 可选链和空值合并（ES2020）
const city = user?.address?.city ?? '未知城市';
const fn = obj?.method?.();         // 如果 method 不是函数，不报错，返回 undefined
```

---

**⚠️ 常见误区**

- ❌ **误区：扩展运算符 `...` 是深拷贝**
  - ✅ 扩展运算符和 Object.assign 都是**浅拷贝**。

- ❌ **误区：Symbol 可以用 `+` 拼接字符串**
  - ✅ Symbol 不能隐式转换为字符串，`'id:' + Symbol('id')` 会抛 TypeError，需要用模板字符串 `` `${symbol.toString()}` `` 或显式 `.toString()`。

- ❌ **误区：Proxy 的 handler 里可以不用 Reflect**
  - ✅ 直接操作 target（如 `target[key]`）在某些情况下会丢失 receiver（比如 `get` 拦截 getter 时 `this` 指向），应始终用 `Reflect.*` 保持语义正确。

---

**🎯 面试追问**

1. **Symbol.iterator 的作用是什么？**
   > 定义对象的默认迭代行为，让对象可以被 `for...of`、扩展运算符、解构等消费。实现了 Symbol.iterator 的对象叫**可迭代对象（Iterable）**。

2. **Proxy 有哪些常见的 trap（拦截器）？**
   > `get/set/has/deleteProperty/apply`（函数调用）`construct`（new操作）`ownKeys/getPrototypeOf` 等，共13种。

3. **WeakRef 和 FinalizationRegistry 是什么？**
   > ES2021 新增，`WeakRef` 持有对象的弱引用（不阻止 GC），`FinalizationRegistry` 在对象被 GC 后执行回调。可用于高级内存管理，如 cache 的自动失效。

---

### Q: 垃圾回收机制（标记清除 vs 引用计数）

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

JS 引擎（V8）通过**垃圾回收（GC）**自动管理内存，开发者无需手动 malloc/free。

**两种主要算法：**

| 算法 | 原理 | 优点 | 缺点 |
|---|---|---|---|
| **引用计数** | 记录每个对象的引用数，降为0时回收 | 及时回收，可预测 | 无法处理**循环引用** |
| **标记清除** | 从根出发遍历所有可达对象打标记，清除无标记的 | 解决循环引用 | 需要暂停（Stop-the-world） |

现代 V8 使用**分代式垃圾回收**：

```
V8 内存结构（堆）：

┌──────────────────────────────────────────────────┐
│                    堆（Heap）                    │
│                                                  │
│  ┌─────────────────┐   ┌──────────────────────┐  │
│  │   新生代（Young）│   │    老生代（Old）      │  │
│  │  From空间 To空间 │   │  存活时间长的对象    │  │
│  │  ~1-8MB         │   │  标记-清除/整理       │  │
│  │  Scavenge 算法   │   │                      │  │
│  └─────────────────┘   └──────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

**🔍 深层原理**

**标记清除（Mark and Sweep）：**
1. **标记阶段**：从 GC Root（全局对象、调用栈中的变量）出发，DFS 遍历所有可达对象，打上"存活"标记
2. **清除阶段**：遍历堆，回收所有未标记（不可达）的对象

**V8 的优化（增量标记、并发 GC）：**
- 传统标记清除需要暂停 JS（Stop-the-world），导致卡顿
- V8 采用**增量标记（Incremental Marking）**：将标记工作分成多个小步骤，与 JS 执行交替进行
- **并发 GC**：在后台线程执行部分 GC 工作，减少主线程暂停时间

**引用计数的循环引用问题：**

```js
// 循环引用导致引用计数无法回收（旧 IE 的内存泄漏来源）
function createCycle() {
  let a = {};
  let b = {};
  a.ref = b;  // a 引用 b，b 的计数 +1
  b.ref = a;  // b 引用 a，a 的计数 +1
  // 函数结束，a 和 b 的局部引用消失，但它们互相引用，计数都是 1
  // 标记清除算法：从根出发找不到 a 和 b，标记为不可达，正常回收
}
```

---

**💻 常见内存泄漏场景**

```js
// 1. 意外全局变量
function leak() {
  leakedVar = 'I am global'; // 没有 var/let/const，创建了全局变量
}

// 2. 未清除的定时器
let timer = setInterval(() => {
  // timer 持有的回调持有外部变量的引用，导致无法 GC
  doSomething();
}, 1000);
// ✅ 修复：clearInterval(timer); 用完即清

// 3. 闭包持有大对象
function createLeak() {
  const bigData = new Array(1000000).fill('*');
  return () => bigData.length; // 闭包持有 bigData，无法释放
}
// ✅ 修复：只保留需要的数据，不要在闭包中引用整个大对象

// 4. 未移除的事件监听器
const el = document.getElementById('btn');
el.addEventListener('click', expensiveHandler);
// ✅ 修复：el.removeEventListener('click', expensiveHandler);

// 5. DOM 引用泄漏
const elements = [];
function addElement() {
  const el = document.createElement('div');
  elements.push(el); // JS 数组持有引用
  document.body.appendChild(el);
}
document.body.innerHTML = '';  // DOM 中删了，但 elements 数组还持有引用
```

---

**⚠️ 常见误区**

- ❌ **误区：JS 有 GC 就不用担心内存问题**
  - ✅ GC 只能回收"不可达"的对象。如果代码中意外保持了对对象的引用（全局变量、闭包、事件监听器），GC 就无法回收，仍会造成内存泄漏。

- ❌ **误区：置 null 就能立即释放内存**
  - ✅ `obj = null` 只是断开引用，让对象变为可回收，实际回收时机由 GC 决定，不是立即发生。

---

**🎯 面试追问**

1. **WeakMap/WeakSet 为何有助于避免内存泄漏？**
   > 它们对存储的对象持**弱引用**，不会阻止 GC 回收这些对象。当对象只被 WeakMap/WeakSet 引用时，GC 仍然可以回收它，WeakMap 的条目也随之消失。

2. **如何用 Chrome DevTools 排查内存泄漏？**
   > 1) Memory → Heap Snapshot：对比操作前后的快照，找增长的对象。2) Memory → Allocation Instrumentation：记录内存分配时间线。3) Performance → Memory：观察堆内存增长趋势。

3. **V8 的新生代和老生代垃圾回收有什么区别？**
   > 新生代：小内存（1-8MB），频繁 GC，用 Scavenge（复制算法）；老生代：大内存，用标记-清除+标记-整理，GC 频率低。对象在新生代经历两次 GC 存活后晋升到老生代。

---

### Q: 原型链继承的几种方式

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**1. 原型链继承**

```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return `${this.name} speaks`; };

function Dog() {}
Dog.prototype = new Animal('Generic'); // ❌ 问题：引用属性共享，无法传参

const d1 = new Dog();
const d2 = new Dog();
```

**2. 构造函数继承（盗用构造函数）**

```js
function Dog(name, breed) {
  Animal.call(this, name); // 继承属性，但无法继承原型方法
}
const d = new Dog('Rex', 'Labrador');
// d.speak → ❌ 方法不可用（Animal.prototype 上的方法没继承）
```

**3. 组合继承（最常用，但调用两次父构造函数）**

```js
function Dog(name, breed) {
  Animal.call(this, name); // 继承属性（第1次调用）
  this.breed = breed;
}
Dog.prototype = new Animal(); // 继承方法（第2次调用）⚠️ 多余
Dog.prototype.constructor = Dog;
```

**4. 寄生组合继承（最优方案）**

```js
function Dog(name, breed) {
  Animal.call(this, name); // 继承属性
  this.breed = breed;
}
// 关键：用 Object.create 代替 new Animal()，避免第2次调用父构造函数
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function() { return 'Woof!'; };

const d = new Dog('Rex', 'Labrador');
d.speak(); // 'Rex speaks'（继承自 Animal.prototype）
d.bark();  // 'Woof!'（自有方法）
```

**5. ES6 class（语法糖，推荐）**

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} speaks`; }
  static create(name) { return new Animal(name); } // 静态方法
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);          // 必须先调用 super()，初始化 this
    this.breed = breed;
  }
  bark() { return 'Woof!'; }
  speak() {               // 方法重写
    return super.speak() + ' and barks!'; // 调用父类方法
  }
}

const d = new Dog('Rex', 'Labrador');
d instanceof Dog;    // true
d instanceof Animal; // true
```

---

**🔍 深层原理**

`class` 的底层仍然是原型链，只是语法糖。`extends` 的本质就是**寄生组合继承**。

`super` 有两种使用场景：
1. 构造函数中 `super(args)` → 调用父类构造函数
2. 方法中 `super.method()` → 调用父类原型上的方法

---

**⚠️ 常见误区**

- ❌ **误区：`class` 是真正的类，和 Java/C++ 的类一样**
  - ✅ `class` 只是原型继承的语法糖，底层还是原型链。但有一些差异（如 `class` 内部始终是严格模式，`class` 不能被普通调用）。

- ❌ **误区：`extends` 后子类的 `this` 和普通函数继承一样**
  - ✅ ES6 class 中，子类在 `super()` 调用之前**不存在 `this`**（由父类创建 this），这与构造函数继承（子类自己创建 this 再 call 父类）有本质区别。

---

**🎯 面试追问**

1. **为什么 `super()` 必须在子类构造函数中使用 `this` 之前调用？**
   > ES6 class 的设计：子类的实例由**父类构造函数**创建（这与 ES5 组合继承不同），调用 `super()` 相当于让父类初始化 `this`，在此之前 `this` 是未初始化状态，访问会抛 ReferenceError。

2. **如何实现多继承（Mixin 模式）？**
   ```js
   const Flyable = (Base) => class extends Base {
     fly() { return 'flying'; }
   };
   const Swimmable = (Base) => class extends Base {
     swim() { return 'swimming'; }
   };
   class Duck extends Flyable(Swimmable(Animal)) {}
   new Duck().fly();   // 'flying'
   new Duck().swim();  // 'swimming'
   ```

3. **`Object.create()` 和 `new` 的区别？**
   > `Object.create(proto)` 创建以 proto 为原型的新对象，不调用构造函数；`new Ctor()` 创建以 `Ctor.prototype` 为原型的新对象，并调用构造函数。

---

### Q: 模块化——ESM 和 CommonJS 的核心差异

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 特性 | ESM（ES Modules） | CommonJS（CJS） |
|---|---|---|
| 规范 | ES2015 标准 | Node.js 实现 |
| 加载方式 | **静态**（编译时分析） | **动态**（运行时加载） |
| 导出 | 绑定（live binding） | 值拷贝 |
| 循环依赖 | 支持（部分初始化） | 支持（可能 undefined） |
| `this` | `undefined`（模块顶层） | `module.exports` |
| Tree-shaking | ✅（静态分析可优化） | ❌（难以静态分析） |
| 异步加载 | 支持（`import()`） | ❌ |

```js
// ESM
export const name = 'Alice';           // 具名导出
export default function greet() {}     // 默认导出
export { name as alias };              // 重命名导出

import { name } from './module.js';    // 静态导入（顶层）
import('./module.js').then(m => m.fn); // 动态导入

// CommonJS
module.exports = { name: 'Alice' };    // 导出对象
exports.fn = function() {};            // 添加属性

const { name } = require('./module'); // 同步加载
```

---

**🔍 深层原理**

**ESM Live Binding（实时绑定）：**

```js
// counter.mjs
export let count = 0;
export function increment() { count++; }

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1（ESM 导出的是绑定，实时反映变量变化）

// CommonJS 等价（值拷贝，不反映变化）
// const { count, increment } = require('./counter');
// increment();
// console.log(count); // 仍然是 0！（只拿到了值的拷贝）
```

**循环依赖处理：**

```js
// ESM 循环依赖（允许但要注意初始化时序）
// a.mjs: import { b } from './b.mjs'; export const a = 'A';
// b.mjs: import { a } from './a.mjs'; export const b = 'B';
// ESM 会等两个模块都解析完再执行，通过 TDZ 保护未初始化的导出

// CJS 循环依赖（返回部分 exports 对象）
// a.js: const b = require('./b'); module.exports = { a: 'A' };
// b.js: const a = require('./a'); // 此时 a.js 还未执行完，a 是 {}（空对象）
```

---

**⚠️ 常见误区**

- ❌ **误区：ESM 和 CJS 可以随意混用**
  - ✅ 两者可以互操作，但有规则：CJS 可以 `require` ESM（需要用 `createRequire` 或特殊处理），ESM 可以 `import` CJS（被视为默认导出）。直接混用会报错。

- ❌ **误区：`import` 和 `require` 只是语法不同**
  - ✅ 有本质区别：`import` 是静态声明（必须在顶层，编译时处理）；`require` 是函数调用（可以在任意位置，运行时执行）。

- ❌ **误区：默认导出 `export default` 也是实时绑定**
  - ✅ 默认导出是值的绑定，修改模块内的变量不会影响默认导出（因为 default 导出相当于 `export default value`，是当时的值）。

---

**🎯 面试追问**

1. **Webpack 如何处理 ESM 的 Tree-shaking？**
   > Webpack 通过静态分析 ESM 的 import/export，标记未被使用的导出（dead code），然后在生成代码时通过 Terser 等工具删除这些标记的代码。CJS 由于动态加载特性，无法进行静态分析，Tree-shaking 效果差。

2. **`import()` 动态导入的使用场景？**
   > 路由懒加载（按需加载页面组件）、条件加载（根据用户权限加载模块）、大型模块的延迟加载。返回 Promise，支持 `await`。

3. **package.json 中的 `type: "module"` 和 `exports` 字段有什么作用？**
   > `"type": "module"` 使 `.js` 文件默认按 ESM 处理（否则默认 CJS）。`exports` 字段定义包的导出点，支持条件导出（如 `import` 条件走 ESM，`require` 条件走 CJS），实现双模块兼容包。

---

### Q: WeakMap 和 WeakSet 的应用场景

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

`WeakMap` 和 `WeakSet` 是**弱引用**集合，它们对键（WeakMap）或值（WeakSet）的引用不阻止 GC 回收。

| 特性 | Map | WeakMap |
|---|---|---|
| 键类型 | 任意值 | 只能是**对象或非注册Symbol**（ES2023+） |
| 引用类型 | 强引用 | **弱引用** |
| 可遍历 | ✅（iterable） | ❌（non-iterable） |
| 键可以是原始值 | ✅ | ❌ |
| size 属性 | ✅ | ❌ |

```js
// WeakMap 基本用法
const wm = new WeakMap();
let obj = {};
wm.set(obj, 'some data');
wm.get(obj);   // 'some data'
wm.has(obj);   // true
obj = null;    // 解除对象引用
// obj 可以被 GC 回收，WeakMap 中对应的条目自动消失
```

---

**🔍 深层原理**

WeakMap 之所以不可遍历，是因为 GC 的时机不确定，如果允许遍历，会出现键在遍历过程中被 GC 的竞态问题，也会让 GC 算法复杂化。

**应用场景：**

```js
// 1. 存储对象的私有数据（不污染对象本身）
const privateData = new WeakMap();

class Person {
  constructor(name, age) {
    privateData.set(this, { name, age }); // 私有数据与实例关联
  }
  getName() { return privateData.get(this).name; }
  getAge()  { return privateData.get(this).age; }
}
// 当 Person 实例被 GC 时，WeakMap 中对应的私有数据也会被回收

// 2. DOM 节点关联数据（避免 DOM 泄漏）
const domDataCache = new WeakMap();
function setDomData(el, data) {
  domDataCache.set(el, data); // el 被从 DOM 删除后，可被 GC，cache 自动清理
}

// 3. 深拷贝时的循环引用检测（前文 deepClone 中用到）
function deepClone(target, map = new WeakMap()) {
  if (map.has(target)) return map.get(target);
  // ...
}

// 4. WeakSet：标记对象是否已处理（去重）
const processed = new WeakSet();
function process(obj) {
  if (processed.has(obj)) return; // 已处理，跳过
  processed.add(obj);
  // 处理逻辑...
}
// obj 不再被引用后，WeakSet 中的标记自动清除
```

---

**⚠️ 常见误区**

- ❌ **误区：WeakMap 是 Map 的性能优化版**
  - ✅ 它们解决的问题不同。WeakMap 是为了**避免内存泄漏**（弱引用），而不是为了性能。Map 功能更全（可遍历、可获取 size）。

- ❌ **误区：WeakMap 的键随时可能消失，不安全**
  - ✅ 只要持有对键对象的强引用，WeakMap 中的条目就不会消失。WeakMap 的键消失，意味着你已经没有其他地方引用那个对象了，所以不存在"突然消失"的问题。

---

**🎯 面试追问**

1. **为什么 WeakMap 的键不能是原始值（如字符串、数字）？**
   > 原始值不是对象，不由堆管理，GC 无法追踪其生命周期，弱引用对原始值没有意义。

2. **Vue3 的响应式系统中 WeakMap 的用途？**
   > Vue3 用 `WeakMap<target, Map<key, Set<effect>>>` 存储响应式依赖关系，当响应式对象被 GC 时，相关的依赖映射也自动清理，避免内存泄漏。

3. **WeakRef 和 WeakMap 有什么关系？**
   > 都是弱引用机制。WeakMap 隐式持有弱引用（作为键）；WeakRef 是显式的弱引用包装器，可以通过 `.deref()` 获取对象（如果已被 GC 则返回 undefined）。

---

### Q: Generator 和 Iterator 协议

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

**Iterator 协议（迭代器协议）：**

任何拥有 `[Symbol.iterator]()` 方法（返回迭代器）的对象都是**可迭代对象（Iterable）**。迭代器是一个拥有 `next()` 方法（返回 `{ value, done }`）的对象。

```js
// 手动实现迭代器
function createRange(start, end) {
  let current = start;
  return {
    // 这个对象既是 Iterable 又是 Iterator（自引用）
    [Symbol.iterator]() { return this; },
    next() {
      if (current <= end) {
        return { value: current++, done: false };
      }
      return { value: undefined, done: true };
    }
  };
}

const range = createRange(1, 3);
for (const n of range) console.log(n); // 1 2 3
[...createRange(1, 5)]; // [1, 2, 3, 4, 5]（扩展运算符消费迭代器）
```

**Generator（生成器）：**

Generator 函数（`function*`）自动实现了 Iterator 协议，是创建迭代器的便捷方式。

```js
function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i; // 暂停，返回值，等待 next() 恢复
  }
}

const gen = range(1, 3);
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
gen.next(); // { value: undefined, done: true }

for (const n of range(1, 3)) console.log(n); // 1 2 3
```

---

**🔍 深层原理**

**Generator 的状态机本质：**

Generator 函数的执行被 `yield` 分割成多个**暂停点**，每次 `.next(value)` 恢复执行，`value` 会成为上一个 `yield` 表达式的返回值。

```js
function* twoWayComm() {
  const x = yield 'first yield';   // 暂停1：向外输出 'first yield'，等待输入
  const y = yield 'second yield';  // 暂停2：向外输出 'second yield'，等待输入
  return x + y;                    // 返回最终值
}

const gen = twoWayComm();
gen.next();        // { value: 'first yield', done: false }（启动，到达第1个yield）
gen.next(10);      // { value: 'second yield', done: false }（x=10，到达第2个yield）
gen.next(20);      // { value: 30, done: true }（y=20，return 10+20=30）
```

**Generator 实现无限序列（惰性求值）：**

```js
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) { // 无限循环！但 yield 使其惰性
    yield a;
    [a, b] = [b, a + b];
  }
}

function take(n, iterable) {
  const result = [];
  for (const val of iterable) {
    result.push(val);
    if (result.length === n) break; // 取够了就停
  }
  return result;
}

take(8, fibonacci()); // [0, 1, 1, 2, 3, 5, 8, 13]（只计算了需要的值）
```

---

**💻 完整代码示例（Generator 实现 async/await）**

```js
// Generator 配合 Promise 的自动执行器（简化版 co）
function co(generatorFn) {
  return new Promise((resolve, reject) => {
    const gen = generatorFn();
    function step(nextFn) {
      let result;
      try { result = nextFn(); } catch (e) { return reject(e); }
      if (result.done) return resolve(result.value);
      Promise.resolve(result.value).then(
        val => step(() => gen.next(val)),
        err => step(() => gen.throw(err))
      );
    }
    step(() => gen.next(undefined));
  });
}

// 使用
co(function*() {
  const user = yield fetch('/api/user').then(r => r.json());
  const posts = yield fetch(`/api/posts/${user.id}`).then(r => r.json());
  return { user, posts };
}).then(data => console.log(data));
// 这就是 async/await 的原型！
```

---

**⚠️ 常见误区**

- ❌ **误区：Generator 函数调用后立即执行函数体**
  - ✅ `generatorFn()` 返回迭代器对象但**不执行任何代码**，需要调用 `.next()` 才开始执行到第一个 `yield`。

- ❌ **误区：`yield` 只能在 `function*` 中使用**
  - ✅ 确实如此。`yield` 是 Generator 专属语法，不能在普通函数、箭头函数中使用（即使它们在 Generator 函数内部）。

---

**🎯 面试追问**

1. **`yield*` 的作用是什么？**
   > `yield*` 委托给另一个可迭代对象，相当于展开并逐一 yield 其值。可以用于 Generator 的组合（嵌套 Generator）。

2. **Generator 有哪些实际应用？**
   > async/await 的底层实现（Babel 转译）、Redux-Saga（用 Generator 管理副作用）、无限序列/惰性数据流、协程/调度器实现。

3. **如何提前终止 Generator？**
   > 调用 `gen.return(value)` 强制终止，将 done 设为 true；或调用 `gen.throw(error)` 向 Generator 内部注入错误（如果没有 try-catch 会抛出）。

---

### Q: 正则表达式常见用法与原理

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**核心元字符：**

| 元字符 | 含义 | 示例 |
|---|---|---|
| `.` | 任意字符（除换行） | `a.b` 匹配 `axb` |
| `*` | 0次或多次（贪婪） | `a*` |
| `+` | 1次或多次（贪婪） | `a+` |
| `?` | 0次或1次（或使量词非贪婪） | `a?`、`a+?` |
| `^` | 字符串开头（或取反字符类） | `^abc`、`[^abc]` |
| `$` | 字符串结尾 | `abc$` |
| `\d` | 数字 `[0-9]` | `\d+` |
| `\w` | 字母/数字/下划线 `[a-zA-Z0-9_]` | `\w+` |
| `\s` | 空白字符 | `\s+` |
| `{n,m}` | 重复 n-m 次 | `\d{3,5}` |
| `()` | 捕获组 | `(abc)+` |
| `(?:)` | 非捕获组 | `(?:abc)+` |
| `(?=)` | 正向前瞻 | `\d+(?=px)` |
| `(?!)` | 负向前瞻 | `\d+(?!px)` |

```js
// 常用场景
const email = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phone = /^1[3-9]\d{9}$/;          // 中国手机号
const url   = /^https?:\/\/[^\s]+$/;
const ipv4  = /^(\d{1,3}\.){3}\d{1,3}$/;

// test、match、replace、split
'test@email.com'.match(email); // 匹配结果数组（或 null）
email.test('test@email.com');  // true（性能比 match 好）
'hello world'.replace(/\s+/g, '-');     // 'hello-world'
'a1b2c3'.split(/\d/);                   // ['a', 'b', 'c', '']
```

---

**🔍 深层原理**

**贪婪 vs 懒惰（非贪婪）匹配：**

```js
const html = '<div>Hello</div><div>World</div>';

// 贪婪（默认）：尽可能多匹配
html.match(/<div>.*<\/div>/)[0];    // '<div>Hello</div><div>World</div>'（全部）

// 非贪婪（加 ?）：尽可能少匹配
html.match(/<div>.*?<\/div>/)[0];   // '<div>Hello</div>'（第一个）
html.match(/<div>.*?<\/div>/g);     // ['<div>Hello</div>', '<div>World</div>']
```

**捕获组与命名捕获组：**

```js
// 捕获组（用 \1 反向引用）
const date = '2024-03-15';
const [, year, month, day] = date.match(/(\d{4})-(\d{2})-(\d{2})/);
// year='2024', month='03', day='15'

// 命名捕获组（ES2018）
const { groups: { y, m, d } } = date.match(/(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/);

// 替换中使用捕获组
'John Smith'.replace(/(\w+) (\w+)/, '$2 $1'); // 'Smith John'
'2024-03-15'.replace(/(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/, '$<d>/$<m>/$<y>');
// '15/03/2024'
```

---

**💻 完整代码示例**

```js
// 1. 标志（flags）
const re = /pattern/gims;
// g: global（全局匹配，不加则只匹配第一个）
// i: ignoreCase（忽略大小写）
// m: multiline（^ $ 匹配每行开头/结尾）
// s: dotAll（. 匹配换行符）

// 2. 前瞻（lookahead）
'100px 200em 300px'.match(/\d+(?=px)/g);   // ['100', '300']（后面跟 px 的数字）
'100px 200em'.match(/\d+(?!px)/g);         // ['200'] + 部分匹配，谨慎使用

// 3. 字符串方法 vs 正则方法的性能
// matchAll（ES2020）— 返回所有匹配（含捕获组）
const str = 'cat bat sat';
const iter = str.matchAll(/([cbsk])at/g);
[...iter].map(m => m[1]); // ['c', 'b', 's']

// 4. 动态构建正则
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义特殊字符
}
function searchAndHighlight(text, keyword) {
  const re = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

// 5. 常用正则片段
const patterns = {
  chineseChar: /[\u4e00-\u9fa5]/,         // 中文字符
  htmlTag: /<[^>]+>/g,                    // HTML 标签
  trimSpaces: /^\s+|\s+$/g,               // 首尾空白（等同 .trim()）
  camelToKebab: /([A-Z])/g,               // camelCase 转 kebab-case
  numberWithCommas: /\B(?=(\d{3})+(?!\d))/g, // 数字千分位
};

// 千分位格式化
'1234567'.replace(patterns.numberWithCommas, ','); // '1,234,567'
```

---

**⚠️ 常见误区**

- ❌ **误区：`/pattern/` 和 `new RegExp('pattern')` 完全相同**
  - ✅ 字面量的 `\d` 等转义字符直接有效，但 `new RegExp` 构造器接受字符串，需要双重转义：`new RegExp('\\d+')` 等同于 `/\d+/`。

- ❌ **误区：带 `g` 标志的正则可以重复使用 `.test()`**
  - ✅ 带 `g` 的正则有 `lastIndex` 状态，每次 `.test()` 或 `.exec()` 后 lastIndex 都会更新，可能导致下次匹配结果不符合预期。最好重新创建正则或手动重置 `re.lastIndex = 0`。

- ❌ **误区：正则 `.` 可以匹配任何字符**
  - ✅ 默认 `.` 不匹配换行符 `\n`、`\r`、`\u2028`、`\u2029`。需要加 `s`（dotAll）标志才能匹配换行符。

---

**🎯 面试追问**

1. **如何高效地在大量字符串中进行模式匹配？**
   > 避免在循环中重复创建 RegExp 对象，提前编译并复用。对于简单固定字符串匹配，`indexOf` 或 `includes` 比正则快。使用 `lastIndex` 控制起始位置可避免不必要的全局搜索。

2. **正则的回溯（Backtracking）是什么？如何避免灾难性回溯？**
   > 当正则匹配失败时，引擎会"回溯"尝试其他可能的匹配路径。如 `(a+)+b` 匹配 `aaaa!` 时，指数级回溯会导致 ReDoS（正则拒绝服务）攻击。应避免嵌套量词、使用原子组或占有量词（JS 不支持，但 ES2022 支持 possessive quantifiers via `\d++`），或使用固定结构代替模糊匹配。

3. **ES2018 之后正则有哪些新特性？**
   > 命名捕获组 `(?<name>...)`；后行断言 `(?<=...)` 和 `(?<!...)`；Unicode 属性转义 `\p{L}` 等（需加 `u` 标志）；`s`（dotAll）标志。

---

