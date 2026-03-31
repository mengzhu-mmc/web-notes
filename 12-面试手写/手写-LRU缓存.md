# 手写：LRU 缓存

> 面试频率：⭐⭐⭐⭐⭐ | 难度：中

---

## 题目要求

实现 `LRUCache` 类（Least Recently Used，最近最少使用缓存）：

```typescript
class LRUCache {
  constructor(capacity: number) {}
  get(key: number): number     // 未命中返回 -1，命中并更新为"最近使用"
  put(key: number, value: number): void  // 插入/更新，超容量时淘汰最久未用的
}

// 示例（capacity = 2）
const cache = new LRUCache(2);
cache.put(1, 1);   // {1=1}
cache.put(2, 2);   // {1=1, 2=2}
cache.get(1);      // 返回 1，{2=2, 1=1}（1 变为最近使用）
cache.put(3, 3);   // 淘汰 2，{1=1, 3=3}
cache.get(2);      // 返回 -1（已淘汰）
cache.put(4, 4);   // 淘汰 1，{3=3, 4=4}
cache.get(1);      // 返回 -1
cache.get(3);      // 返回 3
cache.get(4);      // 返回 4
```

**要求**：`get` 和 `put` 操作均为 **O(1)** 时间复杂度。

---

## 思路分析

### 为什么需要 O(1)？

- `get`：查找快 → 需要哈希表
- 维护"最近使用"顺序：需要有序数据结构
- `put`：超容量时删除最旧的 → 需要 O(1) 删除任意位置

**经典方案**：`HashMap + 双向链表`
- HashMap 提供 O(1) 查找
- 双向链表维护顺序（头部 = 最近使用，尾部 = 最久未用）
- 双向链表支持 O(1) 删除任意节点（已知节点指针的前提下）

### JavaScript 的天然优势：Map

ES6 的 `Map` 是**有序**的（按插入顺序迭代），可以直接利用这个特性模拟 LRU：
- 命中时：delete + set，将 key 移到末尾（最近使用）
- 淘汰时：`map.keys().next().value` 取出第一个 key（最久未用）

```
Map 迭代顺序：[最久] → ... → [最近]
  put(1) → {1}
  put(2) → {1, 2}
  get(1) → delete(1) + set(1) → {2, 1}   // 1 移到末尾
  put(3) → 超容量，淘汰 keys 的第一个(2) → {1, 3}
```

---

## 完整实现

### 实现一：Map 版（推荐，代码极简）

```typescript
class LRUCache {
  private capacity: number;
  private cache: Map<number, number>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;

    // 命中：将 key 移到末尾（标记为最近使用）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) {
      // 已存在：先删除，再插入末尾
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 超容量：淘汰最久未用（Map 的第一个元素）
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}
```

**时间复杂度分析**：
- `Map.has / get / delete / set`：均为 O(1) 平均
- `Map.keys().next()`：O(1)（只取第一个迭代器）

### 实现二：双向链表 + HashMap（手写版，加分项）

```typescript
// 链表节点
class ListNode {
  key: number;
  value: number;
  prev: ListNode | null = null;
  next: ListNode | null = null;

  constructor(key = 0, value = 0) {
    this.key = key;
    this.value = value;
  }
}

class LRUCacheLinkedList {
  private capacity: number;
  private map: Map<number, ListNode>;
  // 哑头节点 + 哑尾节点（简化边界处理）
  private head: ListNode; // 虚拟头（最久未用方向）
  private tail: ListNode; // 虚拟尾（最近使用方向）

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new ListNode();
    this.tail = new ListNode();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // 将节点插入到 tail 之前（标记为最近使用）
  private addToTail(node: ListNode) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev!.next = node;
    this.tail.prev = node;
  }

  // 删除任意节点（O(1)，因为是双向链表）
  private removeNode(node: ListNode) {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  get(key: number): number {
    const node = this.map.get(key);
    if (!node) return -1;

    // 移动到最近使用位置（尾部）
    this.removeNode(node);
    this.addToTail(node);
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) {
      const node = this.map.get(key)!;
      node.value = value;
      this.removeNode(node);
      this.addToTail(node);
    } else {
      if (this.map.size >= this.capacity) {
        // 淘汰最久未用（head.next）
        const oldest = this.head.next!;
        this.removeNode(oldest);
        this.map.delete(oldest.key);
      }
      const newNode = new ListNode(key, value);
      this.addToTail(newNode);
      this.map.set(key, newNode);
    }
  }
}
```

---

## 测试用例

```typescript
function runTest() {
  // 基础功能
  const cache = new LRUCache(2);
  cache.put(1, 1);
  cache.put(2, 2);
  console.assert(cache.get(1) === 1, 'get(1) should be 1');
  cache.put(3, 3); // 淘汰 key 2
  console.assert(cache.get(2) === -1, 'key 2 should be evicted');
  console.assert(cache.get(3) === 3, 'get(3) should be 3');
  cache.put(4, 4); // 淘汰 key 1
  console.assert(cache.get(1) === -1, 'key 1 should be evicted');
  console.assert(cache.get(3) === 3, 'get(3) should be 3');
  console.assert(cache.get(4) === 4, 'get(4) should be 4');

  // 更新已有 key
  const cache2 = new LRUCache(2);
  cache2.put(1, 1);
  cache2.put(2, 2);
  cache2.put(1, 10); // 更新 key 1
  console.assert(cache2.get(1) === 10, 'updated value should be 10');
  cache2.put(3, 3); // 淘汰 key 2（1 最近被访问）
  console.assert(cache2.get(2) === -1, 'key 2 should be evicted after update');

  // capacity = 1
  const cache3 = new LRUCache(1);
  cache3.put(1, 1);
  cache3.put(2, 2); // 淘汰 1
  console.assert(cache3.get(1) === -1, 'key 1 evicted');
  console.assert(cache3.get(2) === 2, 'key 2 ok');

  console.log('All tests passed! ✅');
}

runTest();
```

---

## 追问与扩展

### Q1：Map 的迭代顺序是插入顺序，是规范保证的吗？

是的，ES2015 规范明确规定 `Map` 按插入顺序迭代。`Set` 也是。

### Q2：LRU 在实际工程中的应用？

```
1. 浏览器缓存（Cache-Control: max-age 结合 LRU 淘汰）
2. CPU 页面置换算法（OS 课经典）
3. Redis 淘汰策略（allkeys-lru / volatile-lru）
4. React 中的 fiber 缓存
5. 图片懒加载的已加载图片缓存
```

### Q3：LFU（最少使用频率）缓存如何实现？

LFU 维护的是**访问频率**而非**访问时间**，淘汰频率最低的项（同频率中淘汰最旧的）。

需要额外维护：
- `keyMap`：key → {value, freq}
- `freqMap`：freq → 该频率下的有序 key 集合（用 LinkedHashSet）
- `minFreq`：当前最小频率

比 LRU 复杂，但仍可实现 O(1) 操作。

### Q4：实现支持 TTL（过期时间）的 LRU？

```typescript
class LRUCacheWithTTL {
  private cache: Map<string, { value: unknown; expireAt: number }>;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string): unknown {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expireAt) {
      this.cache.delete(key); // 惰性删除
      return null;
    }
    // 移到末尾
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  put(key: string, value: unknown, ttlMs: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, { value, expireAt: Date.now() + ttlMs });
  }
}
```

### Q5：力扣原题

- [146. LRU 缓存](https://leetcode.cn/problems/lru-cache/) ← 就是这道
- [460. LFU 缓存](https://leetcode.cn/problems/lfu-cache/)（进阶版）
