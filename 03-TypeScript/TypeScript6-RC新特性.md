# TypeScript 6.0 Release Candidate

> 来源: JavaScript Weekly #776 | 2026-03-10
> 原文: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/

## 要点

### 定位：过渡版本
- TS 6.0 是通向 **Go 重写版 TypeScript 7.0** 的过渡
- TypeScript 7.0 将使用 Go 重写，预计 2026 年晚些发布
- 6.0 主要做好 tsconfig.json 的配置迁移

### 关键变化
- tsconfig.json 中部分选项调整（为 7.0 做准备）
- RC 相比 Beta 只有少量改动
- 建议现在就升级到 6.0，这样未来迁移 7.0 更平滑

## 面试相关
- TypeScript 7.0 用 Go 重写是大新闻，可以提到性能将有 10x 提升
- 体现对工具链演进的了解

---

## 升级与配置示例

### 升级到 TypeScript 6.0

```bash
# 升级到 RC 版本
npm install typescript@rc --save-dev

# 或指定版本
npm install typescript@6.0.0-rc.1 --save-dev

# 检查版本
npx tsc --version
# Version 6.0.0-rc.1

# 运行类型检查（不输出文件）
npx tsc --noEmit
```

### tsconfig.json 迁移示例

```jsonc
// tsconfig.json（TS 6.0 推荐配置）
{
  "compilerOptions": {
    // TS 6.0 对 module 配置做了整理，推荐明确指定
    "module": "NodeNext",       // 或 "Bundler"（用于 webpack/vite 项目）
    "moduleResolution": "NodeNext", // 与 module 保持一致

    // target 推荐 ES2022+（为 7.0 做准备）
    "target": "ES2022",

    // 严格模式全家桶（强烈推荐）
    "strict": true,

    // TS 6.0 新增：更严格的类型检查选项
    "noUncheckedSideEffectImports": true, // 检查有副作用的纯 import
    "exactOptionalPropertyTypes": true,   // 可选属性严格区分 undefined vs 缺失

    // 其他推荐
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### TypeScript 7.0 Go 重写带来的变化预览

```bash
# TypeScript 7.0（Go 重写版）性能目标
# tsc 编译速度：10x 提升（大型项目从分钟级→秒级）
# 内存占用：大幅降低

# 对开发者的实际影响（大部分透明）：
# - API 完全兼容（.ts 代码不需要改）
# - tsconfig.json 格式兼容（6.0 的配置直接用）
# - 类型语义不变

# 7.0 的 tsconfig 重大调整（6.0 已预热）：
# 废弃的选项（6.0 会警告，7.0 会报错）：
# - "module": "CommonJS" → 改用 "NodeNext" 或 "Node16"
# - "moduleResolution": "node" → 改用 "NodeNext"

# 验证配置是否符合 7.0 迁移路径
npx tsc --noEmit 2>&1 | grep "deprecated"
```

### 类型系统新特性示例

```typescript
// TS 6.0 新增：noUncheckedSideEffectImports
// 以前这种"副作用 import"不会被检查文件是否存在
import "./polyfills/my-polyfill"; // 6.0 会检查此文件是否存在

// exactOptionalPropertyTypes 示例
interface Config {
  timeout?: number; // 可选属性
}

// exactOptionalPropertyTypes: false（旧行为）
// 可选属性等价于 timeout: number | undefined
const cfg1: Config = { timeout: undefined }; // ✅ 旧模式允许

// exactOptionalPropertyTypes: true（新行为）
// 可选属性意味着"可以不存在"，但存在时必须是 number
const cfg2: Config = { timeout: undefined }; // ❌ 报错！
const cfg3: Config = {}; // ✅ 正确写法（省略该属性）
const cfg4: Config = { timeout: 5000 }; // ✅ 正确写法

// TS 改进的类型推断
function processItems<T>(items: T[]): T extends string ? string[] : number[] {
  // 条件类型分发
  return items as any;
}
```

---

## 面试考点

### Q1：TypeScript 和 JavaScript 的关系是什么？

**标准答案要点：**
- TS 是 JS 的**超集**：所有合法 JS 都是合法 TS
- TS 增加了**静态类型系统**，在编译时（而非运行时）发现类型错误
- TS 最终编译为 JS 运行，浏览器/Node.js 不认识 TS
- TS 是**渐进式**的：可以慢慢从 JS 迁移，不用一次全改

### Q2：TypeScript 的编译过程是什么？

**标准答案要点：**
1. **解析（Parse）**：`.ts` → AST（抽象语法树）
2. **类型检查（Type Check）**：分析类型，发现错误（不影响输出）
3. **代码生成（Emit）**：AST → `.js`（类型注解被擦除，不影响运行时行为）
- 关键：**类型是纯编译时概念**，运行时完全消失

### Q3：`interface` 和 `type` 的区别？

**标准答案要点：**
- `interface`：只能描述对象/函数形状；支持**声明合并**（同名 interface 会合并）；支持 `extends`
- `type`：可以描述任意类型（联合类型、交叉类型、字面量类型等）；不支持声明合并；用 `&` 做交叉
- 实践建议：对外暴露的 API 用 `interface`（可被扩展），内部使用 `type`（更灵活）

### Q4：`any` 和 `unknown` 的区别？

**标准答案要点：**
- `any`：完全绕过类型检查，可赋值给任何类型，也可被任何类型赋值 → **不安全**
- `unknown`：可以接受任何值赋入，但**使用前必须做类型收窄**（instanceof/typeof/类型守卫）→ **类型安全的 any**
- 原则：接受未知输入时用 `unknown`，强制调用方做检查；永远不要无脑用 `any`

### Q5：为什么 TypeScript 7.0 要用 Go 重写？

**标准答案要点：**
- 原因：大型 TS 项目（百万行代码）的**编译速度**成为开发体验瓶颈
- Go 比 Node.js 有更好的并发模型和更低的内存开销
- 预计性能提升 **10x**，语言行为/类型语义完全不变
- 对普通开发者透明：代码不用改，只是工具更快了

---

## 关键点总结

- **TS 6.0 定位**：稳定版 + 迁移桥梁，为 7.0 铺路
- **升级价值**：现在用 6.0 推荐配置，未来迁移 7.0 无缝衔接
- **重要新选项**：`noUncheckedSideEffectImports`、`exactOptionalPropertyTypes`
- **大背景**：TS 7.0 Go 重写是 2026 年前端工具链最大新闻之一

---

## 相关知识

- [[TypeScript 类型系统基础]]
- [[tsconfig.json 配置详解]]
- [[2026-03-12-solid-2-beta]] — 同期前端框架动态
- [[前端工具链演进：Vite / esbuild / Turbopack / TS Go]]
