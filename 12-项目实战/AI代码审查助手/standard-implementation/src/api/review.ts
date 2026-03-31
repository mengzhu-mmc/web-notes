import type { Language } from '../types'

/** API 请求超时时间（毫秒） */
const TIMEOUT_MS = 60_000

/**
 * 调用后端 /api/review 接口发起流式代码审查请求
 * 仅在 Vite 开发环境中直接使用，生产环境由 Vercel serverless 处理
 *
 * @param code 待审查的源代码
 * @param language 编程语言
 * @param signal AbortSignal，用于取消请求
 * @returns fetch Response 对象（body 为流式 SSE 数据）
 */
export async function callReviewAPI(
  code: string,
  language: Language,
  signal: AbortSignal
): Promise<Response> {
  const apiBase = import.meta.env.VITE_API_BASE ?? '/api'

  // 创建超时 AbortController 并与传入 signal 合并
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('请求超时（60s）'))
  }, TIMEOUT_MS)

  // 监听外部 abort，同步触发超时 controller 的 abort
  signal.addEventListener('abort', () => {
    clearTimeout(timeoutId)
    timeoutController.abort(signal.reason)
  })

  try {
    const response = await fetch(`${apiBase}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
      signal: timeoutController.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
