/**
 * screens/TodoScreen.js — Todo 主页面
 *
 * 核心知识点：
 * 1. FlatList — RN 中高性能列表组件（类比 Web 中的虚拟列表）
 * 2. Modal — 弹窗组件
 * 3. 下拉刷新 — refreshing + onRefresh
 * 4. useCallback — 防止 FlatList renderItem 重复创建导致子组件重渲染
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView  // 避免内容被刘海/状态栏遮挡
} from 'react-native'
import { todoAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import TodoItem from '../components/TodoItem'

export default function TodoScreen({ navigation }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { state, logout } = useAuth()

  // 设置顶部右侧的退出按钮
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 4 }}>
          <Text style={{ color: '#EF4444', fontSize: 15 }}>退出</Text>
        </TouchableOpacity>
      )
    })
  }, [navigation])

  // 获取 Todo 列表
  const fetchTodos = async () => {
    try {
      const data = await todoAPI.getList()
      setTodos(data)
    } catch (err) {
      Alert.alert('错误', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 组件挂载时加载数据
  useEffect(() => {
    fetchTodos()
  }, [])

  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true)
    fetchTodos()
  }

  // 退出登录
  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: logout }
    ])
  }

  // 新增 Todo
  const handleCreate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('提示', '请输入待办内容')
      return
    }
    setSubmitting(true)
    try {
      const todo = await todoAPI.create(newTitle.trim())
      // 直接在本地状态追加，不用重新请求（乐观更新思路）
      setTodos(prev => [todo, ...prev])
      setNewTitle('')
      setModalVisible(false)
    } catch (err) {
      Alert.alert('创建失败', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 切换完成状态
  const handleToggle = async (id, done) => {
    try {
      // 乐观更新：先更新 UI，再发请求
      // 好处：响应及时，用户体验好
      // 缺点：请求失败时需要回滚
      setTodos(prev =>
        prev.map(t => t.id === id ? { ...t, done: !done } : t)
      )
      await todoAPI.update(id, { done: !done })
    } catch (err) {
      // 回滚
      setTodos(prev =>
        prev.map(t => t.id === id ? { ...t, done } : t)
      )
      Alert.alert('操作失败', err.message)
    }
  }

  // 删除 Todo
  const handleDelete = (id) => {
    Alert.alert('确认删除', '删除后不可恢复', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setTodos(prev => prev.filter(t => t.id !== id)) // 乐观删除
            await todoAPI.remove(id)
          } catch (err) {
            fetchTodos() // 失败时重新拉取
            Alert.alert('删除失败', err.message)
          }
        }
      }
    ])
  }

  // useCallback 包裹 renderItem，避免 FlatList 每次 render 都创建新函数
  // 导致所有 item 重渲染（性能优化）
  const renderItem = useCallback(({ item }) => (
    <TodoItem
      todo={item}
      onToggle={handleToggle}
      onDelete={handleDelete}
    />
  ), [todos])

  // 空列表时显示的占位组件
  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>还没有待办，点击 + 添加</Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 统计信息 */}
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          共 {todos.length} 项，已完成 {todos.filter(t => t.done).length} 项
        </Text>
      </View>

      {/* FlatList — RN 中渲染列表的标准方式
          优于 ScrollView + map，因为只渲染可视区域内的 item（虚拟化）
          keyExtractor：为每个 item 提供唯一 key（类比 React 的 key prop）
      */}
      <FlatList
        data={todos}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={todos.length === 0 && styles.emptyContainer}
        ListEmptyComponent={ListEmpty}
        refreshing={refreshing}
        onRefresh={handleRefresh}          // 下拉刷新
        showsVerticalScrollIndicator={false}
      />

      {/* 新增按钮（FAB — Floating Action Button）*/}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 新增 Todo 弹窗
          Modal 是 RN 内置组件，animationType 控制动画效果
          transparent: true 让背景半透明
      */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}  // Android 返回键关闭
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}  // 点击遮罩关闭
        >
          {/* stopPropagation 效果：阻止点击内容区域时触发遮罩的 onPress */}
          <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
            <Text style={styles.modalTitle}>新增待办</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="输入待办内容..."
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus={true}   // 弹窗出现时自动聚焦
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setModalVisible(false); setNewTitle('') }}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn, submitting && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmText}>添加</Text>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stats: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  statsText: { color: '#888', fontSize: 13 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 15 },
  fab: {
    position: 'absolute',   // 绝对定位，悬浮在列表上方
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',  // 半透明遮罩
    justifyContent: 'flex-end'            // 从底部弹出
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F5F5F5' },
  confirmBtn: { backgroundColor: '#4F46E5' },
  cancelText: { color: '#666', fontSize: 15 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' }
})
