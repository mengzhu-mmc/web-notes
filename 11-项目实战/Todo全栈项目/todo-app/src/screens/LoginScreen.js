/**
 * screens/LoginScreen.js — 登录页
 *
 * React Native 和 Web 的主要区别（这个文件里都能看到）：
 * - div → View
 * - span/p → Text
 * - input → TextInput
 * - button → TouchableOpacity（更灵活）或 Button
 * - CSS → StyleSheet.create（JS 对象，属性名 camelCase）
 * - 布局默认是 Flexbox，且 flexDirection 默认为 'column'
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,  // 解决键盘遮挡输入框的问题
  Platform,
  ActivityIndicator
} from 'react-native'
import { userAPI } from '../api'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请填写用户名和密码')
      return
    }

    setLoading(true)
    try {
      // userAPI.login 返回 { token, user }（axios 拦截器已提取 data）
      const { token, user } = await userAPI.login({ username, password })
      // 调用 Context 的 login 方法，保存 token + 更新状态
      // AuthContext 状态变化后，Navigation 自动切换到 AppStack
      await login(token, user)
    } catch (err) {
      Alert.alert('登录失败', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    // KeyboardAvoidingView：当键盘弹出时，自动上移避免遮挡输入框
    // behavior: iOS 用 'padding'，Android 用 'height'
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <Text style={styles.title}>欢迎回来</Text>
        <Text style={styles.subtitle}>登录你的账号</Text>

        <TextInput
          style={styles.input}
          placeholder="用户名"
          value={username}
          onChangeText={setUsername}   // RN 用 onChangeText，不是 onChange
          autoCapitalize="none"        // 禁止自动大写（用户名不应该大写）
          returnKeyType="next"         // 键盘右下角按钮显示"下一项"
        />

        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}       // 密码输入框，自动隐藏字符
          returnKeyType="done"
          onSubmitEditing={handleLogin} // 按键盘 done 直接提交
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}          // 点击时的透明度反馈
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>登录</Text>
          }
        </TouchableOpacity>

        {/* 跳转注册页 */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>没有账号？去注册</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// StyleSheet.create 和普通 JS 对象的区别：
// 1. 会在原生层做验证，错误属性会有警告
// 2. 性能更好（会被缓存）
const styles = StyleSheet.create({
  container: {
    flex: 1,                  // flex: 1 等价于 Web 的 flex: 1（撑满父容器）
    backgroundColor: '#F5F5F5',
    justifyContent: 'center'
  },
  form: {
    margin: 24,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    // RN 阴影：iOS 用 shadow*，Android 用 elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4             // Android 阴影
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24
  },
  input: {
    borderWidth: 1,           // RN 中边框要单独写 borderWidth
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA'
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',     // 让内部文字居中
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center'
  },
  linkText: {
    color: '#4F46E5',
    fontSize: 14
  }
})
