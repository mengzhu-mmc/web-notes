# JS 字符串常用方法

JavaScript 中字符串是不可变的（Immutable），所有方法都返回新字符串，不修改原始字符串。

---

## 一、查找与判断

```js
const str = 'Hello, JavaScript!';

// includes — 最常用的模糊查询，返回布尔值
str.includes('Java')        // true
str.includes('java')        // false（大小写敏感）
str.includes('Java', 10)    // false（从索引 10 开始查）

// indexOf — 返回第一次出现的索引，未找到返回 -1
str.indexOf('a')             // 7
str.indexOf('z')             // -1
str.lastIndexOf('a')         // 13（从末尾查）

// startsWith / endsWith
str.startsWith('Hello')      // true
str.endsWith('!')            // true
str.startsWith('Java', 7)    // true（从索引 7 开始匹配）

// 正则测试
/^\d+$/.test('123')          // true（纯数字）
```

---

## 二、截取与提取

```js
const str = 'JavaScript';

// slice — 推荐，支持负索引
str.slice(0, 4)    // 'Java'
str.slice(4)       // 'Script'
str.slice(-6)      // 'Script'（倒数 6 个字符）
str.slice(-6, -3)  // 'Scr'

// substring — 不支持负索引，负数会被当作 0
str.substring(0, 4)  // 'Java'
str.substring(4)     // 'Script'

// at — ES2022，支持负索引（字符串同样支持）
str.at(0)    // 'J'
str.at(-1)   // 't'（最后一个字符）
```

---

## 三、修改与转换

```js
// replace — 字符串模式只替换第一个
'a-b-c'.replace('-', '_')     // 'a_b-c'（只替第一个）
'a-b-c'.replace(/-/g, '_')    // 'a_b_c'（正则 g 全局替换）

// replaceAll — ES2021，替换所有匹配（等价于正则 /g）
'a-b-c'.replaceAll('-', '_')  // 'a_b_c'

// 大小写转换
'hello'.toUpperCase()   // 'HELLO'
'WORLD'.toLowerCase()   // 'world'

// 去除空白
'  hello  '.trim()       // 'hello'（两端）
'  hello  '.trimStart()  // 'hello  '（仅开头）
'  hello  '.trimEnd()    // '  hello'（仅末尾）

// 填充（ES2017）
'5'.padStart(3, '0')    // '005'（补全到 3 位，前面填 '0'）
'5'.padEnd(3, '0')      // '500'（末尾填充）

// 重复
'ha'.repeat(3)          // 'hahaha'
```

---

## 四、分割与合并

```js
// split — 字符串转数组
'a,b,c'.split(',')         // ['a', 'b', 'c']
'hello'.split('')          // ['h', 'e', 'l', 'l', 'o']（逐字符）
'a,b,c'.split(',', 2)      // ['a', 'b']（限制数量）
'hello'.split()            // ['hello']（无分隔符 → 整体）

// 模板字符串拼接（推荐，替代 concat）
const name = '张三';
const age = 25;
`姓名：${name}，年龄：${age}` // '姓名：张三，年龄：25'

// Array.join — 数组转字符串
['a', 'b', 'c'].join('-')   // 'a-b-c'
```

---

## 五、正则相关方法

```js
const str = 'foo123bar456';

// match — 返回匹配结果
str.match(/\d+/)       // ['123', index: 3, ...]（第一个匹配）
str.match(/\d+/g)      // ['123', '456']（全局模式，返回所有）

// matchAll — ES2020，返回迭代器（比 match /g 更强大）
const matches = [...str.matchAll(/(\d+)/g)];
// [[全匹配, 捕获组1, index], ...]
matches[0][0]  // '123'
matches[0][1]  // '123'（第 1 个捕获组）

// search — 返回第一个匹配的索引，未找到返回 -1
str.search(/\d+/)  // 3

// 提取邮箱中的域名（实际应用示例）
const email = 'user@example.com';
const domain = email.match(/@(.+)/)?.[1]; // 'example.com'
```

---

## 六、常用组合技（日常开发）

```js
// 1. 手机号脱敏
'13812345678'.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
// '138****5678'

// 2. 驼峰转连字符（camelCase → kebab-case）
'camelCaseString'.replace(/([A-Z])/g, '-$1').toLowerCase()
// 'camel-case-string'

// 3. 去除 HTML 标签
'<p>hello</p>'.replace(/<[^>]+>/g, '')
// 'hello'

// 4. 截断超长文本
function truncate(str, maxLen = 20) {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

// 5. 模板变量替换
function tpl(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
}
tpl('Hello, {{name}}!', { name: '张三' }) // 'Hello, 张三!'
```

---

## 七、方法速查表

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `includes(str)` | boolean | 是否包含子串 |
| `startsWith(str)` | boolean | 是否以指定字符串开头 |
| `endsWith(str)` | boolean | 是否以指定字符串结尾 |
| `indexOf(str)` | number | 第一次出现的索引，-1 表示未找到 |
| `slice(s, e)` | string | 截取，支持负索引 |
| `at(i)` | string | 获取指定位置字符，支持负索引（ES2022） |
| `split(sep)` | array | 按分隔符拆分 |
| `replace(p, r)` | string | 替换（字符串模式仅替换第一个） |
| `replaceAll(p, r)` | string | 替换所有（ES2021） |
| `trim()` | string | 去除两端空白 |
| `padStart(n, c)` | string | 前填充到指定长度 |
| `repeat(n)` | string | 重复 n 次 |
| `match(reg)` | array\|null | 正则匹配 |
| `matchAll(reg)` | iterator | 全部匹配（ES2020） |
