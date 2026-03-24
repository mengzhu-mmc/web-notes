# Node.js 模块系统深入解析

> 面试高频考点：CommonJS 与 ESM 的原理差异、循环依赖处理、模块缓存机制。

## 面试高频考点

1. **CommonJS 和 ESM 的核心区别是什么？**
2. **require 是同步还是异步的？为什么？**
3. **CommonJS 如何处理循环依赖？会报错吗？**
4. **为什么 ESM 中不能直接使用 `__dirname`？**
5. **`module.exports` 和 `exports` 有什么区别？**

---

## 一、CommonJS（CJS）模块系统

### 1.1 基本用法

```javascript
// 导出
module.exports = { add, subtract };
// 或
exports.add = (a, b) => a + b;

// 导入
const { add } = require('./math');
const fs = require('fs'); // 内置模块
```

### 1.2 require 的执行流程

`require(id)` 内部执行以下步骤：

```
1. 路径解析（Resolution）
   ├── 内置模块（fs、path）→ 直接返回
   ├── 相对路径（./、../）→ 转为绝对路径
   └── 裸模块名（lodash）→ 逐级向上查找 node_modules

2. 检查缓存（require.cache）
   └── 命中缓存 → 直接返回 module.exports，不重新执行

3. 加载文件
   ├── .js  → 读取文件，包裹在函数中执行
   ├── .json → JSON.parse 解析
   └── .node → 加载原生 C++ 插件

4. 执行模块代码（同步执行）

5. 缓存结果（module.exports 存入 require.cache）

6. 返回 module.exports
```

### 1.3 模块包装函数

Node.js 在执行每个模块文件前，会将代码包裹在一个函数中：

```javascript
(function(exports, require, module, __filename, __dirname) {
  // 你的模块代码在这里执行
  const x = 1;
  module.exports = x;
});
```

这就是为什么每个模块都能访问 `exports`、`require`、`module`、`__filename`、`__dirname` 这五个变量——它们是函数参数，不是全局变量。

### 1.4 module.exports vs exports

```javascript
// ✅ 正确：exports 是 module.exports 的引用，可以添加属性
exports.name = 'Alice';
exports.age = 18;

// ✅ 正确：直接替换 module.exports
module.exports = { name: 'Alice', age: 18 };

// ❌ 错误：重新赋值 exports 会断开与 module.exports 的引用
exports = { name: 'Alice' }; // 这行代码无效！
```

**本质原因**：`exports` 是 `module.exports` 的引用（指向同一个对象）。对 `exports` 添加属性，等同于对 `module.exports` 添加属性。但如果对 `exports` 重新赋值，就切断了这个引用，`module.exports` 仍然是原来的空对象。

```javascript
// 内部等价于：
let module = { exports: {} };
let exports = module.exports; // exports 指向同一个对象

// 最终 require 返回的是 module.exports，不是 exports
return module.exports;
```

---

## 二、CommonJS 循环依赖

### 2.1 循环依赖不会报错，但会得到"未完成的导出"

```javascript
// a.js
const b = require('./b');
console.log('a.js: b.done =', b.done);
exports.done = true;

// b.js
const a = require('./a');
console.log('b.js: a.done =', a.done);
exports.done = true;

// main.js
const a = require('./a');
const b = require('./b');
```

**执行过程分析**：

```
1. main.js 执行 require('./a')
2. a.js 开始执行，执行到 require('./b')
3. b.js 开始执行，执行到 require('./a')
4. 此时 a.js 还没执行完，但缓存中已有 a 的"半成品" exports（空对象 {}）
5. b.js 拿到的 a.done 是 undefined（因为 a.js 还没执行到 exports.done = true）
6. b.js 执行完毕，exports.done = true
7. 回到 a.js，b.done 是 true（b.js 已执行完）
8. a.js 执行完毕，exports.done = true
```

**输出结果**：
```
b.js: a.done = undefined  ← 拿到的是半成品
a.js: b.done = true
```

**结论**：CommonJS 通过"提前暴露未完成的 exports 对象"来打破循环，不会死循环，但可能拿到 `undefined`。

---

## 三、ESM（ES Modules）

### 3.1 基本用法

```javascript
// 导出
export const add = (a, b) => a + b;
export default function subtract(a, b) { return a - b; }

// 导入
import { add } from './math.js'; // 必须带扩展名
import subtract from './math.js';
import * as math from './math.js'; // 命名空间导入
```

### 3.2 ESM 的三个核心特性

**① 静态分析（Static Analysis）**

`import` 语句必须在模块顶层，不能在条件语句或函数内部：

```javascript
// ❌ 报错：import 不能在运行时动态执行
if (condition) {
  import { add } from './math.js'; // SyntaxError
}

// ✅ 动态导入用 import()（返回 Promise）
if (condition) {
  const { add } = await import('./math.js');
}
```

静态分析使得打包工具（Webpack/Rollup）可以在编译时确定依赖关系，实现 **Tree Shaking**（删除未使用的代码）。

**② 实时绑定（Live Bindings）**

ESM 导出的是值的"引用"，不是值的拷贝：

```javascript
// counter.js
export let count = 0;
export function increment() { count++; }

// main.js
import { count, increment } from './counter.js';
console.log(count); // 0
increment();
console.log(count); // 1 ← 值更新了！
```

CommonJS 导出的是值的拷贝，修改原始值不会影响已导入的变量。

**③ 异步加载**

ESM 在浏览器中是异步加载的（`<script type="module">` 默认 defer），不会阻塞 HTML 解析。

### 3.3 ESM 中没有 __dirname 和 __filename

因为 ESM 不使用模块包装函数，所以没有这两个变量。替代方案：

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

## 四、CJS vs ESM 核心对比

| 特性 | CommonJS (CJS) | ES Modules (ESM) |
|------|---------------|-----------------|
| 语法 | `require()` / `module.exports` | `import` / `export` |
| 加载时机 | 运行时（动态） | 编译时（静态） |
| 加载方式 | 同步 | 异步（浏览器）/ 同步（Node.js） |
| 导出内容 | 值的拷贝 | 值的实时绑定（Live Binding） |
| 循环依赖 | 返回半成品 exports | 编译时检测，运行时可能 undefined |
| Tree Shaking | ❌ 不支持 | ✅ 支持 |
| 顶层 await | ❌ 不支持 | ✅ 支持 |
| `__dirname` | ✅ 可用 | ❌ 需要手动实现 |
| 文件扩展名 | 可省略 | 必须写完整（`.js`） |
| package.json | `"main"` 字段 | `"exports"` / `"type": "module"` |

---

## 五、模块缓存机制

### 5.1 CJS 缓存

```javascript
// require.cache 存储所有已加载的模块
console.log(require.cache);
// { '/path/to/module.js': Module { id, filename, loaded, exports, ... } }

// 清除缓存（慎用，可能导致内存泄漏）
delete require.cache[require.resolve('./module')];
```

**缓存的意义**：同一个模块无论被 `require` 多少次，只执行一次，后续直接返回缓存的 `module.exports`。这保证了模块的单例性。

### 5.2 ESM 缓存

ESM 同样有模块缓存（Module Map），但无法像 CJS 那样手动清除。每个 URL 对应唯一的模块实例。

---

## 六、在 Node.js 中使用 ESM

### 方式一：文件扩展名 `.mjs`

```bash
# 直接使用 .mjs 扩展名，Node.js 自动识别为 ESM
node index.mjs
```

### 方式二：package.json 设置 type

```json
{
  "type": "module"
}
```

设置后，`.js` 文件默认被视为 ESM，CommonJS 文件需改为 `.cjs` 扩展名。

### 方式三：package.json exports 字段（推荐库开发）

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  }
}
```

---

## 七、面试答题模板

**Q：CommonJS 和 ESM 的核心区别？**

CJS 是运行时加载，`require` 同步执行，导出值的拷贝，不支持 Tree Shaking；ESM 是编译时静态分析，`import` 在模块解析阶段处理，导出值的实时绑定，支持 Tree Shaking。两者最大的实践差异是：ESM 让打包工具能在编译期确定依赖图，从而删除未使用的代码，显著减小打包体积。

**Q：require 为什么是同步的？**

Node.js 设计之初主要用于服务端，模块文件在本地磁盘上，同步读取速度极快，不会造成明显阻塞。而浏览器环境需要通过网络加载，所以 ESM 在浏览器中是异步的。

**Q：循环依赖如何处理？**

CJS 通过"提前暴露未完成的 exports 对象"打破循环：当 A require B，B 又 require A 时，B 拿到的是 A 当前已执行部分的 exports（可能是空对象或部分属性），不会死循环，但可能拿到 `undefined`。解决方案是重构代码，提取公共依赖到第三个模块，或将 require 移到函数内部（延迟执行）。
