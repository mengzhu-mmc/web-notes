import { useState, useRef, useEffect, useCallback } from 'react'
import type { Language } from '../types'
import { callReviewAPI } from '../api/review'

/** HTTP 错误状态码对应的中文提示 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数有误，请检查代码内容',
  401: 'API Key 无效或未配置，请检查环境变量',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
}

/** useStreamReview 的返回值类型 */
export interface UseStreamReviewReturn {
  /** AI 审查输出内容（Markdown 字符串，流式追加） */
  output: string
  /** 是否正在请求中 */
  loading: boolean
  /** 错误信息，无错误时为 null */
  error: string | null
  /** 发起代码审查请求 */
  review: (code: string, language: Language) => Promise<void>
  /** 取消当前正在进行的请求 */
  cancel: () => void
}

/**
 * 核心流式审查 Hook，封装流式 fetch、AbortController 生命周期管理和错误处理
 * @returns 审查状态与操作方法
 */
export function useStreamReview(): UseStreamReviewReturn {
  const [output, setOutput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // 持有当前请求的 AbortController 引用
  const abortControllerRef = useRef<AbortController | null>(null)

  /** 组件卸载时自动取消进行中的请求 */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  /** 取消当前请求 */
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  /**
   * 发起流式代码审查请求
   * 流程：abort 上一次请求 → 重置状态 → 新建 AbortController → fetch → 读取流 → 更新 output
   */
  const review = useCallback(async (code: string, language: Language) => {
    // 取消上一次未完成的请求
    abortControllerRef.current?.abort()

    const controller = new AbortController()
    abortControllerRef.current = controller

    setOutput('')
    setError(null)
    setLoading(true)

    try {
      const response = await callReviewAPI(code, language, controller.signal)

      // 处理 HTTP 错误状态码
      if (!response.ok) {
        const message =
          HTTP_ERROR_MESSAGES[response.status] ??
          `请求失败（HTTP ${response.status}）`
        throw new Error(message)
      }

      const body = response.body
      if (!body) {
        throw new Error('响应体为空，无法读取流数据')
      }

      // 使用 TextDecoder 以流模式逐块解码 UTF-8
      const reader = body.getReader()
      const decoder = new TextDecoder('utf-8', { fatal: false })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // stream: true 允许解码不完整的多字节字符
        const chunk = decoder.decode(value, { stream: true })
        setOutput((prev) => prev + chunk)
      }

      // flush 剩余缓冲
      const remaining = decoder.decode()
      if (remaining) {
        setOutput((prev) => prev + remaining)
      }
    } catch (err) {
      if (err instanceof Error) {
        // AbortError 是用户主动取消，不作为错误提示
        if (err.name === 'AbortError') {
          return
        }
        setError(err.message)
      } else {
        setError('未知错误，请刷新页面重试')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { output, loading, error, review, cancel }
}
