# AI 前端工程师知识地图

> 目标读者：有 2-3 年经验的前端工程师，想转型/升级为 AI 前端工程师
> 更新时间：2026-03-31

---

## 第一部分：AI 基础认知（不需要数学，只需要会用）

### 1. 大模型基础概念

#### LLM 是什么

**一句话定义**：LLM（大型语言模型）是一个"超级自动补全"系统，给它一段文字，它预测最合理的下一段文字。

理解几个核心参数，够用了：

| 参数 | 通俗解释 | 建议值 |
|------|---------|--------|
| **Token** | 模型处理文本的基本单位，约 1 token ≈ 0.75 个英文单词 ≈ 1.5 个中文字 | - |
| **上下文窗口** | 模型一次能"看到"的最大 token 数，超出就会忘掉开头的内容 | 尽量控制在窗口的 70% 以内 |
| **Temperature** | 输出的随机程度。0 = 严肃确定，1 = 天马行空 | 代码用 0~0.3，创作用 0.7~1 |
| **Top_p** | 和 temperature 类似，控制词汇多样性，通常两者选一个调 | 0.9 是个好默认值 |
| **Max tokens** | 限制模型回复的最大长度 | 根据场景设置，避免超额计费 |

#### 主流模型怎么选（前端视角）

| 模型 | 优势 | 缺点 | 前端场景推荐 |
|------|------|------|------------|
| GPT-4o | 综合能力强，支持视觉 | 贵，访问需要翻墙 | 通用、视觉理解 |
| Claude 3.5 Sonnet | 代码能力强，长文档处理好 | 同上 | 代码生成、长文本处理 |
| Gemini 1.5 Pro | 超长上下文（100万 token） | 偶尔不稳定 | 超长文档、多模态 |
| DeepSeek V3/R1 | 国内可直接调，推理能力强，便宜 | 上下文较短 | 国内项目首选 |
| 通义千问 / 文心 | 中文理解好，阿里/百度生态 | 英文略弱 | 中文场景 |

**怎么选**：优先看你的用户在哪、你的服务器在哪。国内 B 端项目优先 DeepSeek；有出海需求或对接 OpenAI 生态用 GPT-4o；代码相关任务 Claude 很稳。

#### 提示词工程（Prompt Engineering）基础

不需要深研，掌握三个核心概念够用 80% 的场景：

**① System Prompt（系统提示）**
给模型设定身份和规则，相当于"上岗培训"。

```js
const messages = [
  {
    role: 'system',
    content: '你是一个专业的代码审查助手，只用中文回复，每次指出 3 个最重要的问题。'
  },
  {
    role: 'user',
    content: '帮我审查这段代码：...'
  }
]
```

**② Few-shot（举例示范）**
给模型几个输入→输出的例子，它就能模仿格式。适合要求固定输出结构的场景。

```js
// 示例：让模型按固定格式输出
content: `
按以下格式输出 JSON：
示例输入：苹果 100g
示例输出：{"food": "苹果", "amount": 100, "unit": "g"}

现在处理：香蕉 200g
`
```

**③ Chain of Thought（思维链）**
加上"一步步思考"或"请先分析，再给出答案"，让模型在回答前推理，大幅提升复杂问题的准确率。

```js
content: '请一步步分析这个 bug 的原因，然后给出修复方案。'
```

#### 模型能力边界（要知道的坑）

- **幻觉问题**：模型会"编造"不存在的 API、链接、数据。凡是需要准确的信息（官方文档、具体数字），别完全信任模型，要验证。
- **知识截止**：训练数据有时间截止点，最新的库版本、API 变更它可能不知道。
- **推理局限**：复杂数学计算、多步骤逻辑容易出错。GPT-4o/Claude 的推理能力好很多，但仍不完美。
- **没有记忆**：每次对话都是全新的，"上次说过的"它不会记得，需要你在上下文里重新提供。

---

### 2. AI API 调用

#### OpenAI API / 兼容接口基本用法

大多数模型（DeepSeek、通义千问等）都提供 OpenAI 兼容接口，学一套就能用多家。

```ts
// 安装：npm i openai
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.deepseek.com', // 换成任意兼容接口
})

const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: '你是一个前端助手' },
    { role: 'user', content: '解释一下 useEffect 的依赖数组' }
  ],
  temperature: 0.7,
  max_tokens: 1000,
})

console.log(response.choices[0].message.content)
```

**前端直接调 vs 经过后端转发**：
- 前端直接调：快速原型可以，但 API Key 会暴露，**生产环境绝对不要这么做**
- 经过后端：标准做法，后端转发请求、控制权限、做限流

#### 流式输出（Stream）实现

**为什么需要流式**：模型生成完整回复可能需要 10-30 秒，用户等得很痛苦。流式让内容一边生成一边显示，体验好 10 倍。

**后端（Node.js）**：

```ts
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  stream: true, // 开启流式
})

// 用 SSE 推给前端
res.setHeader('Content-Type', 'text/event-stream')

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || ''
  if (content) {
    res.write(`data: ${JSON.stringify({ content })}\n\n`)
  }
}
res.write('data: [DONE]\n\n')
res.end()
```

**前端接收**：

```ts
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: userInput }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const text = decoder.decode(value)
  // 解析 SSE 格式，更新 UI
  text.split('\n').forEach(line => {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const { content } = JSON.parse(line.slice(6))
      setOutput(prev => prev + content) // React state 累加
    }
  })
}
```

#### Token 计费与成本控制

**计算规则**：输入 token + 输出 token 分别计费，输出通常更贵。

**控制成本的实用技巧**：
1. **压缩 System Prompt**：每次请求都会计入 token，写短点
2. **控制对话历史长度**：保留最近 N 轮，不要把所有历史都塞进去
3. **设置 max_tokens**：防止模型生成超长回复
4. **选合适的模型**：简单任务用便宜的小模型（gpt-4o-mini），复杂任务才用旗舰

#### 错误处理与重试策略

```ts
async function callLLM(messages: Message[], retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await client.chat.completions.create({ model, messages })
      return response.choices[0].message.content!
    } catch (error: any) {
      if (error.status === 429) {
        // 限流，指数退避
        await sleep(Math.pow(2, i) * 1000)
        continue
      }
      if (error.status === 500 && i < retries - 1) {
        // 服务端错误，重试
        continue
      }
      throw error // 其他错误直接抛出
    }
  }
  throw new Error('LLM 调用失败，已重试多次')
}
```

常见错误码：
- `429`：限流，慢下来或者升级套餐
- `401`：API Key 不对
- `400`：请求格式错误（通常是 messages 格式问题）
- `500`/`503`：模型服务故障，重试

---

## 第二部分：AI 产品开发技能

### 3. RAG（检索增强生成）

#### 为什么需要 RAG

模型有两大先天限制：
1. **知识截止**：不知道最新信息
2. **不知道你的私有数据**：公司内部文档、产品手册它没见过

RAG（Retrieval-Augmented Generation）= 先从你的知识库里搜索相关内容，再把搜到的内容塞给模型，让它基于这些内容回答。

**通俗类比**：你去考试可以带参考书（RAG），比起全靠记忆（纯模型）准确多了。

#### 向量数据库基础（Embedding 是什么）

**Embedding**：把一段文字变成一串数字（向量），语义相近的文字，对应的向量也相近。

**通俗类比**：把每篇文章变成一个坐标，"苹果电脑"和"MacBook"的坐标很近，"苹果电脑"和"香蕉"的坐标很远。

**RAG 工作流程**：
1. 把知识库所有文档切片 → 生成 Embedding → 存入向量数据库
2. 用户提问 → 问题也生成 Embedding → 在向量数据库里找最相似的文档片段
3. 把找到的片段 + 原始问题一起发给模型 → 模型基于这些内容回答

#### 前端工程师如何接入 RAG

作为前端，你通常不需要自己搭 RAG，只需要对接后端提供的 RAG 服务 API：

```ts
// 典型的 RAG 服务接口调用
const response = await fetch('/api/rag/query', {
  method: 'POST',
  body: JSON.stringify({
    question: '我们的退款政策是什么？',
    knowledge_base_id: 'kb_001', // 指定知识库
    top_k: 3, // 返回最相关的 3 条
  })
})

const { answer, sources } = await response.json()
// sources 是检索到的原文片段，可以展示给用户作为来源引用
```

**你需要关心的前端侧**：
- 展示检索到的来源引用（提升可信度）
- 处理"未找到相关内容"的边界情况
- 知识库选择 UI（多知识库场景）

#### 典型场景

- **文档问答**：上传 PDF/Word，然后基于文档对话
- **企业知识库**：公司规章制度、产品手册的智能问答
- **代码库问答**：基于项目代码库回答技术问题

---

### 4. AI 组件开发

#### 对话框（Chat UI）组件设计要点

```
核心数据结构：
Message[] = [
  { id, role: 'user' | 'assistant' | 'system', content, timestamp }
]
```

设计要点：
- **消息列表**：自动滚动到底部（新消息来了），但用户上滑查看历史时不要强制回跳
- **输入区**：支持 Shift+Enter 换行，Enter 发送
- **消息气泡**：user 靠右，assistant 靠左，视觉区分清晰
- **时间戳**：不需要每条显示，相邻消息时间差超过 5 分钟才显示

```tsx
// 自动滚动到底部
const scrollRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (scrollRef.current && !userScrolledUp) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }
}, [messages])
```

#### 流式文本渲染（打字机效果原理）

**原理**：不是真的在模拟打字，而是把流式接收到的内容**增量追加**到 state 里，React re-render 自然呈现出"打字"效果。

```tsx
const [streamContent, setStreamContent] = useState('')

// 接收流式数据时
onChunkReceived((chunk) => {
  setStreamContent(prev => prev + chunk)
})
```

**注意点**：
- 流式渲染时光标闪烁效果（CSS `::after` 伪元素 + 动画）
- 流式结束后再渲染 Markdown（避免 Markdown 语法被截断导致闪烁）

#### Markdown 渲染（含代码高亮）

推荐方案：`react-markdown` + `react-syntax-highlighter`

```tsx
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

<ReactMarkdown
  components={{
    code({ node, inline, className, children }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <SyntaxHighlighter language={match[1]}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className}>{children}</code>
      )
    }
  }}
>
  {content}
</ReactMarkdown>
```

**XSS 注意**：`react-markdown` 默认不渲染 HTML 标签，是安全的。如果用 `dangerouslySetInnerHTML` 渲染 Markdown HTML，必须用 DOMPurify 净化。

#### 文件上传与多模态输入

```tsx
// 图片上传 + 发送给视觉模型
const handleImageUpload = async (file: File) => {
  const base64 = await fileToBase64(file)
  
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: '描述这张图片' },
        { type: 'image_url', image_url: { url: base64 } }
      ]
    }
  ]
  // 发送给支持视觉的模型（GPT-4o、Claude 3 等）
}
```

#### 加载/错误/停止生成 UX 设计

| 状态 | UI 处理 |
|------|---------|
| **加载中（等待首个 token）** | 显示三点动画或骨架屏，用户知道在处理 |
| **流式生成中** | 显示光标，右下角显示"停止生成"按钮 |
| **错误** | 明确提示错误原因 + 重试按钮，不要让用户重新输入 |
| **停止生成** | AbortController 取消请求，保留已生成内容 |

```ts
// 停止生成
const abortController = new AbortController()

fetch('/api/chat', { signal: abortController.signal, ... })

// 用户点击停止
abortController.abort()
```

---

### 5. Agent 与工具调用（Function Calling）

#### Agent 是什么

**通俗解释**：普通 LLM 只会回答问题。Agent = LLM + 工具 + 循环执行能力。它可以自己决定"我需要先搜索，再计算，再汇总"，像一个会主动干活的员工。

#### Function Calling 原理与代码示例

**原理**：你提前告诉模型"你有这些工具可以用"，模型决定什么时候调用哪个工具，然后你执行，把结果还给模型继续推理。

```ts
// 1. 定义工具
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取某个城市的天气',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名' }
        },
        required: ['city']
      }
    }
  }
]

// 2. 发送请求
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages,
  tools,
})

// 3. 判断模型是否要调用工具
if (response.choices[0].finish_reason === 'tool_calls') {
  const toolCall = response.choices[0].message.tool_calls[0]
  const args = JSON.parse(toolCall.function.arguments)
  
  // 4. 执行实际工具
  const result = await getWeather(args.city)
  
  // 5. 把结果还给模型
  messages.push(response.choices[0].message)
  messages.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content: JSON.stringify(result)
  })
  
  // 6. 继续请求，让模型基于工具结果生成最终回复
  const finalResponse = await client.chat.completions.create({ model, messages })
}
```

#### MCP（Model Context Protocol）是什么，前端怎么用

**MCP** 是 Anthropic 推出的标准协议，让 AI 应用统一接入各种工具（文件系统、数据库、API 等），就像 USB 接口统一了各种外设。

**前端怎么用**：目前主要在桌面客户端（Claude Desktop、Cursor）里配置 MCP Server，前端 Web 应用更多是对接后端封装好的 MCP 服务。

**关注点**：理解 MCP 的架构（Client-Server），知道如何为自己的前端应用接入现有 MCP Server，会调试 MCP 工具调用链路。

#### 多步骤 Agent 的前端交互设计

Agent 执行多个步骤时，UI 要让用户知道进展：

- **步骤可视化**：显示当前在执行哪一步（"正在搜索..."→"正在分析..."→"生成结论..."）
- **中间结果展示**：每步工具调用的结果可以折叠展示，供用户检查
- **可中断**：任何步骤都应该可以停止
- **错误定位**：哪一步失败要说清楚，不要只说"出错了"

---

## 第三部分：AI 编程工具使用

### 6. AI 辅助编程

#### 工具对比

| 工具 | 特点 | 推荐场景 |
|------|------|---------|
| **Cursor** | 深度集成 AI，可以理解整个代码库上下文 | 日常开发首选，功能最强 |
| **GitHub Copilot** | VS Code 插件，代码补全稳定 | 用 VS Code 的同学 |
| **通义灵码** | 国内，对中文注释理解好，阿里云生态 | 国内项目，不想翻墙 |

#### 如何写好 Prompt 让 AI 帮你写代码

**好的代码 Prompt 模板**：
```
上下文：[项目技术栈、相关代码片段]
任务：[明确要做什么]
要求：[格式要求、不能做什么、要参考的模式]
示例：[有的话贴上]
```

**实际例子**：
```
// 差：写一个搜索组件
// 好：
用 React + TypeScript 写一个搜索输入框组件，要求：
- 支持防抖（300ms），
- 输入时显示 loading 状态，
- 搜索结果为空时显示"无结果"，
- 样式用 TailwindCSS
参考项目中已有的 Input 组件风格（见 src/components/Input.tsx）
```

#### AI 代码审查 / 重构 / 测试生成

- **代码审查**：把代码贴给 AI，说"找出潜在的 bug 和性能问题"，比让它直接改更安全
- **重构**：告诉 AI 重构目标，让它给方案，你来决策，不要盲目接受
- **测试生成**：AI 生成 Jest/Vitest 测试用例效率很高，但要检查边界情况是否覆盖

#### AI 的局限性：不要让 AI 做架构决策

AI 写具体函数很厉害，但以下场景要自己主导：
- **系统架构**（前后端分层、数据流设计）
- **技术选型**（它会给你一堆选项但不知道你的具体约束）
- **安全相关代码**（鉴权、加密，AI 生成的代码要仔细检查）
- **数据库 Schema 设计**（它不了解你的业务增长方向）

---

### 7. Vibe Coding（氛围编程）

#### 什么是 Vibe Coding

**通俗定义**：用自然语言描述你想要什么，让 AI 生成大部分代码，你更多是在"审核"和"指挥"而不是"编写"。

由 Andrej Karpathy（前 Tesla AI 总监）提出，核心思路是：与其想清楚怎么实现，不如先说清楚要什么。

#### 适合的场景

- 快速原型验证（"帮我做一个可以演示的 Demo"）
- 工具脚本（"写个脚本批量处理这些 JSON 文件"）
- 简单的管理后台页面
- 个人项目、Hackathon
- 不熟悉的领域快速起步（"帮我写个 Python 爬虫"）

#### 不适合的场景

- **核心业务逻辑**：支付、订单、库存等，出了问题影响大
- **安全相关代码**：OAuth 流程、权限控制、数据加密
- **高性能要求场景**：AI 生成的代码不一定是最优解
- **需要长期维护的复杂模块**：AI 生成的代码可读性和可维护性参差不齐

---

## 第四部分：前沿方向

### 8. Web AI（浏览器端 AI）

#### WebGPU + WebNN：浏览器跑模型的基础

- **WebGPU**：让 JS 能调用 GPU 计算能力（不只是渲染），跑神经网络推理
- **WebNN**：Web Neural Network API，浏览器原生 AI 加速接口，调用设备的 NPU/GPU

**现状**：Chrome 已支持 WebGPU，WebNN 还在推进中。目前主要在 Chrome 高版本上可用。

**为什么重要**：本地推理 = 无网络延迟 + 数据不出设备（隐私保护）+ 无 API 费用。

#### Transformers.js：在浏览器直接跑小模型

**Hugging Face 出品**，把 Python 的 transformers 库搬到了浏览器。

```ts
import { pipeline } from '@xenova/transformers'

// 浏览器端情感分析（模型自动下载并缓存）
const classifier = await pipeline('sentiment-analysis')
const result = await classifier('I love this product!')
// [{ label: 'POSITIVE', score: 0.998 }]
```

**典型场景**：
- **OCR**：识别图片中的文字，完全本地
- **语音识别**：Whisper 小模型，离线转文字
- **图片分类**：本地判断图片内容（不上传服务器）
- **嵌入计算**：本地生成 Embedding

**学到什么程度**：会用 `@xenova/transformers` 跑常见任务，理解模型加载和缓存机制即可。

---

### 9. AI 工作流与低代码

#### 主流平台对比

| 平台 | 特点 | 适合场景 |
|------|------|---------|
| **Dify** | 开源，可私有化部署，功能全 | 企业内部，数据安全要求高 |
| **Coze/扣子** | 字节出品，海外/国内双版本，生态丰富 | 快速搭建 Agent |
| **n8n** | 开源，更偏通用工作流自动化 | 多系统集成 |
| **FastGPT** | 国内开源 RAG 平台 | 知识库问答 |

#### 前端工程师如何对接这些平台的 API

这些平台都提供标准 HTTP API，基本和调用 OpenAI 一样：

```ts
// Dify API 示例
const response = await fetch('https://api.dify.ai/v1/chat-messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DIFY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inputs: {},
    query: userMessage,
    response_mode: 'streaming', // 支持流式
    conversation_id: conversationId,
  })
})
```

#### 什么时候用工作流，什么时候自己写

| 用工作流 | 自己写 |
|---------|--------|
| 快速验证 AI 产品 idea | 需要深度定制 UI 交互 |
| 非技术成员需要调整流程 | 性能要求高，不能多一层转发 |
| 多个 AI 节点编排 | 数据安全要求不允许走第三方 |
| 团队没有 AI 后端能力 | 已有稳定后端，只需接入 LLM |

---

### 10. AI 产品设计思维

#### AI 产品的特殊 UX 挑战

1. **不确定性**：同样的问题，每次回答可能不同。UI 要传达"这是 AI 建议，不是标准答案"
2. **延迟**：生成需要时间，用户容忍度比普通请求低得多，必须用流式 + 进度提示
3. **错误不透明**：模型给了错误答案，用户可能不知道。要提供"反馈"机制（👍👎）
4. **幻觉问题**：AI 可能自信地给出错误信息，重要场景要提供来源引用

#### 如何设计好的 AI 交互

**核心原则：渐进式、可中断、可验证**

- **流式展示**：内容边生成边显示，不要等全部生成再出现
- **渐进展示**：先给关键结论，再给详细内容
- **可中断**：生成过程中用户随时可以停止或重新提问
- **来源透明**：RAG 场景展示引用来源，让用户可以核实
- **置信度提示**：对于可能不准确的内容，UI 层面给出"仅供参考"提示

```
设计反例（差）：
用户等 20 秒 → 一次性显示完整答案 → 没有来源 → 没有反馈入口

设计范例（好）：
立即显示加载状态 → 流式输出文字 → 引用来源可点击 → 👍👎反馈按钮
```

#### 人机协作设计原则

- **AI 建议，人来决策**：AI 的输出是参考，不是命令。关键操作（删除、发布）要人确认
- **降低学习成本**：用户不需要学会写 Prompt 才能用好你的产品，提供预设模板和引导
- **保留撤销**：AI 修改了内容后，要能轻松回退到修改前
- **渐进信任**：新用户先展示小范围 AI 能力，随着信任增加再开放更多自动化

---

## 第五部分：学习路径建议

### 11. 学习优先级

#### 必须掌握（3个月内，核心竞争力）

- [ ] OpenAI 兼容 API 调用（含流式）
- [ ] Chat UI 组件完整实现（含流式渲染、Markdown 高亮）
- [ ] Prompt Engineering 基础（System Prompt、Few-shot）
- [ ] Function Calling 基本用法
- [ ] 错误处理与用户体验设计
- [ ] 至少一个 AI 辅助编程工具（Cursor 推荐）

#### 建议了解（6个月内，拓宽视野）

- [ ] RAG 原理和接入方式
- [ ] 至少一个工作流平台（Dify 或 Coze）的基本使用
- [ ] Transformers.js 跑一个简单的本地模型 Demo
- [ ] Agent 与多步骤工具调用
- [ ] MCP 协议基础

#### 选修方向（根据岗位，深入某一方向）

| 方向 | 学什么 |
|------|--------|
| **AI 产品前端** | AI UX 设计、多模态交互、复杂 Agent UI |
| **Web AI / 端侧 AI** | WebGPU、Transformers.js、ONNX Runtime Web |
| **AI 工具开发** | VS Code 插件、桌面 Electron 应用、MCP Server 开发 |
| **全栈 AI** | LangChain.js、向量数据库、RAG 系统搭建 |

---

### 12. 推荐资源

#### 官方文档（最靠谱）

| 资源 | 链接 | 用途 |
|------|------|------|
| OpenAI Docs | platform.openai.com/docs | API 参考，必读 |
| Anthropic Docs | docs.anthropic.com | Claude API + Prompt 指南 |
| Vercel AI SDK | sdk.vercel.ai | 前端 AI 工具库，强烈推荐 |
| Transformers.js | huggingface.co/docs/transformers.js | 浏览器端 AI |
| LangChain.js | js.langchain.com | Agent/RAG 框架 |

#### 必看的 GitHub 项目

- **[vercel/ai](https://github.com/vercel/ai)**：Vercel AI SDK，前端接入 AI 的最佳实践
- **[openai/openai-node](https://github.com/openai/openai-node)**：官方 Node.js SDK
- **[lobehub/lobe-chat](https://github.com/lobehub/lobe-chat)**：开源 ChatGPT 客户端，学 Chat UI 最好的参考
- **[mckaywrigley/chatbot-ui](https://github.com/mckaywrigley/chatbot-ui)**：简洁的 AI 对话 UI 实现
- **[xenova/transformers.js](https://github.com/xenova/transformers.js)**：浏览器端 AI

#### 课程 / 教程

- **DeepLearning.AI 短课程**（deeplearning.ai/short-courses）：LLM 应用开发系列，全英文，每个约 1-2 小时
- **Prompt Engineering Guide**（promptingguide.ai）：Prompt 技巧大全，中文版也有
- **字节跳动豆包 MarsCode**：国内平台，对中文友好

#### 值得关注的博主/Newsletter

| 名称 | 平台 | 内容 |
|------|------|------|
| Andrej Karpathy | X/YouTube | AI 原理+工程实践，Vibe Coding 提出者 |
| Simon Willison | simonwillison.net | LLM 实践，每周更新 |
| The Pragmatic Engineer | newsletter | 大厂 AI 工程实践 |
| 宝玉 xp | 微博/X | AI 技术翻译+解读，中文友好 |
| 歸藏 | X/即刻 | AI 产品设计，前端视角 |

---

## 附：知识地图总览

```
AI 前端工程师技能树
│
├── 基础层（必须）
│   ├── LLM 核心概念（token、上下文、temperature）
│   ├── API 调用（OpenAI 兼容接口）
│   └── 流式输出（SSE / ReadableStream）
│
├── 产品层（核心竞争力）
│   ├── Chat UI 组件（流式渲染、Markdown）
│   ├── RAG 接入
│   └── Function Calling / Agent
│
├── 工具层（效率倍增）
│   ├── Cursor / Copilot
│   └── Dify / Coze 工作流
│
└── 前沿层（差异化）
    ├── Web AI（Transformers.js）
    ├── MCP 协议
    └── AI UX 设计
```

---

> 最后一句话：AI 前端工程师不是要你懂模型训练，而是要你**会用模型、会接 API、会做好体验**。这三件事，3 个月认真学完全够。
