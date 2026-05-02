# React 并发渲染与 Server Components 心智模型

## 一、并发渲染不是多线程

Concurrent Rendering 的重点不是“同时执行多个线程”，而是 React 可以把一次更新拆成更小的工作单元，并根据优先级暂停、恢复或丢弃尚未提交的渲染结果。

- **紧急更新**：输入框输入、点击反馈，应尽快响应。
- **非紧急更新**：筛选大列表、切换复杂图表，可以放进 transition。
- **提交阶段不可中断**：DOM 修改仍是一次性提交，避免用户看到中间态。

```tsx
import { useMemo, useState, useTransition } from "react";

type Item = { id: string; title: string };

export function SearchList({ items }: { items: Item[] }) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(
    () => items.filter((item) => item.title.includes(query)),
    [items, query],
  );

  return (
    <>
      <input
        value={keyword}
        onChange={(event) => {
          const nextKeyword = event.target.value;
          setKeyword(nextKeyword);
          startTransition(() => setQuery(nextKeyword));
        }}
      />
      {isPending ? <p>更新结果中...</p> : null}
      {filteredItems.map((item) => (
        <p key={item.id}>{item.title}</p>
      ))}
    </>
  );
}
```

**判断标准**：如果某个更新影响“输入是否跟手”，不要放进 transition；如果只是影响“结果区域何时刷新”，可以放进 transition。

## 二、Suspense 的定位

Suspense 是“等待某段 UI 准备好”的边界，不是数据请求库本身。它负责声明 fallback、协调 reveal 顺序，并与 `React.lazy`、框架数据缓存、RSC 流式渲染协作。

常见误区：

- 把所有页面包一个巨大 Suspense，导致 fallback 粒度太粗。
- 在组件 render 中创建不稳定 Promise，造成重复挂起。
- 忽略 Error Boundary，导致 reject 后没有合适的错误 UI。

## 三、Server Components 解决什么问题

Server Components（RSC）的核心是让一部分组件只在服务端执行，产物不是 HTML 字符串，而是可被客户端 React 合并的组件载荷。它主要解决：

1. **减少客户端 JS**：纯展示、数据读取、Markdown 渲染等逻辑无需打包到浏览器。
2. **靠近数据源**：服务端组件可以直接访问数据库、文件系统或内网服务。
3. **保留组件模型**：服务端组件可以组合客户端组件，但客户端组件不能直接导入服务端组件。

## 四、Server / Client 边界

| 场景     | Server Component                 | Client Component                      |
| -------- | -------------------------------- | ------------------------------------- |
| 数据读取 | 适合，靠近数据源                 | 通常通过 API/缓存层读取               |
| 交互状态 | 不支持 Hook 状态和浏览器事件     | 支持 `useState`、事件处理、浏览器 API |
| 包体积   | 不进入客户端 bundle              | 会进入客户端 bundle                   |
| 典型用途 | 页面骨架、详情展示、列表初始数据 | 表单、弹窗、拖拽、富交互组件          |

边界设计原则：默认 Server，必要时 Client。把交互叶子节点标记为 Client，而不是把整个页面都变成 Client。

```tsx
// app/products/page.tsx - Server Component
import { AddToCartButton } from "./AddToCartButton";

export default async function ProductPage() {
  const products = await getProducts();

  return (
    <main>
      {products.map((product) => (
        <section key={product.id}>
          <h2>{product.name}</h2>
          <AddToCartButton productId={product.id} />
        </section>
      ))}
    </main>
  );
}
```

```tsx
// app/products/AddToCartButton.tsx - Client Component
"use client";

import { useState } from "react";

export function AddToCartButton({ productId }: { productId: string }) {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      加入购物车 {productId} × {count}
    </button>
  );
}
```

## 五、面试高频回答模板

- **Concurrent Mode 是什么？** 更准确叫并发特性集合，不是一个必须全局开启的模式。它让 React 能按优先级调度渲染，提升交互响应。
- **RSC 和 SSR 区别？** SSR 生成首屏 HTML，客户端仍需 hydrate 对应组件；RSC 让部分组件只在服务端执行，并把组件树载荷流给客户端合并，可减少客户端 JS。
- **什么时候用 Client Component？** 需要浏览器事件、状态、副作用、DOM API、第三方客户端库时使用。
- **为什么 Server Component 不能传函数给 Client Component？** 跨越网络/序列化边界，函数闭包无法安全序列化；应传可序列化数据或使用 Server Actions。
