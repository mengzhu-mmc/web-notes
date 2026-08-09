# 09-Week-2-总结（Day-8-14）

## Week 2 总结（Day 8-14）

| Day    | 核心主题          | 算法题数  | 场景题          | 知识点           |
| ------ | ----------------- | --------- | --------------- | ---------------- |
| Day 8  | DP 基础（背包）   | 4 题      | 手写 flat       | 跨域解决方案     |
| Day 9  | DP 进阶（子序列） | 4 题      | Promise 三兄弟  | TCP 握手挥手     |
| Day 10 | 回溯基础          | 4 题      | async/await     | HTTPS & TLS      |
| Day 11 | 回溯去重          | 4 题      | 虚拟 DOM diff   | Webpack 构建流程 |
| Day 12 | 滑动窗口          | 4 题      | 手写 LRU        | React Fiber 架构 |
| Day 13 | 链表进阶          | 4 题      | 手写 reduce/map | Vue 响应式原理   |
| Day 14 | 复习查漏          | 2 题+模板 | 发布订阅/观察者 | 性能优化综合     |

**Week 2 核心要点汇总**：

**滑动窗口**：

- 扩展 right → 更新 window → 判断收缩条件 → 收缩 left → 更新 window（顺序不能乱）
- 最小窗口在收缩前记录；最大窗口在 right 处记录
- 单调队列（[239]）：队头存最大值，队尾维护单调性

**链表**：

- 哑节点（dummy）简化头节点边界
- 快慢指针找中点：`fast = head.next` 时 slow 停在左半段末尾
- 翻转时记录 groupHead + nextGroupHead，翻转后重连

**缓存**：

- LRU = Map + 双向链表，哑头尾节点
- LFU = keyMap + freqMap（Map of Map）+ minFreq 变量
- 关键：put 新节点时 minFreq 重置为 1

**设计模式**：

- 观察者：Subject 直接持有 Observer 引用（紧耦合）
- 发布订阅：通过 EventEmitter 解耦（松耦合）
- Vue 2 响应式 = 观察者模式（Dep = Subject，Watcher = Observer）
