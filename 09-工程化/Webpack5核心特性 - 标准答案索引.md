# Webpack5核心特性 - 标准答案索引

> 来源：[[Webpack5核心特性]]。本页承接“一页速记”，用于沉淀可直接面试表达的标准答案。

## 使用方式

- 每个问题控制在 **结论 → 原理 → 实践 → 追问** 四段。
- 答案不要堆砌原文，优先改写成口语化面试表达。
- 原文较长时，只保留最能支撑回答的段落链接。

## 原文目录索引

- [[#Webpack 5 核心特性|Webpack 5 核心特性]]
  - [[#一、Module Federation（模块联邦）|一、Module Federation（模块联邦）]]
    - [[#1.1 核心概念|1.1 核心概念]]
    - [[#1.2 配置示例|1.2 配置示例]]
    - [[#1.3 Shared 共享策略|1.3 Shared 共享策略]]
    - [[#1.4 运行时原理|1.4 运行时原理]]
    - [[#1.5 面试要点|1.5 面试要点]]
  - [[#二、Tree Shaking 改进|二、Tree Shaking 改进]]
    - [[#2.1 Webpack 4 vs Webpack 5 Tree Shaking|2.1 Webpack 4 vs Webpack 5 Tree Shaking]]
    - [[#2.2 嵌套 Tree Shaking|2.2 嵌套 Tree Shaking]]
    - [[#2.3 CommonJS Tree Shaking|2.3 CommonJS Tree Shaking]]
    - [[#2.4 确保 Tree Shaking 生效的最佳实践|2.4 确保 Tree Shaking 生效的最佳实践]]
  - [[#三、持久化缓存（Filesystem Cache）|三、持久化缓存（Filesystem Cache）]]
    - [[#3.1 Webpack 4 vs Webpack 5 缓存|3.1 Webpack 4 vs Webpack 5 缓存]]
    - [[#3.2 配置|3.2 配置]]
    - [[#3.3 缓存失效机制|3.3 缓存失效机制]]
    - [[#3.4 CI 中使用|3.4 CI 中使用]]
- [[#GitHub Actions 缓存 Webpack 构建|GitHub Actions 缓存 Webpack 构建]]
  - [[#四、Asset Modules（资源模块）|四、Asset Modules（资源模块）]]
    - [[#4.1 替代旧 Loader|4.1 替代旧 Loader]]
    - [[#4.2 配置示例|4.2 配置示例]]
    - [[#4.3 迁移指南|4.3 迁移指南]]
  - [[#五、Top Level Await|五、Top Level Await]]
    - [[#5.1 什么是 Top Level Await？|5.1 什么是 Top Level Await？]]
    - [[#5.2 配置|5.2 配置]]
    - [[#5.3 注意事项|5.3 注意事项]]
  - [[#六、Webpack 5 vs Webpack 4 重要区别|六、Webpack 5 vs Webpack 4 重要区别]]
    - [[#6.1 完整对比|6.1 完整对比]]
    - [[#6.2 Node.js Polyfill 移除（重要迁移点）|6.2 Node.js Polyfill 移除（重要迁移点）]]
    - [[#6.3 确定性 ID|6.3 确定性 ID]]
  - [[#七、常用 Loader 和 Plugin 配置|七、常用 Loader 和 Plugin 配置]]
    - [[#7.1 核心 Loader|7.1 核心 Loader]]
    - [[#7.2 核心 Plugin|7.2 核心 Plugin]]
  - [[#八、性能优化配置|八、性能优化配置]]
    - [[#8.1 SplitChunks（代码分割）|8.1 SplitChunks（代码分割）]]
    - [[#8.2 DLL（动态链接库）|8.2 DLL（动态链接库）]]
- [[#先构建 DLL（只需在依赖变化时重建）|先构建 DLL（只需在依赖变化时重建）]]
- [[#再正常构建|再正常构建]]
    - [[#8.3 thread-loader（多线程编译）|8.3 thread-loader（多线程编译）]]
    - [[#8.4 综合优化清单|8.4 综合优化清单]]
  - [[#九、面试高频问题|九、面试高频问题]]
    - [[#Q1：Webpack 的构建流程？|Q1：Webpack 的构建流程？]]
    - [[#Q2：Loader 和 Plugin 的区别？|Q2：Loader 和 Plugin 的区别？]]
    - [[#Q3：Webpack 热更新（HMR）原理？|Q3：Webpack 热更新（HMR）原理？]]
    - [[#Q4：SplitChunks 怎么配？|Q4：SplitChunks 怎么配？]]
    - [[#Q5：如何优化 Webpack 构建速度？|Q5：如何优化 Webpack 构建速度？]]
    - [[#Q6：Module Federation 的应用场景？|Q6：Module Federation 的应用场景？]]
    - [[#Q7：Webpack 5 从 4 升级有哪些破坏性变更？|Q7：Webpack 5 从 4 升级有哪些破坏性变更？]]

## 标准答案待整理

### Q1：核心概念是什么？

- **结论**：待补充。
- **原理**：待补充。
- **实践**：待补充。
- **追问**：待补充。

### Q2：项目中如何落地？

- **结论**：待补充。
- **方案**：待补充。
- **指标**：待补充。
- **风险**：待补充。
