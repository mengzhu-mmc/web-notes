# Webpack 构建流程详解

## 面试高频考点

- Webpack 的构建流程是什么？
- Compiler 和 Compilation 的区别？
- Loader 和 Plugin 分别在哪个阶段工作？
- Tree Shaking 和 Scope Hoisting 的原理？

---

## 一、构建流程（精简 10 步）

### 1. 初始化 — 合并配置并创建 Compiler

合并命令行参数、配置文件和默认配置，创建 Compiler 对象作为全局控制器。加载所有插件，调用它们的 `apply` 方法注册事件监听器，触发 `run` 方法启动构建。

### 2. 编译准备 — 创建 Compilation 对象

每次构建都会创建一个新的 Compilation 对象，负责管理本次构建的所有状态。同时创建模块工厂用于生成 Module 实例，触发 `make` 钩子开始编译。

### 3. 模块构建 — 从入口递归构建依赖树

从 entry 入口开始，通过 Resolver 解析文件路径，创建 Module 实例。依次执行 Loader 转换源代码，使用 Parser（acorn）解析成 AST 并收集依赖（`import`、`require`、动态 `import` 等）。递归处理所有依赖，形成完整的依赖图。

### 4. 生成 Chunk — 模块分组打包

根据入口和代码分割点将模块分组成 Chunk。每个入口形成一个 Chunk，动态 import 创建异步 Chunk，SplitChunksPlugin 提取公共代码。

### 5. 优化处理 — Tree Shaking 和代码优化

标记未使用的导出用于 Tree Shaking，尝试合并模块实现 Scope Hoisting，分配 Chunk 和 Module 的 ID，生成运行时代码。

### 6. 生成代码 — 使用模板生成最终代码

遍历每个 Chunk，使用 Template 将模块代码、运行时代码组装成完整的 JavaScript 文件。

### 7. 资源优化 — 压缩和处理资源

触发 `optimizeAssets` 钩子，TerserPlugin 压缩 JS，CssMinimizerPlugin 压缩 CSS。

### 8. 计算 Hash — 生成内容哈希值

根据文件内容计算 hash 值用于文件命名，实现长期缓存。

- `hash`：整个构建的 hash，任何文件改变都会变
- `chunkhash`：单个 chunk 的 hash
- `contenthash`：单个文件的 hash（推荐）

### 9. 输出文件 — 写入文件系统

将所有资源写入到 `output.path` 指定的目录，触发 `emit` 钩子。

### 10. 完成构建 — 结束或继续监听

触发 `done` 钩子。watch 模式继续监听文件变化，进行增量编译。

## 二、Compiler vs Compilation

| 对比项 | Compiler | Compilation |
| --- | --- | --- |
| 创建次数 | 整个生命周期只创建一次 | 每次构建都重新创建 |
| 角色 | 总指挥，统筹全局 | 具体战役的指挥官 |
| 包含内容 | 配置信息、插件注册、文件系统接口 | 本次构建的模块、依赖、Chunk、资源 |
| 生命周期 | 从启动到进程结束 | 一次构建开始到结束 |

### 不同场景的创建时机

**普通构建（`webpack build`）：** 每次执行命令都是新进程，Compiler 和 Compilation 都重新创建。

**Watch 模式：** Compiler 只创建一次，文件变化时销毁旧 Compilation，创建新 Compilation 进行增量编译。

**HMR 热更新：** 同 Watch 模式，Compiler 持久存在，新 Compilation 只编译变化的模块，生成热更新补丁通过 WebSocket 推送到浏览器。

### 为什么这样设计？

**Compiler 单例：** 配置信息、插件注册、缓存系统等跨多次构建复用，避免重复初始化。

**Compilation 多次创建：** 隔离构建状态，便于内存管理，支持增量编译对比。

## 三、核心流程总结

```
初始化 → 创建编译对象 → 递归构建模块树 → 分组成Chunk
→ 优化处理 → 生成代码 → 压缩资源 → 计算Hash → 输出文件 → 完成或监听
```
