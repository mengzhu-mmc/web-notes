# ES6+ 核心特性精讲

## 面试高频考点

- let/const 和 var 的区别？
- 箭头函数和普通函数的区别？
- Promise、Generator、async/await 的关系？
- 解构赋值、扩展运算符的使用？
- Map/Set 和 Object/Array 的区别？
- 模块化：CommonJS vs ES Module？

---

## 一、let / const / var 对比

| 特性 | var | let | const |
| --- | --- | --- | --- |
| 作用域 | 函数作用域 | 块级作用域 | 块级作用域 |
| 变量提升 | ✅ 提升并初始化为 undefined | ✅ 提升但不初始化（暂时性死区） | ✅ 提升但不初始化（暂时性死区） |
| 重复声明 | ✅ 允许 | ❌ 不允许 | ❌ 不允许 |
| 重新赋值 | ✅ 允许 | ✅ 允许 | ❌ 不允许（但对象属性可修改） |
| 全局属性 | ✅ 挂载到 window | ❌ 不挂载 | ❌ 不挂载 |

```js
// 暂时性死区（TDZ）
console.log(a); // undefined（var 提升）
console.log(b); // ReferenceError（let 暂时性死区）
var a = 1;
let b = 2;

// const 对象属性可修改
const obj = { x: 1 };
obj.x = 2;    // ✅ 可以修改属性
obj = {};     // ❌ 不能重新赋值
```

---

## 二、箭头函数 vs 普通函数

```js
// 1. this 指向不同
const obj = {
  name: 'obj',
  // 普通函数：this 指向调用者
  sayName: function() { console.log(this.name); },
  // 箭头函数：this 继承外层（定义时的 this）
  sayNameArrow: () => { console.log(this.name); } // this 是 window/undefined
};
obj.sayName();       // 'obj'
obj.sayNameArrow();  // undefined

// 2. 箭头函数没有 arguments 对象
function fn() { console.log(arguments); } // Arguments 对象
const arrow = () => { console.log(arguments); } // ReferenceError

// 3. 箭头函数不能作为构造函数
const Foo = () => {};
new Foo(); // TypeError: Foo is not a constructor

// 4. 箭头函数没有 prototype
const bar = () => {};
console.log(bar.prototype); // undefined

// 5. 不能用 call/apply/bind 改变 this
const fn2 = () => this;
fn2.call({ x: 1 }); // 仍然是外层 this，不是 { x: 1 }
```

---

## 三、解构赋值

```js
// 数组解构
const [a, b, ...rest] = [1, 2, 3, 4, 5];
// a=1, b=2, rest=[3,4,5]

// 对象解构（重命名 + 默认值）
const { name: userName = '匿名', age = 18 } = { name: '张三' };
// userName='张三', age=18

// 函数参数解构
function greet({ name = '匿名', age = 0 } = {}) {
  console.log(`${name}, ${age}岁`);
}
greet({ name: '李四', age: 25 }); // 李四, 25岁
greet(); // 匿名, 0岁

// 嵌套解构
const { a: { b: deepValue } } = { a: { b: 42 } };
// deepValue = 42

// 交换变量
let x = 1, y = 2;
[x, y] = [y, x]; // x=2, y=1
```

---

## 四、Map 和 Set

### Map vs Object

```js
// Map 的 key 可以是任意类型
const map = new Map();
map.set({ id: 1 }, 'user1'); // 对象作为 key
map.set(1, 'number key');
map.set(true, 'boolean key');

// 常用方法
map.set(key, value);
map.get(key);
map.has(key);
map.delete(key);
map.size;

// 遍历
for (const [key, value] of map) { ... }
map.forEach((value, key) => { ... });

// 何时用 Map 而不是 Object？
// 1. key 不是字符串时
// 2. 需要频繁增删键值对时（Map 性能更好）
// 3. 需要知道键值对数量时（map.size vs Object.keys(obj).length）
// 4. 需要保证插入顺序时
```

### Set vs Array

```js
// Set：值唯一的集合
const set = new Set([1, 2, 2, 3, 3]);
console.log([...set]); // [1, 2, 3]

// 数组去重（最简洁）
const unique = [...new Set(arr)];
// 或
const unique2 = Array.from(new Set(arr));

// 常用方法
set.add(value);
set.has(value);
set.delete(value);
set.size;

// 集合运算
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

// 并集
const union = new Set([...a, ...b]); // {1,2,3,4}
// 交集
const intersection = new Set([...a].filter(x => b.has(x))); // {2,3}
// 差集
const difference = new Set([...a].filter(x => !b.has(x))); // {1}
```

### WeakMap / WeakSet

```js
// WeakMap：key 必须是对象，弱引用（不阻止 GC）
const weakMap = new WeakMap();
let obj = {};
weakMap.set(obj, 'data');
obj = null; // obj 被 GC 回收，weakMap 中的条目也自动删除

// 典型用途：存储 DOM 节点的私有数据，避免内存泄漏
const domData = new WeakMap();
domData.set(document.getElementById('app'), { clicks: 0 });
```

---

## 五、CommonJS vs ES Module

| 对比项 | CommonJS | ES Module |
| --- | --- | --- |
| 语法 | require / module.exports | import / export |
| 加载时机 | 运行时（动态） | 编译时（静态） |
| 输出 | 值的拷贝 | 值的引用（live binding） |
| this | module 对象 | undefined |
| 循环依赖 | 可能得到不完整的值 | 可以处理（但需注意顺序） |
| 使用环境 | Node.js | 浏览器 + Node.js（.mjs 或 type:module） |

```js
// CommonJS
const { add } = require('./math');
module.exports = { add };

// ES Module
import { add } from './math.js';
export { add };
export default function main() {}

// 动态导入（懒加载）
const module = await import('./heavy-module.js');
```

**关键区别：输出值的拷贝 vs 引用**

```js
// math.js (CommonJS)
let count = 0;
module.exports = { count, increment: () => count++ };

// main.js
const { count, increment } = require('./math');
increment();
console.log(count); // 0 ❗ 拷贝的是当时的值，不会更新

// math.mjs (ES Module)
export let count = 0;
export const increment = () => count++;

// main.mjs
import { count, increment } from './math.mjs';
increment();
console.log(count); // 1 ✅ 引用，会实时更新
```

---

## 六、可选链 ?. 和空值合并 ??

```js
// 可选链：安全访问深层属性
const user = { profile: { address: { city: '北京' } } };
const city = user?.profile?.address?.city; // '北京'
const zip = user?.profile?.address?.zip;   // undefined（不报错）

// 方法调用
user?.getName?.(); // 如果 getName 不存在，返回 undefined

// 数组访问
arr?.[0]; // 如果 arr 是 null/undefined，返回 undefined

// 空值合并：只有 null 和 undefined 才触发默认值
const name = user.name ?? '匿名'; // 只有 null/undefined 才用 '匿名'
const count = 0 ?? 10; // 0（不是 null/undefined，所以用 0）
const count2 = 0 || 10; // 10（|| 会把 0、''、false 都当 falsy）

// 结合使用
const displayName = user?.profile?.name ?? '匿名用户';
```

---

## 七、Proxy 和 Reflect

```js
// Proxy：拦截对象操作
const handler = {
  get(target, key) {
    console.log(`读取 ${key}`);
    return Reflect.get(target, key);
  },
  set(target, key, value) {
    if (typeof value !== 'number') throw new TypeError('只能设置数字');
    return Reflect.set(target, key, value);
  }
};

const proxy = new Proxy({}, handler);
proxy.age = 25;   // 正常
proxy.age = 'abc'; // TypeError

// Vue3 响应式原理就是基于 Proxy
// 相比 Object.defineProperty 的优势：
// 1. 可以拦截数组变化（push/pop 等）
// 2. 可以拦截属性的新增和删除
// 3. 可以拦截 in 操作符、for...in 等
```
