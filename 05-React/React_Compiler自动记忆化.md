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
