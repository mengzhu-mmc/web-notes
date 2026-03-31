/**
 * 为代码字符串每行添加右对齐行号前缀，例如：
 *   1 | const x = 1
 *   2 | const y = 2
 *  10 | return x + y
 *
 * @param code 原始代码字符串
 * @returns 带行号前缀的代码字符串
 */
export function addLineNumbers(code: string): string {
  const lines = code.split('\n')
  const totalLines = lines.length
  // 根据总行数计算行号宽度，保证右对齐
  const width = String(totalLines).length

  return lines
    .map((line, index) => {
      const lineNum = String(index + 1).padStart(width, ' ')
      return `${lineNum} | ${line}`
    })
    .join('\n')
}
