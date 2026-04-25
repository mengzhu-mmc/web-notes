# 正则表达式 RegExp

> JavaScript 正则表达式核心知识点

---

## 创建方式

```js
// 字面量（推荐，编译一次）
const re1 = /abc/gi;

// 构造函数（运行时动态生成，需双转义）
const re2 = new RegExp('abc', 'gi');
```

## 修饰符

| 修饰符 | 含义 |
|---|---|
| `g` | 全局匹配 |
| `i` | 忽略大小写 |
| `m` | 多行模式（^$ 匹配行首尾） |
| `s` | dotAll（`.` 匹配换行符） |
| `u` | Unicode 模式 |
| `y` | sticky（粘连匹配） |

## 常用方法

### RegExp 实例方法
```js
const re = /abc/g;
re.test('abc123');       // true — 只判断是否匹配
re.exec('abc123abc');    // ['abc', index: 0, input: ...] — 返回匹配详情
```

### String 方法
```js
'abc123'.match(/abc/);       // ['abc'] — 返回匹配数组
'abc123'.match(/abc/g);      // ['abc'] — g 模式返回所有匹配
'abc123'.search(/123/);      // 3 — 返回首次匹配索引
'abc123'.replace(/abc/, 'x'); // 'x123'
'abc123'.split(/\d+/);       // ['abc', ''] — 按正则分割
```

## 核心语法

### 字符类
| 语法 | 含义 |
|---|---|
| `[abc]` | 匹配 a/b/c 之一 |
| `[^abc]` | 不匹配 a/b/c |
| `[a-z]` | 范围 |
| `\d` | 数字 `[0-9]` |
| `\w` | 单词字符 `[a-zA-Z0-9_]` |
| `\s` | 空白字符 |
| `.` | 任意字符（除换行） |

### 量词
| 语法 | 含义 |
|---|---|
| `*` | 0 次或多次 |
| `+` | 1 次或多次 |
| `?` | 0 次或 1 次 |
| `{n}` | 恰好 n 次 |
| `{n,}` | 至少 n 次 |
| `{n,m}` | n 到 m 次 |

### 分组与引用
```js
// 捕获分组
/(ab)+/.test('abab');  // true

// 命名捕获分组（ES2018）
/(?<year>\d{4})-(?<month>\d{2})/.exec('2024-01');
// { groups: { year: '2024', month: '01' } }

// 非捕获分组
/(?:ab)+/

// 零宽断言
/(?=\d)/    // 正向前瞻
/(?!\d)/    // 负向前瞻
/(?<=\$)/   // 正向后顾（ES2018）
/(?<!\$)/   // 负向后顾（ES2018）
```

## 常见陷阱

### 贪婪 vs 惰性
```js
'<div>hello</div><div>world</div>'.match(/<div>.*<\/div>/);
// 贪婪：匹配整个字符串

'<div>hello</div><div>world</div>'.match(/<div>.*?<\/div>/g);
// 惰性：分别匹配两个 div
```

### lastIndex 陷阱（g 模式）
```js
const re = /a/g;
re.test('abc');  // true, lastIndex = 1
re.test('abc');  // false, lastIndex = 3（超出范围）
re.lastIndex = 0; // 需手动重置
```

## 实战

### 常用正则
```js
// 邮箱
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// 手机号（中国大陆）
/^1[3-9]\d{9}$/

// 去除首尾空白
str.replace(/^\s+|\s+$/g, '')

// 驼峰转短横线
'camelCase'.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

// HTML 标签匹配
/<\/?[a-z][\s\S]*?>/gi
```
