import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

interface ReviewOutputProps {
  /** 审查结果内容（Markdown 格式） */
  content: string
  /** 是否处于加载/流式传输中 */
  loading: boolean
}

/**
 * 代码审查结果展示组件，支持流式渲染和 Markdown 高亮
 * loading=true 且无内容时显示骨架占位，有内容时同步渲染（流式效果）
 */
const ReviewOutput: React.FC<ReviewOutputProps> = ({ content, loading }) => {
  const showSkeleton = loading && content.length === 0

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        background: '#0f172a',
        borderRadius: 8,
        border: '1px solid #1e293b',
        minHeight: 0,
      }}
    >
      {showSkeleton ? (
        // 骨架占位：模拟三行内容加载中的效果
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
            ⏳ 正在分析中...
          </div>
          {[80, 60, 90, 50].map((width, i) => (
            <div
              key={i}
              style={{
                height: 14,
                borderRadius: 4,
                background: '#1e293b',
                width: `${width}%`,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </div>
      ) : content ? (
        // 渲染 Markdown 内容（流式过程中也实时展示）
        <div
          className="markdown-body"
          style={{
            color: '#e2e8f0',
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              // 代码块样式覆盖
              pre: ({ children, ...props }) => (
                <pre
                  {...props}
                  style={{
                    background: '#1e293b',
                    borderRadius: 6,
                    padding: '12px 16px',
                    overflowX: 'auto',
                    margin: '12px 0',
                    fontSize: 13,
                  }}
                >
                  {children}
                </pre>
              ),
              // 行内代码样式
              code: ({ children, className, ...props }) => {
                const isBlock = className?.startsWith('language-')
                return isBlock ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code
                    style={{
                      background: '#1e293b',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 13,
                      color: '#93c5fd',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                )
              },
              // 标题样式
              h2: ({ children, ...props }) => (
                <h2
                  {...props}
                  style={{
                    color: '#f1f5f9',
                    fontSize: 16,
                    fontWeight: 600,
                    margin: '20px 0 10px',
                    borderBottom: '1px solid #1e293b',
                    paddingBottom: 6,
                  }}
                >
                  {children}
                </h2>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {/* 流式加载中显示光标动画 */}
          {loading && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 16,
                background: '#60a5fa',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'blink 1s step-end infinite',
              }}
            />
          )}
          <style>{`
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `}</style>
        </div>
      ) : (
        // 空状态提示
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#475569',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 40 }}>🔍</div>
          <div style={{ fontSize: 14 }}>在左侧输入代码，点击「开始审查」</div>
        </div>
      )}
    </div>
  )
}

export default ReviewOutput
