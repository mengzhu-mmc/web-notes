# React 19 API 与心智模型速查

> 目标：把 React 19 当作一次“渲染模型 + 数据提交模型 + 资源加载模型”的收敛升级，而不是只背新增 Hook。

## 一、核心心智模型

React 19 延续 React 18 的并发渲染基础，但把“异步数据、表单提交、服务端渲染、资源预加载”这些过去依赖框架或社区库补齐的能力进一步标准化。理解时建议分成三层：

1. **Render 是可中断的**：并发渲染允许 React 在不阻塞高优先级交互的前提下准备 UI。渲染函数必须保持纯净，不要在 render 阶段写外部状态。
2. **Commit 是原子的**：真正修改 DOM 仍发生在提交阶段，用户不会看到半成品 UI。
3. **Async 是 UI 状态的一部分**：请求、提交、乐观更新、错误边界、Suspense fallback 都应被建模为 UI 状态，而不是散落在命令式回调里。

## 二、新增/重点 API

### `useActionState`

用于把“提交动作 + pending 状态 + 返回结果”组合在一起，特别适合表单和服务端动作。

```tsx
import { useActionState } from "react";

async function updateName(prevState: { error?: string }, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "请输入名称" };
  }

  await saveName(name);
  return {};
}

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateName, {});

  return (
    <form action={formAction}>
      <input name="name" aria-label="name" />
      <button disabled={isPending}>{isPending ? "保存中..." : "保存"}</button>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
```

**面试表达**：它把异步 Action 的结果状态收敛到 Hook 内，减少手写 `isLoading/error/data` 三件套，尤其适合渐进增强的表单提交。

### `useOptimistic`

用于在服务端确认前先展示乐观 UI。

```tsx
import { useOptimistic } from "react";

type Comment = { id: string; text: string; pending?: boolean };

export function CommentList({ comments }: { comments: Comment[] }) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (current, text: string) => [
      ...current,
      { id: crypto.randomUUID(), text, pending: true },
    ],
  );

  async function submit(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    addOptimisticComment(text);
    await createComment(text);
  }

  return (
    <form action={submit}>
      {optimisticComments.map((item) => (
        <p key={item.id} style={{ opacity: item.pending ? 0.6 : 1 }}>
          {item.text}
        </p>
      ))}
      <input name="text" />
    </form>
  );
}
```

**注意**：乐观 UI 不是本地最终状态，失败时需要借助 Action 返回值、错误边界或重新拉取数据回滚。

### `use`

`use` 可以在组件中读取 Promise 或 Context。读取 Promise 时会与 Suspense 协作：pending 触发 fallback，reject 交给 Error Boundary。

```tsx
import { Suspense, use } from "react";

function UserName({ userPromise }: { userPromise: Promise<{ name: string }> }) {
  const user = use(userPromise);
  return <span>{user.name}</span>;
}

export function UserCard(props: { userPromise: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={<span>加载中...</span>}>
      <UserName userPromise={props.userPromise} />
    </Suspense>
  );
}
```

**边界**：不要在 render 中临时创建新 Promise，否则每次渲染都可能重新挂起；Promise 应来自框架、缓存层或父组件。

## 三、资源加载 API

React 19 支持更显式地表达资源优先级，例如 `preload`、`preinit`、`preconnect`。它们的价值是让组件在渲染过程中声明自己需要的关键资源，由 React 协调插入资源提示，减少瀑布加载。

```tsx
import { preconnect, preload } from "react-dom";

export function ProductHero() {
  preconnect("https://cdn.example.com");
  preload("https://cdn.example.com/hero.webp", { as: "image" });

  return <img src="https://cdn.example.com/hero.webp" alt="商品主图" />;
}
```

## 四、React Compiler 相关心智

React Compiler 的目标是自动推导一部分 memoization，减少手写 `useMemo/useCallback/memo` 的样板代码。即使没有启用 Compiler，也应该遵守这些约束：

- 组件和 Hook 保持纯函数语义。
- 不在 render 中写外部可变状态。
- props/state 使用不可变更新。
- 不为了“让依赖数组通过”而隐藏真实依赖。

## 五、迁移检查清单

1. 表单提交：优先评估 `useActionState`，减少手动维护 pending/error。
2. 即时反馈：使用 `useOptimistic` 表达乐观 UI，而不是把临时项混入真实服务端列表。
3. 异步读取：Promise 来源必须稳定，并配套 Suspense 与 Error Boundary。
4. 性能优化：先用 Profiler 定位瓶颈，再决定是否保留手写 memo。
5. 类型约束：Action 返回值、表单字段和乐观数据都要补齐 TypeScript 类型，避免 `any` 扩散。
