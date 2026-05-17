from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/mira/.session/109002763539/web-notes')
ENG = ROOT / '09-工程化'
INDEX = ENG / '00-🌟索引.md'

DOCS: dict[str, str] = {
    '工程化学习路线图.md': '''# 工程化学习路线图

> 这篇笔记不是单点知识，而是工程化目录的“学习地图”：先建立工程链路，再逐步深入构建、质量、测试、发布和协作。

## 一、工程化到底解决什么问题

前端工程化的核心不是“会配置 Webpack/Vite”，而是把一个前端项目从个人开发变成可持续交付的系统。它主要解决五类问题：

1. **开发效率**：脚手架、热更新、Mock、调试、Source Map、自动化生成代码。
2. **构建效率**：依赖预构建、增量编译、缓存、并行、产物拆分。
3. **代码质量**：TypeScript、ESLint、Prettier、测试、提交规范、Code Review。
4. **发布稳定性**：CI/CD、环境隔离、灰度、回滚、缓存策略、监控告警。
5. **团队协作**：Monorepo、包管理、版本策略、工程规范、研发流程。

判断一个工程化方案是否成熟，可以看它是否回答了三个问题：

- 新人能不能快速启动项目？
- 项目变大后构建和协作会不会明显变慢？
- 线上出问题时能不能快速定位、回滚和复盘？

## 二、推荐学习路径

### 阶段 1：入门地图

目标是理解“一个前端项目从本地到线上”的完整链路。

建议顺序：

1. [前端工程化全景](./前端工程化全景.md)
2. [工程化学习路线图](./工程化学习路线图.md)
3. [包管理与依赖治理](./包管理与依赖治理.md)
4. [npm 包从 0 到 1 开发全流程](./npm包开发全流程.md)

阶段检查点：

- 能解释 `package.json`、lockfile、scripts、依赖类型的作用。
- 能说清楚开发、构建、测试、发布各自属于工程链路的哪一环。
- 能独立初始化一个 TypeScript + Vite 项目。

### 阶段 2：构建工具

目标是理解“源码如何变成浏览器可运行的产物”。

建议顺序：

1. [Vite 原理与配置实战](./Vite原理与配置实战.md)
2. [Vite 深入理解](./Vite深入理解.md)
3. [Vite vs Webpack：2026 年构建工具选型指南](./Vite与Webpack对比分析-2026.md)
4. [Webpack 构建流程详解](./Webpack构建流程详解.md)
5. [Webpack 5 核心特性](./Webpack5核心特性.md)
6. [Webpack 性能优化实战](./Webpack性能优化实战.md)

阶段检查点：

- 能解释 Vite 为什么开发环境快、生产环境仍使用 Rollup 思路打包。
- 能解释 Webpack 的 loader、plugin、chunk、module graph、runtime。
- 能根据项目规模选择 Vite、Webpack、Rspack 或 Turbopack 等方案。

### 阶段 3：质量体系

目标是让项目从“能跑”变成“长期可维护”。

建议顺序：

1. [代码质量与规范化体系](./代码质量与规范化体系.md)
2. [前端测试体系与质量门禁](./前端测试体系与质量门禁.md)
3. [多人协作代码管理方案](./多人协作代码管理方案.md)
4. [Monorepo 实践：pnpm workspace + Turborepo](./Monorepo实战指南.md)

阶段检查点：

- 能设计一套 ESLint + Prettier + TypeScript + commitlint 的规范链路。
- 能区分单元测试、组件测试、集成测试、E2E 测试分别适合覆盖什么。
- 能给中大型项目设计目录边界和模块依赖规则。

### 阶段 4：发布与稳定性

目标是理解上线不是 `npm run build`，而是一套可回滚、可观测、可追踪的交付系统。

建议顺序：

1. [CI/CD 持续集成与部署](./CI-CD持续集成与部署.md)
2. [构建产物分析与发布策略](./构建产物分析与发布策略.md)
3. [package-lock.json 深入解析](./package-lock文件详解.md)
4. 课程笔记中的部署与 CD 章节

阶段检查点：

- 能解释静态资源 hash、CDN 缓存、HTML 非强缓存之间的关系。
- 能设计灰度发布、回滚、环境变量管理、Source Map 管理方案。
- 能用 bundle analyzer 或构建日志定位体积和构建耗时问题。

## 三、工程化知识结构图

```text
前端工程化
├─ 项目初始化：脚手架、模板、目录结构、环境变量
├─ 包管理：npm / pnpm / yarn、lockfile、workspace、依赖治理
├─ 开发体验：Dev Server、HMR、Mock、Source Map、调试效率
├─ 构建工具：Vite、Webpack、Rollup、Babel、SWC、esbuild
├─ 质量体系：TypeScript、ESLint、Prettier、Git Hooks、Code Review
├─ 测试体系：Unit、Component、Integration、E2E、Visual、Performance
├─ 发布体系：CI/CD、缓存、灰度、回滚、版本、制品管理
└─ 协作体系：Monorepo、模块边界、包版本、权限、规范文档
```

## 四、面试回答框架

如果面试官问“你怎么理解前端工程化”，可以按这个结构回答：

1. **先定义**：工程化是围绕效率、质量、稳定性和协作，把前端研发流程标准化、自动化、可观测化。
2. **再分层**：开发阶段、构建阶段、测试阶段、发布阶段、线上阶段。
3. **给实践**：例如 Vite 提升开发效率，CI/CD 保证交付一致性，测试和 lint 保证质量，灰度和回滚保证稳定性。
4. **讲取舍**：小项目不需要过度工程化，大项目要关注边界、缓存、增量构建和治理成本。
''',
    '包管理与依赖治理.md': '''# 包管理与依赖治理

> 包管理是工程化的地基。很多构建失败、环境不一致、线上异常，本质都来自依赖版本、安装策略或包边界失控。

## 一、包管理解决的问题

包管理工具主要解决四件事：

1. **依赖声明**：项目依赖哪些包，分别用于生产、开发还是 peer 环境。
2. **版本解析**：根据 semver、lockfile 和 registry 解析出确定版本。
3. **依赖安装**：把依赖组织到本地文件系统，供 Node.js 和构建工具解析。
4. **脚本编排**：通过 `scripts` 统一开发、构建、测试、发布命令。

## 二、dependencies、devDependencies、peerDependencies

### dependencies

运行时需要的依赖。比如 React 组件库里的运行时代码依赖 `react`、`classnames`，业务应用依赖 `axios`。

### devDependencies

只在开发、构建、测试阶段需要的依赖，例如 TypeScript、ESLint、Vite、Webpack、Vitest。

### peerDependencies

声明“我需要宿主项目提供这个依赖”。组件库通常把 `react` 放到 `peerDependencies`，避免组件库自己安装一份 React，导致多 React 实例问题。

```json
{
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

## 三、语义化版本与 lockfile

语义化版本通常是：

```text
major.minor.patch
```

常见范围：

- `1.2.3`：锁定精确版本。
- `^1.2.3`：允许升级 minor 和 patch，不允许升级 major。
- `~1.2.3`：允许升级 patch，不允许升级 minor。
- `>=1.2.3`：允许安装不低于该版本的版本。

lockfile 的作用是把“版本范围”固化成“确定版本”。没有 lockfile，今天安装和下周安装可能得到不同依赖树。

常见 lockfile：

- npm：`package-lock.json`
- pnpm：`pnpm-lock.yaml`
- yarn：`yarn.lock`

## 四、npm、pnpm、yarn 的核心差异

### npm

默认选择，生态兼容好。现代 npm 已经支持 workspace，但在大型 Monorepo 中性能和磁盘复用不如 pnpm。

### pnpm

通过内容寻址存储和硬链接复用依赖，安装快、磁盘占用低，并且默认依赖隔离更严格。大型 Monorepo 推荐优先考虑 pnpm。

### yarn

历史上在 lockfile、workspace 和安装速度上推动过很多改进。Yarn Berry 提供 PnP 等能力，但生态兼容成本需要评估。

## 五、依赖治理实践

### 1. 锁定包管理器版本

推荐在 `package.json` 中声明：

```json
{
  "packageManager": "pnpm@9.0.0"
}
```

这样可以降低团队成员和 CI 环境安装结果不一致的概率。

### 2. CI 使用冻结安装

```bash
pnpm install --frozen-lockfile
npm ci
```

冻结安装可以保证 lockfile 与依赖声明不一致时直接失败，而不是自动改 lockfile。

### 3. 避免幽灵依赖

幽灵依赖是指代码里引用了未在当前包 `package.json` 中声明的依赖，只是因为依赖被提升到了根目录而“碰巧可用”。pnpm 的严格依赖隔离能更早暴露这类问题。

### 4. 定期清理无用依赖

可以结合工具和人工检查：

- `depcheck`
- `pnpm why <package>`
- 构建产物分析
- import 引用扫描

### 5. 关注供应链风险

依赖治理不只关注版本，还要关注安全：

- 避免安装来源不明的包。
- 对高权限脚本保持谨慎，例如 `postinstall`。
- 定期运行依赖安全扫描。
- 内部组件库和基础包要有明确 owner。

## 六、Monorepo 下的依赖治理

Monorepo 的依赖治理目标是：共享基础能力，但不让包之间形成混乱耦合。

建议规则：

1. 每个 package 独立声明自己的运行时依赖。
2. 根目录只放工具链依赖和全局脚本。
3. 公共包通过 workspace 协议引用。
4. 禁止业务包跨目录深层 import。
5. 发布包要明确 `exports`，不要暴露内部实现。

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

## 七、排查依赖问题的顺序

1. 看报错中具体缺哪个包或哪个版本。
2. 检查当前包是否声明了该依赖。
3. 检查 lockfile 是否被意外修改。
4. 删除 `node_modules` 后用冻结安装复现。
5. 用 `pnpm why` 或 `npm ls` 查看依赖来源。
6. 如果只在 CI 失败，检查 Node.js 和包管理器版本。

## 八、面试回答模板

如果被问“你们项目怎么做依赖治理”，可以回答：

> 我会从版本确定性、依赖边界、安装效率和安全风险四个方面做治理。版本确定性依赖 lockfile 和 CI frozen install；依赖边界通过 pnpm workspace、明确 dependencies/peerDependencies、禁止幽灵依赖来保证；安装效率通过 pnpm store 和缓存优化；安全上会关注 lockfile 变更、postinstall 脚本和依赖漏洞扫描。
''',
    '代码质量与规范化体系.md': '''# 代码质量与规范化体系

> 代码质量体系的目标不是“让代码看起来整齐”，而是把团队对可维护性的要求前置到提交、构建和评审阶段。

## 一、质量体系分层

一套完整的前端质量体系通常包括：

1. **格式层**：Prettier 统一代码风格。
2. **语法层**：ESLint 检查潜在错误和不推荐写法。
3. **类型层**：TypeScript 在编译期发现类型错误。
4. **测试层**：Unit、Component、E2E 验证行为正确性。
5. **提交层**：commitlint、lint-staged、husky 在提交前拦截明显问题。
6. **流水线层**：CI 作为最终质量门禁。
7. **评审层**：Code Review 关注设计、边界、可读性和风险。

## 二、Prettier 与 ESLint 的边界

Prettier 只解决格式问题，例如缩进、换行、引号、尾逗号。ESLint 解决代码质量问题，例如未使用变量、Hook 依赖、不可达代码、错误 Promise 用法。

推荐原则：

- 格式交给 Prettier，不在 ESLint 中争论格式。
- 质量交给 ESLint，不用 Prettier 解决逻辑问题。
- 保存时自动格式化，提交前只检查变更文件。

## 三、TypeScript 质量策略

TypeScript 不是“加类型注解”，而是用类型系统约束模块边界。

建议实践：

1. 公共函数必须声明入参和返回值。
2. API 响应类型集中管理，不在页面里手写散乱类型。
3. 避免滥用 `any`，确实无法确定时优先使用 `unknown`。
4. 组件 props、hooks 返回值、工具函数泛型要清晰。
5. CI 中执行 `tsc --noEmit`，避免只靠构建工具转译。

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

## 四、Git Hooks 与提交门禁

常见链路：

```text
开发者提交代码
  ↓
husky pre-commit
  ↓
lint-staged 只检查暂存文件
  ↓
ESLint / Prettier / 单测快速集
  ↓
commit-msg 检查提交信息
  ↓
推送后进入 CI 完整检查
```

示例配置：

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{md,json,css,scss}": ["prettier --write"]
  }
}
```

提交前检查应该“快而准”，不要把耗时很长的 E2E 全量测试放到本地 pre-commit，否则团队会倾向于绕过它。

## 五、Commit Message 规范

推荐使用 Conventional Commits：

```text
feat: add user profile page
fix: handle login token expiration
docs: update engineering notes
refactor: split build config
chore: upgrade dependencies
```

规范化提交的价值：

- 自动生成 changelog。
- 更容易 review 和回溯。
- 方便判断版本升级类型。
- 让 CI/CD 根据提交类型执行差异流程。

## 六、目录边界与模块规则

中大型项目要避免“所有模块互相 import”。常见规则：

```text
src/
├─ app/          # 应用入口、路由、全局 Provider
├─ pages/        # 页面层，组合业务模块
├─ features/     # 业务功能模块
├─ entities/     # 业务实体模型
├─ shared/       # 跨业务复用的基础能力
└─ infra/        # 请求、埋点、配置、环境适配
```

约束原则：

- 上层可以依赖下层，下层不要反向依赖上层。
- 业务模块之间不要随意互相引用内部文件。
- 公共能力通过稳定出口暴露，例如 `index.ts` 或 `exports`。
- 架构规则可以通过 ESLint import rules 固化。

## 七、CI 质量门禁

推荐最小门禁：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

更成熟的门禁可以增加：

- 单测覆盖率阈值。
- bundle size 阈值。
- 关键页面 Lighthouse 分数。
- 依赖漏洞扫描。
- Source Map 上传校验。
- 产物 hash 和制品归档。

## 八、质量体系常见误区

1. **规则过多但没有解释**：团队只会觉得麻烦，最后绕过规则。
2. **本地检查太慢**：pre-commit 超过几十秒会严重影响体验。
3. **只检查格式，不检查类型和测试**：看起来规范，但逻辑风险仍然很高。
4. **CI 和本地不一致**：本地能过、CI 失败会浪费大量时间。
5. **没有 owner**：规则没人维护，最后变成历史包袱。

## 九、落地顺序

如果从零开始建设，建议顺序是：

1. Prettier：统一格式，减少无意义 diff。
2. ESLint：发现明显错误和 React/TS 常见问题。
3. TypeScript：提高模块边界可靠性。
4. lint-staged + husky：把低成本检查前置。
5. CI：保证没有人可以绕过最终门禁。
6. 测试和覆盖率：逐步覆盖核心逻辑。
7. 架构边界规则：项目变大后再强化。
''',
    '前端测试体系与质量门禁.md': '''# 前端测试体系与质量门禁

> 测试不是为了追求覆盖率数字，而是为了让重构、协作和持续发布更安全。

## 一、前端测试金字塔

```text
        E2E 测试
      集成 / 组件测试
   单元测试 / 纯函数测试
静态检查：类型、Lint、格式
```

越靠下，执行越快、定位越准、成本越低；越靠上，越接近真实用户路径，但成本更高。

## 二、静态检查是第一层测试

很多问题不需要运行浏览器就能发现：

- TypeScript：类型错误、接口字段变更。
- ESLint：Hook 依赖、未处理 Promise、不可达代码。
- Prettier：格式一致性，减少 review 噪音。

CI 中至少应该包含：

```bash
pnpm lint
pnpm typecheck
```

## 三、单元测试

单元测试适合覆盖稳定、纯粹、边界清晰的逻辑：

- 工具函数。
- 数据转换。
- 权限判断。
- 表单校验。
- 状态 reducer。
- hooks 中不依赖复杂 DOM 的逻辑。

示例：

```ts
import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formats cents to yuan', () => {
    expect(formatPrice(1234)).toBe('12.34');
  });
});
```

## 四、组件测试

组件测试关注组件在用户交互下的行为，而不是内部实现。

适合覆盖：

- 表单输入和校验。
- 弹窗打开关闭。
- loading / empty / error 状态。
- 权限控制下的按钮显隐。
- 组件对外事件回调。

推荐思路：用用户视角查询元素，不要强依赖 DOM 结构。

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('submits form', async () => {
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByLabelText('用户名'), 'alice');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));

  expect(onSubmit).toHaveBeenCalled();
});
```

## 五、集成测试

集成测试关注多个模块组合后的结果，例如：

- 页面 + store + API mock。
- 路由跳转后页面状态。
- 表单提交后刷新列表。
- 权限变化影响多个组件。

集成测试通常需要 mock 网络请求。推荐使用 MSW 这类“协议层 mock”，比直接 mock 请求函数更接近真实行为。

## 六、E2E 测试

E2E 测试模拟真实用户路径，适合覆盖最关键链路：

- 登录。
- 下单。
- 支付。
- 创建核心业务对象。
- 发布或提交流程。

E2E 不适合覆盖所有边界，否则会慢、脆、维护成本高。

推荐策略：

1. 只覆盖核心路径。
2. 测试数据可重复创建和清理。
3. 避免依赖第三方不可控服务。
4. 失败时保留截图、视频、trace。

## 七、视觉回归与性能测试

### 视觉回归

适合设计系统、组件库、营销页等 UI 稳定性要求高的场景。它能发现 CSS 或依赖升级导致的布局变化。

### 性能测试

适合核心页面，关注：

- 首屏时间。
- LCP。
- INP。
- JS bundle 体积。
- 长任务数量。

性能测试可以作为 CI 的弱门禁：超过阈值提醒，严重超标阻断。

## 八、质量门禁设计

不同阶段适合不同检查：

### 本地提交前

目标是快：

```bash
lint-staged
```

只检查变更文件，避免影响开发体验。

### Pull Request

目标是准：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### 合并到主干后

目标是稳：

- 全量测试。
- E2E 核心路径。
- 构建产物分析。
- 部署前检查。

## 九、如何给老项目补测试

不要试图一次性补齐所有测试。推荐顺序：

1. 先补纯函数和核心工具函数。
2. 给高频变更模块补组件测试。
3. 给最核心业务流程补 E2E。
4. 每次修 bug 时补一个回归测试。
5. 给新代码设定更高要求，老代码逐步迁移。

## 十、面试回答模板

如果被问“你们项目怎么做前端测试”，可以回答：

> 我会把测试分成静态检查、单元测试、组件/集成测试和 E2E 测试。静态检查和单测放在 PR 阶段作为基础门禁；组件测试覆盖复杂交互；E2E 只覆盖核心用户链路，避免维护成本失控。对于老项目，会从工具函数、核心业务模块和 bug 回归用例开始补，不追求一开始就全量覆盖。
''',
    '构建产物分析与发布策略.md': '''# 构建产物分析与发布策略

> 构建的终点不是生成 `dist`，而是生成一组可缓存、可回滚、可观测、可定位问题的线上资产。

## 一、构建产物通常包含什么

典型前端构建产物包括：

```text
dist/
├─ index.html
├─ assets/
│  ├─ index.[hash].js
│  ├─ vendor.[hash].js
│  ├─ index.[hash].css
│  └─ logo.[hash].png
└─ sourcemap files
```

不同文件的缓存策略不同：

- HTML：入口文件，通常不强缓存或短缓存。
- JS/CSS：带 content hash，可以长缓存。
- 图片/字体：带 hash 后可以长缓存。
- Source Map：不直接公开访问，通常上传到错误监控平台或受控存储。

## 二、为什么需要 hash

hash 的目标是让浏览器和 CDN 安全缓存静态资源。

```text
main.abc123.js  内容不变，文件名不变，继续命中缓存
main.def456.js  内容变化，文件名变化，浏览器重新下载
```

常见 hash 类型：

- `hash`：整个构建维度变化。
- `chunkhash`：chunk 维度变化。
- `contenthash`：文件内容维度变化，最适合长期缓存。

现代构建工具通常推荐 JS/CSS 使用 content hash。

## 三、产物分析看什么

产物分析不是只看总大小，而是看结构是否合理。

重点关注：

1. **初始 JS 体积**：首屏必须下载和执行的 JS。
2. **重复依赖**：同一个库是否被打进多个 chunk。
3. **大依赖**：moment、lodash 全量、图表库、编辑器等。
4. **动态导入效果**：路由级拆包是否真的生效。
5. **CSS 体积**：未使用样式是否过多。
6. **Source Map 体积**：是否影响上传和存储。

常用工具：

- Webpack Bundle Analyzer
- Rollup Visualizer
- Vite bundle visualizer
- Source Map Explorer

## 四、代码拆分策略

### 路由级拆分

适合 SPA 应用，把不同页面拆成不同 chunk。

```tsx
const SettingsPage = lazy(() => import('./pages/settings'));
```

### 组件级拆分

适合低频使用的大组件，例如图表、富文本编辑器、复杂弹窗。

### 依赖拆分

把稳定第三方依赖拆到 vendor chunk，可以提高缓存命中率。但拆分过细会增加请求和调度成本，需要结合 HTTP/2/HTTP/3 和实际体积判断。

## 五、环境变量与配置注入

前端环境变量通常在构建时注入，因此要注意：

- 不要把敏感密钥写入前端环境变量。
- 区分构建时变量和运行时配置。
- 多环境发布时避免为每个环境重复构建大产物。

常见方案：

1. **构建时注入**：适合版本号、构建时间、公开 API 域名。
2. **运行时配置**：适合多环境切换、灰度配置、租户配置。
3. **服务端模板注入**：适合 SSR 或 HTML 由服务端托管的场景。

## 六、发布流程

一个相对稳妥的发布流程：

```text
代码合并
  ↓
CI 安装依赖、检查、测试、构建
  ↓
产物归档，生成版本号
  ↓
上传静态资源到 CDN 或对象存储
  ↓
发布 HTML / 入口配置
  ↓
灰度验证
  ↓
全量发布
  ↓
监控错误率、性能和业务指标
```

关键原则：先上传带 hash 的静态资源，再更新 HTML 入口。否则用户可能拿到新 HTML，但静态资源还没上传完成。

## 七、灰度与回滚

### 灰度发布

灰度可以按这些维度进行：

- 用户比例。
- 用户 ID。
- 地域。
- 租户。
- 环境。
- 业务开关。

前端灰度通常依赖入口 HTML、配置中心或服务端路由控制。

### 回滚

回滚需要满足：

1. 历史产物仍然保留。
2. HTML 或入口配置可以切回旧版本。
3. 数据结构变更兼容旧前端。
4. Source Map 和版本号能对应旧版本。

如果每次发布都覆盖同名文件，回滚会非常困难。因此静态资源要尽量使用不可变文件名。

## 八、Source Map 管理

Source Map 对定位线上问题很重要，但不能随意公开。

建议实践：

- 生产环境生成 Source Map，但不要公开暴露下载路径。
- 上传到错误监控平台或受控存储。
- 错误上报携带 release/version。
- 产物、Source Map、commit SHA 三者建立映射。

## 九、发布风险清单

发布前可以检查：

- lockfile 是否异常变更。
- 构建产物体积是否明显上涨。
- HTML 是否引用了存在的静态资源。
- CDN 缓存策略是否正确。
- Source Map 是否上传成功。
- 版本号是否写入产物。
- 回滚版本是否可用。
- 核心页面冒烟测试是否通过。

## 十、面试回答模板

如果被问“前端项目怎么做发布和缓存”，可以回答：

> 我会把 HTML 和静态资源分开处理。JS/CSS/图片使用 content hash 并长缓存，HTML 作为入口短缓存或不强缓存。发布时先上传静态资源，再切入口，避免 HTML 引用不存在的资源。每次构建产物归档并关联版本号、commit SHA 和 Source Map，出现问题时可以根据监控定位到具体版本并快速回滚。
''',
}


def write(path: Path, content: str) -> None:
    path.write_text(content.rstrip() + '\n', encoding='utf-8')


def update_index() -> None:
    content = '''# 09-工程化 · 工程化

> Webpack、Vite、构建、部署、CI/CD、质量体系。本索引不只是文件清单，而是按“入门地图 → 构建工具 → 质量体系 → 发布稳定性 → 团队协作”组织的学习路径。

## 学习定位

- **模块职责**：沉淀前端项目从开发到上线的完整工程链路。
- **学习目标**：理解工程化为什么存在、如何选型、如何落地、如何治理长期复杂度。
- **索引约定**：本文是中文主索引；`README.md` 仅作为 GitHub 默认展示入口。

## 推荐学习路径

### 0. 建立全局地图

先不要直接钻 Webpack 配置，先理解工程化解决的问题。

1. [工程化学习路线图](./工程化学习路线图.md)
2. [前端工程化全景](./前端工程化全景.md)
3. [AI 对话笔记 - 工程化综合](./AI对话笔记-综合.md)

### 1. 入门基础：项目、依赖、脚本

目标是能独立初始化项目、理解依赖安装和脚本运行链路。

1. [包管理与依赖治理](./包管理与依赖治理.md)
2. [package-lock.json 深入解析](./package-lock文件详解.md)
3. [NPM 包从 0 到 1 开发全流程](./npm包开发全流程.md)
4. [Monorepo 实践：pnpm workspace + Turborepo](./Monorepo实战指南.md)

### 2. 核心进阶：构建工具

目标是理解源码如何变成浏览器可运行、可缓存、可调试的产物。

1. [Vite 原理与配置实战](./Vite原理与配置实战.md)
2. [Vite 深入理解](./Vite深入理解.md)
3. [Vite vs Webpack：2026 年构建工具选型指南](./Vite与Webpack对比分析-2026.md)
4. [Webpack 构建流程详解](./Webpack构建流程详解.md)
5. [Webpack 5 核心特性](./Webpack5核心特性.md)
6. [Webpack 性能优化实战](./Webpack性能优化实战.md)
7. [Webpack 自定义 Loader 与 Plugin 开发](./Webpack自定义Loader与Plugin开发.md)

### 3. 工程质量：规范、测试、协作

目标是让项目可维护、可协作、可持续重构。

1. [代码质量与规范化体系](./代码质量与规范化体系.md)
2. [前端测试体系与质量门禁](./前端测试体系与质量门禁.md)
3. [多人协作代码管理方案](./多人协作代码管理方案.md)
4. [Webpack 面试核心知识点](./Webpack面试核心知识点.md)

### 4. 交付稳定性：CI/CD、产物、发布

目标是让构建结果可追踪、发布过程可回滚、线上问题可定位。

1. [CI/CD 持续集成与部署](./CI-CD持续集成与部署.md)
2. [构建产物分析与发布策略](./构建产物分析与发布策略.md)
3. 课程笔记：[部署与 CD](./课程笔记/03-部署与CD/)

### 5. 扩展视野：协议、平台与未来趋势

1. [MCP 协议原理与协作流程](./MCP协议原理与协作流程.md)
2. 课程笔记：[脚手架与开发工具](./课程笔记/01-脚手架与开发工具/)
3. 课程笔记：[构建工具 Webpack](./课程笔记/02-构建工具Webpack/)
4. 课程笔记：[综合与结束](./课程笔记/04-综合与结束/)

## 新增补齐笔记

本轮补齐了工程化从“文件清单”到“平滑学习路径”中缺失的桥接内容：

- [工程化学习路线图](./工程化学习路线图.md)：解释学习顺序和阶段检查点。
- [包管理与依赖治理](./包管理与依赖治理.md)：补齐依赖声明、lockfile、pnpm/npm/yarn、Monorepo 依赖边界。
- [代码质量与规范化体系](./代码质量与规范化体系.md)：补齐 ESLint、Prettier、TypeScript、Git Hooks、CI 门禁。
- [前端测试体系与质量门禁](./前端测试体系与质量门禁.md)：补齐单测、组件测试、集成测试、E2E、质量门禁。
- [构建产物分析与发布策略](./构建产物分析与发布策略.md)：补齐 hash、缓存、Source Map、灰度、回滚、产物分析。

## 面试复习入口

- [Webpack5 核心特性 - 一页速记](./Webpack5核心特性%20-%20一页速记.md)
- [Webpack5 核心特性 - 标准答案索引](./Webpack5核心特性%20-%20标准答案索引.md)
- [Webpack5 核心特性 - 深挖专题索引](./Webpack5核心特性%20-%20深挖专题索引.md)

## 待继续整理

- 将课程笔记中的“脚手架、Source Map、Mock、HMR”提炼成主干专题。
- 将 Webpack 课程笔记和现有 Webpack 主干文档继续去重。
- 后续可补充 Rspack、Turbopack、Rolldown、Biome、Nx 等现代工程化工具对比。
- 将 CI/CD 与构建产物发布策略进一步合并成完整“前端发布体系”专题。

## 整理记录

- 当前 Markdown 文档数：56
- 待合并、待删除和断链问题统一记录在 [知识库整理规划](../99-其他/知识库整理规划.md)。
'''
    write(INDEX, content)


def update_todo() -> None:
    todo = ROOT / '99-其他' / '知识库整理规划.md'
    if not todo.exists():
        return
    text = todo.read_text(encoding='utf-8', errors='ignore')
    marker = '## 待合并主题\n\n'
    insert = '- 工程化：已先补齐学习路线、包管理、代码质量、测试体系、构建产物与发布策略；后续继续合并课程笔记中的脚手架、HMR、Source Map、Mock 和部署系统内容。\n'
    if insert not in text and marker in text:
        text = text.replace(marker, marker + insert)
        todo.write_text(text, encoding='utf-8')


def main() -> None:
    for name, content in DOCS.items():
        write(ENG / name, content)
    update_index()
    update_todo()
    print('optimized engineering notes with learning path and missing bridge topics')


if __name__ == '__main__':
    main()
