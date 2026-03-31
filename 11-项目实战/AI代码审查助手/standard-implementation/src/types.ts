/**
 * 支持的编程语言类型
 */
export type Language = 'javascript' | 'typescript' | 'python' | 'go' | 'rust'

/**
 * 单条代码审查历史记录
 */
export interface ReviewRecord {
  /** nanoid 生成的唯一 ID */
  id: string
  /** 创建时间戳（ms） */
  createdAt: number
  /** 使用的编程语言 */
  language: Language
  /** 被审查的源代码 */
  code: string
  /** AI 审查结果（Markdown 格式） */
  result: string
}
