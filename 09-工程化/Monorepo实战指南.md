# Monorepo 实践：pnpm workspace + Turborepo

> 更新时间：2026-03 | 工具版本：pnpm 9.x / Turborepo 2.x

---

## 一、什么是 Monorepo？

```
Monorepo（单仓库）：多个项目/包放在同一个 Git 仓库中管理。

对比 Polyrepo（多仓库）：
  Polyrepo: projectA/ (repo1)  projectB/ (repo2)  shared/ (repo3)
  Monorepo: my-monorepo/
               ├── apps/
               │   ├── web/       ← 前端应用
               │   └── admin/     ← 后台应用
               └── packages/
                   ├── ui/        ← 共享组件库
                   ├── utils/     ← 共享工具函数
                   └── types/     ← 共享类型定义
```

### 优势 vs 劣势

| 维度 | Monorepo 优势 | Monorepo 劣势 |
|------|-------------|-------------|
| 代码共享 | 直接 import，无需发包 | 仓库体积大，clone 慢 |
| 原子提交 | 跨包改动一次 commit | 权限控制复杂 |
| 依赖管理 | 统一版本，避免不一致 | 初始配置复杂 |
| 构建缓存 | Turborepo 智能缓存 | 需要专门工具支持 |
| CI/CD | 统一流水线 | 需要按变更范围拆分 |

---

## 二、pnpm workspace 搭建

### 2.1 目录结构

```
my-monorepo/
├── pnpm-workspace.yaml      ← 关键配置
├── package.json             ← 根 package.json
├── turbo.json               ← Turborepo 配置
├── tsconfig.base.json       ← 公共 TS 配置
├── .npmrc                   ← pnpm 配置
├── apps/
│   ├── web/                 ← Vite + React 应用
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── admin/
│       └── package.json
└── packages/
    ├── ui/                  ← 共享 UI 组件
    │   └── package.json
    ├── utils/               ← 工具函数
    │   └── package.json
    └── tsconfig/            ← 共享 tsconfig
        └── package.json
```

### 2.2 pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml（根目录）
packages:
  - 'apps/*'
  - 'packages/*'
  # 如有更深层嵌套：
  # - 'packages/**'
```

### 2.3 根 package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 2.4 .npmrc 配置

```ini
# .npmrc
# 提升所有包到根 node_modules（解决部分工具找不到依赖的问题）
# shamefully-hoist=true  ← 不推荐，会丢失 pnpm 的隔离优势

# 推荐：按需提升
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=*typescript*
```

---

## 三、包之间的相互依赖

### 3.1 packages/ui/package.json

```json
{
  "name": "@my/ui",
  "version": "0.1.0",
  "private": false,
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "require": "./dist/index.cjs"
    },
    "./button": "./src/components/Button.tsx"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch"
  },
  "devDependencies": {
    "react": "^18.3.0",
    "tsup": "^8.0.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0"
  }
}
```

### 3.2 apps/web 引用 @my/ui

```bash
# 在 apps/web 目录安装内部包
pnpm add @my/ui --filter web

# 或者从根目录指定
pnpm add @my/ui --filter web
```

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@my/ui": "workspace:*"   // ← workspace 协议，始终用最新本地版本
  }
}
```

```typescript
// apps/web/src/App.tsx
import { Button } from '@my/ui';  // 直接引用本地包，TypeScript 类型完整
```

### 3.3 workspace 协议说明

```
"workspace:*"   ← 始终使用工作区最新版本（开发推荐）
"workspace:^"   ← semver 兼容版本
"workspace:~"   ← 补丁版本
"1.0.0"        ← 固定版本（发布到 npm 前用 changeset 替换）
```

---

## 四、Turborepo 配置与缓存

### 4.1 turbo.json（Turborepo 2.x 语法）

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "package.json", "tsconfig.json"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "cache": true
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "test/**"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "inputs": ["src/**", ".eslintrc*"],
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json"],
      "outputs": [],
      "cache": true
    }
  },
  "globalEnv": ["NODE_ENV", "CI"]
}
```

**关键字段说明：**
- `dependsOn: ["^build"]`：先构建依赖包再构建自己（`^` 表示上游依赖）
- `dependsOn: ["build"]`：同一包的 build 任务先完成
- `cache: true`：输入文件 hash 不变则跳过执行，直接用缓存
- `persistent: true`：长期运行的任务（如 dev server）

### 4.2 Turborepo 缓存原理

```
首次构建：
  Input hash = hash(源文件 + 环境变量 + 依赖版本)
  执行任务 → 产生输出 → 缓存 (hash → output)

二次构建（输入未变）：
  Input hash 相同 → 直接还原缓存输出 → 跳过执行
  
Remote Cache（团队共享缓存）：
  本地缓存 miss → 查远程缓存（Vercel / 自建）
  → 命中则下载输出，跳过本地构建
```

### 4.3 常用命令

```bash
# 构建所有包（并行，自动处理依赖顺序）
pnpm turbo build

# 只构建特定包及其依赖
pnpm turbo build --filter=web

# 只构建特定包（不含上游依赖）
pnpm turbo build --filter=web^...  # 不包含依赖
pnpm turbo build --filter=...web   # 包含依赖

# 强制跳过缓存重新构建
pnpm turbo build --force

# 查看任务依赖图
pnpm turbo build --graph

# 并行开发（所有 packages/apps 同时 dev）
pnpm turbo dev
```

---

## 五、TypeScript 配置共享

### 5.1 packages/tsconfig/package.json

```json
{
  "name": "@my/tsconfig",
  "private": true,
  "files": ["base.json", "react.json", "nextjs.json"]
}
```

### 5.2 packages/tsconfig/base.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  }
}
```

### 5.3 apps/web/tsconfig.json（继承公共配置）

```json
{
  "extends": "@my/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 六、版本管理：Changesets

```bash
# 安装
pnpm add -D @changesets/cli -w  # -w 安装到根 workspace

# 初始化
pnpm changeset init

# 开发完成后，记录变更（交互式）
pnpm changeset
# → 选择受影响的包
# → 选择版本类型（patch/minor/major）
# → 写变更说明

# CI 自动升版本并发布
pnpm changeset version   # 更新 package.json 版本
pnpm changeset publish   # 发布到 npm
```

---

## 七、常见问题与最佳实践

### Q1：pnpm monorepo 中如何只安装某个包的依赖？

```bash
pnpm install --filter web       # 只安装 web 应用的依赖
pnpm add lodash --filter @my/utils  # 给 @my/utils 添加依赖
pnpm add -D vitest --filter web     # 给 web 添加开发依赖
pnpm add react --filter web --filter admin  # 给多个包添加
```

### Q2：为什么 Turborepo 没有利用缓存？

常见原因：
1. `inputs` 没有覆盖所有影响构建的文件
2. 环境变量没有加到 `globalEnv`
3. 输出目录没有在 `outputs` 中声明（导致缓存还原失败）

```json
// 检查 turbo.json 配置是否完整
{
  "tasks": {
    "build": {
      "inputs": ["src/**", "package.json", "tsconfig.json", "vite.config.ts"],
      "outputs": ["dist/**"],
      "env": ["VITE_API_URL"]  // 包级环境变量
    }
  }
}
```

### Q3：如何处理 monorepo 中的 ESLint 配置共享？

```bash
# packages/eslint-config/package.json
# { "name": "@my/eslint-config" }

# apps/web/.eslintrc.js
module.exports = {
  extends: ['@my/eslint-config'],
};
```

### Q4：开发时如何让 TypeScript 识别工作区包？

```json
// 使用 "exports" + "moduleResolution": "bundler"
// packages/ui/package.json
{
  "exports": {
    ".": {
      "import": "./src/index.ts"  // 开发时直接指向 TS 源文件
    }
  }
}
```

---

## 面试快答

**Q：Monorepo 和 Polyrepo 怎么选？**
团队 >= 3人且有共享代码/组件的场景推荐 Monorepo；独立项目团队、权限需要严格隔离时选 Polyrepo。

**Q：pnpm workspace 的核心优势是什么？**
① 比 npm/yarn workspace 更严格的依赖隔离（无幽灵依赖）；② 软链接实现零拷贝，节省磁盘空间；③ 安装速度快（并行 + 全局内容寻址缓存）。

**Q：Turborepo 如何加速 CI/CD？**
通过 hash 缓存 + Remote Cache：输入文件不变则跳过构建。A 提交没改 UI 包 → UI 包构建命中缓存，直接复用结果。团队共用远程缓存，B 的 CI 直接用 A 构建好的产物。
