# JavaScript 四种遍历方式性能对比

> 来源：阮一峰科技爱好者周刊 #387 推荐 → waspdev.com
> 链接：https://waspdev.com/articles/2026-01-01/javascript-for-of-loops-are-actually-fast
> 日期：2026-03-06（周刊推荐）

## 结论

性能排序（快→慢）：
1. **`for (let i = 0; i < arr.length; i++)`** — 最快
2. **`for...of`** — 接近传统 for，实际很快
3. **`forEach`** — 较慢（函数调用开销）
4. **`for...in`** — 应避免用于数组遍历

## 要点
- `for...of` 在现代引擎中已被高度优化，实际性能接近传统 for 循环
- `for...in` 是对象属性遍历，用于数组会遍历原型链，性能最差
- `forEach` 有函数调用开销，且无法 break/return 中断

## 面试相关
- 常见面试问题：数组遍历方法的区别和性能
- 可引申到：迭代器协议、Symbol.iterator、可迭代对象

---

## 代码示例

### 四种遍历方式对比

```js
const arr = Array.from({ length: 1_000_000 }, (_, i) => i);

// 1. 传统 for 循环 — 最快
// 优点：可 break，可 continue，可反向遍历
// 缺点：写法冗长
console.time('for-i');
let sum1 = 0;
for (let i = 0; i < arr.length; i++) {
  sum1 += arr[i];
}
console.timeEnd('for-i'); // ~5ms

// 2. for...of — 推荐！可读性好，性能接近 for-i
// 优点：可 break/continue，可遍历任何可迭代对象（Set/Map/String/arguments）
// 缺点：无法直接获取索引（用 entries() 解决）
console.time('for-of');
let sum2 = 0;
for (const item of arr) {
  sum2 += item;
}
console.timeEnd('for-of'); // ~7ms

// for...of 获取索引：
for (const [index, value] of arr.entries()) {
  if (index === 5) console.log(value); // 5
}

// 3. forEach — 函数式，有回调开销
// 优点：语义清晰，链式友好
// 缺点：无法 break（throw 不算），无法 return 外层函数
console.time('forEach');
let sum3 = 0;
arr.forEach(item => { sum3 += item; });
console.timeEnd('forEach'); // ~12ms

// 4. for...in — 永远不要用于数组！
// 遍历所有可枚举属性（包括原型链），键是字符串
// 顺序不保证（规范层面），遍历速度极慢
const obj = { a: 1, b: 2, c: 3 };
for (const key in obj) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    console.log(key, obj[key]); // 安全写法，排除原型链属性
  }
}
```

### forEach 无法中断的陷阱

```js
// ❌ 错误：想用 return 提前退出，但 return 只退出回调，不退出外层
function findFirst(arr, target) {
  arr.forEach(item => {
    if (item === target) return; // 只是跳过当前迭代，不是 break！
  });
}

// ✅ 正确：用 for...of + break
function findFirst(arr, target) {
  for (const item of arr) {
    if (item === target) {
      return item; // 真正退出整个函数
    }
  }
}

// ✅ 或者用 Array.prototype.some（找到即停）
const found = arr.some(item => item === target);
```

### 迭代器协议（for...of 背后原理）

```js
// for...of 本质是调用 Symbol.iterator 协议
const iterable = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        return i < 3
          ? { value: i++, done: false }
          : { value: undefined, done: true };
      }
    };
  }
};

for (const val of iterable) {
  console.log(val); // 0, 1, 2
}

// 内置可迭代对象：Array, String, Set, Map, arguments, NodeList, Generator
const str = 'hello';
for (const ch of str) {
  console.log(ch); // h e l l o
}

const set = new Set([1, 2, 3]);
for (const val of set) {
  console.log(val); // 1, 2, 3（顺序保证）
}
```

---

## 面试考点

### Q1：`for...of` 和 `for...in` 有什么区别？

**标准答案要点：**
- `for...in`：遍历对象的**可枚举属性键**（字符串），包含原型链属性；适合遍历普通对象，不适合数组
- `for...of`：遍历**可迭代对象的值**（实现了 `Symbol.iterator` 协议）；适合数组、Set、Map、字符串等；不能直接遍历普通对象
- 关键区别：`for...in` 拿的是 key（字符串），`for...of` 拿的是 value

### Q2：`forEach` 为什么不能 `break`？

**标准答案要点：**
- `forEach` 是一个函数，每次迭代传入的是一个**回调函数**
- `break` 语句只能用在循环语句（`for`/`while`）中，不能在函数内部 `break` 外部循环
- 替代方案：`for...of`（支持 break）、`Array.some()`/`Array.every()`（短路求值）、`try...catch` + throw（非常规）

### Q3：什么是可迭代对象？如何自定义一个？

**标准答案要点：**
- 实现了 `[Symbol.iterator]()` 方法的对象就是可迭代对象
- 该方法返回一个**迭代器**（有 `next()` 方法，返回 `{ value, done }`）
- 内置可迭代：`Array`、`String`、`Set`、`Map`、`arguments`、`Generator`
- `for...of`、扩展运算符 `...`、解构赋值都依赖此协议

### Q4：性能敏感场景下选哪种循环？

**标准答案要点：**
- 追求极致性能：传统 `for` 循环（避免函数调用开销）
- 日常开发首选：`for...of`（可读性好，现代引擎已优化，性能接近 `for`）
- 函数式场景：`forEach`/`map`/`filter`（牺牲少量性能换可读性，绝大多数场景无感知）
- 遍历对象属性：`for...in`（加 `hasOwnProperty` 过滤）或 `Object.keys()/entries()`

---

## 关键点总结

| 方式 | 性能 | 可 break | 可获取索引 | 适用场景 |
|------|------|---------|-----------|---------|
| `for (i++)` | ⭐⭐⭐⭐⭐ | ✅ | ✅ | 性能敏感、需要索引 |
| `for...of` | ⭐⭐⭐⭐ | ✅ | ⚠️ `.entries()` | 日常推荐，可迭代对象 |
| `forEach` | ⭐⭐⭐ | ❌ | ✅ (第2参数) | 函数式风格，不需要 break |
| `for...in` | ⭐ | ✅ | ✅ (key) | 对象属性遍历（非数组！） |

**记忆口诀**：性能选 `for-i`，可读选 `for-of`，函数式选 `forEach`，对象遍历选 `for-in`，数组永远不用 `for-in`。

---

## 相关知识

- [[迭代器协议与 Symbol.iterator]]
- [[2026-03-11-js-loop-perf]] — 循环性能测试细节
- [[JavaScript 函数式编程 map/filter/reduce]]
- [[ES6 新特性总结]]
