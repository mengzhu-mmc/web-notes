> ⚠️ 已蒸馏至正式笔记，此文件归档备用。

# 豆包对话提取 - 工程化

> 来源：豆包历史对话，提取时间：2026-03-17

---

## Webpack 打包流程（8步）

1. **合并配置**：读取 webpack.config.js 和命令行参数，生成最终配置
2. **创建编译对象**：初始化 Compiler 核心对象，加载插件
3. **从入口开始**：根据 entry 找到入口文件，构建依赖图谱
4. **Loader 编译模块**：对 JS/CSS/图片等模块依次用对应 loader 转译
5. **递归解析依赖**：深度遍历 import/require，处理所有依赖模块
6. **生成 Chunk**：根据入口和依赖关系，把模块分组打包成 Chunk
7. **插件执行优化**：插件在编译各阶段介入，做压缩/提取/优化
8. **输出到文件系统**：按 output 配置，把 bundle 写入指定目录

### 关键概念
- **Loader**：文件转换器（单一职责），用于转换非JS文件
- **Plugin**：功能扩展，通过钩子介入整个编译流程
- **Chunk**：代码块，可含多个模块
- **Bundle**：最终输出文件

---

## Tree Shaking

### 实现原理
1. 基于 **ES Module 静态分析**（import/export 在编译时确定，不像 CommonJS 动态 require）
2. 构建工具标记未被引用的导出（dead code）
3. 压缩阶段（Terser等）删除标记代码

### 使用条件
- 必须用 ESM（`import/export`）
- `package.json` 设置 `"sideEffects": false` 或列出有副作用的文件
- 生产模式（Webpack `mode: 'production'`）

```json
// package.json
{
  "sideEffects": ["*.css", "./src/polyfill.js"]
}
```

---

## TypeScript 编译优化

### tsconfig 优化
```json
{
  "skipLibCheck": true,          // 跳过 node_modules 类型检查（最有效）
  "incremental": true,           // 增量编译
  "tsBuildInfoFile": ".tsbuildinfo",
  "isolatedModules": true,       // 配合 bundler
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 最佳实践
- 开发：swc/esbuild 转译（快10~30倍，不做类型检查）
- 类型检查：独立进程 `tsc --noEmit --watch`
