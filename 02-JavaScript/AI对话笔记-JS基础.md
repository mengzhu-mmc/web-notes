# 豆包对话提取 - JS/TS 基础

> ⚠️ 已蒸馏至正式笔记，此文件归档备用。

> 来源：豆包历史对话，提取时间：2026-03-17

---

## JS中Map能否用for in遍历及正确遍历方式

### 核心知识点
- `for...in` 设计用于遍历对象的**可枚举属性**，**不能**遍历 Map（遍历不到任何内容）
- Map 的键值对并非以"对象属性"形式存在，不被 `for...in` 识别
- Map 是**可迭代对象**，应使用 `for...of` 或内置 `forEach`

### 代码示例

```js
const myMap = new Map([
  ['name', '张三'],
  ['age', 20]
]);

// ✅ 正确：for...of 遍历键值对
for (const [key, value] of myMap) {
  console.log(`${key}: ${value}`);
}

// ✅ forEach（注意：value 在前，key 在后）
myMap.forEach((value, key) => {
  console.log(`${key}: ${value}`);
});

// ❌ 错误：for...in 无任何输出
for (const key in myMap) {
  console.log(key); // 无输出！
}
```

### for...in vs for...of 核心区别
| 特性 | for...in | for...of |
|------|----------|----------|
| 遍历目标 | 对象的可枚举属性 | 可迭代对象的元素 |
| 适用类型 | 普通对象 | Map/Set/数组/字符串等 |
| 遍历 Map 效果 | 无输出 | 正常遍历键值对 |

### 面试要点
- Map 不能用 `for...in` 遍历，用 `for...of` 或 `.forEach()`
- `for...in` 遍历"对象属性"，`for...of` 遍历"可迭代对象元素"

---

## TypeScript编译比JS慢的原因

### 核心知识点
- TS 必须经过「语法解析 → 全量类型检查 → 语法降级 → 生成代码」四步
- JS 无需编译，直接运行
- **全量类型检查**是最主要耗时点（遍历所有文件/作用域、推导类型、检查泛型）

### TS 编译做的四件事
1. **解析 TS 语法**：识别 interface、type、泛型、装饰器等
2. **全量类型检查（最耗时）**：遍历所有文件+作用域，推导并验证类型
3. **语法降级**：转译为低版本 JS（ES5/ES6）
4. **生成目标代码**：输出 .js / .d.ts / .map

### 为什么 Babel 比 TSC 快？
- Babel：只做语法转译，**不做类型检查**
- TSC：语法转译 + 全项目类型检查 → 类型检查是 CPU 密集型

### 编译速度优化方案

```json
{
  "skipLibCheck": true,
  "incremental": true,
  "tsBuildInfoFile": ".tsbuildinfo",
  "isolatedModules": true,
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**换编译器（速度提升 5~30 倍）：**
- 使用 `swc` 或 `esbuild` 只做转译，不做类型检查
- 开发时：swc/esbuild 转译（飞快热更）
- 类型检查：单独进程 `tsc --noEmit --watch`

### 面试要点
- TS 编译慢本质：语法解析 + **全量类型检查** + 代码降级与生成
- `skipLibCheck + 增量编译` → 快 2~5 倍；换 swc/esbuild → 快 10~30 倍

---

## JavaScript原型链讲解

### 核心知识点
- 原型链是 JS 实现继承的核心机制，是**属性/方法查找链**
- 对象访问属性时：先自身 → `__proto__` → 原型对象 → ... → `null`

### 三个关键术语
| 术语 | 含义 |
|------|------|
| `prototype`（显式原型） | 只有**函数**才有，指向该函数的"原型对象" |
| `__proto__`（隐式原型） | **所有对象**都有，指向构造函数的 prototype |
| `constructor` | 原型对象上的属性，指向对应的构造函数 |

### 代码示例

```js
function Person(name) {
  this.name = name;
}
Person.prototype.sayHi = function() {
  console.log(`你好，我是${this.name}`);
};

const person1 = new Person("张三");

// 原型链验证
console.log(person1.__proto__ === Person.prototype);         // true
console.log(Person.prototype.constructor === Person);        // true
console.log(Person.prototype.__proto__ === Object.prototype);// true
console.log(Object.prototype.__proto__);                     // null（链顶端）
```

### 原型链继承实现

```js
function Person(name) { this.name = name; }
Person.prototype.sayHi = function() { console.log(`我是${this.name}`); };

function Student(name, score) {
  Person.call(this, name);   // 继承实例属性
  this.score = score;
}

Student.prototype = Object.create(Person.prototype); // 继承原型方法
Student.prototype.constructor = Student;              // 修复 constructor

Student.prototype.showScore = function() {
  console.log(`${this.name}的分数是${this.score}`);
};
```

### 构造函数 vs 原型对象（易混淆）
- **构造函数** = 造对象的模具（function 类型），有 `prototype` 属性
- **原型对象** = `prototype` 指向的对象（object 类型），有 `constructor` 属性
- 口诀：构造函数是"爹"，原型对象是"爹的储物间"，实例是"儿子"

### 面试要点
- 原型链本质是"查找链"，继承本质是"链的指向"
- `Object.prototype.__proto__ === null`，这是原型链顶端
- 函数也是对象：`Function.__proto__ === Function.prototype`

---

## V8垃圾清理机制

### 核心知识点
- V8 GC 核心策略：**分代回收**（新生代 + 老生代）
- 新生代：Scavenge 复制算法（速度快，空间利用率低）
- 老生代：标记-清除 + 标记-整理（适合长命对象）
- 优化手段：增量标记、并发标记、并行清理（减少 Stop-The-World 卡顿）

### 新生代（Young Generation）
- 大小：64位约 32MB，放**短命对象**
- 分为两块：`From`（使用中）和 `To`（空闲）
- **Scavenge 算法**：
  1. From 空间满时触发
  2. 从根扫描，存活对象复制到 To
  3. 清空 From，交换 From/To 角色
  4. 对象经历 2 次 Scavenge 仍存活 → **晋升到老生代**

### 老生代（Old Generation）
- 大小：64位约 1.4GB，放长命/大对象
- **标记-清除（Mark-Sweep）**：快速回收，但产生内存碎片
- **标记-整理（Mark-Compact）**：移动存活对象消除碎片，速度慢
- 策略：平时用标记-清除，碎片严重时才用标记-整理

### 三色标记法（老生代）
- **白色**：未访问（初始）
- **灰色**：访问中（自身已标记，子节点未处理）
- **黑色**：已处理（自身+子节点都标记）

### 减少卡顿优化
| 方式 | 描述 |
|------|------|
| 增量标记 | 标记拆成多段，穿插 JS 执行，每段停几毫秒 |
| 并发标记 | 后台线程执行标记，主线程几乎不停 |
| 并行清理 | 多线程并行清理，缩短总耗时 |

### 面试要点
- V8 用**分代 + 复制 + 标记清除 + 标记整理 + 增量并发并行**
- **晋升条件**：经历 2 次 Scavenge 仍存活，或 To 空间占用超 50%
- 常见内存泄漏：闭包/定时器/DOM 引用未释放

---
