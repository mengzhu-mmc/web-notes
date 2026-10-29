# 实战04 · Agent 工具调用与审批流（手写 loop + HITL）

> 目标：不用框架手写一个完整 Agent——多步工具调用循环、步骤可视化、**写操作人工审批**。做完你将理解实战02 里 `maxSteps` 背后发生的一切，以及为什么"AI 建议、人来决策"必须落到协议层而不是口头约定。
> 更新时间：2026-10-30 ｜ 前置：实战01（SSE 多路复用）、实战03（复用其向量索引做检索工具）

## Agent 到底"循环"了什么

实战02 里 `maxSteps: 5` 一行配置，展开来就是这个循环：

```
用户任务
   ↓
┌─→ 模型思考：需要调工具吗？
│     ↓ 是
│   执行工具 → 结果追加进 messages ─┐
│     ↓ 否                         │（带着新结果再问模型）
│   输出最终回答，结束 ←────────────┘
```

模型自己**只产出调用意图**（工具名 + JSON 参数），执行永远在你的代码里——这个认知是一切 Agent 安全设计的基石。它和 MCP 的分工完全同构（工具清单 ≈ `tools/list`，工具执行 ≈ `tools/call`，详见 `09-工程化/MCP协议原理与协作流程.md`）。

## Step 0：设计多事件 SSE 协议

实战01 的流只有 delta/done/error 三种事件，Agent 的流是一个**时间线**——先定义协议，前后端都只认它：

```ts
// shared/agent-events.ts
export type AgentEvent =
  | { type: 'step-start'; step: number }                        // 开始第 n 轮思考
  | { type: 'tool-call'; callId: string; toolName: string; input: unknown }
  | { type: 'tool-result'; callId: string; ok: boolean; output: unknown }
  | { type: 'text-delta'; content: string }                     // 最终回答（简化：整段发出）
  | { type: 'approval-required'; callId: string; toolName: string; input: unknown }
  | { type: 'paused' }                                          // 循环挂起，等待审批
  | { type: 'done' }
  | { type: 'error'; message: string }
```

**为什么 approval 也要走协议**：Agent 的中断点不是"出错"，而是一个**合法的暂停状态**。前端收到 `approval-required` 就渲染审批横幅，收到 `paused` 就结束这一条 SSE 流——审批通过后开一条**新的 SSE 流**继续。生产系统的 Human-in-the-loop 基本都是这个「挂起 → 恢复」结构。

## Step 1：工具注册表——Agent 的能力边界

三个工具覆盖三种典型：只读检索（接实战03 的索引）、只读查询、**写操作（需审批）**：

```ts
// server/tools.ts
import { z } from 'zod'
import { search } from './vector-store' // 实战03 的检索函数

interface ToolDef {
  description: string                    // 给模型看：什么时候用
  schema: object                         // 给模型看：JSON Schema 参数定义
  validate: z.ZodTypeAny                 // 给自己看：执行前硬校验（参数来自模型，不可信！）
  requireApproval?: boolean              // 写操作标记
  timeoutMs?: number
  execute: (input: any) => Promise<unknown>
}

export const registry: Record<string, ToolDef> = {
  search_notes: {
    description: '在前端知识库中检索笔记。用户问题涉及前端技术知识时先调用它。',
    schema: {
      type: 'object',
      properties: { keyword: { type: 'string', description: '检索关键词' } },
      required: ['keyword'],
    },
    validate: z.object({ keyword: z.string().min(1) }),
    async execute({ keyword }) {
      const [vec] = await embed([keyword])
      return search(chunks, vec, 3).map((h) => ({ heading: h.chunk.heading, text: h.chunk.text.slice(0, 300) }))
    },
  },

  get_today: {
    description: '获取今天的日期。涉及"今天/本周/几天前"等时间表达时必须先调用。',
    schema: { type: 'object', properties: {}, required: [] },
    validate: z.object({}).passthrough(),
    async execute() { return { date: new Date().toISOString().slice(0, 10) } },
  },

  add_todo: {
    description: '把一条待办事项写入任务清单。这是写操作，需要用户确认。',
    schema: {
      type: 'object',
      properties: { title: { type: 'string', description: '待办内容，一句话' } },
      required: ['title'],
    },
    validate: z.object({ title: z.string().min(1).max(100) }),
    requireApproval: true,   // ← 写操作必须审批
    async execute({ title }) {
      todos.push({ title, createdAt: Date.now() })  // 演示用内存存储
      return { ok: true, total: todos.length }
    },
  },
}

const todos: { title: string; createdAt: number }[] = []
```

> 双份定义（schema + validate）看起来冗余，这正是裸协议的真实成本——AI SDK 的 `tool({ inputSchema: z.object({...}) })` 帮你把 zod 自动转成 JSON Schema，两边就合一份了。手写一遍才知道框架在省什么。

## Step 2：工具执行器——错误是结果，不是异常

```ts
// server/run-tool.ts
export interface ToolResult { ok: boolean; output: unknown }

export async function runTool(name: string, rawArgs: string): Promise<ToolResult> {
  const def = registry[name]
  if (!def) return { ok: false, output: `没有名为 "${name}" 的工具，可用工具：${Object.keys(registry).join(', ')}` }

  // 模型输出的 JSON 可能解析失败或字段不对——都当成"结果"回给它，让它自己纠正
  let args: unknown
  try { args = JSON.parse(rawArgs) } catch { return { ok: false, output: '参数不是合法 JSON，请重试' } }

  const parsed = def.validate.safeParse(args)
  if (!parsed.success) return { ok: false, output: `参数校验失败：${parsed.error.message}` }

  try {
    const output = await Promise.race([
      def.execute(parsed.data),
      new Promise((_, rej) => setTimeout(() => rej(new Error('工具超时')), def.timeoutMs ?? 10_000)),
    ])
    // 工具结果会进上下文：截断大对象，防止撑爆窗口
    return { ok: true, output: truncateForContext(output) }
  } catch (e: any) {
    return { ok: false, output: `执行失败：${e.message}` }
  }
}

const truncateForContext = (o: unknown) => {
  const s = typeof o === 'string' ? o : JSON.stringify(o)
  return s.length > 2000 ? s.slice(0, 2000) + '…(已截断)' : o
}
```

**「错误返回给模型而不是 throw」是 Agent 设计的分水岭**：模型看到"参数校验失败：keyword 不能为空"，下一轮会自己修正参数重试；如果你 throw 了，整个任务直接崩掉，用户白等。模型的自愈能力建立在"错误可读"之上。

## Step 3：Agent 主循环

```ts
// server/agent.ts
import OpenAI from 'openai'
import type { AgentEvent } from '../shared/agent-events'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL: process.env.OPENAI_BASE_URL })

export interface Session {
  messages: any[]
  pendingCall?: { id: string; name: string; arguments: string }  // 等待审批的调用
}

const toolSchemas = Object.entries(registry).map(([name, def]) => ({
  type: 'function' as const,
  function: { name, description: def.description, parameters: def.schema },
}))

export async function runAgentLoop(
  session: Session,
  emit: (e: AgentEvent) => void,
  signal: AbortSignal,
): Promise<'done' | 'paused' | 'error'> {
  const MAX_STEPS = 8 // 防死循环：模型可能反复调用同一工具

  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal.aborted) return 'error'
    emit({ type: 'step-start', step })

    const res = await client.chat.completions.create({
      model: process.env.MODEL!,
      messages: session.messages,
      tools: toolSchemas,
    })
    const msg = res.choices[0].message
    session.messages.push(msg) // 助手消息（含 tool_calls）必须先入历史

    // 没有工具调用 = 最终回答
    if (!msg.tool_calls?.length) {
      emit({ type: 'text-delta', content: msg.content ?? '' })
      emit({ type: 'done' })
      return 'done'
    }

    for (const call of msg.tool_calls) {
      const def = registry[call.function.name]
      emit({ type: 'tool-call', callId: call.id, toolName: call.function.name, input: safeParse(call.function.arguments) })

      // 写操作且未审批 → 挂起
      if (def?.requireApproval) {
        session.pendingCall = call
        emit({ type: 'approval-required', callId: call.id, toolName: call.function.name, input: safeParse(call.function.arguments) })
        emit({ type: 'paused' })
        return 'paused' // 流结束；审批接口会带着新 SSE 恢复循环
      }

      const result = await runTool(call.function.name, call.function.arguments)
      session.messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result.output) })
      emit({ type: 'tool-result', callId: call.id, ok: result.ok, output: result.output })
    }
    // 循环继续：带着全部工具结果再次请求模型
  }

  emit({ type: 'error', message: '达到最大步数限制（8 步），已停止' })
  return 'error'
}

const safeParse = (s: string) => { try { return JSON.parse(s) } catch { return s } }
```

简化说明：最终回答这里用非流式整段发出（`text-delta` 只发一次）。生产上通常**只对"无工具调用的那一步"开启 `stream: true`**——判断分支在循环里加一个即可，流式细节实战01 已覆盖。

## 深入理解：Agent 的两个工程深水区

### ① 流式 tool_calls：参数是一段一段到达的

正文用非流式拿完整 `arguments` 是教学简化。生产开流式后，`tool_calls` 的结构和你想的不一样——**同一个调用的 arguments 按 `index` 分多个 chunk 到达**：

```ts
const stream = await client.chat.completions.create({ model, messages, tools, stream: true })

const pending = new Map<number, { name: string; args: string }>()
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta
  for (const tc of delta?.tool_calls ?? []) {
    const slot = pending.get(tc.index) ?? { name: '', args: '' }
    if (tc.function?.name) slot.name += tc.function.name
    if (tc.function?.arguments) slot.args += tc.function.arguments  // 增量拼接！
    pending.set(tc.index, slot)
  }
  if (chunk.choices[0]?.finish_reason === 'tool_calls') {
    // 到这里才收齐，可以 JSON.parse 了
  }
}
```

不知道增量结构的人会拿第一个 chunk 的半截 JSON 去 `parse` 然后 crash。这和实战01 的文本 delta 是同构的——**模型侧一切流式输出（文本、参数）都是增量拼接**。流式参数的 UI 价值：在 `execute` 前就能给用户展示"正在调用 getWeather（参数生成中：北京…）"，Agent 透明度上一个台阶。

### ② 上下文压缩：老步骤的结果不该原样背着

`MAX_STEPS = 8`，每步 tool result 全量进上下文——检索类工具一次返回 2000 字，8 步后上下文里一半是早期工具的原文。后果是双重的：**成本线性膨胀**，且模型的注意力被早期大段输出稀释（它们对当前推理大多已无用）。

`truncateForContext` 只解决"单条太大"；摘要化解决"条数太多"：

```ts
function compactHistory(messages: any[], keepRecent = 2): any[] {
  // 找出所有 tool 角色（除最近 keepRecent 条），规则化压缩：
  const toolIdx = messages.map((m, i) => (m.role === 'tool' ? i : -1)).filter((i) => i >= 0)
  const oldIdx = new Set(toolIdx.slice(0, -keepRecent))
  return messages.map((m, i) => {
    if (!oldIdx.has(i)) return m
    return { ...m, content: `（已压缩）${String(m.content).slice(0, 100)}…` }
  })
}

// 每轮循环开头调用：session.messages = compactHistory(session.messages)
```

**取舍**：压得太狠模型会"忘记"早期依据，引用和推理出现幻觉。所以压缩规则要保留关键结论和来源信息（`（已压缩）`前缀 + 首行），重要决策场景宁可用便宜模型做摘要也不用粗暴截断。

## Step 4：两个 HTTP 端点——启动与恢复

```ts
// server/index.ts（节选，SSE 头/心跳复用实战01）
const sessions = new Map<string, Session>() // 演示用内存；生产放 Redis（可恢复、多实例共享）

// ① 启动任务
app.post('/api/agent/run', async (req, res) => {
  const { message } = req.body
  const sessionId = crypto.randomUUID()

  const session: Session = {
    messages: [
      { role: 'system', content: '你是任务助手。能调工具就调工具，不要凭记忆回答知识库类问题。' },
      { role: 'user', content: message },
    ],
  }
  sessions.set(sessionId, session)

  writeSSEHeader(res)
  res.write(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`) // 前端记下 sessionId
  pipeAgent(session, res, req)
})

// ② 审批后恢复
app.post('/api/agent/approve', async (req, res) => {
  const { sessionId, approved } = req.body
  const session = sessions.get(sessionId)
  if (!session?.pendingCall) return res.status(404).json({ error: '没有待审批的调用' })

  const call = session.pendingCall
  session.pendingCall = undefined

  if (approved) {
    const result = await runTool(call.function.name, call.function.arguments)
    session.messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result.output) })
    // 注意：tool 消息必须在新的 assistant 消息之前补齐，顺序不能乱
  } else {
    // 关键：拒绝也要回填 tool result！
    // OpenAI 兼容接口规定：assistant 的 tool_calls 必须逐个对应 tool 消息，
    // 缺了直接 400 报错，整个会话就废了
    session.messages.push({ role: 'tool', tool_call_id: call.id, content: '用户拒绝了该操作。请向用户说明并询问如何调整方案。' })
  }

  writeSSEHeader(res)
  pipeAgent(session, res, req) // 恢复循环
})
```

**「拒绝也回填 tool 消息」是本篇最容易踩的深坑**：不回填，下一条请求直接 400；而且回填的措辞本身是给模型的行为指令——写"用户拒绝了"，模型会道歉并提出替代方案，任务继续推进而不是卡死。

## Step 5：React 步骤时间线

复用实战01 的 `readSSE`，用一个 reducer 把事件流折叠成时间线：

```tsx
// web/src/agent/AgentUI.tsx
interface StepItem {
  kind: 'tool' | 'approval' | 'text'
  callId?: string
  toolName?: string
  input?: unknown
  output?: unknown
  ok?: boolean
  pending?: boolean   // 审批待处理
}

function reducer(items: StepItem[], e: AgentEvent): StepItem[] {
  switch (e.type) {
    case 'tool-call':
      return [...items, { kind: 'tool', callId: e.callId, toolName: e.toolName, input: e.input }]
    case 'tool-result':
      return items.map((it) => it.callId === e.callId ? { ...it, output: e.output, ok: e.ok } : it)
    case 'approval-required':
      return [...items, { kind: 'approval', callId: e.callId, toolName: e.toolName, input: e.input, pending: true }]
    case 'text-delta':
      return [...items, { kind: 'text', output: e.content }]
    default:
      return items
  }
}

function ToolCard({ item }: { item: StepItem }) {
  return (
    <details className="rounded border px-3 py-2 text-sm">
      <summary>
        🔧 {item.toolName} {item.output ? (item.ok ? '✓' : '✗') : '…执行中'}
      </summary>
      <pre className="mt-2 overflow-x-auto text-xs text-gray-500">
        {JSON.stringify({ 入参: item.input, 结果: item.output }, null, 2)}
      </pre>
    </details>
  )
}
```

审批横幅——**必须展示真实入参**，用户批的是"具体做什么"而不是"某个工具名"：

```tsx
{items.filter((i) => i.kind === 'approval' && i.pending).map((i) => (
  <div key={i.callId} className="rounded border-2 border-amber-300 bg-amber-50 p-3">
    <div className="mb-2">⚠️ Agent 请求执行写操作 <b>{i.toolName}</b>：</div>
    <pre className="text-xs">{JSON.stringify(i.input, null, 2)}</pre>
    <div className="mt-2 flex gap-2">
      <button onClick={() => approve(sessionId, i.callId!, true)} className="bg-blue-500 text-white px-3 py-1 rounded">批准</button>
      <button onClick={() => approve(sessionId, i.callId!, false)} className="border px-3 py-1 rounded">拒绝</button>
    </div>
  </div>
))}

// approve = POST /api/agent/approve → 拿到新的 SSE 流继续喂 reducer
```

## 安全清单（Agent 上生产前的自查）

| 项 | 做法 | 本文落点 |
| --- | --- | --- |
| 工具白名单 | 模型只能调注册表里的工具，幻觉工具名返回错误文本 | Step 2 第一行 |
| 参数校验 | zod 硬校验，不信任模型输出 | Step 2 |
| 读写分离 | 写操作必须人工审批 | Step 1 `requireApproval` |
| 超时 | 每个工具独立超时，防卡死循环 | Step 2 `Promise.race` |
| 步数上限 | `MAX_STEPS` 防死循环烧钱 | Step 3 |
| 结果截断 | 工具输出截断后再入上下文 | Step 2 |
| 审计日志 | 谁、何时、批了什么、执行了什么参数，全量落库 | 延伸练习 3 |
| 中断传播 | 用户断开 → abort 上游模型请求 | 实战01 同款 `req.on('close')` |
| 幂等 | 写操作带唯一键，审批期间重复提交不产生双写 | 延伸练习 4 |

## 常见坑

| 症状 | 原因 | 解法 |
| --- | --- | --- |
| 拒绝审批后接口 400 | tool_calls 没有对应 tool 消息 | 拒绝也回填 tool result（Step 4） |
| 模型反复调用同一个工具 | 工具报错信息不可读 / 结果没进上下文 | 错误信息写"人话"；确认 tool 消息 push 顺序 |
| 模型编造工具名或参数 | 裸协议下模型偶尔幻觉 | 注册表兜底 + zod 校验，错误回给模型自愈 |
| 流式模式拿半截 arguments 去 parse | 不认识 tool_calls 增量结构 | 按 index 累积，finish 后再解析（深入理解①） |
| 上下文越来越长、越来越贵 | 每步工具结果全量累积 | 结果截断 + 摘要化压缩（深入理解②） |
| 重启服务后会话全丢 | sessions 放内存 | 挂到 Redis/DB，sessionId 无状态恢复 |
| 两个 tool_calls 只执行了第一个就挂起 | 挂起时循环 break，另一半调用没执行 | 恢复时先补齐剩余 tool_calls 的结果（本教程单工具场景已规避，多工具并发要注意） |
| 前端时间线顺序错乱 | SSE 事件乱序处理 | 严格按事件流 reducer 折叠，不按 callId 排序 |

## 延伸练习

1. 给最终回答的那一步开启真正的 `stream: true`（判断"本轮无 tool_calls"前先流式接收）。
2. 多工具并发：模型的 `tool_calls` 是数组，用 `Promise.all` 并行执行只读工具，写工具仍串行 + 审批。
3. 审计日志：每次 tool-call / approval / approve 落一行 JSON 日志（who/when/what/result）。
4. 幂等键：`add_todo` 支持 `clientToken` 参数，重复提交返回同一结果。
5. 把工具注册表拆成独立进程（stdio MCP server），用 `@modelcontextprotocol/sdk` 重写——你会发现自己写的 registry/tools/execute 和 MCP 三原语一一对应。
6. 把主循环改成全流式：按深入理解①拼接 tool_calls 参数，前端同步展示"参数生成中"的实时预览。

## 本篇小结

实战01-04 串成了第一条主线：**把 AI 请求跑通**——

```
实战01 流式协议（数据怎么流）
   → 实战02 AI SDK（框架怎么封装）
      → 实战03 RAG（模型怎么获得私有知识）
         → 实战04 Agent（模型怎么连续干活 + 人怎么把关）
```

但请求跑通只是半程：AI 返回的内容到达浏览器之后怎么渲染、失败了怎么办、多步任务怎么编排，是另一半战场——[实战05：AI 输出的流式渲染与容错解析](./实战05-AI输出的流式渲染与容错解析.md) 开始进入「把产品做稳做深」的第二条主线。
