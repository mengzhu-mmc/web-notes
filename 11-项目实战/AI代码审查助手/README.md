# AI 代码审查助手（Code Review Copilot）

> 把代码粘进去，AI 给你做 Code Review，指出问题 + 给出优化建议。
> 
> **定位**：前端练手项目 · AI 方向 · 面试加分项

---

## 项目截图（待填充）

```
输入区                    输出区
┌──────────────────┐     ┌──────────────────────┐
│  代码编辑器        │     │  🔍 问题列表（带行号）  │
│  (Monaco Editor) │ --> │  💡 优化建议           │
│                  │     │  ✨ 优化后代码（diff）  │
│  语言选择: JS/TS  │     │  ⏱ 流式输出中...      │
└──────────────────┘     └──────────────────────┘
```

---

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 代码编辑器 | @monaco-editor/react |
| AI 接入 | OpenAI API / DeepSeek API |
| 流式渲染 | fetch + ReadableStream（手写，不用 SDK） |
| 样式 | Tailwind CSS |
| Markdown 渲染 | react-markdown + highlight.js |
| 构建 | Vite |
| 部署 | Vercel |

---

## 功能清单

| 优先级 | 功能 | 状态 |
|--------|------|------|
| P0 | 代码输入 + Monaco Editor | ⬜ |
| P0 | AI Review 流式输出（打字机效果） | ⬜ |
| P0 | Markdown 格式化渲染结果 | ⬜ |
| P1 | Review 历史记录（localStorage） | ⬜ |
| P1 | AbortController 取消请求 | ⬜ |
| P2 | Diff 对比视图 | ⬜ |
| P2 | 多轮追问对话 | ⬜ |
| P3 | 快捷模板（bad code 样例） | ⬜ |

---

## 快速开始

```bash
# 1. 克隆项目（待建仓库）
git clone https://github.com/mengzhu-mmc/code-review-copilot.git

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 填入 VITE_API_KEY=your_api_key

# 4. 启动开发服务器
pnpm dev
```

---

## 3 周开发计划

| 周 | 目标 | 关键任务 |
|----|------|---------|
| Week 1 | 框架搭建 | Vite + React + TS 初始化、Monaco Editor 集成、最简 AI 调用（非流式先跑通） |
| Week 2 | 核心功能 | 流式渲染实现、Markdown 输出、历史记录 |
| Week 3 | 打磨上线 | Diff 视图、Vercel 部署、README 完善 |

---

## 相关文档

- [技术实现详解](./技术实现详解.md) — 核心技术点深入讲解（面试必备）
- [Prompt 设计](./Prompt设计.md) — System Prompt 工程设计思路

---

## 面试话术

> "我做了一个 AI Code Review 工具，核心亮点是手写了 SSE 流式渲染而不依赖 SDK，用 `ReadableStream` + `TextDecoder` 逐块处理响应，实现打字机效果。
> 同时用 `AbortController` 处理取消重复请求，集成了 Monaco Editor（VS Code 同款），用结构化 Prompt 让 AI 输出标准格式的 Review 报告。"
