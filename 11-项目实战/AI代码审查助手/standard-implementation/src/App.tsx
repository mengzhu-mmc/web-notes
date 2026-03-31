import React, { useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import type { Language, ReviewRecord } from './types'
import { useStreamReview } from './hooks/useStreamReview'
import { useHistory } from './hooks/useHistory'
import LanguageSelect from './components/LanguageSelect'
import CodeInput from './components/CodeInput'
import ReviewOutput from './components/ReviewOutput'
import HistoryPanel from './components/HistoryPanel'

/** 默认示例代码，用于引导用户快速体验 */
const DEFAULT_CODE = `function fetchUserData(userId) {
  const url = 'https://api.example.com/users/' + userId
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log(data)
      document.getElementById('name').innerHTML = data.name
    })
}

fetchUserData(location.search.split('=')[1])`

/**
 * 应用根组件，组装所有子组件，管理全局状态和交互逻辑
 */
const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('javascript')
  const [code, setCode] = useState<string>(DEFAULT_CODE)
  const [showHistory, setShowHistory] = useState<boolean>(false)

  const { output, loading, error, review, cancel } = useStreamReview()
  const { records, addRecord, clearHistory } = useHistory()

  // 用于追踪上一次的 loading 状态，检测 review 完成时机
  const prevLoadingRef = useRef<boolean>(false)
  // 保存当次 review 时的代码快照（loading 期间代码可能被修改）
  const reviewCodeSnapshotRef = useRef<string>('')

  /** 发起 review 时保存代码快照 */
  const handleReview = () => {
    if (!code.trim()) return
    reviewCodeSnapshotRef.current = code
    review(code, language)
  }

  /**
   * 监听 loading 从 true → false 的转变，若有输出则自动保存历史记录
   * 使用 ref 跟踪上一次 loading，避免初始渲染时误触发
   */
  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading

    if (wasLoading && !loading && output.trim()) {
      const record: ReviewRecord = {
        id: nanoid(),
        createdAt: Date.now(),
        language,
        code: reviewCodeSnapshotRef.current,
        result: output,
      }
      addRecord(record)
    }
  }, [loading, output, language, addRecord])

  /** 点击历史记录条目，回填代码和结果 */
  const handleSelectHistory = (record: ReviewRecord) => {
    setCode(record.code)
    setLanguage(record.language)
    setShowHistory(false)
    // 注：历史结果回填由 output 控制，此处依赖 review 重新触发；
    // 如需直接展示历史结果，可将 output 提升到父组件管理
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0f1117',
        color: '#e2e8f0',
      }}
    >
      {/* 顶部导航栏 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>
            Code Review Copilot
          </span>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          style={{
            background: showHistory ? '#1e3a5f' : '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          📋 历史记录（{records.length}）
        </button>
      </header>

      {/* 主体区域 */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左栏：代码输入 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            gap: 12,
            borderRight: '1px solid #1e293b',
            minWidth: 0,
          }}
        >
          {/* 工具栏：语言选择 + 操作按钮 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <LanguageSelect value={language} onChange={setLanguage} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {/* 清空按钮 */}
              <button
                onClick={() => setCode('')}
                disabled={loading}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                清空
              </button>
              {/* 取消按钮（loading 时显示） */}
              {loading && (
                <button
                  onClick={cancel}
                  style={{
                    background: '#3f1515',
                    border: '1px solid #7f1d1d',
                    color: '#fca5a5',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
              )}
              {/* 审查按钮 */}
              <button
                onClick={handleReview}
                disabled={loading || !code.trim()}
                style={{
                  background: loading
                    ? '#1e3a5f'
                    : !code.trim()
                      ? '#1e293b'
                      : '#2563eb',
                  border: 'none',
                  color: !code.trim() ? '#475569' : '#fff',
                  borderRadius: 6,
                  padding: '6px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? '分析中...' : '🚀 开始审查'}
              </button>
            </div>
          </div>

          {/* Monaco 代码编辑器 */}
          <CodeInput value={code} onChange={setCode} language={language} />
        </div>

        {/* 右栏：审查结果 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            minWidth: 0,
          }}
        >
          {/* 错误提示 */}
          {error && (
            <div
              style={{
                background: '#3f1515',
                border: '1px solid #7f1d1d',
                color: '#fca5a5',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 13,
                marginBottom: 10,
                flexShrink: 0,
              }}
            >
              ⚠️ {error}
            </div>
          )}
          <ReviewOutput content={output} loading={loading} />
        </div>

        {/* 历史记录侧栏（折叠展开） */}
        {showHistory && (
          <div
            style={{
              width: 260,
              borderLeft: '1px solid #1e293b',
              background: '#0d1117',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <HistoryPanel
              records={records}
              onSelect={handleSelectHistory}
              onClear={clearHistory}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
