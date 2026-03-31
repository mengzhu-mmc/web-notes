# MCP 协议原理与协作流程

## 一、什么是 MCP

MCP 的全称是 **Model Context Protocol（模型上下文协议）**，由 Anthropic 于 2024 年 11 月发布。它的核心目标是建立一套开放标准，统一和简化大模型与外部工具及数据源之间的连接与交互方式。

类比理解：正如 Web 开发中 HTTP 协议定义了浏览器与服务器之间的通信规范，MCP 协议为模型与工具的交互提供了通用框架，避免生态碎片化。

**一句话总结**：MCP 让大模型能安全、标准化地"调用"外部能力，从而突破其在实时性、功能性和数据访问方面的固有限制。

---

## 二、核心概念

### 2.1 MCP Server

MCP Server 本质上是一个**符合 MCP 协议规范的程序**，通常由 Node.js 或 Python 编写，既可以在本地运行，也可以部署在远程服务器上。它的核心使命是**作为一组特定功能的封装体和提供方**。

> 注意：这里的 "Server" 不是传统意义上的远程服务器，而是一个能力提供者程序。

### 2.2 Tool（工具）

Tool 是 MCP Server 内部封装的具体功能，类比编程语言中的函数：有明确的功能定义、接收特定参数、执行操作并返回结构化结果。一个 MCP Server 可以包含一个或多个 Tool。

**比喻**：MCP Server 是"能力胶囊"的提供者，Tool 是胶囊内部一颗颗具有特定功效的"药丸"。

**实例**：

- **天气查询 MCP Server**：内置 `get_weather` Tool，接收 `{"city": "北京"}` 参数，返回天气数据
- **文件系统 MCP Server**：提供 `read_file`、`list_directory` 等多个 Tool
- **数据库 MCP Server**：暴露 `query_database` Tool，执行 SQL 查询

### 2.3 MCP Host

MCP Host 是**用户直接交互的应用程序**，比如 CatPaw Desk、Cursor、Claude Code 等。它是整个 MCP 架构中的"总指挥部"。

MCP Host 的核心职责：

- **用户交互入口**：接收用户输入、展示 LLM 回复、确认工具调用权限
- **内嵌 MCP Client**：管理与各个 MCP Server 的连接（一个 Host 可同时连接多个 Server）
- **管理 LLM 调用与上下文**：把用户 Prompt 和可用 Tool 列表一并发给 LLM
- **安全与权限控制**：拦截 LLM 的工具调用请求，防止未授权操作

### 2.4 MCP Client

MCP Client 是 Host 内部的通信模块，每个 Client 实例对应一个 MCP Server 的连接。它的职责是按照 MCP 协议规范（JSON-RPC 2.0）与 Server 通信，屏蔽底层是 stdio 还是 HTTP 的传输差异。

**比喻**：Host 派出去的"专线联络员"。

---

## 三、关键认知：LLM 自身不能调用工具

这是理解 MCP 架构最重要的一点：**大模型（LLM）本身什么都"做"不了**。它没有网络请求能力，没有文件读写能力，甚至没有"主动调用"任何东西的能力。它唯一能做的就是：接收文本输入，输出文本。

所谓的"调用工具"，本质上只是 LLM 在输出的文本里，按照约定的格式说了一句类似 `{"tool": "get_weather", "args": {"city": "北京"}}` 这样的话。**是 MCP Host 读懂了这句话，然后替它去执行的。**

---

## 四、四个角色的分工

| 角色 | 比喻 | 职责 |
|------|------|------|
| **LLM** | 大脑 | 只负责思考和决策，输出结构化的工具调用意图 |
| **MCP Host** | 身体 | 总调度中枢，串联用户、LLM 和工具 |
| **MCP Client** | 神经 | 按协议规范与 Server 通信，屏蔽传输差异 |
| **MCP Server** | 手脚 | 封装具体能力，执行真实业务逻辑 |

---

## 五、完整协作流程（18 步）

> 配套可视化流程图见同目录下的 `mcp-sequence.html`（暗色版）和 `mcp-sequence-light.html`（浅色版）

### Phase 01：初始化连接（用户提问之前）

1. **Host 读取配置，创建 Client 实例**：为每个已配置的 MCP Server 创建一个独立的 MCP Client 实例
2. **Client 建立通信通道**：通过 `stdio`（本地进程）或 `HTTP`（远程服务）与 Server 建立连接
3. **Client 发送 `ListTools` 请求**：Server 返回其提供的所有 Tool 的名称、描述和参数 Schema
4. **Server 返回 Tool 列表**：包含工具名、功能描述、输入参数 Schema
5. **Client 上报 Tool 列表给 Host**：Host 汇总所有 Client 上报的 Tool，形成完整工具清单

### Phase 02：用户提问 → LLM 决策

6. **用户输入 Prompt**：例如 "北京今天需要带伞吗？"
7. **Host 组装上下文发给 LLM**：包含用户 Prompt + 所有可用 Tool 列表及参数描述
8. **LLM 推理决策**：判断需要实时天气数据，决定调用 `get_weather` 工具
9. **LLM 返回工具调用意图**：`{"tool": "get_weather", "args": {"city": "北京"}}`

### Phase 03：工具调用 → 结果回传

10. **Host 解析调用意图，路由到 Client**：根据工具名找到归属的 MCP Client
11. **Client 转发请求给 Server**：按 MCP 协议封装为 JSON-RPC 2.0 格式
12. **Server 执行业务逻辑**：调用天气 API → 解析数据 → 格式化结果
13. **Server 返回结果**："北京今日午后有阵雨，22°C"
14. **Client 将结果交还 Host**
15. **Host 将 Tool 执行结果喂回 LLM**

### Phase 04：生成回答 → 展示结果

16. **LLM 整合数据，生成自然语言回答**
17. **LLM 返回最终回答文本**
18. **Host 展示给用户**："北京今天午后有阵雨，建议携带雨具。"

> **注意**：Phase 02 ~ Phase 03 可能**多轮循环**——LLM 可在一次对话中调用多个不同 Tool，甚至同一 Tool 多次，直到信息充足后才进入 Phase 04。

---

## 六、MCP Server 的两种运行模式

### 6.1 本地进程模式（stdio）

通过标准输入输出与 MCP Host 进行 JSON-RPC 通信，无需网络配置，适合个人开发和本地工具。

```json
{
  "command": "npx",
  "args": ["-y", "mcp-server-weather"]
}
```

### 6.2 HTTP Server 模式

部署为独立网络服务，通过 HTTP/HTTPS 暴露 JSON-RPC 端点，支持远程访问和多客户端共享。

```json
{
  "url": "http://localhost:3000"
}
```

### 对比

| 维度 | 本地进程模式 | HTTP Server 模式 |
|------|------------|-----------------|
| 通信协议 | stdio | HTTP/HTTPS |
| 部署位置 | 必须与 Host 同机 | 可本地或远程 |
| 启动方式 | Host 启动子进程 | 独立进程监听端口 |
| 适用场景 | 个人开发、本地工具 | 团队共享、云服务集成 |

---

## 七、MCP Server 开发模板（TypeScript）

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// 1. 定义参数校验 Schema
const ExampleToolSchema = z.object({
  param1: z.string().describe("参数1的描述"),
  param2: z.number().optional().describe("参数2的描述(可选)"),
});

// 2. 创建 Server 实例
const server = new Server(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 3. 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "example-tool",
    description: "示例工具描述",
    inputSchema: {
      type: "object",
      properties: {
        param1: { type: "string", description: "参数1" },
        param2: { type: "number", description: "参数2(可选)" },
      },
      required: ["param1"],
    },
  }],
}));

// 4. 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "example-tool") {
    const { param1, param2 } = ExampleToolSchema.parse(args);
    const result = `收到参数: ${param1}, ${param2 ?? "无"}`;
    return { content: [{ type: "text", text: result }] };
  }
  throw new Error(`未知工具: ${name}`);
});

// 5. 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch(console.error);
```

---

## 八、MCP Server 与 Skill 的区别

在 CatPaw 等 AI 工具中，MCP Server 和 Skill 都是给 AI 扩展能力的方式，但实现机制完全不同。

### 8.1 MCP Server：给 AI 新的"手脚"（能力）

MCP Server 是通过**协议层**扩展能力。它是一个独立运行的程序，通过 JSON-RPC 协议暴露 Tool 给 LLM 调用。LLM 在运行时能"看到"这些 Tool 的名称和参数描述，然后自主决定什么时候调用、传什么参数。整个过程是结构化的、程序化的。

例如 `sdk-browser-use` 这个 MCP Server，它提供了 `browser_action` Tool，AI 通过调用这个 Tool 才能控制浏览器截图、点击、导航——这是 AI 自身做不到的能力。

### 8.2 Skill：给 AI 新的"经验"（知识和方法论）

Skill 是通过**提示词层**扩展能力。它本质上是一份 Markdown 指导文档（SKILL.md），当 AI 判断某个任务需要用到某个 Skill 时，会先读取这份文档，然后按照里面的指引去完成任务。Skill 不涉及协议通信，不需要启动独立进程。

**关键区别**：Skill 不是"命令集合"，AI 读完后会**理解意图并自主决定怎么做**，而不是机械地逐条执行。同样的 Skill，面对不同的需求会产出完全不同的执行路径。

例如 `frontend-design` Skill 并没有提供任何新的 Tool，它做的事情是告诉 AI 设计网页时应该注重排版、选独特字体、用大胆配色、加动画微交互等审美标准，AI 最终还是用已有的 `write` 工具写 HTML 文件来完成的。

### 8.3 对比总结

| 维度 | MCP Server | Skill |
|------|-----------|-------|
| 本质 | 独立运行的程序 | Markdown 指导文档 |
| 扩展方式 | 协议层（提供新 Tool） | 提示词层（提供知识和方法论） |
| 通信机制 | JSON-RPC 结构化调用 | AI 读取文档后自主理解执行 |
| 是否需要部署 | 需要启动独立进程 | 不需要，只是一份文件 |
| 执行方式 | 精确调用，固定输入输出格式 | 灵活应对，同一 Skill 不同任务产出不同路径 |
| 比喻 | 给 AI 装了一个新 App | 给 AI 一本操作指南 |

两者也经常配合使用：Skill 提供领域知识和最佳实践，MCP Server 提供具体的执行能力。

---

## 九、参考资料

- [MCP 官方文档](https://modelcontextprotocol.io/docs/getting-started/intro)
- [MCP 官方 Demo](https://modelcontextprotocol.io/examples)
- [天气查询 MCP Server 示例](https://github.com/hideya/mcp-server-weather-js)
- 内部文档：[MCP Server 介绍与 Spec 原理分析](https://km.sankuai.com/collabpage/2746537132)
