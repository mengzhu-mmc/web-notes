from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/mira/.session/109002763539/web-notes')
TODAY = '2026-05-25'


def replace_once(path: Path, old: str, new: str) -> bool:
    text = path.read_text(encoding='utf-8')
    if old not in text:
        return False
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


def append_once(path: Path, marker: str, section: str) -> bool:
    text = path.read_text(encoding='utf-8')
    if marker in text:
        return False
    path.write_text(text.rstrip() + '\n\n' + section.strip() + '\n', encoding='utf-8')
    return True


def insert_before(path: Path, needle: str, marker: str, section: str) -> bool:
    text = path.read_text(encoding='utf-8')
    if marker in text:
        return False
    if needle not in text:
        return append_once(path, marker, section)
    path.write_text(text.replace(needle, section.rstrip() + '\n\n' + needle, 1), encoding='utf-8')
    return True


def update_react19() -> list[str]:
    changed: list[str] = []
    path = ROOT / '05-React' / 'React18-19新特性与Server_Components.md'

    if replace_once(
        path,
        '''function Comments({ commentsPromise }) {
  // 如果 promise 还在 pending，组件会 suspend（交给 Suspense 显示 loading）
  const comments = use(commentsPromise);
  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.text}</li>
      ))}
    </ul>
  );
}''',
        '''interface Comment {
  id: string;
  text: string;
}

interface CommentsProps {
  commentsPromise: Promise<Comment[]>;
}

function Comments({ commentsPromise }: CommentsProps) {
  // 如果 promise 还在 pending，组件会 suspend（交给 Suspense 显示 loading）
  const comments = use(commentsPromise);
  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}''',
    ):
        changed.append('typed React 19 use() comments example')

    if replace_once(
        path,
        '''function UserProfile({ userId, showDetails }) {
  // ✅ use() 可以放在 if 里！普通 Hook 不行
  if (showDetails) {
    const details = use(fetchUserDetails(userId));
    return <div>{details.bio}</div>;
  }
  return <div>基本信息</div>;
}''',
        '''interface UserDetails {
  bio: string;
}

interface UserProfileProps {
  userId: string;
  showDetails: boolean;
}

function UserProfile({ userId, showDetails }: UserProfileProps) {
  // ✅ use() 可以放在 if 里！普通 Hook 不行
  if (showDetails) {
    const details = use(fetchUserDetails(userId) as Promise<UserDetails>);
    return <div>{details.bio}</div>;
  }
  return <div>基本信息</div>;
}''',
    ):
        changed.append('typed conditional use() example')

    if replace_once(
        path,
        '''function NewInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}''',
        '''import type { ComponentProps, Ref } from "react";

type NewInputProps = ComponentProps<"input"> & {
  ref?: Ref<HTMLInputElement>;
};

function NewInput({ ref, ...props }: NewInputProps) {
  return <input ref={ref} {...props} />;
}''',
    ):
        changed.append('typed React 19 ref-as-prop example')

    if replace_once(
        path,
        '''function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title} - 我的博客</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}''',
        '''interface BlogPostModel {
  title: string;
  summary: string;
  slug: string;
  content: string;
}

function BlogPost({ post }: { post: BlogPostModel }) {
  return (
    <article>
      <title>{post.title} - 我的博客</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}''',
    ):
        changed.append('typed React 19 metadata example')

    checklist = '''
## 十三、React 19/19.2 官方巡检补充（__TODAY__）

> Updated: __TODAY__ based on official React 19 and React 19.2 release notes: https://react.dev/blog/2024/12/05/react-19, https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/reference/rsc/server-components

### 13.1 RSC 指令边界再确认

- Server Component **没有**专门的 `"use server"` 指令；没有写 `"use client"` 的组件是否作为 Server Component 运行，取决于框架和 bundler 的 RSC 集成。
- `"use client"` 标记客户端边界，边界内可以使用 state、Effect、事件处理和浏览器 API。
- `"use server"` 用于 Server Functions / Server Actions，表示该异步函数在服务端执行，并由框架把引用传给客户端。
- RSC 的稳定性要分两层理解：面向应用和库作者的 RSC 能力在 React 19 稳定；实现 RSC bundler/framework 的底层 API 在 19.x 内仍建议锁定具体版本。

### 13.2 Actions 不是表单专属

React 19 的 Actions 本质是“异步 transition 的约定”：它可以统一 pending、错误、乐观更新和顺序提交。`<form action>` 是最常见入口，但 `startTransition(async () => ...)`、`useActionState`、`useOptimistic` 组合也适合按钮点击、列表变更等非表单场景。

```tsx
interface RenameState {
  error?: string;
}

async function renameAction(
  previousState: RenameState,
  formData: FormData,
): Promise<RenameState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "名称至少 2 个字符" };
  }
  await updateName(name);
  return {};
}
```

### 13.3 React 19.2 与并发心智模型的连接

- `<Activity />` 可以视为“可隐藏、可降优先级、可恢复状态”的 UI 分区，不是简单替代 `display: none`。
- `useEffectEvent` 把 Effect 内部事件从同步依赖中拆出，避免因为读取最新 UI 状态而重建订阅。
- `cacheSignal` 只面向 RSC 缓存生命周期，用于在渲染失败、被中止或缓存不再需要时中断异步工作。
- Performance Tracks 把 Scheduler 和 Components 维度暴露到 Chrome Performance 面板，适合定位 transition、Suspense、Effect 导致的耗时。

### 13.4 代码质量落地规则

1. 新增 React 示例默认使用 `tsx`，补齐 props、action state、DOM ref、Promise payload 类型。
2. 涉及 `ref` 回调时不要隐式返回 DOM 节点，避免 React 19 ref cleanup 与 TypeScript 类型冲突。
3. `use()` 读取 Promise 时，Promise 应来自父级、框架缓存或 Suspense 数据源，不在 Client Component render 中临时创建。
4. Server Actions 示例避免写真实密钥、内网域名或公司私有接口；只保留抽象业务函数名。
'''.replace('__TODAY__', TODAY)
    if append_once(path, '## 十三、React 19/19.2 官方巡检补充', checklist):
        changed.append('appended React 19/19.2 official inspection checklist')

    return changed


def update_react192() -> list[str]:
    changed: list[str] = []
    path = ROOT / '05-React' / 'React19.2实践心智模型.md'
    if replace_once(
        path,
        '''import { prerender, resume } from "react-dom/static";

async function buildShell() {''',
        '''import { resume } from "react-dom/server";
import { prerender } from "react-dom/static";

async function buildShell() {''',
    ):
        changed.append('fixed React 19.2 resume import source')

    section = f'''
## 十一、巡检补充：Activity / PPR 的工程边界（{TODAY}）

> Updated: {TODAY} based on official Activity and React 19.2 docs: https://react.dev/reference/react/Activity, https://react.dev/blog/2025/10/01/react-19-2

- **Activity 适合保留状态，不适合隐藏所有东西**：表单草稿、Tab、即将进入的路由适合；视频、音频、iframe 需要在 Effect cleanup 中暂停或释放资源。
- **hidden Activity 会清理 Effects**：逻辑上接近“暂停副作用但保留状态”，不要依赖隐藏子树继续轮询、订阅或上报。
- **预渲染只对 Suspense-aware 数据源有效**：`lazy`、框架级数据缓存、`use()` 读取的缓存 Promise 可以受益；普通 `useEffect` 里的 fetch 不会被 Activity 预加载捕获。
- **PPR 不是普通 SSR 的替代品**：它适合“静态壳可缓存、动态洞稍后恢复”的页面。若页面强依赖每次请求的实时数据，仍优先使用流式 SSR 或框架的数据缓存策略。
'''
    if append_once(path, '## 十一、巡检补充：Activity / PPR 的工程边界', section):
        changed.append('appended Activity and PPR engineering boundaries')
    return changed


def update_concurrent() -> list[str]:
    changed: list[str] = []
    path = ROOT / '05-React' / 'React_Fiber与Concurrent_Mode详解.md'
    text = path.read_text(encoding='utf-8')
    if '```tsxx' in text or '```tsxxx' in text:
        text = text.replace('```tsxxx', '```text').replace('```tsxx', '```text')
        path.write_text(text, encoding='utf-8')
        changed.append('normalized invalid tsxx/tsxxx fences to text in Fiber notes')

    section = '''
## 现代并发 API 巡检补充（__TODAY__）

> Updated: __TODAY__ based on React 19.2 release notes and Activity docs: https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/reference/react/Activity

### 并发不是“全局开关”

现代 React 里更建议把并发理解为一组可组合能力：`startTransition` 标记非紧急更新，`useTransition` 暴露 pending 状态，`useDeferredValue` 延迟消费高频输入，`Suspense` 切分等待边界，`<Activity />` 则让隐藏子树以更低优先级继续准备。

```tsx
import { Activity, Suspense, useDeferredValue, useState, useTransition } from "react";

interface Product {
  id: string;
  title: string;
}

interface SearchPageProps {
  products: Product[];
}

export function SearchPage({ products }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          startTransition(() => setShowPreview(nextQuery.length > 0));
        }}
      />
      {isPending && <span>更新结果中...</span>}
      <Suspense fallback={<p>加载搜索结果...</p>}>
        <SearchResults products={products} query={deferredQuery} />
      </Suspense>
      <Activity mode={showPreview ? "visible" : "hidden"}>
        <RecommendationPreview query={deferredQuery} />
      </Activity>
    </>
  );
}
```

### 调试顺序

1. 先用 React DevTools / Chrome Performance Tracks 确认是 render、commit、effect 还是网络等待慢。
2. 输入卡顿优先考虑 `startTransition` 和 `useDeferredValue`。
3. 切换页面丢状态或重复加载，优先考虑 `<Activity />` 与 Suspense 边界。
4. 服务端首屏等待过长，再考虑 streaming SSR、RSC、Partial Pre-rendering 的架构拆分。
'''.replace('__TODAY__', TODAY)
    if append_once(path, '## 现代并发 API 巡检补充', section):
        changed.append('appended modern concurrent API supplement')
    return changed


def update_dedupe() -> list[str]:
    changed: list[str] = []
    path = ROOT / '05-React' / 'React重复知识点合并索引.md'
    section = '''
## __TODAY__ 巡检补充

- React 19/19.2 新增内容继续收敛到 `React18-19新特性与Server_Components.md` 与 `React19.2实践心智模型.md`，避免在课程笔记中重复扩写。
- Fiber/Concurrent 的历史实现细节保留在 `React_Fiber与Concurrent_Mode详解.md`，新增 API 只补充“如何判断优先级、如何调试”的心智模型。
- 对短小占位文件和课程原文保留索引映射，不直接删除；低信息量文件由 `99-其他/低信息量文件合并索引.md` 和 `知识库整理规划.md` 继续跟踪。
- Vue 相关内容本轮不扩写，仅参与敏感信息和格式化巡检。
'''.replace('__TODAY__', TODAY)
    if append_once(path, f'## {TODAY} 巡检补充', section):
        changed.append('updated React dedupe map')
    return changed


def main() -> None:
    changes: list[str] = []
    for fn in (update_react19, update_react192, update_concurrent, update_dedupe):
        changes.extend(fn())
    print('\n'.join(changes) if changes else 'no changes')


if __name__ == '__main__':
    main()
