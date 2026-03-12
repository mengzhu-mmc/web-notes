# Next.js 与 Nuxt.js 对比

## 核心区别

Next.js 基于 React，由 Vercel 团队开发维护；Nuxt.js 基于 Vue，受 Next.js 启发而诞生。选择哪个框架完全取决于你的技术栈：React 选 Next.js，Vue 选 Nuxt.js。

## 设计理念

Next.js 继承 React 哲学，相对更底层和灵活，强调"显式"。最新的 App Router 全面引入 React Server Components，将服务端和客户端代码边界划分得非常清晰。

Nuxt.js 继承 Vue 哲学，主打"开箱即用"和极佳的开发者体验。具有强大的自动导入（Auto-imports）功能，`components`、`composables` 目录下的文件无需 `import` 即可直接使用。

## 路由系统

两者都采用基于文件系统的路由（File-system Routing）。Next.js 主推 `app` 目录路由，利用 `page.tsx`、`layout.tsx` 等特殊文件构建页面和布局。Nuxt.js 使用 `pages` 目录，基于 `vue-router`，`.vue` 文件直接映射为路由。

## 服务端能力与部署

两者都支持 SSR、SSG、CSR 和 ISR。Next.js 与 Vercel 平台深度绑定，在 Vercel 上部署体验最佳（支持 Edge 边缘计算）。Nuxt 3 引入了 Nitro 服务端引擎，非常轻量、跨平台，可方便部署到 Cloudflare、Netlify、Vercel 等各种 Serverless 和边缘计算平台。

## 数据获取

Next.js 在 App Router 中直接在服务端组件中使用原生 `fetch()` 配合 `async/await`（旧版使用 `getServerSideProps`/`getStaticProps`）。Nuxt.js 提供专用的组合式 API `useFetch` 和 `useAsyncData`，完美处理服务端到客户端的水合（Hydration）和数据复用。

## 附：Docker 容器与前端

Docker 是轻量级虚拟化技术，前端开发者需要了解的场景包括：将打包好的静态文件和 Nginx 一起打包成 Docker 镜像进行部署、用 Docker 跑本地数据库方便全栈调试、CI/CD 构建过程在 Docker 容器中进行。

## 附：Redux Ducks 模式

Ducks 模式将同一模块的 action types、reducer 和 action creators 写在同一个文件中，避免早期 Redux 开发中加一个功能要改三个文件的痛苦。配合容器组件（Container Components，负责与状态库交互）和展示组件（Presentational Components，只负责 UI）的分层架构使用。
