from __future__ import annotations

from pathlib import Path

ROOT = Path('/home/mira/.session/109002763539/web-notes')
REACT = ROOT / '05-React'
INDEX = REACT / '00-🌟索引.md'
TODO = ROOT / '99-其他' / '知识库整理规划.md'

DOCS: dict[str, str] = {
    'React19.2实践心智模型.md': '''# React 19.2 实践心智模型：Activity、Effect Event 与 SSR Resume

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
{activeTab === 'profile' && <ProfileTab />}
```

切走 Tab 时，`ProfileTab` 会卸载，内部 state、未提交表单、DOM 临时状态都会丢失。

React 19.2 可以写成：

```tsx
import { Activity } from 'react';

type TabKey = 'home' | 'profile';

interface TabsProps {
  activeTab: TabKey;
}

export function Tabs({ activeTab }: TabsProps) {
  return (
    <>
      <Activity mode={activeTab === 'home' ? 'visible' : 'hidden'}>
        <HomeTab />
      </Activity>
      <Activity mode={activeTab === 'profile' ? 'visible' : 'hidden'}>
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
import { useLayoutEffect, useRef } from 'react';

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
  connection.on('connected', () => {
    showNotification(theme);
  });
  connection.connect();
  return () => connection.disconnect();
}, [roomId]); // theme 被漏掉，容易产生隐藏 bug
```

React 19.2 推荐拆成 Effect Event：

```tsx
import { useEffect, useEffectEvent } from 'react';

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
    connection.on('connected', () => onConnected(roomId));
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
import { prerender, resume } from 'react-dom/static';

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

| 场景 | 推荐 API |
| --- | --- |
| Node.js 流式 SSR | `renderToPipeableStream` |
| Node.js 恢复 SSR | `resumeToPipeableStream` |
| Edge / Web Streams 环境 | `renderToReadableStream` / `resume` |
| 静态预渲染 | `prerender` / `prerenderToNodeStream` |
| 恢复后继续预渲染 | `resumeAndPrerender` / `resumeAndPrerenderToNodeStream` |

## 九、学习顺序建议

1. 先理解 `Suspense`、`startTransition`、`useDeferredValue`。
2. 再学习 `<Activity />`，理解“隐藏但保留状态”的 UI 生命周期。
3. 再学习 `useEffectEvent`，重构 Effect 中的非响应式事件逻辑。
4. 最后学习 Partial Pre-rendering，把它放到 SSR / RSC / CDN 缓存的大链路里理解。

## 十、面试回答模板

如果被问“React 19.2 有哪些值得关注的变化”，可以回答：

> React 19.2 的重点是把并发和服务端能力继续产品化。`<Activity />` 让 UI 可以隐藏但保留状态，适合 Tab、路由预加载和返回恢复；`useEffectEvent` 解决 Effect 中事件逻辑读取最新值但不想重同步的问题；`cacheSignal` 让 RSC 缓存生命周期能中断异步任务；Performance Tracks 让 React 调度过程能在 Chrome Performance 面板中观察；服务端方面新增 Partial Pre-rendering 和 resume API，让静态壳和动态内容可以分阶段渲染。
''',
    'React_Compiler自动记忆化.md': '''# React Compiler 自动记忆化心智模型

> Updated: 2026-05-19 based on official React Compiler docs: https://react.dev/learn/react-compiler

React Compiler 的目标是让 React 自动优化组件和 Hook 中的重复计算，减少手写 `useMemo`、`useCallback` 和 `React.memo` 的需求。它不是新的运行时状态管理库，而是一个编译阶段优化器。

## 一、React Compiler 解决什么问题

在传统 React 性能优化中，我们经常手动写：

```tsx
const visibleItems = useMemo(() => filterItems(items, query), [items, query]);

const handleSelect = useCallback((id: string) => {
  onSelect(id);
}, [onSelect]);

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

| 能力 | 手写 memo | React Compiler |
| --- | --- | --- |
| 触发时机 | 运行时 Hook / HOC | 编译阶段分析 |
| 维护成本 | 需要维护依赖数组 | 由编译器推导 |
| 风险 | 依赖错误、过度优化 | 受限于可分析代码 |
| 适用场景 | 局部精确控制 | 大多数常规组件优化 |

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

function ProductList({ products, keyword }: { products: Product[]; keyword: string }) {
  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(keyword.toLowerCase()),
  );

  return visibleProducts.map((product) => <ProductItem key={product.id} product={product} />);
}
```

在编译器能够分析的情况下，这类派生计算可以由编译器优化，而不一定需要手写 `useMemo`。

### 3. 不要为了性能牺牲语义

如果某段逻辑本来就是事件处理，保留事件处理函数；如果是 Effect 同步外部系统，就写 Effect。不要为了“让引用稳定”把逻辑硬塞到不合适的 Hook 里。

## 六、指令：`"use memo"` 与 `"use no memo"`

React Compiler 提供函数级指令用于控制编译行为：

```tsx
function ExpensiveList({ items }: { items: string[] }) {
  'use memo';
  return items.map((item) => <div key={item}>{item}</div>);
}
```

```tsx
function DebugOnlyPanel() {
  'use no memo';
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
''',
    'React学习路线图.md': '''# React 学习路线图

> 这篇笔记用于把 React 目录从“文件集合”整理成“可入门、可进阶、可复习”的学习路径。

## 一、先建立 React 的核心问题意识

React 解决的不是“如何写组件”这么简单，而是如何把 UI 描述、状态变化和 DOM 更新组织成可维护的系统。

学习 React 时建议始终围绕四个问题：

1. **组件如何描述 UI**：JSX、props、state、条件渲染、列表渲染。
2. **状态变化如何触发渲染**：setState、批处理、render/commit、闭包快照。
3. **React 如何协调更新**：Virtual DOM、Fiber、优先级、并发渲染。
4. **应用如何工程化落地**：路由、状态管理、性能优化、SSR、RSC。

## 二、推荐学习路径

### 阶段 1：组件与状态基础

目标：能写出可维护的组件。

1. [React JSX 原理与 Fragment 深度解析](./React组件单根元素原因.md)
2. [React 组件设计模式](./React组件设计模式.md)
3. [React 自定义 Hook 与自定义组件区别](./React自定义Hook与组件区别.md)
4. [手写自定义 Hook 合集](./手写自定义Hook合集.md)

### 阶段 2：Hooks 与闭包

目标：理解为什么 Hook 依赖、闭包、Effect 容易出 bug。

1. [React Hooks 深入实战指南](./React_Hooks原理与实战避坑.md)
2. [聊透 React 闭包陷阱与底层执行机制](./React闭包陷阱与底层执行机制解析.md)
3. [React 19.2 实践心智模型](./React19.2实践心智模型.md)

### 阶段 3：Fiber 与并发渲染

目标：理解 React 为什么能中断、恢复、分优先级调度。

1. [React Fiber 架构与虚拟 DOM](./React_Fiber与Concurrent_Mode详解.md)
2. [React 性能优化实战](./React性能优化指南.md)
3. [React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)

### 阶段 4：现代 React：React 19、RSC、SSR

目标：理解客户端组件、服务端组件、Server Actions、SSR Streaming 和 Resume。

1. [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)
2. [React SSR 实现原理](./React_SSR实现原理.md)
3. [Next.js 与 Nuxt.js 对比](./Next.js与Nuxt.js对比.md)

### 阶段 5：应用架构与面试复习

1. [React 状态管理方案对比](./React状态管理方案对比.md)
2. [useReducer 与 useContext 模拟 Redux](./useReducer与useContext模拟Redux.md)
3. [React 路由模式详解](./React路由模式详解.md)
4. [React 合成事件机制](./React合成事件机制.md)

## 三、不要一开始就陷入源码细节

源码课和 Fiber 细节很重要，但不建议作为第一站。更好的路径是：

```text
会写组件 → 理解 Hooks 和 Effect → 理解渲染过程 → 理解 Fiber 与并发 → 理解 SSR/RSC → 回看源码
```

这样学习时每个底层概念都有实际问题作为锚点。

## 四、React 目录后续整理方向

- 将课程笔记中的 React 16 生命周期内容归档为“历史演进”。
- 将 Hooks 课程笔记与现有 Hooks 主干文档继续合并。
- 将 Fiber 课程笔记和 Concurrent Mode 主干文档继续去重。
- 将 React 19 / 19.2 / RSC / SSR 作为现代 React 主线继续补齐。
''',
}


def write(path: Path, content: str) -> None:
    path.write_text(content.rstrip() + '\n', encoding='utf-8')


def update_index() -> None:
    content = '''# 05-React · React

> Hooks、Fiber、RSC、并发渲染、React 19/19.2。本索引按“组件基础 → Hooks → Fiber/并发 → React 19/RSC/SSR → 架构与面试”组织，而不只是文件清单。

## 学习定位

- **模块职责**：沉淀 React 核心概念、现代 API、底层机制、工程实践和面试复习材料。
- **学习目标**：先能写可维护组件，再理解 Hooks、Fiber、并发渲染、RSC、SSR 与性能优化。
- **索引约定**：本文是中文主索引；`README.md` 仅作为兼容入口。

## 推荐学习路径

### 0. 总路线

1. [React 学习路线图](./React学习路线图.md)
2. [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)
3. [React 19.2 实践心智模型](./React19.2实践心智模型.md)

### 1. 组件与 Hooks

1. [React JSX 原理与 Fragment 深度解析](./React组件单根元素原因.md)
2. [React 组件设计模式](./React组件设计模式.md)
3. [React Hooks 深入实战指南](./React_Hooks原理与实战避坑.md)
4. [React 自定义 Hook 与自定义组件区别](./React自定义Hook与组件区别.md)
5. [手写自定义 Hook 合集](./手写自定义Hook合集.md)

### 2. Fiber、并发与性能

1. [React Fiber 架构与虚拟 DOM](./React_Fiber与Concurrent_Mode详解.md)
2. [React 性能优化实战](./React性能优化指南.md)
3. [React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)
4. [React 闭包陷阱与底层执行机制](./React闭包陷阱与底层执行机制解析.md)

### 3. 现代 React：RSC、SSR、Server Actions

1. [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)
2. [React SSR 实现原理](./React_SSR实现原理.md)
3. [Next.js 与 Nuxt.js 对比](./Next.js与Nuxt.js对比.md)

### 4. 状态、路由、事件与架构

1. [React 状态管理方案对比](./React状态管理方案对比.md)
2. [useReducer 与 useContext 模拟 Redux](./useReducer与useContext模拟Redux.md)
3. [React 路由模式详解](./React路由模式详解.md)
4. [React 合成事件机制](./React合成事件机制.md)

## 本轮新增补齐

- [React 学习路线图](./React学习路线图.md)：把 React 目录从文件集合整理成入门/进阶/复习路径。
- [React 19.2 实践心智模型](./React19.2实践心智模型.md)：补齐 Activity、useEffectEvent、Partial Pre-rendering、SSR Resume 的实践判断。
- [React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)：补齐 React Compiler、自动 memoization、渐进式接入和 TS 示例。

## 子目录

- [ahooks 源码解析](./ahooks源码解析/) — 3 篇笔记
- [课程笔记](./课程笔记/) — 25 篇笔记

## 待继续整理

- 将 React 16 生命周期课程笔记归档为历史演进，不再作为主线入口。
- 合并 Hooks 课程笔记与 Hooks 主干文档中的重复内容。
- 合并 Fiber/Concurrent Mode 课程笔记与主干文档中的重复内容。
- 继续围绕 React 19/19.2、RSC、SSR、React Compiler 更新现代 React 主线。

## 整理记录

- 当前 Markdown 文档数：48
- 待合并、待删除和断链问题统一记录在 [知识库整理规划](../99-其他/知识库整理规划.md)。
'''
    write(INDEX, content)


def update_modern_doc() -> None:
    path = REACT / 'React18-19新特性与Server_Components.md'
    text = path.read_text(encoding='utf-8', errors='ignore')
    marker = '## 九、参考资料\n'
    addition = '''## 九、React 19.2 后的学习补充：Compiler 与 Effect 语义

> Updated: 2026-05-19 based on official React Compiler docs: https://react.dev/learn/react-compiler

React 19.2 之后，现代 React 的学习重点还需要补上一条线：**编译器如何帮助开发者减少手写 memoization**。

过去我们常用 `useMemo`、`useCallback`、`React.memo` 手动控制渲染性能，但这些 API 很容易被滥用：依赖数组写错会产生 bug，过度 memo 又会增加阅读成本。React Compiler 的方向是：在代码满足 React 纯度规则的前提下，由编译器自动推导安全的 memoization。

这意味着未来写 React 组件时更应该关注：

1. render 阶段保持纯净，不读写不可追踪的外部可变状态。
2. 派生数据尽量写成直接、可分析的表达式。
3. Effect 只用于同步外部系统，不把业务计算塞进 Effect。
4. `useEffectEvent` 用于 Effect 内部事件，而不是规避依赖数组。
5. 手写 memo 仍然可以保留，但应逐步从“默认写”变成“有明确证据再写”。

更完整的整理见：[React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)。

'''
    if addition.strip() not in text:
        if marker in text:
            text = text.replace(marker, addition + marker)
        else:
            text = text.rstrip() + '\n\n' + addition
        path.write_text(text, encoding='utf-8')


def update_todo() -> None:
    if not TODO.exists():
        return
    text = TODO.read_text(encoding='utf-8', errors='ignore')
    marker = '## 待合并主题\n\n'
    insert = '- React：本轮补齐 React 学习路线、React 19.2 实践心智模型和 React Compiler 自动记忆化；后续继续合并 Hooks、Fiber、Concurrent Mode 课程笔记到主干文档。\n'
    if insert not in text and marker in text:
        text = text.replace(marker, marker + insert)
        TODO.write_text(text, encoding='utf-8')


def main() -> None:
    for name, content in DOCS.items():
        write(REACT / name, content)
    update_index()
    update_modern_doc()
    update_todo()
    print('optimized React notes with modern API mental models and learning path')


if __name__ == '__main__':
    main()
