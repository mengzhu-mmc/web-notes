/**
 * Vercel Edge-compatible Serverless Function
 * POST /api/review
 *
 * 接收前端发来的代码审查请求，调用 OpenAI 兼容 API，
 * 以 ReadableStream 方式将流式响应透传给客户端。
 */

import { buildSystemPrompt, buildUserMessage } from '../src/utils/prompt'
import type { Language } from '../src/types'

/** 请求体类型定义 */
interface ReviewRequestBody {
  code: string
  language: Language
}

/**
 * 将 HTTP 状态码映射为面向用户的中文错误消息
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'API Key 无效，请检查服务端环境变量 API_KEY'
    case 429:
      return '上游 API 请求频率超限，请稍后重试'
    case 500:
      return '上游 API 服务器内部错误'
    default:
      return `上游 API 请求失败（HTTP ${status}）`
  }
}

/**
 * POST 处理函数，接收代码审查请求并流式返回 AI 响应
 * @param req Web Request 对象
 * @returns 流式 Response 或错误 Response
 */
export async function POST(req: Request): Promise<Response> {
  // 解析请求体
  let body: ReviewRequestBody
  try {
    body = (await req.json()) as ReviewRequestBody
  } catch {
    return new Response(JSON.stringify({ error: '请求体解析失败，请发送有效 JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { code, language } = body

  if (!code || !language) {
    return new Response(JSON.stringify({ error: '缺少必要参数：code 或 language' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 读取环境变量
  const apiKey = process.env.API_KEY
  const apiBaseUrl = process.env.API_BASE_URL ?? 'https://api.openai.com/v1'

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: '服务端未配置 API_KEY 环境变量' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 调用 OpenAI 兼容 API（stream: true）
  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserMessage(code, language) },
        ],
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '网络请求失败'
    return new Response(JSON.stringify({ error: `连接上游 API 失败：${message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 上游返回错误状态码
  if (!upstreamResponse.ok) {
    const errorMsg = getErrorMessage(upstreamResponse.status)
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: upstreamResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 将 SSE 流转换为纯文本流（提取 delta.content 并拼接返回）
  const upstreamBody = upstreamResponse.body
  if (!upstreamBody) {
    return new Response(JSON.stringify({ error: '上游响应体为空' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 创建 ReadableStream：解析 SSE 数据，提取文本 chunk 后推送给客户端
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader()
      const decoder = new TextDecoder('utf-8')
      const encoder = new TextEncoder()

      // 用于拼接跨块的不完整 SSE 行
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 按行切分，处理完整的 SSE 事件行
          const lines = buffer.split('\n')
          // 最后一个可能是不完整行，留到下次处理
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()

            // SSE 数据行格式：`data: {...}` 或 `data: [DONE]`
            if (!trimmed.startsWith('data:')) continue

            const dataStr = trimmed.slice(5).trim()
            if (dataStr === '[DONE]') continue

            try {
              const parsed = JSON.parse(dataStr) as {
                choices?: { delta?: { content?: string } }[]
              }
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                controller.enqueue(encoder.encode(content))
              }
            } catch {
              // 忽略非 JSON 格式的 SSE 行（心跳等）
            }
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      // 禁止缓存流式响应
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
