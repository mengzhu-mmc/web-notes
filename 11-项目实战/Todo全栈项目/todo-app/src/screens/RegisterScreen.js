/**
 * screens/RegisterScreen.js — 注册页
 *
 * 和 LoginScreen 结构类似，主要学习点：
 * - navigation.goBack() 注册成功后返回登录页
 * - Alert.alert 的多按钮用法
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView   // 内容较多时允许滚动，防止键盘弹出时内容被挡住
} from 'react-native'
import { userAPI } from '../api'

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    // 前端校验
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请填写完整信息')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次密码输入不一致')
      return
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码不能少于 6 位')
      return
    }

    setLoading(true)
    try {
      await userAPI.register({ username, password })
      // Alert.alert(title, message, buttons) — 第三个参数是按钮数组
      Alert.alert('注册成功', '请返回登录', [
        { text: '去登录', onPress: () => navigation.goBack() }
      ])
    } catch (err) {
      Alert.alert('注册失败', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"  // 点击非输入区域不收起键盘
      >
        <View style={styles.form}>
          <Text style={styles.title}>创建账号</Text>

          <TextInput
            style={styles.input}
            placeholder="用户名（2-20个字符）"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={20}
          />
          <TextInput
            style={styles.input}
            placeholder="密码（至少6位）"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="确认密码"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>注册</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>已有账号？去登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a'
  },
  input: {
    borderWidth: 1,
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
    alignItems: 'center',
    marginTop: 8
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
