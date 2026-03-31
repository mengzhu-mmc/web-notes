import type { ReviewRecord } from '../types'

/** localStorage 存储键名 */
export const STORAGE_KEY = 'crcopilot_history'

/**
 * 将历史记录数组序列化后写入 localStorage
 * @param records 要持久化的历史记录列表
 */
export function saveHistory(records: ReviewRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    // 存储空间不足或隐私模式下可能失败，静默处理
    console.warn('[storage] saveHistory failed:', err)
  }
}

/**
 * 从 localStorage 读取并反序列化历史记录，出错时返回空数组
 * @returns 历史记录列表
 */
export function loadHistory(): ReviewRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ReviewRecord[]
  } catch (err) {
    console.warn('[storage] loadHistory failed:', err)
    return []
  }
}
