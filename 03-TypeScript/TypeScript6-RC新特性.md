# TypeScript 6.0 到 7.0：版本演进与迁移

> 首次记录：[TypeScript 6.0 RC](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/) | 状态更新：[TypeScript 7.0 正式版](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | 事实状态复核于 2026-08-12

## 要点

### 当前状态

- TypeScript 6.0 已于 2026 年 3 月正式发布，是原 JavaScript 代码库的最后一个主要版本和迁移桥梁
- TypeScript 7.0 已于 **2026 年 7 月 8 日**正式发布，编译器与语言服务主体迁移到 Go
- 官方基准显示完整构建通常可提升约 8～12 倍，但实际收益取决于项目规模、配置和工作负载

### 关键变化

- tsconfig.json 中部分选项调整（为 7.0 做准备）
- 6.0 引入和强化了一批弃用检查，为 7.0 移除旧选项做准备
- 7.0 尽量保持类型检查结果兼容，但依赖 TypeScript Compiler API 的工具可能仍需要兼容改造或暂时与 6.0 并存

## 面试相关

- TypeScript 7.0 是 Go 原生移植，可以表述为“官方完整构建基准通常提升 8～12 倍”，不要承诺所有项目固定提升 10 倍
- 体现对工具链演进的了解

---

## 升级与配置示例

### 升级到 TypeScript 7.0

```bash
# 安装当前稳定版
npm install typescript@latest --save-dev

# 检查版本
npx tsc --version
# Version 7.0.x

# 运行类型检查（不输出文件）
npx tsc --noEmit
```

### tsconfig.json 迁移示例

```jsonc
// tsconfig.json（打包器项目示例）
{
  "compilerOptions": {
    // Vite / webpack / Rollup 等打包器项目
    "module": "preserve",
    "moduleResolution": "bundler",

    // target 推荐 ES2022+（为 7.0 做准备）
    "target": "ES2022",

    // 严格模式全家桶（强烈推荐）
    "strict": true,

    // 这些是既有严格选项，并非 TS 6.0 新增
    "noUncheckedSideEffectImports": true,
    "exactOptionalPropertyTypes": true,

    // 其他推荐
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
}
```

### TypeScript 7.0 Go 原生实现的实际变化

```bash
# TypeScript 7.0 官方完整构建基准通常提升 8～12 倍
# 实际性能取决于项目规模和任务类型

# 对开发者的实际影响（大部分透明）：
# - 普通 .ts/.tsx 源码通常无需因编译器移植而重写
# - 类型检查结果以兼容为目标
# - 依赖 Compiler API 的工具不能假设完全兼容

# 7.0 的 tsconfig 重大调整（6.0 已预热）：
# 废弃的选项（6.0 会警告，7.0 会报错）：
# - 重点处理 TS 6.0 已标记弃用、TS 7.0 已移除的旧选项
# - Node 项目优先按运行时版本使用 "NodeNext" 等模式
# - 打包器项目通常使用 module="Preserve" + moduleResolution="Bundler"

# 验证配置是否符合 7.0 迁移路径
npx tsc --noEmit 2>&1 | grep "deprecated"
```

### 类型系统新特性示例

```typescript
// noUncheckedSideEffectImports（该选项早于 TS 6.0）
// 开启后会检查副作用 import 是否能解析
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
- 原生代码、共享内存多线程和新的内部优化共同提升大型项目性能
- 官方完整构建基准通常为 **8～12 倍**，不是所有场景固定 10 倍
- 普通源码迁移通常较平滑，但 Compiler API、编辑器扩展和构建工具集成需要单独验证

---

## 关键点总结

- **TS 6.0 定位**：JavaScript 版编译器的最后一个主要版本和迁移桥梁
- **TS 7.0 状态**：已于 2026-07-08 正式发布，当前应以稳定版而不是 RC 叙述
- **配置原则**：Node 项目与打包器项目采用不同的 module/moduleResolution 组合，不存在通用的 `module: "Bundler"`
- **迁移边界**：源码兼容不等于 Compiler API 和全部工具链完全兼容

---

## 相关知识

- [TypeScript 基础到进阶](./TypeScript基础到进阶.md)
- [TypeScript 编译配置与工程实践](./TypeScript编译配置与工程实践.md)
- [SolidJS 2 Beta 新特性](../05-React/SolidJS2-Beta新特性.md) — 同期前端框架动态
- 前端工具链演进：Vite / esbuild / Turbopack / TS Go（待补专题）
