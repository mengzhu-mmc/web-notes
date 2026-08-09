# 07-七、CI-CD-与-Monorepo

## 七、CI/CD 与 Monorepo

### Q: CI/CD 在前端项目中如何应用？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

CI/CD = **持续集成**（Continuous Integration）+ **持续交付/部署**（Continuous Delivery/Deployment）。

**前端 CI/CD 典型流水线：**

```yaml
# .github/workflows/ci.yml（GitHub Actions 示例）
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ① 代码质量检查（快速失败，几十秒内出结果）
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with: { version: 8 }

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm" # 缓存 pnpm store，加速安装

      - name: Install dependencies
        run: pnpm install --frozen-lockfile # CI 用 frozen，防止意外升级

      - name: Lint
        run: pnpm lint # ESLint + StyleLint

      - name: Type check
        run: pnpm tsc --noEmit # TypeScript 类型检查

  # ② 测试（单元测试 + 集成测试）
  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck # 依赖上一个 job 成功
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile

      - name: Unit tests
        run: pnpm test --coverage # Vitest / Jest

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ③ 构建（生产 build，验证构建无误）
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          VITE_API_URL: ${{ secrets.PROD_API_URL }} # 注入环境变量

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  # ④ 部署（只在 main 分支触发）
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' # 只在 main 分支部署
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist }

      - name: Deploy to CDN
        run: |
          aws s3 sync ./dist s3://my-bucket --delete
          aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET }}
```

**前端 CI 最佳实践：**

```bash
# package.json scripts 设计
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",   # 构建前类型检查
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx --fix",
    "lint:ci": "eslint src --ext .ts,.tsx",  # CI 里不 --fix（只检查）
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit"
  }
}
```

**自动化测试层次：**

```
单元测试（Unit Tests）：测试单个函数/组件
  工具：Vitest + @testing-library/react
  覆盖率目标：>80%（核心业务逻辑 >90%）

集成测试（Integration Tests）：测试多个模块协作
  工具：Vitest + MSW（Mock Service Worker）

E2E 测试（端到端测试）：模拟真实用户操作
  工具：Playwright / Cypress
  场景：关键业务流程（登录、支付、核心表单）

性能测试：
  工具：Lighthouse CI（接入 CI 阻断性能劣化）
```

**🔍 深层原理**

**为什么 CI/CD 对前端至关重要：**

前端代码直接面向用户，错误代码立即影响用户体验。CI/CD 构建的"保护网"可以在代码合并前发现：

- 类型错误（TypeScript）
- 代码规范问题（ESLint）
- 逻辑错误（单元测试）
- 页面功能异常（E2E 测试）
- 性能退化（Lighthouse Score 下降）

**💡 踩坑点**

```yaml
# 坑1：CI 环境缓存没配，每次都重新安装依赖（几分钟 → 几十秒）
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'  # ✅ 缓存 pnpm store

# 坑2：lockfile 没提交到 git，CI 每次安装版本可能不同
# ✅ 提交 pnpm-lock.yaml，CI 用 --frozen-lockfile

# 坑3：并行 job 没有正确设置依赖关系，build 在 test 前就触发了
needs: [lint-and-typecheck, test]  # ✅ 明确依赖

# 坑4：环境变量泄露到构建产物
# Vite 只有 VITE_ 前缀的变量才会暴露给客户端代码
# 但 CI 里配置的其他 secrets 可能在构建命令的 shell 环境里，
# 确保不要把 secrets echo 到构建产物里
```

**🎯 面试追问**

- **Q: 如何防止 CI 中依赖安装版本不一致？**
  - A: 1. 提交 lockfile（`pnpm-lock.yaml`/`package-lock.json`/`yarn.lock`）到 git；2. CI 安装时用 `pnpm install --frozen-lockfile`（lockfile 不匹配就失败，而不是自动更新）；3. 使用 `engines` 字段锁定 Node/pnpm 版本，CI 用 `.nvmrc` 或 `volta` 保证一致性。
- **Q: Lighthouse CI 如何接入 CI 流程？**
  - A: 用 `@lhci/cli` 包：`lhci autorun` 启动 Chrome 跑 Lighthouse，生成报告；配置 `lighthouserc.js` 设置断言条件（如 `performance >= 80`），不达标时 CI 失败。可以把报告上传到 LHCI 服务器做历史对比。
- **Q: 前端 CD 有哪些部署策略？**
  - A: **蓝绿部署**：同时维护两套环境，切换流量；**灰度/金丝雀发布**：先发布给少量用户（5%），观察无问题后扩大；**特性开关（Feature Flag）**：代码全量发布但功能用开关控制，随时可以关掉问题特性。前端静态资源通常通过 CDN + contenthash 实现零停机部署。

**⚠️ 常见误区**

- ❌ CD 就是自动部署到生产 → CD 有两种：Continuous Delivery（自动到预发布，人工审批再上生产）和 Continuous Deployment（全自动上生产）
- ❌ CI 跑单元测试就够了 → 单元测试覆盖不到用户真实操作路径，关键流程需要 E2E 测试
- ❌ 只有后端项目才需要 CI/CD → 前端直接影响用户，且构建和发布过程也很复杂，CI/CD 对前端同样重要

---

### Q: Monorepo 有哪些主流方案？如何选型？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

Monorepo 将多个相关项目放在同一个 git 仓库中管理，解决多包管理的代码复用、版本同步、统一 CI/CD 等问题。

**Monorepo vs Polyrepo：**

```
Polyrepo（多仓库）：每个包独立 git 仓库
  ✅ 隔离性好，各自独立 CI/CD
  ❌ 跨包改动需要多个 PR，版本同步困难
  ❌ 公共配置（ESLint、TypeScript）需要每个仓库维护一份

Monorepo（单仓库多包）：
  ✅ 跨包改动一个 PR，原子提交
  ✅ 共享配置（root 级别的 tsconfig、eslint）
  ✅ 统一 CI/CD 流水线
  ❌ 仓库体积大，clone/CI 慢（需要增量构建解决）
  ❌ 权限控制粒度不够（git 仓库级别）
```

**主流方案对比：**

**① pnpm workspace（基础层）**

```yaml
# pnpm-workspace.yaml（仓库根目录）
packages:
  - "packages/*" # packages/ 下所有目录
  - "apps/*" # apps/ 下所有目录
  - "!**/__tests__" # 排除测试目录
```

```json
// packages/ui/package.json
{
  "name": "@myorg/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}

// apps/web/package.json
{
  "name": "@myorg/web",
  "dependencies": {
    "@myorg/ui": "workspace:*"  // workspace 协议：引用本地包
  }
}
```

```bash
# 常用命令
pnpm install                          # 安装所有 workspace 的依赖
pnpm --filter @myorg/ui build         # 只构建 ui 包
pnpm --filter @myorg/web... build     # 构建 web 及其所有依赖
pnpm -r run build                     # 递归运行所有包的 build 命令
```

**② Turborepo（构建加速层，Vercel 出品）**

```json
// turbo.json（仓库根目录）
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"], // ^表示先等依赖包的 build 完成
      "outputs": ["dist/**"], // 缓存的产物（构建结果）
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [], // lint 无产物，但结果可缓存
      "cache": true
    },
    "dev": {
      "cache": false, // dev 命令不缓存
      "persistent": true // 持久运行（watch 模式）
    }
  }
}
```

```bash
# Turborepo 自动并行化、缓存构建结果
turbo run build           # 智能并行构建所有包（依赖拓扑排序）
turbo run build --filter=@myorg/web  # 只构建 web 及其依赖链
turbo run build --dry     # 预览将要执行的任务，不实际运行

# 远程缓存（team 级别共享缓存，CI 命中本地开发者的构建结果）
turbo login
turbo link  # 关联 Vercel 远程缓存
```

**Turborepo 增量构建原理：**

```
Turborepo 的缓存键 = hash(源码 + 依赖 hash + 环境变量 + 命令)

如果缓存命中：
  直接恢复 outputs 目录（不执行任何命令）
  终端输出 "cache hit, replaying output"

如果缓存未命中：
  执行命令 → 缓存结果到 .turbo/cache/ 目录
  （配置远程缓存后同步到 Vercel/S3）

效果：
  首次构建：并行执行，比串行快 2-4 倍
  二次构建（无变化）：几乎 0 秒（全缓存命中）
  有变化时：只重建变化的包及其依赖方（增量）
```

**③ Nx（大型企业级 Monorepo，Nrwl 出品）**

```bash
# Nx 特点：
# - 内置代码生成器（generator）：nx generate @nx/react:app my-app
# - 依赖图可视化：nx graph
# - 受影响分析：只测试/构建被改动影响的包
# - 分布式构建（Nx Cloud）

nx run-many --target=build --all         # 构建所有项目
nx affected --target=test                # 只测试受当前改动影响的项目
nx graph                                 # 可视化依赖关系图
```

**方案选型建议：**

```
小型 Monorepo（2-5 个包）：
  ✅ pnpm workspace 足够，无需额外工具

中型 Monorepo（5-20 个包）：
  ✅ pnpm workspace + Turborepo（加速构建，配置简单）

大型 Monorepo（20+ 包，大型团队）：
  ✅ pnpm workspace + Turborepo（轻量、主流）
  或 Nx（重量级功能，代码生成、依赖图分析、Nx Cloud）

已有 Lerna 的项目：
  Lerna 现在由 Nx 团队维护，可直接迁移到 Nx，或替换为 Turborepo
```

**🔍 深层原理**

**Turborepo 的任务图（Task Graph）调度：**

```
packages:
  ui       → (无依赖)
  utils    → (无依赖)
  web      → 依赖 ui, utils
  mobile   → 依赖 ui, utils

"build": { "dependsOn": ["^build"] }
→ 构建 web 前，必须先完成 ui.build 和 utils.build

Turborepo 构建的 DAG（有向无环图）：
  ui.build     utils.build
     ↓              ↓
  web.build    mobile.build  ← 并行（互不依赖）

执行顺序：
  1. ui.build 和 utils.build 并行执行（没有 ^ 依赖）
  2. 两者完成后，web.build 和 mobile.build 并行执行
  总时间 ≈ max(ui, utils) + max(web, mobile)
  而非串行的 ui + utils + web + mobile
```

**💡 踩坑点**

```bash
# 坑1：turbo.json 没有配 outputs，缓存不生效
"build": {
  "outputs": ["dist/**", ".next/**"]  # ✅ 必须指定产物目录
}

# 坑2：环境变量没加入缓存 key，导致不同环境复用了错误的缓存
"build": {
  "env": ["NODE_ENV", "API_URL"],  # ✅ 声明影响构建结果的环境变量
  "outputs": ["dist/**"]
}

# 坑3：workspace 包互相引用，TypeScript 找不到类型
# tsconfig.json（根目录）
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@myorg/*": ["packages/*/src"]  # ✅ 配置路径映射
    }
  }
}
# 同时在各包的 tsconfig.json 里 extends 根配置
```

**🎯 面试追问**

- **Q: Turborepo 的远程缓存是如何保证安全的？**
  - A: Turborepo 的缓存 key 基于源码内容 hash + 依赖 hash + 环境变量 hash，不同代码的缓存 key 不同，不会产生冲突。远程缓存传输通过 HTTPS 加密。Vercel 的远程缓存与团队账号绑定，只有同一 team 的成员可以读写缓存。
- **Q: pnpm workspace 的 `workspace:*` 和 `workspace:^1.0.0` 有什么区别？**
  - A: `workspace:*` 在发包时会被替换为当前实际版本（不带 range）；`workspace:^1.0.0` 会被替换为 `^1.0.0`（带 range）。`workspace:*` 确保始终用最新的本地版本（适合 Monorepo 内部包），推荐使用。
- **Q: Lerna 和 Turborepo 有什么区别？**
  - A: Lerna（旧版）主要解决**版本管理和发包**问题（`lerna version`、`lerna publish`），构建加速能力有限；Turborepo 专注于**构建任务编排和缓存**，不管发包。现代 Monorepo 通常用 pnpm workspace + Turborepo（构建）+ changesets（发包版本管理）的组合，替代 Lerna。

**⚠️ 常见误区**

- ❌ Monorepo 就是把所有项目放在一个文件夹 → Monorepo 有完整的工具链支撑（workspace 包管理 + 任务编排 + 增量构建），不是简单合并目录
- ❌ Turborepo 的缓存和 webpack 的 cache 是同一层缓存 → Turborepo 缓存的是**任务执行结果**（dist 目录），webpack cache 缓存的是**模块编译结果**，是两个不同层次的缓存，可以叠加使用
- ❌ Monorepo 适合所有项目 → 团队小、项目耦合度低时，Polyrepo 更简单；Monorepo 的收益随包数量和团队规模增大而增大

---

> 📝 **学习建议**：工程化题目考察的是**深度理解**而非死记硬背。建议动手搭一个 Webpack/Vite 项目，亲自踩过这些坑，面试时才能说得有血有肉。
