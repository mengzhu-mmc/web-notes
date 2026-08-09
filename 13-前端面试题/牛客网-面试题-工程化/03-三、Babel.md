# 03-三、Babel

## 三、Babel

### Q: Babel 的工作流程是什么？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

Babel 是 JS 编译器，将现代 JS 代码转换为向后兼容的版本。核心流程分三步：**Parse → Transform → Generate**。

```
源代码字符串
    ↓ Parse（@babel/parser）
   AST（抽象语法树）
    ↓ Transform（@babel/traverse + plugins）
   修改后的 AST
    ↓ Generate（@babel/generator）
目标代码字符串 + source map
```

**第一步：Parse（解析）**

```js
const { parse } = require("@babel/parser");

// 将源码字符串解析成 AST
const ast = parse(
  `
  const greet = (name) => \`Hello, \${name}!\`;
`,
  {
    sourceType: "module", // 'script' | 'module'
    plugins: ["jsx", "typescript"], // 启用语法插件（不转换，只解析）
  },
);

// AST 节点示例（简化）：
// {
//   type: "VariableDeclaration",
//   kind: "const",
//   declarations: [{
//     type: "VariableDeclarator",
//     id: { type: "Identifier", name: "greet" },
//     init: {
//       type: "ArrowFunctionExpression",
//       params: [{ type: "Identifier", name: "name" }],
//       body: {
//         type: "TemplateLiteral",
//         ...
//       }
//     }
//   }]
// }
```

**第二步：Transform（转换）**

```js
const { traverse } = require("@babel/traverse");
const t = require("@babel/types");

// Babel 插件本质是一个工厂函数，返回包含 visitor 的对象
// visitor 是一个对象，key 是 AST 节点类型，value 是访问该节点时的处理函数
const arrowFunctionPlugin = () => ({
  visitor: {
    // 访问所有 ArrowFunctionExpression 节点
    ArrowFunctionExpression(path) {
      const { node } = path;

      // 将箭头函数转换为普通函数表达式
      // t.functionExpression(id, params, body)
      const regularFunction = t.functionExpression(
        null, // 函数名（匿名）
        node.params, // 参数列表（复用）
        // 如果箭头函数体是表达式（不是块）需要包成 return 语句
        t.isBlockStatement(node.body)
          ? node.body
          : t.blockStatement([t.returnStatement(node.body)]),
      );

      // path.replaceWith 替换当前节点
      path.replaceWith(regularFunction);
    },
  },
});

// 手动调用 traverse
traverse(ast, arrowFunctionPlugin().visitor);
```

**第三步：Generate（生成）**

```js
const generate = require("@babel/generator").default;

// 从修改后的 AST 生成代码字符串
const { code, map } = generate(ast, {
  sourceMaps: true, // 同时生成 source map
  sourceFileName: "app.js",
  comments: true, // 保留注释
});

// 输出：
// const greet = function(name) {
//   return `Hello, ${name}!`;
// };
```

**Babel 完整处理流程：**

```js
// @babel/core 封装了完整流程
const babel = require("@babel/core");

const result = babel.transformSync(sourceCode, {
  filename: "app.ts",
  presets: [
    ["@babel/preset-env", { targets: "> 0.25%, not dead" }],
    "@babel/preset-typescript",
    "@babel/preset-react",
  ],
  plugins: [["@babel/plugin-proposal-decorators", { legacy: true }]],
});

// result.code → 转换后的代码
// result.map  → source map
// result.ast  → 最终的 AST（可选）
```

**🔍 深层原理**

**AST（抽象语法树）的本质：**

AST 是代码的树形数据结构表示，去掉了所有非语义信息（空格、注释、括号等），只保留语法结构。每个节点都有 `type` 字段标识节点类型（如 `FunctionDeclaration`、`CallExpression`、`Identifier` 等）。

工具推荐：[astexplorer.net](https://astexplorer.net/) 可以实时查看任意 JS 代码对应的 AST 结构，写 Babel 插件的必备工具。

**Visitor 模式（深度优先遍历）：**

Babel 使用**访问者模式**遍历 AST。`traverse` 深度优先遍历树的每个节点，当访问到某类型的节点时，调用对应的 visitor 函数。每个节点有 `enter`（进入）和 `exit`（离开）两个时机：

```js
visitor: {
  FunctionDeclaration: {
    enter(path) { /* 进入函数节点时 */ },
    exit(path)  { /* 离开函数节点时 */ },
  },
  // 简写（只有 enter）：
  FunctionDeclaration(path) { ... }
}
```

**💡 踩坑点**

```js
// 坑1：Babel 只做语法转换，不处理 API 的 polyfill！
// ❌ 误以为配了 @babel/preset-env 就能用 Promise、Array.from 等
// @babel/preset-env 转换语法（箭头函数、class 等），
// 但 Promise、fetch、Array.prototype.includes 等新 API 需要 polyfill

// ✅ 配置 core-js polyfill
// babel.config.js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage", // 按需注入 polyfill（只注入用到的）
        corejs: 3, // 指定 core-js 版本
      },
    ],
  ],
};
// package.json 里需要安装 core-js@3

// 坑2：@babel/preset-env 的 modules 设置影响 Tree Shaking
// modules: 'commonjs'（或 'auto'）会把 ESM 转成 CJS，破坏 webpack Tree Shaking
{
  presets: [["@babel/preset-env", { modules: false }]]; // ✅ 保持 ESM
}

// 坑3：装饰器插件必须在其他插件之前执行
plugins: [
  ["@babel/plugin-proposal-decorators", { legacy: true }], // ← 必须在 class-properties 前
  ["@babel/plugin-proposal-class-properties", { loose: true }],
];
```

**🎯 面试追问**

- **Q: `@babel/parser` 和 `acorn` 有什么关系？**
  - A: `acorn` 是 webpack 使用的 JS 解析器；`@babel/parser`（原名 Babylon）是 Babel 自己的解析器，支持更多语法特性（TypeScript、JSX、装饰器、Flow 等），是 acorn 的 fork 并大幅扩展了语法支持。两者都生成 ESTree 兼容的 AST（但 Babel 有一些扩展节点类型）。
- **Q: Babel 插件执行顺序是什么？**
  - A: plugins 先执行（从前到后），presets 后执行（从后到前）。所以 `presets: ['a', 'b', 'c']` 实际执行顺序是 `c → b → a`。这是历史遗留设计，为了兼容早期用户的配置顺序习惯。
- **Q: Babel 和 TypeScript 编译器（tsc）有什么区别？**
  - A: `tsc` 做完整的类型检查 + 编译；Babel 的 `@babel/preset-typescript` 只做**类型剥除**（strip types），不做类型检查，速度极快（10-20x 快于 tsc）。现代工具链通常用 Babel/esbuild 做编译（快），用 `tsc --noEmit` 单独做类型检查（CI 阶段）。

**⚠️ 常见误区**

- ❌ 配了 Babel 就能用所有新 JS 特性（API）→ Babel 只转换语法，新 API 需要 core-js polyfill
- ❌ Babel preset 从前到后执行 → preset 从后到前！plugin 从前到后
- ❌ `@babel/preset-typescript` 会做类型检查 → 它只剥除类型注解，不检查类型

---

### Q: Babel preset 和 plugin 的区别是什么？

**难度**：⭐⭐ | **频率**：🔥🔥🔥

**答：**

| 对比 | Plugin（插件） | Preset（预设） |
| --- | --- | --- |
| 定义 | 处理单个语法特性的最小转换单元 | 一组 Plugin 的集合 + 配置 |
| 粒度 | 细（一个功能） | 粗（一类场景） |
| 执行顺序 | 从前到后 | 从后到前 |
| 示例 | `@babel/plugin-transform-arrow-functions` | `@babel/preset-env` |

```js
// babel.config.js 完整示例
module.exports = {
  // plugins 从前到后执行
  plugins: [
    // 单个插件（字符串）
    "@babel/plugin-transform-runtime",

    // 带配置的插件（数组：[插件名, 配置对象]）
    [
      "@babel/plugin-proposal-decorators",
      {
        legacy: true, // 使用旧版装饰器语义
      },
    ],

    // 按需导入（比如 babel-plugin-import 用于 antd 按需加载）
    [
      "babel-plugin-import",
      {
        libraryName: "antd",
        libraryDirectory: "es",
        style: "css",
      },
    ],
  ],

  // presets 从后到前执行
  // 执行顺序：@babel/preset-typescript → @babel/preset-react → @babel/preset-env
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { browsers: ["> 1%", "last 2 versions"] },
        useBuiltIns: "usage",
        corejs: 3,
        modules: false, // 保留 ESM，让 webpack 做 tree shaking
      },
    ],
    [
      "@babel/preset-react",
      {
        runtime: "automatic", // React 17+ 不需要手动 import React
      },
    ],
    "@babel/preset-typescript",
  ],
};
```

**常用 preset 说明：**

| Preset                     | 作用                                            |
| -------------------------- | ----------------------------------------------- |
| `@babel/preset-env`        | 根据目标浏览器自动确定需要的语法转换和 polyfill |
| `@babel/preset-react`      | JSX 转换 + React 相关语法                       |
| `@babel/preset-typescript` | TS 类型剥除（不做类型检查）                     |
| `@babel/preset-flow`       | Flow 类型注解剥除                               |

**`@babel/plugin-transform-runtime` 的作用：**

```js
// ❌ 没有 transform-runtime：Babel 会在每个文件里内联 helper 函数
// 1000 个文件 → 1000 份重复的 _classCallCheck、_extends 等 helper 代码

// ✅ 有 transform-runtime：所有 helper 从 @babel/runtime 引入，去重共享
// 1000 个文件 → 所有 helper 都 import from '@babel/runtime'，只保留一份
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
```

**🔍 深层原理**

Plugin 先于 Preset 执行，且 Preset 内部的 plugins 也有自己的顺序（通常由 preset 维护者确保顺序正确）。这个设计允许用户的自定义 plugin 先运行，覆盖 preset 的默认行为。

**💡 踩坑点**

```js
// 坑：preset 执行顺序反直觉（从后到前）
// 如果 preset-env 在 preset-typescript 前执行，
// 会先尝试处理 TS 语法（看不懂）导致报错
// ✅ 总是把类型相关的 preset 放在数组最后（最先执行）

presets: [
  "@babel/preset-env", // 最后执行（处理已经是纯 JS 的代码）
  "@babel/preset-react", // 中间执行（处理 JSX）
  "@babel/preset-typescript", // ✅ 最先执行（先剥除类型）
];
```

**🎯 面试追问**

- **Q: `useBuiltIns: 'entry'` 和 `useBuiltIns: 'usage'` 有什么区别？**
  - A: `entry` 需要在入口文件手动 `import 'core-js'`，Babel 根据目标浏览器把它替换成所有需要的 polyfill 导入（可能包含用不到的）；`usage` 自动分析每个文件实际用到的 API，只注入必要的 polyfill（更精准，bundle 更小）。推荐 `usage`，但要确保 `node_modules` 里的包也被 babel-loader 处理（或这些包自己提供了 polyfill）。
- **Q: Babel 的配置文件有哪几种格式，有什么区别？**
  - A: `babel.config.js`（或 `.json`）是项目级配置，影响整个项目包括 `node_modules`；`.babelrc`（或 `.babelrc.js`）是文件相对配置，只影响同目录及子目录的文件。`babel.config.js` 是 Babel 7 推荐的新方式，Monorepo 必须用 `babel.config.js`，因为 `.babelrc` 只在"包根"生效。
- **Q: 什么是 Babel 的 loose 模式？**
  - A: `loose: true` 让 Babel 生成更"宽松"（接近人手写）的代码，而非严格遵守 spec 语义。例如 class 字段在 loose 模式下直接赋值（`this.x = 1`），strict 模式用 `Object.defineProperty`。loose 模式产物更小、性能更好，但与 spec 有细微差异，混用 loose/strict 会出问题。

**⚠️ 常见误区**

- ❌ presets 从前到后执行 → presets 从后到前！
- ❌ `@babel/preset-env` 包含了 polyfill → 需要额外配置 `useBuiltIns` 和安装 `core-js`
- ❌ plugin 和 preset 执行顺序一样 → plugin 从前到后，preset 从后到前，且所有 plugin 先于 preset

---
