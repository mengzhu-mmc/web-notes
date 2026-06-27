# AI 学习资料索引

> 维护原则：官方 / 一手资料优先；社区文章用于拓展视角；每条资料都要标注学习用途，避免收藏后不复习。

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

## 三、仓库内学习入口

- `91-AI前端/AI前端工程师指南.md`
  - 当前 AI 前端总纲，适合从 LLM 基础、Prompt、API 调用、流式输出开始复习。
- `91-AI前端/2026-06-27-AI知识周归档.md`
  - 本周 AI / Agent / AI 前端认知归档。
- `91-AI前端/AI学习计划-前端工程师4周路线.md`
  - 4 周学习计划，适合按天执行。
- `09-工程化/MCP协议原理与协作流程.md`
  - MCP 深入原理与协作流程。
- `92-前端周报/技术雷达-2026Q1.md`
  - AI 与前端融合趋势观察。

## 四、项目练习资料

### 练习 1：流式聊天 UI

- 输入：用户问题。
- 输出：逐字/逐块显示的回答。
- 重点：取消、重试、错误恢复、消息持久化。

### 练习 2：知识库 RAG

- 输入：本地 Markdown 知识库。
- 输出：带引用来源的问答。
- 重点：切片、召回、引用、拒答、文档投毒防护。

### 练习 3：AI 表单助手

- 输入：用户填写的表单草稿。
- 输出：字段补全、错误解释、风险提示。
- 重点：schema 校验、人工确认、不可直接替用户提交。

### 练习 4：AI 代码审查助手

- 输入：Git diff。
- 输出：风险分类、修改建议、可选 patch。
- 重点：不自动提交、不自动推送，先让用户审阅。

## 五、复习节奏

1. 每周选 1 个官方资料做精读，输出 10 条要点。
2. 每周选 1 个小项目补一段代码或一张架构图。
3. 每周复盘一次安全边界：密钥、权限、工具调用、引用来源、日志脱敏。
4. 每月把碎片资料合并到主干文档，避免周报和收藏夹堆积。
