# Next.js 与 Nuxt.js 对比

> 面试考点：SSR 框架选型、文件路由、数据获取模式

---

## 一、框架定位

| 对比项 | Next.js | Nuxt.js |
|--------|---------|---------|
| 基础框架 | React | Vue 3 |
| 维护团队 | Vercel | Nuxt 团队（社区驱动） |
| 设计理念 | 灵活、显式、底层 | 开箱即用、约定优于配置 |
| 路由方案 | 文件系统路由（App Router） | 文件系统路由（基于 vue-router） |
| 服务端引擎 | Next.js 内置（Edge Runtime / Node.js） | Nitro（轻量跨平台） |

**选择原则**：React 技术栈选 Next.js，Vue 技术栈选 Nuxt.js。两者功能高度对称，理念各有侧重。

---

## 二、路由系统

### Next.js App Router

```
app/
  layout.tsx          ← 根布局（持久化）
  page.tsx            ← 首页 /
  about/
    page.tsx          ← /about
  blog/
    [slug]/
      page.tsx        ← /blog/:slug（动态路由）
  (auth)/             ← 路由分组（不影响 URL）
    login/page.tsx
```

特殊文件：`layout.tsx`（持久布局）、`loading.tsx`（流式加载）、`error.tsx`（错误边界）、`not-found.tsx`

### Nuxt.js pages 目录

```
pages/
  index.vue           ← /
  about.vue           ← /about
  blog/
    [slug].vue        ← /blog/:slug
```

Nuxt 3 支持自动导入：`components/`、`composables/` 目录下的文件无需 `import` 直接使用。

---

## 三、渲染模式对比

两者都支持以下渲染模式：

| 模式 | 说明 | 适合场景 |
|------|------|---------|
| **SSR** 服务端渲染 | 每次请求在服务器渲染 | 实时数据、个性化内容 |
| **SSG** 静态生成 | 构建时预渲染为 HTML | 博客、文档、营销页 |
| **CSR** 客户端渲染 | 纯 SPA | 后台管理系统 |
| **ISR** 增量静态再生 | SSG + 定时/按需重新生成 | 商品列表等频繁但不实时的场景 |

---

## 四、数据获取

### Next.js（App Router）

```tsx
// 服务端组件直接 async/await（推荐）
async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetch(`/api/posts/${params.slug}`).then(r => r.json());
  return <article>{post.content}</article>;
}

// 客户端数据获取（用 'use client' 标记）
'use client';
import { useEffect, useState } from 'react';
function ClientComponent() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/data').then(r => r.json()).then(setData); }, []);
}

// ISR：revalidate 控制缓存时间
async function ProductList() {
  const data = await fetch('/api/products', {
    next: { revalidate: 60 } // 每 60 秒重新生成
  }).then(r => r.json());
}
```

### Nuxt.js

```vue
<script setup>
// useFetch：SSR + 客户端复用数据（推荐）
const { data: post } = await useFetch(`/api/posts/${route.params.slug}`)

// useAsyncData：更灵活的异步数据获取
const { data, pending, error } = await useAsyncData('products', () =>
  $fetch('/api/products')
)
</script>
```

**核心区别**：Next.js 在 App Router 下直接用原生 `fetch` + `async/await`；Nuxt.js 提供封装好的 `useFetch`/`useAsyncData`，自动处理 SSR 水合和客户端数据复用。

---

## 五、Server Components（Next.js 特有）

Next.js App Router 中组件默认是 Server Components，不会向客户端发送 JS：

```tsx
// server component（默认）— 零客户端 JS
async function HeavyList() {
  const items = await db.items.findAll(); // 直接访问数据库
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}

// client component — 需要交互时加 'use client'
'use client';
function LikeButton({ id }: { id: number }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>❤️</button>;
}
```

**优势**：减少客户端 JS 体积、首屏加载更快、可直接访问数据库/文件系统。

---

## 六、部署对比

| | Next.js | Nuxt.js |
|--|---------|---------|
| 最优平台 | **Vercel**（原生支持，自动优化） | 任意平台（Nitro 跨平台） |
| 自托管 | Node.js 服务 / Docker | Node.js / Bun / Deno / Cloudflare Workers |
| 静态导出 | `next export`（部分限制） | `nuxt generate`（全静态） |
| Edge 计算 | ✅ Edge Runtime | ✅ Cloudflare Workers（Nitro） |

---

## 七、面试总结

**Q：Next.js 和 Nuxt.js 的最大区别是什么？**

框架基础不同（React vs Vue），设计哲学不同（显式灵活 vs 约定省力）。Next.js App Router 引入了 React Server Components，将服务端/客户端代码分离得更彻底；Nuxt 3 的 Nitro 引擎更轻量，跨平台部署体验更好。

**Q：为什么要用这类框架，而不是直接用 React/Vue？**

解决了三个核心问题：①SEO（SSR/SSG 生成真实 HTML）；②首屏性能（服务端直出减少白屏）；③路由约定（文件即路由，减少配置成本）。
