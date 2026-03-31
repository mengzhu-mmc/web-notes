import type { Language } from '../types'
import { addLineNumbers } from './lineNumbers'

/**
 * 构建系统提示词，要求 AI 以结构化 Markdown 格式输出审查结果
 * @returns 系统提示词字符串
 */
export function buildSystemPrompt(): string {
  return `你是一位资深软件工程师，专注于代码质量审查。请对用户提交的代码进行全面分析，并严格按照以下 Markdown 结构输出审查报告：

## 🚨 严重问题
列出所有可能导致 bug、安全漏洞、性能崩溃的严重问题。每条问题需说明：
- **行号**（参考代码前缀中的行号）
- **问题描述**（具体说明问题所在）
- **风险等级**（严重 / 高 / 中）

如无严重问题，写"无"。

## 💡 改进建议
提出代码可读性、可维护性、最佳实践方面的改进建议，每条建议需说明：
- **改进点**
- **原因**

## ✨ 优化后代码
提供完整的优化后代码（使用对应语言的代码块），包含注释说明关键改动。

## 📊 综合评分
给出 0-100 的整数评分，格式如下：

**评分：XX / 100**

> 评分依据：（简要说明扣分原因和亮点）

---
请保持回复简洁专业，避免不必要的废话。`
}

/**
 * 构建用户消息，将代码加行号后拼入提示中
 * @param code 待审查的源代码
 * @param language 编程语言
 * @returns 用户消息字符串
 */
export function buildUserMessage(code: string, language: Language): string {
  const numberedCode = addLineNumbers(code)
  return `请审查以下 ${language} 代码：

\`\`\`${language}
${numberedCode}
\`\`\``
}
