# 经典非DP题精讲

> 涵盖哈希集合、双栈模拟、前缀和+DFS等高频非DP算法题

---

## 一、最长连续序列 —— LC 128 ⭐⭐⭐

### 面试考点
- 哈希集合 O(n) 最优解
- "只从序列起点开始"的剪枝技巧
- 排序法 O(nlogn) 备选方案

### 思路一：排序法 O(nlogn)

去重 + 排序后，遍历检查相邻元素是否连续，更新最长序列长度。

```js
var longestConsecutive = function(nums) {
    if (nums.length === 0) return 0;
    const arr = [...new Set(nums)].sort((a, b) => a - b); // 去重 + 排序
    let maxLen = 1, curLen = 1;

    for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i - 1] + 1) {
            curLen++;
            maxLen = Math.max(maxLen, curLen);
        } else {
            curLen = 1;
        }
    }
    return maxLen;
};
```

### 思路二：哈希集合 O(n) ✅ 最优

**核心技巧**：只从序列起点（`num - 1` 不在集合中）开始计数，避免重复遍历。

```js
var longestConsecutive = function(nums) {
    const numSet = new Set(nums);
    let maxLen = 0;

    for (const num of numSet) {
        if (!numSet.has(num - 1)) { // 只从序列起点开始
            let cur = num, curLen = 1;
            while (numSet.has(cur + 1)) { cur++; curLen++; }
            maxLen = Math.max(maxLen, curLen);
        }
    }
    return maxLen;
};
```

> 🔑 关键：遍历 `numSet` 而非 `nums`（已去重），对每个元素判断是否是序列起点，从起点开始 while 延伸。

### 常见 Bug

```js
// ❌ 问题一：未处理空数组（arr[0] 为 undefined）
// ❌ 问题二：只在 else 分支更新 res，末尾序列漏掉
// ❌ 问题三：用数组存序列再取 .length，res 初始化为 0 时 .length undefined
// ✅ 修复：maxLen 变量追踪，每次连续时都更新
```

### 复杂度对比

| 方法 | 时间 | 空间 | 备注 |
|------|------|------|------|
| 排序 | O(n log n) | O(n) | 面试中可作为备选 |
| **哈希集合** | **O(n)** | **O(n)** | **面试最优解** ✅ |

### 面试一句话
> 哈希集合只从"序列起点"（左侧无相邻元素）开始延伸计数，均摊 O(n)；排序法思路更直观但 O(nlogn)。

---

## 二、解码字符串 —— LC 394 ⭐⭐⭐

### 面试考点
- 双栈模拟嵌套结构（栈模拟递归）
- 多位数处理：`num = num * 10 + digit`
- `]` 时的出栈拼接顺序

### 思路：双栈模拟

维护两个栈：
- `strStack`：保存待拼接的前缀字符串（括号外的内容）
- `numStack`：保存对应的重复次数

遇到 `[` 入栈并重置，遇到 `]` 出栈并拼接。

### 遍历规则

| 字符 | 操作 |
|------|------|
| 数字 | `num = num * 10 + Number(c)`（支持多位数如 `12[a]`） |
| `[` | 压栈 `res` 和 `num`，重置 `res = ''`，`num = 0` |
| `]` | `res = strStack.pop() + res.repeat(numStack.pop())` |
| 字母 | `res += c` |

### 代码（JS）

```js
var decodeString = function(s) {
    const strStack = [], numStack = [];
    let num = 0, res = '';

    for (const c of s) {
        if (/[0-9]/.test(c)) {
            num = num * 10 + Number(c); // 支持多位数
        } else if (c === '[') {
            strStack.push(res);  // 保存括号前的字符串
            numStack.push(num);  // 保存重复次数
            res = '';
            num = 0;
        } else if (c === ']') {
            res = strStack.pop() + res.repeat(numStack.pop());
            // 前缀 + 当前括号内容重复 k 次
        } else {
            res += c;
        }
    }
    return res;
};
```

### 执行过程示例：`2[3[ab]]`

| 字符 | strStack | numStack | res | 说明 |
|------|----------|---------|-----|------|
| `2` | [] | [] | "" | num=2 |
| `[` | [""] | [2] | "" | 压栈，重置 |
| `3` | [""] | [2] | "" | num=3 |
| `[` | ["",""] | [2,3] | "" | 再次压栈（嵌套） |
| `a` | ["",""] | [2,3] | "a" | res += 'a' |
| `b` | ["",""] | [2,3] | "ab" | res += 'b' |
| `]` | [""] | [2] | "ababab" | "" + "ab".repeat(3) |
| `]` | [] | [] | "abababababab" | "" + "ababab".repeat(2) |

> 🔑 每个 `[` 对应一次入栈，每个 `]` 对应一次出栈，严格配对，嵌套越深栈越深。

### 复杂度
- 时间：O(n × max_k)（n 为字符串长度，max_k 为最大重复次数）
- 空间：O(n)（栈深度）

### 面试一句话
> 双栈分别存前缀字符串和重复次数，遇 `[` 入栈重置，遇 `]` 出栈拼接 `前缀 + 内容×k次`；多位数用 `num*10+digit` 累积。

---

## 三、路径总和 III —— LC 437 ⭐⭐⭐

> 也见于 [经典DP题精讲.md]，此处重点讲前缀和+DFS+回溯思路

### 面试考点
- 树上前缀和（DFS路径前缀和）
- 哈希表快速查询
- **回溯撤销的必要性**（防止左子树影响右子树）

### 思路：前缀和 + DFS + 回溯

**核心转化**：
- 设从根到当前节点的路径前缀和为 `s`
- 满足路径和 = targetSum ⟺ `s - targetSum` 在之前某个祖先节点出现过
- 用哈希表记录已经过的前缀和频次

**`cnt.set(0, 1)` 的意义**：
处理从根节点直接到当前节点路径恰好等于 target 的情况（此时 `s - target = 0`，需要有"虚拟起点"）

### 代码（JS）

```js
const pathSum = function(root, targetSum) {
    const cnt = new Map();
    cnt.set(0, 1); // 虚拟前缀和 0
    let ans = 0;

    function dfs(node, s) {
        if (!node) return;
        s += node.val;
        ans += cnt.get(s - targetSum) ?? 0;   // 查询以 node 为终点的路径数
        cnt.set(s, (cnt.get(s) ?? 0) + 1);    // 记录当前前缀和
        dfs(node.left, s);
        dfs(node.right, s);
        cnt.set(s, cnt.get(s) - 1);           // 回溯！撤销当前前缀和
    }

    dfs(root, 0);
    return ans;
};
```

### 为什么必须回溯？

```
        1
       / \
      2   3
```
遍历左子树（节点2）时，`cnt` 中记录了根→2的前缀和。
遍历完左子树后，若不撤销，右子树（节点3）在查询时会错误地把根→2的前缀和计入计算。
节点2 不在根→3 的路径上，必须在回到父节点时撤销。

### 复杂度
- 时间：O(n)，空间：O(n)

### 面试一句话
> 树上前缀和三要素：哈希表记频次 + DFS携带当前路径和 + 回溯撤销；初始化 `cnt[0]=1` 处理从根出发的路径。

---

## 四、算法相关的 Set 操作技巧

> 此节聚焦算法题中 Set 的实用技巧，而非 Set 的完整API（见数据类型笔记）

### 在算法中常见的 Set 用法

```js
// 1. 构建哈希集合（O(1) 查找）
const set = new Set(nums);
set.has(x);           // O(1) 查找

// 2. 从 Set 遍历（for...of，最推荐）
for (const num of set) { /* 处理 */ }

// 3. 去重 + 排序（LC128 排序法）
const arr = [...new Set(nums)].sort((a, b) => a - b);

// 4. 转数组后做各种操作
const arr = Array.from(set);

// 5. 差集、交集（面试偶尔考）
const intersection = new Set([...a].filter(x => b.has(x)));
const difference   = new Set([...a].filter(x => !b.has(x)));
```

### Set 在算法题的典型场景

| 场景 | 技巧 | 示例题 |
|------|------|--------|
| 判断元素是否存在 | `set.has(x)` O(1) | LC128 最长连续序列 |
| 去重后遍历 | `new Set(arr)` | LC128 |
| 查找"邻居"是否存在 | `!set.has(num - 1)` 找起点 | LC128 |
| 两数之和类 | 边遍历边加入 Set | LC1 |
| 重复元素检测 | 遍历时 `set.has()` 判断 | LC217 |

### Set 的 forEach 特殊性

```js
// Set 的 forEach：回调的前两个参数值相同（无索引概念）
set.forEach((value, valueAgain, set) => {
    // value === valueAgain，Set 没有"键"
});

// Map 的 forEach 对比：
map.forEach((value, key, map) => { /* key 和 value 不同 */ });
```

### 面试一句话
> Set 的核心价值是 O(1) 查找和自动去重；算法题中最常用 `set.has()` 做存在性判断，配合"只从起点计数"的剪枝大幅降低时间复杂度。
