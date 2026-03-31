# Vite vs Webpack：2026 年构建工具选型指南

> 更新时间：2026-03 | 适用版本：Vite 5.x / Webpack 5.x

---

## 一、核心定位差异

| 维度 | Vite 5.x | Webpack 5.x |
|------|----------|-------------|
| 设计理念 | No-bundle（开发）/ Rollup（生产） | Bundle-first（始终打包） |
| 开发冷启动 | **< 1s**（按需编译） | 5s ~ 60s+（取决于项目规模） |
| HMR 速度 | **< 50ms**（模块级，O(1)） | 200ms ~ 2000ms（chunk 级） |
| 生产构建 | Rollup（Tree Shaking 彻底） | Webpack 自身（生态最丰富） |
| 配置复杂度 | 低（开箱即用） | 高（灵活但繁琐） |
| 插件生态 | 兼容 Rollup 插件，增长快 | 极其丰富，覆盖所有场景 |
| 旧浏览器支持 | 需 @vitejs/plugin-legacy | 原生支持，可精细控制 |

---

## 二、性能数据对比（2024-2025 实测）

### 冷启动时间（中型 SPA，~500 模块）

```
Vite 5.x:    0.5s ~ 1.2s   ✅
Webpack 5:   12s  ~ 25s    ⚠️
Rspack:      2s   ~ 4s     ✅（Rust 版 Webpack，兼容 Webpack 生态）
Turbopack:   1s   ~ 3s     ✅（Vercel 出品，Next.js 默认）
```

### HMR 速度（修改业务组件）

```
Vite:        50ms  内       ✅
Webpack:     300ms ~ 1500ms ⚠️
Rspack:      100ms ~ 300ms  ✅
```

### 生产构建时间（中型项目）

```
Vite (Rollup):  45s ~ 90s
Webpack 5:      60s ~ 120s
Vite + Rolldown（实验）：预计 5-10x 提速（Rust 实现）
```

> 📌 **注意**：Vite 5 已合并 `rolldown` 实验性支持（`experimental.rolldownVersion`），生产构建速度将大幅提升。

---

## 三、Vite 5.x 核心新特性

### 3.1 Node.js 最低版本要求提升到 18+

```bash
# Vite 5 要求 Node.js >= 18.0.0
node --version  # 必须 >= 18
```

### 3.2 废弃 CommonJS API

```javascript
// ❌ Vite 5 已废弃（CJS 模式）
const { createServer } = require('vite');

// ✅ 使用 ESM
import { createServer } from 'vite';
```

### 3.3 `define` 行为变更（更符合直觉）

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    // Vite 5: 字符串值会被当做 JS 表达式（与 Webpack 一致）
    __APP_VERSION__: JSON.stringify('1.0.0'),
    // ❌ 不要写：__APP_VERSION__: '1.0.0'（会被当做标识符）
  },
});
```

### 3.4 `resolve.conditions` 默认值调整

```typescript
// Vite 5 新增 'module' 条件，更好地处理 ESM 优先的包
export default defineConfig({
  resolve: {
    conditions: ['module', 'browser', 'development|production'],
  },
});
```

### 3.5 Worker 默认使用 ES 模块

```typescript
// Vite 5: Web Worker 默认输出 ESM
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module', // Vite 5 默认
});
```

### 3.6 构建 CSS 注入策略优化

```typescript
export default defineConfig({
  build: {
    cssMinify: 'lightningcss', // Vite 5 新增，比 esbuild CSS 压缩更快
  },
});
```

### 3.7 完整 `vite.config.ts` 示例（Vite 5 最佳实践）

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        // Vite 5 推荐：使用 SWC 加速 React 编译
        // 需安装 @vitejs/plugin-react-swc
      }),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
      // Vite 5: 明确扩展名解析顺序
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },

    server: {
      port: 5173,
      strictPort: false,
      host: true, // 暴露给局域网
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'esbuild',
      cssMinify: 'esbuild', // 或 'lightningcss'
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // React 相关
              if (/react(-dom|-router|-refresh)?\//.test(id)) return 'react-vendor';
              // UI 库
              if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
              // 工具库
              if (id.includes('lodash') || id.includes('dayjs')) return 'utils';
              return 'vendor';
            }
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Vite 5: chunk 大小警告
      chunkSizeWarningLimit: 1000,
    },

    // 依赖预构建（Vite 5 优化了自动扫描）
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: [],
    },

    // 环境变量
    envPrefix: 'VITE_',
  };
});
```

---

## 四、Webpack 5.x 不可替代的场景

### 4.1 Module Federation（微前端）

```javascript
// webpack.config.js — 生产级微前端，Vite 目前没有完整替代方案
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        app1: 'app1@http://cdn.example.com/remoteEntry.js',
      },
      shared: { react: { singleton: true } },
    }),
  ],
};
```

> 📌 Vite 有 `vite-plugin-federation`，但稳定性不及 Webpack MF。

### 4.2 复杂的自定义 Loader 链

```javascript
// Webpack 的 loader 链式调用机制没有 Vite 对应物
module.exports = {
  module: {
    rules: [{
      test: /\.md$/,
      use: ['html-loader', 'markdown-loader'], // 链式处理
    }],
  },
};
```

### 4.3 精细的 chunk 控制（SplitChunksPlugin）

```javascript
// 比 Rollup manualChunks 更灵活的分包策略
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // 按访问频率分包，精确控制
    },
  },
}
```

---

## 五、迁移建议：Webpack → Vite

### 5.1 迁移成本评估

| 项目特征 | 迁移难度 | 建议 |
|---------|---------|------|
| 标准 React/Vue SPA | ⭐ 低 | 强烈推荐迁移 |
| 使用 Module Federation | ⭐⭐⭐ 高 | 暂缓，等 Vite 生态完善 |
| 大量自定义 Webpack Loader | ⭐⭐ 中 | 逐步迁移，先新功能用 Vite |
| Webpack 配置 < 100 行 | ⭐ 低 | 可在 1 天内完成迁移 |
| Webpack 配置 > 500 行 | ⭐⭐⭐ 高 | 分阶段迁移 |

### 5.2 常见迁移问题

```typescript
// 1. require() 不可用（Vite 使用 ESM）
// ❌ Webpack: const logo = require('./logo.png')
// ✅ Vite:
import logo from './logo.png';

// 2. process.env 替换
// ❌ process.env.NODE_ENV
// ✅ Vite:
import.meta.env.MODE

// 3. __dirname 不可用（ESM 模式）
// ✅ 替代方案：
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 4. Webpack alias 迁移
// webpack: { resolve: { alias: { '@': path.resolve('src') } } }
// vite: resolve: { alias: { '@': resolve(__dirname, 'src') } }  ← 相同！

// 5. 环境变量前缀
// Webpack: process.env.REACT_APP_XXX
// Vite:    import.meta.env.VITE_XXX
```

### 5.3 迁移步骤（最小化路径）

```bash
# 1. 安装 Vite
npm install -D vite @vitejs/plugin-react

# 2. 创建 vite.config.ts（参考上方模板）

# 3. 修改 index.html（Vite 要求 HTML 在根目录，script 改为 type="module"）
# <script type="module" src="/src/main.tsx"></script>

# 4. 替换环境变量（全局搜索替换）
# process.env.REACT_APP_ → import.meta.env.VITE_

# 5. 修改 .env 文件前缀（REACT_APP_ → VITE_）

# 6. package.json scripts
# "start": "vite",
# "build": "tsc && vite build",
# "preview": "vite preview"

# 7. 逐步处理 require() 语法
```

---

## 六、2026 年选型建议

```
新项目（SPA/SSR）：
  → Vite 5.x（React/Vue 均支持，开发体验最好）
  → Next.js 14+（内置 Turbopack，生产级 SSR 首选）
  → Nuxt 3（Vue 生态，内置 Vite）

老项目维护：
  → 继续 Webpack 5，性能优化空间通过 cache/thread-loader 提升
  → 可以用 Rspack 直接替换 Webpack（API 兼容，Rust 写，快 5-10x）

企业微前端：
  → Webpack 5 Module Federation（最成熟）
  → 或 micro-app / wujie 框架（与构建工具解耦）
```

---

## 面试快答

**Q：Vite 为什么比 Webpack 快？**
开发时利用浏览器原生 ESM 按需编译，不打包；依赖用 esbuild (Go) 预构建，比 JS 快 10-100x；HMR 是文件级 O(1)，不重新编译 chunk。

**Q：Vite 生产构建为什么用 Rollup 而不是 esbuild？**
esbuild 缺少高级代码分割、CSS 代码分割等生产优化。Rollup 的 Tree Shaking 更彻底。（Vite 5 实验性引入 rolldown，未来可能统一。）

**Q：什么情况下还是选 Webpack？**
① 用了 Module Federation 做微前端；② 大量自定义 loader 依赖 Webpack 特有机制；③ 需要精细的 SplitChunks 策略；④ 需要支持 IE11（Vite legacy plugin 兼容性有限）。
