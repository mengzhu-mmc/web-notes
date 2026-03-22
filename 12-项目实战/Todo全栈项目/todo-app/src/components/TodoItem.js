/**
 * components/TodoItem.js — 单个 Todo 卡片
 *
 * 核心知识点：
 * - React.memo — 避免父组件重渲染时不必要的子组件重渲染
 * - Pressable — 比 TouchableOpacity 更强大的点击组件（可感知 pressed 状态）
 * - 长按删除交互
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable
} from 'react-native'

// React.memo：当 props 没变时跳过渲染
// 类比 React.PureComponent 或 React.memo in Web
const TodoItem = React.memo(({ todo, onToggle, onDelete }) => {
  return (
    // Pressable 的 style 可以是函数，接收 { pressed } 状态
    // 实现按下时背景变化的交互反馈
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed   // 按下时应用额外样式
      ]}
      onLongPress={() => onDelete(todo.id)}  // 长按触发删除
      delayLongPress={400}                   // 长按触发延迟（ms）
    >
      {/* 左侧：勾选按钮 */}
      <TouchableOpacity
        style={[styles.checkbox, todo.done && styles.checkboxDone]}
        onPress={() => onToggle(todo.id, todo.done)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}  // 扩大点击区域
      >
        {todo.done && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* 中间：标题 */}
      <Text
        style={[styles.title, todo.done && styles.titleDone]}
        numberOfLines={2}   // 最多显示 2 行，超出省略号
      >
        {todo.title}
      </Text>

      {/* 右侧：删除按钮 */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(todo.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </Pressable>
  )
})

// 设置 displayName，方便 React DevTools 调试
TodoItem.displayName = 'TodoItem'

export default TodoItem

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',   // 横向排列：checkbox + title + delete
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]  // 轻微缩小，给点击反馈
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  checkboxDone: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5'
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  title: {
    flex: 1,    // 占满剩余空间，让删除按钮靠右
    fontSize: 15,
    color: '#333',
    lineHeight: 20
  },
  titleDone: {
    color: '#bbb',
    textDecorationLine: 'line-through'  // 完成后显示删除线
  },
  deleteBtn: {
    marginLeft: 12,
    padding: 4
  },
  deleteText: {
    color: '#ccc',
    fontSize: 14
  }
})
