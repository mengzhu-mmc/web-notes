# CI/CD 持续集成与部署

> 前端面试工程化方向高频考点

---

## 一、核心概念

### CI — 持续集成（Continuous Integration）

**每次代码提交，自动跑一遍"质量检查流水线"。**

```
开发者 push 代码
    ↓
触发 CI 流程：
  1. 安装依赖（npm install）
  2. 代码检查（ESLint / TypeScript 类型检查）
  3. 单元测试（Jest / Vitest）
  4. 构建（npm run build）
  5. ✅ 全通过 → 允许合并
     ❌ 有失败 → 阻止合并，通知开发者
```

**目的**：早发现问题，防止"坏代码"进主干。

---

### CD — 持续交付 / 持续部署（Continuous Delivery / Deployment）

```
CI 通过后
    ↓
持续交付（Delivery）：自动打包好，等人工点"发布"按钮
持续部署（Deployment）：完全自动，直接推到生产环境
```

| | 持续交付 | 持续部署 |
|--|---------|---------|
| 最后一步 | **手动触发** | **全自动** |
| 适用场景 | 需要审批、灰度发布 | 快速迭代、自动化程度高 |

---

## 二、前端典型 CI/CD 流程

```
feature 分支 push
    ↓
GitHub Actions / Jenkins / GitLab CI
    ↓
lint + type check + test + build
    ↓
构建产物（dist/）
    ↓
部署到 CDN / OSS / Nginx
    ↓
冒烟测试 / E2E 测试（可选）
    ↓
✅ 上线完成，自动通知
```

---

## 三、常见工具对比

| 工具 | 特点 | 适用场景 |
|------|------|---------|
| GitHub Actions | 配置简单，免费额度大，生态丰富 | 开源项目、个人项目首选 |
| GitLab CI | 内置于 GitLab，私有化部署常用 | 企业内网 GitLab |
| Jenkins | 老牌，功能强大，插件多，配置繁琐 | 大型企业、复杂流水线 |
| Vercel / Netlify | 前端一站式，push 自动部署，零配置 | 静态站点、Next.js 项目 |
| CircleCI | 配置灵活，速度快 | 中小型团队 |

---

## 四、GitHub Actions 示例

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit test
        run: npm run test -- --coverage

      - name: Build
        run: npm run build

  deploy:
    needs: ci          # 依赖 ci job 通过
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # 只在 main 分支部署
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to CDN
        run: |
          # 上传 dist/ 到 OSS / CDN
          npm run deploy
```

**关键概念：**
- `on`：触发条件（push / PR / 定时等）
- `jobs`：并行执行的任务单元
- `steps`：job 内的顺序步骤
- `needs`：依赖关系，控制执行顺序
- `if`：条件判断，按分支/环境区分执行

---

## 五、前端 CI 常见检查项

```
代码质量
  ├── ESLint（JS/TS 规范）
  ├── Prettier（代码格式）
  └── TypeScript tsc --noEmit（类型检查）

测试
  ├── 单元测试（Jest / Vitest）
  ├── 组件测试（Testing Library）
  └── E2E 测试（Playwright / Cypress，可选）

构建
  ├── npm run build（产物是否正常生成）
  ├── 包体积检查（bundlesize / size-limit）
  └── Lighthouse CI（性能分数检测，可选）
```

---

## 六、面试常问

**Q: CI 和 CD 的区别是什么？**
> CI 是持续集成，每次提交自动跑检查（lint/test/build），保证代码质量。
> CD 分两种：持续交付（Delivery）最后一步手动发布；持续部署（Deployment）全程自动推到生产。

**Q: 为什么要用 CI/CD？**
> 1. **早发现问题**：bug 在合并前就被拦截，修复成本低
> 2. **减少人工操作**：自动化替代手动部署，降低出错风险
> 3. **加快发布频率**：流程标准化，一天可以发布多次
> 4. **团队协作更安全**：PR 不通过 CI 不能合并

**Q: npm install 和 npm ci 的区别？**
> `npm ci` 严格按照 `package-lock.json` 安装，不修改 lock 文件，速度更快，适合 CI 环境。
> `npm install` 可能更新 lock 文件，适合本地开发。

**Q: 如何只在特定分支触发部署？**
> 在 GitHub Actions 中用 `if: github.ref == 'refs/heads/main'` 控制，或在 `on.push.branches` 里指定分支。

---

## 七、相关链接

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [前端工程化全景](./前端工程化全景.md)
