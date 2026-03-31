# Vite 原理与配置实战

## 面试高频考点

- Vite 为什么比 Webpack 快？
- Vite 的开发模式和生产模式有什么区别？
- Vite 的热更新（HMR）原理？
- Vite 常用配置有哪些？
- Vite 和 Webpack 如何选择？

---

## 一、Vite 为什么快？

### 开发模式：利用浏览器原生 ES Module

```
Webpack 开发模式：
  启动时 → 打包所有模块 → 生成 bundle → 浏览器加载
  问题：项目越大，启动越慢（几十秒甚至几分钟）

Vite 开发模式：
  启动时 → 只做依赖预构建（node_modules）→ 启动完成
  浏览器请求时 → 按需编译单个文件 → 返回 ES Module
  优势：启动时间与项目大小无关（通常 < 1s）
```

```html
<!-- Vite 开发模式下，浏览器直接加载 ES Module -->
<script type="module" src="/src/main.ts"></script>
```

### 依赖预构建（Pre-bundling）

```
为什么需要预构建？
1. 将 CommonJS/UMD 格式的依赖转换为 ES Module
2. 将有大量内部模块的包（如 lodash-es）合并为单个文件
   （避免浏览器发出几百个请求）

预构建工具：esbuild（Go 语言编写，比 Babel 快 10-100 倍）
预构建结果缓存在：node_modules/.vite/deps/
```

### 生产模式：Rollup 打包

```
Vite 生产构建使用 Rollup（不是 esbuild）
原因：Rollup 的 Tree Shaking 和代码分割更成熟
```

---

## 二、热更新（HMR）原理

```
1. Vite 启动时，建立 WebSocket 连接（客户端 ↔ 服务端）
2. 文件变化时，Vite 服务端检测到变化
3. 服务端通过 WebSocket 发送更新消息给浏览器
4. 浏览器收到消息，只重新请求变化的模块（不刷新整页）
5. 框架（React/Vue）的 HMR 插件负责保留组件状态

对比 Webpack HMR：
- Webpack：需要重新编译整个模块图，找出变化的模块
- Vite：直接知道哪个文件变了，只处理该文件
```

---

## 三、常用配置

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
    }
  },

  // 开发服务器
  server: {
    port: 3000,
    open: true, // 自动打开浏览器
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 代码分割
    rollupOptions: {
      output: {
        // 将 node_modules 中的包单独打包
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        }
      }
    },
    // 小于此大小的资源内联为 base64
    assetsInlineLimit: 4096, // 4kb
  },

  // CSS 配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    },
    modules: {
      // CSS Modules 类名格式
      generateScopedName: '[name]__[local]__[hash:base64:5]'
    }
  },

  // 环境变量
  // .env.development / .env.production
  // VITE_ 前缀的变量才会暴露给客户端
  // 访问：import.meta.env.VITE_API_URL
});
```

---

## 四、环境变量

```bash
# .env（所有环境）
VITE_APP_TITLE=My App

# .env.development（开发环境）
VITE_API_URL=http://localhost:8080

# .env.production（生产环境）
VITE_API_URL=https://api.example.com
```

```ts
// 在代码中使用
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
const mode = import.meta.env.MODE; // 'development' | 'production'

// TypeScript 类型提示
// vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}
```

---

## 五、Vite 插件开发

```ts
// 自定义 Vite 插件
import type { Plugin } from 'vite';

function myPlugin(): Plugin {
  return {
    name: 'my-plugin',

    // 构建开始
    buildStart() {
      console.log('构建开始');
    },

    // 转换文件内容
    transform(code, id) {
      if (id.endsWith('.vue')) {
        // 处理 .vue 文件
        return { code: transformedCode, map: null };
      }
    },

    // 解析模块 ID
    resolveId(id) {
      if (id === 'virtual:my-module') {
        return id; // 返回虚拟模块 ID
      }
    },

    // 加载模块内容
    load(id) {
      if (id === 'virtual:my-module') {
        return 'export const msg = "Hello from virtual module"';
      }
    },

    // 开发服务器配置
    configureServer(server) {
      server.middlewares.use('/custom', (req, res) => {
        res.end('custom response');
      });
    }
  };
}
```

---

## 六、Vite vs Webpack 如何选择

| 对比项 | Vite | Webpack |
| --- | --- | --- |
| 开发启动速度 | ⚡ 极快（< 1s） | 🐢 较慢（随项目增大） |
| HMR 速度 | ⚡ 极快 | 较快 |
| 生产构建 | Rollup（成熟） | Webpack（成熟） |
| 生态插件 | 较少但在增长 | 非常丰富 |
| 配置复杂度 | 简单 | 复杂 |
| 兼容性 | 需要现代浏览器 | 可配置兼容旧浏览器 |
| 适用场景 | 新项目、SPA | 老项目、复杂构建需求 |

**结论**：新项目优先选 Vite，老项目迁移成本高可继续用 Webpack。
