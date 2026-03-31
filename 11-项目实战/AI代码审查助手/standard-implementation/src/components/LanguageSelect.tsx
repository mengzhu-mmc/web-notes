import React from 'react'
import type { Language } from '../types'

/** 支持的语言选项配置 */
const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
]

interface LanguageSelectProps {
  /** 当前选中的语言 */
  value: Language
  /** 语言变更回调 */
  onChange: (lang: Language) => void
}

/**
 * 编程语言选择下拉组件
 */
const LanguageSelect: React.FC<LanguageSelectProps> = ({ value, onChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label
        htmlFor="language-select"
        style={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap' }}
      >
        语言：
      </label>
      <select
        id="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        style={{
          background: '#1e293b',
          color: '#e2e8f0',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 13,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelect
