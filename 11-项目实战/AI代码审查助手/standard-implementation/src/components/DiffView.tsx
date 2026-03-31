import React from 'react'
import { DiffEditor } from '@monaco-editor/react'
import type { Language } from '../types'

interface DiffViewProps {
  /** 原始代码（左侧，审查前） */
  original: string
  /** 修改后代码（右侧，AI 建议版本） */
  modified: string
  /** 编程语言（影响语法高亮） */
  language: Language
}

/**
 * 代码 Diff 对比组件，使用 Monaco DiffEditor 展示原始代码与优化代码的差异
 */
const DiffView: React.FC<DiffViewProps> = ({ original, modified, language }) => {
  return (
    <div
      style={{
        width: '100%',
        height: 400,
        border: '1px solid #334155',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          background: '#1e293b',
          padding: '6px 16px',
          fontSize: 12,
          color: '#94a3b8',
          gap: 24,
        }}
      >
        <span>← 原始代码</span>
        <span>→ 优化建议</span>
      </div>
      <DiffEditor
        height="calc(100% - 30px)"
        language={language}
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          readOnly: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          renderSideBySide: true,
        }}
      />
    </div>
  )
}

export default DiffView
