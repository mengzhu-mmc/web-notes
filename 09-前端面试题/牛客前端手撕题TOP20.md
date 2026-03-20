# 牛客前端面试手撕题 TOP20

> 来源：[牛客网前端面试手撕题](https://www.nowcoder.com/exam/oj?tab=%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E6%89%8B%E6%92%95%E9%A2%98&topicId=274)
> 整理时间：2026-03-20
> 共 20 道，全部为 Medium 难度

---

## 目录

1. [FED1 事件委托](#fed1-事件委托)
2. [FED2 数组去重](#fed2-数组去重)
3. [FED3 合法的URL](#fed3-合法的url)
4. [FED4 快速排序](#fed4-快速排序)
5. [FED5 全排列](#fed5-全排列)
6. [FED6 instanceof](#fed6-instanceof)
7. [FED7 Array.map](#fed7-arraymap)
8. [FED8 Array.filter](#fed8-arrayfilter)
9. [FED9 Array.reduce](#fed9-arrayreduce)
10. [FED10 Object.create](#fed10-objectcreate)
11. [FED11 Function.call](#fed11-functioncall)
12. [FED12 Function.bind](#fed12-functionbind)
13. [FED13 new](#fed13-new)
14. [FED14 Object.freeze](#fed14-objectfreeze)
15. [FED15 浅拷贝](#fed15-浅拷贝)
16. [FED16 简易深拷贝](#fed16-简易深拷贝)
17. [FED17 深拷贝](#fed17-深拷贝)
18. [FED18 寄生组合式继承](#fed18-寄生组合式继承)
19. [FED19 发布订阅模式](#fed19-发布订阅模式)
20. [FED20 观察者模式](#fed20-观察者模式)

---

## FED1 事件委托

**难度**：中等 | **通过率**：43.14%
**牛客链接**：https://www.nowcoder.com/practice/02866b3ce7f8420c8b5d22f483c5fcc0?tpId=274

### 题目描述

请补全 JavaScript 代码，要求如下：
1. 给 `ul` 标签添加点击事件
2. 当点击某 `li` 标签时，该标签内容拼接 `"."` 符号。如：某 `li` 标签被点击时，该标签内容为 `".."`
3. 必须使用 DOM0 级标准事件（`onclick`）

### 标准实现

```js
// 事件委托：将子元素事件统一代理到父元素上
// 利用事件冒泡机制：li 的点击事件会冒泡到 ul
document.querySelector('ul').onclick = function(event) {
  // event.target 是实际被点击的元素
  const target = event.target;
  // 判断点击的是否是 li 元素
  if (target.tagName === 'LI') {
    target.textContent += '.';
  }
};
```

### 核心思路

1. 事件委托核心是**事件冒泡**：子元素的事件会沿 DOM 树向上传播到父元素
2. 在父元素（`ul`）上统一监听，通过 `event.target` 判断真正被点击的子元素
3. 相比在每个 `li` 上绑定事件，委托减少了事件监听器数量，并天然支持动态新增的子元素

### 复杂度

- 时间：O(1) 注册，O(1) 触发
- 空间：O(1)（只有 1 个事件监听器，而非 n 个）

### 考察点

- 事件冒泡与捕获的区别
- `event.target` vs `event.currentTarget`
- DOM0 vs DOM2 事件绑定（`onclick` vs `addEventListener`）
- 动态元素的事件处理优势

---

## FED2 数组去重

**难度**：中等 | **通过率**：约 60%+
**牛客链接**：https://www.nowcoder.com/practice/7a26729a75ca4e5db49ea059b01305c9?tpId=274

### 题目描述

请补全 JavaScript 代码，要求去除数组参数中的重复数字项并返回该数组。

```
输入：_deleteRepeat([-1,1,2,2])
输出：[-1,1,2]
```

### 标准实现

```js
// 方法一：Set（最简洁，面试首选）
function _deleteRepeat(array) {
  return [...new Set(array)];
}

// 方法二：filter + indexOf（兼容性更好，便于面试手写）
function _deleteRepeat(array) {
  return array.filter((item, index) => array.indexOf(item) === index);
}

// 方法三：reduce（展示 reduce 的灵活性）
function _deleteRepeat(array) {
  return array.reduce((acc, cur) => {
    if (!acc.includes(cur)) acc.push(cur);
    return acc;
  }, []);
}

// 方法四：Map（处理 NaN 等特殊值时最准确）
function _deleteRepeat(array) {
  const map = new Map();
  return array.filter(item => {
    if (!map.has(item)) {
      map.set(item, true);
      return true;
    }
    return false;
  });
}
```

### 核心思路

- `Set` 天然去重，利用值的唯一性
- `filter + indexOf` 只保留第一次出现的元素
- 注意 `indexOf` 对 `NaN` 无效（`NaN !== NaN`），`Set` 和 `Map` 能正确处理

### 复杂度

- Set 方案：时间 O(n)，空间 O(n)
- filter+indexOf：时间 O(n²)，空间 O(1)

### 考察点

- Set/Map 的使用
- `indexOf` 与 `includes` 的区别
- 对 `NaN` 的处理边界

---

## FED3 合法的URL

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/81982d7a36aa436fa9143c8b4f5ea1a3?tpId=274

### 题目描述

请补全 JavaScript 代码，判断参数字符串是否是合法 URL，合法返回 `true`，否则返回 `false`。

### 标准实现

```js
// 方法一：正则表达式（考察正则能力）
function _isUrl(url) {
  const reg = /^(https?:\/\/)([^\s$.?#].[^\s]*)$/i;
  return reg.test(url);
}

// 方法二：利用 URL 构造函数（更健壮）
function _isUrl(url) {
  try {
    const u = new URL(url);
    // 只允许 http 和 https 协议
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// 方法三：更完整的正则（涵盖端口、路径、查询参数、锚点）
function _isUrl(url) {
  const reg = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
  return reg.test(url);
}
```

### 核心思路

- `URL` 构造函数是最可靠的方式，浏览器内置解析逻辑
- 正则方案需关注：协议、域名、路径等各部分的合法字符
- `try/catch` 是处理 `URL` 构造失败的标准模式

### 复杂度

- 时间 O(n)，空间 O(1)

### 考察点

- 正则表达式基础（`^`、`$`、`?`、`*`、`+`、字符类）
- `URL` Web API 的使用
- 异常处理（`try/catch`）

---

## FED4 快速排序

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/38da660199d0400580ac3905c05f5bd6?tpId=274

### 题目描述

请补全 JavaScript 代码，实现数组的快速排序并返回（升序）。

### 标准实现

```js
// 方法一：非原地版（空间 O(n log n)，易理解，适合面试手写）
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  // 选基准（取中间值减少最坏情况）
  const pivotIndex = Math.floor(arr.length / 2);
  const pivot = arr[pivotIndex];
  
  const left = [];
  const right = [];
  
  for (let i = 0; i < arr.length; i++) {
    if (i === pivotIndex) continue; // 跳过基准本身
    if (arr[i] <= pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }
  
  return [...quickSort(left), pivot, ...quickSort(right)];
}

// 方法二：原地快排（空间 O(log n)，标准实现）
function quickSortInPlace(arr, left = 0, right = arr.length - 1) {
  if (left >= right) return arr;
  
  const pivotIndex = partition(arr, left, right);
  quickSortInPlace(arr, left, pivotIndex - 1);
  quickSortInPlace(arr, pivotIndex + 1, right);
  return arr;
}

function partition(arr, left, right) {
  const pivot = arr[right]; // 以最右元素为基准
  let i = left - 1;
  
  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]]; // 解构交换
    }
  }
  
  [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]];
  return i + 1;
}
```

### 核心思路

1. 选一个基准元素（pivot）
2. 将小于 pivot 的元素放左边，大于的放右边
3. 对左右子数组递归执行上述操作
4. 递归终止条件：数组长度 ≤ 1

### 复杂度

- 平均：时间 O(n log n)，空间 O(log n)
- 最坏（已排序数组 + 固定取首/尾为 pivot）：时间 O(n²)

### 考察点

- 分治思想
- 递归与终止条件
- 基准选择策略（三数取中法优化）
- 原地 vs 非原地的权衡

---

## FED5 全排列

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/b3ac35e1569e4601b6d3957dd337e70b?tpId=274

### 题目描述

请补全 JavaScript 代码，实现数组参数的全排列。

```
输入：[1, 2, 3]
输出：[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

### 标准实现

```js
// 回溯法（标准解法）
function permute(nums) {
  const result = [];
  const used = new Array(nums.length).fill(false);
  
  function backtrack(path) {
    // 终止条件：路径长度等于数组长度
    if (path.length === nums.length) {
      result.push([...path]); // 注意要拷贝一份
      return;
    }
    
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue; // 跳过已使用的元素
      
      // 选择
      used[i] = true;
      path.push(nums[i]);
      
      // 递归
      backtrack(path);
      
      // 撤销选择（回溯）
      path.pop();
      used[i] = false;
    }
  }
  
  backtrack([]);
  return result;
}

// 方法二：交换法（更简洁）
function permute2(nums) {
  const result = [];
  
  function backtrack(start) {
    if (start === nums.length) {
      result.push([...nums]);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      [nums[start], nums[i]] = [nums[i], nums[start]]; // 交换
      backtrack(start + 1);
      [nums[start], nums[i]] = [nums[i], nums[start]]; // 还原
    }
  }
  
  backtrack(0);
  return result;
}
```

### 核心思路

1. **回溯 = 递归 + 撤销**：每次选一个未使用的元素加入路径，递归后撤销
2. 用 `used` 数组记录哪些元素已在当前路径中
3. 当路径长度 = 数组长度时，记录结果

### 复杂度

- 时间 O(n × n!)（n! 个排列，每个需 O(n) 复制）
- 空间 O(n)（递归栈深度）

### 考察点

- 回溯算法框架（选择 → 递归 → 撤销）
- 递归树的理解
- `[...path]` 的必要性（引用 vs 值）

---

## FED6 instanceof

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/a1169935fd6145899f953ba8fbccb585?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `instanceof` 的功能。

```
输入：_instanceof([], Array)
输出：true

输入：_instanceof([], Object)
输出：true
```

### 标准实现

```js
/**
 * 模拟 instanceof 操作符
 * @param {*} obj - 待检测对象
 * @param {Function} constructor - 构造函数
 * @returns {boolean}
 */
function _instanceof(obj, constructor) {
  // 基本类型（非对象/函数）直接返回 false
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return false;
  }
  
  // 获取构造函数的原型
  const prototype = constructor.prototype;
  
  // 沿原型链向上查找
  let proto = Object.getPrototypeOf(obj); // 等价于 obj.__proto__
  
  while (proto !== null) {
    if (proto === prototype) {
      return true;
    }
    proto = Object.getPrototypeOf(proto);
  }
  
  return false;
}

// 测试
console.log(_instanceof([], Array));    // true
console.log(_instanceof([], Object));   // true
console.log(_instanceof('', String));   // false（基本类型）
console.log(_instanceof(null, Object)); // false
```

### 核心思路

1. `instanceof` 检测构造函数的 `prototype` 是否出现在对象的**原型链**上
2. 通过 `Object.getPrototypeOf()` 逐级向上遍历原型链
3. 找到则返回 `true`，到达链顶（`null`）返回 `false`

### 复杂度

- 时间 O(n)，n 为原型链深度
- 空间 O(1)

### 考察点

- 原型链的理解（`__proto__` vs `prototype`）
- `Object.getPrototypeOf()` 的使用
- 对基本类型和 `null` 的边界处理

---

## FED7 Array.map

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/8300c998180c4ebbbd2a5aaeb7fbc77c?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Array.prototype.map` 的功能。

### 标准实现

```js
/**
 * 手写 Array.prototype.map
 * @param {Function} callback - (currentValue, index, array) => newValue
 * @param {*} thisArg - callback 中 this 的指向
 * @returns {Array}
 */
Array.prototype._map = function(callback, thisArg) {
  // 参数校验
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }
  
  const arr = this;       // 原数组
  const result = [];      // 结果数组
  
  for (let i = 0; i < arr.length; i++) {
    // 跳过稀疏数组的空槽（in 操作符检测）
    if (i in arr) {
      // 注意：callback 接收三个参数：当前值、索引、原数组
      result[i] = callback.call(thisArg, arr[i], i, arr);
    }
  }
  
  return result;
};

// 测试
console.log([1, 2, 3]._map(x => x * 2)); // [2, 4, 6]
console.log([1, , 3]._map(x => x * 2));  // [2, empty, 6]（保持稀疏）
```

### 核心思路

1. 遍历原数组，对每个元素调用 `callback`
2. 将回调返回值存入新数组（不修改原数组）
3. 支持 `thisArg` 绑定 `callback` 的 `this`
4. 处理稀疏数组（跳过 `empty` 槽）

### 复杂度

- 时间 O(n)，空间 O(n)

### 考察点

- 原型方法扩展
- `call` 绑定 `this`
- 稀疏数组处理（`in` 操作符）
- map 不改变原数组这一特性

---

## FED8 Array.filter

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/93b96e9694634437898353f844d877af?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Array.prototype.filter` 的功能。

### 标准实现

```js
/**
 * 手写 Array.prototype.filter
 * @param {Function} callback - (currentValue, index, array) => boolean
 * @param {*} thisArg
 * @returns {Array}
 */
Array.prototype._filter = function(callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }
  
  const arr = this;
  const result = [];
  
  for (let i = 0; i < arr.length; i++) {
    if (i in arr) {
      // 只有 callback 返回真值时才加入结果
      if (callback.call(thisArg, arr[i], i, arr)) {
        result.push(arr[i]);
      }
    }
  }
  
  return result;
};

// 测试
console.log([1, 2, 3, 4]._filter(x => x % 2 === 0)); // [2, 4]
console.log([1, , 3]._filter(x => x > 0)); // [1, 3]（稀疏槽被跳过）
```

### 核心思路

与 `map` 类似，区别在于只有 `callback` 返回 `true` 时才将元素 push 到结果数组。注意 filter 的结果数组是**紧凑的**（不保留稀疏槽）。

### 复杂度

- 时间 O(n)，空间 O(k)，k 为通过过滤的元素数量

### 考察点

- 与 map 实现的对比（筛选 vs 变换）
- 稀疏数组的处理差异
- 返回值的特点（新数组，不含空槽）

---

## FED9 Array.reduce

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/213d0ef21cb841de8cf69fcc5ea60eb6?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Array.prototype.reduce` 的功能。

### 标准实现

```js
/**
 * 手写 Array.prototype.reduce
 * @param {Function} callback - (accumulator, currentValue, index, array) => newAcc
 * @param {*} initialValue - 初始值（可选）
 * @returns {*}
 */
Array.prototype._reduce = function(callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }
  
  const arr = this;
  const hasInitial = arguments.length >= 2; // 是否传了初始值
  
  // 空数组且无初始值：抛出错误（符合规范）
  if (arr.length === 0 && !hasInitial) {
    throw new TypeError('Reduce of empty array with no initial value');
  }
  
  let acc;
  let startIndex;
  
  if (hasInitial) {
    acc = initialValue;
    startIndex = 0;
  } else {
    // 没有初始值：用第一个有效元素作为初始值
    acc = arr[0];
    startIndex = 1;
  }
  
  for (let i = startIndex; i < arr.length; i++) {
    if (i in arr) {
      acc = callback(acc, arr[i], i, arr);
    }
  }
  
  return acc;
};

// 测试
console.log([1, 2, 3, 4]._reduce((sum, cur) => sum + cur, 0)); // 10
console.log([1, 2, 3, 4]._reduce((sum, cur) => sum + cur));    // 10（无初始值）
```

### 核心思路

1. 判断是否提供了 `initialValue`（用 `arguments.length` 而非 `=== undefined`）
2. 无初始值时，取数组第一个元素作为累加器初始值，从索引 1 开始遍历
3. 有初始值时，从索引 0 开始遍历

### 复杂度

- 时间 O(n)，空间 O(1)

### 考察点

- `arguments.length` 判断是否传参（区别于 `=== undefined`）
- reduce 的本质：折叠/聚合操作
- 对初始值的两种处理分支

---

## FED10 Object.create

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/0d9a538027a844249f1957f253d4436f?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Object.create` 的功能。

### 标准实现

```js
/**
 * 手写 Object.create
 * 创建一个以 proto 为原型的新对象
 * @param {Object|null} proto - 新对象的原型
 * @param {Object} [propertiesObject] - 属性描述符对象（可选）
 * @returns {Object}
 */
function _create(proto, propertiesObject) {
  // 参数校验：proto 必须是对象或 null
  if (typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }
  
  // 核心：创建一个临时构造函数，将其 prototype 设为 proto
  function F() {}
  F.prototype = proto;
  const obj = new F(); // new 出来的对象，其 __proto__ === F.prototype === proto
  
  // 处理 proto 为 null 的情况
  if (proto === null) {
    obj.__proto__ = null;
  }
  
  // 可选：处理 propertiesObject（属性描述符）
  if (propertiesObject !== undefined) {
    Object.defineProperties(obj, propertiesObject);
  }
  
  return obj;
}

// 测试
const animal = { type: 'Animal' };
const dog = _create(animal);
console.log(dog.type);                        // 'Animal'（继承自原型）
console.log(Object.getPrototypeOf(dog) === animal); // true

const obj = _create(null);
console.log(Object.getPrototypeOf(obj));      // null（纯净对象）
```

### 核心思路

经典的"圣杯模式"：借助一个空构造函数 `F`，将其 `prototype` 设为目标原型，再 `new F()` 得到以该原型为 `__proto__` 的对象。

### 复杂度

- 时间 O(1)，空间 O(1)

### 考察点

- 原型链机制
- `new` 操作符的原理
- `__proto__` vs `prototype` 的区别
- 纯净对象（`Object.create(null)`）的使用场景

---

## FED11 Function.call

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/22df1ed71b204a46b00587fdb780b3ab?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Function.prototype.call` 的功能。

### 标准实现

```js
/**
 * 手写 Function.prototype.call
 * @param {*} thisArg - 函数执行时的 this
 * @param {...*} args - 传入的参数
 * @returns {*}
 */
Function.prototype._call = function(thisArg, ...args) {
  // this 为基本类型时包装，null/undefined 指向全局对象
  // 非严格模式下 null/undefined 会指向 globalThis
  thisArg = thisArg !== null && thisArg !== undefined
    ? Object(thisArg)
    : globalThis;
  
  // 核心：将函数作为 thisArg 的一个临时方法挂载并调用
  // 用 Symbol 避免属性名冲突
  const fn = Symbol('fn');
  thisArg[fn] = this; // this 即当前被调用的函数
  
  // 执行并获取结果
  const result = thisArg[fn](...args);
  
  // 清除临时属性
  delete thisArg[fn];
  
  return result;
};

// 测试
function greet(greeting, punct) {
  return `${greeting}, ${this.name}${punct}`;
}
const user = { name: 'Alice' };
console.log(greet._call(user, 'Hello', '!')); // 'Hello, Alice!'
```

### 核心思路

`call` 的本质：**改变函数执行时的 `this` 指向**。
实现技巧：把函数临时挂到目标对象上，作为对象方法调用（此时函数内 `this` 自然指向该对象），调用后删除临时属性。

### 复杂度

- 时间 O(1)，空间 O(1)

### 考察点

- `this` 指向规则（对象方法调用时 `this` 为该对象）
- `Symbol` 防止属性名冲突
- `null`/`undefined` 的处理（非严格模式指向全局）
- `call` vs `apply` vs `bind` 的区别

---

## FED12 Function.bind

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/ecad0164931847f78c55278cee56e544?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Function.prototype.bind` 的功能。

### 标准实现

```js
/**
 * 手写 Function.prototype.bind
 * @param {*} thisArg - 绑定的 this
 * @param {...*} args - 预置参数（偏函数）
 * @returns {Function}
 */
Function.prototype._bind = function(thisArg, ...args) {
  const fn = this; // 保存原函数
  
  // 返回一个新函数
  return function bound(...innerArgs) {
    // 关键：如果通过 new 调用 bound，this 指向新对象，忽略绑定的 thisArg
    if (this instanceof bound) {
      return new fn(...args, ...innerArgs);
    }
    // 普通调用：使用绑定的 thisArg，合并预置参数和新参数
    return fn.apply(thisArg, [...args, ...innerArgs]);
  };
};

// 测试
function multiply(a, b) {
  return a * b;
}
const double = multiply._bind(null, 2); // 偏函数
console.log(double(5)); // 10
console.log(double(8)); // 16

function Person(name) {
  this.name = name;
}
const BoundPerson = Person._bind({ name: 'ignored' });
const p = new BoundPerson('Alice'); // new 调用，绑定失效
console.log(p.name); // 'Alice'
```

### 核心思路

`bind` 返回一个**新函数**（不立即执行），特点：
1. **固定 `this`**：普通调用时 `this` 为绑定值
2. **偏函数**：可以预置部分参数
3. **`new` 调用优先**：用 `new` 调用绑定函数时，`this` 指向新实例，忽略绑定的 `thisArg`

### 复杂度

- 时间 O(1)（创建），O(1)（调用），空间 O(1)

### 考察点

- 闭包（`fn` 和 `args` 的保存）
- `new` 调用时的特殊处理（`instanceof` 检测）
- 偏函数的概念
- `call/apply/bind` 三者区别

---

## FED13 new

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/71c2aff7cb6641099aa17d56157a91b9?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `new` 操作符的功能。

### 标准实现

```js
/**
 * 手写 new 操作符
 * @param {Function} constructor - 构造函数
 * @param {...*} args - 构造函数参数
 * @returns {Object}
 */
function _new(constructor, ...args) {
  // 1. 创建一个空对象，将其原型指向构造函数的 prototype
  const obj = Object.create(constructor.prototype);
  
  // 2. 执行构造函数，将 this 绑定到新对象上
  const result = constructor.apply(obj, args);
  
  // 3. 如果构造函数返回一个对象，则返回该对象；否则返回新创建的 obj
  return (result !== null && typeof result === 'object') ? result : obj;
}

// 测试
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`;
};

const p = _new(Person, 'Alice', 25);
console.log(p.name);    // 'Alice'
console.log(p.greet()); // "Hi, I'm Alice"
console.log(p instanceof Person); // true

// 构造函数返回对象的情况
function Weird() {
  return { x: 1 };
}
const w = _new(Weird);
console.log(w.x); // 1（使用构造函数返回的对象）
```

### 核心思路

`new` 做了四件事：
1. 创建新对象，其 `__proto__` 指向构造函数的 `prototype`
2. 将构造函数内 `this` 绑定到新对象并执行
3. 如果构造函数显式返回一个**对象**，则用该对象；否则返回新对象
4. （步骤 1 已包含）建立原型链

### 复杂度

- 时间 O(1)，空间 O(1)

### 考察点

- `new` 操作符的 4 个步骤
- 构造函数返回值的特殊处理（返回对象 vs 返回基本类型）
- `Object.create` vs `__proto__` 直接赋值

---

## FED14 Object.freeze

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/ba17ac11584a4aaeaef639655b896d86?tpId=274

### 题目描述

请补全 JavaScript 代码，实现 `Object.freeze` 的功能（深冻结对象）。

### 标准实现

```js
/**
 * 手写 Object.freeze（浅冻结，符合原生行为）
 * 原生 Object.freeze 本身只做浅冻结
 */
function _freeze(obj) {
  // 不处理非对象
  if (obj === null || typeof obj !== 'object') return obj;
  
  // 1. 获取所有自有属性
  Object.getOwnPropertyNames(obj).forEach(name => {
    const desc = Object.getOwnPropertyDescriptor(obj, name);
    // 2. 将所有属性设为不可写、不可配置
    if (desc.configurable) {
      Object.defineProperty(obj, name, {
        writable: false,
        configurable: false
      });
    }
  });
  
  // 3. 阻止新属性的添加（preventExtensions）
  Object.preventExtensions(obj);
  
  return obj;
}

/**
 * 深冻结（递归冻结嵌套对象）
 * 注意：原生 Object.freeze 不是深冻结
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // 先冻结子属性
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  });
  
  return Object.freeze(obj);
}

// 测试
const obj = { a: 1, b: { c: 2 } };
deepFreeze(obj);
obj.a = 99;       // 静默失败（严格模式报错）
obj.b.c = 99;     // 深冻结后同样失败
console.log(obj.a); // 1
console.log(obj.b.c); // 2
```

### 核心思路

- `Object.freeze` = `Object.preventExtensions` + 所有属性设 `writable: false` + `configurable: false`
- 原生 `freeze` 是**浅冻结**，嵌套对象不受影响
- 深冻结需要递归处理所有嵌套对象属性

### 复杂度

- 浅冻结：时间 O(n)，n 为属性数量
- 深冻结：时间 O(n)，n 为所有节点数

### 考察点

- 属性描述符（`writable`、`configurable`、`enumerable`）
- `Object.defineProperty` 的使用
- `preventExtensions` vs `seal` vs `freeze` 的区别
- 浅冻结 vs 深冻结

---

## FED15 浅拷贝

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/434d236e52994a9791a055f1f7adf985?tpId=274

### 题目描述

请补全 JavaScript 代码，实现对象的浅拷贝并返回。

### 标准实现

```js
/**
 * 浅拷贝：只复制第一层属性，嵌套对象仍共享引用
 */

// 方法一：Object.assign（最常用）
function shallowCopy(obj) {
  return Object.assign({}, obj);
}

// 方法二：展开运算符
function shallowCopy2(obj) {
  return { ...obj };
}

// 方法三：手动实现（兼容 Symbol 键）
function shallowCopy3(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // 根据类型创建对应容器
  const copy = Array.isArray(obj) ? [] : {};
  
  // 复制字符串键的自有可枚举属性
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = obj[key];
    }
  }
  
  // 复制 Symbol 键
  Object.getOwnPropertySymbols(obj).forEach(sym => {
    copy[sym] = obj[sym];
  });
  
  return copy;
}

// 测试
const obj = { a: 1, b: { c: 2 } };
const copy = shallowCopy(obj);
copy.a = 99;
copy.b.c = 99; // 浅拷贝：b 仍是同一引用
console.log(obj.a);   // 1（基本类型不受影响）
console.log(obj.b.c); // 99（引用类型受影响）
```

### 核心思路

浅拷贝只复制对象的**第一层**属性值。基本类型值被复制，引用类型只复制引用（指向同一内存）。

### 复杂度

- 时间 O(n)，空间 O(n)，n 为属性数量

### 考察点

- 基本类型 vs 引用类型的内存机制
- 浅拷贝 vs 深拷贝的应用场景
- `Object.assign` 的特性（不拷贝原型链属性）
- `hasOwnProperty` 的作用

---

## FED16 简易深拷贝

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/3d436d07f5cb4b628a4dd7c12476cabe?tpId=274

### 题目描述

请补全 JavaScript 代码，实现简易深拷贝（不需要处理循环引用、特殊类型等边界情况）。

### 标准实现

```js
/**
 * 简易深拷贝：递归复制所有层级
 * 只处理普通对象和数组（不处理 Date、RegExp、循环引用等）
 */
function simpleDeepClone(obj) {
  // 基本类型直接返回
  if (obj === null || typeof obj !== 'object') return obj;
  
  // 数组
  if (Array.isArray(obj)) {
    return obj.map(item => simpleDeepClone(item));
  }
  
  // 普通对象
  const copy = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = simpleDeepClone(obj[key]); // 递归
    }
  }
  return copy;
}

// 方法二：JSON 序列化（最简单但有局限性）
function jsonDeepClone(obj) {
  // 局限：不支持 undefined、Function、Symbol、Date、RegExp、循环引用
  return JSON.parse(JSON.stringify(obj));
}

// 测试
const obj = { a: 1, b: { c: [1, 2, 3] } };
const clone = simpleDeepClone(obj);
clone.b.c.push(4);
console.log(obj.b.c); // [1, 2, 3]（未受影响）
```

### 核心思路

递归思路：
1. 基本类型直接返回（递归出口）
2. 数组/对象：创建新容器，递归拷贝每个子属性

### 复杂度

- 时间 O(n)，空间 O(n + d)，n 为节点数，d 为递归深度

### 考察点

- 递归的运用
- 类型判断顺序（先判断 null，再判断 Array，再判断 object）
- JSON 方案的缺陷（`undefined`、`Function`、`Symbol`、`Date` 等丢失）

---

## FED17 深拷贝

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/70ca77b52d424ced8ebb348cd77c1dc5?tpId=274

### 题目描述

请补全 JavaScript 代码，实现完整深拷贝（需处理循环引用、Date、RegExp 等）。

### 标准实现

```js
/**
 * 完整深拷贝
 * 支持：普通对象、数组、Date、RegExp、Map、Set、Symbol 键、循环引用
 */
function deepClone(obj, map = new WeakMap()) {
  // 基本类型和 null 直接返回
  if (obj === null || typeof obj !== 'object') return obj;
  
  // 处理循环引用：如果已经拷贝过，直接返回缓存
  if (map.has(obj)) return map.get(obj);
  
  // 处理特殊类型
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (obj instanceof Map) {
    const copy = new Map();
    map.set(obj, copy);
    obj.forEach((val, key) => copy.set(deepClone(key, map), deepClone(val, map)));
    return copy;
  }
  if (obj instanceof Set) {
    const copy = new Set();
    map.set(obj, copy);
    obj.forEach(val => copy.add(deepClone(val, map)));
    return copy;
  }
  
  // 普通对象/数组：创建同类型容器
  const copy = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  
  // 先缓存，防止循环引用
  map.set(obj, copy);
  
  // 复制字符串键（包括不可枚举属性）
  [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)].forEach(key => {
    copy[key] = deepClone(obj[key], map);
  });
  
  return copy;
}

// 测试循环引用
const obj = { a: 1 };
obj.self = obj; // 循环引用
const clone = deepClone(obj);
console.log(clone.a);         // 1
console.log(clone.self === clone); // true（保持循环结构）

// 测试 Date
const d = new Date();
const cloneD = deepClone(d);
console.log(cloneD instanceof Date); // true
console.log(cloneD === d);           // false（新对象）
```

### 核心思路

在简易深拷贝基础上增加：
1. **`WeakMap` 缓存**：记录已拷贝的对象，遇到循环引用直接返回缓存
2. **特殊类型处理**：`Date`、`RegExp`、`Map`、`Set` 各自有对应的构造方式
3. **`Symbol` 键**：用 `getOwnPropertySymbols` 获取

### 复杂度

- 时间 O(n)，空间 O(n)

### 考察点

- `WeakMap` 的使用场景（弱引用，防内存泄漏）
- 循环引用的处理
- `Date`、`RegExp` 等内置类型的克隆
- `Object.getPrototypeOf` 保持原型链

---

## FED18 寄生组合式继承

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/dd8eb918b5d343cc8be77a69630f59bf?tpId=274

### 题目描述

请补全 JavaScript 代码，使用**寄生组合式继承**实现 `Dog` 继承 `Animal`。

### 标准实现

```js
/**
 * 寄生组合式继承（ES5 最佳继承方案）
 * 解决组合继承调用两次父构造函数的问题
 */

// 父类
function Animal(name) {
  this.name = name;
  this.colors = ['black', 'white'];
}
Animal.prototype.say = function() {
  return `I'm ${this.name}`;
};

// 子类
function Dog(name, breed) {
  // 1. 借用构造函数：继承实例属性（只调用一次父构造函数）
  Animal.call(this, name);
  this.breed = breed;
}

// 2. 寄生式：创建父类原型的副本，设为子类原型（不调用父构造函数！）
function inheritPrototype(Child, Parent) {
  // Object.create 创建以 Parent.prototype 为原型的对象
  const prototype = Object.create(Parent.prototype);
  // 修正 constructor 指向
  prototype.constructor = Child;
  // 赋给子类原型
  Child.prototype = prototype;
}

inheritPrototype(Dog, Animal);

// 在子类原型上添加方法（必须在 inheritPrototype 之后）
Dog.prototype.bark = function() {
  return 'Woof!';
};

// 测试
const d = new Dog('Rex', 'Labrador');
console.log(d.name);          // 'Rex'
console.log(d.breed);         // 'Labrador'
console.log(d.say());         // "I'm Rex"
console.log(d.bark());        // 'Woof!'
console.log(d instanceof Dog);    // true
console.log(d instanceof Animal); // true
console.log(d.constructor === Dog); // true（修正了 constructor）

// 实例属性相互独立
const d2 = new Dog('Buddy', 'Poodle');
d.colors.push('brown');
console.log(d.colors);  // ['black', 'white', 'brown']
console.log(d2.colors); // ['black', 'white']（互不影响）
```

### 核心思路

| 继承方案 | 缺点 |
|---|---|
| 原型链继承 | 引用类型属性共享；无法传参 |
| 借用构造函数 | 无法继承原型方法 |
| 组合继承 | 父构造函数调用了两次 |
| **寄生组合式** | ✅ 最优，父构造函数只调用一次 |

关键：用 `Object.create(Parent.prototype)` 创建原型副本，**不需要 `new Parent()`**，避免了第二次调用父构造函数。

### 复杂度

- 时间 O(1)，空间 O(1)

### 考察点

- 5 种继承方式及优劣
- `Object.create` 的妙用
- `constructor` 属性的修正
- ES6 `class extends` 底层即是寄生组合式继承

---

## FED19 发布订阅模式

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/569e1fd641be4fd797f12a28b763d709?tpId=274

### 题目描述

请补全 JavaScript 代码，实现发布订阅模式（EventEmitter）。

### 标准实现

```js
/**
 * 发布订阅模式（EventEmitter）
 * 订阅者和发布者通过事件中心解耦，互不认识
 */
class EventEmitter {
  constructor() {
    // 事件中心：{ 事件名: [回调函数...] }
    this._events = {};
  }
  
  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {Function} listener - 回调函数
   */
  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this; // 支持链式调用
  }
  
  /**
   * 发布事件
   * @param {string} event - 事件名
   * @param {...*} args - 传递给订阅者的参数
   */
  emit(event, ...args) {
    const listeners = this._events[event];
    if (!listeners || listeners.length === 0) return false;
    // 复制一份，防止执行过程中 listeners 被修改
    listeners.slice().forEach(listener => listener(...args));
    return true;
  }
  
  /**
   * 取消订阅
   * @param {string} event
   * @param {Function} listener
   */
  off(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(fn => fn !== listener);
    return this;
  }
  
  /**
   * 只订阅一次
   */
  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper); // 执行后立即移除
    };
    // 保存原始引用，用于 off 移除
    wrapper._original = listener;
    this.on(event, wrapper);
    return this;
  }
  
  /**
   * 移除某事件的所有订阅
   */
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
}

// 测试
const emitter = new EventEmitter();

const handler = (data) => console.log('received:', data);
emitter.on('message', handler);
emitter.once('connect', () => console.log('connected once'));

emitter.emit('message', 'hello'); // 'received: hello'
emitter.emit('connect');          // 'connected once'
emitter.emit('connect');          // 无输出（once 已移除）

emitter.off('message', handler);
emitter.emit('message', 'world'); // 无输出
```

### 核心思路

发布订阅模式有三个核心角色：
- **事件中心（EventBus）**：存储事件与订阅者的映射
- **订阅者（Subscriber）**：通过 `on` 注册感兴趣的事件
- **发布者（Publisher）**：通过 `emit` 触发事件，无需知道谁在订阅

### 复杂度

- `on`：O(1)；`emit`：O(n)，n 为订阅者数量；`off`：O(n)

### 考察点

- 发布订阅 vs 观察者模式的区别（有无中间事件中心）
- `once` 的实现（包装函数 + 自动移除）
- 链式调用（return this）
- Node.js EventEmitter 的设计

---

## FED20 观察者模式

**难度**：中等
**牛客链接**：https://www.nowcoder.com/practice/557ec9ca35d542feaa06261385711323?tpId=274

### 题目描述

请补全 JavaScript 代码，实现观察者模式（Observer Pattern）。

### 标准实现

```js
/**
 * 观察者模式
 * 被观察者（Subject）直接维护观察者（Observer）列表，状态变化时通知所有观察者
 * 没有中间事件中心，Subject 和 Observer 直接耦合
 */

// 观察者（Observer）
class Observer {
  /**
   * @param {string} name - 观察者名称
   * @param {Function} [callback] - 收到通知时的回调
   */
  constructor(name, callback) {
    this.name = name;
    this.callback = callback;
  }
  
  /**
   * 被通知时调用（由 Subject 调用）
   * @param {*} data - 被观察者传来的数据
   */
  update(data) {
    if (this.callback) {
      this.callback(data);
    } else {
      console.log(`${this.name} received:`, data);
    }
  }
}

// 被观察者（Subject / Observable）
class Subject {
  constructor() {
    this.observers = []; // 观察者列表
    this._state = null;
  }
  
  /**
   * 添加观察者
   */
  addObserver(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
    return this;
  }
  
  /**
   * 移除观察者
   */
  removeObserver(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
    return this;
  }
  
  /**
   * 通知所有观察者
   */
  notify(data) {
    this.observers.forEach(observer => observer.update(data));
  }
  
  /**
   * 设置状态（自动通知所有观察者）
   */
  setState(state) {
    this._state = state;
    this.notify(state); // 状态变化时自动通知
  }
  
  getState() {
    return this._state;
  }
}

// 测试
const subject = new Subject();
const obs1 = new Observer('Observer1');
const obs2 = new Observer('Observer2', data => console.log(`obs2 got: ${data}`));

subject.addObserver(obs1).addObserver(obs2);
subject.setState('loading');
// 'Observer1 received: loading'
// 'obs2 got: loading'

subject.removeObserver(obs1);
subject.setState('done');
// 只有 obs2 收到：'obs2 got: done'
```

### 核心思路

观察者模式两个核心角色：
- **Subject（被观察者）**：维护观察者列表，状态变化时调用所有观察者的 `update`
- **Observer（观察者）**：实现 `update` 方法，等待被通知

### 复杂度

- `addObserver`：O(n)（去重检查），`notify`：O(n)

### 考察点

- 观察者 vs 发布订阅的核心区别：
  - 观察者：Subject 直接调用 Observer，**两者耦合**
  - 发布订阅：通过事件中心解耦，**发布者和订阅者互不认识**
- Vue 2 响应式原理（`Object.defineProperty` + 观察者模式）
- 设计模式的现实应用（Redux store、RxJS Observable）

---

## 总结对比

| 题号 | 题目 | 核心知识点 | 难度感知 |
|------|------|-----------|---------|
| FED1 | 事件委托 | 事件冒泡、event.target | ⭐⭐ |
| FED2 | 数组去重 | Set、filter+indexOf | ⭐ |
| FED3 | 合法URL | 正则、URL API | ⭐⭐ |
| FED4 | 快速排序 | 分治、递归 | ⭐⭐⭐ |
| FED5 | 全排列 | 回溯算法 | ⭐⭐⭐ |
| FED6 | instanceof | 原型链 | ⭐⭐ |
| FED7 | Array.map | 原型扩展、call | ⭐⭐ |
| FED8 | Array.filter | 原型扩展 | ⭐⭐ |
| FED9 | Array.reduce | arguments、累加器 | ⭐⭐ |
| FED10 | Object.create | 圣杯模式、原型 | ⭐⭐ |
| FED11 | Function.call | this 绑定、Symbol | ⭐⭐⭐ |
| FED12 | Function.bind | 闭包、偏函数、new | ⭐⭐⭐ |
| FED13 | new | 4 步 new 流程 | ⭐⭐⭐ |
| FED14 | Object.freeze | 属性描述符 | ⭐⭐ |
| FED15 | 浅拷贝 | 引用类型、assign | ⭐ |
| FED16 | 简易深拷贝 | 递归、类型判断 | ⭐⭐ |
| FED17 | 深拷贝 | WeakMap、循环引用 | ⭐⭐⭐⭐ |
| FED18 | 寄生组合继承 | 5种继承方案 | ⭐⭐⭐⭐ |
| FED19 | 发布订阅 | EventEmitter、once | ⭐⭐⭐ |
| FED20 | 观察者模式 | Subject/Observer | ⭐⭐⭐ |
