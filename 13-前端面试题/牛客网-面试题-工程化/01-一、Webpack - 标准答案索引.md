# 01-一、Webpack - 标准答案索引

> 来源：[[01-一、Webpack]]。本页沉淀可直接用于面试表达的答案。

## 回答结构

- **结论**：先直接回答核心问题。
- **原理**：解释关键机制，不只背定义。
- **实践**：结合项目落地、指标或复杂度说明。
- **追问**：主动暴露可深入的方向。

## 高频标准答案

### Q1：Loader 和 Plugin 区别？

Loader 面向单个模块的内容转换，例如把 TS、Less、图片转成 Webpack 可处理的模块；Plugin 面向构建流程扩展，可以在编译生命周期中做资源注入、优化、分析和发布。

**关键词**：Loader、Plugin、模块转换、生命周期

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q2：Webpack 构建慢怎么优化？

先用 speed-measure-webpack-plugin 或构建日志定位耗时。常见手段包括缩小 loader include 范围、开启 filesystem cache、使用 thread-loader/esbuild/swc、减少不必要 plugin、优化 resolve、拆分 DLL 或利用 monorepo 缓存。

**关键词**：构建缓存、include、esbuild、swc、resolve

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q3：Tree Shaking 生效条件？

Tree Shaking 依赖 ES Module 的静态结构，生产模式下结合 sideEffects 标记和压缩器删除未使用代码。要避免 CommonJS、动态导出和有副作用的顶层代码影响效果。

**关键词**：ESM、sideEffects、Terser、静态分析

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q4：Webpack 的核心构建流程？

Webpack 从 entry 出发，解析模块依赖，调用 loader 转换模块内容，构建依赖图，然后根据 chunk 规则分组，最后通过 plugin 扩展流程并输出 assets。可以按初始化、编译、构建模块、生成 chunk、输出资源回答。

**关键词**：entry、依赖图、chunk、assets

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q5：SourceMap 怎么选？

开发环境优先 eval-cheap-module-source-map，构建快且定位源码方便；生产环境可用 source-map 或 hidden-source-map 便于错误定位，但要控制是否公开源码。不同团队需要在构建速度、定位精度和安全之间取舍。

**关键词**：SourceMap、devtool、hidden-source-map

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q6：Code Splitting 怎么做？

Code Splitting 可以通过入口拆分、动态 import 和 splitChunks 做。业务路由适合动态 import 懒加载，公共依赖适合 splitChunks 抽离。目标是减少首屏 JS 体积并提升缓存复用。

**关键词**：import()、splitChunks、路由懒加载、缓存

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q7：hash、chunkhash、contenthash 区别？

hash 和整个构建相关，任意文件变化都可能改变；chunkhash 和 chunk 内容相关；contenthash 和具体文件内容相关。生产环境静态资源通常使用 contenthash，以最大化浏览器缓存命中。

**关键词**：hash、chunkhash、contenthash、缓存

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q8：Babel 在 Webpack 中的作用？

Babel 主要负责语法转换和按需注入 polyfill。Webpack 负责模块打包，babel-loader 把模块交给 Babel 转换。工程上要结合 browserslist、preset-env、core-js 和缓存配置控制兼容性与构建速度。

**关键词**：Babel、preset-env、core-js、browserslist

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q9：Webpack 5 Module Federation 是什么？

Module Federation 允许多个独立构建的应用在运行时共享模块，常用于微前端。它可以让 host 动态加载 remote 暴露的组件或模块，同时共享 React 等依赖，但要处理版本、隔离和部署协同。

**关键词**：Module Federation、微前端、host、remote

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q10：如何分析打包体积？

可以使用 webpack-bundle-analyzer、stats.json 或构建平台分析各 chunk、依赖和重复包。优化方向包括按需引入、Tree Shaking、拆包、替换重依赖、压缩和删除无用 polyfill。

**关键词**：bundle analyzer、stats、按需引入

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q11：externals 适合什么场景？

externals 用于把某些依赖排除在打包之外，运行时从 CDN 或外部环境获取。它能减少包体积，但会增加外部资源稳定性、版本一致性和加载顺序管理成本。

**关键词**：externals、CDN、包体积、版本

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q12：如何设计多环境构建配置？

通常拆成 common、dev、prod 配置。开发环境关注热更新、SourceMap 和构建速度；生产环境关注压缩、缓存、拆包、资源路径和安全。环境变量要通过统一配置注入，避免散落在业务代码中。

**关键词**：多环境、dev、prod、环境变量

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

## 复习建议

- 第一轮：只看问题，口述 30～60 秒答案。
- 第二轮：对照关键词补齐遗漏点。
- 第三轮：为每个主题补充一个自己的项目案例。
