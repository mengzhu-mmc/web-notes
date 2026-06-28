# React 19.2 实践心智模型：Activity、Effect Event 与 SSR Resume

> Updated: 2026-05-19 based on official React 19.2 docs and release notes: https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/reference/react/Activity, https://react.dev/reference/react/useEffectEvent

这篇笔记把 React 19.2 的新增能力从“API 清单”整理成实践心智模型，重点回答三个问题：什么时候该保留 UI、什么时候该拆 Effect 事件、什么时候该使用预渲染与恢复渲染。

## 一、React 19.2 的主线

React 19.2 不是简单新增几个 API，而是继续强化三个方向：

1. **后台 UI**：`<Activity />` 让 UI 可以隐藏但不销毁，适合 Tab、路由预加载、返回恢复状态。
2. **Effect 语义拆分**：`useEffectEvent` 把 Effect 中的“事件逻辑”从“同步逻辑”中拆出来。
3. **服务端流水线**：`prerender` / `resume` / `resumeAndPrerender` 让静态壳和动态内容可以分阶段生成。

可以把它们理解为 React 对“并发渲染 + 服务端渲染 + 用户体验”的继续补齐。

## 二、`<Activity />`：隐藏，不等于卸载

传统条件渲染：

```tsx
{
  activeTab === "profile" && <ProfileTab />;
}
```

切走 Tab 时，`ProfileTab` 会卸载，内部 state、未提交表单、DOM 临时状态都会丢失。

React 19.2 可以写成：

```tsx
import { Activity } from "react";

type TabKey = "home" | "profile";

interface TabsProps {
  activeTab: TabKey;
}

export function Tabs({ activeTab }: TabsProps) {
  return (
    <>
      <Activity mode={activeTab === "home" ? "visible" : "hidden"}>
        <HomeTab />
      </Activity>
      <Activity mode={activeTab === "profile" ? "visible" : "hidden"}>
        <ProfileTab />
      </Activity>
    </>
  );
}
```

`hidden` 模式下，React 会：

- 视觉上隐藏 children，通常表现为 `display: none`。
- 清理 children 的 Effects，避免隐藏区域继续订阅、轮询或产生副作用。
- 保留 React state 和可复用的 DOM 状态。
- 以更低优先级处理隐藏子树更新。

## 三、Activity 的适用场景

### 1. Tab 与多步骤表单

适合保留输入框、展开状态、滚动位置、草稿内容。

### 2. 路由预渲染

如果用户很可能进入下一个页面，可以先把页面放在 hidden Activity 中，让 Suspense-enabled 数据源、懒加载组件提前准备。

### 3. 返回上一页恢复状态

列表页进入详情页后，返回时希望恢复筛选条件、滚动位置和局部交互状态。

### 4. Hydration 切片

Activity 边界能帮助 React 把页面拆成可独立 hydration 的单元，让关键交互更早可用。

## 四、Activity 的风险与清理

Activity 隐藏时 Effects 会清理，但 DOM 可能仍然保留。因此视频、音频、iframe 这类 DOM 本身带副作用的元素需要显式清理。

```tsx
import { useLayoutEffect, useRef } from "react";

export function VideoPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useLayoutEffect(() => {
    const video = videoRef.current;
    return () => {
      video?.pause();
    };
  }, []);

  return <video ref={videoRef} controls playsInline src="/demo.mp4" />;
}
```

这里使用 `useLayoutEffect` 是因为暂停视频和 UI 隐藏强相关，应该尽量在视觉变化前后同步完成。

## 五、`useEffectEvent`：Effect 里的事件，不是依赖逃生门

典型问题：Effect 负责连接聊天室，只应该响应 `roomId`；但连接成功后的通知要读取最新的 `theme` 或 `muted`。

错误做法是为了避免重连而删除依赖：

```tsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.on("connected", () => {
    showNotification(theme);
  });
  connection.connect();
  return () => connection.disconnect();
}, [roomId]); // theme 被漏掉，容易产生隐藏 bug
```

React 19.2 推荐拆成 Effect Event：

```tsx
import { useEffect, useEffectEvent } from "react";

interface ChatRoomProps {
  roomId: string;
  muted: boolean;
}

export function ChatRoom({ roomId, muted }: ChatRoomProps) {
  const onConnected = useEffectEvent((connectedRoomId: string) => {
    if (!muted) {
      showNotification(`Connected to ${connectedRoomId}`);
    }
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on("connected", () => onConnected(roomId));
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  return <h1>Room: {roomId}</h1>;
}
```

判断标准：

- 如果某个值变化应该导致 Effect 重新同步，就放进依赖数组。
- 如果某段逻辑只是 Effect 内部触发的事件，并且需要读最新值但不应该触发重同步，才放进 `useEffectEvent`。

## 六、`useEffectEvent` 的边界

不要把 `useEffectEvent` 当成 `eslint-disable` 的替代品。

它有几个限制：

1. 只能在组件或自定义 Hook 顶层调用。
2. 返回的函数只能在 Effect、Layout Effect、Insertion Effect 或其他 Effect Event 中调用。
3. 不要把 Effect Event 放进依赖数组。
4. 不要把 Effect Event 传给子组件或普通事件处理函数。
5. 它的函数 identity 故意不是稳定的，因此不能依赖它做 memo。

## 七、Partial Pre-rendering：静态壳与动态恢复

React 19.2 的 Partial Pre-rendering 允许先生成静态壳，再在请求阶段恢复动态部分。

```tsx
import { resume } from "react-dom/server";
import { prerender } from "react-dom/static";

async function buildShell() {
  const controller = new AbortController();
  const { prelude, postponed } = await prerender(<App />, {
    signal: controller.signal,
  });

  await savePostponedState(postponed);
  return prelude;
}

async function handleRequest(request: Request) {
  const postponed = await getPostponedState(request);
  return resume(<App />, postponed);
}
```

它适合页面中“绝大部分是静态内容，少数区域依赖请求时数据”的场景。

## 八、SSR API 选型

React 19.2 让 Web Streams 版本也能在 Node.js 中使用，但官方仍更推荐 Node Streams API，因为在 Node 环境下通常更快，也更容易接入压缩。

| 场景                    | 推荐 API                                                |
| ----------------------- | ------------------------------------------------------- |
| Node.js 流式 SSR        | `renderToPipeableStream`                                |
| Node.js 恢复 SSR        | `resumeToPipeableStream`                                |
| Edge / Web Streams 环境 | `renderToReadableStream` / `resume`                     |
| 静态预渲染              | `prerender` / `prerenderToNodeStream`                   |
| 恢复后继续预渲染        | `resumeAndPrerender` / `resumeAndPrerenderToNodeStream` |

## 九、学习顺序建议

1. 先理解 `Suspense`、`startTransition`、`useDeferredValue`。
2. 再学习 `<Activity />`，理解“隐藏但保留状态”的 UI 生命周期。
3. 再学习 `useEffectEvent`，重构 Effect 中的非响应式事件逻辑。
4. 最后学习 Partial Pre-rendering，把它放到 SSR / RSC / CDN 缓存的大链路里理解。

## 十、面试回答模板

如果被问“React 19.2 有哪些值得关注的变化”，可以回答：

> React 19.2 的重点是把并发和服务端能力继续产品化。`<Activity />` 让 UI 可以隐藏但保留状态，适合 Tab、路由预加载和返回恢复；`useEffectEvent` 解决 Effect 中事件逻辑读取最新值但不想重同步的问题；`cacheSignal` 让 RSC 缓存生命周期能中断异步任务；Performance Tracks 让 React 调度过程能在 Chrome Performance 面板中观察；服务端方面新增 Partial Pre-rendering 和 resume API，让静态壳和动态内容可以分阶段渲染。

## 十一、巡检补充：Activity / PPR 的工程边界（2026-05-25）

> Updated: 2026-05-25 based on official Activity and React 19.2 docs: https://react.dev/reference/react/Activity, https://react.dev/blog/2025/10/01/react-19-2

- **Activity 适合保留状态，不适合隐藏所有东西**：表单草稿、Tab、即将进入的路由适合；视频、音频、iframe 需要在 Effect cleanup 中暂停或释放资源。
- **hidden Activity 会清理 Effects**：逻辑上接近“暂停副作用但保留状态”，不要依赖隐藏子树继续轮询、订阅或上报。
- **预渲染只对 Suspense-aware 数据源有效**：`lazy`、框架级数据缓存、`use()` 读取的缓存 Promise 可以受益；普通 `useEffect` 里的 fetch 不会被 Activity 预加载捕获。
- **PPR 不是普通 SSR 的替代品**：它适合“静态壳可缓存、动态洞稍后恢复”的页面。若页面强依赖每次请求的实时数据，仍优先使用流式 SSR 或框架的数据缓存策略。

## 十二、useEffectEvent 官方边界补充（2026-05-28）

> Updated: 2026-05-28 based on official useEffectEvent docs: https://react.dev/reference/react/useEffectEvent

`useEffectEvent` 返回的函数不是普通事件处理器，也不是稳定引用。它只能在 `useEffect`、`useLayoutEffect`、`useInsertionEffect` 或同组件内其他 Effect Event 中调用，不能在 render 阶段调用，也不要传给子组件。

### 正确使用场景

- 定时器、订阅、外部连接回调里需要读取最新 props/state。
- 这段逻辑由 Effect 内部触发，但它本身不应该决定 Effect 是否重新同步。
- 例如聊天室连接只依赖 `roomId`，但连接成功提示需要读取最新 `theme` 或 `muted`。

### 不该使用的场景

1. 为了绕过 `exhaustive-deps`，把本该作为依赖的值藏进 Effect Event。
2. 把 Effect Event 当成 `useCallback` 替代品传给子组件。
3. 在点击事件、render 计算或条件分支中直接调用。

一句话判断：**如果逻辑是用户事件，继续用事件处理器；如果逻辑是 Effect 触发的内部事件，才考虑 `useEffectEvent`。**

## 十三、2026-05-31 巡检：PPR、cacheSignal 与稳定/Canary 边界

> Updated: 2026-05-31 based on official React 19.2 docs: https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/reference/react/cacheSignal, https://react.dev/reference/react-dom/static/resumeAndPrerender

### 13.1 Partial Pre-rendering 的两段式模型

React 19.2 的 Partial Pre-rendering 可以理解为“两段式生成”：先用 `prerender` 产出可缓存的静态壳和 `postponed` 状态，再在请求阶段用 `resume` 继续 SSR，或用 `resumeAndPrerender` 继续生成完整静态 HTML。

```tsx
import { prerender, resumeAndPrerender } from "react-dom/static";

interface RenderRequest {
  signal: AbortSignal;
}

async function buildShell({ signal }: RenderRequest) {
  const { prelude, postponed } = await prerender(<App />, { signal });
  await savePostponedState(postponed);
  return prelude;
}

async function completeStaticPage(request: Request) {
  const postponedState = await getPostponedState(request);
  const { prelude } = await resumeAndPrerender(<App />, postponedState, {
    bootstrapScripts: ["/main.js"],
  });
  return new Response(prelude, {
    headers: { "content-type": "text/html" },
  });
}
```

工程判断：如果页面是“静态外壳 + 动态洞”，PPR 有价值；如果页面每次请求都依赖强实时数据，优先考虑 streaming SSR 或框架数据缓存，而不是为了用 PPR 强行拆分。

### 13.2 cacheSignal 的边界

`cacheSignal()` 只在 RSC 渲染与 `cache()` 生命周期内可靠。它返回 `AbortSignal | null`：在渲染之外会返回 `null`，在 Client Component 中目前也总是 `null`。不要把它写成通用取消请求工具。

```tsx
import { cache, cacheSignal } from "react";

const getPost = cache(async (postId: string) => {
  const response = await fetch(`/posts/${postId}`, {
    signal: cacheSignal() ?? undefined,
  });
  return response.json() as Promise<Post>;
});
```

适合场景：RSC 渲染失败、被中止或缓存结果不再需要时，取消仍在进行的 fetch / 数据库查询 / 后台计算。

### 13.3 稳定能力与 Canary 能力不要混答

React 19.2 稳定能力包括 `<Activity />`、`useEffectEvent`、`cacheSignal`、Performance Tracks、PPR 相关 `resume` / `resumeAndPrerender` API。`<ViewTransition />` 和 `addTransitionType` 仍标记为 Canary，不应在“React 19.2 稳定特性”面试回答里当作已稳定 API 展开。

### 13.4 版本升级注意点

- `eslint-plugin-react-hooks@latest` 推荐配置进入 v6，Compiler 相关 lint 可按项目成熟度逐步启用。
- React 19.2 默认 `useId` 前缀调整为 `_r_`，主要是为了兼容 View Transition 和 XML 命名要求；不要依赖生成 ID 的具体字符串。
- Node.js 环境虽然支持 Web Streams 版本 SSR/PPR API，但官方仍更推荐 Node Streams 版本，如 `resumeToPipeableStream`、`prerenderToNodeStream`、`resumeAndPrerenderToNodeStream`。

## 十四、2026-06-10 巡检：View Transition 与 transition type 的 Canary 边界

> Updated: 2026-06-10 based on official React ViewTransition and addTransitionType docs.

React 19.2 的稳定能力已经覆盖 `<Activity />`、`useEffectEvent`、`cacheSignal`、Performance Tracks 与 PPR；但 `<ViewTransition />` 和 `addTransitionType` 仍标记为 Canary / Experimental，不应在“稳定版 React 19.2 必考 API”里和稳定能力混答[[React 19.2 – React]](https://react.dev/blog/2025/10/01/react-19-2)。更准确的心智模型是：稳定版负责 UI 保活、Effect 语义拆分和 SSR/PPR 流水线；Canary 继续探索路由动画、共享元素动画和 Transition 原因标注。

### 14.1 `<ViewTransition />` 的定位

`<ViewTransition>` 用于包裹一棵组件子树，让它在 Transition、Suspense 或 deferred update 触发时参与浏览器 View Transition 动画；它目前只在 React Canary 和 Experimental 渠道可用[[<ViewTransition> – React]](https://react.dev/reference/react/ViewTransition)。

```tsx
import { startTransition, useState, ViewTransition } from "react";

interface VideoCardProps {
  id: string;
  title: string;
}

function VideoCard({ id, title }: VideoCardProps) {
  return (
    <ViewTransition name={`video-${id}`}>
      <article>
        <h3>{title}</h3>
      </article>
    </ViewTransition>
  );
}

export function VideoSwitcher({ videos }: { videos: VideoCardProps[] }) {
  const [index, setIndex] = useState(0);
  const current = videos[index];

  function showNext() {
    startTransition(() => {
      setIndex((value) => (value + 1) % videos.length);
    });
  }

  return (
    <section>
      <button onClick={showNext}>切换视频</button>
      <VideoCard id={current.id} title={current.title} />
    </section>
  );
}
```

使用边界：

- 普通 `setState` 默认不会激活 `<ViewTransition>`；通常需要在 `startTransition`、Suspense 或 `useDeferredValue` 相关更新中触发[[<ViewTransition> – React]](https://react.dev/reference/react/ViewTransition)。
- `name` 只建议用于共享元素动画；非共享元素场景优先让 React 自动生成唯一名称，避免不同边界意外串联动画。
- 同一时间全局不能挂载两个同名 `<ViewTransition>`，列表项要把业务 id 拼进 name。
- enter / exit 动画对边界位置敏感；如果 `<ViewTransition>` 前面已经有 DOM wrapper，可能无法按预期触发。
- React 不会自动处理 `prefers-reduced-motion`，团队需要在 CSS 中尊重用户的减少动效偏好。

### 14.2 `addTransitionType`：标注 Transition 原因，而不是状态管理

`addTransitionType(type)` 用来在 `startTransition` 作用域内给一次 Transition 添加原因标记，它不返回值，且 Transition Types 会在每次 commit 后重置[[addTransitionType – React]](https://react.dev/reference/react/addTransitionType)。

```tsx
import { addTransitionType, startTransition } from "react";

interface NavigateOptions {
  direction: "forward" | "back";
  to: string;
}

function navigate({ direction, to }: NavigateOptions) {
  startTransition(() => {
    addTransitionType(`navigation-${direction}`);
    router.navigate(to);
  });
}
```

它的价值不在于“保存业务状态”，而在于让 View Transition 能按触发原因选择不同动画。多个 transition type 可以被合并收集；当它们匹配 `<ViewTransition>` 的 class 配置时，可以对 forward / back、add / remove、fast / slow 等不同原因使用不同动画[[addTransitionType – React]](https://react.dev/reference/react/addTransitionType)。

```tsx
<ViewTransition
  enter={{
    "navigation-forward": "enter-from-right",
    "navigation-back": "enter-from-left",
    default: "fade-in",
  }}
  exit={{
    "navigation-forward": "exit-to-left",
    "navigation-back": "exit-to-right",
  }}
>
  <RoutePage />
</ViewTransition>
```

### 14.3 面试与落地回答

如果被问 React 19.2 和 View Transition 的关系，可以这样回答：React 19.2 稳定版已经发布了 Activity、Effect Event、cacheSignal、PPR 和 Performance Tracks；`<ViewTransition>` 与 `addTransitionType` 出现在 19.2 文档导航中，但仍属于 Canary / Experimental 渠道，因此项目落地时要把它们当作前瞻能力灰度验证，而不是稳定生产依赖。实际设计路由动画时，可以先用 `<Activity />` 保留隐藏页面状态，再在 Canary 试验中用 `<ViewTransition>` 做 enter / exit / share 动画，并用 `addTransitionType` 区分前进、后退或快速切换等触发原因。

## 十五、2026-06-28 巡检：Effect Event 与 prerender 的误用边界

> Updated: 2026-06-28 based on official React 19.2 API references.

本轮补充两个容易被误解的细节：`useEffectEvent` 的返回函数**不是稳定 callback**，`prerender` 也**不是流式 SSR 的同义词**。这两个边界都影响面试表达和真实项目选型。

### 15.1 Effect Event 不是稳定引用，也不是依赖逃生门

`useEffectEvent` 返回的 Effect Event 会读取最新提交的 props/state，但它只能在 `useEffect`、`useLayoutEffect`、`useInsertionEffect` 或同组件内其他 Effect Event 中调用[[useEffectEvent – React]](https://react.dev/reference/react/useEffectEvent)。官方同时强调，Effect Event 函数的 identity 会在每次 render 改变，不应放入依赖数组，也不要传给子组件或普通 Hook[[useEffectEvent – React]](https://react.dev/reference/react/useEffectEvent)。

```tsx
import { useEffect, useEffectEvent } from "react";

interface ChatRoomProps {
  roomId: string;
  muted: boolean;
}

export function ChatRoom({ roomId, muted }: ChatRoomProps) {
  const onConnected = useEffectEvent(() => {
    if (!muted) {
      showToast("Connected");
    }
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on("connected", onConnected);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  return null;
}
```

判断标准：

- `roomId` 决定外部连接，应保留在依赖数组。
- `muted` 只是连接成功后读取的最新 UI 状态，不应导致重连，因此放入 Effect Event。
- 如果某个值本来就应该触发重新订阅、重新请求或重新同步，不要把它藏进 Effect Event。

### 15.2 `prerender` 等待数据完成，不等于 streaming SSR

`prerender` 用于静态服务端生成，返回 `prelude` Web Stream 和可选 `postponed` 状态；它会等待所有数据加载完成后再 resolve，适合 SSG，而不是“边加载边发”的流式 SSR[[prerender – React]](https://react.dev/reference/react-dom/static/prerender)。如果目标是内容加载时逐步流式输出，应优先考虑 `renderToReadableStream` 等 SSR API[[prerender – React]](https://react.dev/reference/react-dom/static/prerender)。

```tsx
import { prerender } from "react-dom/static";

export async function renderStaticPage() {
  const { prelude, postponed } = await prerender(<App />, {
    bootstrapScripts: ["/main.js"],
  });

  if (postponed) {
    await savePostponedState(postponed);
  }

  return new Response(prelude, {
    headers: { "content-type": "text/html" },
  });
}
```

补充边界：

1. `prerender` 的 Web Streams 版本适合 Web Streams 环境；Node.js 中应使用 `prerenderToNodeStream`[[prerender – React]](https://react.dev/reference/react-dom/static/prerender)。
2. `prerender` 可被 abort，后续可用 `resumeAndPrerender` 或 `resume` 继续支持 PPR[[prerender – React]](https://react.dev/reference/react-dom/static/prerender)。
3. `prerender` 不支持 `nonce` 选项；官方指出 nonce 应按请求唯一生成，把 nonce 固化进 prerender 产物不合适也不安全[[prerender – React]](https://react.dev/reference/react-dom/static/prerender)。

面试收束：`useEffectEvent` 解决的是 Effect 内部事件读取最新值的问题，不是通用稳定 callback；`prerender` 解决的是静态生成和 PPR 静态壳问题，不是替代 streaming SSR。
