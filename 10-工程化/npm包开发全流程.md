# NPM 包从 0 到 1 开发全流程

## 一、项目初始化

### 创建项目与 package.json

```bash
mkdir my-npm-package && cd my-npm-package
npm init -y
git init
```

`package.json` 关键字段配置：`main`（CJS 入口）、`module`（ESM 入口）、`types`（类型声明）、`files`（发布文件白名单）。

### TypeScript 配置

```bash
npm install typescript --save-dev
npx tsc --init
```

`tsconfig.json` 核心配置：`target: "ES2018"`、`module: "ESNext"`、`declaration: true`、`strict: true`，`include` 指向 `src/**/*`，`exclude` 排除 `node_modules`、`dist` 和测试文件。

### 项目结构

```
my-npm-package/
├── src/           # 源码
├── dist/          # 打包输出（gitignore）
├── tests/         # 测试文件
├── .husky/        # Git hooks
├── .eslintrc.js   # ESLint 配置
├── .prettierrc    # Prettier 配置
├── rollup.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## 二、ESLint + Prettier 配置

### 安装依赖

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-import prettier eslint-config-prettier eslint-plugin-prettier
```

### ESLint 配置要点

使用 `@typescript-eslint/parser` 解析 TypeScript，继承 `eslint:recommended`、`plugin:@typescript-eslint/recommended`、`plugin:import/recommended`，最后放 `prettier` 覆盖格式化规则。关键规则包括 `@typescript-eslint/no-unused-vars`（忽略 `_` 前缀参数）、`import/order`（按 builtin → external → internal → parent → sibling → index 排序并要求换行）。

### Prettier 配置

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "arrowParens": "avoid"
}
```

## 三、Pre-commit 校验（Husky + lint-staged + CommitLint）

### 安装与初始化

```bash
npm install --save-dev husky lint-staged commitlint @commitlint/cli @commitlint/config-conventional
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg "npx --no -- commitlint --edit $1"
```

### lint-staged 配置

在 `package.json` 中配置，对 `src/**/*.{ts,tsx}` 执行 `eslint --fix` 和 `prettier --write`，对 `src/**/*.{json,md}` 执行 `prettier --write`。

### CommitLint 配置

继承 `@commitlint/config-conventional`，规范 type 枚举：`feat`（新功能）、`fix`（修复）、`docs`（文档）、`style`（格式）、`refactor`（重构）、`perf`（性能）、`test`（测试）、`chore`（构建/工具）、`revert`（回退）、`build`（打包）、`ci`（CI/CD）。

## 四、打包配置（Rollup）

### 安装依赖

```bash
npm install --save-dev rollup @rollup/plugin-typescript @rollup/plugin-node-resolve \
  @rollup/plugin-commonjs @rollup/plugin-json @rollup/plugin-terser rollup-plugin-dts rollup-plugin-delete
```

### 多格式输出

| 文件 | 格式 | 用途 |
|------|------|------|
| `dist/index.cjs.js` | CommonJS | Node.js `require()` |
| `dist/index.esm.js` | ESModule | Webpack/Vite Tree-shaking |
| `dist/index.umd.js` | UMD | 浏览器 `<script>` 标签 |
| `dist/index.d.ts` | TypeScript | 类型提示 |

Rollup 配置要点：通过 `pkg.dependencies` 和 `pkg.peerDependencies` 设置 `external`（不打包进产物），使用 `@rollup/plugin-terser` 压缩，`rollup-plugin-dts` 生成类型声明，`rollup-plugin-delete` 构建前清空 `dist`。

## 五、测试配置（Jest）

```bash
npm install --save-dev jest @types/jest ts-jest
```

使用 `ts-jest` preset，设置覆盖率阈值（branches/functions/lines/statements 均 80%）。

## 六、发布流程

```bash
npm login                # 登录
npm pack --dry-run       # 预览发布文件
npm run build            # 构建
npm publish              # 发布
npm publish --tag beta   # 发布 beta 版本
```

### 版本管理

`npm version patch`（补丁 1.0.0 → 1.0.1，bug fix）、`npm version minor`（次版本 1.0.0 → 1.1.0，新功能向后兼容）、`npm version major`（主版本 1.0.0 → 2.0.0，破坏性更新）。

## 七、完整流程总结

项目初始化 → 配置 TypeScript → 配置 ESLint + Prettier → 配置 Husky + lint-staged + commitlint → 编写源码 → 编写测试 → 配置 Rollup 打包（CJS/ESM/UMD/DTS） → `npm run build` 验证产物 → `npm pack --dry-run` 预览 → `npm publish` 发布上线。

这套工程化体系保证了代码质量（ESLint）、风格统一（Prettier）、提交规范（CommitLint + Husky）、类型安全（TypeScript）、多格式产物（CJS/ESM/UMD/DTS）和语义化版本管理。
