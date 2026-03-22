/**
 * navigation/index.js — 路由配置
 *
 * 核心知识点：React Navigation Stack Navigator
 *
 * 两套导航栈：
 * - AuthStack：未登录时显示（Login / Register）
 * - AppStack：登录后显示（Todo）
 *
 * 根据 AuthContext 中的 token 自动切换，
 * 不需要手动 navigate，状态变了导航自动跳转。
 *
 * 这是 React Navigation 官方推荐的"认证流"写法。
 */

import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { useAuth } from '../context/AuthContext'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import TodoScreen from '../screens/TodoScreen'

const Stack = createNativeStackNavigator()

// 未登录导航栈
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
)

// 已登录导航栈
const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Todo"
      component={TodoScreen}
      options={{ title: '我的待办' }}
    />
  </Stack.Navigator>
)

// 根导航组件
export default function Navigation() {
  const { state } = useAuth()

  // App 启动时等待 AsyncStorage 读取，显示 loading
  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {/* token 存在 → 显示 App；否则显示登录页 */}
      {state.token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
