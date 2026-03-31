# Week 1 完整题解 — 3周算法冲刺计划

> 时间范围：2026-03-07 ~ 03-13  
> 每日 3h，JS 实现，附场景题 + 知识点面试标准答案

---

## Day 1 — 单调栈

### [739] 每日温度 ⭐中等

**题目描述**：给定一个整数数组 `temperatures` 表示每天的温度，返回一个数组 `answer`，其中 `answer[i]` 是指在第 `i` 天之后，才会有更高的温度。如果气温在这之后都不会升高，请在该位置用 `0` 来代替。

**自测用例**：
- 输入: temperatures = [73,74,75,71,69,72,76,73] → 输出: [1,1,4,2,1,1,0,0]
- 输入: temperatures = [30,40,50,60] → 输出: [1,1,1,0]
- 输入: temperatures = [30,60,90] → 输出: [1,1,0]

🔗 https://leetcode.cn/problems/daily-temperatures/

**思路**：用单调递减栈存储下标，遍历温度数组，当当前温度大于栈顶温度时，说明栈顶找到了下一个更高温度，弹出并计算距离差。

**代码**：

```js
var dailyTemperatures = function(temperatures) {
  const n = temperatures.length;
  const res = new Array(n).fill(0);
  const stack = []; // 存下标，单调递减栈

  for (let i = 0; i < n; i++) {
    while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const idx = stack.pop();
      res[idx] = i - idx; // 距离差就是等待天数
    }
    stack.push(i);
  }

  return res;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [496] 下一个更大元素 I ⭐简单

**题目描述**：给定两个没有重复元素的数组 `nums1` 和 `nums2`，其中 `nums1` 是 `nums2` 的子集。对于 `nums1` 中每个元素，找出在 `nums2` 中该元素右边第一个比它大的元素，不存在则返回 `-1`。

**自测用例**：
- 输入: nums1 = [4,1,2], nums2 = [1,3,4,2] → 输出: [-1,3,-1]
- 输入: nums1 = [2,4], nums2 = [1,2,3,4] → 输出: [3,-1]
- 输入: nums1 = [1], nums2 = [1,2] → 输出: [2]

🔗 https://leetcode.cn/problems/next-greater-element-i/

**思路**：先用单调栈处理 nums2，建立每个元素到其下一个更大元素的映射 Map；再遍历 nums1 查 Map 即可。

**代码**：

```js
var nextGreaterElement = function(nums1, nums2) {
  const map = new Map();
  const stack = [];

  for (let i = 0; i < nums2.length; i++) {
    while (stack.length && nums2[i] > stack[stack.length - 1]) {
      const val = stack.pop();
      map.set(val, nums2[i]);
    }
    stack.push(nums2[i]);
  }

  return nums1.map(n => map.get(n) ?? -1);
};
```

**复杂度**：时间 O(m+n) | 空间 O(n)

---

### [503] 下一个更大元素 II ⭐中等

**题目描述**：给定一个循环数组 `nums`，对于每个元素，找出其下一个更大的元素。由于是循环数组，最后一个元素的下一个更大元素可能是数组靠前的元素。不存在则返回 `-1`。

**自测用例**：
- 输入: nums = [1,2,1] → 输出: [2,-1,2]
- 输入: nums = [1,2,3,4,3] → 输出: [2,3,4,-1,4]
- 输入: nums = [5,4,3,2,1] → 输出: [-1,5,5,5,5]

🔗 https://leetcode.cn/problems/next-greater-element-ii/

**思路**：循环数组用取模模拟两倍遍历（2n 次，下标 i%n）。只在第一圈入栈。

**代码**：

```js
var nextGreaterElements = function(nums) {
  const n = nums.length;
  const res = new Array(n).fill(-1);
  const stack = [];

  for (let i = 0; i < 2 * n; i++) {
    while (stack.length && nums[i % n] > nums[stack[stack.length - 1]]) {
      const idx = stack.pop();
      res[idx] = nums[i % n];
    }
    if (i < n) stack.push(i);
  }

  return res;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [42] 接雨水 ⭐⭐困难

**题目描述**：给定 `n` 个非负整数表示每个宽度为 `1` 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**自测用例**：
- 输入: height = [0,1,0,2,1,0,1,3,2,1,2,1] → 输出: 6
- 输入: height = [4,2,0,3,2,5] → 输出: 9
- 输入: height = [3,0,2,0,4] → 输出: 7

🔗 https://leetcode.cn/problems/trapping-rain-water/

**思路**：单调递减栈存下标。遇到比栈顶大的柱子，弹出底部，左边界为新栈顶，右边界为当前，按层计算水量。

**代码**：

```js
var trap = function(height) {
  let res = 0;
  const stack = [];

  for (let i = 0; i < height.length; i++) {
    while (stack.length && height[i] > height[stack[stack.length - 1]]) {
      const bottom = stack.pop();
      if (!stack.length) break;
      const left = stack[stack.length - 1];
      const width = i - left - 1;
      const h = Math.min(height[left], height[i]) - height[bottom];
      res += width * h;
    }
    stack.push(i);
  }

  return res;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### 场景题：手写 debounce + throttle

```js
/**
 * debounce 防抖：停止触发 delay ms 后才执行
 * 场景：搜索框输入、resize
 */
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * throttle 节流：interval ms 内最多执行一次
 * 场景：scroll、按钮防重复点击
 */
function throttle(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

---

### 知识点：事件循环 Event Loop

**核心概念**：JS 是单线程的，通过事件循环实现异步。执行栈（Call Stack）跑同步代码，微任务队列（MicroTask）和宏任务队列（MacroTask）负责异步回调。

**面试标准答案**：

执行顺序：
1. 执行**同步代码**（执行栈清空）
2. 清空所有**微任务**（Promise.then、queueMicrotask、MutationObserver）
3. 取一个**宏任务**执行（setTimeout、setInterval、I/O）
4. 重复 2-3

**常见追问**：

Q: Promise.then 和 setTimeout 谁先？  
A: Promise.then 是微任务，setTimeout 是宏任务，同轮微任务先执行。

Q: async/await 是什么任务？  
A: await 后的代码等价于 Promise.then 回调，是微任务。

Q: Node.js 与浏览器事件循环区别？  
A: Node.js 有 6 阶段（timers → poll → check 等），process.nextTick 优先级高于 Promise.then。浏览器只有宏/微任务两层。

---
## Day 2 — 二分查找

### [704] 二分查找 ⭐简单

**题目描述**：给定一个升序排列的整数数组 `nums` 和一个目标值 `target`，如果 `target` 存在则返回其下标，否则返回 `-1`。

**自测用例**：
- 输入: nums = [-1,0,3,5,9,12], target = 9 → 输出: 4
- 输入: nums = [-1,0,3,5,9,12], target = 2 → 输出: -1
- 输入: nums = [5], target = 5 → 输出: 0

🔗 https://leetcode.cn/problems/binary-search/

**思路**：闭区间 `[left, right]`，mid 与 target 比较后收缩区间，直到找到或区间为空。

**代码**：

```js
var search = function(nums, target) {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
};
```

**复杂度**：时间 O(log n) | 空间 O(1)

---

### [35] 搜索插入位置 ⭐简单

**题目描述**：给定一个升序排列的不重复整数数组 `nums` 和一个目标值 `target`，在数组中找到目标值并返回其下标；如果不存在，返回它将会被按顺序插入的位置。

**自测用例**：
- 输入: nums = [1,3,5,6], target = 5 → 输出: 2
- 输入: nums = [1,3,5,6], target = 2 → 输出: 1
- 输入: nums = [1,3,5,6], target = 7 → 输出: 4

🔗 https://leetcode.cn/problems/search-insert-position/

**思路**：二分找"第一个 >= target"的位置。循环结束时 left 就是插入位，天然处理"不存在"的情况。

**代码**：

```js
var searchInsert = function(nums, target) {
  let left = 0, right = nums.length;

  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] < target) left = mid + 1;
    else right = mid;
  }

  return left;
};
```

**复杂度**：时间 O(log n) | 空间 O(1)

---

### [34] 在排序数组中查找元素的第一个和最后一个位置 ⭐中等

**题目描述**：给定一个升序排列的整数数组 `nums` 和目标值 `target`，找出 `target` 在数组中的开始位置和结束位置。如果数组中不存在目标值，返回 `[-1, -1]`。要求时间复杂度为 O(log n)。

**自测用例**：
- 输入: nums = [5,7,7,8,8,10], target = 8 → 输出: [3,4]
- 输入: nums = [5,7,7,8,8,10], target = 6 → 输出: [-1,-1]
- 输入: nums = [], target = 0 → 输出: [-1,-1]

🔗 https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/

**思路**：两次二分：lowerBound(target) 找左边界，lowerBound(target+1)-1 找右边界。

**代码**：

```js
var searchRange = function(nums, target) {
  const lowerBound = (t) => {
    let left = 0, right = nums.length;
    while (left < right) {
      const mid = left + ((right - left) >> 1);
      if (nums[mid] < t) left = mid + 1;
      else right = mid;
    }
    return left;
  };

  const first = lowerBound(target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lowerBound(target + 1) - 1];
};
```

**复杂度**：时间 O(log n) | 空间 O(1)

---

### [33] 搜索旋转排序数组 ⭐中等

**题目描述**：给定一个元素互不相同的整数数组 `nums`，它原本是升序排列的，但在某个下标处进行了旋转（如 `[0,1,2,4,5,6,7]` 旋转为 `[4,5,6,7,0,1,2]`）。在其中搜索目标值 `target`，存在返回下标，否则返回 `-1`。要求时间复杂度 O(log n)。

**自测用例**：
- 输入: nums = [4,5,6,7,0,1,2], target = 0 → 输出: 4
- 输入: nums = [4,5,6,7,0,1,2], target = 3 → 输出: -1
- 输入: nums = [1], target = 0 → 输出: -1

🔗 https://leetcode.cn/problems/search-in-rotated-sorted-array/

**思路**：mid 将数组分成两段，必有一段有序。判断 target 是否在有序段内，据此缩小区间。

**代码**：

```js
var search = function(nums, target) {
  let left = 0, right = nums.length - 1;

  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return mid;

    if (nums[left] <= nums[mid]) { // 左半段有序
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else { // 右半段有序
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }

  return -1;
};
```

**复杂度**：时间 O(log n) | 空间 O(1)

---

### 场景题：手写 Promise（基础版：resolve/reject/then）

```js
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status !== PENDING) return;
      this.status = FULFILLED;
      this.value = value;
      this.onFulfilledCallbacks.forEach(fn => fn(value));
    };

    const reject = (reason) => {
      if (this.status !== PENDING) return;
      this.status = REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn(reason));
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    onRejected = typeof onRejected === 'function' ? onRejected : e => { throw e; };

    if (this.status === FULFILLED) {
      setTimeout(() => onFulfilled(this.value));
    } else if (this.status === REJECTED) {
      setTimeout(() => onRejected(this.reason));
    } else {
      this.onFulfilledCallbacks.push(onFulfilled);
      this.onRejectedCallbacks.push(onRejected);
    }
  }
}
```

---

### 知识点：原型链 & 继承

**核心概念**：每个对象有 `__proto__` 指向原型，属性查找沿原型链向上直到 null。函数有 `prototype` 属性，`new` 时将其赋给实例的 `__proto__`。

**面试标准答案**：

```
instance.__proto__ === Constructor.prototype
Constructor.prototype.__proto__ === Object.prototype
Object.prototype.__proto__ === null
```

| 继承方式 | 优点 | 缺点 |
|----------|------|------|
| 原型链继承 | 简单 | 引用类型共享，无法传参 |
| 构造函数继承 | 独立实例属性 | 方法不共享，每次重建 |
| 组合继承 | 属性独立+方法共享 | 父构造函数调用两次 |
| 寄生组合继承 | 最完美 ES5 方案 | 略复杂 |
| ES6 class extends | 语法最简洁 | 本质同寄生组合 |

```js
// 寄生组合继承
function Parent(name) { this.name = name; }
Parent.prototype.sayHi = function() { console.log(this.name); };

function Child(name, age) {
  Parent.call(this, name);
  this.age = age;
}
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;
```

**常见追问**：

Q: class extends 是语法糖吗？  
A: 是的，本质是寄生组合继承，但子类必须先 `super()` 才能使用 this，否则报 ReferenceError。

Q: Object.create(null) 有什么用？  
A: 创建无原型链的纯净对象，适合做字典，避免原型方法污染（如 toString 冲突）。

---

## Day 3 — 二分进阶 + 前缀和

### [153] 寻找旋转排序数组中的最小值 ⭐中等

**题目描述**：给定一个元素互不相同的升序数组在某个下标处旋转后的结果，找出其中的最小元素。要求时间复杂度为 O(log n)。

**自测用例**：
- 输入: nums = [3,4,5,1,2] → 输出: 1
- 输入: nums = [4,5,6,7,0,1,2] → 输出: 0
- 输入: nums = [11,13,15,17] → 输出: 11

🔗 https://leetcode.cn/problems/find-minimum-in-rotated-sorted-array/

**思路**：比较 `nums[mid]` 与 `nums[right]`，前者更大则最小值在右半段，否则在左半段（含 mid）。

**代码**：

```js
var findMin = function(nums) {
  let left = 0, right = nums.length - 1;

  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] > nums[right]) left = mid + 1;
    else right = mid;
  }

  return nums[left];
};
```

**复杂度**：时间 O(log n) | 空间 O(1)

---

### [162] 寻找峰值 ⭐中等

**题目描述**：峰值元素是指其值严格大于左右相邻值的元素。给你一个整数数组 `nums`，找到峰值元素并返回其索引。数组可能包含多个峰值，返回任何一个峰值所在位置即可。要求时间复杂度 O(log n)。

**自测用例**：
- 输入: nums = [1,2,3,1] → 输出: 2
- 输入: nums = [1,2,1,3,5,6,4] → 输出: 5（或 1）
- 输入: nums = [1,2] → 输出: 1

🔗 https://leetcode.cn/problems/find-peak-element/

**思路**：`nums[mid] < nums[mid+1]` 说明处于上坡，峰值在右；否则处于下坡，峰值在左（含 mid）。

**代码**：

```js
var findPeakElement = function(nums) {
  let left = 0, right = nums.length - 1;

  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] < nums[mid + 1]) left = mid + 1;
    else right = mid;
  }

  return left;
};
```

**复杂度**：时间 O(log n) | 空间 O(1)

---

### [4] 寻找两个正序数组的中位数 ⭐⭐⭐困难

**题目描述**：给定两个正序（从小到大排列）数组 `nums1` 和 `nums2`，找出并返回这两个正序数组的中位数。要求时间复杂度为 O(log(m+n))。

**自测用例**：
- 输入: nums1 = [1,3], nums2 = [2] → 输出: 2.00000
- 输入: nums1 = [1,2], nums2 = [3,4] → 输出: 2.50000
- 输入: nums1 = [0,0], nums2 = [0,0] → 输出: 0.00000

🔗 https://leetcode.cn/problems/median-of-two-sorted-arrays/

**思路**：对较短数组二分分割点 i，令 nums2 的分割点 j = half - i。调整 i 使得左右两侧满足交叉不超越：nums1[i-1] <= nums2[j] 且 nums2[j-1] <= nums1[i]，此时可直接求出中位数。

**代码**：

```js
var findMedianSortedArrays = function(nums1, nums2) {
  if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);

  const m = nums1.length, n = nums2.length;
  const half = Math.floor((m + n + 1) / 2);
  let left = 0, right = m;

  while (left <= right) {
    const i = left + ((right - left) >> 1);
    const j = half - i;

    const n1L = i === 0 ? -Infinity : nums1[i - 1];
    const n1R = i === m ? Infinity  : nums1[i];
    const n2L = j === 0 ? -Infinity : nums2[j - 1];
    const n2R = j === n ? Infinity  : nums2[j];

    if (n1L <= n2R && n2L <= n1R) {
      const maxLeft = Math.max(n1L, n2L);
      if ((m + n) % 2 === 1) return maxLeft;
      return (maxLeft + Math.min(n1R, n2R)) / 2;
    } else if (n1L > n2R) {
      right = i - 1;
    } else {
      left = i + 1;
    }
  }
};
```

**复杂度**：时间 O(log(min(m,n))) | 空间 O(1)

---

### [560] 和为 K 的子数组 ⭐中等

**题目描述**：给你一个整数数组 `nums` 和一个整数 `k`，统计并返回该数组中和为 `k` 的连续子数组的个数。

**自测用例**：
- 输入: nums = [1,1,1], k = 2 → 输出: 2
- 输入: nums = [1,2,3], k = 3 → 输出: 2
- 输入: nums = [1,-1,1], k = 1 → 输出: 3

🔗 https://leetcode.cn/problems/subarray-sum-equals-k/

**思路**：前缀和 + 哈希表。`preSum[i] - preSum[j] = k` 等价于查询有多少 j 使 `preSum[j] = preSum[i] - k`，用 Map 记录前缀和出现次数。

**代码**：

```js
var subarraySum = function(nums, k) {
  let count = 0, preSum = 0;
  const map = new Map([[0, 1]]); // 空前缀和为 0，出现 1 次

  for (const num of nums) {
    preSum += num;
    count += (map.get(preSum - k) || 0);
    map.set(preSum, (map.get(preSum) || 0) + 1);
  }

  return count;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [238] 除自身以外数组的乘积 ⭐中等

**题目描述**：给你一个整数数组 `nums`，返回数组 `answer`，其中 `answer[i]` 等于 `nums` 中除 `nums[i]` 之外其余各元素的乘积。要求不使用除法，且时间复杂度为 O(n)。

**自测用例**：
- 输入: nums = [1,2,3,4] → 输出: [24,12,8,6]
- 输入: nums = [-1,1,0,-3,3] → 输出: [0,0,9,0,0]
- 输入: nums = [2,3,4,5] → 输出: [60,40,30,24]

🔗 https://leetcode.cn/problems/product-of-array-except-self/

**思路**：两次扫描。正向累积左侧乘积写入 res；反向用变量 right 维护右侧乘积乘进 res，无需额外数组。

**代码**：

```js
var productExceptSelf = function(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);

  let left = 1;
  for (let i = 0; i < n; i++) {
    res[i] = left;
    left *= nums[i];
  }

  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= right;
    right *= nums[i];
  }

  return res;
};
```

**复杂度**：时间 O(n) | 空间 O(1)

---

### 场景题：手写深拷贝 + 手写 EventEmitter

```js
/**
 * 深拷贝
 * 支持：基本类型、对象、数组、Date、RegExp、Map、Set、循环引用
 */
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value); // 处理循环引用

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const clone = new Map();
    seen.set(value, clone);
    value.forEach((v, k) => clone.set(deepClone(k, seen), deepClone(v, seen)));
    return clone;
  }

  if (value instanceof Set) {
    const clone = new Set();
    seen.set(value, clone);
    value.forEach(v => clone.add(deepClone(v, seen)));
    return clone;
  }

  const clone = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, clone); // 先注册再递归，避免循环引用

  for (const key of Reflect.ownKeys(value)) {
    clone[key] = deepClone(value[key], seen);
  }

  return clone;
}

/**
 * EventEmitter
 * API：on / off / once / emit
 */
class EventEmitter {
  constructor() {
    this._events = {};
  }

  on(event, listener) {
    (this._events[event] = this._events[event] || []).push(listener);
    return this;
  }

  off(event, listener) {
    if (this._events[event]) {
      this._events[event] = this._events[event].filter(fn => fn !== listener);
    }
    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, wrapper); // 执行后自动移除
    };
    wrapper._original = listener;
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    if (!this._events[event]) return false;
    [...this._events[event]].forEach(fn => fn.apply(this, args));
    return true;
  }
}
```

---

### 知识点：原型链 Prototype（重点：继承实现方式）

**核心概念**：`__proto__` 是对象的隐式原型，`prototype` 是函数专有属性，`new` 时将 `prototype` 赋给实例的 `__proto__`，形成原型链。

**面试标准答案**：

| 继承方式 | 优点 | 缺点 |
|----------|------|------|
| 原型链继承 | 简单 | 引用类型共享，无法传参 |
| 构造函数继承 | 独立实例属性 | 方法每次重建，不共享 |
| 组合继承 | 属性独立+方法共享 | 父构造函数调用两次 |
| 寄生组合继承 | 最完美 ES5 方案 | 略复杂 |
| ES6 class extends | 语法最简洁 | 本质同寄生组合 |

```js
// ES6 class（推荐）
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // 必须在 this 之前
    this.breed = breed;
  }
}
```

**常见追问**：

Q: super() 为什么必须在 this 前面？  
A: ES6 派生类中，this 由父类构造函数创建，不调 super() 则 this 未初始化，访问报 ReferenceError。

Q: Object.create 和 new 的区别？  
A: `new` 调用构造函数并创建实例；`Object.create(proto)` 直接以 proto 为原型创建对象，不执行任何构造函数。

---

## Day 4 — 图 BFS/DFS

### [200] 岛屿数量 ⭐中等

**题目描述**：给你一个由 `'1'`（陆地）和 `'0'`（水）组成的二维网格，计算网格中岛屿的数量。岛屿由相邻的陆地连接而成，四个方向（上下左右）相邻。

**自测用例**：
- 输入: grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]] → 输出: 1
- 输入: grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]] → 输出: 3
- 输入: grid = [["1","0","1"],["0","1","0"],["1","0","1"]] → 输出: 5

🔗 https://leetcode.cn/problems/number-of-islands/

**思路**：遍历矩阵，遇到 '1' 就 DFS 把整块岛屿沉没（置 '0'），计数器 +1。

**代码**：

```js
var numIslands = function(grid) {
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') { count++; dfs(r, c); }
    }
  }

  return count;
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### [695] 岛屿的最大面积 ⭐中等

**题目描述**：给定一个由 `0`（水）和 `1`（陆地）组成的二维网格，找到面积最大的岛屿并返回其面积。岛屿面积是指连通的陆地格子总数，连通方向为上下左右四个方向。

**自测用例**：
- 输入: grid = [[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]] → 输出: 6
- 输入: grid = [[0,0,0,0,0,0,0,0]] → 输出: 0
- 输入: grid = [[1,1,0,0],[1,1,0,0],[0,0,1,1]] → 输出: 4

🔗 https://leetcode.cn/problems/max-area-of-island/

**思路**：DFS 返回当前格子面积（1 + 四邻格面积之和），全局维护最大值。

**代码**：

```js
var maxAreaOfIsland = function(grid) {
  const rows = grid.length, cols = grid[0].length;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== 1) return 0;
    grid[r][c] = 0;
    return 1 + dfs(r+1,c) + dfs(r-1,c) + dfs(r,c+1) + dfs(r,c-1);
  };

  let max = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) max = Math.max(max, dfs(r, c));
    }
  }

  return max;
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### [130] 被围绕的区域 ⭐中等

**题目描述**：给你一个 `m × n` 的矩阵 `board`，由 `'X'` 和 `'O'` 组成。找到所有被 `'X'` 围绕的区域，并将这些区域里所有的 `'O'` 用 `'X'` 填充（与边界相连的 `'O'` 不算被围绕）。

**自测用例**：
- 输入: board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]] → 输出: [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]
- 输入: board = [["X"]] → 输出: [["X"]]
- 输入: board = [["O","O"],["O","O"]] → 输出: [["O","O"],["O","O"]]（边界相连，不变）

🔗 https://leetcode.cn/problems/surrounded-regions/

**思路**：不能被围绕的 'O' 必定与边界相连。先从四条边上的 'O' 出发 DFS 标记为 '#'；最后 'O' 变 'X'，'#' 还原 'O'。

**代码**：

```js
var solve = function(board) {
  const rows = board.length, cols = board[0].length;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== 'O') return;
    board[r][c] = '#';
    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
  };

  // 从四条边出发标记"安全"的 O
  for (let r = 0; r < rows; r++) { dfs(r, 0); dfs(r, cols-1); }
  for (let c = 0; c < cols; c++) { dfs(0, c); dfs(rows-1, c); }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === 'O') board[r][c] = 'X';
      else if (board[r][c] === '#') board[r][c] = 'O';
    }
  }
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### [207] 课程表 ⭐中等

**题目描述**：你这个学期必须选修 `numCourses` 门课程，课程编号从 `0` 到 `numCourses-1`。给定先决条件数组 `prerequisites`，其中 `[a, b]` 表示选修 `a` 之前必须先完成 `b`。判断是否可能完成所有课程（即判断有向图中是否存在环）。

**自测用例**：
- 输入: numCourses = 2, prerequisites = [[1,0]] → 输出: true
- 输入: numCourses = 2, prerequisites = [[1,0],[0,1]] → 输出: false
- 输入: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]] → 输出: true

🔗 https://leetcode.cn/problems/course-schedule/

**思路**：拓扑排序（BFS Kahn 算法）。统计入度，将入度为 0 的节点入队；每弹出一个节点，减少邻居入度，入度变 0 则入队。最后判断是否所有节点都被处理。

**代码**：

```js
var canFinish = function(numCourses, prerequisites) {
  const inDegree = new Array(numCourses).fill(0);
  const graph = Array.from({ length: numCourses }, () => []);

  for (const [a, b] of prerequisites) {
    graph[b].push(a); // b -> a
    inDegree[a]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let count = 0;
  while (queue.length) {
    const node = queue.shift();
    count++;
    for (const nei of graph[node]) {
      if (--inDegree[nei] === 0) queue.push(nei);
    }
  }

  return count === numCourses;
};
```

**复杂度**：时间 O(V+E) | 空间 O(V+E)

---

### 场景题：手写 instanceof + 手写 new

```js
/**
 * 手写 instanceof
 * 原理：沿左值的原型链查找，是否存在右值的 prototype
 */
function myInstanceof(left, right) {
  if (typeof left !== 'object' || left === null) return false;

  let proto = Object.getPrototypeOf(left); // 等价于 left.__proto__

  while (proto !== null) {
    if (proto === right.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
}

/**
 * 手写 new
 * 步骤：
 * 1. 创建空对象，原型指向 Constructor.prototype
 * 2. 以新对象为 this 执行构造函数
 * 3. 若构造函数返回对象，则返回该对象；否则返回 obj
 */
function myNew(Constructor, ...args) {
  // 1. 创建对象，设置原型
  const obj = Object.create(Constructor.prototype);

  // 2. 执行构造函数
  const result = Constructor.apply(obj, args);

  // 3. 返回值处理
  return result instanceof Object ? result : obj;
}

// --- 测试 ---
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() { return `Hi, I'm ${this.name}`; };

const p = myNew(Person, 'Alice', 25);
console.log(p.greet()); // Hi, I'm Alice
console.log(myInstanceof(p, Person)); // true
```

---

### 知识点：this 指向

**核心概念**：this 的值在函数调用时确定（箭头函数除外），取决于调用方式，而非定义位置。

**面试标准答案**：

this 的 5 种绑定规则（优先级从高到低）：

1. **new 绑定**：`new Fn()` → this 指向新创建的对象
2. **显式绑定**：`call/apply/bind` → this 指向第一个参数
3. **隐式绑定**：`obj.fn()` → this 指向 obj
4. **默认绑定**：直接调用 `fn()` → 严格模式为 undefined，非严格为 window/global
5. **箭头函数**：没有自己的 this，继承外层词法作用域的 this（不可被 call/apply/bind 改变）

```js
const obj = {
  name: 'obj',
  regular: function() { console.log(this.name); }, // 'obj'
  arrow: () => { console.log(this.name); }         // undefined（词法 this）
};

obj.regular(); // 'obj'
obj.arrow();   // undefined
```

**常见追问**：

Q: 箭头函数和普通函数 this 的区别？  
A: 普通函数的 this 在调用时动态决定；箭头函数没有自己的 this，捕获定义时外层的 this，且无法被 call/apply/bind 修改。

Q: setTimeout 中 this 是什么？  
A: 非严格模式下是 window（浏览器），严格模式下是 undefined。用箭头函数或 bind 可以绑定期望的 this。

---

## Day 5 — 图进阶

### [210] 课程表 II ⭐中等

**题目描述**：同课程表 I，但需返回完成所有课程的学习顺序。若存在循环依赖导致无法完成所有课程，则返回空数组。答案可能不唯一，返回任意一种合法顺序即可。

**自测用例**：
- 输入: numCourses = 2, prerequisites = [[1,0]] → 输出: [0,1]
- 输入: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]] → 输出: [0,1,2,3]（或[0,2,1,3]）
- 输入: numCourses = 2, prerequisites = [[1,0],[0,1]] → 输出: []

🔗 https://leetcode.cn/problems/course-schedule-ii/

**思路**：在 207 基础上，拓扑排序时记录弹出顺序即为修课顺序。若存在环则返回空数组。

**代码**：

```js
var findOrder = function(numCourses, prerequisites) {
  const inDegree = new Array(numCourses).fill(0);
  const graph = Array.from({ length: numCourses }, () => []);

  for (const [a, b] of prerequisites) {
    graph[b].push(a);
    inDegree[a]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node); // 记录拓扑顺序
    for (const nei of graph[node]) {
      if (--inDegree[nei] === 0) queue.push(nei);
    }
  }

  return order.length === numCourses ? order : [];
};
```

**复杂度**：时间 O(V+E) | 空间 O(V+E)

---

### [797] 所有可能的路径 ⭐中等

**题目描述**：给你一个有 `n` 个节点的有向无环图（DAG），节点编号为 `0` 到 `n-1`，以邻接表形式给出。找出所有从节点 `0` 到节点 `n-1` 的路径，结果无顺序要求。

**自测用例**：
- 输入: graph = [[1,2],[3],[3],[]] → 输出: [[0,1,3],[0,2,3]]
- 输入: graph = [[4,3,1],[3,2,4],[3],[4],[]] → 输出: [[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]
- 输入: graph = [[1],[]] → 输出: [[0,1]]

🔗 https://leetcode.cn/problems/all-paths-source-target/

**思路**：DFS 从节点 0 出发，递归探索所有路径，到达终点 n-1 时记录当前路径。

**代码**：

```js
var allPathsSourceTarget = function(graph) {
  const res = [];
  const n = graph.length;

  const dfs = (node, path) => {
    if (node === n - 1) {
      res.push([...path]); // 到达终点，记录路径
      return;
    }
    for (const nei of graph[node]) {
      path.push(nei);
      dfs(nei, path);
      path.pop(); // 回溯
    }
  };

  dfs(0, [0]);
  return res;
};
```

**复杂度**：时间 O(2^n × n) | 空间 O(n)

---

### [133] 克隆图 ⭐中等

**题目描述**：给你无向连通图中一个节点的引用，请返回该图的深拷贝（克隆）。图中每个节点包含一个 `val` 和邻居列表 `neighbors`。节点数量在 `[0, 100]` 之间，节点值唯一。

**自测用例**：
- 输入: adjList = [[2,4],[1,3],[2,4],[1,3]] → 输出: [[2,4],[1,3],[2,4],[1,3]]（克隆后结构相同）
- 输入: adjList = [[]] → 输出: [[]]（单节点无边）
- 输入: adjList = [] → 输出: []（空图）

🔗 https://leetcode.cn/problems/clone-graph/

**思路**：DFS + 哈希表。哈希表记录"原节点 → 克隆节点"的映射，避免重复克隆和处理环。

**代码**：

```js
var cloneGraph = function(node) {
  if (!node) return null;
  const visited = new Map(); // 原节点 -> 克隆节点

  const dfs = (node) => {
    if (visited.has(node)) return visited.get(node);

    const clone = new Node(node.val);
    visited.set(node, clone); // 先注册，再递归（处理环）

    for (const neighbor of node.neighbors) {
      clone.neighbors.push(dfs(neighbor));
    }

    return clone;
  };

  return dfs(node);
};
```

**复杂度**：时间 O(V+E) | 空间 O(V)

---

### [127] 单词接龙 ⭐⭐困难

**题目描述**：给定开始单词 `beginWord`、结束单词 `endWord` 和单词列表 `wordList`。每次转换只能改变一个字母，且转换后的单词必须在 `wordList` 中。找出从 `beginWord` 到 `endWord` 的最短转换序列的长度，不存在则返回 `0`。

**自测用例**：
- 输入: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"] → 输出: 5
- 输入: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"] → 输出: 0
- 输入: beginWord = "a", endWord = "c", wordList = ["a","b","c"] → 输出: 2

🔗 https://leetcode.cn/problems/word-ladder/

**思路**：BFS 最短路径。将每个单词视为节点，相差一个字母的单词之间有边。BFS 逐层扩展，第一次到达 endWord 时的层数即为答案。优化：将 wordList 存入 Set，枚举每位字母替换（26 种）来找邻居，避免 O(n²) 比较。

**代码**：

```js
var ladderLength = function(beginWord, endWord, wordList) {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;

  const queue = [[beginWord, 1]]; // [当前词, 步数]
  const visited = new Set([beginWord]);

  while (queue.length) {
    const [word, steps] = queue.shift();

    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) { // a-z
        const newWord = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
        if (newWord === endWord) return steps + 1;
        if (wordSet.has(newWord) && !visited.has(newWord)) {
          visited.add(newWord);
          queue.push([newWord, steps + 1]);
        }
      }
    }
  }

  return 0;
};
```

**复杂度**：时间 O(M²×N)（M=词长，N=词表大小） | 空间 O(M²×N)

---

### 场景题：手写 call / apply / bind

```js
/**
 * 手写 call
 * 核心：将函数挂到 context 对象上执行，借助隐式绑定让 this 指向 context
 */
Function.prototype.myCall = function(context, ...args) {
  context = context == null ? globalThis : Object(context);
  const key = Symbol('fn'); // 用 Symbol 避免属性污染
  context[key] = this;      // this 就是被调用的函数
  const result = context[key](...args);
  delete context[key];
  return result;
};

/**
 * 手写 apply
 * 与 call 相同，参数以数组传入
 */
Function.prototype.myApply = function(context, args = []) {
  context = context == null ? globalThis : Object(context);
  const key = Symbol('fn');
  context[key] = this;
  const result = context[key](...args);
  delete context[key];
  return result;
};

/**
 * 手写 bind
 * 返回新函数，支持预置参数（偏函数），还需处理 new 调用
 */
Function.prototype.myBind = function(context, ...bindArgs) {
  const fn = this;

  function BoundFn(...callArgs) {
    // 如果被 new 调用，this 是新对象，不应被 context 替换
    return fn.apply(this instanceof BoundFn ? this : context, [...bindArgs, ...callArgs]);
  }

  // 维护原型链，保证 new BoundFn() 能访问原函数原型上的方法
  BoundFn.prototype = Object.create(fn.prototype);
  return BoundFn;
};

// --- 测试 ---
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Alice' };
console.log(greet.myCall(user, 'Hello', '!'));    // Hello, Alice!
console.log(greet.myApply(user, ['Hi', '~']));   // Hi, Alice~
const boundGreet = greet.myBind(user, 'Hey');
console.log(boundGreet('?'));                      // Hey, Alice?
```

---

### 知识点：作用域与变量提升

**核心概念**：JS 有全局、函数、块级（ES6）三种作用域。作用域链在函数定义时确定（词法作用域）。var 声明会提升到函数顶部，let/const 有"暂时性死区"（TDZ）。

**面试标准答案**：

**变量提升（Hoisting）**：
- `var` 声明提升，初始化为 `undefined`，赋值不提升
- `function` 声明整体提升（声明+定义）
- `let/const` 声明提升但不初始化，访问报 ReferenceError（TDZ）

```js
console.log(a); // undefined（var 提升）
console.log(b); // ReferenceError（TDZ）
var a = 1;
let b = 2;

foo(); // 'foo'（函数声明整体提升）
function foo() { console.log('foo'); }

bar(); // TypeError: bar is not a function（函数表达式只提升 var bar）
var bar = function() { console.log('bar'); };
```

**作用域链**：函数执行时查找变量，先查自身作用域，再向外层作用域查找，直到全局。作用域链在**定义**时确定，与调用位置无关（词法作用域）。

**常见追问**：

Q: 闭包是什么？  
A: 函数 + 其定义时的词法环境。内层函数保留了对外层作用域变量的引用，即使外层函数已执行完毕。常见应用：防抖节流、模块化、私有变量。

Q: for 循环中 var 和 let 的区别？  
A: `var` 只有函数作用域，所有循环共享同一个变量；`let` 每次迭代创建新的块级绑定，解决了异步回调中拿到的都是最终值的问题。

---

## Day 6 — 树 Hard

### [124] 二叉树中的最大路径和 ⭐⭐困难

**题目描述**：给定一个二叉树的根节点 `root`，返回其最大路径和。路径是指从树中任意节点出发、到任意节点的序列（不一定经过根节点），路径中每个节点只能出现一次，节点值可以为负数。

**自测用例**：
- 输入: root = [1,2,3] → 输出: 6（路径：2→1→3）
- 输入: root = [-10,9,20,null,null,15,7] → 输出: 42（路径：15→20→7）
- 输入: root = [-3] → 输出: -3

🔗 https://leetcode.cn/problems/binary-tree-maximum-path-sum/

**思路**：后序遍历，每个节点计算"经过该节点的最大路径和"（左贡献 + 右贡献 + 节点值），同时维护全局最大值。向父节点返回时只能选左或右一侧（不能分叉）。

**代码**：

```js
var maxPathSum = function(root) {
  let maxSum = -Infinity;

  const dfs = (node) => {
    if (!node) return 0;

    // 负贡献不要，取 0
    const left = Math.max(0, dfs(node.left));
    const right = Math.max(0, dfs(node.right));

    // 更新全局最大（经过当前节点的路径）
    maxSum = Math.max(maxSum, node.val + left + right);

    // 向父节点只能返回一侧
    return node.val + Math.max(left, right);
  };

  dfs(root);
  return maxSum;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [297] 二叉树的序列化与反序列化 ⭐⭐困难

**题目描述**：设计一个算法，实现二叉树的序列化（树 → 字符串）与反序列化（字符串 → 树）。序列化格式不限，但需保证序列化后能还原出原始树结构。

**自测用例**：
- 输入: root = [1,2,3,null,null,4,5] → serialize → deserialize → 输出: [1,2,3,null,null,4,5]
- 输入: root = [] → serialize → deserialize → 输出: []
- 输入: root = [1] → serialize → deserialize → 输出: [1]

🔗 https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/

**思路**：前序遍历序列化，空节点用 '#' 表示，节点间用 ',' 分隔。反序列化时按前序顺序递归还原，用队列或下标消费节点。

**代码**：

```js
var serialize = function(root) {
  const parts = [];

  const dfs = (node) => {
    if (!node) { parts.push('#'); return; }
    parts.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  };

  dfs(root);
  return parts.join(',');
};

var deserialize = function(data) {
  const nodes = data.split(',');
  let idx = 0;

  const dfs = () => {
    if (nodes[idx] === '#') { idx++; return null; }
    const node = new TreeNode(parseInt(nodes[idx++]));
    node.left = dfs();
    node.right = dfs();
    return node;
  };

  return dfs();
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [236] 二叉树的最近公共祖先 ⭐中等

**题目描述**：给定一个二叉树的根节点 `root` 以及树中两个节点 `p` 和 `q`，找到它们的最近公共祖先（LCA）。最近公共祖先是指：在树中同时拥有 `p` 和 `q` 为后代的最深节点（一个节点也可以是它自己的后代）。

**自测用例**：
- 输入: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1 → 输出: 3
- 输入: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4 → 输出: 5
- 输入: root = [1,2], p = 1, q = 2 → 输出: 1

🔗 https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/

**思路**：后序遍历。若当前节点是 p 或 q，直接返回当前节点；左右子树的返回值若都不为 null，说明当前节点就是 LCA；否则返回非 null 的那侧。

**代码**：

```js
var lowestCommonAncestor = function(root, p, q) {
  if (!root || root === p || root === q) return root;

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  // 左右都找到，当前节点就是 LCA
  if (left && right) return root;

  // 只有一侧找到，向上传递
  return left || right;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [105] 从前序与中序遍历序列构造二叉树 ⭐中等

**题目描述**：给定两个整数数组 `preorder`（前序遍历）和 `inorder`（中序遍历），构造并返回对应的二叉树。数组中的值互不相同。

**自测用例**：
- 输入: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7] → 输出: [3,9,20,null,null,15,7]
- 输入: preorder = [-1], inorder = [-1] → 输出: [-1]
- 输入: preorder = [1,2,3], inorder = [2,1,3] → 输出: [1,2,3]

🔗 https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/

**思路**：前序第一个元素是根节点，在中序中找到根的位置，左边是左子树，右边是右子树，递归构建。用 Map 缓存中序下标，避免每次线性查找。

**代码**：

```js
var buildTree = function(preorder, inorder) {
  const map = new Map();
  inorder.forEach((val, idx) => map.set(val, idx));

  const build = (preLeft, preRight, inLeft, inRight) => {
    if (preLeft > preRight) return null;

    const rootVal = preorder[preLeft];
    const root = new TreeNode(rootVal);
    const inMid = map.get(rootVal); // 根在中序的位置
    const leftSize = inMid - inLeft; // 左子树节点数

    root.left = build(preLeft + 1, preLeft + leftSize, inLeft, inMid - 1);
    root.right = build(preLeft + leftSize + 1, preRight, inMid + 1, inRight);

    return root;
  };

  return build(0, preorder.length - 1, 0, inorder.length - 1);
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### 场景题：手写 Promise（进阶版，支持链式调用）

```js
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

/**
 * resolvePromise：处理 then 回调返回值与新 Promise 的关系
 * 符合 Promise/A+ 规范
 */
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected'));
  }

  if (x instanceof MyPromise) {
    x.then(resolve, reject);
    return;
  }

  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false;
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(
          x,
          (y) => { if (!called) { called = true; resolvePromise(promise2, y, resolve, reject); } },
          (r) => { if (!called) { called = true; reject(r); } }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (!called) { called = true; reject(e); }
    }
  } else {
    resolve(x);
  }
}

class MyPromise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status !== PENDING) return;
      this.status = FULFILLED;
      this.value = value;
      this.onFulfilledCallbacks.forEach(fn => fn());
    };

    const reject = (reason) => {
      if (this.status !== PENDING) return;
      this.status = REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn());
    };

    try { executor(resolve, reject); }
    catch (e) { reject(e); }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    onRejected = typeof onRejected === 'function' ? onRejected : e => { throw e; };

    // then 返回一个新的 Promise（这是链式调用的关键）
    const promise2 = new MyPromise((resolve, reject) => {
      const handleFulfilled = () => {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) { reject(e); }
        });
      };

      const handleRejected = () => {
        setTimeout(() => {
          try {
            const x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) { reject(e); }
        });
      };

      if (this.status === FULFILLED) handleFulfilled();
      else if (this.status === REJECTED) handleRejected();
      else {
        this.onFulfilledCallbacks.push(handleFulfilled);
        this.onRejectedCallbacks.push(handleRejected);
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  static resolve(value) {
    return new MyPromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}

// --- 测试链式调用 ---
MyPromise.resolve(1)
  .then(v => v + 1)
  .then(v => v * 2)
  .then(v => console.log(v)); // 4
```

---

### 知识点：浏览器渲染原理

**核心概念**：浏览器将 HTML/CSS/JS 转换为屏幕像素的过程，涉及解析、样式计算、布局、绘制、合成等多个阶段。

**面试标准答案**：

浏览器渲染流水线（Critical Rendering Path）：

1. **解析 HTML** → 构建 DOM 树
2. **解析 CSS** → 构建 CSSOM 树
3. **合并** DOM + CSSOM → **Render Tree**（不含 display:none 节点）
4. **Layout（回流）**：计算每个节点的几何信息（位置、大小）
5. **Paint（重绘）**：将节点绘制成位图
6. **Composite（合成）**：将各层位图合并输出到屏幕

**回流 vs 重绘**：

| 操作 | 触发 | 代价 |
|------|------|------|
| 修改几何属性（width/height/margin/top...） | 回流 + 重绘 | 最高 |
| 修改颜色/背景等非几何样式 | 重绘 | 中 |
| transform/opacity | 仅合成层 | 最低（GPU 加速） |

**性能优化**：
- 用 `transform` 代替 `top/left` 做动画
- 批量修改 DOM（使用 DocumentFragment 或一次性修改 className）
- 避免频繁读取会触发回流的属性（offsetWidth、scrollTop 等），可缓存到变量

**常见追问**：

Q: script 标签为什么放在 body 底部？  
A: 浏览器遇到 script 会阻塞 HTML 解析（因为 JS 可能修改 DOM），放底部可让页面先渲染出来，提升首屏体验。用 `defer` 也可解决：异步加载、在 DOMContentLoaded 前按顺序执行。

Q: DOMContentLoaded 和 load 的区别？  
A: DOMContentLoaded 在 HTML 解析完成、DOM 构建好时触发（不等图片/CSS）；load 在所有资源（图片、样式、脚本）都加载完后触发。

---

## Day 7 — 堆 + 复习

### [215] 数组中的第 K 个最大元素 ⭐中等

**题目描述**：给定整数数组 `nums` 和整数 `k`，返回数组中第 `k` 个最大的元素。注意是排序后的第 `k` 大，而非第 `k` 个不同的元素。

**自测用例**：
- 输入: nums = [3,2,1,5,6,4], k = 2 → 输出: 5
- 输入: nums = [3,2,3,1,2,4,5,5,6], k = 4 → 输出: 4
- 输入: nums = [1], k = 1 → 输出: 1

🔗 https://leetcode.cn/problems/kth-largest-element-in-an-array/

**方法一：快速选择（平均 O(n)）**

**思路**：类似快排的 partition，每次把 pivot 放到最终位置。若 pivot 的位置正好是第 k 大的下标，直接返回；否则只递归 pivot 所在的半边。

```js
var findKthLargest = function(nums, k) {
  const target = nums.length - k; // 第 k 大 = 从小到大第 (n-k) 个

  const partition = (left, right) => {
    const pivot = nums[right];
    let i = left;
    for (let j = left; j < right; j++) {
      if (nums[j] <= pivot) {
        [nums[i], nums[j]] = [nums[j], nums[i]];
        i++;
      }
    }
    [nums[i], nums[right]] = [nums[right], nums[i]];
    return i;
  };

  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const pos = partition(left, right);
    if (pos === target) return nums[pos];
    else if (pos < target) left = pos + 1;
    else right = pos - 1;
  }
};
```

**方法二：小顶堆（稳定 O(n log k)）**

**思路**：维护大小为 k 的小顶堆，遍历数组，若当前元素大于堆顶则替换并重新堆化。最终堆顶就是第 k 大。

```js
var findKthLargest = function(nums, k) {
  // 用数组模拟小顶堆
  const heap = nums.slice(0, k);

  // 建堆
  const heapify = (arr, i, size) => {
    let smallest = i;
    const l = 2*i+1, r = 2*i+2;
    if (l < size && arr[l] < arr[smallest]) smallest = l;
    if (r < size && arr[r] < arr[smallest]) smallest = r;
    if (smallest !== i) {
      [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
      heapify(arr, smallest, size);
    }
  };

  // 建初始小顶堆
  for (let i = Math.floor(k/2)-1; i >= 0; i--) heapify(heap, i, k);

  // 遍历剩余元素
  for (let i = k; i < nums.length; i++) {
    if (nums[i] > heap[0]) {
      heap[0] = nums[i];
      heapify(heap, 0, k);
    }
  }

  return heap[0]; // 堆顶就是第 k 大
};
```

**复杂度**：快速选择 时间 O(n)avg/O(n²)worst | 小顶堆 时间 O(n log k) | 空间均 O(k)

---

### [347] 前 K 个高频元素 ⭐中等

**题目描述**：给你一个整数数组 `nums` 和一个整数 `k`，返回其中出现频率前 `k` 高的元素。答案的顺序无要求，但要保证时间复杂度优于 O(n log n)。

**自测用例**：
- 输入: nums = [1,1,1,2,2,3], k = 2 → 输出: [1,2]
- 输入: nums = [1], k = 1 → 输出: [1]
- 输入: nums = [4,1,-1,2,-1,2,3], k = 2 → 输出: [-1,2]

🔗 https://leetcode.cn/problems/top-k-frequent-elements/

**思路**：统计词频后，用大小为 k 的小顶堆（按频率）维护最高频 k 个元素；或直接按频率降序排序取前 k 个。

**代码**：

```js
var topKFrequent = function(nums, k) {
  // 1. 统计频率
  const freqMap = new Map();
  for (const n of nums) freqMap.set(n, (freqMap.get(n) || 0) + 1);

  // 2. 按频率降序排序，取前 k 个
  return [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([val]) => val);
};

// 进阶：桶排序 O(n)
var topKFrequentBucket = function(nums, k) {
  const freqMap = new Map();
  for (const n of nums) freqMap.set(n, (freqMap.get(n) || 0) + 1);

  // 桶：下标 = 频率，值 = 该频率的数字列表
  const bucket = Array.from({ length: nums.length + 1 }, () => []);
  for (const [val, freq] of freqMap) bucket[freq].push(val);

  const res = [];
  for (let i = bucket.length - 1; i >= 0 && res.length < k; i--) {
    res.push(...bucket[i]);
  }

  return res.slice(0, k);
};
```

**复杂度**：排序版 时间 O(n log n) | 桶排序版 时间 O(n) | 空间 O(n)

---

### [295] 数据流的中位数 ⭐⭐困难

**题目描述**：设计一个数据结构 `MedianFinder`，支持两个操作：`addNum(num)` 向数据结构中添加一个整数，`findMedian()` 返回目前所有元素的中位数（若元素个数为偶数，返回两个中间值的平均数）。

**自测用例**：
- 操作: addNum(1) → addNum(2) → findMedian() → 输出: 1.5
- 操作: addNum(1) → addNum(2) → addNum(3) → findMedian() → 输出: 2.0
- 操作: addNum(6) → findMedian() → addNum(10) → findMedian() → addNum(2) → findMedian() → 输出: 6.0, 8.0, 6.0

🔗 https://leetcode.cn/problems/find-median-from-data-stream/

**思路**：用两个堆维护数据流：大顶堆存较小的一半，小顶堆存较大的一半，保持两堆大小差 ≤ 1。中位数由两堆堆顶决定。JS 无内置堆，需手写。

**代码**：

```js
// 简化版：用排序数组模拟（面试可先说这个，再说堆的优化）
class MedianFinder {
  constructor() {
    this.data = [];
  }

  addNum(num) {
    // 二分插入，保持有序
    let left = 0, right = this.data.length;
    while (left < right) {
      const mid = left + ((right - left) >> 1);
      if (this.data[mid] < num) left = mid + 1;
      else right = mid;
    }
    this.data.splice(left, 0, num); // O(n) 插入
  }

  findMedian() {
    const n = this.data.length;
    if (n % 2 === 1) return this.data[Math.floor(n / 2)];
    return (this.data[n/2 - 1] + this.data[n/2]) / 2;
  }
}

// 双堆优化版（面试加分项）
class MedianFinderHeap {
  constructor() {
    // maxHeap：大顶堆，存较小的一半（用负值模拟，JS无内置堆）
    // minHeap：小顶堆，存较大的一半
    this.maxHeap = []; // 存负数来模拟大顶堆
    this.minHeap = [];
  }

  _pushMaxHeap(val) {
    // 简化：用数组+排序模拟（实际面试说清楚堆的操作即可）
    this.maxHeap.push(-val);
    this.maxHeap.sort((a, b) => a - b); // 最小在前 = 最大负数在前
  }

  _pushMinHeap(val) {
    this.minHeap.push(val);
    this.minHeap.sort((a, b) => a - b);
  }

  addNum(num) {
    this._pushMaxHeap(num); // 先入大顶堆
    // 大顶堆堆顶移到小顶堆（保证大顶堆所有数 <= 小顶堆所有数）
    this._pushMinHeap(-this.maxHeap.shift());
    // 保持大顶堆 >= 小顶堆大小
    if (this.minHeap.length > this.maxHeap.length) {
      this._pushMaxHeap(this.minHeap.shift());
    }
  }

  findMedian() {
    if (this.maxHeap.length > this.minHeap.length) {
      return -this.maxHeap[0];
    }
    return (-this.maxHeap[0] + this.minHeap[0]) / 2;
  }
}
```

**复杂度**：双堆版 addNum O(log n) | findMedian O(1) | 空间 O(n)

---

### 场景题：手写柯里化 curry

```js
/**
 * curry 柯里化
 * 将多参数函数转为单参数函数的链式调用
 * 当收集的参数达到原函数参数个数时执行
 */
function curry(fn) {
  return function curried(...args) {
    // 参数足够，直接执行
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // 参数不足，返回新函数继续收集
    return function(...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

// --- 测试 ---
const add = (a, b, c) => a + b + c;
const curriedAdd = curry(add);

console.log(curriedAdd(1)(2)(3));    // 6
console.log(curriedAdd(1, 2)(3));    // 6
console.log(curriedAdd(1)(2, 3));    // 6
console.log(curriedAdd(1, 2, 3));    // 6

// 实际应用：偏函数
const addTen = curriedAdd(10);
const addTwenty = curriedAdd(20);
console.log(addTen(5)(3));   // 18
console.log(addTwenty(5)(3)); // 28
```

---

### 知识点：HTTP 缓存策略

**核心概念**：HTTP 缓存分为强缓存和协商缓存，用于减少重复请求、提升页面加载速度。

**面试标准答案**：

**强缓存**（不请求服务器，直接用本地缓存）：

| 响应头 | 说明 |
|--------|------|
| `Cache-Control: max-age=3600` | 缓存 3600 秒，优先级高于 Expires |
| `Expires: Thu, 01 Jan 2026 ...` | 绝对过期时间（HTTP/1.0，受本地时间影响） |

强缓存命中时，状态码为 **200（from disk/memory cache）**。

**协商缓存**（请求服务器验证，命中则返回 304）：

| 请求头 | 响应头 | 说明 |
|--------|--------|------|
| `If-None-Match: "abc123"` | `ETag: "abc123"` | 资源内容哈希，精确但有性能开销 |
| `If-Modified-Since: ...` | `Last-Modified: ...` | 最后修改时间，精度为秒 |

**完整缓存流程**：

```
请求资源
  ↓
有本地缓存？
  ├── 是 → 未过期（强缓存）？
  │           ├── 是 → 直接返回 200（from cache）
  │           └── 否 → 发请求带 ETag/Last-Modified
  │                     ├── 服务器说没变（304）→ 用缓存
  │                     └── 服务器返回新资源（200）
  └── 否 → 直接发请求获取资源（200）
```

**最佳实践**：
- HTML：`Cache-Control: no-cache`（每次验证，保证用最新 HTML）
- JS/CSS/图片（有 hash）：`Cache-Control: max-age=31536000, immutable`（强缓存1年，内容变化时 URL 变化）

**常见追问**：

Q: no-cache 和 no-store 的区别？  
A: `no-cache` 表示每次使用缓存前必须向服务器验证（走协商缓存），并非不缓存；`no-store` 才是真正不缓存，每次都从服务器获取完整资源。

Q: ETag 比 Last-Modified 好在哪里？  
A: Last-Modified 精度只到秒，1秒内多次修改无法识别；ETag 基于内容哈希，精确识别内容变化，但计算开销略高。两者都设置时，ETag 优先级更高。

---

## 📊 Week 1 完成情况总结

| Day | 主题 | 算法题 | 场景题 | 知识点 |
|-----|------|--------|--------|--------|
| Day 1 | 单调栈 | 739、496、503、42 | debounce + throttle | Event Loop |
| Day 2 | 二分查找 | 704、35、34、33 | Promise 基础版 | 原型链 & 继承 |
| Day 3 | 二分进阶+前缀和 | 153、162、4、560、238 | 深拷贝 + EventEmitter | Prototype 继承方式 |
| Day 4 | 图 BFS/DFS | 200、695、130、207 | instanceof + new | this 指向 |
| Day 5 | 图进阶 | 210、797、133、127 | call/apply/bind | 作用域与变量提升 |
| Day 6 | 树 Hard | 124、297、236、105 | Promise 进阶版 | 浏览器渲染原理 |
| Day 7 | 堆+复习 | 215、347、295 | curry 柯里化 | HTTP 缓存策略 |

**总计：算法题 26 道，场景题 9 个，知识点 7 个**

