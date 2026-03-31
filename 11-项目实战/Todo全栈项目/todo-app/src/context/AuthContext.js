/**
 * context/AuthContext.js — 全局登录状态管理
 *
 * 核心知识点：React Context + useReducer
 *
 * 为什么用 Context 而不是 Redux？
 * - 项目较小，Context 足够，不需要引入 Redux 复杂度
 * - 登录状态是典型的"跨层级共享数据"场景
 *
 * 状态结构：
 * {
 *   isLoading: true,   // 初始化阶段（从 AsyncStorage 读 token）
 *   token: null,       // JWT token
 *   user: null         // { id, username, avatar }
 * }
 *
 * 使用方式：
 *   const { state, login, logout } = useAuth()
 *   if (state.token) { // 已登录 }
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 1. 创建 Context
const AuthContext = createContext(null)

// 2. Reducer — 纯函数，根据 action 返回新状态
const authReducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      // App 启动时从 AsyncStorage 恢复 token
      return { ...state, token: action.token, user: action.user, isLoading: false }
    case 'LOGIN':
      // 登录成功
      return { ...state, token: action.token, user: action.user }
    case 'LOGOUT':
      // 退出登录
      return { ...state, token: null, user: null }
    default:
      return state
  }
}

// 3. Provider 组件 — 包裹整个 App，向下提供状态和方法
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,   // 初始为 true，等待 AsyncStorage 读取完成
    token: null,
    user: null
  })

  // App 启动时检查是否有保存的 token
  useEffect(() => {
    const restoreToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token')
        const userStr = await AsyncStorage.getItem('user')
        const user = userStr ? JSON.parse(userStr) : null
        dispatch({ type: 'RESTORE_TOKEN', token, user })
      } catch (e) {
        // token 读取失败，视为未登录
        dispatch({ type: 'RESTORE_TOKEN', token: null, user: null })
      }
    }
    restoreToken()
  }, [])

  // 登录方法 — 保存 token 到 AsyncStorage + 更新 Context 状态
  const login = async (token, user) => {
    await AsyncStorage.setItem('token', token)
    await AsyncStorage.setItem('user', JSON.stringify(user))
    dispatch({ type: 'LOGIN', token, user })
  }

  // 退出方法 — 清除 AsyncStorage + 重置状态
  const logout = async () => {
    await AsyncStorage.removeItem('token')
    await AsyncStorage.removeItem('user')
    dispatch({ type: 'LOGOUT' })
  }

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// 4. 自定义 Hook — 让组件更方便地使用 Context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用')
  }
  return context
}
