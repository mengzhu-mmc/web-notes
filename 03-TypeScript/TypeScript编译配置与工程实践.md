# TypeScript 编译配置与工程实践

> 面试考点：tsconfig 核心配置项含义、严格模式、路径别名、项目引用、声明文件编写。

## 面试高频考点

1. **tsconfig.json 中 strict 模式包含哪些检查？**
2. **`target`、`module`、`lib` 三个配置项的区别？**
3. **如何配置路径别名（`@/`）？**
4. **`declaration`、`declarationMap`、`sourceMap` 分别有什么用？**
5. **如何为没有类型声明的第三方库补充类型？**

---

## 一、tsconfig.json 核心配置详解

### 1.1 编译目标配置

```json
{
  "compilerOptions": {
    // target：编译输出的 JS 版本
    // ES5（兼容老浏览器）/ ES2015 / ES2017 / ES2020 / ESNext
    "target": "ES2020",

    // module：模块系统格式
    // CommonJS（Node.js）/ ESNext（Vite/Webpack）/ NodeNext（Node.js ESM）
    "module": "ESNext",

    // moduleResolution：模块解析策略
    // node（传统）/ bundler（Vite/Webpack，推荐）/ node16 / nodenext
    "moduleResolution": "bundler",

    // lib：包含的内置类型声明库
    // 不配置时根据 target 自动推断
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

**三者关系**：
- `target` 决定输出的 JS 语法（如 `async/await` 是否转为 Promise 链）
- `module` 决定输出的模块格式（`import/export` 还是 `require/module.exports`）
- `lib` 决定 TypeScript 知道哪些全局 API（如 `Promise`、`fetch`、`document`）

### 1.2 严格模式（strict）

```json
{
  "compilerOptions": {
    "strict": true  // 开启所有严格检查（强烈推荐）
  }
}
```

`"strict": true` 等价于同时开启以下所有选项：

| 选项 | 作用 |
|------|------|
| `strictNullChecks` | `null` 和 `undefined` 不能赋值给其他类型 |
| `strictFunctionTypes` | 函数参数类型逆变检查 |
| `strictBindCallApply` | `bind/call/apply` 的参数类型检查 |
| `strictPropertyInitialization` | 类属性必须在构造函数中初始化 |
| `noImplicitAny` | 禁止隐式 `any`（必须显式声明类型） |
| `noImplicitThis` | 禁止 `this` 隐式为 `any` |
| `alwaysStrict` | 每个文件都加 `"use strict"` |
| `useUnknownInCatchVariables` | catch 的 error 类型为 `unknown` 而非 `any` |

**为什么要开启 strict？**

```typescript
// 不开启 strictNullChecks 时：
function getUser(id: number) {
  return users.find(u => u.id === id); // 返回 User | undefined
}
const user = getUser(1);
console.log(user.name); // ❌ 运行时可能报错，但 TS 不报错！

// 开启后：
const user = getUser(1);
console.log(user?.name); // ✅ 必须处理 undefined 情况
```

### 1.3 输出配置

```json
{
  "compilerOptions": {
    "outDir": "./dist",          // 编译输出目录
    "rootDir": "./src",          // 源码根目录

    "declaration": true,         // 生成 .d.ts 类型声明文件（库开发必须）
    "declarationMap": true,      // 生成 .d.ts.map，支持"跳转到源码"
    "sourceMap": true,           // 生成 .js.map，调试时映射到 TS 源码

    "removeComments": false,     // 是否删除注释
    "noEmit": true,              // 只做类型检查，不输出文件（配合 Vite/Webpack 使用）
    "emitDeclarationOnly": true, // 只输出 .d.ts，不输出 .js（配合 Rollup 使用）
  }
}
```

**`noEmit: true` 的使用场景**：当使用 Vite 或 Webpack 打包时，这些工具自己处理 TS 编译（通过 esbuild 或 babel），`tsc` 只需要做类型检查，不需要输出文件。

---

## 二、路径别名配置

### 2.1 tsconfig 配置

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### 2.2 配合 Vite 使用

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
});
```

**注意**：`tsconfig.json` 的 `paths` 只影响 TypeScript 的类型检查，不影响实际的模块解析。需要在打包工具（Vite/Webpack）中同步配置 `alias`，两者缺一不可。

### 2.3 配合 Webpack 使用

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
};
```

---

## 三、include / exclude / files

```json
{
  "include": [
    "src/**/*",          // 编译 src 目录下所有文件
    "types/**/*.d.ts"    // 包含自定义类型声明
  ],
  "exclude": [
    "node_modules",      // 默认已排除
    "dist",
    "**/*.test.ts",      // 排除测试文件（生产构建时）
    "**/*.spec.ts"
  ],
  "files": [
    "src/main.ts"        // 精确指定入口文件（与 include 二选一）
  ]
}
```

---

## 四、声明文件（.d.ts）

### 4.1 为第三方库补充类型

```typescript
// 方式一：在 src/types/ 目录下创建声明文件
// src/types/some-lib.d.ts
declare module 'some-untyped-lib' {
  export function doSomething(input: string): number;
  export interface Config {
    timeout: number;
    retries: number;
  }
}

// 方式二：扩展已有模块的类型（模块增强）
// src/types/express.d.ts
import 'express';
declare module 'express' {
  interface Request {
    user?: { id: number; name: string }; // 给 Request 添加 user 属性
  }
}
```

### 4.2 全局类型声明

```typescript
// src/types/global.d.ts
// 声明全局变量（如 window 上挂载的变量）
declare const __DEV__: boolean;
declare const __VERSION__: string;

// 扩展 Window 接口
interface Window {
  analytics: {
    track: (event: string, data?: object) => void;
  };
}

// 声明非 JS 模块（如 SVG、图片）
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}
```

### 4.3 tsconfig 中引入声明文件

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "types": ["node", "jest"]  // 只引入指定的 @types 包，不自动引入所有
  }
}
```

---

## 五、项目引用（Project References）

适用于 monorepo 或大型项目，将一个大项目拆分为多个子项目，实现增量编译：

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,    // 必须开启，允许被其他项目引用
    "declaration": true,
    "outDir": "./dist"
  }
}

// packages/app/tsconfig.json
{
  "references": [
    { "path": "../core" }  // 引用 core 包
  ]
}
```

```bash
# 增量构建（只重新编译有变化的子项目）
tsc --build
tsc -b --watch
```

---

## 六、常用 tsconfig 模板

### React + Vite 项目

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* 模块解析 */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* 严格模式 */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* 路径别名 */
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Node.js 项目

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 七、面试答题模板

**Q：strict 模式包含哪些检查？最重要的是哪个？**

`strict: true` 是一组严格检查的总开关，包含 `strictNullChecks`（最重要）、`noImplicitAny`、`strictFunctionTypes` 等 8 个选项。其中 `strictNullChecks` 最关键，它让 `null` 和 `undefined` 成为独立类型，不能赋值给其他类型，强制开发者处理可能为空的情况，从根源上消灭大量运行时的 `Cannot read property of null` 错误。

**Q：target、module、lib 的区别？**

`target` 控制输出的 JS 语法版本（如是否将 `async/await` 降级为 Promise 链）；`module` 控制输出的模块格式（CommonJS 还是 ESM）；`lib` 控制 TypeScript 知道哪些全局 API（如 `Promise`、`fetch`、`document`），不影响输出，只影响类型检查。三者相互独立，可以组合使用，如 `target: ES5` + `lib: ES2020` 表示输出 ES5 语法但允许使用 ES2020 的 API（需要 polyfill）。
