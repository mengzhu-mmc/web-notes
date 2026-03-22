/**
 * App.js — 应用根组件
 *
 * 职责：
 * 1. 用 AuthProvider 包裹整个应用，提供全局登录状态
 * 2. 渲染 Navigation 组件（根据 token 自动切换路由栈）
 */

import React from 'react'
import { AuthProvider } from './src/context/AuthContext'
import Navigation from './src/navigation'

export default function App() {
  return (
    // AuthProvider 放在最外层，所有子组件都能通过 useAuth() 访问状态
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  )
}
