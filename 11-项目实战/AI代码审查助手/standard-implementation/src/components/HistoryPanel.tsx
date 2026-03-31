import React from 'react'
import type { ReviewRecord } from '../types'

interface HistoryPanelProps {
  /** 历史记录列表 */
  records: ReviewRecord[]
  /** 点击某条记录时的回调，用于回填代码和结果 */
  onSelect: (record: ReviewRecord) => void
  /** 清空所有历史记录的回调 */
  onClear: () => void
}

/**
 * 将时间戳格式化为可读的日期时间字符串
 * @param ts 毫秒时间戳
 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 历史记录侧栏组件，展示最近的审查记录列表，支持回填和清空
 */
const HistoryPanel: React.FC<HistoryPanelProps> = ({
  records,
  onSelect,
  onClear,
}) => {
  if (records.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#475569',
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        暂无历史记录
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 头部：标题 + 清空按钮 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          历史记录（{records.length} 条）
        </span>
        <button
          onClick={onClear}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            fontSize: 12,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          清空
        </button>
      </div>

      {/* 记录列表 */}
      <ul
        style={{
          listStyle: 'none',
          overflowY: 'auto',
          flex: 1,
          margin: 0,
          padding: 0,
        }}
      >
        {records.map((record) => (
          <li
            key={record.id}
            onClick={() => onSelect(record)}
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #0f172a',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLLIElement).style.background = '#1e293b'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLLIElement).style.background = 'transparent'
            }}
          >
            {/* 时间 + 语言 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span style={{ color: '#64748b', fontSize: 11 }}>
                {formatTime(record.createdAt)}
              </span>
              <span
                style={{
                  color: '#60a5fa',
                  fontSize: 11,
                  background: '#1e3a5f',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {record.language}
              </span>
            </div>
            {/* 代码预览（前 30 字） */}
            <div
              style={{
                color: '#94a3b8',
                fontSize: 12,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {record.code.trim().slice(0, 30)}
              {record.code.trim().length > 30 ? '...' : ''}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default HistoryPanel
