# 实战02 · 用 AI SDK 重构聊天与工具调用

> 目标：用 [Vercel AI SDK](https://ai-sdk.dev)（v5）把 [实战01](./实战01-手写流式聊天应用.md) 的功能重做一遍，并加上实战01 没做到的：**工具调用**和**生成式 UI**。做完你能分清"哪些问题框架解决了、哪些还得自己来"，技术选型时心里有底。
> 更新时间：2026-10-30 ｜ 前置：完成实战01

## 为什么值得学 AI SDK

对照实战01 你手写的东西，看 AI SDK 替你做了哪些：

| 实战01 手写的 | AI SDK 对应 |
| --- | --- |
| `useChatStream` hook（状态机 + 中断 + 错误） | `useChat`（一个 hook 全包） |
| 自定义 SSE 事件协议 + `readSSE` 解析 | UIMessage Stream 协议（内置） |
| 手写 `AbortController` 停止 | `stop()` |
| 手写 retry（截断历史重发） | `regenerate()` |
| Function Calling 循环 | `tools` + `maxSteps`（自动多步） |
| 工具结果渲染成组件 | message `parts` 直接渲染 React 组件 |

代价：引入一层抽象，出问题时必须能看懂它吐出的流。**所以先做实战01 再做本篇**。

安装（v5 大版本，API 与 v4 差异见文末坑表）：

```bash
npm i ai @ai-sdk/react @ai-sdk/openai-compatible zod
```

## Step 1：最小可用版（30 行跑通）

后端（Next.js App Router；Express 适配见文末）：

```ts
// app/api/chat/route.ts
import { streamText, convertToModelMessages } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const provider = createOpenAICompatible({
  name: 'deepseek',
  baseURL: process.env.OPENAI_BASE_URL!,   // 任何 OpenAI 兼容平台
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: Request) {
  const { messages } = await req.json()    // UIMessage[]（前端视角的消息）

  const result = streamText({
    model: provider(process.env.MODEL!),
    system: '你是一个简洁的前端技术助手，用中文回答。',
    messages: convertToModelMessages(messages), // UIMessage → ModelMessage
  })

  return result.toUIMessageStreamResponse()
}
```

前端：

```tsx
// app/page.tsx（或 Vite 里的任何组件）
'use client'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

export default function Chat() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts.map((part, i) =>
            part.type === 'text' ? <p key={i}>{part.text}</p> : null,
          )}
        </div>
      ))}
      {/* status: 'submitted' | 'streaming' | 'ready' | 'error' —— 就是实战01 你手写的那套状态机 */}
      {status === 'error' && <button onClick={() => regenerate()}>重试</button>}
      {(status === 'submitted' || status === 'streaming') && <button onClick={stop}>停止</button>}
    </>
  )
}
```

**注意两个 v5 核心概念**（对照 [AI SDK 5 发布说明](https://vercel.com/blog/ai-sdk-5)）：

- **UIMessage / ModelMessage 分离**：前端消息（UIMessage，含 parts、id）和发给模型的消息（ModelMessage）是两种结构，`convertToModelMessages` 负责转换。实战01 里它们是同一个对象，一旦工具调用和生成式 UI 进来就会分叉。
- **消息是 `parts` 而不是一整段 text**：一条 AI 消息可以由「文本 + 工具调用 + 工具结果 + 文本」组成，渲染时逐 part 处理。

## Step 2：工具调用——让模型查真实数据

场景：用户问「北京今天适合穿什么」，模型自己不知道天气，但可以调用你提供的 `getWeather` 工具。

**后端**：定义工具 + `maxSteps`（模型调完工具还能继续推理，循环由 SDK 驱动——实战04 会手写这个循环）：

```ts
import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'

const result = streamText({
  model: provider(process.env.MODEL!),
  messages: convertToModelMessages(messages),
  maxSteps: 5,   // 工具调用→结果→再推理，最多 5 步，防失控

  tools: {
    getWeather: tool({
      description: '获取指定城市当前天气。当用户问题涉及真实天气时调用。',
      inputSchema: z.object({
        city: z.string().describe('城市名，如"北京"'),
      }),
      execute: async ({ city }) => {
        // 真实项目里换成天气 API；这里用假数据保证教程可跑
        const db: Record<string, { temp: number; condition: string }> = {
          北京: { temp: 12, condition: '晴' },
          上海: { temp: 18, condition: '多云' },
        }
        return db[city] ?? { temp: 20, condition: '未知城市，返回默认数据' }
      },
    }),
  },
})
```

要点：

- `description` 和 `.describe()` 是给**模型**看的，写清楚"什么时候该用、参数什么含义"，质量直接决定模型调用得对不对——这就是提示工程在工具上的应用（对照指南 §5）。
- `inputSchema` 用 zod 定义，SDK 自动转成 JSON Schema 下发，**模型返回的参数也会先过校验**，不合法直接报错而不是把脏数据带进你的业务代码。

## Step 3：前端渲染工具过程（生成式 UI 入门）

工具调用时消息 parts 里会出现 `tool-input-available`（拿到参数）/ `tool-output-available`（拿到结果）。**直接渲染成组件**，而不是让模型把天气写成一段文字：

```tsx
function MessageParts({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <p key={i}>{part.text}</p>

          case 'tool-input-available':
          case 'tool-output-available':
            if (part.toolName === 'getWeather') {
              // 有 output 就是结果，没有就是"调用中"的 loading 态
              const output =
                part.type === 'tool-output-available' ? part.output : undefined
              return output
                ? <WeatherCard key={i} {...output} />
                : <div key={i}>正在查询天气…</div>
            }
            return null

          default:
            return null // file / data-* 等 part 先忽略
        }
      })}
    </>
  )
}

const WeatherCard = ({ temp, condition }: { temp: number; condition: string }) => (
  <div className="rounded-lg border p-3">
    🌤 {condition} · {temp}°C
  </div>
)
```

这就是**生成式 UI**：模型决定"这里该出现一张卡片"，组件长什么样由你掌控。用户看到的是结构化信息而不是一段话，这是 AI 产品体验的分水岭。

## 深入理解：拆开 useChat 的黑盒

### ① UIMessage Stream 线协议：`message.parts` 是帧折叠出来的

打开 DevTools 看 `/api/chat` 的响应体，你看到的不是普通 SSE 文本流，而是一个**标准化的事件词典**（节选主要帧，字段以实际抓包为准）：

```
data: {"type":"start","messageId":"msg_1"}
data: {"type":"start-step"}
data: {"type":"tool-input-start","toolCallId":"call_1","toolName":"getWeather"}
data: {"type":"tool-input-delta","toolCallId":"call_1","inputTextDelta":"{\"ci"}
data: {"type":"tool-input-delta","toolCallId":"call_1","inputTextDelta":"ty\":\"北京\"}"}
data: {"type":"tool-input-available","toolCallId":"call_1","input":{"city":"北京"}}
data: {"type":"tool-output-available","toolCallId":"call_1","output":{"temp":12,"condition":"晴"}}
data: {"type":"finish-step"}
data: {"type":"text-start","id":"txt-0"}          ← 第二步：模型拿到工具结果继续推理
data: {"type":"text-delta","id":"txt-0","delta":"北京今天晴，12°C。"}
data: {"type":"text-end","id":"txt-0"}
data: {"type":"finish"}
```

发现没有——这和实战01 你手写的 `{type:'delta'...}` 协议是**同一个思路**：SDK 没有发明新传输（还是 SSE 的 `data:` 行），只是把事件词典标准化了。渲染时 `message.parts` 就是这些帧在前端折叠出来的结果；`finish-step` / `start-step` 的交替对应 `maxSteps` 的每一轮循环（实战04 手写的那套）。

**为什么要懂这个**：UI 显示异常时（卡片不出现、文本重复），第一调试动作是看网络面板的原始帧，确认是"流的问题"还是"渲染的问题"。

### ② tool part 的四态状态机

一次工具调用在消息里会依次经历四个状态，你的自定义卡片**每一态都要有 UI**：

```
tool-input-start ──▶ input-streaming      参数生成中：显示"正在准备查询"
        │ 参数收齐
        ▼
     input-available        execute 执行中：显示骨架卡
        │ execute 返回 / 抛错
        ▼
output-available（渲染结果卡）  /  output-error（渲染错误 + 重试入口）
```

Step 3 的示例只处理了 `input-available`（loading）和 `output-available`（结果）两态；`output-error` 是 `execute` 里 throw 的落点（延伸练习 2 会遇到），`input-streaming` 期间参数还不完整——想展示"正在生成参数"的实时预览，就要消费 `tool-input-delta` 帧。

## Step 4：自定义数据——服务端主动推 UI 建议

不只是模型输出可以流式，**服务端代码也能往流里塞自定义事件**。典型用法：回答结束后推"猜你想问"：

```ts
// 后端：把 streamText 和自定义 data part 合并到一个流
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    const result = streamText({ /* 同上 */ })
    writer.merge(result.toUIMessageStream())           // 模型的输出
    writer.write({
      type: 'data-suggestions',                        // data-* 前缀 = 自定义 part
      data: { items: ['上海呢？', '需要带伞吗？'] },
    })
  },
})

return createUIMessageStreamResponse({ stream })
```

```tsx
// 前端：part.type 就是 data-suggestions
case 'data-suggestions':
  return (
    <div key={i}>
      {part.data.items.map((s: string) => (
        <button key={s} onClick={() => sendMessage(s)}>{s}</button>
      ))}
    </div>
  )
```

## Step 5：补齐生产细节

对照实战01 的验收点逐个补上：

```tsx
const { messages, sendMessage, status, stop, error, regenerate, setMessages } =
  useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: (message) => {
      // 每条消息完成时持久化（存 localStorage / 调后端接口）
      saveToHistory(message)
    },
  })

// 恢复历史：setMessages(loadedMessages)
```

服务端侧，实战01 讲过的**代理层该做的事 AI SDK 不管**，仍然要自己做：

```ts
export async function POST(req: Request) {
  // 1. 鉴权：没登录直接 401
  // 2. 限流：AI SDK 不带限流，按实战01 的方式做
  // 3. 输入校验：messages 结构、长度上限
  const result = streamText({
    // 4. 成本控制：maxOutputTokens 限制输出长度
    maxOutputTokens: 2000,
    // 5. 中断传递：请求断开时停止上游生成
    abortSignal: req.signal,
  })
}
```

## Express / Vite 用户适配

AI SDK 文档默认 Next.js，但 `toUIMessageStreamResponse()` 返回标准 `Response`，任何 Node 框架都能接。Express 写法：

```ts
import { Readable } from 'node:stream'

app.post('/api/chat', async (req, res) => {
  const result = streamText({ /* 同上 */ })
  const uiStream = result.toUIMessageStream()

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
  })
  Readable.fromWeb(uiStream as any).pipe(res) // Web ReadableStream → Node 流
})
```

Vite 端不用改，`useChat` 走的还是 `/api/chat`。SSE 经手 Node Stream 的原理见 `07-Node/Node.js-Stream流与中间件机制.md`。

## 深入理解：自定义 Transport——把 useChat 接到任何后端

`useChat` 默认用 `DefaultChatTransport`（POST 标准格式到 `api` 地址、读 UIMessage 流）。如果后端不是这个协议呢？比如直接对接指南 §9 里的 Dify/Coze 平台。Transport 接口就是为此准备的：

```ts
import type { ChatTransport, UIMessageChunk } from 'ai'

class DifyTransport implements ChatTransport {
  async sendMessages({ messages, abortSignal }: any): Promise<ReadableStream<UIMessageChunk>> {
    const upstream = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DIFY_KEY}` },
      body: JSON.stringify({ query: lastUserText(messages), response_mode: 'streaming' }),
      signal: abortSignal,                              // useChat 的 stop() 直接透传
    })
    // 把 Dify 的 SSE 事件逐条翻译成 UIMessageChunk：
    // {event:'message', answer:'xx'} → enqueue({type:'text-delta', delta:'xx'})
    // {event:'message_end'}          → enqueue({type:'finish'})
    return transformToUIMessageStream(upstream.body!)
  }
}

const { messages, sendMessage } = useChat({ transport: new DifyTransport() })
```

**两条路线怎么选**：

| 路线 | 做法 | 适用 |
| --- | --- | --- |
| 后端转换（推荐） | 后端把第三方 API 翻译成 UIMessage 流，前端用默认 Transport | 生产主流——密钥不出后端，协议变更只改一处 |
| 前端自定义 Transport | 浏览器直连平台，Transport 里翻译 | 无后端的内部工具、纯静态站点 |

实战01-04 的架构（Node 代理层）本质上就是"后端转换"路线的手写版——所以这个 Transport 深度集成对你来说是"可选糖"，不是必经之路。接口的具体形状以 `ai` 包的 `ChatTransport` 类型为准，版本间会微调。

## v4 → v5 迁移坑表

网上大量教程还是 v4 写法，对着抄会报错：

| v4（旧教程常见） | v5（当前） |
| --- | --- |
| `const { input, handleSubmit, isLoading } = useChat()` | `sendMessage` / `status === 'streaming'`（input 自己管理） |
| `result.toDataStreamResponse()` | `result.toUIMessageStreamResponse()` |
| `message.content` | `message.parts`（content 仅文本场景保留） |
| `streamText({ messages })` 直接传前端消息 | 先 `convertToModelMessages()` |
| `maxToolRoundtrips` | `maxSteps` |

## 常见坑

| 症状 | 原因 | 解法 |
| --- | --- | --- |
| `tool-input-available` 报 TS 类型是 never | 没有把该工具声明到 `useChat` 的泛型/chat 实例上 | `useChat<{'get-weather': WeatherData}>()` 或用 `dynamic-tool` 兜底渲染 |
| 工具永不被调用 | `description` 太模糊 / 问题里没体现需要外部数据 | description 写清"什么时候用"；问题明确提"今天" |
| 自定义卡片停在 loading 不更新 | 只渲染了 input-available 一态 | 按四态状态机全量处理（深入理解②） |
| 模型调了不存在的工具 | 网上抄的旧 API，v4 的 `functions` 写法 | 用 v5 `tools` + `tool()` |
| 流式在本地好好的，部署后变一次性 | 部署平台缓冲（同实战01） | 无服务器函数需开启流式返回（Vercel 默认支持）；检查代理 |
| zod 报版不兼容 | AI SDK v5 对 zod 大版本有要求 | 按官方文档装匹配的 zod 版本 |

## 延伸练习

1. 加第二个工具 `searchNotes`（传入关键词，返回假数据），观察模型如何在两个工具间选择。
2. 把 `getWeather` 的 `execute` 换成真实 API（如 wttr.in），处理请求失败——在 `execute` 里 throw，观察前端 part 变成 `output-error` 的过程。
3. 用 `streamObject` 生成结构化 JSON（表单预填场景），对比手写「JSON 解析 + 失败重试」的差异。
4. 用 `curl -N` 或 DevTools 看一次带工具调用的原始响应流，对照深入理解①数一数完整帧序列，验证四态状态机的先后顺序。

## 下一步

→ [实战03：RAG 知识库问答](./实战03-RAG知识库问答.md)：模型不知道你的私有知识，给它接一个可检索的「外挂大脑」。
