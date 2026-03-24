# Webpack 性能优化实战

> 面试高频考点：构建速度优化、产物体积优化、Tree Shaking 原理、代码分割策略、持久化缓存。

## 面试高频考点

1. **Webpack 构建速度慢，有哪些优化手段？**
2. **Tree Shaking 的原理是什么？为什么 CommonJS 不支持？**
3. **代码分割（Code Splitting）有哪几种方式？**
4. **如何分析 Webpack 打包产物，找出体积问题？**
5. **Webpack 5 的持久化缓存是怎么工作的？**

---

## 一、构建速度优化

### 1.1 持久化缓存（Webpack 5 内置）

Webpack 5 内置了文件系统缓存，将编译结果缓存到磁盘，二次构建速度提升 90%+：

```javascript
// webpack.config.js
module.exports = {
  cache: {
    type: 'filesystem',          // 使用文件系统缓存（默认 memory）
    buildDependencies: {
      config: [__filename],      // 配置文件变化时使缓存失效
    },
    cacheDirectory: '.webpack-cache', // 缓存目录（默认 node_modules/.cache/webpack）
  },
};
```

**原理**：Webpack 5 对每个模块计算哈希，只重新编译内容发生变化的模块，其余直接从缓存读取。

### 1.2 多线程编译（thread-loader）

将耗时的 Loader（如 babel-loader）放到 Worker 线程池中并行执行：

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 4,           // Worker 数量，建议 CPU 核数 - 1
              workerParallelJobs: 50,
            },
          },
          'babel-loader',
        ],
      },
    ],
  },
};
```

**注意**：thread-loader 有启动开销（约 600ms），只适合耗时超过 1s 的 Loader，小项目反而会变慢。

### 1.3 缩小编译范围

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'), // ✅ 只编译 src 目录
        exclude: /node_modules/,                 // ✅ 排除 node_modules
        use: 'babel-loader',
      },
    ],
  },
  resolve: {
    // 减少模块查找范围
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    // 减少扩展名尝试次数（按使用频率排序）
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // 使用 mainFields 减少字段查找
    mainFields: ['browser', 'module', 'main'],
  },
};
```

### 1.4 DLL 预编译（Webpack 5 已不推荐）

Webpack 5 的持久化缓存已经覆盖了 DLL 的使用场景，新项目不再需要 DLL。

---

## 二、产物体积优化

### 2.1 Tree Shaking

**原理**：基于 ESM 的静态结构（`import/export` 在编译时确定），打包工具可以分析出哪些导出从未被使用，在最终产物中删除这些"死代码"。

**为什么 CommonJS 不支持 Tree Shaking？**

CommonJS 的 `require` 是动态的，可以在运行时根据条件加载不同模块：

```javascript
// CommonJS：运行时才知道导入什么
const module = condition ? require('./a') : require('./b');
const { fn } = require('./utils'); // 可能只用了 fn，但整个 utils 都被打包

// ESM：编译时就确定了依赖关系
import { fn } from './utils'; // 打包工具知道只用了 fn，其他导出可以删除
```

**配置 Tree Shaking**：

```javascript
// webpack.config.js
module.exports = {
  mode: 'production', // production 模式自动开启 Tree Shaking

  optimization: {
    usedExports: true,  // 标记未使用的导出
    minimize: true,     // 启用 Terser 删除标记的代码
  },
};

// package.json — 声明无副作用（关键！）
{
  "sideEffects": false,
  // 或指定有副作用的文件
  "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"]
}
```

**`sideEffects` 的重要性**：如果不声明，Webpack 会保守地保留所有模块（因为 `import './style.css'` 这类语句有副作用）。声明 `"sideEffects": false` 告诉 Webpack 所有模块都是纯净的，可以安全删除未使用的导出。

### 2.2 代码分割（Code Splitting）

**方式一：入口点分割（多入口）**

```javascript
module.exports = {
  entry: {
    main: './src/main.js',
    admin: './src/admin.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all', // 提取公共模块
    },
  },
};
```

**方式二：动态导入（推荐）**

```javascript
// 路由级别的代码分割
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

// 条件加载
button.addEventListener('click', async () => {
  const { heavyLib } = await import('./heavyLib');
  heavyLib.doSomething();
});

// 魔法注释：控制 chunk 名称和预加载
const Chart = lazy(() => import(
  /* webpackChunkName: "chart" */
  /* webpackPrefetch: true */    // 空闲时预加载
  './Chart'
));
```

**方式三：SplitChunksPlugin 配置**

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 将 node_modules 中的包单独打包
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // 将 React 相关单独打包（变化频率低，利于缓存）
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          priority: 20,
        },
        // 被多个 chunk 引用的公共模块
        common: {
          minChunks: 2,      // 至少被 2 个 chunk 引用
          minSize: 20000,    // 最小 20KB
          name: 'common',
          priority: 5,
        },
      },
    },
  },
};
```

### 2.3 压缩优化

```javascript
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,          // 多线程压缩
        terserOptions: {
          compress: {
            drop_console: true,  // 删除 console.log
            drop_debugger: true,
          },
        },
      }),
      new CssMinimizerPlugin(),  // 压缩 CSS
    ],
  },
};
```

### 2.4 图片与资源优化

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset',           // Webpack 5 内置 Asset Modules
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,   // 小于 8KB 转 base64，减少请求数
          },
        },
        generator: {
          filename: 'images/[name].[contenthash:8][ext]',
        },
      },
    ],
  },
};
```

---

## 三、持久化缓存策略（浏览器缓存）

### 3.1 contenthash 文件名

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash:8].js',      // JS 文件
    chunkFilename: '[name].[contenthash:8].js', // 异步 chunk
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash:8].css',   // CSS 文件
    }),
  ],
};
```

**`contenthash` vs `chunkhash` vs `hash`**：

| 类型 | 范围 | 适用场景 |
|------|------|---------|
| `hash` | 整个构建 | 任何文件变化，所有文件 hash 都变 |
| `chunkhash` | 同一 chunk | JS 和 CSS 共用，CSS 变化会影响 JS hash |
| `contenthash` | 单个文件内容 | ✅ 推荐，只有文件自身内容变化才更新 hash |

### 3.2 Runtime Chunk 分离

```javascript
module.exports = {
  optimization: {
    runtimeChunk: 'single', // 将 webpack runtime 代码单独提取
    // 避免 runtime 代码变化导致 vendor chunk 的 hash 改变
  },
};
```

---

## 四、打包分析工具

### 4.1 webpack-bundle-analyzer

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',      // 生成 HTML 报告文件
      reportFilename: 'report.html',
      openAnalyzer: false,
    }),
  ],
};
```

运行后会生成可视化的 treemap，直观看出哪些包体积最大。

### 4.2 speed-measure-webpack-plugin

```javascript
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const smp = new SpeedMeasurePlugin();

module.exports = smp.wrap({
  // 正常的 webpack 配置
  plugins: [...],
  module: { rules: [...] },
});
```

输出每个 Loader 和 Plugin 的耗时，精准定位构建瓶颈。

---

## 五、优化效果对比（参考数据）

| 优化手段 | 构建速度提升 | 产物体积减少 |
|---------|------------|------------|
| 持久化缓存（二次构建） | 60~90% | - |
| thread-loader（大项目） | 20~40% | - |
| Tree Shaking | - | 10~40% |
| 代码分割 + 懒加载 | - | 首屏 30~60% |
| 图片 base64 内联 | - | 减少请求数 |
| Gzip/Brotli 压缩 | - | 60~80% |

---

## 六、面试答题模板

**Q：Webpack 构建速度优化有哪些手段？**

主要从三个维度优化：① **缓存**：Webpack 5 内置文件系统缓存（`cache: { type: 'filesystem' }`），二次构建速度提升 90%；② **并行**：`thread-loader` 将 babel-loader 等耗时 Loader 放到 Worker 线程并行执行；③ **缩小范围**：通过 `include/exclude` 限制 Loader 处理范围，合理配置 `resolve.extensions` 减少文件查找次数。

**Q：Tree Shaking 的原理？**

Tree Shaking 依赖 ESM 的静态结构。ESM 的 `import/export` 在编译时就确定了依赖关系，打包工具可以构建完整的模块依赖图，标记出哪些导出从未被引用（dead code），最终由 Terser 等压缩工具删除。CommonJS 的 `require` 是动态的，运行时才知道导入什么，无法静态分析，所以不支持 Tree Shaking。使用时还需要在 `package.json` 中声明 `"sideEffects": false`，告诉 Webpack 可以安全删除未使用的模块。
