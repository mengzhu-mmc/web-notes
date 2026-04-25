# Map 与 Set

> ES6 新增的集合类型，弥补 Object 的不足

---

## Map — 键值对集合

### 与 Object 的区别
| 特性 | Object | Map |
|---|---|---|
| 键类型 | 只能是字符串/Symbol | 任意类型 |
| 键顺序 | 不保证（ES6+ 有一定规则） | 插入顺序 |
| 大小 | 需手动计算 | `.size` 属性 |
| 迭代 | 需转换 | 直接可迭代 |
| 性能 | 频繁增删稍慢 | 频繁增删更优 |

### 基本用法
```js
const map = new Map();

map.set('key', 'value');
map.set(1, 'number key');
map.set({}, 'object key');

map.get('key');     // 'value'
map.has('key');     // true
map.delete('key');  // true
map.clear();

map.size;  // 0
```

### 遍历
```js
const map = new Map([['a', 1], ['b', 2]]);

for (const [key, value] of map) { ... }
map.forEach((value, key) => { ... });

map.keys();    // Iterator
map.values();  // Iterator
map.entries(); // Iterator（默认迭代器）
```

### 与 Object 互转
```js
// Map → Object
const obj = Object.fromEntries(map);

// Object → Map
const map2 = new Map(Object.entries(obj));
```

---

## Set — 唯一值集合

### 基本用法
```js
const set = new Set();

set.add(1);
set.add(1);     // 重复，无效
set.add('a');
set.add({});

set.has(1);     // true
set.delete(1);  // true
set.clear();

set.size;  // 0
```

### 常见用途

**数组去重：**
```js
const unique = [...new Set([1, 2, 2, 3, 3])];  // [1, 2, 3]
```

**交集 / 并集 / 差集：**
```js
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

// 交集
const intersection = new Set([...a].filter(x => b.has(x)));  // {2, 3}

// 并集
const union = new Set([...a, ...b]);  // {1, 2, 3, 4}

// 差集（a - b）
const difference = new Set([...a].filter(x => !b.has(x)));  // {1}
```

### 遍历
```js
const set = new Set(['a', 'b']);

for (const val of set) { ... }
set.forEach(val => { ... });

set.keys();    // 同 values（Set 的键=值）
set.values();  // 默认迭代器
set.entries(); // [val, val]
```

---

## WeakMap 与 WeakSet

**弱引用**，键必须是对象，不可遍历，适合做对象元数据存储。

```js
const wm = new WeakMap();
const obj = {};
wm.set(obj, { extra: 'data' });
// obj 被 GC 回收后，wm 中的条目自动消失

const ws = new WeakSet();
ws.add(obj);
// obj 被 GC 回收后，ws 中的条目自动消失
```
