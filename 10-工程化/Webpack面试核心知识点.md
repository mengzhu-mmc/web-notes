# Webpack 面试核心知识点

## 关联笔记

- [[10-工程化/Webpack5核心特性]]
- [[10-工程化/Vite深入理解]]
- [[10-工程化/前端工程化全景]]

---

## 一、构建流程（必问）

### 1.1 Webpack 完整构建流程

面试中被问到"Webpack 的构建流程"时，需要能清晰地描述以下阶段：

```
初始化阶段
  ├── 读取 webpack.config.js，合并 CLI 参数和默认配置
  ├── 创建 Compiler 对象（全局唯一，贯穿整个构建生命周期）
  └── 注册所有配置的 Plugin（调用 plugin.apply(compiler)）

编译阶段
  ├── compiler.run() 触发 compile 事件
  ├── 创建 Compilation 对象（每次构建都会新建，包含模块、chunk、资源等信息）
  ├── 从 entry 入口出发，调用对应的 Loader 对模块进行转译
  ├── 递归解析模块依赖（AST 分析 import/require），构建模块依赖图
  └── 所有模块转译完成后触发 seal 事件

输出阶段
  ├── 根据依赖图将模块组装成一个个 Chunk
  ├── 将 Chunk 转换为最终的文件内容（Assets）
  └── 根据 output 配置将文件写入文件系统
```

> [!tip] 面试回答要点
> 三个阶段：初始化 → 编译（make） → 输出（seal + emit）。核心对象是 Compiler（全局单例）和 Compilation（每次构建新建）。Loader 在编译阶段工作，Plugin 通过 Tapable 钩子贯穿全流程。

### 1.2 Compiler 和 Compilation 的区别

```
Compiler
├── 全局唯一，代表整个 Webpack 环境
├── 包含完整的 Webpack 配置
├── 生命周期：从启动到结束
├── 核心钩子：beforeRun → run → compile → make → afterCompile → emit → done
└── 通过 compiler.hooks.xxx.tap() 注册插件

Compilation
├── 每次构建（包括 watch 模式下的重新编译）都会新建
├── 包含当前构建的模块资源、编译生成的资源、变化的文件等
├── 核心钩子：buildModule → seal → optimize → afterSeal
└── 提供了很多模块和依赖相关的 API
```

| 对比项 | Compiler | Compilation |
| --- | --- | --- |
| 创建次数 | 整个生命周期只创建一次 | 每次构建都重新创建 |
| 角色 | 总指挥，统筹全局 | 具体战役的指挥官 |
| 包含内容 | 配置信息、插件注册、文件系统接口 | 本次构建的模块、依赖、Chunk、资源 |
| 生命周期 | 从启动到进程结束 | 一次构建开始到结束 |

**不同场景的创建时机：**

普通构建（`webpack build`）：每次执行命令都是新进程，Compiler 和 Compilation 都重新创建。

Watch 模式：Compiler 只创建一次，文件变化时销毁旧 Compilation，创建新 Compilation 进行增量编译。

HMR 热更新：同 Watch 模式，Compiler 持久存在，新 Compilation 只编译变化的模块，生成热更新补丁通过 WebSocket 推送到浏览器。

---

## 二、Loader

### 2.1 Loader 的本质与执行顺序

Loader 本质上是一个函数，接收源文件内容作为参数，返回转换后的内容。

```javascript
// 最简单的 Loader
module.exports = function(source) {
  // source 是文件内容字符串
  return source.replace(/console\.log\(.*?\);?/g, '');
};
```

执行顺序的关键点：

```javascript
module: {
  rules: [
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader']
      //     ← 从右到左执行（pitch 阶段从左到右）
      //     postcss-loader → css-loader → style-loader
    }
  ]
}
```

Loader 有两个阶段：pitch 阶段（从左到右）和 normal 阶段（从右到左）。如果某个 Loader 的 pitch 方法返回了值，则跳过后续 Loader，直接进入前一个 Loader 的 normal 阶段（熔断机制）。

### 2.2 手写一个 Loader

```javascript
// markdown-loader.js：将 Markdown 转为 HTML 字符串模块
const marked = require('marked');

module.exports = function(source) {
  // this.cacheable() 开启缓存（默认开启）
  this.cacheable && this.cacheable();

  // 异步 Loader 用 this.async()
  // const callback = this.async();

  const html = marked.parse(source);
  // 返回一个 JS 模块字符串
  return `export default ${JSON.stringify(html)}`;
};

// 使用
// webpack.config.js
module.exports = {
  module: {
    rules: [
      { test: /\.md$/, use: './markdown-loader.js' }
    ]
  }
};
```

> [!important] 面试高频
> 常见 Loader 的作用：babel-loader（ES6+ → ES5）、css-loader（解析 CSS 中的 @import 和 url()）、style-loader（将 CSS 注入 DOM 的 style 标签）、file-loader/asset（处理文件资源）、ts-loader（TS → JS）。

---

## 三、Plugin

### 3.1 Plugin 的本质与 Tapable

Plugin 是一个具有 `apply` 方法的类，通过 Webpack 的 Tapable 钩子系统在构建的各个阶段执行自定义逻辑。

```javascript
// Tapable 是 Webpack 的事件流机制，类似于 Node.js 的 EventEmitter
// 但提供了更丰富的钩子类型：

// SyncHook          - 同步串行，不关心返回值
// SyncBailHook      - 同步串行，返回非 undefined 则跳过后续
// SyncWaterfallHook - 同步串行，上一个的返回值传给下一个
// AsyncParallelHook - 异步并行
// AsyncSeriesHook   - 异步串行
```

### 3.2 手写一个 Plugin

```javascript
// BundleSizePlugin.js：打包完成后输出每个文件的大小
class BundleSizePlugin {
  constructor(options = {}) {
    this.limit = options.limit || 200 * 1024; // 默认 200KB 警告
  }

  apply(compiler) {
    const pluginName = 'BundleSizePlugin';

    // 在 emit 阶段（文件写入磁盘前）执行
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      const assets = compilation.assets;

      console.log('\n📦 Bundle Size Report:');
      Object.keys(assets).forEach(filename => {
        const size = assets[filename].size();
        const sizeKB = (size / 1024).toFixed(2);
        const warning = size > this.limit ? ' ⚠️ 超出限制!' : '';
        console.log(`  ${filename}: ${sizeKB} KB${warning}`);
      });

      callback(); // 异步钩子必须调用 callback
    });
  }
}

module.exports = BundleSizePlugin;

// 使用
// webpack.config.js
const BundleSizePlugin = require('./BundleSizePlugin');
module.exports = {
  plugins: [
    new BundleSizePlugin({ limit: 150 * 1024 })
  ]
};
```

### 3.3 Plugin 常用生命周期钩子

开发插件时，最常接触的三个节点：`make`（开始分析依赖）、`processAssets`（处理代码压缩转换）、`emit`（最终生成文件前）。

| 阶段 | 钩子 | 说明 |
|------|------|------|
| 初始化 | `entryOption` | entry 处理后 |
| 初始化 | `afterPlugins` | 插件设置完成后 |
| 开始编译 | `run` / `watchRun` | 开始读取记录前 |
| 编译构建 | `compile` | 新 Compilation 创建前 |
| 编译构建 | `compilation` | 编译创建后，可监听模块处理 |
| 编译构建 | `make` | 从入口分析依赖、构建模块的递归过程 |
| 优化资源 | `optimize` | 优化开始 |
| 优化资源 | `processAssets` | 处理生成的资源（Webpack 5 推荐） |
| 输出 | `emit` | 生成资源到 output 目录前（最后修改机会） |
| 输出 | `afterEmit` | 文件写入磁盘后 |
| 结束 | `done` | 编译完成（无论成功失败） |
| 结束 | `failed` | 编译失败 |

### 3.4 Loader 和 Plugin 的区别

| 维度 | Loader | Plugin |
|------|--------|--------|
| 本质 | 转换函数 | 带 apply 方法的类 |
| 作用 | 对特定类型的文件进行转换 | 扩展 Webpack 功能，可介入构建全流程 |
| 执行时机 | 在模块编译阶段 | 通过钩子在任意阶段执行 |
| 配置位置 | module.rules | plugins 数组 |
| 使用方式 | 链式调用，从右到左 | 实例化后注册到 hooks |

---

## 四、热更新原理（HMR）

### 4.1 HMR 完整流程

```
1. 启动阶段
   ├── webpack-dev-server 启动本地服务器
   ├── Webpack 以 watch 模式编译
   └── 服务端和浏览器之间建立 WebSocket 连接

2. 文件修改后
   ├── Webpack 监听到文件变化，重新编译
   ├── 编译完成后生成两个文件：
   │   ├── [hash].hot-update.json  （manifest，描述哪些 chunk 更新了）
   │   └── [hash].hot-update.js    （更新的模块代码）
   └── 通过 WebSocket 向浏览器发送 { type: 'hash', data: newHash }

3. 浏览器端
   ├── HMR Runtime 收到通知
   ├── 通过 JSONP 请求 hot-update.json 获取更新清单
   ├── 再请求 hot-update.js 获取更新的模块代码
   ├── 调用 module.hot.accept() 中注册的回调
   └── 用新模块替换旧模块，页面局部更新（不刷新）
```

> [!tip] 面试回答要点
> 核心是 WebSocket 通知 + JSONP 拉取更新。Webpack 编译生成 manifest 和更新模块，浏览器端的 HMR Runtime 负责拉取和替换。如果模块没有配置 `module.hot.accept()`，则会冒泡到入口，最终 fallback 为整页刷新。

---

## 五、性能优化

### 5.1 构建速度优化

```javascript
// 1. 缩小搜索范围
module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'], // 减少不必要的后缀尝试
    alias: { '@': path.resolve(__dirname, 'src') },
    modules: [path.resolve(__dirname, 'node_modules')], // 指定模块目录
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'), // 只处理 src 目录
        // exclude: /node_modules/,  // 或者排除 node_modules
        use: 'babel-loader',
      }
    ]
  }
};

// 2. 持久化缓存（Webpack 5）
module.exports = {
  cache: {
    type: 'filesystem',  // 文件系统缓存，二次构建速度大幅提升
    buildDependencies: {
      config: [__filename], // 配置文件变化时缓存失效
    }
  }
};

// 3. 多线程编译
// thread-loader：将耗时的 Loader 放到 worker pool 中运行
module.exports = {
  module: {
    rules: [{
      test: /\.js$/,
      use: ['thread-loader', 'babel-loader'] // thread-loader 放在最前面
    }]
  }
};
```

### 5.2 产物体积优化

```javascript
// 1. Tree Shaking（摇树优化）
// 前提：使用 ES Module（import/export），production 模式默认开启
// 原理：静态分析 import/export，标记未使用的导出，在压缩阶段删除

// package.json 中标记副作用
{
  "sideEffects": false,  // 所有模块都无副作用，可以安全 tree shake
  // 或者指定有副作用的文件
  "sideEffects": ["*.css", "*.less", "./src/polyfill.js"]
}

// 2. Code Splitting（代码分割）
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          minChunks: 2,       // 被至少 2 个 chunk 引用
          name: 'common',
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        }
      }
    }
  }
};

// 3. 动态导入（懒加载）
// Webpack 遇到 import() 会自动进行代码分割
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// 带魔法注释
import(
  /* webpackChunkName: "dashboard" */
  /* webpackPrefetch: true */
  './Dashboard'
);
```

### 5.3 Tree Shaking 原理详解

```
为什么必须用 ES Module？
├── ES Module 是静态结构：import/export 在编译时就能确定
├── CommonJS 是动态的：require() 可以在条件语句中，运行时才能确定
└── 静态分析是 Tree Shaking 的前提

Tree Shaking 的过程：
1. Make 阶段：收集模块导出变量，记录依赖关系
2. Seal 阶段：遍历所有模块，标记被使用的导出（harmony export）
3. 生成代码时：未被标记的导出不会生成 export 语句
4. Terser 压缩时：删除这些"死代码"（Dead Code Elimination）
```

---

## 六、Source Map

### 6.1 常用配置及区别

| 模式 | 构建速度 | 重建速度 | 质量 | 适用场景 |
|------|---------|---------|------|---------|
| `eval` | 最快 | 最快 | 生成代码 | 开发（不关心映射质量） |
| `eval-cheap-module-source-map` | 快 | 快 | 原始源码（仅行） | **开发推荐** |
| `source-map` | 最慢 | 最慢 | 原始源码（行+列） | **生产推荐**（配合上传到错误监控平台） |
| `hidden-source-map` | 最慢 | 最慢 | 原始源码 | 生产（不暴露给用户） |
| `nosources-source-map` | 慢 | 慢 | 仅行列信息 | 生产（保护源码） |

> [!tip] 面试回答要点
> 开发环境用 `eval-cheap-module-source-map`（速度快，能定位到原始源码的行）。生产环境用 `hidden-source-map` 或 `nosources-source-map`（生成 map 文件上传到 Sentry 等平台，但不暴露给用户）。

---

## 七、Webpack 5 新特性

### 7.1 核心变化

```
1. 持久化缓存（cache.type: 'filesystem'）
   - Webpack 4 需要 hard-source-webpack-plugin
   - Webpack 5 内置，二次构建速度提升 70%+

2. 资源模块（Asset Modules）
   - 替代 file-loader、url-loader、raw-loader
   - asset/resource → 输出文件（替代 file-loader）
   - asset/inline   → 导出 Data URI（替代 url-loader）
   - asset/source   → 导出源代码（替代 raw-loader）
   - asset          → 自动选择（小于 8KB 内联，否则输出文件）

3. Module Federation（模块联邦）
   - 多个独立构建的应用运行时共享模块
   - 微前端的重要实现方案

4. 更好的 Tree Shaking
   - 支持嵌套的 tree shaking（导出对象的属性级别）
   - 支持 CommonJS 的 tree shaking（有限支持）

5. 不再自动 polyfill Node.js 核心模块
   - Webpack 4 会自动引入 crypto、buffer 等 polyfill
   - Webpack 5 需要手动配置 resolve.fallback
```

---

## 八、Webpack vs Vite

| 维度 | Webpack | Vite |
|------|---------|------|
| 开发模式 | 先打包再启动服务 | 利用浏览器原生 ESM，按需编译 |
| 启动速度 | 慢（项目越大越慢） | 极快（不需要打包） |
| HMR 速度 | 与模块数量相关 | 始终快速（精确失效） |
| 生产构建 | 自身打包 | 底层用 Rollup 打包 |
| 生态 | 最成熟，插件最多 | 快速增长，兼容 Rollup 插件 |
| 配置复杂度 | 较高 | 开箱即用，配置简单 |

> [!tip] 面试回答要点
> Vite 开发体验好是因为利用了浏览器原生 ES Module，不需要打包就能启动。但生产环境仍然需要打包（用 Rollup），因为浏览器请求大量小模块会有网络瀑布流问题。Webpack 的优势在于生态成熟、配置灵活、对复杂场景支持更好。

---

## 九、面试常见问答

### Q1：Webpack 的 hash、chunkhash、contenthash 有什么区别？

hash 是整个项目的 hash，任何文件变化都会改变。chunkhash 是根据 chunk 内容生成的，同一个 chunk 内的文件共享 hash。contenthash 是根据文件自身内容生成的，最精确。

实际使用：JS 文件用 chunkhash，CSS 文件用 contenthash（因为 CSS 是从 JS 中提取出来的，用 chunkhash 会导致 JS 变化时 CSS 的 hash 也变）。

### Q2：Webpack 的 Module、Chunk、Bundle 分别是什么？

Module 是源代码中的每个文件（一个 JS、一个 CSS、一张图片都是一个 Module）。Chunk 是 Webpack 打包过程中的代码块，由多个 Module 组成（入口 chunk、异步 chunk、splitChunks 产生的 chunk）。Bundle 是最终输出的文件，一个 Chunk 通常对应一个 Bundle。

**Entry 与 Chunk Group 的关系（进阶）：** 一个入口（Entry）对应一个"Chunk Group"，而非简单的一个 Chunk。Chunk Group 包含 Initial Chunk（入口文件自身代码）、Split Chunks（被 `cacheGroups` 拆分出的公共代码或第三方库）、Async Chunks（通过 `import()` 懒加载产生的代码块）。例如将 `node_modules` 下的 `react` 和 `lodash` 抽离为独立的 vendors Chunk，此时 1 个 Entry 对应 2 个 Chunk。

### Q3：babel-loader 和 ts-loader 的区别？

babel-loader 通过 `@babel/preset-typescript` 处理 TS，只做语法转换（直接删除类型注解），不做类型检查，速度快。ts-loader 调用 TypeScript 编译器，既做语法转换又做类型检查，速度慢但更安全。

推荐方案：用 babel-loader 编译（快），配合 `fork-ts-checker-webpack-plugin` 在单独进程中做类型检查（不阻塞构建）。

### Q4：如何分析 Webpack 打包产物？

使用 `webpack-bundle-analyzer` 插件，它会生成一个可视化的 treemap，直观展示每个模块的体积占比，帮助发现体积过大的依赖。配合 `speed-measure-webpack-plugin` 可以分析每个 Loader 和 Plugin 的耗时。
