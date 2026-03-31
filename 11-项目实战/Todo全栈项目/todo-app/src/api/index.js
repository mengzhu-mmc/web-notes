/**
 * api/index.js — Axios 封装
 *
 * 核心知识点：
 * 1. 请求拦截器 — 自动给每个请求带上 Authorization header
 * 2. 响应拦截器 — 统一处理错误，提取 data 字段
 *
 * ⚠️ React Native 注意事项：
 * - 不能用 localhost，手机和电脑需在同一 WiFi
 * - Android 用真实 IP：如 http://192.168.1.100:3000
 * - iOS 模拟器可以用 http://localhost:3000
 * - 修改 BASE_URL 为你的本机 IP
 */

import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ⚠️ 修改为你的本机 IP（手机测试时不能用 localhost）
const BASE_URL = 'http://192.168.1.100:3000/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,           // 10 秒超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// ① 请求拦截器 — 自动带上 token
// 每次请求发出前，从 AsyncStorage 取 token 放进 header
// 注意：拦截器回调可以是 async 函数
request.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ② 响应拦截器 — 统一处理
// 成功：直接返回 response.data（省去每次写 .data）
// 失败：统一抛出 Error，message 来自后端返回的 message 字段
request.interceptors.response.use(
  (response) => {
    // 后端统一响应格式：{ code, message, data }
    const { code, message, data } = response.data
    if (code === 0) {
      return data  // 直接返回 data，调用方不用再写 .data
    }
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    // HTTP 层面的错误（401、404、500 等）
    const message =
      error.response?.data?.message ||
      error.message ||
      '网络错误，请检查网络连接'
    return Promise.reject(new Error(message))
  }
)

// 封装常用请求方法，调用更简洁
export const userAPI = {
  register: (data) => request.post('/register', data),
  login: (data) => request.post('/login', data),
  getUserInfo: () => request.get('/userinfo'),
  uploadAvatar: (formData) => request.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const todoAPI = {
  getList: () => request.get('/todos'),
  create: (title) => request.post('/todos', { title }),
  update: (id, fields) => request.put(`/todos/${id}`, fields),
  remove: (id) => request.delete(`/todos/${id}`)
}

export default request
