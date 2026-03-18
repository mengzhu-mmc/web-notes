# Webpack 构建流程详解

> Webpack 从配置读取到 bundle 输出的完整流程，以及 Tree Shaking 原理

---

## 面试高频考点

- Webpack 打包流程分几步？每步做什么？
- Loader 和 Plugin 有什么区别？
- Tree Shaking 的实现原理？
- 为什么 Tree Shaking 要求 ESM？
- `sideEffects` 字段是什么？怎么配置？

---

## 一、Webpack 打包 8 步流程

```
初始化参数 → 创建 Compiler → 确定入口 → Loader 编译模块
→ 递归解析依赖 → 生成 Chunk → 插件优化 → 输出 bundle
```

### 详细说明

| 步骤 | 名称 | 做什么 |
|------|------|--------|
| 1 | **合并配置** | 读取 `webpack.config.js` 和命令行参数，合并生成最终配置对象 |
| 2 | **创建编译对象** | 初始化 `Compiler` 核心对象，加载所有插件（调用 `plugin.apply(compiler)`） |
| 3 | **从入口开始** | 根据 `entry` 找到入口文件，开始构建依赖图谱（Dependency Graph） |
| 4 | **Loader 编译模块** | 对每个模块（JS/CSS/图片等）依次应用匹配的 Loader 进行转译 |
| 5 | **递归解析依赖** | 深度遍历每个模块的 `import/require`，把所有依赖模块都处理一遍 |
| 6 | **生成 Chunk** | 根据入口文件和依赖关系，将模块分组打包成若干 Chunk |
| 7 | **插件执行优化** | 插件通过 Tapable 钩子在各编译阶段介入：压缩、提取、分析等 |
| 8 | **输出到文件系统** | 按 `output` 配置，将最终 bundle 写入指定目录和文件名 |

### Loader vs Plugin

| 维度 | Loader | Plugin |
|------|--------|--------|
| 职责 | 转换单个模块文件（文件级） | 在编译生命周期各阶段做扩展（全局级） |
| 作用时机 | 模块加载时（步骤4） | 整个编译流程的任意钩子 |
| 配置方式 | `module.rules` | `plugins` 数组 |
| 示例 | `babel-loader`、`css-loader` | `HtmlWebpackPlugin`、`MiniCssExtractPlugin` |

### 最耗时的步骤
- **递归解析依赖**（步骤5）+ **Loader 编译**（步骤4）
- 优化手段：多线程（`thread-loader`）、持久化缓存（`cache: { type: 'filesystem' }`）

---

## 二、Tree Shaking 实现原理

### 核心三步

```
1. ESM 静态分析（编译时确定依赖）
        ↓
2. 标记未使用的导出（dead code 标记）
        ↓
3. Terser 压缩时删除标记代码
```

### 为什么必须用 ESM？

```js
// ✅ ESM：静态导入，编译时就能确定使用了哪些导出
import { add } from './math'; // 只用了 add，multiply 没用

// ❌ CommonJS：动态 require，运行时才知道用了什么，无法静态分析
const math = require('./math');
math[someVariable](); // 编译时无法确定用了哪个
```

ESM 的 `import/export` 在编译时就确定了依赖关系（静态），工具可以分析哪些导出从未被使用。CommonJS 是动态的，Tree Shaking 无法生效。

### sideEffects 配置

副作用（sideEffect）= 模块被导入时，除了导出值以外还做了其他事情（如修改全局变量、注册事件）。

```json
// package.json
{
  "name": "my-lib",
  "sideEffects": false  // 声明所有模块都没有副作用，可以安全 Tree Shaking
}
```

```json
// 如果有部分文件有副作用，列出来：
{
  "sideEffects": [
    "*.css",              // CSS 文件有副作用（注入样式）
    "./src/polyfill.js"   // polyfill 有副作用（修改全局）
  ]
}
```

**为什么要配置 sideEffects？**
没有 `"sideEffects": false` 时，Webpack 无法安全删除看起来"未使用"但实际有副作用的模块（如 CSS import）。配置后，Webpack 才能更激进地做 Tree Shaking。

### 完整配置示例

```js
// webpack.config.js（生产模式自动启用）
module.exports = {
    mode: 'production', // 自动开启 Tree Shaking + Terser 压缩

    optimization: {
        usedExports: true,  // 标记未使用的导出
        minimize: true,     // 开启 Terser 删除死代码
    },
};
```

```js
// vite.config.js（Vite 基于 Rollup，默认开启 Tree Shaking）
export default {
    build: {
        rollupOptions: {
            treeshake: true, // 默认开启
        },
    },
};
```

---

## 三、补充：Code Splitting 代码分割

```js
// 路由懒加载（最常见）
const Home = () => import('./pages/Home');  // 产生独立 Chunk

// webpack 动态 import 魔法注释（命名 Chunk）
const About = () => import(/* webpackChunkName: "about" */ './pages/About');

// splitChunksPlugin：提取公共依赖
optimization: {
    splitChunks: {
        chunks: 'all', // 对所有 Chunk 做分割
    },
},
```

---

## 面试要点总结

- Webpack 流程：合并配置 → Compiler → 入口 → Loader → 递归依赖 → Chunk → 插件优化 → 输出
- Loader 处理单文件，Plugin 介入全流程（通过 Tapable 钩子）
- Tree Shaking 三步：ESM静态分析 → 标记dead code → Terser删除
- Tree Shaking 必须用 ESM（import/export），CommonJS 不支持
- `sideEffects: false` 告知工具可安全删除"无副作用"的未使用模块
