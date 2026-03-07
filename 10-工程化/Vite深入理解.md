# Vite 深入理解

## 关联笔记

- [[10-工程化/前端工程化全景]]
- [[10-工程化/Webpack5核心特性]]
- [[10-工程化/README]]
- [[10-工程化/[4423] 09  构建总览：前端构建工具的演进]]
- [[10-工程化/[4430] 16  无包构建：盘点那些 No-bundle 的构建方案]]
- [[10-工程化/[4416] 02  界面调试：热更新技术如何开着飞机修引擎？]]

---

## 一、Vite vs Webpack 原理区别

### 1.1 核心差异

| 维度 | Webpack | Vite |
|------|---------|------|
| 开发模式 | 先打包再启动（Bundle-based） | 原生 ESM，按需编译（No-bundle） |
| 生产构建 | Webpack 自身 | Rollup |
| 预处理 | 所有模块先经过 loader → 打包 | 仅预构建依赖（esbuild） |
| HMR | 重新构建受影响的 chunk | 精确到模块级别，不涉及打包 |
| 冷启动 | 慢（项目越大越慢） | 快（按需编译，不预打包业务代码） |
| 语言 | JavaScript (Node.js) | Go (esbuild) + Rust (SWC 可选) + JS |

### 1.2 为什么 Vite 开发快？

```
传统 Bundler（Webpack）:
  入口 → 分析依赖 → 转译所有模块 → 打包成 bundle → 启动服务器
  └── 项目越大，启动越慢

Vite:
  启动服务器 → 浏览器请求模块 → 按需编译返回
  └── 启动速度几乎不受项目大小影响
```

浏览器支持 `<script type="module">`，Vite 利用这一特性：
1. 开发服务器直接以 ESM 格式提供源码
2. 浏览器负责模块的加载和拼装
3. Vite 只需要转译被请求的文件（按需）

---

## 二、ESM 开发服务器原理

### 2.1 请求拦截与转换

```
浏览器发起请求:
  GET /src/App.tsx

Vite Dev Server 处理流程:
  1. 解析路径 → 找到 /project/src/App.tsx
  2. 检查缓存 → 有则直接返回
  3. 转译文件:
     - .tsx → esbuild 编译为 JS
     - .vue → @vitejs/plugin-vue 解析 SFC
     - .css → 注入为 JS 模块（import 样式）
  4. 改写 import 路径:
     - import React from 'react'
       → import React from '/@modules/react/index.mjs'
     - import './style.css'
       → import '/src/style.css?import'
  5. 返回 ESM 格式的 JS
```

### 2.2 裸模块重写

```javascript
// 源码
import { useState } from 'react';
import dayjs from 'dayjs';

// Vite 重写后
import { useState } from '/node_modules/.vite/deps/react.js?v=abc123';
import dayjs from '/node_modules/.vite/deps/dayjs.js?v=def456';
// 指向预构建产物，而非 node_modules 里的原始文件
```

### 2.3 文件类型处理

```
.ts/.tsx → esbuild 转译（只去类型，不做类型检查）
.jsx     → esbuild 转译
.vue     → @vitejs/plugin-vue（template/script/style 拆分处理）
.css     → 转为 JS 模块，注入 <style> 标签
.module.css → CSS Modules，返回类名映射对象
.json    → 转为 ESM export
.svg     → 可配置为组件或 URL
静态资源  → 返回 URL 字符串
```

---

## 三、预构建（Dependency Pre-Bundling）

### 3.1 为什么需要预构建？

1. **CJS → ESM 转换**：很多 npm 包只提供 CJS 格式（如 lodash），浏览器不能直接加载
2. **减少请求数**：`lodash-es` 有 600+ 个模块文件，不预构建会产生 600+ HTTP 请求
3. **提升加载速度**：将零散模块合并为单个文件

### 3.2 预构建流程

```
首次启动 / 依赖变更:
  1. 扫描源码中的 import 语句，收集所有第三方依赖
  2. 用 esbuild 将这些依赖打包:
     - CJS → ESM
     - 合并零散文件为单个模块
  3. 输出到 node_modules/.vite/deps/
  4. 生成 _metadata.json 记录依赖映射和 hash

再次启动:
  - 对比 lock 文件 hash → 没变则跳过预构建
  - 直接复用缓存
```

### 3.3 esbuild 为什么快？

```
esbuild（Go）vs Babel/Webpack（JavaScript）:
  - Go 编译为原生代码，无 JIT 编译开销
  - 天然并行：Go goroutine 充分利用多核
  - 内存效率高：减少 GC 压力
  - 从零实现解析器：不依赖 AST 转换链
  → 比 Webpack 快 10-100 倍
```

### 3.4 预构建配置

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // 强制包含（自动扫描可能遗漏的依赖）
    include: ['lodash-es', 'axios'],

    // 排除（如已是 ESM 的包，不需要预构建）
    exclude: ['@vueuse/core'],

    // esbuild 选项
    esbuildOptions: {
      target: 'es2020',
      // 处理 JSX
      loader: { '.js': 'jsx' },
    },
  },
});
```

---

## 四、HMR（热模块替换）机制

### 4.1 Vite HMR vs Webpack HMR

```
Webpack HMR:
  文件变更 → 重新编译受影响 chunk → 发送更新的 chunk → 应用更新
  └── 编辑深层模块可能导致较大 chunk 重新构建

Vite HMR:
  文件变更 → 只编译变更的单个文件 → WebSocket 通知浏览器 → 浏览器重新请求该模块
  └── 更新速度与项目大小无关，始终 O(1)
```

### 4.2 HMR API

```typescript
// Vite 提供的 HMR API（import.meta.hot）
if (import.meta.hot) {
  // 接受自身更新
  import.meta.hot.accept((newModule) => {
    // 用新模块替换旧的
    console.log('Module updated:', newModule);
  });

  // 接受依赖更新
  import.meta.hot.accept('./module.ts', (newModule) => {
    // ./module.ts 变更时触发
  });

  // 清理副作用
  import.meta.hot.dispose((data) => {
    // 旧模块卸载前执行
    clearInterval(data.timer);
  });

  // 持久化数据（跨更新保留）
  import.meta.hot.data.count = import.meta.hot.data.count || 0;
}
```

### 4.3 框架集成

```
React: @vitejs/plugin-react
  → 使用 react-refresh 实现组件级 HMR
  → 保留组件 state（大多数情况）

Vue: @vitejs/plugin-vue
  → SFC 的 template/script/style 独立更新
  → template 变更不会丢失组件 state
```

---

## 五、生产构建（Rollup）

### 5.1 为什么生产用 Rollup 而不是 esbuild？

- esbuild 目前缺少：代码分割的高级策略、CSS 代码分割、生成 legacy bundle 等
- Rollup 生态成熟，插件丰富，产物优化能力强
- Rollup 的 Tree Shaking 更彻底（基于 ESM 静态分析）
- Vite 5 尝试引入 Rolldown（Rust 版 Rollup），未来可能统一

### 5.2 构建配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // 构建目标
    target: 'es2020', // 或 'modules'（支持 ESM 的浏览器）

    // 输出目录
    outDir: 'dist',

    // 资源内联阈值（小于此大小的资源转为 base64）
    assetsInlineLimit: 4096, // 4KB

    // CSS 代码分割
    cssCodeSplit: true,

    // 生成 sourcemap
    sourcemap: false, // true | 'inline' | 'hidden'

    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500, // KB

    // Rollup 选项
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html', // 多页面
      },
      output: {
        // 手动分 chunk
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'dayjs'],
        },
        // 或函数形式
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('lodash') || id.includes('dayjs')) return 'utils';
            return 'vendor';
          }
        },
        // 文件名格式
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // 压缩方式
    minify: 'esbuild', // 'esbuild' | 'terser' | false
    // esbuild 快但不支持某些高级压缩；terser 更全面但慢
  },
});
```

### 5.3 兼容性处理

```typescript
// 使用 @vitejs/plugin-legacy 支持旧浏览器
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['> 1%', 'last 2 versions', 'not dead'],
      // 自动生成 legacy chunk + polyfills
      // 现代浏览器加载 ESM 版本，旧浏览器加载 legacy 版本
    }),
  ],
});
```

---

## 六、常用配置和插件

### 6.1 基础配置模板

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    // 插件
    plugins: [react()],

    // 路径别名
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
      },
    },

    // 开发服务器
    server: {
      port: 3000,
      open: true,
      // 代理配置
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },

    // CSS 配置
    css: {
      modules: {
        localsConvention: 'camelCase', // CSS Modules 类名转驼峰
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
        less: {
          javascriptEnabled: true,
          modifyVars: { '@primary-color': '#1890ff' }, // antd 主题
        },
      },
    },

    // 环境变量前缀
    envPrefix: 'VITE_',
  };
});
```

### 6.2 常用插件

```typescript
// 自动导入 API
import AutoImport from 'unplugin-auto-import/vite';
// 组件自动注册
import Components from 'unplugin-vue-components/vite';
// SVG 组件化
import svgr from 'vite-plugin-svgr';
// 打包分析
import { visualizer } from 'rollup-plugin-visualizer';
// 压缩（gzip/brotli）
import compression from 'vite-plugin-compression';
// Mock
import { viteMockServe } from 'vite-plugin-mock';
// PWA
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    compression({ algorithm: 'gzip' }),
    visualizer({ open: true, gzipSize: true }),
  ],
});
```

### 6.3 环境变量

```bash
# .env
VITE_APP_TITLE=My App

# .env.development
VITE_API_URL=http://localhost:8080

# .env.production
VITE_API_URL=https://api.example.com
```

```typescript
// 使用
console.log(import.meta.env.VITE_API_URL);
console.log(import.meta.env.MODE); // 'development' | 'production'
console.log(import.meta.env.DEV);  // boolean
console.log(import.meta.env.PROD); // boolean

// 类型声明（src/env.d.ts）
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 面试高频问题

### Q1：Vite 为什么比 Webpack 快？

开发时：利用浏览器原生 ESM，按需编译不打包；依赖用 esbuild 预构建（Go 写的，比 JS 快 10-100x）。HMR 是模块级的，跟项目大小无关。

### Q2：Vite 能替代 Webpack 吗？

大部分新项目可以。但 Webpack 生态更成熟，某些场景（复杂的 loader 链、Module Federation、特殊构建需求）仍然需要 Webpack。Vite 生产构建基于 Rollup，与 Webpack 的 chunk 策略有差异。

### Q3：预构建是什么？为什么需要？

将 CJS 依赖转为 ESM + 合并零散模块减少 HTTP 请求。用 esbuild 实现，结果缓存在 `node_modules/.vite`。

### Q4：Vite 的 HMR 原理？

文件变更 → Vite 服务器编译该文件 → WebSocket 通知浏览器 → 浏览器重新请求更新的模块 → 框架插件（react-refresh/vue-sfc-hmr）应用更新。速度 O(1)，不受项目规模影响。

### Q5：为什么生产构建用 Rollup 而不是 esbuild？

esbuild 缺乏高级代码分割、CSS 代码分割等生产优化能力。Rollup Tree Shaking 更彻底，插件生态更丰富。Vite 团队在开发 Rolldown（Rust 版 Rollup）来统一开发/生产。
