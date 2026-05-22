from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/mira/.session/109002763539/web-notes')
REACT = ROOT / '05-React'
PLAN = ROOT / '99-其他' / '知识库整理规划.md'
TODAY = '2026-05-22'

SOURCES = {
    'react19': 'https://react.dev/blog/2024/12/05/react-19',
    'react192': 'https://react.dev/blog/2025/10/01/react-19-2',
    'rsc': 'https://react.dev/reference/rsc/server-components',
    'compiler': 'https://react.dev/learn/react-compiler',
}


def render(template: str) -> str:
    text = template.replace('__TODAY__', TODAY)
    for key, value in SOURCES.items():
        text = text.replace(f'__{key.upper()}__', value)
    return text


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.write_text(text.rstrip() + '\n', encoding='utf-8')


def append_once(path: Path, marker: str, section: str) -> bool:
    text = read(path)
    if marker in text:
        return False
    write(path, text + '\n\n' + section.strip() + '\n')
    return True


def insert_before(path: Path, needle: str, marker: str, section: str) -> bool:
    text = read(path)
    if marker in text:
        return False
    if needle not in text:
        return append_once(path, marker, section)
    text = text.replace(needle, section.strip() + '\n\n' + needle, 1)
    write(path, text)
    return True


def ensure_index_link() -> bool:
    path = REACT / '00-🌟索引.md'
    text = read(path)
    marker = '[React 重复知识点合并索引]'
    if marker in text:
        return False
    target = '## 待继续整理\n\n'
    addition = '- [React 重复知识点合并索引](./React重复知识点合并索引.md)：标记课程笔记与主干文档的重复区域，后续合并时优先保留主干文档。\n'
    if target in text:
        text = text.replace(target, target + addition, 1)
    else:
        text += '\n\n## 待继续整理\n\n' + addition
    write(path, text)
    return True


def create_dedupe_index() -> bool:
    path = REACT / 'React重复知识点合并索引.md'
    marker = '# React 重复知识点合并索引'
    content = render('''# React 重复知识点合并索引

> Updated: __TODAY__ based on local note inspection. This file is a merge map rather than a deletion list; original course notes are kept until manual confirmation.

## 合并原则

1. **主干文档优先**：面向复习和实践的主干文档作为最新入口；课程笔记保留原始上下文与历史讲解。
2. **新版本优先**：React 18/19/19.2 的并发、RSC、Actions、Compiler 相关内容优先覆盖 React 16/17 时代的历史说法。
3. **不直接删除**：重复文件只标记“建议合并到哪里”，不在未确认的情况下删除。
4. **补 TS 类型**：新增示例优先使用 `tsx`，明确 props、返回值、泛型和 DOM ref 类型。

## 重复知识点分流表

| 知识点 | 推荐主入口 | 重复/历史来源 | 处理建议 |
| --- | --- | --- | --- |
| Hooks 工作机制与依赖 | [React Hooks 深入实战指南](./React_Hooks原理与实战避坑.md) | `课程笔记/02-Hooks/*`、[手写自定义 Hook 合集](./手写自定义Hook合集.md) | 主干文档沉淀规则、反例和 TS 模板；课程笔记保留讲解过程 |
| Fiber / Concurrent Mode | [React Fiber 架构与虚拟 DOM](./React_Fiber与Concurrent_Mode详解.md) | `课程笔记/03-Fiber与虚拟DOM/*` | 主干文档补 React 18/19 并发 API；课程笔记作为历史推导 |
| SSR / RSC / Server Actions | [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)、[React SSR 实现原理](./React_SSR实现原理.md) | Next.js 对比、旧 SSR 笔记 | 主干文档保持官方 API 差异；框架文档只保留落地差异 |
| 性能优化 / memo | [React 性能优化实战](./React性能优化指南.md)、[React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md) | 课程笔记性能章节、Hooks 依赖优化 | 手写 memo 经验迁移为“Compiler 前后如何判断” |
| 状态管理 / Redux | [React 状态管理方案对比](./React状态管理方案对比.md) | Redux 课程笔记、useReducer 模拟 Redux | 主干文档保留选型矩阵；课程笔记保留原理细节 |

## 本轮已合并的口径

- 将 React 19/19.2、RSC、Concurrent Mode、Compiler 统一纳入主索引的现代 React 路径。
- 对新增示例统一补充 TypeScript 类型，减少 `any`、隐式 ref 返回值和不完整 props 的示例。
- Vue 相关内容本轮不继续扩写，只保留既有笔记；后续巡检默认优先 React。

## 后续可执行动作

1. 把 `课程笔记/02-Hooks` 中“依赖数组、闭包、Effect 清理”的重复段落抽象进主干 Hooks 文档。
2. 把 `课程笔记/03-Fiber与虚拟DOM/16-Fiber架构下Concurrent模式实现原理.md` 的历史实现细节压缩为“React 16/17 历史背景”。
3. 将性能优化章节中手写 `memo/useMemo/useCallback` 的建议补充“React Compiler 开启后如何降级为例外优化”。
''')
    if path.exists() and marker in read(path):
        return False
    write(path, content)
    return True


def update_react19_doc() -> bool:
    section = render('''## React 19/19.2 API Delta Checklist（__TODAY__）

> Updated: __TODAY__ based on official React docs: __REACT19__, __REACT192__, __RSC__.

### 1. React 19：从“手写异步状态”到 Actions

React 19 的主线是把数据提交过程纳入 React 调度模型：

- `useActionState`：让 Action 的返回值、pending 状态和表单提交绑定在一起。
- `<form action={fn}>` / `formAction`：DOM 表单可以直接接收函数，成功后自动 reset 非受控表单。
- `useFormStatus`：设计系统按钮能读取父级 form 的 pending 状态，不再层层传 props。
- `useOptimistic`：请求进行中先展示乐观 UI；失败后 React 能回退到真实状态。
- `use(resource)`：render 阶段读取 Promise 或 Context；读取 Promise 时必须来自 Suspense 兼容缓存，避免在 Client Component render 内新建 Promise。

```tsx
import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';

interface Todo {
  id: string;
  text: string;
}

interface ActionResult {
  error?: string;
}

async function addTodoAction(
  previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const text = String(formData.get('text') ?? '').trim();
  if (!text) return { error: '请输入内容' };
  await createTodo(text);
  return {};
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving...' : 'Add'}</button>;
}

export function TodoForm({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (current: Todo[], text: string): Todo[] => [
      ...current,
      { id: `optimistic-${Date.now()}`, text },
    ],
  );
  const [state, formAction] = useActionState(addTodoAction, {});

  return (
    <form
      action={(formData) => {
        addOptimisticTodo(String(formData.get('text') ?? ''));
        formAction(formData);
      }}
    >
      <input name="text" />
      <SubmitButton />
      {state.error ? <p role="alert">{state.error}</p> : null}
      <ul>{optimisticTodos.map((todo) => <li key={todo.id}>{todo.text}</li>)}</ul>
    </form>
  );
}
```

### 2. React 19.2：后台 UI、Effect Event 与 SSR Resume

React 19.2 继续把并发能力产品化：

- `<Activity mode="hidden" />`：隐藏子树但保留状态，隐藏时清理 Effects，并把隐藏更新降级处理。
- `useEffectEvent`：把 Effect 内部的“事件逻辑”从同步逻辑中拆出，事件逻辑读取最新 props/state，但不触发 Effect 重跑。
- `cacheSignal`：RSC 场景下感知 `cache()` 生命周期结束，便于中断 fetch 或清理异步任务。
- Performance Tracks：Chrome Performance 面板中查看 Scheduler 与 Components 轨道，定位 transition、blocking update、effect mount 等耗时。
- Partial Pre-rendering：`prerender` 返回 `prelude` 和 `postponed`，请求阶段再用 `resume` / `resumeToPipeableStream` 恢复动态内容。

### 3. RSC 常见误区修正

- Server Component **没有** `'use server'` 指令；默认由框架/RSC bundler 决定服务端边界。
- `'use client'` 标记 Client Component 边界；边界以下代码会进入客户端 bundle。
- `'use server'` 用于 Server Functions / Server Actions，让客户端拿到可调用引用。
- Server Component 可以是 `async function`；Client Component 不支持 async component，但可以用 `use(promise)` 读取从服务端传下来的 Promise。
- RSC 稳定面向使用者；实现 RSC bundler/framework 的底层 API 在 React 19.x 仍建议 pin 具体版本。
''')
    return insert_before(
        REACT / 'React18-19新特性与Server_Components.md',
        '## 参考资料',
        '## React 19/19.2 API Delta Checklist',
        section,
    )


def update_concurrent_doc() -> bool:
    section = render('''## 现代 Concurrent API 心智模型（__TODAY__）

> Updated: __TODAY__ based on official React 19.2 release notes: __REACT192__.

Concurrent Mode 不应该再理解成一个需要整体打开的“模式开关”，而是一组可组合 API：React 根据更新优先级、Suspense 边界和用户输入，把工作切片、暂停、恢复或丢弃。

### API 对照

| API / 能力 | 解决的问题 | 典型使用 |
| --- | --- | --- |
| `startTransition` / `useTransition` | 把非紧急更新标记为 transition，避免阻塞输入 | 搜索过滤、路由切换、重型列表更新 |
| `useDeferredValue(value, initialValue?)` | 让派生 UI 滞后于高优先级输入；React 19 支持初始值 | 输入框实时响应，结果区延迟刷新 |
| `<Suspense>` | 为异步数据或 lazy 组件提供可中断边界 | RSC、路由分块、懒加载 |
| `<Activity />` | 隐藏但保留 UI 状态，并降低隐藏更新优先级 | Tab、返回恢复、下一页预渲染 |
| Performance Tracks | 观察 React 调度和组件渲染轨迹 | 定位 transition 是否被阻塞、effect 是否过重 |

### TypeScript 示例：输入优先，列表延后

```tsx
import { ChangeEvent, useDeferredValue, useMemo, useState, useTransition } from 'react';

interface Product {
  id: string;
  name: string;
  tags: string[];
}

interface ProductSearchProps {
  products: Product[];
}

export function ProductSearch({ products }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query, '');

  const visibleProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery),
    );
  }, [deferredQuery, products]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    startTransition(() => {
      setQuery(nextQuery);
    });
  }

  return (
    <section aria-busy={isPending}>
      <input value={query} onChange={handleChange} />
      <ProductList products={visibleProducts} />
    </section>
  );
}
```

### 判断口诀

1. 用户正在输入、点击、拖拽时，交互反馈优先。
2. 列表过滤、图表重算、路由内容切换可以进入 transition。
3. 数据/代码未就绪时用 Suspense 边界兜底，而不是把 loading 状态散落在多层组件里。
4. 只是暂时不可见但马上可能回来，用 `<Activity />`；真正不再需要才卸载。
5. 性能问题先用 Performance Tracks 验证优先级和耗时，再决定是否手写 memo 或拆分边界。
''')
    return append_once(
        REACT / 'React_Fiber与Concurrent_Mode详解.md',
        '## 现代 Concurrent API 心智模型',
        section,
    )


def update_compiler_doc() -> bool:
    section = render('''## 与 TypeScript、手写 memo 的协作边界（__TODAY__）

> Updated: __TODAY__ based on official React Compiler docs: __COMPILER__.

React Compiler 更偏好“类型清晰、数据不可变、render 纯净”的代码。TypeScript 本身不会让组件更快，但它能把编译器难以证明的模式提前暴露出来。

### 推荐写法

```tsx
interface PriceTagProps {
  price: number;
  currency: 'CNY' | 'USD';
  formatter?: Intl.NumberFormat;
}

export function PriceTag({ price, currency, formatter }: PriceTagProps) {
  const label = formatter
    ? formatter.format(price)
    : new Intl.NumberFormat('zh-CN', {
        style: 'currency',
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
''')
    return append_once(
        REACT / 'React_Compiler自动记忆化.md',
        '## 与 TypeScript、手写 memo 的协作边界',
        section,
    )


def update_plan() -> bool:
    section = render('''### 2026-05-22 React 巡检补充

- 新增 `05-React/React重复知识点合并索引.md`，将 Hooks、Fiber/Concurrent、SSR/RSC、性能优化、Redux 等重复知识点映射到主干入口；未直接删除原始课程笔记。
- `React18-19新特性与Server_Components.md` 补齐 React 19/19.2 API Delta Checklist，覆盖 Actions、`useActionState`、`useOptimistic`、`use`、`<Activity />`、`useEffectEvent`、`cacheSignal`、Partial Pre-rendering 与 RSC 指令误区。
- `React_Fiber与Concurrent_Mode详解.md` 补齐现代 Concurrent API 心智模型，强调 Concurrent 不再是单一模式开关，而是 `startTransition`、`useDeferredValue`、`Suspense`、`Activity` 和 Performance Tracks 的组合。
- `React_Compiler自动记忆化.md` 补充 TypeScript 示例与手写 memo 边界，降低低质量示例中的隐式类型和过度 memo 倾向。
- 本轮不扩写 Vue 内容；后续默认优先 React 主线与现代 API。
''')
    return append_once(
        PLAN,
        '### 2026-05-22 React 巡检补充',
        section,
    )


def main() -> None:
    changed = []
    for name, fn in [
        ('dedupe-index', create_dedupe_index),
        ('react-index-link', ensure_index_link),
        ('react19-delta', update_react19_doc),
        ('concurrent-model', update_concurrent_doc),
        ('compiler-ts-boundary', update_compiler_doc),
        ('planning-log', update_plan),
    ]:
        if fn():
            changed.append(name)
    print('changed:', ', '.join(changed) if changed else 'none')


if __name__ == '__main__':
    main()
