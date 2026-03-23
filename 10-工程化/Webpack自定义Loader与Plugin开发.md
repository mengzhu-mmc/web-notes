# Webpack 自定义 Loader 与 Plugin 开发

> 面试高频：手写 Loader / Plugin 原理，理解 Webpack 扩展机制

---

## 面试高频考点

- Loader 和 Plugin 的本质区别是什么？
- 如何手写一个 Loader？Loader 函数接收什么参数？
- 同步 Loader 和异步 Loader 有什么区别？
- Loader 的执行顺序是什么？为什么从右到左？
- 如何手写一个 Plugin？Plugin 的核心是什么？
- Tapable 是什么？有哪些常用钩子类型？
- compiler 和 compilation 的区别？

---

## 一、Loader 本质与执行机制

### Loader 是什么

Loader 本质上是一个**导出函数的 Node.js 模块**。它接收源文件内容作为输入，返回转换后的内容。Webpack 遇到无法直接处理的文件（如 `.css`、`.ts`、`.vue`）时，会按配置找到对应 Loader 进行转换。

```
源文件 → Loader1 → Loader2 → Loader3 → 标准 JS 模块
```

### 执行顺序：从右到左（从下到上）

```js
// webpack.config.js
module: {
  rules: [
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader']
      // 执行顺序：postcss-loader → css-loader → style-loader
    }
  ]
}
```

**为什么从右到左？** Webpack 使用函数组合（compose）模式：`f(g(h(x)))`，最右边的函数最先执行。这是函数式编程的 compose 约定。

---

## 二、手写同步 Loader

### 最简单的 Loader

```js
// my-loader.js
module.exports = function(source) {
  // source：源文件内容（字符串）
  // this：Loader 上下文对象（由 Webpack 注入）
  // 返回值：转换后的内容（字符串或 Buffer）
  
  const result = source.replace(/console\.log\(.*?\);?/g, ''); // 删除所有 console.log
  return result;
};
```

### 带 options 配置的 Loader

```js
// remove-console-loader.js
const { getOptions } = require('loader-utils'); // Webpack 4
// Webpack 5 直接用 this.getOptions()

module.exports = function(source) {
  // 获取 loader 配置项
  const options = this.getOptions({
    // JSON Schema 校验 options
    type: 'object',
    properties: {
      methods: { type: 'array' }
    }
  });
  
  const methods = options.methods || ['log', 'warn', 'error'];
  let result = source;
  
  methods.forEach(method => {
    const reg = new RegExp(`console\\.${method}\\(.*?\\);?`, 'g');
    result = result.replace(reg, '');
  });
  
  return result;
};
```

```js
// webpack.config.js 中使用
{
  test: /\.js$/,
  use: {
    loader: path.resolve('./loaders/remove-console-loader.js'),
    options: {
      methods: ['log', 'warn']
    }
  }
}
```

---

## 三、手写异步 Loader

当 Loader 需要执行异步操作（如读取文件、网络请求）时，必须使用异步模式：

```js
// async-loader.js
module.exports = function(source) {
  // 调用 this.async() 告知 Webpack 这是异步 Loader
  // 返回一个 callback 函数
  const callback = this.async();
  
  // 模拟异步操作（如读取外部配置文件）
  someAsyncOperation(source, (err, result) => {
    if (err) {
      // 第一个参数传 Error 对象表示失败
      callback(err);
      return;
    }
    // callback(error, content, sourceMap, meta)
    callback(null, result);
  });
};

// 使用 Promise 的写法（更现代）
module.exports = async function(source) {
  const callback = this.async();
  try {
    const result = await someAsyncOperation(source);
    callback(null, result);
  } catch (err) {
    callback(err);
  }
};
```

---

## 四、Loader 上下文（this）常用 API

```js
module.exports = function(source) {
  // this.resourcePath：当前处理文件的绝对路径
  console.log(this.resourcePath); // /project/src/index.js
  
  // this.emitFile：输出一个额外文件
  this.emitFile('output.txt', 'some content');
  
  // this.addDependency：添加文件依赖（文件变化时触发重新编译）
  this.addDependency('/path/to/config.json');
  
  // this.cacheable：声明 Loader 结果可缓存（默认 true）
  this.cacheable(true);
  
  // this.emitWarning / this.emitError：发出警告/错误
  this.emitWarning(new Error('这是一个警告'));
  
  return source;
};
```

---

## 五、实战：手写 Markdown Loader

```js
// markdown-loader.js
const marked = require('marked'); // npm install marked

module.exports = function(source) {
  // 将 Markdown 转为 HTML
  const html = marked.parse(source);
  
  // 必须返回合法的 JS 模块（字符串需要 JSON.stringify 转义）
  // 方式1：返回 JS 模块字符串
  return `module.exports = ${JSON.stringify(html)}`;
  
  // 方式2：配合 html-loader 使用，直接返回 HTML 字符串
  // return html;
};
```

```js
// webpack.config.js
{
  test: /\.md$/,
  use: ['html-loader', path.resolve('./loaders/markdown-loader.js')]
  // markdown-loader 先执行，输出 HTML；html-loader 再处理 HTML
}
```

---

## 六、Plugin 本质与 Tapable 钩子

### Plugin 是什么

Plugin 是一个**带有 `apply` 方法的 JavaScript 类（或对象）**。Webpack 在初始化时会调用每个 Plugin 的 `apply` 方法，传入 `compiler` 对象。Plugin 通过在 `compiler` 或 `compilation` 的钩子上注册回调，在编译生命周期的特定时机执行自定义逻辑。

```
Plugin.apply(compiler) → 注册钩子 → 编译到对应阶段 → 触发回调
```

### Tapable 钩子类型

Webpack 的事件系统基于 [Tapable](https://github.com/webpack/tapable) 库：

| 钩子类型 | 特点 | 注册方式 |
|---------|------|---------|
| `SyncHook` | 同步，串行执行，不关心返回值 | `.tap()` |
| `SyncBailHook` | 同步，返回非 undefined 时停止 | `.tap()` |
| `SyncWaterfallHook` | 同步，上一个返回值传给下一个 | `.tap()` |
| `AsyncSeriesHook` | 异步，串行执行 | `.tapAsync()` / `.tapPromise()` |
| `AsyncParallelHook` | 异步，并行执行 | `.tapAsync()` / `.tapPromise()` |

### compiler vs compilation

| 对象 | 生命周期 | 职责 |
|------|---------|------|
| `compiler` | 整个 Webpack 进程（单例） | 代表完整的 Webpack 配置环境，包含 options、plugins、loaders |
| `compilation` | 每次构建（watch 模式下每次文件变化都会新建） | 代表一次具体的编译过程，包含模块、依赖、chunk、asset |

---

## 七、手写 Plugin：文件清单生成器

```js
// file-list-plugin.js

class FileListPlugin {
  constructor(options = {}) {
    // 接收配置项
    this.filename = options.filename || 'file-list.md';
  }
  
  // apply 方法是 Plugin 的入口，Webpack 初始化时调用
  apply(compiler) {
    // 注册 emit 钩子：在 Webpack 即将输出文件到 output 目录前触发
    // emit 是 AsyncSeriesHook，需要用 tapAsync 或 tapPromise
    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
      // compilation.assets：本次编译输出的所有文件
      const fileList = Object.keys(compilation.assets);
      
      // 生成 Markdown 格式的文件清单
      const content = [
        '# 构建产物清单',
        '',
        `> 共 ${fileList.length} 个文件`,
        '',
        ...fileList.map(filename => {
          const size = compilation.assets[filename].size();
          return `- \`${filename}\` (${(size / 1024).toFixed(2)} KB)`;
        })
      ].join('\n');
      
      // 将文件添加到 compilation.assets，Webpack 会自动输出它
      compilation.assets[this.filename] = {
        source: () => content,
        size: () => content.length
      };
      
      // 异步钩子必须调用 callback 通知 Webpack 继续
      callback();
    });
  }
}

module.exports = FileListPlugin;
```

```js
// webpack.config.js 中使用
const FileListPlugin = require('./plugins/file-list-plugin');

module.exports = {
  plugins: [
    new FileListPlugin({ filename: 'assets-manifest.md' })
  ]
};
```

---

## 八、手写 Plugin：构建耗时统计

```js
// build-time-plugin.js

class BuildTimePlugin {
  apply(compiler) {
    let startTime;
    
    // compile 钩子：编译开始时触发（SyncHook，用 tap）
    compiler.hooks.compile.tap('BuildTimePlugin', () => {
      startTime = Date.now();
      console.log('\n🚀 开始构建...');
    });
    
    // done 钩子：编译完成时触发（包含 stats 对象）
    compiler.hooks.done.tap('BuildTimePlugin', (stats) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const hasErrors = stats.hasErrors();
      const hasWarnings = stats.hasWarnings();
      
      if (hasErrors) {
        console.log(`\n❌ 构建失败，耗时 ${duration}s`);
      } else if (hasWarnings) {
        console.log(`\n⚠️  构建完成（有警告），耗时 ${duration}s`);
      } else {
        console.log(`\n✅ 构建成功，耗时 ${duration}s`);
      }
    });
  }
}

module.exports = BuildTimePlugin;
```

---

## 九、常用编译钩子速查

```js
apply(compiler) {
  // 初始化阶段
  compiler.hooks.initialize.tap('MyPlugin', () => { /* Webpack 初始化完成 */ });
  
  // 编译阶段
  compiler.hooks.compile.tap('MyPlugin', (params) => { /* 开始编译 */ });
  compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
    // 每次新建 compilation 时触发，可在此注册 compilation 级别的钩子
    compilation.hooks.buildModule.tap('MyPlugin', (module) => { /* 模块开始构建 */ });
    compilation.hooks.optimizeChunks.tap('MyPlugin', (chunks) => { /* 优化 chunk */ });
  });
  
  // 输出阶段
  compiler.hooks.emit.tapAsync('MyPlugin', (compilation, cb) => { /* 即将输出文件 */ cb(); });
  compiler.hooks.afterEmit.tapAsync('MyPlugin', (compilation, cb) => { /* 文件已输出 */ cb(); });
  
  // 完成阶段
  compiler.hooks.done.tap('MyPlugin', (stats) => { /* 构建完成 */ });
  compiler.hooks.failed.tap('MyPlugin', (err) => { /* 构建失败 */ });
}
```

---

## 面试要点总结

**Loader 核心：**
- Loader 是导出函数的 Node.js 模块，接收 `source`（源文件内容），返回转换后的内容
- 执行顺序从右到左（函数组合 compose 模式）
- 异步 Loader 用 `this.async()` 获取 callback，避免阻塞
- `this` 上下文提供 `resourcePath`、`addDependency`、`emitFile` 等 API

**Plugin 核心：**
- Plugin 是带 `apply(compiler)` 方法的类，通过 Tapable 钩子介入编译生命周期
- `compiler`：全局单例，代表整个 Webpack 环境
- `compilation`：每次构建新建，代表一次具体编译，包含 `assets`、`modules`、`chunks`
- 同步钩子用 `.tap()`，异步钩子用 `.tapAsync()` 或 `.tapPromise()`
- 异步钩子回调必须调用 `callback()` 或 resolve Promise，否则构建会卡住
