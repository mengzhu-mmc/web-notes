# JavaScript 四种数组遍历性能对比

> 来源: 阮一峰周刊 #387 引用 | 2026-03-06
> 原文: https://waspdev.com/articles/2026-01-01/javascript-for-of-loops-are-actually-fast

## 结论 (速度排名)

1. 🥇 `for (let i = 0; i < arr.length; i++)` — 最快
2. 🥈 `for (const item of arr)` — 其次（接近 for i++）
3. 🥉 `arr.forEach(callback)` — 较慢
4. ❌ `for (const key in arr)` — 应该避免用于数组

## 要点

- `for...of` 性能比很多人想象的好，V8 对其做了很好的优化
- `forEach` 因为回调函数开销，比原生循环慢
- `for...in` 设计用于对象属性枚举，不适合数组遍历，还会遍历原型链

## 实际建议

- 追求极致性能 → `for` 循环
- 可读性优先 → `for...of`（性能也不差）
- 函数式风格 → `forEach` / `map` / `filter`（牺牲少量性能换可读性）
- 永远不要 → `for...in` 遍历数组

---

**标签**: #JavaScript #性能 #循环 #V8

---

## 性能测试代码

### 用 `console.time` 手动基准测试

```js
const SIZE = 10_000_000;
const arr = Array.from({ length: SIZE }, (_, i) => i);

// 测试工具函数
function bench(label, fn) {
  console.time(label);
  fn();
  console.timeEnd(label);
}

// 1. 传统 for 循环
bench('for-i', () => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
});

// 优化版：缓存 length（减少属性查找）
bench('for-i (cached length)', () => {
  let sum = 0;
  const len = arr.length; // 缓存 length，避免每次重复读取
  for (let i = 0; i < len; i++) {
    sum += arr[i];
  }
});

// 2. for...of
bench('for-of', () => {
  let sum = 0;
  for (const item of arr) {
    sum += item;
  }
});

// 3. forEach
bench('forEach', () => {
  let sum = 0;
  arr.forEach(item => { sum += item; });
});

// 4. for...in（永远不要这样做！）
bench('for-in ❌', () => {
  let sum = 0;
  for (const key in arr) {
    sum += arr[key]; // key 是字符串！存在隐式类型转换
  }
});
```

### 用 `performance.now()` 精确计时

```js
function precisionBench(label, fn, iterations = 5) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${label}: avg ${avg.toFixed(2)}ms (runs: ${times.map(t => t.toFixed(1)).join(', ')}ms)`);
}

const arr = new Int32Array(1_000_000); // TypedArray，极致性能
arr.fill(1);

precisionBench('for-i (TypedArray)', () => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
});

precisionBench('for-of (TypedArray)', () => {
  let sum = 0;
  for (const item of arr) sum += item;
});
```

### 典型性能数据（Node.js v22, M2 Mac，仅供参考）

```
// 1,000,000 元素数组
for-i:              ~3ms
for-i (cached len): ~2.5ms
for-of:             ~4ms
forEach:            ~8ms
for-in:             ~150ms  ← 慢几十倍！
```

---

## V8 优化原理（进阶）

```js
// V8 对密集数组（dense array）有特别优化
// 密集数组：索引连续，无空洞（holes）
const dense = [1, 2, 3, 4, 5]; // ✅ 密集，V8 用 FAST_SMI_ELEMENTS

// 稀疏数组：有空洞，性能下降
const sparse = [1, , , 4, 5]; // ❌ 有空洞，降级为 HOLEY_ELEMENTS
sparse[1000] = 999; // 设置超大索引，变成稀疏数组，for-of 性能骤降

// TypedArray 是最快的，类型固定，无需装箱拆箱
const typedArr = new Float64Array(1_000_000);
// for-of 在 TypedArray 上和 for-i 性能相当

// 为什么 for...of 慢于 for-i（理论上）？
// for...of 需要调用 Symbol.iterator，创建迭代器对象
// 但现代 V8 对 Array.prototype[Symbol.iterator] 做了内联优化
// 实际差距在 10-30% 内，可忽略不计
```

---

## 面试考点

### Q1：`for...of` 比 `forEach` 慢吗？

**标准答案要点：**
- 两者性能接近，`for...of` 有时甚至快于 `forEach`
- `forEach` 的主要开销在于**回调函数调用**（函数帧入栈/出栈）
- `for...of` 的开销在于创建**迭代器对象**，但 V8 已对数组迭代器做了内联优化
- 实际项目中两者差距可忽略（<10%），优先考虑代码可读性
- 真正的性能杀手是 `for...in`（慢 10-50x）

### Q2：如何在实际项目中做 JS 性能优化？

**标准答案要点：**
1. 避免在热路径（hot path）中使用 `for...in` 遍历数组
2. 大数据量时考虑 `TypedArray`（`Int32Array`/`Float64Array`）
3. 避免创建稀疏数组（数组空洞会触发性能降级）
4. 缓存 `arr.length`（减少属性查找，微优化）
5. 优先用 `for...of` 保证可读性，只有 profiling 显示瓶颈才换 `for-i`

### Q3：`forEach` 和 `map` 的区别？什么时候用哪个？

**标准答案要点：**
- `forEach`：无返回值（返回 `undefined`），用于**副作用**操作（打印、发请求、修改外部状态）
- `map`：返回**新数组**，用于**纯变换**（每个元素映射为新值）
- 原则：有无返回值决定选哪个；不要用 `forEach` 然后 push 到外部数组（用 `map`）

### Q4：为什么说 `for...in` 不适合遍历数组？

**标准答案要点：**
1. `for...in` 遍历所有**可枚举属性**（包括原型链上的），非纯粹的数组元素遍历
2. 键是**字符串**类型（`'0'`, `'1'`...），不是数字，隐式类型转换有开销
3. 遍历顺序**不完全保证**（规范对非整数键的顺序未做强制）
4. 性能远低于其他方式（V8 无法对其做密集数组优化）

---

## 关键点总结

- **微基准测试（microbenchmark）有陷阱**：引擎会优化热点代码，脱离真实场景的测试结果可能失真
- **不要过早优化**：先用 `for...of` 保证可读性，profiling 发现瓶颈再换 `for-i`
- **真正重要的性能规则**：避免 `for...in` 遍历数组、避免稀疏数组、考虑 TypedArray
- **现代 V8 已很智能**：`for...of` 在实际场景中和 `for-i` 差距极小

---

## 相关知识

- [[2026-03-09-js-for-loop-comparison]] — 四种遍历方式的语义对比
- [[迭代器协议与 Symbol.iterator]]
- [[V8 引擎优化原理]]
- [[TypedArray 使用场景]]
