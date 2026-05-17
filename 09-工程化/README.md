# 工程化知识地图

> 返回知识库首页请点击上层目录。最新版工程化笔记已修复双链失效问题，精简了旧版外链，保留了核心实战解析。

## 关联笔记

- [TypeScript 目录](../03-TypeScript/README.md)
- [网络与浏览器 目录](../08-网络与浏览器/README.md)
- [Git 与工具 目录](../10-Git与工具/README.md)

---

## 📚 笔记索引

### 构建工具探秘与实战

- [Vite 原理与配置实战](./Vite原理与配置实战.md)
- [Vite 深入理解](./Vite深入理解.md) — ESM 原理、预构建、HMR、Rollup 生产构建、配置与插件
- [Webpack5 核心特性 - 标准答案索引](./Webpack5核心特性 - 标准答案索引.md) — 面试快速突击指南
- [Webpack5 核心特性 - 深挖专题索引](./Webpack5核心特性 - 深挖专题索引.md) — Module Federation、Tree Shaking、持久化缓存、Asset Modules
- [Webpack 面试核心知识点](./Webpack面试核心知识点.md)

### 工程化全景与协作规范

- [前端工程化全景](./前端工程化全景.md) — 包管理器 (npm/pnpm/yarn)、Monorepo、CI/CD、代码规范
- [多人协作代码管理方案](./多人协作代码管理方案.md)
- [npm -S 和 -D 的区别](./npm%20-S%20和%20-D%20的区别.md)
- [package-lock.json 有什么作用](./package-lock.json%20有什么作用.md)
- [npm 包开发全流程](./npm包开发全流程.md)

### AI 智能开发新范式

- [MCP 协议原理与协作流程](./MCP协议原理与协作流程.md)

---

## 🗺️ 知识脉络

```
前端工程化
├── 构建工具
│   ├── Webpack 5
│   │   ├── 核心流程：初始化 → 编译 → 生成 → 输出
│   │   ├── Module Federation（模块联邦/微前端）
│   │   ├── 持久化缓存 / Asset Modules / Top Level Await
│   │   ├── Tree Shaking 改进
│   │   ├── Loader：babel/swc/css/sass/less/postcss
│   │   ├── Plugin：HtmlWebpack/MiniCssExtract/Terser/BundleAnalyzer
│   │   └── 优化：SplitChunks / DLL / thread-loader / externals
│   ├── Vite
│   │   ├── ESM 开发服务器 / 按需编译
│   │   ├── esbuild 预构建 / HMR
│   │   ├── Rollup 生产构建 / 插件体系
│   │   └── 配置：别名 / 代理 / 环境变量 / CSS 预处理
│   └── 其他：Rollup / esbuild / SWC / Turbopack
│
├── 包管理
│   ├── npm / yarn / pnpm 对比
│   ├── 幽灵依赖问题
│   └── Monorepo：pnpm workspace / Turborepo / Nx
│
├── 代码规范
│   ├── ESLint（Flat Config）
│   ├── Prettier
│   ├── Husky + lint-staged
│   └── Conventional Commits + Commitlint
│
├── CI/CD
│   ├── GitHub Actions 配置
│   ├── 自动测试/构建/部署
│   └── Changeset 自动发版
│
└── 部署与监控
    ├── 部署策略 / 容器化
    ├── 性能 SDK / 监控平台
    └── 依赖安装优化 / 构建策略
```
