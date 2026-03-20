# JavaScript Weekly #776 重点摘要

> 日期: 2026-03-10
> 链接: https://javascriptweekly.com/issues/776

## 重大发布

### Solid 2.0.0 Beta
- 一等公民 async 支持：computations 可返回 Promise 或 async iterables
- 响应式图自动挂起/恢复
- `<Suspense>` 退役 → `<Loading>` 用于初始渲染
- 新增 `action()` 原语（乐观更新支持）
- 破坏性变更较大，有迁移指南

### TypeScript 6.0 RC
- 为 Go 驱动的 TS 7.0（今年晚些发布）做过渡
- 主要是 `tsconfig.json` 配置变更
- RC 与 beta 相比仅有少量小改动

### Astro 6.0
- `astro dev` 使用 Vite 新 Environment API → dev 环境运行真实 prod runtime
- 新增 Fonts API 自动处理自定义字体

### Node.js 25.8.0
- 新增 `--permission-audit` 选项
- 权限模型可在 warning-only 模式下运行

### 其他发布
- React Native 0.85 RC.0
- ESLint v10.0.3
- Knockout 3.5.2（6 年首更）
- Ember 6.11, Ionic 8.8, pnpm 10.32, Jest 30.3

## TC39 动态

第 113 次会议进行中：
- **Temporal API → Stage 4** 提上议程 🎉
- 如通过，意味着 Temporal 正式成为 ECMAScript 标准的一部分

## 值得关注的工具

### ArkType 2.2
- TypeScript 类型即运行时校验器
- v2.2 新增 `type.fn`：运行时校验函数输入输出

### Minification Benchmarks
- SWC 综合领先
- Minify 和 Oxc minifier 速度更快但压缩率略低

## 精选文章

### Patreon: 7 年 TS 迁移实战
- 100 万行 JS → TypeScript
- 11000 个文件迁移
- 工具和技术复盘

### Wikipedia JS 蠕虫事件
- Wikimedia 员工意外触发休眠脚本
- 利用共享全局脚本漏洞
- 破坏了约 4000 页 Meta-Wiki 页面
- 供应链安全警示
