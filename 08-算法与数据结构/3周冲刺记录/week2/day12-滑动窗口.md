# Day 12 — 滑动窗口

> 日期：03-18 | Week 2 | 状态：⬜

## 🧠 今日套路

右扩左缩模板：右指针不断扩大窗口，满足收缩条件时左指针右移。
关键：**什么时候收缩**（窗口不合法时）。

## 🔢 算法题（2h）

### [3] 无重复字符的最长子串 Medium
- 链接：https://leetcode.cn/problems/longest-substring-without-repeating-characters/
- 核心：Map 记录字符最新位置，出现重复时左指针跳到重复字符的下一位

### [76] 最小覆盖子串 🔴 Hard
- 链接：https://leetcode.cn/problems/minimum-window-substring/
- 核心：need Map 记录需求，满足所有需求后尝试收缩

### [438] 找到字符串中所有字母异位词 Medium
- 链接：https://leetcode.cn/problems/find-all-anagrams-in-a-string/
- 核心：固定窗口大小 = p.length，比较两个 Map

### [567] 字符串的排列 Medium
- 链接：https://leetcode.cn/problems/permutation-in-string/
- 核心：同 438，固定窗口判断是否为排列

## 🎨 场景题（1h）

- 手写 LRU 缓存

## 📚 知识点

**React Fiber 架构**
- 解决大树同步渲染阻塞问题，将渲染拆成可中断的小单元
- 时间切片：每帧执行一部分，让出控制权给浏览器
- 优先级调度：用户交互 > 动画 > 数据更新

---
[[week2-answers]] | [[README]]
