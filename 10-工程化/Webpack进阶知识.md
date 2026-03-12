# Webpack 进阶知识

## 构建流程精简版（9 步）

初始化参数（合并配置文件和 Shell 参数）→ 开始编译（初始化 Compiler，加载 Plugin）→ 确定入口（根据 entry 配置）→ 编译模块（调用 Loader 翻译）→ 解析依赖（转 AST，解析 import/require）→ 递归构建（生成依赖图谱 Module Graph）→ 组装成块（Module 组装为 Chunk）→ 生成资源（Chunk 转为 Assets）→ 写入文件（输出到 output 路径）。

简记：Input → Compiler → Loaders(Recursion) → Chunks → Output

## Entry、Chunk 与 Bundle 的关系

一个入口（Entry）对应一个"Chunk Group"，而非简单的一个 Chunk。Chunk Group 包含 Initial Chunk（入口文件自身代码）、Split Chunks（被 `cacheGroups` 拆分出的公共代码或第三方库）、Async Chunks（通过 `import()` 懒加载产生的代码块）。

### cacheGroups 的作用

`optimization.splitChunks` 的核心配置，从原有 Chunk 中抽离模块生成新 Chunk。例如将 `node_modules` 下的 `react` 和 `lodash` 抽离为独立的 vendors Chunk，此时 1 个 Entry 对应 2 个 Chunk。

### 动态导入

代码中的 `import('./moduleA')` 会自动将 `moduleA` 分割成独立的 Async Chunk。

## Plugin 生命周期钩子

Webpack 插件基于发布-订阅模式（Tapable 库），在构建流程的每个环节都暴露了钩子。

### 初始化与开始阶段（Compiler）

`entryOption`（entry 处理后）、`afterPlugins`（插件设置完成后）、`run`/`watchRun`（开始读取记录前）。

### 编译构建阶段

`compile`（新 Compilation 创建前）、`compilation`（编译创建后，可获取 compilation 对象监听更细粒度的模块处理）、`make`（关键，从入口文件分析依赖、构建模块的递归过程）。

### 优化与资源生成阶段

`optimize`（优化开始）、`processAssets`（Webpack 5 推荐，处理生成的资源如压缩 CSS/JS、添加文件头注释）、`afterOptimizeChunks`（Chunk 优化完成后）。

### 输出阶段

`emit`（最常用，生成资源到 output 目录前，修改最终文件内容的最后机会）、`afterEmit`（文件写入磁盘后）。

### 结束阶段

`done`（编译完成，无论成功失败）、`failed`（编译失败）。

### 插件代码示例

```javascript
class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      console.log('正在准备输出文件...');
      callback();
    });
    compiler.hooks.done.tap('MyPlugin', (stats) => {
      console.log('打包完成！');
    });
  }
}
```

开发者最常接触的三个节点：`make`（开始分析依赖）、`processAssets`（处理代码压缩转换）、`emit`（最终生成文件前）。

## 前端 GPU 加速

GPU 加速（硬件加速）是将浏览器中原本由 CPU 负责的图形渲染工作交给 GPU 处理。当使用特定 CSS 样式（如 `transform: translate3d`、`opacity`）或渲染特殊元素（`<video>`、`<canvas>`）时，浏览器会将元素提升为独立图层，由 GPU 接手合成和渲染。

普通网页关闭 GPU 加速只是变卡（CPU 软件渲染降级），但重度依赖 WebGL/WebGPU 的 3D 网站（如 Three.js 游戏、Figma、3D 全景看房）没有 GPU 加速基本无法运行。
