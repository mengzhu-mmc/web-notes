# AI 学习资料索引

> 维护原则：官方 / 一手资料优先；社区文章用于拓展视角；每条资料都要标注学习用途，避免收藏后不复习。

## 〇、系统课程（原理打底）

### 微软《面向初学者的生成式 AI》（中文版）

- [generative-ai-for-beginners / translations / zh-CN](https://github.com/microsoft/generative-ai-for-beginners/tree/main/translations/zh-CN)
  - 用途：A 线（原理）主教材，21 课系统覆盖 GenAI 概念到应用落地。
  - 重点章节：01 简介、04/05 提示工程、07 聊天应用、08 搜索与向量库、11 函数调用、13 安全、15 RAG、17 AI 代理。
  - 课程同时提供 Python 与 TypeScript 代码示例，适合前端工程师边学边写。
  - 配套执行计划见 `91-AI前端/AI学习计划-执行版-原理与应用.md`。

## 一、Agent 协议与工具连接

### Model Context Protocol（MCP）

- [What is the Model Context Protocol (MCP)?](https://modelcontextprotocol.io/docs/getting-started/intro)
  - 用途：理解 MCP 的定位、生态和基本能力。
  - 重点：AI 应用连接外部系统、工具、数据源和工作流的标准化方式。
- 仓库内配套笔记：`09-工程化/MCP协议原理与协作流程.md`
  - 用途：复习 Host / Client / Server / Tool 的分工和完整协作流程。

### Agent2Agent（A2A）

- [Announcing the Agent2Agent Protocol (A2A)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
  - 用途：理解多 Agent 互操作协议的背景。
  - 重点：能力发现、任务管理、消息协作、artifact、长任务与企业级认证授权。

### Agent User Interaction（AG-UI）

- [AG-UI Overview](https://docs.ag-ui.com/introduction)
  - 用途：理解 Agent 与用户界面之间的事件协议。
  - 重点：流式事件、共享状态、工具输出渲染、人工中断、生成式 UI。

## 二、AI 前端与 TypeScript 工具链

### Vercel AI SDK

- [AI SDK by Vercel](https://ai-sdk.dev/docs/introduction)
  - 用途：学习 TypeScript AI 应用开发的主流抽象。
  - 重点：AI SDK Core、AI SDK UI、工具调用、流式输出、MCP、Agent、RAG。
- [AI SDK 5](https://vercel.com/blog/ai-sdk-5)
  - 用途：理解 type-safe chat、Agentic Loop Control、工具状态、消息持久化等实践方向。
  - 重点：UIMessage / ModelMessage 分离、Data Parts、工具调用状态和前后端类型安全。

### LangChain.js（全栈 AI · 选修）

> 定位：对应知识地图「选修方向 → 全栈 AI」。React + Node 主线（AI SDK）完成后再投入；不适合作为第一套 AI 框架。

- [LangChain.js 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview)
  - 用途：LangChain.js 1.x 主框架（`createAgent`、`tool`、模型集成）。
  - 重点：1.0 断代重构后的包结构——`langchain`（Agent 主入口）、`@langchain/core`（消息与 LCEL）、`@langchain/classic`（经典组件如 MemoryVectorStore）、`@langchain/textsplitters`（切分器）。
- [LangGraph.js](https://docs.langchain.com/oss/javascript/langgraph/overview)
  - 用途：有状态的多步 Agent 编排（挂起/恢复、检查点、人工介入）。
  - 重点：StateGraph、interrupt、agentic RAG；对照实战04 的手写审批挂起。
- [LangSmith](https://docs.langchain.com/langsmith/home)
  - 用途：Agent/链路可观测平台（trace、token、延迟）。
  - 重点：只需两个环境变量即可接入，观察一次 RAG 调用全链路。
- 仓库内配套教程：`91-AI前端/实战教程/实战08-LangChain重写RAG.md`
  - 用途：与实战03 手写 RAG 逐工序对照，验证框架抽象的等价物。

## 三、仓库内学习入口

- `91-AI前端/AI前端工程师指南.md`
  - 当前 AI 前端总纲，适合从 LLM 基础、Prompt、API 调用、流式输出开始复习。
- `91-AI前端/本周AI知识归档-2026-06.md`
  - 本周 AI / Agent / AI 前端认知归档。
- `91-AI前端/AI学习计划-前端工程师4周路线.md`
  - 4 周学习计划，适合按天执行。
- `09-工程化/MCP协议原理与协作流程.md`
  - MCP 深入原理与协作流程。
- `92-前端周报/技术雷达-2026Q1.md`
  - AI 与前端融合趋势观察。
- `91-AI前端/实战教程/`
  - 4 篇 React + Node 渐进式实战教程：手写流式聊天 → AI SDK 重构 → RAG 知识库问答 → Agent 工具调用与审批流，入口见 [实战教程 README](./实战教程/README.md)。

## 四、项目练习资料

### 练习 1：流式聊天 UI

- 输入：用户问题。
- 输出：逐字/逐块显示的回答。
- 重点：取消、重试、错误恢复、消息持久化。
- 配套教程：[实战01 · 手写流式聊天应用](./实战教程/实战01-手写流式聊天应用.md)、[实战02 · AI SDK 重构](./实战教程/实战02-AI-SDK重构聊天与工具调用.md)。

### 练习 2：知识库 RAG

- 输入：本地 Markdown 知识库。
- 输出：带引用来源的问答。
- 重点：切片、召回、引用、拒答、文档投毒防护。
- 配套教程：[实战03 · RAG 知识库问答](./实战教程/实战03-RAG知识库问答.md)；进阶对照 [实战08 · LangChain 重写 RAG](./实战教程/实战08-LangChain重写RAG.md)（选修）。

### 练习 3：AI 表单助手

- 输入：用户填写的表单草稿。
- 输出：字段补全、错误解释、风险提示。
- 重点：schema 校验、人工确认、不可直接替用户提交。
- 配套教程：[实战04 · Agent 审批流](./实战教程/实战04-Agent工具调用与审批流.md)（人工确认的协议层实现）+ 实战02 延伸练习 3（`streamObject` 结构化输出）。

### 练习 4：AI 代码审查助手

- 输入：Git diff。
- 输出：风险分类、修改建议、可选 patch。
- 重点：不自动提交、不自动推送，先让用户审阅。

## 五、复习节奏

1. 每周选 1 个官方资料做精读，输出 10 条要点。
2. 每周选 1 个小项目补一段代码或一张架构图。
3. 每周复盘一次安全边界：密钥、权限、工具调用、引用来源、日志脱敏。
4. 每月把碎片资料合并到主干文档，避免周报和收藏夹堆积。
