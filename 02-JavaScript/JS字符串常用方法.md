# JS 字符串常用方法

JavaScript 中字符串是不可变的（Immutable），所有方法都返回新字符串，不修改原始字符串。

## 查找与判断

`includes(searchString)` 判断是否包含子字符串，返回布尔值，最常用的模糊查询。`indexOf(searchValue)` 返回第一次出现的索引，未找到返回 -1。`startsWith()`/`endsWith()` 判断是否以指定字符串开头或结尾。

## 截取与提取

`slice(start, end)` 推荐使用，支持负数索引（倒数），包含 start 不包含 end。`substring(start, end)` 类似 slice 但不接受负数索引。

```javascript
"JavaScript".slice(0, 4);  // "Java"
"JavaScript".slice(-6);    // "Script"
```

## 修改与转换

`replace(pattern, replacement)` 替换匹配的字符串，字符串模式默认只替换第一个，正则 `/g` 全局替换。`replaceAll(pattern, replacement)` ES2021，替换所有匹配。`toUpperCase()`/`toLowerCase()` 大小写转换。`trim()`/`trimStart()`/`trimEnd()` 去除空白字符。

## 分割与合并

`split(separator)` 按分隔符拆分成数组。`concat()` 连接字符串（现代开发更推荐模板字符串）。

## 获取特定位置字符

`charAt(index)` 返回指定索引的字符。`at(index)` ES2022，支持负数索引（`"Cat".at(-1)` 返回 `"t"`）。

## 日常开发核心组合

模板字符串用于拼接，`includes` 用于查找，`slice` 用于截取，`split` 用于转数组，`replace`/`replaceAll` 用于处理文本。
