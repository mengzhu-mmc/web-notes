# React Compiler 自动记忆化心智模型

> Updated: 2026-05-19 based on official React Compiler docs: https://react.dev/learn/react-compiler

React Compiler 的目标是让 React 自动优化组件和 Hook 中的重复计算，减少手写 `useMemo`、`useCallback` 和 `React.memo` 的需求。它不是新的运行时状态管理库，而是一个编译阶段优化器。

## 一、React Compiler 解决什么问题

在传统 React 性能优化中，我们经常手动写：

```tsx
const visibleItems = useMemo(() => filterItems(items, query), [items, query]);

const handleSelect = useCallback(
  (id: string) => {
    onSelect(id);
  },
  [onSelect],
);

export default memo(ItemList);
```

这些 API 本身没问题，但大型项目里会出现两个问题：

1. **心智负担高**：开发者需要判断哪里需要 memo，哪里不需要。
2. **依赖容易错**：依赖数组遗漏或过度依赖都会带来 bug 或无效优化。

React Compiler 试图把一部分可证明安全的 memoization 交给编译器处理，让开发者更专注于数据流和 UI 逻辑。

## 二、它不是“自动让所有代码变快”

React Compiler 不是魔法。它依赖 React 组件和 Hook 满足 React 的纯函数规则。

适合被优化的代码通常具备这些特征：

- render 阶段没有副作用。
- props、state、context 的读取是可追踪的。
- 不在 render 中修改外部变量。
- 不依赖不稳定的全局状态。
- 组件和 Hook 遵守 Rules of React。

如果代码本身违反纯度规则，编译器可能跳过优化、报错，或者要求你重构。

## 三、和 `useMemo` / `useCallback` / `memo` 的关系

React Compiler 的方向是减少手写 memo，而不是完全废弃这些 API。

可以这样理解：

| 能力     | 手写 memo          | React Compiler     |
| -------- | ------------------ | ------------------ |
| 触发时机 | 运行时 Hook / HOC  | 编译阶段分析       |
| 维护成本 | 需要维护依赖数组   | 由编译器推导       |
| 风险     | 依赖错误、过度优化 | 受限于可分析代码   |
| 适用场景 | 局部精确控制       | 大多数常规组件优化 |

迁移时不要急着删除所有 memo。更合理的方式是：先启用编译器检查，再逐步移除明显冗余的手写 memo。

## 四、渐进式接入策略

官方文档建议支持增量采用。对已有项目来说，不建议一开始全量启用。

推荐顺序：

1. 升级 `eslint-plugin-react-hooks`，先暴露不符合编译器预期的写法。
2. 在新模块或低风险页面开启编译。
3. 观察行为、性能和构建报错。
4. 对违反纯度的组件做重构。
5. 再逐步扩大到核心业务模块。

## 五、代码风格建议

为了让代码更容易被 React Compiler 优化，建议遵守：

### 1. render 保持纯净

```tsx
// 🔴 不推荐：render 中修改外部变量
let lastUserId: string | null = null;

function UserCard({ userId }: { userId: string }) {
  lastUserId = userId;
  return <div>{userId}</div>;
}
```

```tsx
// ✅ 推荐：需要同步外部系统时放进 Effect
function UserCard({ userId }: { userId: string }) {
  useEffect(() => {
    syncCurrentUser(userId);
  }, [userId]);

  return <div>{userId}</div>;
}
```

### 2. 派生数据优先写成普通表达式

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
}

function ProductList({
  products,
  keyword,
}: {
  products: Product[];
  keyword: string;
}) {
  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(keyword.toLowerCase()),
  );

  return visibleProducts.map((product) => (
    <ProductItem key={product.id} product={product} />
  ));
}
```

在编译器能够分析的情况下，这类派生计算可以由编译器优化，而不一定需要手写 `useMemo`。

### 3. 不要为了性能牺牲语义

如果某段逻辑本来就是事件处理，保留事件处理函数；如果是 Effect 同步外部系统，就写 Effect。不要为了“让引用稳定”把逻辑硬塞到不合适的 Hook 里。

## 六、指令：`"use memo"` 与 `"use no memo"`

React Compiler 提供函数级指令用于控制编译行为：

```tsx
function ExpensiveList({ items }: { items: string[] }) {
  "use memo";
  return items.map((item) => <div key={item}>{item}</div>);
}
```

```tsx
function DebugOnlyPanel() {
  "use no memo";
  return <pre>{Date.now()}</pre>;
}
```

实际使用时应谨慎：默认优先让配置和 linter 驱动整体策略，指令只用于少数确实需要局部控制的地方。

## 七、常见误区

1. **误以为不需要理解性能了**：Compiler 降低 memo 成本，但你仍要理解渲染、状态位置和组件边界。
2. **误以为所有 useMemo 都要删除**：对大型对象、第三方库适配、明确需要稳定引用的场景，仍可能需要手动控制。
3. **忽视纯度规则**：Compiler 会放大代码纯度问题，老项目要先修基础规则。
4. **全量一键启用**：大型项目更适合渐进式接入。

## 八、和 React 19.2 的关系

React 19.2 同步强化了 `eslint-plugin-react-hooks` 和 Compiler 相关规则。可以把 Compiler 看成 React 未来性能优化方向的一部分：开发者写更符合 React 语义的代码，编译器负责做更多机械化优化。

## 九、面试回答模板

如果被问“React Compiler 是什么”，可以回答：

> React Compiler 是 React 的编译阶段优化器，核心目标是自动推导安全的 memoization，减少手写 useMemo、useCallback 和 React.memo 的需求。它依赖组件和 Hook 遵守纯函数规则，因此不是无脑提速工具。实际落地时，我会先通过 eslint-plugin-react-hooks 暴露不符合规则的代码，再在低风险模块增量开启，逐步减少冗余手写 memo。

## 与 TypeScript、手写 memo 的协作边界（2026-05-22）

> Updated: 2026-05-22 based on official React Compiler docs: https://react.dev/learn/react-compiler.

React Compiler 更偏好“类型清晰、数据不可变、render 纯净”的代码。TypeScript 本身不会让组件更快，但它能把编译器难以证明的模式提前暴露出来。

### 推荐写法

```tsx
interface PriceTagProps {
  price: number;
  currency: "CNY" | "USD";
  formatter?: Intl.NumberFormat;
}

export function PriceTag({ price, currency, formatter }: PriceTagProps) {
  const label = formatter
    ? formatter.format(price)
    : new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency,
      }).format(price);

  return <span>{label}</span>;
}
```

这类组件的输入、输出和派生值都在 render 内可追踪，适合交给 Compiler 自动优化。

### 仍然需要人工判断的情况

- 跨组件的昂贵缓存，例如大型虚拟列表索引、图表布局、富文本解析。
- 依赖第三方库且库内部有可变状态，Compiler 可能无法安全证明。
- 需要稳定引用作为外部协议，例如传给非 React 系统的订阅/取消订阅 API。
- 已经通过 profiling 证明某个 `memo` 边界有收益，并且 Compiler 尚未覆盖该路径。

### 迁移建议

1. 先打开 `eslint-plugin-react-hooks@latest` 的推荐规则，修复 purity、refs、immutability 等问题。
2. 对新代码默认不急着手写 `useMemo/useCallback`；先保持组件纯净和类型明确。
3. 对历史性能代码保留已有 memo，等 Compiler + profiling 证明无收益后再删除。
4. 用 `'use memo'` / `'use no memo'` 这类指令做局部控制，而不是一次性全仓库切换。

## 九、2026-05 巡检：Compiler 渐进接入策略

> Updated: 2026-05-28 based on official React Compiler docs: https://react.dev/learn/react-compiler

React Compiler 官方推荐把接入拆成“安装、增量启用、调试排错、配置参考”几个阶段。对已有业务仓库来说，不建议一次性全量开启，而是先让 lint 暴露不符合 React 纯度规则的组件，再逐步扩大编译范围。

### 推荐落地顺序

1. **先修规则**：优先处理 render 阶段副作用、可变对象写入、Hook 条件调用、依赖数组不完整等问题。
2. **再开局部编译**：从低风险、纯展示组件开始启用 Compiler，观察渲染行为和性能曲线。
3. **保留手写 memo 的例外**：第三方库边界、上下文 Provider、大列表 item、昂贵 selector 等场景仍可保留人工优化。
4. **用指令做局部控制**：`"use memo"` 用于明确希望编译器优化的函数，`"use no memo"` 用于排除不适合编译的函数。
5. **用性能面板验证收益**：不要把“少写 useMemo”误解为“必然更快”，最终仍以 React DevTools 和 Performance Tracks 的数据为准。

### 面试回答补充

> React Compiler 不是替代 React 运行时的新框架，而是把一部分安全的 memoization 移到编译阶段。它能减少手写 `useMemo/useCallback/memo` 的样板代码，但前提是组件遵守纯函数和 Hooks 规则。真实项目里我会用增量启用策略，先让 lint 和小范围模块验证稳定性，再逐步迁移。

## 十、2026-05-31 巡检：Compiler 与 hooks lint v6

> Updated: 2026-05-31 based on official React Compiler and React 19.2 docs: https://react.dev/learn/react-compiler, https://react.dev/blog/2025/10/01/react-19-2

React 19.2 同步推进了 `eslint-plugin-react-hooks` v6 和 Compiler 相关 lint。对已有项目来说，推荐先把 lint 当成“可编译性体检”，而不是一上来就追求全量编译。

### 推荐接入顺序

1. 使用最新 hooks lint 暴露 `rules-of-hooks`、`exhaustive-deps`、`purity`、`immutability`、`refs`、`set-state-in-render` 等问题。
2. 先修 render 阶段副作用、可变对象写入、条件 Hook、依赖数组缺失。
3. 在纯展示组件、无复杂第三方状态的模块小范围开启 Compiler。
4. 使用 Performance Tracks / React DevTools 对比开启前后的 render 与 commit 成本。
5. 对已经通过 profiling 证明有效的大列表、Context Provider、第三方库边界，继续保留人工 memo，等编译器覆盖和性能数据都确认后再删除。

### 代码质量原则

- TypeScript 类型要表达清楚 props、action state、Promise payload 和 DOM ref。
- 不要为了让 Compiler 接受而隐藏真实依赖；该同步的 Effect 仍然要同步。
- `"use memo"` / `"use no memo"` 应作为局部控制工具，而不是替代架构拆分和性能分析。

## 十一、2026-06-07 巡检：Compiler 指令与 compilationMode 边界

> Updated: 2026-06-07 based on official React Compiler docs.

React Compiler 的接入不应只理解成“打开自动 memo”，还要同时理解 **指令、编译模式、命名约定、临时逃生门** 四层边界。默认心智模型可以概括为：项目级 `compilationMode` 决定编译器扫描范围；函数或模块顶部的 directive 只在少数场景里覆盖默认策略；违反 React 纯度和 Hook 规则的代码依然应该先重构，而不是靠 directive 强行绕过。

### 1. `"use memo"`：显式 opt-in，而不是常规性能注释

`"use memo"` 会标记一个函数交给 React Compiler 优化，但官方更推荐先依赖项目级配置和命名约定；只有在 `annotation` 模式、或少数无法被 `infer` 命名规则识别的函数中，才需要显式添加它[["use memo" – React]](https://react.dev/reference/react-compiler/directives/use-memo)。

```tsx
function ProductGrid({ products }: { products: Product[] }) {
  "use memo";

  const visibleProducts = products.filter((product) => product.available);
  return visibleProducts.map((product) => (
    <ProductCard key={product.id} product={product} />
  ));
}
```

使用边界：

- directive 必须放在函数体最前面，位于任何表达式或变量声明之前。
- 只能使用单引号或双引号字符串字面量，不能使用模板字符串。
- 字符串必须精确匹配 `"use memo"`。
- 如果同一位置有多个 directive，只有第一个会被编译器处理。
- 在 `infer` 模式中，如果一个组件或 Hook 没有被识别，优先修正命名：组件使用 PascalCase，Hook 使用 `use` 前缀，而不是到处添加 `"use memo"`。

### 2. `"use no memo"`：临时逃生门，不是长期架构策略

`"use no memo"` 会阻止某个函数被 React Compiler 优化，而且优先级高于所有 `compilationMode`；它适合临时隔离编译器问题、第三方库兼容问题或灰度期间的风险函数，但不应该成为永久方案[["use no memo" – React]](https://react.dev/reference/react-compiler/directives/use-no-memo)。

```tsx
function LegacyChart({ data }: { data: ChartPoint[] }) {
  "use no memo";
  // TODO(compiler): 第三方图表库依赖可变实例，完成适配后移除此逃生门。
  return <Chart data={data} />;
}
```

落地规则：

1. 每个 `"use no memo"` 都要写清楚原因、负责人或跟踪 issue。
2. 能缩小到函数级就不要放到模块级，避免整文件失去编译收益。
3. 定期巡检并移除已经不需要的 opt-out。
4. 如果问题来自 render 副作用、可变 props、Hook 违规或手写 memo 依赖错误，应优先修代码，而不是长期 opt-out。

### 3. `compilationMode` 四种模式怎么选

React Compiler 的 `compilationMode` 支持 `infer`、`annotation`、`syntax`、`all`，默认值是 `infer`[[compilationMode – React]](https://react.dev/reference/react-compiler/compilationMode)。

| 模式         | 编译范围                         | 适合场景                     | 风险与建议                         |
| ------------ | -------------------------------- | ---------------------------- | ---------------------------------- |
| `infer`      | 推断组件、Hook，以及显式标注函数 | 默认推荐；大多数 React 项目  | 依赖命名约定和 JSX / Hook 使用特征 |
| `annotation` | 只编译带 `"use memo"` 的函数     | 老项目、小范围灰度、风险隔离 | 需要人工标注，覆盖率较低           |
| `syntax`     | Flow component / hook syntax     | 使用 Flow 新语法的项目       | TypeScript 项目通常不适用          |
| `all`        | 所有 top-level functions         | 极少数受控代码库或实验性验证 | 可能编译非 React 工具函数，不推荐  |

实践建议：

- 新项目或规则较好的 React 项目：优先使用默认 `infer`。
- 历史包袱重、还没完成 lint 修复的项目：先用 `annotation` 小范围试点。
- TypeScript 项目：不要选择 `syntax` 作为常规方案，因为它面向 Flow component / hook syntax。
- 不建议直接上 `all`，因为工具函数、数据转换函数、非 React 入口也可能被纳入编译范围。
- 不论选择哪种模式，带有 `"use no memo"` 的函数都会被跳过。

### 4. 团队接入检查清单

1. 先升级 `eslint-plugin-react-hooks`，修复纯度、不可变性、Hook 调用顺序和依赖问题。
2. 使用 `infer` 或 `annotation` 做灰度，不要一开始全仓 `all`。
3. 对每个 `"use no memo"` 建立台账，记录原因和计划移除时间。
4. 通过 React DevTools 的 memo 标识、构建产物或性能基线验证收益，不要仅凭“加了 Compiler”判断性能变好。
5. 手写 `useMemo/useCallback/memo` 暂时保留，等编译覆盖稳定后再逐步删除明显冗余的优化。

面试表达可以这样收束：React Compiler 的核心不是让开发者手动给每个组件加 directive，而是通过编译器在遵守 React 纯函数规则的前提下自动推导 memoization；`"use memo"` 是显式 opt-in，`"use no memo"` 是临时 opt-out，`compilationMode` 决定默认编译范围，团队落地时应优先修正规则违规和命名问题，再决定是否扩大编译范围。
