# 豆包对话提取 - JavaScript / TypeScript

> ⚠️ 已蒸馏至正式笔记，此文件归档备用。

> 来源：豆包历史对话，提取时间：2026-03-17

---

## JS 原型链

### 核心概念
| 术语 | 含义 |
|------|------|
| `prototype`（显式原型） | 只有函数有，指向原型对象 |
| `__proto__`（隐式原型） | 所有对象都有，指向构造函数的prototype |
| `constructor` | 原型对象上的属性，指向构造函数 |

### 原型链查找机制
1. 先在对象自身找属性/方法
2. 找不到 → 去 `__proto__` 指向的原型对象找
3. 还没有 → 继续沿链向上找
4. 直到 `Object.prototype.__proto__ === null`（链顶端）

### 关键关系
```js
person1.__proto__ === Person.prototype         // true
Person.prototype.constructor === Person         // true
Person.prototype.__proto__ === Object.prototype // true
Object.prototype.__proto__ === null             // 链顶端
```

### 构造函数 vs 原型对象
- 构造函数：`typeof Person === 'function'`，是"模具"
- 原型对象：`typeof Person.prototype === 'object'`，是"储物间"
- 三者关系：构造函数.prototype → 原型对象 ← 实例.__proto__

### 实现继承
```js
function Person(name) { this.name = name; }
Person.prototype.sayHi = function() { console.log('Hi', this.name); };

function Student(name, score) {
  Person.call(this, name); // 继承实例属性
  this.score = score;
}
Student.prototype = Object.create(Person.prototype); // 继承原型方法
Student.prototype.constructor = Student; // 修复 constructor
```

---

## JS 深拷贝

### 完整实现（含循环引用处理）
```js
function deepClone(target, cache = new Map()) {
  // 基本类型直接返回
  if (typeof target !== 'object' || target === null) return target;
  // 循环引用检查
  if (cache.has(target)) return cache.get(target);
  // 特殊类型
  if (target instanceof Date) return new Date(target);
  if (target instanceof RegExp) return new RegExp(target.source, target.flags);
  // 初始化
  const cloneResult = target instanceof Array ? [] : {};
  cache.set(target, cloneResult); // 先存再递归，处理循环引用
  for (let key in target) {
    if (target.hasOwnProperty(key)) {
      cloneResult[key] = deepClone(target[key], cache);
    }
  }
  return cloneResult;
}
```

### 各方案对比
| 方案 | 优点 | 缺点 |
|------|------|------|
| `JSON.parse(JSON.stringify())` | 简单 | 丢失undefined/Symbol/函数，不能循环引用 |
| 自定义递归 | 完整控制 | 需要手动处理各种类型 |
| `structuredClone()` (新API) | 原生支持循环引用 | 不支持函数 |

---

## JS debounce（防抖）this 指向问题

### 问题场景
```js
// debounce 中 fn.bind(this) 的 this 是什么？
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args); // 这里的 this 是调用返回函数时的 this
    }, delay);
  };
}
```

### 核心
- `fn.bind(this)` 中的 `this` 取决于调用返回函数（wrapper）时的上下文
- 箭头函数 setTimeout 内用 `apply(this)` 是因为箭头函数没有自己的 this，会捕获外层

---

## JS 遍历 Map 和 Set

### Map 遍历
```js
const map = new Map([['a', 1], ['b', 2]]);
// for...of（推荐）
for (const [key, value] of map) {}
// forEach
map.forEach((value, key) => {});
// 转数组
[...map.keys()], [...map.values()], [...map.entries()]
```

### Set 遍历
```js
const set = new Set([1, 2, 3]);
for (const item of set) {}
set.forEach(value => {});
[...set].forEach(item => {});
```

### Map 不能用 for...in
- `for...in` 遍历对象的可枚举属性，Map 的键值对不是普通属性

---

## JS 对象扁平化

```js
function flatten(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flatten(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
}
// { a: { b: { c: 1 } } } → { 'a.b.c': 1 }
```

---

## JS 数组转树形结构

```js
function arrayToTree(arr, parentId = null) {
  return arr
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: arrayToTree(arr, item.id)
    }));
}

// 优化版（Map O(n)）
function arrayToTree(arr) {
  const map = new Map();
  const roots = [];
  arr.forEach(item => map.set(item.id, { ...item, children: [] }));
  arr.forEach(item => {
    const node = map.get(item.id);
    if (item.parentId === null) roots.push(node);
    else map.get(item.parentId)?.children.push(node);
  });
  return roots;
}
```

---

## 前端异步任务并发控制

```js
// 控制最大并发数
async function concurrentControl(tasks, limit) {
  const results = [];
  const executing = new Set();
  
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    p.finally(() => executing.delete(p));
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}
```

---

## Promise/async/setTimeout 执行顺序

### 事件循环优先级
1. **同步代码**（当前宏任务）
2. **微任务**（Promise.then、queueMicrotask、MutationObserver）
3. **宏任务**（setTimeout、setInterval、MessageChannel）

```js
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
// 输出：1 4 3 2
```

```js
async function fn() {
  console.log(1);
  await Promise.resolve();
  console.log(2); // await 后的代码是微任务
}
fn();
console.log(3);
// 输出：1 3 2
```

---

## JS 截取/分割方法规律

| 方法 | 适用 | 返回 | 修改原数组 |
|------|------|------|----------|
| `slice(start, end)` | 数组/字符串 | 新数组/字符串 | ❌ |
| `splice(start, count, ...items)` | 数组 | 删除的元素数组 | ✅ |
| `split(sep)` | 字符串 | 字符串数组 | ❌ |
| `substring(start, end)` | 字符串 | 字符串 | ❌ |

---

## TypeScript 编译比 JS 慢的原因

### 核心原因
tsc 需要做 4 件事：
1. 解析 TS 语法（interface、泛型、装饰器等）
2. **全量类型检查**（最耗时！CPU密集型）
3. 语法降级（转为低版本JS）
4. 生成目标文件（.js/.d.ts/.map）

JS 无需编译，直接运行。

### 为什么 Babel 比 TS 快？
- Babel：只做语法转译，**不做类型检查**
- tsc：语法转译 + 全项目类型检查

### 优化方案
```jsonc
// tsconfig.json 优化
{
  "skipLibCheck": true,         // 不检查 node_modules 类型（超级快）
  "incremental": true,          // 增量编译（只编译改动文件）
  "tsBuildInfoFile": ".tsbuildinfo",
  "isolatedModules": true,      // 配合 bundler 更快
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 最佳实践（大厂方案）
- **开发时**：swc/esbuild 转译（快 10~30 倍）
- **类型检查**：单独进程 `tsc --noEmit --watch`
- **webpack**：用 `swc-loader` 或 `esbuild-loader`

---

## TypeScript 泛型

### 核心概念
泛型 = 类型参数，让代码可以适配多种类型而不丢失类型信息

```ts
// 泛型函数
function identity<T>(arg: T): T { return arg; }

// 泛型约束
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}

// 泛型接口
interface Repository<T> {
  find(id: number): T;
  save(entity: T): void;
}

// 常用内置泛型
type Partial<T> = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

---

## useContext + Proxy 优化 Context 重渲染

### 问题
`useContext` 只要 Context 值变化，所有消费组件都会重渲染，即使只用了部分状态。

### 解决思路
用 Proxy 拦截属性访问，追踪每个组件实际用了哪些属性，只有这些属性变化时才触发更新。

```js
// 简化版思路
function createStore(initialState) {
  const listeners = new Map();
  const state = new Proxy(initialState, {
    get(target, key) {
      // 记录当前组件依赖了哪个属性
      trackDependency(key);
      return target[key];
    }
  });
  return { state, listeners };
}
```

### 实际推荐方案
- 使用 `zustand`（内置精确订阅）
- 使用 `jotai`（原子化状态）
- 手动拆分 Context（按功能分开）
