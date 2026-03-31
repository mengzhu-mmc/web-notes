import { useState, useCallback } from 'react'
import type { ReviewRecord } from '../types'
import { loadHistory, saveHistory } from '../utils/storage'

/** 历史记录最大保留条数 */
const MAX_HISTORY = 50

/** useHistory 的返回值类型 */
export interface UseHistoryReturn {
  /** 历史记录列表（最新在前） */
  records: ReviewRecord[]
  /** 添加一条新记录 */
  addRecord: (record: ReviewRecord) => void
  /** 删除指定 id 的记录 */
  removeRecord: (id: string) => void
  /** 清空所有历史记录 */
  clearHistory: () => void
}

/**
 * 历史记录管理 Hook，负责历史记录的增删查及 localStorage 持久化
 * @returns 历史记录状态与操作方法
 */
export function useHistory(): UseHistoryReturn {
  // 初始值从 localStorage 读取，实现跨页面持久化
  const [records, setRecords] = useState<ReviewRecord[]>(() => loadHistory())

  /**
   * 添加一条新的审查记录到历史列表头部，超出上限时截断尾部
   * @param record 新增记录
   */
  const addRecord = useCallback((record: ReviewRecord) => {
    setRecords((prev) => {
      const next = [record, ...prev].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [])

  /**
   * 根据 id 删除指定的历史记录
   * @param id 要删除的记录 ID
   */
  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveHistory(next)
      return next
    })
  }, [])

  /** 清空所有历史记录并同步清除 localStorage */
  const clearHistory = useCallback(() => {
    setRecords([])
    saveHistory([])
  }, [])

  return { records, addRecord, removeRecord, clearHistory }
}
