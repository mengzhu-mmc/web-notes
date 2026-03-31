import React from 'react'
import Editor from '@monaco-editor/react'
import type { Language } from '../types'

interface CodeInputProps {
  /** 编辑器当前内容 */
  value: string
  /** 内容变更回调 */
  onChange: (value: string) => void
  /** 当前编程语言（影响语法高亮） */
  language: Language
}

/**
 * 基于 Monaco Editor 的代码输入组件，使用暗色主题和常用编辑器选项
 */
const CodeInput: React.FC<CodeInputProps> = React.memo(
  ({ value, onChange, language }) => {
    return (
      <div
        style={{
          flex: 1,
          border: '1px solid #334155',
          borderRadius: 8,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Editor
          height="100%"
          language={language}
          value={value}
          theme="vs-dark"
          onChange={(val) => onChange(val ?? '')}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            tabSize: 2,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    )
  }
)

CodeInput.displayName = 'CodeInput'

export default CodeInput
