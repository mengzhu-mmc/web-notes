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

## 五、Symbol 的使用场景

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
