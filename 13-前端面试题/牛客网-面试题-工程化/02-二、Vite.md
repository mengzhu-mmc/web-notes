## 二、Vite

### Q: Vite 的工作原理是什么？为什么比 Webpack 快？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

Vite 的核心设计理念：**开发阶段不打包（No Bundle），生产阶段用 Rollup 打包**。

**为什么开发阶段快——核心原因：**

```
Webpack 开发服务器启动流程：
  读取所有模块 → Loader处理 → 构建依赖图 → 打包成bundle → 启动服务器 → 浏览器加载

Vite 开发服务器启动流程：
  启动服务器（即时）→ 浏览器请求某个URL → Vite 按需编译该模块 → 返回

关键区别：webpack 是"先编译再启动"，Vite 是"启动后按需编译"
```

**Vite 的三大核心机制：**

**① 基于浏览器原生 ESM（No Bundle Dev Server）：**

```html
<!-- Vite 开发时生成的 index.html -->
<!-- type="module" 让浏览器直接用 ESM import 加载模块 -->
<script type="module" src="/src/main.ts"></script>
```

```js
// 浏览器加载 main.ts 时，Vite 拦截 HTTP 请求，实时编译并返回：
// import { createApp } from 'vue'      → Vite 重写为 /node_modules/.vite/vue.js
// import App from './App.vue'          → Vite 实时编译 .vue 文件并返回 JS

// 浏览器的 import 语句直接成为 HTTP 请求
// 只有实际用到的模块才会被编译和传输（真正的按需加载）
```

**② 依赖预构建（Pre-Bundling）：**

```js
// 第一次启动时，Vite 用 esbuild 预构建 node_modules 里的第三方依赖

// 为什么需要预构建？
// 1. CJS 转 ESM：react、lodash 等是 CJS 格式，浏览器不能直接 import
// 2. 合并请求：lodash-es 有 600+ 个小文件，不合并会发送 600+ 个 HTTP 请求
//    预构建将它们合并成 1 个文件，大幅减少请求数

// 预构建配置（vite.config.ts）
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['lodash-es', 'axios'],  // 强制预构建（默认会自动发现）
    exclude: ['some-esm-only-lib'],   // 排除已经是 ESM 的包
    esbuildOptions: {
      plugins: [...],                  // 自定义 esbuild 插件
    },
  },
});
```

**③ esbuild 作为 JS 转换器（比 babel 快 10-100 倍）：**

```
为什么 esbuild 这么快？
  - Go 语言编写（而非 JS），原生多线程，无 GC 停顿
  - 高效的 AST 解析和代码生成
  - 充分利用多核 CPU

Vite 中 esbuild 的职责：
  - 依赖预构建（CJS → ESM，合并小文件）
  - TypeScript/JSX 转换（开发时）
  - 生产构建时的 JS 压缩（替代 Terser）

注意：esbuild 不做 Babel 插件（如装饰器、高级 TC39 提案）
      这些仍需要 @vitejs/plugin-legacy 或单独配置
```

**Vite 开发服务器的请求处理流程：**

```
浏览器请求 /src/components/Button.vue
  ↓
Vite 的 Koa 中间件拦截
  ↓
检查缓存（已编译过 → 直接返回）
  ↓
未缓存 → 调用对应 transform 插件链：
  .vue 文件 → @vitejs/plugin-vue（解析 SFC，分离 script/template/style）
  .ts 文件 → esbuild（类型剥除 + JSX 转换）
  .scss 文件 → sass → postcss
  ↓
重写 import 路径（裸模块 → /node_modules/.vite/xxx.js）
  ↓
返回编译后的 JS 模块
  ↓
浏览器解析，发现新的 import → 继续发请求（级联加载）
```

**🔍 深层原理**

**"级联请求"问题和解决方案：**

浏览器原生 ESM 加载的最大问题：每个 `import` 都是一个 HTTP 请求，如果依赖链很深，会有大量串行请求（A → B → C → D...），造成"请求瀑布"。

Vite 的解法：

1. **依赖预构建**：把 node_modules 里的依赖合并，减少请求数
2. **HTTP/2 Push**：服务端提前推送依赖
3. **模块预加载（modulepreload）**：在 `<link rel="modulepreload">` 提前声明所有依赖

```html
<!-- Vite 生成的 modulepreload 标签 -->
<link rel="modulepreload" href="/src/App.vue" />
<link rel="modulepreload" href="/src/router/index.ts" />
```

**💡 踩坑点**

```js
// 坑1：第一次启动后某些依赖没被预构建，动态 import 触发时才发现
// 导致页面出现短暂的多请求或重新刷新
// ✅ 手动 include 进 optimizeDeps
optimizeDeps: {
  include: ["some-deep-dependency"];
}

// 坑2：Vite 不支持直接 require()（Node.js CJS 语法）
// ❌ const fs = require('fs') 在浏览器模块里不可用
// ✅ 用 import.meta.env 替代 process.env
// ✅ 用 import fs from 'fs'（仅 SSR 模式可用）

// 坑3：Vite 开发时 esbuild 编译 TS，不做类型检查！
// 开发阶段不会因为 TS 类型错误而报编译失败
// ✅ 需要单独运行 tsc --noEmit 做类型检查，或配置 vite-plugin-checker

// 坑4：动态 import 里的变量路径，Vite 和 webpack 行为不同
// Vite 要求路径包含文件扩展名，且不能完全是动态变量
const module = await import(`./pages/${page}.vue`); // ✅ Vite 支持有限的动态路径
const module = await import(dynamicPath); // ❌ 完全动态路径不支持
```

**🎯 面试追问**

- **Q: Vite 生产构建为什么用 Rollup 而不是 esbuild？**
  - A: esbuild 虽然快，但**不支持代码分割（Code Splitting）**（技术上支持但不完善）、**tree shaking 不如 Rollup 彻底**、也不支持 Rollup 丰富的插件生态。Vite 官方解释：生产构建对速度不那么敏感（可以接受几十秒），但需要最优的产物质量（bundle 体积、代码分割、tree shaking），所以选 Rollup。esbuild 则负责构建中最耗时的 TS/JSX 转换。
- **Q: Vite 的 HMR 和 webpack 的 HMR 有什么区别？**
  - A: webpack HMR 需要重新编译整个 chunk，然后推送；Vite HMR 因为模块是独立的 ESM 文件，只需重新编译变化的那一个文件，推送精确的模块更新。Vite HMR 还支持精确的 Vue/React 组件级热更新。速度上 Vite HMR 通常在 50ms 内，webpack HMR 可能需要几百毫秒。
- **Q: Vite 的依赖预构建产物存在哪里？何时失效重建？**
  - A: 存在 `node_modules/.vite/deps/` 目录。以下情况触发重建：`package.json` 的 `dependencies` 变化、`vite.config.js` 的 `optimizeDeps` 配置变化、`lockfile`（package-lock.json/yarn.lock）变化、Vite 版本升级。也可以用 `vite --force` 强制重建。

**⚠️ 常见误区**

- ❌ Vite 不打包，生产构建也是 No Bundle → 生产用 Rollup 打包，No Bundle 只在开发阶段
- ❌ Vite 用 esbuild 替代了 Babel，所有 Babel 功能都支持 → esbuild 只做类型剥除和基础转换，高级 Babel 特性（装饰器、Babel 插件）仍需单独配
- ❌ Vite 一定比 webpack 快 → 超大型项目（数千个模块）中，Vite 的级联 ESM 请求在网络上也可能成为瓶颈；webpack 有更成熟的缓存和增量编译

---

### Q: Vite 和 Webpack 的核心区别是什么？如何选型？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 维度 | Webpack | Vite |
| --- | --- | --- |
| **开发启动** | 全量打包后启动（慢，几秒~几分钟） | 即时启动，按需编译（快，<1s） |
| **开发 HMR** | 重编译 chunk（几百ms） | 精确模块替换（<50ms） |
| **生产构建** | webpack 自己的打包 | Rollup 打包（产物更优） |
| **底层语言** | JS | esbuild（Go）做转换，Rollup（JS）做打包 |
| **配置复杂度** | 高（loader/plugin/optimization） | 低（约定优先，开箱即用） |
| **生态** | 极其丰富（10+ 年积累） | 快速增长（2021 起） |
| **兼容性** | 可配置支持 IE11 | 默认不支持 IE，需 @vitejs/plugin-legacy |
| **SSR 支持** | 需要额外配置 | 内置 SSR 模式 |
| **微前端** | Module Federation（成熟） | vite-plugin-federation（较新） |

**选型建议：**

```
✅ 选 Vite：
  - 新项目，无历史包袱
  - 现代浏览器目标（Chrome/Firefox/Safari 最新版）
  - Vue/React/Svelte 等现代框架
  - 追求开发体验（快速迭代，启动快）
  - 团队对工程化配置要求不复杂

✅ 选 Webpack：
  - 需要支持 IE11 或旧浏览器
  - 已有成熟 webpack 配置和插件
  - 需要 Module Federation（微前端）
  - 高度定制化的构建需求（自定义 loader/plugin）
  - 超大型项目有复杂分包需求（webpack splitChunks 更成熟）
```

**🔍 深层原理**

本质区别在于**模块系统的处理时机**：

- Webpack：**编译时** 把所有模块打成 bundle（静态依赖图 → 单文件输出）
- Vite：**运行时** 浏览器原生 ESM 按需加载（HTTP 请求驱动模块加载）

这个区别导致了所有其他差异：启动速度、HMR 速度、开发体验、插件架构等。

**💡 踩坑点**

```js
// 坑1：Vite 的插件 API 和 webpack loader/plugin 不兼容
// 迁移 webpack → Vite 时，所有 webpack loader 都要找对应的 vite 插件

// 坑2：Vite 的 import.meta.env 和 webpack 的 process.env 不同
// webpack:
const API = process.env.REACT_APP_API_URL; // Create React App 约定

// Vite:
const API = import.meta.env.VITE_API_URL; // 必须以 VITE_ 开头才暴露给客户端

// 坑3：Vite 默认不处理 .env 文件里的 BASE_URL 等系统变量
// 需要显式配置 envPrefix
```

**🎯 面试追问**

- **Q: 大型项目用 Vite 开发时，为什么页面首次加载可能很慢？**
  - A: 因为浏览器原生 ESM 是"请求瀑布"——页面入口加载 → 解析发现 import → 加载依赖 → 解析发现更多 import → 级联加载，每一层都是串行的。依赖链越深，首次加载越慢。解决方案：预构建合并 node_modules 依赖（Vite 默认做了），以及配置 `modulepreload` 预加载关键路径。
- **Q: Vite 的插件和 Rollup 插件是兼容的吗？**
  - A: Vite 插件是 Rollup 插件接口的超集，大多数 Rollup 插件可以直接在 Vite 中使用。但 Vite 扩展了一些专属钩子（如 `configureServer`、`transformIndexHtml`、`handleHotUpdate`），这些是 Rollup 没有的。
- **Q: create-react-app 和 Vite 有什么区别？**
  - A: CRA 基于 webpack，配置封装在 `react-scripts` 里，不好自定义（需要 eject）；Vite 配置直接暴露在 `vite.config.ts`，灵活度高。CRA 已停止维护，官方推荐迁移到 Vite 或 Next.js。

**⚠️ 常见误区**

- ❌ Vite 完全替代了 webpack，webpack 已经过时 → webpack 在企业级大型项目和微前端场景仍占主导，生态更成熟
- ❌ Vite 和 webpack 用一样的插件 → 插件 API 完全不同，不能共用
- ❌ Vite 生产构建也是 No Bundle → 生产用 Rollup 全量打包

---
