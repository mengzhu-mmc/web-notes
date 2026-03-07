# Webpack 5 核心特性

## 关联笔记

- [[10-工程化/Vite深入理解]]
- [[10-工程化/前端工程化全景]]
- [[10-工程化/README]]
- [[10-工程化/[4424] 10  流程分解：Webpack 的完整构建流程]]
- [[10-工程化/[4425] 11  编译提效：如何为 Webpack 编译阶段提速？]]
- [[10-工程化/[4426] 12  打包提效：如何为 Webpack 打包阶段提速？]]
- [[10-工程化/[4427] 13  缓存优化：那些基于缓存的优化方案]]
- [[10-工程化/[4428] 14  增量构建：Webpack 中的增量构建]]
- [[10-工程化/[4429] 15  版本特性：Webpack 5 中的优化细节]]
- [[10-工程化/[4430] 16  无包构建：盘点那些 No-bundle 的构建方案]]
- [[10-工程化/[7209] 13  代码构建与 Webpack 必备技能]]

---

## 一、Module Federation（模块联邦）

### 1.1 核心概念

Module Federation 允许多个独立构建的应用在运行时动态共享模块，是**微前端**的重要实现方案之一。

```
传统方式：
  App A → npm install shared-lib → 构建时打包进 bundle
  App B → npm install shared-lib → 又打包一份

Module Federation：
  App A → 暴露 shared-lib 为远程模块
  App B → 运行时从 App A 动态加载 shared-lib
  → 不需要发 npm 包，不需要重新构建
```

**关键术语**：
- **Host（消费者）**：加载远程模块的应用
- **Remote（提供者）**：暴露模块给其他应用的应用
- **Shared（共享依赖）**：多个应用共享的包（如 React），避免重复加载
- 一个应用可以**同时是 Host 和 Remote**

### 1.2 配置示例

```javascript
// Remote 应用（App A —— 暴露模块）
// webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  output: {
    publicPath: 'http://localhost:3001/',
    uniqueName: 'app_a', // 避免全局变量冲突
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'app_a',           // 全局唯一名称
      filename: 'remoteEntry.js', // 远程入口文件
      exposes: {
        // 暴露的模块
        './Button': './src/components/Button',
        './utils': './src/utils/index',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

```javascript
// Host 应用（App B —— 消费模块）
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'app_b',
      remotes: {
        // 远程应用映射
        app_a: 'app_a@http://localhost:3001/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

```tsx
// Host 中使用远程模块
// 方式1：动态 import（推荐）
const RemoteButton = React.lazy(() => import('app_a/Button'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RemoteButton label="来自 App A 的按钮" />
    </Suspense>
  );
}

// 方式2：静态 import（需要额外的 bootstrap 入口）
// bootstrap.tsx
import { Button } from 'app_a/Button';
```

### 1.3 Shared 共享策略

```javascript
shared: {
  react: {
    singleton: true,         // 全局只加载一个版本
    strictVersion: true,     // 版本不匹配则报错（而非警告）
    requiredVersion: '^18.0.0',
    eager: false,            // true = 不异步加载，直接打入 bundle
  },
  lodash: {
    // 不设 singleton → 各应用可以加载不同版本
    requiredVersion: '^4.17.0',
  },
}
```

### 1.4 运行时原理

```
1. Host 加载页面，遇到远程模块 import
2. 动态创建 <script> 加载 remoteEntry.js
3. remoteEntry.js 注册到全局容器（__webpack_modules__）
4. 协商共享依赖版本：
   - 同 singleton + 版本兼容 → 使用 Host 的版本
   - 版本不兼容 → 加载 Remote 自带的版本
5. 远程模块的代码通过 chunk 懒加载
```

### 1.5 面试要点

- **vs 微前端框架（qiankun/single-spa）**：MF 是模块级共享，粒度更细；微前端框架是应用级隔离
- **vs npm 包**：MF 是运行时依赖，不需要重新构建消费方；npm 包是构建时依赖
- **风险**：远程模块挂了会影响 Host（需要错误边界兜底）、版本管理复杂、调试困难

---

## 二、Tree Shaking 改进

### 2.1 Webpack 4 vs Webpack 5 Tree Shaking

```
Webpack 4:
  - 只支持模块级别的 Tree Shaking
  - export 的对象如果被引用，整个对象都保留
  - 嵌套 export 无法 shake

Webpack 5 新增:
  - 嵌套 Tree Shaking（Inner Module Tree Shaking）
  - export * 的深度分析
  - CommonJS Tree Shaking（有限支持）
```

### 2.2 嵌套 Tree Shaking

```javascript
// utils.js
export const utils = {
  foo() { console.log('foo'); },
  bar() { console.log('bar'); },
};

// app.js
import { utils } from './utils';
utils.foo(); // 只用了 foo

// Webpack 4: utils 整个对象保留（包含 bar）
// Webpack 5: 可以分析到只用了 foo，移除 bar（需要 optimization.innerGraph: true）
```

### 2.3 CommonJS Tree Shaking

```javascript
// Webpack 5 可以分析部分 CJS 模式
const { pick } = require('lodash');
// Webpack 5 能识别这种解构模式，只打包 pick

// 但不是所有 CJS 都能 shake：
const _ = require('lodash');
_.pick(obj, ['a']); // 无法 shake，因为 _ 是动态对象
```

### 2.4 确保 Tree Shaking 生效的最佳实践

```json
// package.json
{
  "sideEffects": false,
  // 或精确标注有副作用的文件
  "sideEffects": ["*.css", "*.scss", "./src/polyfills.ts"]
}
```

```javascript
// webpack.config.js
module.exports = {
  mode: 'production', // production 默认开启 Tree Shaking
  optimization: {
    usedExports: true,  // 标记未使用的 export
    innerGraph: true,   // 嵌套分析（Webpack 5 默认开启）
    sideEffects: true,  // 读取 package.json 的 sideEffects
  },
};
```

---

## 三、持久化缓存（Filesystem Cache）

### 3.1 Webpack 4 vs Webpack 5 缓存

```
Webpack 4:
  - 只有内存缓存（关闭进程后丢失）
  - 需要 cache-loader、hard-source-webpack-plugin 等第三方方案

Webpack 5:
  - 内置 filesystem 缓存（写入磁盘）
  - 重启构建时自动复用，显著提升二次构建速度
  - 通常二次构建提速 60-90%
```

### 3.2 配置

```javascript
module.exports = {
  cache: {
    type: 'filesystem',             // 'memory' | 'filesystem'
    buildDependencies: {
      config: [__filename],         // 当 webpack.config.js 变化时缓存失效
    },
    cacheDirectory: '.webpack_cache', // 缓存目录（默认 node_modules/.cache/webpack）
    name: `${process.env.NODE_ENV}`, // 按环境分缓存
    version: '1.0',                  // 手动使缓存失效
    compression: 'gzip',            // 压缩缓存文件
    maxAge: 1000 * 60 * 60 * 24 * 7, // 缓存有效期（毫秒）
  },
};
```

### 3.3 缓存失效机制

```
缓存失效条件：
  1. buildDependencies 中的文件变化（如 webpack.config.js）
  2. 源文件内容 hash 变化
  3. loader/plugin 版本变化
  4. node_modules 变化（lock 文件 hash）
  5. 手动更改 cache.version
```

### 3.4 CI 中使用

```yaml
# GitHub Actions 缓存 Webpack 构建
- uses: actions/cache@v3
  with:
    path: .webpack_cache
    key: webpack-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: webpack-${{ runner.os }}-
```

---

## 四、Asset Modules（资源模块）

### 4.1 替代旧 Loader

```
Webpack 4（需要各种 loader）:
  file-loader   → 输出文件，返回 URL
  url-loader    → 小文件转 base64，大文件回退 file-loader
  raw-loader    → 以字符串形式导入文件

Webpack 5（内置 Asset Modules）:
  asset/resource → 替代 file-loader
  asset/inline   → 替代 url-loader（全部转 base64）
  asset/source   → 替代 raw-loader
  asset          → 替代 url-loader（自动选择：小文件内联，大文件输出）
```

### 4.2 配置示例

```javascript
module.exports = {
  module: {
    rules: [
      // 图片：小于 8KB 内联，否则输出文件
      {
        test: /\.(png|jpe?g|gif|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB
          },
        },
        generator: {
          filename: 'images/[name]-[contenthash:8][ext]',
        },
      },
      // SVG 始终输出文件
      {
        test: /\.svg$/i,
        type: 'asset/resource',
        generator: {
          filename: 'icons/[name]-[contenthash:8][ext]',
        },
      },
      // 字体文件
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name]-[contenthash:8][ext]',
        },
      },
      // 文本文件以字符串导入
      {
        test: /\.txt$/,
        type: 'asset/source',
      },
    ],
  },
};
```

### 4.3 迁移指南

```diff
 module.exports = {
   module: {
     rules: [
-      {
-        test: /\.(png|jpg)$/,
-        use: [{
-          loader: 'url-loader',
-          options: { limit: 8192, name: 'images/[name].[hash:8].[ext]' }
-        }]
-      },
+      {
+        test: /\.(png|jpg)$/,
+        type: 'asset',
+        parser: { dataUrlCondition: { maxSize: 8192 } },
+        generator: { filename: 'images/[name]-[contenthash:8][ext]' }
+      },
     ],
   },
 };
```

---

## 五、Top Level Await

### 5.1 什么是 Top Level Await？

允许在模块顶层使用 `await`，无需包裹在 async 函数中：

```javascript
// 以前
let data;
(async () => {
  data = await fetch('/api/config').then(r => r.json());
})();

// Webpack 5 + Top Level Await
const data = await fetch('/api/config').then(r => r.json());
export { data };

// 实际应用：动态配置加载、条件导入
const locale = navigator.language;
const messages = await import(`./locales/${locale}.js`);
export default messages;
```

### 5.2 配置

```javascript
module.exports = {
  experiments: {
    topLevelAwait: true, // Webpack 5 默认在 experiments 中
  },
};
```

### 5.3 注意事项

- 使用 TLA 的模块会变成**异步模块**
- 所有依赖它的模块也会变成异步的（传染性）
- 会影响模块的加载顺序和性能
- 适合配置加载、polyfill 检测等场景，不宜滥用

---

## 六、Webpack 5 vs Webpack 4 重要区别

### 6.1 完整对比

| 特性 | Webpack 4 | Webpack 5 |
|------|-----------|-----------|
| Node.js polyfill | 自动注入（crypto, path 等） | **移除**，需手动配置 |
| 持久化缓存 | 需要第三方插件 | **内置** filesystem cache |
| Asset Modules | file/url/raw-loader | **内置**四种资源类型 |
| Module Federation | 无 | **新增** |
| Tree Shaking | 模块级 | **增强**（嵌套、CJS） |
| 代码分割 | 同 | 更智能的 splitChunks 默认配置 |
| 模块 ID | 数字递增 | **确定性** ID（contenthash） |
| Chunk ID | 数字递增 | **确定性** ID |
| Top Level Await | 不支持 | **支持**（实验性） |
| 运行时优化 | 同 | 更小的运行时代码 |

### 6.2 Node.js Polyfill 移除（重要迁移点）

```javascript
// Webpack 4 自动 polyfill Node.js 核心模块
import crypto from 'crypto'; // 自动使用 crypto-browserify

// Webpack 5 不再自动 polyfill，需要手动配置
module.exports = {
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      path: require.resolve('path-browserify'),
      // 或者不需要 polyfill 时设为 false
      fs: false,
      net: false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
};
```

### 6.3 确定性 ID

```javascript
// Webpack 4: 模块 ID 是数字递增的
// 新增/删除模块会导致 ID 变化 → 所有 chunk 的 hash 都变 → 缓存全部失效

// Webpack 5: 基于内容的确定性 ID
module.exports = {
  optimization: {
    moduleIds: 'deterministic',  // 默认
    chunkIds: 'deterministic',   // 默认
    // 模块内容不变 → ID 不变 → hash 不变 → 长期缓存有效
  },
};
```

---

## 七、常用 Loader 和 Plugin 配置

### 7.1 核心 Loader

```javascript
module.exports = {
  module: {
    rules: [
      // Babel（JS/TS 编译）
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: '> 0.5%, not dead', useBuiltIns: 'usage', corejs: 3 }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
            cacheDirectory: true, // 开启 babel 缓存
          },
        },
      },

      // 或使用 SWC（更快，Rust 实现）
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
      },

      // CSS
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // 生产环境提取 CSS
          // 'style-loader',            // 开发环境注入 <style>
          {
            loader: 'css-loader',
            options: {
              modules: { auto: true, localIdentName: '[name]__[local]--[hash:5]' },
            },
          },
          'postcss-loader',
        ],
      },

      // SCSS/LESS
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
      },
      {
        test: /\.less$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', {
          loader: 'less-loader',
          options: { lessOptions: { javascriptEnabled: true } },
        }],
      },
    ],
  },
};
```

### 7.2 核心 Plugin

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  plugins: [
    // HTML 模板
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: { collapseWhitespace: true, removeComments: true },
    }),

    // CSS 提取
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[contenthash:8].css',
      chunkFilename: 'css/[name]-[contenthash:8].css',
    }),

    // TypeScript 类型检查（独立进程）
    new ForkTsCheckerWebpackPlugin({
      typescript: { diagnosticOptions: { semantic: true, syntactic: true } },
    }),

    // 环境变量注入
    new webpack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    }),

    // 静态文件复制
    new CopyWebpackPlugin({
      patterns: [{ from: 'public', to: '', globOptions: { ignore: ['**/index.html'] } }],
    }),

    // 打包分析（按需开启）
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),

  // 压缩配置
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: { drop_console: true, drop_debugger: true },
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
};
```

---

## 八、性能优化配置

### 8.1 SplitChunks（代码分割）

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',          // 'initial' | 'async' | 'all'
      minSize: 20000,         // 最小 chunk 大小（bytes）
      minChunks: 1,           // 最少被引用次数
      maxAsyncRequests: 30,   // 并行加载最大请求数
      maxInitialRequests: 30, // 入口并行请求数

      cacheGroups: {
        // React 全家桶单独打包
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 40,
        },
        // UI 库单独打包
        antd: {
          test: /[\\/]node_modules[\\/](antd|@ant-design)[\\/]/,
          name: 'antd-vendor',
          chunks: 'all',
          priority: 30,
        },
        // 其他第三方库
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // 公共模块
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    // 将 webpack 运行时代码提取为单独 chunk
    runtimeChunk: 'single',
  },
};
```

### 8.2 DLL（动态链接库）

> 注意：Webpack 5 有了持久化缓存后，DLL 的必要性降低了。但大型项目仍可使用。

```javascript
// webpack.dll.config.js —— 预编译不常变的库
const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    vendor: ['react', 'react-dom', 'lodash-es'],
  },
  output: {
    path: path.resolve(__dirname, 'dll'),
    filename: '[name].dll.js',
    library: '[name]_dll',
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_dll',
      path: path.resolve(__dirname, 'dll/[name].manifest.json'),
    }),
  ],
};

// 主配置中引用 DLL
module.exports = {
  plugins: [
    new webpack.DllReferencePlugin({
      manifest: require('./dll/vendor.manifest.json'),
    }),
  ],
};
```

```bash
# 先构建 DLL（只需在依赖变化时重建）
webpack --config webpack.dll.config.js
# 再正常构建
webpack
```

### 8.3 thread-loader（多线程编译）

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: require('os').cpus().length - 1, // worker 数量
              poolTimeout: 2000, // 空闲超时释放 worker
            },
          },
          'babel-loader',
        ],
        exclude: /node_modules/,
      },
    ],
  },
};
```

> **注意**：thread-loader 有通信开销，只对编译耗时较长的 loader 有效（如 babel-loader、ts-loader）。小项目可能反而更慢。

### 8.4 综合优化清单

```javascript
// webpack.config.js —— 生产环境完整优化
module.exports = {
  mode: 'production',

  // 1. 持久化缓存
  cache: { type: 'filesystem' },

  // 2. 资源模块（内置，不需要 file/url-loader）
  module: {
    rules: [
      { test: /\.(png|jpg|gif|webp)$/, type: 'asset', parser: { dataUrlCondition: { maxSize: 8192 } } },
    ],
  },

  // 3. 代码分割
  optimization: {
    splitChunks: { chunks: 'all' },
    runtimeChunk: 'single',
    minimize: true,
    minimizer: [new TerserPlugin({ parallel: true }), new CssMinimizerPlugin()],
    // 确定性 ID（长期缓存）
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  },

  // 4. 输出文件名含 contenthash（长期缓存）
  output: {
    filename: '[name]-[contenthash:8].js',
    chunkFilename: '[name]-[contenthash:8].js',
    clean: true, // 构建前清空 dist（替代 clean-webpack-plugin）
  },

  // 5. 减小 resolve 范围
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'], // 减少尝试的后缀
    modules: ['node_modules'],                    // 明确搜索目录
    alias: { '@': path.resolve(__dirname, 'src') },
  },

  // 6. 排除不需要打包的库
  externals: {
    // CDN 引入的库
    react: 'React',
    'react-dom': 'ReactDOM',
  },

  // 7. SourceMap 策略
  devtool: 'source-map', // 生产环境用 source-map 或 hidden-source-map
  // 开发环境用 eval-cheap-module-source-map（快）
};
```

---

## 九、面试高频问题

### Q1：Webpack 的构建流程？

```
1. 初始化：读取配置，合并参数，创建 Compiler 对象
2. 编译（make）：从 entry 出发，递归分析依赖，对每个模块调用对应 Loader 转译
3. 生成 Module Graph：所有模块和依赖关系形成依赖图
4. 代码生成：根据 Module Graph 和 SplitChunks 配置生成 Chunk
5. 输出（emit）：将 Chunk 写入文件系统
```

参考 → [[10-工程化/[4424] 10  流程分解：Webpack 的完整构建流程]]

### Q2：Loader 和 Plugin 的区别？

- **Loader**：文件转换器，将非 JS 文件转为 Webpack 可处理的模块。本质是函数 `(source) => transformedSource`，在模块加载时执行。
- **Plugin**：功能扩展，通过 Tapable 钩子机制介入构建的各个阶段。本质是类 `{ apply(compiler) {} }`，可以做 Loader 做不到的事（如生成额外文件、优化输出等）。

### Q3：Webpack 热更新（HMR）原理？

```
1. webpack-dev-server 启动本地服务，与浏览器建立 WebSocket 连接
2. 文件变更 → Webpack 增量编译 → 生成更新的 module（hot-update.js）和 manifest（hot-update.json）
3. 通过 WebSocket 通知浏览器有更新
4. 浏览器 HMR Runtime 通过 JSONP 请求获取更新的模块
5. 用新模块替换旧模块，触发 module.hot.accept 回调
```

参考 → [[10-工程化/[4416] 02  界面调试：热更新技术如何开着飞机修引擎？]]

### Q4：SplitChunks 怎么配？

根据项目实际情况：
- **框架库**（React、Vue）打成单独 chunk → 变化频率低，缓存命中率高
- **UI 库**（antd、Element）单独 chunk → 体积大，独立缓存
- **业务公共模块** → `minChunks: 2` 提取复用代码
- **路由级懒加载** → `React.lazy` / `import()` 自动分 chunk
- `runtimeChunk: 'single'` → 避免运行时代码重复

### Q5：如何优化 Webpack 构建速度？

| 方案 | 原理 | 效果 |
|------|------|------|
| 持久化缓存 | `cache: { type: 'filesystem' }` | 二次构建提速 60-90% |
| 多线程 | `thread-loader` / SWC | 利用多核并行编译 |
| 缩小构建范围 | `exclude: /node_modules/`、精确 `resolve` | 减少文件搜索和转译 |
| DLL | 预编译不变的依赖 | 减少重复编译 |
| SourceMap 策略 | 开发用 `eval-cheap-module-source-map` | 速度与调试的平衡 |
| esbuild-loader | 替代 babel-loader + terser | Go 编译速度优势 |

### Q6：Module Federation 的应用场景？

- **微前端**：各团队独立开发部署，运行时组合
- **公共组件库**：不需要发 npm，修改后其他应用自动获取最新版
- **跨项目代码共享**：比 npm 包更实时、比 monorepo 更独立
- **灰度/AB 测试**：动态加载不同版本的远程模块

### Q7：Webpack 5 从 4 升级有哪些破坏性变更？

1. 移除 Node.js polyfill → 需手动配置 `resolve.fallback`
2. 不再支持 `require.ensure` → 用 `import()` 替代
3. Loader 中 `this.getOptions()` 替代 `loader-utils`
4. 默认 `output.hashFunction` 改为 xxhash64
5. `cache: { type: 'filesystem' }` 可能导致一些第三方 loader 不兼容
6. 部分内部 API 和 hook 变更
