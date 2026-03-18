# JS 数据类型深入

> 参考：掘金「神三元」原生JS灵魂之问（上）

## 面试高频考点

- JS 有哪些数据类型？原始类型和引用类型的区别？
- typeof 和 instanceof 的区别？如何准确判断类型？
- == 和 === 的区别？隐式类型转换规则？
- 0.1 + 0.2 为什么不等于 0.3？
- null 是对象吗？

---

## 一、数据类型分类

### 原始类型（7 种）

```
boolean、null、undefined、number、string、symbol、bigint
```

### 引用类型

```
Object（包含：普通对象、数组、函数、正则、日期、Map、Set 等）
```

### 核心区别

| 对比项 | 原始类型 | 引用类型 |
| --- | --- | --- |
| 存储位置 | 栈内存 | 堆内存（栈中存引用地址） |
| 赋值方式 | 值拷贝 | 引用拷贝 |
| 比较方式 | 值比较 | 引用地址比较 |
| 可变性 | 不可变 | 可变 |

```js
// 原始类型：值拷贝
let a = 1;
let b = a;
b = 2;
console.log(a); // 1，a 不受影响

// 引用类型：引用拷贝
let obj1 = { x: 1 };
let obj2 = obj1;
obj2.x = 2;
console.log(obj1.x); // 2，obj1 被影响了
```

---

## 二、类型判断方法

### typeof

```js
typeof 1          // 'number'
typeof '1'        // 'string'
typeof true       // 'boolean'
typeof undefined  // 'undefined'
typeof Symbol()   // 'symbol'
typeof 1n         // 'bigint'
typeof function(){} // 'function'

// ⚠️ 特殊情况
typeof null       // 'object'（历史遗留 Bug）
typeof []         // 'object'
typeof {}         // 'object'
```

### instanceof（基于原型链）

```js
[] instanceof Array   // true
[] instanceof Object  // true（Array 继承自 Object）
'str' instanceof String // false（原始类型不是对象实例）

// 手写 instanceof
function myInstanceof(left, right) {
  if (typeof left !== 'object' || left === null) return false;
  let proto = Object.getPrototypeOf(left);
  while (true) {
    if (proto === null) return false;
    if (proto === right.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
}
```

### Object.prototype.toString（最准确）

```js
const getType = (val) => Object.prototype.toString.call(val).slice(8, -1).toLowerCase();

getType(1)          // 'number'
getType('str')      // 'string'
getType(null)       // 'null'
getType(undefined)  // 'undefined'
getType([])         // 'array'
getType({})         // 'object'
getType(/reg/)      // 'regexp'
getType(new Date()) // 'date'
```

---

## 三、隐式类型转换规则

### == 的转换规则

```
1. 两边类型相同 → 直接比较值
2. null == undefined → true（特殊规定）
3. 一方是 Number，另一方是 String → String 转 Number
4. 一方是 Boolean → Boolean 转 Number
5. 一方是 Object，另一方是原始类型 → Object 调用 valueOf/toString 转原始类型
```

```js
// 经典面试题
[] == ![]  // true
// 分析：![] → false → 0；[] → '' → 0；0 == 0 → true

null == undefined  // true
null == 0          // false
null == false      // false

// 如何让 if(a == 1 && a == 2) 成立？
var a = {
  value: 0,
  valueOf() {
    return ++this.value;
  }
};
console.log(a == 1 && a == 2); // true
```

### 对象转原始类型（ToPrimitive）

```js
// 优先级：Symbol.toPrimitive > valueOf > toString
var obj = {
  valueOf() { return 4; },
  toString() { return '5'; },
  [Symbol.toPrimitive]() { return 6; }
};
console.log(obj + 1); // 7（Symbol.toPrimitive 优先）
```

---

## 四、经典问题解析

### null 是对象吗？

```js
typeof null // 'object'
```

不是对象。这是 JS 的历史遗留 Bug。在 JS 最初版本中，用 32 位系统存储变量类型，000 开头代表对象，而 null 全为零，被错误判断为 object。

### 0.1 + 0.2 为什么不等于 0.3？

```js
0.1 + 0.2 === 0.3 // false
0.1 + 0.2         // 0.30000000000000004
```

原因：JS 使用 IEEE 754 双精度浮点数，0.1 和 0.2 转为二进制时会无限循环，存储时被截断，导致精度丢失。

解决方案：

```js
// 方案一：toFixed
(0.1 + 0.2).toFixed(1) === '0.3' // true

// 方案二：乘以精度倍数再除
(0.1 * 10 + 0.2 * 10) / 10 === 0.3 // true

// 方案三：Number.EPSILON 误差范围
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON // true

// 方案四：使用 decimal.js 等库
```

### '1'.toString() 为什么可以调用？

```js
// 执行过程：
var s = new Object('1'); // 创建包装对象
s.toString();            // 调用方法
s = null;                // 立即销毁
```

这体现了**基本包装类型**的性质：对原始类型调用方法时，JS 引擎会临时创建对应的包装对象，方法调用完毕后立即销毁。

### BigInt

```js
// 用于处理超过 Number.MAX_SAFE_INTEGER 的整数
const big = 9007199254740995n; // 末尾加 n
const big2 = BigInt('9007199254740995');

// 注意：不能与 Number 混合运算
10n + 10; // TypeError
10n + BigInt(10); // 20n
```

---

## 五、现代数组与对象 API（ES2022+）

### 数组新方法

```js
// Array.prototype.at() — 支持负索引（ES2022）
const arr = [1, 2, 3, 4, 5]
arr.at(0)   // 1
arr.at(-1)  // 5（最后一个，等同于 arr[arr.length - 1]）
arr.at(-2)  // 4

// findLast / findLastIndex — 从末尾开始查找（ES2023）
const nums = [1, 2, 3, 4, 3, 5]
nums.findLast(n => n === 3)      // 3（找到最后一个 3）
nums.findLastIndex(n => n === 3) // 4（最后一个 3 的索引）

// 不可变数组方法 — 返回新数组，不修改原数组（ES2023）
const original = [3, 1, 2]

original.toSorted()           // [1, 2, 3]，原数组不变
original.toSorted((a, b) => b - a) // [3, 2, 1]，降序

original.toReversed()         // [2, 1, 3]，原数组不变

original.toSpliced(1, 1, 10)  // [3, 10, 2]，原数组不变
// 对比：original.splice(1, 1, 10) 会修改原数组

original.with(0, 99)          // [99, 1, 2]，修改指定索引，返回新数组
// 对比：original[0] = 99 会修改原数组

console.log(original) // [3, 1, 2] — 始终不变 ✅
```

**面试考点**：为什么要有不可变数组方法？函数式编程/Redux 要求数据不可变；Vue3/React 的响应式需要检测数组变化（直接修改 vs 返回新引用）。

### Object 新方法

```js
// Object.hasOwn() — 替代 hasOwnProperty（ES2022）
const obj = { name: 'Alice' }

// ❌ 旧方式：可能被覆盖
obj.hasOwnProperty('name')              // true
Object.prototype.hasOwnProperty.call(obj, 'name') // 更安全但繁琐

// ✅ 新方式：更简洁、更安全（即使对象没有原型也有效）
Object.hasOwn(obj, 'name')    // true
Object.hasOwn(obj, 'age')     // false

// 对 Object.create(null) 创建的纯对象也有效
const pureObj = Object.create(null)
pureObj.x = 1
Object.hasOwn(pureObj, 'x')   // true ✅
// pureObj.hasOwnProperty('x') // ❌ 会报错，因为没有原型

// Object.groupBy() — 分组（ES2024）
const people = [
  { name: 'Alice', dept: 'eng' },
  { name: 'Bob', dept: 'design' },
  { name: 'Charlie', dept: 'eng' },
]

const byDept = Object.groupBy(people, p => p.dept)
// {
//   eng: [{ name: 'Alice', ... }, { name: 'Charlie', ... }],
//   design: [{ name: 'Bob', ... }]
// }

// Map.groupBy() — 当 key 需要是非字符串类型时使用
const grouped = Map.groupBy(people, p => p.dept)
grouped.get('eng') // [{...}, {...}]
```

---

## 六、Symbol 的使用场景

```js
// 1. 作为对象的唯一属性键，避免命名冲突
const id = Symbol('id');
const user = {
  name: '张三',
  [id]: 123 // 不会与其他属性冲突
};

// 2. 定义常量，保证唯一性
const STATUS = {
  PENDING: Symbol('pending'),
  FULFILLED: Symbol('fulfilled'),
  REJECTED: Symbol('rejected')
};

// 3. 内置 Symbol（Symbol.iterator、Symbol.toPrimitive 等）
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
          : { done: true };
      }
    };
  }
}
for (const n of new Range(1, 5)) {
  console.log(n); // 1 2 3 4 5
}
```

---

## 七、Map / Set 遍历方式对比

### Map 遍历

```js
const map = new Map([['name', '张三'], ['age', 20]]);

// ✅ for...of（推荐，可解构键值对）
for (const [key, value] of map) {
  console.log(key, value);
}

// ✅ forEach（注意：value 在前，key 在后，与普通 forEach 相反！）
map.forEach((value, key) => {
  console.log(key, value);
});

// ❌ for...in：无输出！Map 的键值对不是普通对象属性
for (const key in map) {
  console.log(key); // 什么都不会打印
}

// 转数组操作
[...map.keys()]     // ['name', 'age']
[...map.values()]   // ['张三', 20]
[...map.entries()]  // [['name','张三'], ['age',20]]
```

### Set 遍历

```js
const set = new Set([1, 2, 3]);

for (const item of set) { console.log(item); }
set.forEach(value => { console.log(value); });
[...set] // 转数组
```

### for...in vs for...of 核心区别

| 特性 | for...in | for...of |
|------|----------|----------|
| 遍历目标 | 对象的**可枚举属性** | **可迭代对象**的元素 |
| 适用类型 | 普通对象 | Map/Set/数组/字符串等 |
| 遍历 Map | ❌ 无输出 | ✅ 正常遍历键值对 |
| 遍历数组 | 遍历下标（字符串形式） | 遍历元素值 |
| 原型链属性 | 会遍历到（需 hasOwnProperty 过滤） | 不会 |

---

## 八、JS 截取 / 分割方法对比

| 方法 | 适用对象 | 返回值 | 是否修改原对象 | 特殊说明 |
|------|----------|--------|---------------|----------|
| `slice(start, end)` | 数组 / 字符串 | 新数组 / 字符串 | ❌ | 支持负索引 |
| `splice(start, count, ...items)` | 数组 | 删除的元素数组 | ✅ | 可增/删/改 |
| `split(sep, limit?)` | 字符串 | 字符串数组 | ❌ | 字符串→数组 |
| `substring(start, end)` | 字符串 | 字符串 | ❌ | 不支持负索引 |
| `substr(start, length)` ⚠️ | 字符串 | 字符串 | ❌ | 已废弃，第二参是长度 |

```js
// slice
[1,2,3,4].slice(1, 3)     // [2, 3]
'hello'.slice(1, 3)        // 'el'
[1,2,3].slice(-1)          // [3]（支持负索引）

// splice（修改原数组）
const arr = [1,2,3,4];
arr.splice(1, 2, 'a', 'b'); // 返回 [2,3]，arr变为 [1,'a','b',4]

// split
'a,b,c'.split(',')         // ['a','b','c']
'hello'.split('')           // ['h','e','l','l','o']

// substring
'hello'.substring(1, 3)    // 'el'（不含end）
```

**记忆技巧**：
- `slice` = 切片（数组/字符串通用，不改原值）
- `splice` = 手术（只针对数组，会改原值）
- `split` = 分裂（字符串→数组，只针对字符串）
- `substring` = 子串（字符串专用，不支持负索引）
