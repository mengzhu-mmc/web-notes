# Day 14 — 复习 + 查漏

> 日期：03-20 | Week 2 | 状态：⬜

## 🧠 今日重点

回顾 Week 2 所有薄弱题，重做标记的错题。
LRU/LFU 是高频设计题，必须熟练。

## 🔢 算法题（2h）

### Week 2 错题回顾
- 重做限时 15min/题

### [146] LRU 缓存 Medium
- 链接：https://leetcode.cn/problems/lru-cache/
- 核心：Map（有序）+ 双向链表，O(1) get/put

### [460] LFU 缓存 🔴 Hard
- 链接：https://leetcode.cn/problems/lfu-cache/
- 核心：两个 Map：key→{val,freq} 和 freq→LRU链表，维护 minFreq

## 🎨 场景题（1h）

- 手写发布订阅模式 / 观察者模式

## 📚 知识点

**性能优化综合**
- 首屏：SSR/SSG、骨架屏、关键资源预加载（preload/prefetch）
- 运行时：虚拟列表、防抖节流、Web Worker、避免强制同步布局
- 资源：Tree Shaking、Code Splitting、图片懒加载、CDN

---
[[week2-answers]] | [[README]]
