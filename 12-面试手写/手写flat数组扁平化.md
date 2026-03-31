# 手写数组扁平化（flat）

> 常见面试变体：指定深度、全量展开、去重等。

---

## 方法一：递归（最直观）

```js
function flat(arr, depth = 1) {
  if (depth === 0) return arr.slice();
  return arr.reduce((result, item) => {
    if (Array.isArray(item)) {
      result.push(...flat(item, depth - 1));
    } else {
      result.push(item);
    }
    return result;
  }, []);
}
```

---

## 方法二：全量展开（depth = Infinity）

```js
function flatAll(arr) {
  return arr.reduce((result, item) => {
    return result.concat(Array.isArray(item) ? flatAll(item) : item);
  }, []);
}

// 更简洁的写法
const flatAll2 = arr => [].concat(...arr.map(item =>
  Array.isArray(item) ? flatAll2(item) : item
));
```

---

## 方法三：栈（非递归，全量展开）

```js
function flatIterative(arr) {
  const stack = [...arr];
  const result = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item);
    } else {
      result.unshift(item); // 保持顺序
    }
  }
  return result;
}
```

---

## 方法四：toString（仅适用于数字数组）

```js
// 只适合全是数字的情况，面试时说明限制
const flatToString = arr => arr.toString().split(',').map(Number);
```

---

## 原生 flat 对比

```js
// ES2019 原生
[1, [2, [3, [4]]]].flat()          // [1, 2, [3, [4]]]  深度 1
[1, [2, [3, [4]]]].flat(2)         // [1, 2, 3, [4]]    深度 2
[1, [2, [3, [4]]]].flat(Infinity)  // [1, 2, 3, 4]      全量
```

---

## 面试追问

| 问题 | 答案要点 |
|------|---------|
| `flat` 会跳过空位吗？ | 是的，原生 `flat` 会跳过稀疏数组的空位 |
| 如何实现带去重的扁平化？ | `[...new Set(flat(arr, Infinity))]` |
| 递归方案的缺点？ | 深度过大可能栈溢出，可用迭代（栈）替代 |
