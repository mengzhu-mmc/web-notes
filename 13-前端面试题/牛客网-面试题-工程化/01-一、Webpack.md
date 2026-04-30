## 一、Webpack

### Q: Webpack 的构建流程是什么？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

Webpack 构建流程分为三大阶段，底层依赖 **Tapable 事件系统**驱动各插件介入：

```
初始化阶段
  ├── 读取 webpack.config.js，合并 CLI 参数
  ├── 创建 Compiler 实例（贯穿整个生命周期的核心对象）
  └── 遍历 plugins 数组，调用每个插件的 apply(compiler) 方法，订阅事件钩子

编译阶段（Make）
  ├── compiler.run() 触发 make 钩子
  ├── 从 entry 入口出发，创建 Compilation 实例（本次构建上下文）
  ├── 调用 loader 链处理每个模块（文件内容 → JS 字符串）
  ├── 对处理后的 JS 用 acorn 解析成 AST，找出所有 import/require 依赖
  └── 递归处理所有依赖模块，构建 ModuleGraph（模块依赖图）

输出阶段（Seal + Emit）
  ├── seal()：根据依赖图确定 Chunk 分组
  ├── optimization：Tree Shaking、SplitChunks、代码压缩
  ├── emit 钩子：Plugin 最后一次修改输出内容的机会
  └── 写入 output 目录
```

**🔍 深层原理**

**为什么 Webpack 需要 Tapable 事件系统？**

Webpack 的设计哲学是**一切皆插件**。连 Webpack 自身的核心功能（如入口处理、Chunk 生成）也是通过内置插件实现的。Tapable 提供了一套标准的事件发布/订阅机制，让第三方插件能够以统一的方式介入构建流程中的任意节点，而不需要 fork 源码或 monkey-patch。

```
Tapable 钩子类型：
  SyncHook          → 同步串行，一个个执行
  SyncBailHook      → 同步，某个处理器返回非 undefined 就停止
  AsyncSeriesHook   → 异步串行，等前一个 done 再执行下一个
  AsyncParallelHook → 异步并行，所有处理器同时执行，全完成后继续
```

**完整的钩子生命周期时序：**

```
entryOption      ← webpack.config.js 读取完毕
  ↓
afterPlugins     ← 所有插件 apply(compiler) 调用完毕
  ↓
beforeRun        ← compiler.run() 即将执行
  ↓
run              ← compiler.run() 执行中（读取磁盘缓存等）
  ↓
compilation      ← Compilation 实例创建完成
  ↓
make             ← 从 entry 开始构建模块依赖图
  ↓
afterCompile     ← 编译完成，模块图已建立
  ↓
shouldEmit       ← 询问是否应该写出文件
  ↓
emit             ← 即将写出文件（最后一次修改 assets 的机会）
  ↓
afterEmit        ← 文件已写出
  ↓
done             ← 整个构建完成（含 stats 对象）
```

**Tapable 事件系统——为什么 Webpack 插件这么灵活：**

Tapable 是 webpack 内部的事件总线，类似 Node.js 的 EventEmitter，但提供了同步/异步/瀑布流等多种钩子类型。整个构建流程就是一系列钩子的触发顺序：

```js
// Tapable 订阅方式
class MyPlugin {
  apply(compiler) {
    // tap = 同步   tapAsync = 异步回调   tapPromise = Promise 异步
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      // compilation.assets 是本次构建所有输出文件的 Map
      const content = `Build time: ${new Date().toISOString()}`;
      compilation.assets['build-info.txt'] = {
        source: () => content,
        size: () => Buffer.byteLength(content),
      };
      callback(); // 必须调用，否则构建卡住
    });
  }
}
```

**Compiler vs Compilation 的区别（高频追问）：**

| 对象 | 生命周期 | 职责 |
|---|---|---|
| `Compiler` | 整个 webpack 进程（全局唯一） | 管理配置、插件、文件系统、启动/停止编译 |
| `Compilation` | 单次编译（watch 模式每次文件变化都新建一个） | 管理本次编译的模块、Chunk、依赖图、生成的 assets |

> 记忆技巧：Compiler 是"工厂"，Compilation 是"每次生产任务"。

**💡 踩坑点**

```js
// ❌ 错误：在 done 钩子里修改 assets，已经写出去了，没用
compiler.hooks.done.tap('MyPlugin', (stats) => {
  compilation.assets['late.txt'] = ...; // 此时已经写完文件了！
});

// ✅ 正确：在 emit 钩子里修改，这是最后机会
compiler.hooks.emit.tapAsync('MyPlugin', (compilation, cb) => {
  compilation.assets['on-time.txt'] = ...;
  cb();
});

// ❌ 错误：tapAsync 忘记调用 callback
compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
  doAsyncWork().then(() => {
    // 忘记 callback() → 构建永远卡在这里，没有任何错误提示！
  });
});
```

**🎯 面试追问**

- **Q: 如何在 Plugin 中获取所有输出文件列表？**
  - A: 在 `emit` 钩子的回调里访问 `compilation.assets`，key 是文件名，value 是 Source 对象（调用 `.source()` 获取内容，`.size()` 获取字节数）
- **Q: watch 模式下，每次文件变化会重新执行所有 Plugin 吗？**
  - A: 不会重新实例化 Plugin，但会重新触发相关钩子。Compiler 复用，Compilation 每次重建。Plugin 的 `apply()` 只在初始化时执行一次，之后通过钩子订阅响应变化。
- **Q: webpack5 的持久化缓存是如何实现的？**
  - A: webpack5 把模块序列化信息和 Compilation 快照写入磁盘（默认在 `node_modules/.cache/webpack/`）。下次构建时先对比文件 mtime 和内容 hash，未变化的模块直接从缓存反序列化，跳过 Loader 处理和 AST 解析，大幅提升二次构建速度（通常 60-80%）。

**⚠️ 常见误区**

- ❌ 认为每次 watch 重编译都会重新实例化 Compiler → 错，Compiler 全程唯一
- ❌ 认为 Loader 在 Plugin 之后执行 → 错，Loader 在编译阶段处理模块，Plugin 介入所有阶段
- ❌ 认为 `compilation.assets` 在 `done` 钩子里还能修改 → 文件在 `emit` 后就写出去了，`done` 里修改无效
- ❌ 把 Plugin 的订阅逻辑写在 `apply()` 之外 → `apply()` 是每个 Plugin 必须实现的接口，webpack 通过它给插件注入 compiler 对象

---

### Q: Loader 和 Plugin 的区别是什么？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

| 对比 | Loader | Plugin |
|---|---|---|
| 本质 | **转换器**：将一种文件格式转换为另一种 | **扩展器**：监听构建生命周期钩子，执行任意逻辑 |
| 作用时机 | 加载模块时（逐文件处理） | 整个构建流程的任意阶段 |
| 配置位置 | `module.rules` 中 | `plugins` 数组中 |
| 输入/输出 | 文件内容字符串 → 转换后的字符串 | 无固定 I/O，通过修改 compilation 产生副作用 |
| 处理粒度 | 单个文件 | 整个构建 |

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$/,
        // 执行顺序：从右到左（先 sass-loader，最后 style-loader）
        // sass-loader:  .scss → CSS 字符串
        // css-loader:   处理 @import / url()，返回 JS 模块
        // style-loader: 运行时往 DOM 插入 <style> 标签
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './index.html' }),
    // 生产环境用 MiniCssExtractPlugin 替代 style-loader，抽离成独立 CSS 文件
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
  ]
};
```

**🔍 深层原理**

**Loader 的管道模型（Pipeline）：**

Webpack 把 `use` 数组看作一条管道（Pipeline），每个 Loader 都是管道上的一个处理节点。源文件的原始内容从最后一个 Loader 流入，经过每个 Loader 处理后，最终流出的必须是 JavaScript 字符串（或 Buffer）。

```
原始 .scss 文件内容
    ↓
sass-loader(source)     → 将 SCSS 语法编译成 CSS 字符串
    ↓
css-loader(cssString)   → 解析 @import/url()，返回 JS 模块（export default cssText）
    ↓
style-loader(jsModule)  → 生成运行时代码：document.createElement('style')...
    ↓
Webpack 模块注册（可被其他模块 import）
```

**为什么从右到左执行？**

这是函数组合（Function Composition）的数学惯例：`f(g(h(x)))` 等同于 `compose(f, g, h)(x)`，compose 从右到左计算。webpack 将 `use` 数组 `reduce` 成函数链时遵循了这个惯例。

**手写最简 Loader（完整版）：**

```js
// strip-console-loader.js
// Loader 本质就是一个 CommonJS 函数：接收源码字符串，返回处理后的字符串
// this 绑定到 loader context，提供丰富的 API

module.exports = function stripConsoleLoader(source) {
  // this.cacheable() → 声明此 loader 结果可缓存（webpack4 需要手动调用）
  // webpack5 默认开启缓存，不需要
  
  // this.resourcePath → 当前处理文件的绝对路径，用于条件处理
  if (this.resourcePath.includes('node_modules')) {
    return source; // 不处理第三方库
  }

  // 使用正则移除 console.log/warn/error 调用（处理多行情况）
  const result = source.replace(
    /console\.(log|warn|error|info|debug)\([^)]*\);?\s*/g,
    ''
  );

  return result;
  // 也可以返回两个值：return this.callback(null, result, sourceMap);
};

// 异步 Loader（处理需要 I/O 或异步操作的情况）
module.exports = function asyncLoader(source) {
  const callback = this.async(); // 声明异步，返回 callback 函数

  someAsyncOperation(source)
    .then(result => {
      // callback 签名：(error, result, sourceMap?, meta?)
      // sourceMap 可选，传递给下一个 Loader
      callback(null, result);
    })
    .catch(err => {
      callback(err); // 传入 error，构建失败
    });
};

// webpack.config.js 中使用自定义 Loader
module.exports = {
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      exclude: /node_modules/,
      use: [
        'babel-loader',
        // 相对路径或绝对路径引用本地 loader
        path.resolve(__dirname, './loaders/strip-console-loader.js'),
      ]
    }]
  },
  // 或配置 resolveLoader 使 loader 路径解析更简洁
  resolveLoader: {
    modules: ['node_modules', path.resolve(__dirname, 'loaders')]
    // 这样就可以直接写 'strip-console-loader' 而不是绝对路径
  }
};
```

**常见 Loader / Plugin 清单：**

| 场景 | 常用方案 |
|---|---|
| TS 编译 | `ts-loader`（稳定）/ `esbuild-loader`（快 10-100x） |
| 样式处理 | `sass-loader` → `css-loader` → `style-loader`（开发）/ `MiniCssExtractPlugin.loader`（生产） |
| 静态资源 | webpack5 内置 `asset/resource`（替代 file-loader）|
| 代码压缩 | `TerserPlugin`（webpack5 内置）|
| HTML 生成 | `HtmlWebpackPlugin` |
| 包体积分析 | `webpack-bundle-analyzer` |

**💡 踩坑点**

```js
// ❌ 坑1：Loader 返回了非字符串类型（如 JSON 对象）
// 非最后一个 Loader 可以返回任意类型（传给下一个 Loader），
// 但最终输出给 webpack 的必须是 JS 字符串或 Buffer！

// ❌ 坑2：在 Loader 里用 require 加载文件但没有声明依赖
module.exports = function(source) {
  const config = require('./config.json'); // 这个文件变了不会触发重编译！
  // ✅ 正确做法：
  this.addDependency(path.resolve('./config.json')); // 声明文件依赖
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
  return transformSource(source, config);
};

// ❌ 坑3：style-loader 和 MiniCssExtractPlugin.loader 同时使用
// style-loader 把 CSS 注入 <style>，MiniCssExtractPlugin 抽成独立文件
// 两者功能互斥，不能共用同一个 rule
use: [
  isDev ? 'style-loader' : MiniCssExtractPlugin.loader,  // ✅ 二选一
  'css-loader',
  'sass-loader'
]
```

**🎯 面试追问**

- **Q: `style-loader` 和 `MiniCssExtractPlugin` 为什么开发用前者、生产用后者？**
  - A: `style-loader` 把 CSS 以 `<style>` 动态注入 DOM，支持 HMR（热更新 CSS 不刷页面）；`MiniCssExtractPlugin` 抽成独立 `.css` 文件，支持浏览器并行加载 CSS（不阻塞 JS）和基于 `contenthash` 的长期缓存，但不支持 HMR。开发重体验，生产重性能。
- **Q: Loader 从右到左执行的底层原因？**
  - A: webpack 把 `use` 数组 `reduceRight` 后做函数组合 `styleLoader(cssLoader(sassLoader(source)))`，函数组合（compose）的数学惯例是从右向左。可以理解为数据流从右侧的 source 出发，经过每个 Loader 管道流向左侧。
- **Q: 如何让 Loader 只对某些特定文件生效？**
  - A: 通过 `include`/`exclude` 字段，或使用 `oneOf` 减少无效匹配，或用 `resourceQuery` 匹配文件后缀参数（如 `?raw`）。

**⚠️ 常见误区**

- ❌ 认为 Loader 可以修改构建输出（如新增文件）→ 那是 Plugin 的职责，Loader 只能转换单个文件
- ❌ 认为 Loader 顺序从左到右 → 从右到左！`['A', 'B', 'C']` 实际执行 `A(B(C(source)))`
- ❌ 在 `module.exports` 上直接挂 Loader 函数但用了箭头函数 → 箭头函数没有 `this` 绑定，无法访问 `this.async()`、`this.resourcePath` 等 API

---

### Q: 什么是 Tree Shaking？它的工作原理和局限性？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**Tree Shaking** = 打包时删除**未使用的模块导出**（Dead Code Elimination）。名字来自"摇树"——摇树时枯叶（dead code）自然掉落。

**工作原理（两步走）：**

**第一步：标记（Mark）** — 利用 ESM 的静态结构分析使用情况：

```
为什么 ESM 支持静态分析，CJS 不行？

ESM:  import { add } from './utils'
      ↑ 语法关键字，编译时就确定了"从 utils 导入 add"，不能写在 if/函数里

CJS:  const { add } = require('./utils')
      ↑ 普通函数调用，运行时才执行，可以动态拼路径：require('./' + name)
      webpack 在编译时根本不知道你要 require 什么
```

**第二步：删除（Shake）** — 压缩阶段由 Terser 删除被标记为"未使用"的代码：

```js
// utils.js
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b; // ← 没有任何地方 import 它

// main.js
import { add } from './utils';  // 只导入 add

// webpack 打包后（生产模式），multiply 被完全删除：
const add = (a, b) => a + b;
console.log(add(1, 2));
```

**🔍 深层原理**

**ESM 静态分析的本质：**

Tree Shaking 能工作的根本原因在于 ESM 的**静态模块系统**。JavaScript 引擎在解析阶段（Parse Phase，代码还没执行）就能确定所有 `import`/`export` 的绑定关系，构建出一个**模块图（Module Graph）**。

```
模块图构建过程：

entry.js
  ├── import { add } from './utils'        → 标记 utils.add 为"已使用"
  └── import './styles.css'                → 标记 styles.css 为"有副作用"

utils.js
  ├── export const add = ...              → 被引用，保留
  └── export const multiply = ...         → 未被任何地方引用，标记为 unused

打包阶段：Terser 删除所有 unused 标记的代码
```

**webpack 标记机制：**

```js
// webpack 在打包时，会给未使用的导出加上注释标记
/* unused harmony export multiply */
const multiply = (a, b) => a * b;

// 然后 Terser 在压缩时识别这个注释并删除对应代码
// 所以 Tree Shaking 需要 usedExports: true + Terser 两步配合
```

**局限性和踩坑点：**

```js
// ❌ 1. CommonJS 包无法 tree shake（最常踩的坑！）
import _ from 'lodash';           // lodash 是 CJS，整个包都打进去（530KB）
import { cloneDeep } from 'lodash'; // 同样不行

// ✅ 改用 ESM 版本
import { cloneDeep } from 'lodash-es'; // 只打包 cloneDeep（几KB）

// ❌ 2. 有副作用的文件不会被删除
import './polyfill.js';   // 没用任何导出，但修改了 Array.prototype
import './styles.css';    // CSS 改变了页面样式，有副作用

// ✅ 在 package.json 声明哪些文件有副作用
{
  "sideEffects": false              // 整个包无副作用，全都可 shake
  // 或
  "sideEffects": ["*.css", "./src/polyfills.js"]  // 这些有副作用，不 shake
}

// ❌ 3. export default 导出的对象/类，无法细粒度 shake
export default {
  method1() {},
  method2() {}  // 即使只用 method1，method2 也不会被删
}

// ✅ 命名导出更利于 tree shake
export function method1() {}
export function method2() {}

// ❌ 4. 高阶函数/函数调用的返回值，webpack 无法判断有无副作用
// 比如类的装饰器、函数包装后再导出
export const MyClass = createClass(SomeBase); // webpack 不知道 createClass 有没有副作用

// ✅ 用 /*#__PURE__*/ 注释告诉 webpack/Terser 这个调用无副作用
export const MyClass = /*#__PURE__*/ createClass(SomeBase);
// React.createElement 和很多库的源码就大量使用了这个注释
```

**webpack 配置：**
```js
module.exports = {
  mode: 'production',  // 自动开启 usedExports + Terser
  optimization: {
    usedExports: true,   // 标记未使用导出
    sideEffects: true,   // 读取 package.json 的 sideEffects 字段
    minimize: true,      // 开启 Terser 删除死代码（production 默认开启）
  }
};
```

**💡 踩坑点**

```js
// 坑1：自己的业务代码也需要在 package.json 中设置 sideEffects
// 否则所有 import './xxx.css' 都会被误删
{
  "sideEffects": ["**/*.css", "**/*.scss", "./src/global.js"]
}

// 坑2：Babel 配置可能破坏 Tree Shaking
// 如果 @babel/preset-env 的 modules 设置为 'commonjs'，
// ESM 会被转成 CJS，Tree Shaking 直接失效
{
  "presets": [
    ["@babel/preset-env", {
      "modules": false  // ← 保持 ESM 格式，让 webpack 自己处理模块
    }]
  ]
}

// 坑3：re-export 的写法可能影响效果
// ❌ 以下写法可能导致整个 index 模块都被引入
export * from './components'; // barrel export，可能阻止精准 tree shake

// ✅ 更精确的导出
export { Button } from './Button';
export { Input } from './Input';
```

**🎯 面试追问**

- **Q: `sideEffects` 配在 package.json 里还是 webpack.config.js 里？区别是什么？**
  - A: `package.json` 里的 `sideEffects` 是给**使用这个包的打包工具**读的，声明"我这个库无副作用"；`webpack.config.js` 里的 `optimization.sideEffects: true` 是告诉 webpack 去读取依赖包 `package.json` 里的 `sideEffects`。两者配合才完整生效。自己的项目也可以在根 `package.json` 设置 `sideEffects` 来声明哪些文件有副作用。
- **Q: 为什么 Rollup 的 Tree Shaking 比 webpack 更彻底？**
  - A: Rollup 从设计之初只支持 ESM，模块图分析更纯粹；webpack 需要兼容 CJS/AMD/UMD，保守处理更多边界情况（如循环依赖、动态引用）。Vite 生产构建用 Rollup 也是出于这个原因。
- **Q: `/*#__PURE__*/` 注释是什么作用？**
  - A: 这是给 Terser/Rollup/esbuild 的提示注释，告诉压缩器"这个函数调用是纯函数（无副作用）"，可以在结果未被使用时安全删除。React 源码和很多库大量使用，例如 `React.createElement = /*#__PURE__*/ createElement`。

**⚠️ 常见误区**

- ❌ `import { cloneDeep } from 'lodash'` 能 tree shake → lodash 是 CJS，不行！要用 `lodash-es`
- ❌ 开发模式也会删 dead code → 只有 `mode: 'production'` 才真正删除，开发模式只是标记
- ❌ 只配 `usedExports: true` 就够了 → 还需要 Terser minimize 才能真正删除代码，两步缺一不可
- ❌ 所有 ESM 包都能 Tree Shaking → 还需要 `sideEffects` 正确配置，否则有副作用的模块无法被删除

---

### Q: Webpack 的 Code Splitting 有哪几种方式？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

Code Splitting 的目的：**减少首屏 bundle 体积**，让首屏更快，非首屏内容按需加载。

| 方式 | 配置 | 适用场景 |
|---|---|---|
| 多入口（Entry Points） | `entry: { a: './a', b: './b' }` | MPA 多页应用 |
| 动态导入（Dynamic Import）| `import('./module')` | 路由懒加载、功能按需加载 |
| SplitChunksPlugin | `optimization.splitChunks` | 提取公共依赖（vendor chunk） |

**1. 动态导入（最常用）
```js
// React Router v6 路由懒加载示例
import { lazy, Suspense } from 'react';

// import() 返回 Promise，webpack 自动将 Dashboard 拆成独立 chunk
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// 使用 webpack magic comments 控制 chunk 名称和加载策略
const AboutPage = lazy(() =>
  import(
    /* webpackChunkName: "about" */       // chunk 文件名：about.[hash].js
    /* webpackPrefetch: true */           // 浏览器空闲时预加载
    './pages/About'
  )
);

const HeavyComponent = lazy(() =>
  import(
    /* webpackChunkName: "heavy" */
    /* webpackPreload: true */            // 与父 chunk 并行加载（高优先级）
    './components/HeavyChart'
  )
);

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**prefetch vs preload 的区别：**

| 指令 | 时机 | 优先级 | 适用场景 |
|---|---|---|---|
| `webpackPrefetch` | 浏览器**空闲**时加载 | 低 | 未来可能访问的页面 |
| `webpackPreload` | 与父 chunk **并行**加载 | 高 | 当前页面依赖的关键资源 |

**2. SplitChunksPlugin（提取公共依赖）：**

```js
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',  // 'async'（默认，只分割异步）| 'initial' | 'all'
      minSize: 20000, // 生成 chunk 的最小体积（bytes），默认 20KB
      minChunks: 1,   // 模块被引用至少 n 次才提取
      cacheGroups: {
        // vendor chunk：将 node_modules 依赖单独打包
        // 优点：依赖不变时，vendor chunk 的 hash 不变，浏览器长期缓存
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,   // 优先级，数字越大越优先匹配
        },
        // common chunk：被多个入口引用的业务代码
        common: {
          name: 'common',
          minChunks: 2,   // 至少被 2 个 chunk 引用才提取
          priority: 5,
          reuseExistingChunk: true, // 如果模块已经被打包则复用，不再打包
        },
        // 单独抽离 React 相关（体积大，版本稳定，命中缓存率高）
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 20,  // 优先级最高，先匹配 react
        },
      },
    },
  },
};
```

**🔍 深层原理**

**动态 `import()` 的底层机制：**

```js
// webpack 将 import('./module') 编译成：
// 1. 在 HTML <head> 动态插入 <script> 标签
// 2. 通过 JSONP 加载 chunk 文件
// 3. chunk 加载完成后 resolve Promise

// 编译后的伪代码（webpack runtime）：
__webpack_require__.e("about") // 加载 about chunk
  .then(__webpack_require__.bind(null, "./pages/About.js"))
  .then(module => module.default);

// __webpack_require__.e 的实现：
function requireEnsure(chunkId) {
  // 检查 chunk 是否已加载
  if (installedChunks[chunkId] === 0) return Promise.resolve();
  
  // 创建 Promise，保存 resolve/reject
  var promise = new Promise((resolve, reject) => {
    installedChunks[chunkId] = [resolve, reject];
  });
  
  // 动态创建 <script> 标签
  var script = document.createElement('script');
  script.src = jsonpScriptSrc(chunkId); // 拼接 chunk URL
  document.head.appendChild(script);
  
  return promise;
}
```

**💡 踩坑点**

```js
// 坑1：import() 传动态变量，webpack 无法静态分析，会打包整个目录！
// ❌ 错误：动态变量路径
const module = await import(`./pages/${pageName}`);
// webpack 会把 ./pages/ 下所有文件都打成 chunk！

// ✅ 改为明确的路径或有限的条件
const loadPage = (name) => {
  const pages = {
    home: () => import('./pages/Home'),
    about: () => import('./pages/About'),
  };
  return pages[name]?.();
};

// 坑2：React.lazy 只支持 default export
// ❌ 只有 named export 的组件
export const MyComponent = () => <div />;
// React.lazy(() => import('./MyComponent')) → 报错！

// ✅ 需要手动 re-export 为 default
// 方案1：修改源文件加 default export
export default MyComponent;
// 方案2：包一层
const MyComponent = lazy(() =>
  import('./MyComponent').then(m => ({ default: m.MyComponent }))
);

// 坑3：splitChunks 的 chunks: 'async' 不处理同步 import
// 如果 react 用 import React from 'react' 引入（同步），
// chunks: 'async' 不会提取到 vendor chunk
// ✅ 改为 chunks: 'all' 处理所有类型
```

**🎯 面试追问**

- **Q: prefetch 和 preload 生成的 HTML 有什么区别？**
  - A: prefetch 生成 `<link rel="prefetch" href="chunk.js">`，优先级低，浏览器空闲才加载；preload 生成 `<link rel="preload" href="chunk.js" as="script">`，高优先级，与当前资源并行加载。误用 preload 可能阻塞首屏，性能反而变差。
- **Q: 如何验证 Code Splitting 是否生效？**
  - A: 用 `webpack-bundle-analyzer` 可视化 bundle 组成；Network 面板查看是否有按需加载的 chunk 文件；`stats.json` 中分析 chunks 字段。
- **Q: SplitChunksPlugin 中 `reuseExistingChunk` 有什么作用？**
  - A: 如果某个模块已经被独立打包进一个 chunk，`reuseExistingChunk: true` 会让其他地方引用时直接复用这个已有 chunk，而不是重复打包。避免同一段代码出现在多个 chunk 里。

**⚠️ 常见误区**

- ❌ `import()` 路径用变量会精准加载对应模块 → 动态变量会导致 webpack 打包整个目录的 chunk
- ❌ prefetch 就是 preload，都是提前加载 → prefetch 是低优先级空闲时加载，preload 是高优先级并行加载，用途完全不同
- ❌ SplitChunksPlugin 默认会提取所有公共代码 → 默认只处理异步 chunk（`chunks: 'async'`），同步 import 需要改为 `chunks: 'all'`

---

### Q: Webpack 性能优化有哪些方案？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

Webpack 性能优化分两个维度：**构建速度优化**（开发体验）和**产物体积优化**（用户体验）。

**构建速度优化：**

```js
// webpack.config.js
const os = require('os');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  // ① thread-loader：多进程并行编译（CPU 密集型 Loader 前使用）
  module: {
    rules: [{
      test: /\.[jt]sx?$/,
      use: [
        {
          loader: 'thread-loader',
          options: {
            workers: os.cpus().length - 1, // 留一个 CPU 给主进程
            poolTimeout: 2000,             // 进程池保持时间（ms）
          },
        },
        'babel-loader',  // 放在 thread-loader 后，在子进程里执行
        // 注意：thread-loader 后的 loader 不能用 this.emitFile 等特殊 API
      ],
    }],
  },

  // ② cache：持久化缓存（webpack5 内置，二次构建速度提升 60%+）
  cache: {
    type: 'filesystem',                       // 写入磁盘，而非内存（默认）
    cacheDirectory: path.resolve('.webpack-cache'), // 自定义缓存目录
    buildDependencies: {
      config: [__filename],  // webpack.config.js 变化时使缓存失效
    },
  },

  // ③ resolve 优化：减少模块查找时间
  resolve: {
    // 只找这些后缀，减少尝试次数（顺序就是查找优先级）
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // alias 路径别名，避免深层相对路径查找
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
    // 指定 node_modules 的查找位置，避免逐级向上查找
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  },

  // ④ 多进程压缩（生产构建）
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,  // 使用多进程并行压缩（默认 os.cpus().length - 1）
      }),
    ],
  },
};
```

**DllPlugin（预编译第三方库）：**

```js
// webpack.dll.config.js（单独运行，提前编译第三方库）
const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    // 把不常变化的第三方库打成 DLL
    vendor: ['react', 'react-dom', 'lodash-es', 'axios'],
  },
  output: {
    filename: '[name].dll.js',       // vendor.dll.js
    path: path.resolve(__dirname, 'dll'),
    library: '[name]_lib',           // 暴露到全局变量
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_lib',            // 和 library 保持一致
      path: path.resolve(__dirname, 'dll/[name]-manifest.json'),
    }),
  ],
};

// webpack.config.js（主配置，引用预编译的 DLL）
module.exports = {
  plugins: [
    // 告诉 webpack 这些模块不需要打包，从 DLL 里找
    new webpack.DllReferencePlugin({
      manifest: require('./dll/vendor-manifest.json'),
    }),
    // 自动把 dll.js 注入 HTML
    new AddAssetHtmlPlugin({
      filepath: path.resolve(__dirname, 'dll/vendor.dll.js'),
    }),
  ],
};

// package.json scripts
// "build:dll": "webpack --config webpack.dll.config.js"
// 只需要在依赖变化时重新运行 build:dll，平时构建直接跳过这些库
```

**🔍 深层原理**

**为什么 thread-loader 能加速构建？**

webpack 默认在单进程（Node.js 主进程）里串行处理所有模块。babel-loader 做 AST 解析和转换是 CPU 密集型操作，单核处理成为瓶颈。thread-loader 会创建一个 Worker 线程池，把后续 Loader 的执行分发到子进程，多核并行处理：

```
单进程（默认）：                    多进程（thread-loader）：
module-A → babel → 完成             主进程: 分发任务
module-B → babel → 完成    →→→     Worker1: module-A babel → 完成
module-C → babel → 完成             Worker2: module-B babel → 完成
（串行）                            Worker3: module-C babel → 完成
                                    （并行，速度约为 n 倍）
```

**webpack5 持久化缓存工作机制：**

```
首次构建：
  模块 → Loader处理 → AST解析 → 序列化 → 写入磁盘缓存

二次构建：
  检测文件 mtime/hash 变化
    ↓ 未变化
  从磁盘反序列化模块（跳过Loader和AST解析）
    ↓ 已变化
  重新处理，更新缓存
```

**💡 踩坑点**

```js
// 坑1：thread-loader 不能与某些 Loader 配合使用
// 以下 Loader 使用了 webpack 特殊 API（emitFile、emitWarning 等），
// 无法在子进程中运行：
// - mini-css-extract-plugin loader
// - 需要访问 compiler/compilation 的 loader

// 坑2：DllPlugin 在 webpack5 中性价比不高
// webpack5 的持久化缓存已经能实现类似效果，
// 维护两套 webpack 配置的成本往往高于 DllPlugin 带来的收益
// ✅ webpack5 项目优先用 cache: { type: 'filesystem' }

// 坑3：resolve.extensions 列表不要太长
// ❌ extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.vue', '.css']
// 每个文件查找时都要尝试所有后缀，列表越长越慢
// ✅ 只放必要的，且把最常用的放前面

// 坑4：cache buildDependencies 没配，配置文件改了缓存没失效
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename],  // ← 必须配，否则改 webpack.config.js 不生效
  },
},
```

**产物体积优化（速查）：**

| 优化手段 | 效果 | 备注 |
|---|---|---|
| Tree Shaking | 删除未使用代码 | 需 ESM + sideEffects 配置 |
| Code Splitting | 按需加载，减少首屏 | `import()` + SplitChunks |
| 压缩（Terser/esbuild）| 减少 JS 体积 30-50% | production 默认开启 |
| gzip/brotli 压缩 | 减少传输体积 60-70% | 需服务端配合 |
| 图片压缩/WebP | 减少图片体积 | `image-minimizer-webpack-plugin` |
| 外部化（externals）| 大库不打包，走 CDN | React/Vue 可外部化 |

**🎯 面试追问**

- **Q: DllPlugin 和 externals 有什么区别？**
  - A: `DllPlugin` 是把第三方库**预编译**成 DLL，仍然本地打包（只是不重复编译），适合内网或不方便用 CDN 的场景；`externals` 是完全**不打包**某个库，在运行时从全局变量（window.React 等）或 CDN 获取，bundle 体积更小，但依赖网络和 CDN 可用性。
- **Q: 如何分析 webpack 打包结果，找到体积大的模块？**
  - A: 用 `webpack-bundle-analyzer` 插件生成交互式 treemap 视图，直观看到每个模块的体积占比；或用 `webpack --profile --json > stats.json` 生成统计文件，上传到 `webpack.jakoblind.no` 分析。
- **Q: babel-loader 开启缓存 vs webpack5 持久化缓存，有什么区别？**
  - A: `babel-loader?cacheDirectory=true` 只缓存 Babel 编译结果（`.babel-cache` 目录）；webpack5 的 `cache: filesystem` 缓存整个模块处理结果（包括 Loader 链、依赖解析、模块 hash 等），粒度更粗但覆盖更全。两者可以同时开启叠加效果。

**⚠️ 常见误区**

- ❌ thread-loader 放在所有 Loader 前都有效 → 进程通信有开销，文件少时反而更慢，只对大型项目（数百个模块）有效
- ❌ DllPlugin 在 webpack5 仍然是必选优化 → webpack5 持久化缓存效果相当，新项目优先用缓存
- ❌ `resolve.extensions` 加越多越好 → 越长越慢，只加必要的后缀

---

### Q: Webpack HMR（热更新）的工作原理是什么？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

HMR（Hot Module Replacement）在不刷新整个页面的情况下，将修改的模块替换到运行中的应用，保留应用状态（如表单输入、滚动位置）。

**整体流程（7步）：**

```
① 启动 webpack-dev-server（WDS），建立 HTTP + WebSocket 服务
② 浏览器加载页面，webpack runtime 注入 HMR 客户端代码
③ 浏览器与 WDS 建立 WebSocket 长连接
④ 开发者修改源文件，webpack 增量编译（只重新编译变化的模块）
⑤ 编译完成后，WDS 通过 WebSocket 推送消息：{ type: 'hash', hash: 'abc123' }
⑥ 浏览器收到消息，通过 AJAX 请求 /xxx.hot-update.json（清单文件）
   ↓ 清单文件告诉浏览器哪些 chunk 有更新
⑦ 浏览器加载更新的 chunk（.hot-update.js），webpack runtime 替换对应模块
   ↓ 模块替换成功 → 触发模块的 HMR accept 回调
   ↓ 替换失败（无 accept 回调）→ 整页刷新兜底
```

**HMR 客户端代码（webpack runtime 注入）：**

```js
// webpack 会在 bundle 中注入这段 HMR 运行时代码

// WebSocket 连接（接收服务端推送）
const socket = new WebSocket('ws://localhost:8080');

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  
  if (message.type === 'hash') {
    // 保存最新的 hash，用于构造 hot-update 文件的 URL
    currentHash = message.hash;
  }
  
  if (message.type === 'ok') {
    // 编译完成，检查并应用更新
    checkForUpdates();
  }
};

async function checkForUpdates() {
  // 1. 请求 hot-update.json：{ c: { "main": true }, r: [], m: [] }
  //    c = changed chunks, r = removed modules, m = updated modules
  const manifest = await fetch(`/${currentHash}.hot-update.json`);
  
  // 2. 加载更新的 chunk
  for (const chunkId of manifest.c) {
    await loadChunk(`${chunkId}.${currentHash}.hot-update.js`);
  }
  
  // 3. 应用更新（触发 module.hot.accept 回调）
  applyUpdates();
}
```

**模块级 HMR API（框架层面）：**

```js
// 业务代码中手动接受热更新（通常由框架封装，不需要手写）
if (module.hot) {
  // accept 无参数：当前模块自身变化时的处理
  module.hot.accept(() => {
    // 重新执行当前模块的初始化逻辑
    renderApp();
  });

  // accept 带路径：指定依赖变化时的处理
  module.hot.accept('./utils', () => {
    // utils.js 变化后，重新导入并更新引用
    const newUtils = require('./utils');
    updateWithNewUtils(newUtils);
  });
  
  // dispose：模块被替换前的清理工作
  module.hot.dispose((data) => {
    clearInterval(timer);      // 清理定时器
    data.state = currentState; // 把需要保留的状态传给新模块
  });
}

// React Fast Refresh（现代 React 项目的 HMR）
// 由 @pmmmwh/react-refresh-webpack-plugin 自动注入，
// 能精确替换 React 组件，同时保留 hooks 状态（useState 的值不丢失）
```

**🔍 深层原理**

**增量编译（只重编译变化的模块）：**

```
文件变化检测（chokidar 监听文件系统事件）
    ↓
找到变化的模块（通过文件路径 → 模块 ID 的映射）
    ↓
只重新处理该模块及其依赖链（ModuleGraph 向上追溯）
    ↓
生成 .hot-update.js（只包含变化的模块代码）
和 .hot-update.json（变化的 chunk 清单）
    ↓
通过 WebSocket 通知浏览器

对比全量构建：只处理 1-2 个模块 vs 处理全部 500 个模块
→ 增量构建通常在 100ms 内完成
```

**为什么 CSS 热更新比 JS 快？**

CSS 热更新不走 webpack HMR 的模块替换流程，`style-loader` 直接在 DOM 里找到对应的 `<style>` 标签并替换其内容，整个过程不经过模块系统，毫秒级响应。

**💡 踩坑点**

```js
// 坑1：模块没有 accept 回调，HMR 会一层层向上冒泡，最终整页刷新
// React 项目配了 react-refresh 就自动处理了，手写代码时要注意

// 坑2：module.hot.accept 里的 require 是静态缓存的
module.hot.accept('./utils', () => {
  // ❌ 这里的 import 是 ESM，ES6 import 是绑定引用，会自动更新
  // 但 require 是值拷贝，需要重新 require
  const utils = require('./utils'); // ← 需要重新 require 才能拿到新模块
});

// 坑3：HMR 不等于状态保留，需要框架支持
// 普通 JS 模块热更新后，模块内的变量会重新初始化
// React Fast Refresh 才能在替换组件的同时保留 hooks 状态

// 坑4：webpack-dev-server 的 hot 和 liveReload 区别
module.exports = {
  devServer: {
    hot: true,        // 开启 HMR（模块热替换）
    liveReload: true, // 开启实时刷新（整页刷新，比 HMR 低级）
    // hot 优先级高于 liveReload，HMR 失败才 fallback 到 liveReload
  }
};
```

**🎯 面试追问**

- **Q: React Fast Refresh 和老版 react-hot-loader 有什么区别？**
  - A: `react-hot-loader` 是社区方案，通过 Babel 插件和高阶组件实现，有很多 edge case（class 组件不稳定，hooks 状态丢失）；React Fast Refresh 是 React 官方方案，深度集成到 React reconciler，支持 hooks 状态保留，class/function 组件都支持，且是白盒实现（Facebook 自用）。
- **Q: HMR 的 WebSocket 消息里有哪些类型？**
  - A: 主要有 `hash`（新编译完成的 hash）、`ok`（编译成功，可以检查更新）、`errors`（编译出错，显示错误信息）、`warnings`（有告警）。
- **Q: 为什么 webpack-dev-server 不用轮询而用 WebSocket？**
  - A: WebSocket 是服务端推送，服务端（WDS）在编译完成后主动推送通知，延迟低（毫秒级）；轮询需要客户端定时请求，延迟高且浪费带宽。WebSocket 也支持双向通信，客户端可以向服务端发送消息。

**⚠️ 常见误区**

- ❌ HMR 就是自动刷新页面 → HMR 是模块替换，不刷页面；liveReload 才是刷页面
- ❌ 所有修改都能 HMR → 没有 `module.hot.accept` 处理的模块会导致整页刷新
- ❌ CSS 的 HMR 和 JS 一样走模块替换 → CSS 由 style-loader 直接操作 DOM，不走 HMR 流程

---

### Q: source map 的作用和常见配置有哪些？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

source map 是一个 JSON 文件，记录了**编译后代码到源代码的位置映射**，让开发者在浏览器 DevTools 里能看到并调试原始源码，而不是压缩后的乱码。

**source map 文件结构：**

```json
{
  "version": 3,            // source map 规范版本
  "file": "main.js",       // 编译后的文件名
  "sourceRoot": "/src/",   // 源文件根路径（可选）
  "sources": ["./app.ts"], // 源文件路径列表
  "sourcesContent": ["..."],// 源文件内容（内嵌，可选）
  "names": ["add","result"],// 原始变量名列表
  "mappings": "AAAA,SAAS,GAAG..."  // VLQ 编码的位置映射（核心）
}
```

**`mappings` 字段（VLQ 编码）解读：**

```
mappings 是用分号（;）分隔行、逗号（,）分隔列的 Base64 VLQ 编码字符串
每个"段"包含 4-5 个数字：
  [编译后列偏移, 源文件索引, 源码行偏移, 源码列偏移, 变量名索引]

这样浏览器就能从压缩后的某个位置，反查到源码的对应位置
```

**webpack 的 devtool 配置选项：**

```js
module.exports = {
  // 开发环境推荐：速度快，映射准确
  devtool: 'eval-cheap-module-source-map',
  
  // 生产环境推荐：单独文件，不暴露源码
  devtool: 'hidden-source-map',
};
```

**常用 devtool 对比：**

| devtool 值 | 构建速度 | 重建速度 | 映射质量 | 适用环境 |
|---|---|---|---|---|
| `eval` | 最快 | 最快 | 低（无列信息）| 开发（快速迭代）|
| `eval-source-map` | 慢 | 快 | 高（有列信息）| 开发 |
| `eval-cheap-module-source-map` | 较快 | 快 | 中（只有行）| 开发（推荐）|
| `source-map` | 最慢 | 最慢 | 最高 | 生产（需要调试）|
| `hidden-source-map` | 最慢 | 最慢 | 最高 | 生产（上报给 Sentry）|
| `nosources-source-map` | 慢 | 慢 | 中 | 生产（显示行列但不暴露源码）|
| `false` / 不设置 | 最快 | 最快 | 无 | 生产（不需要调试）|

**关键词含义：**

```
eval:    将模块代码包在 eval() 里，通过 sourceURL 注释关联源文件
cheap:   只映射到行，不映射到列（列信息占据 source map 80% 体积）
module:  映射到 Loader 处理前的源码（如 TypeScript 原文件，而非转换后的 JS）
inline:  把 source map 内嵌到 bundle 里（data URI），不生成单独文件
hidden:  生成 source map 文件但不在 bundle 里引用（.js 末尾无 sourceMappingURL 注释）
```

**生产环境 source map 最佳实践：**

```js
// 生产环境推荐配置
module.exports = {
  devtool: 'hidden-source-map',
  plugins: [
    // 将 source map 上传到 Sentry 错误监控平台
    // 这样出错时能看到源码位置，但用户无法在浏览器下载 source map
    new SentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'your-org',
      project: 'your-project',
      include: './dist',
      release: process.env.BUILD_VERSION,
    }),
  ],
};

// Nginx 配置：禁止外部访问 .map 文件
// location ~* \.map$ {
//   deny all;
// }
```

**🔍 深层原理**

source map 的 `mappings` 使用 **Base64 VLQ（Variable-Length Quantity）** 编码，用变长编码表示整数，小数字占 1 字节，大数字占多字节。所有映射都是**相对偏移**（而非绝对位置），这大幅减少了数字大小和编码长度。

浏览器 DevTools 内置 source map 解析器，读取 JS 文件末尾的 `//# sourceMappingURL=main.js.map` 注释，加载对应的 `.map` 文件，解码 VLQ 映射，在调试时动态翻译位置信息。

**💡 踩坑点**

```js
// 坑1：生产环境用了 source-map 但没保护，源码直接暴露给用户
// 用户打开 DevTools 就能看到完整 TypeScript 源码！
// ✅ 生产环境用 hidden-source-map，source map 文件只上传到监控平台

// 坑2：eval-cheap-source-map 和 eval-cheap-module-source-map 的区别
// eval-cheap-source-map: 映射到 Loader 处理后的 JS（如 Babel 转换后的代码）
// eval-cheap-module-source-map: 映射到原始源文件（TS/JSX 等）
// ✅ 开发环境推荐 eval-cheap-module-source-map，能看到 TS 原文件

// 坑3：source map 体积很大，不要把 inline source map 部署到生产
// source map 通常是 bundle 的 3-5 倍大小，inline 会让 bundle 体积暴增
devtool: 'inline-source-map', // ❌ 不要在生产用
```

**🎯 面试追问**

- **Q: 浏览器如何知道去哪里加载 source map 文件？**
  - A: webpack 在编译后的 JS 文件末尾添加注释 `//# sourceMappingURL=main.js.map`（相对路径）或 data URI（inline 模式）。浏览器 DevTools 打开时读取这个注释，从对应 URL 加载 `.map` 文件。`hidden-source-map` 生成文件但不添加注释，所以浏览器不会自动加载。
- **Q: Sentry 是如何利用 source map 还原错误堆栈的？**
  - A: 用户端 JS 报错时，Sentry SDK 捕获错误的压缩后堆栈信息（文件名、行列号）；Sentry 服务端有你上传的 source map，用 `source-map` 库根据压缩后的行列号查找 VLQ 映射，反查到源码的对应位置，展示在 Sentry 控制台。整个过程在服务端完成，用户不接触 source map。
- **Q: cheap 选项为什么能显著提升构建速度？**
  - A: 列信息占 source map mappings 字段约 80% 的体积和生成时间。去掉列信息（cheap）后，每行只需一条映射记录，生成速度大幅提升。代价是调试时只能定位到行，无法精确到某一列（对于大多数调试场景已经足够）。

**⚠️ 常见误区**

- ❌ `eval` devtool 生成了 source map 文件 → eval 是把 sourceURL 嵌在 eval() 里，不生成独立 .map 文件
- ❌ 生产用 `source-map` 就能调试且安全 → 会在 bundle 里留 sourceMappingURL，用户能下载源码，应用 `hidden-source-map`
- ❌ source map 越详细调试越方便，应该总用 `source-map` → 开发环境用 `source-map` 构建极慢，用 `eval-cheap-module-source-map` 在速度和质量间取平衡

---
