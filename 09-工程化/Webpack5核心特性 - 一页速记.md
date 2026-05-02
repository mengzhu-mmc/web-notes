# Webpack5核心特性 - 一页速记

> 来源：[[Webpack5核心特性]]。本页用于高频复习，保留主干脉络；完整内容仍在原文中全文检索。

## 复习定位

- **用途**：面试前快速过一遍关键词、考点边界与易错点。
- **阅读时长**：建议 5～10 分钟。
- **复习方式**：先看本页，再跳转到“标准答案索引”和原文补细节。

## 高频考点地图

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

## 速记模板

1. **先给结论**：一句话回答概念、作用或取舍。
2. **补核心机制**：说明关键流程、生命周期、缓存/调度/编译/渲染等机制。
3. **讲工程实践**：结合项目说优化手段、排查路径、边界条件。
4. **收风险点**：说明兼容性、性能、可维护性或安全风险。

## 待补充

- [ ] 将原文中的高频题压缩为 10～20 条闪卡。
- [ ] 补充 3 个真实项目表达模板。
- [ ] 标记必须背诵、理解即可、可选深挖三类内容。
