# CSS 选择器与优先级

> 面试常考 + 日常开发必备

## 选择器分类

CSS 选择器分为四大类：选择器（标签、类、ID、属性等）、选择符（空格、`>`、`+`、`~`）、伪类（`:hover`、`:nth-child` 等）、伪元素（`::before`、`::after` 等）。

### 常用选择器速查

```css
/* 基础选择器 */
*              /* 通配符 */
div            /* 标签选择器 */
.class         /* 类选择器 */
#id            /* ID 选择器 */

/* 属性选择器 */
[attr]         /* 有该属性 */
[attr="val"]   /* 属性值完全匹配 */
[attr^="val"]  /* 属性值以 val 开头 */
[attr$="val"]  /* 属性值以 val 结尾 */
[attr*="val"]  /* 属性值包含 val */
[attr~="val"]  /* 属性值是空格分隔的列表，其中包含 val */

/* 选择符 */
A B            /* 后代（所有层级） */
A > B          /* 子代（仅直接子元素） */
A + B          /* 相邻兄弟（紧跟在 A 后面的 B） */
A ~ B          /* 通用兄弟（A 后面所有的 B） */

/* 常用伪类 */
:hover         /* 鼠标悬停 */
:focus         /* 获得焦点 */
:first-child   /* 第一个子元素 */
:last-child    /* 最后一个子元素 */
:nth-child(n)  /* 第 n 个子元素 */
:not(selector) /* 排除匹配的元素 */

/* 伪元素 */
::before       /* 元素内容前插入 */
::after        /* 元素内容后插入 */
::placeholder  /* 输入框占位文本 */
```

---

## 优先级规则（面试重点）

CSS 优先级分为 6 个等级，**不同等级之间不可跨越**：

| 等级 | 类型 | 示例 |
|------|------|------|
| 0 级 | 通配符 `*`、选择符、`:not()` / `:is()` / `:where()` | `*`、`>`、`:not(.foo)` |
| 1 级 | 标签选择器、伪元素 | `div`、`::before` |
| 2 级 | 类选择器、属性选择器、伪类 | `.foo`、`[type]`、`:hover` |
| 3 级 | ID 选择器 | `#foo` |
| 4 级 | 行内样式 `style` | `style="color: red"` |
| 5 级 | `!important` | `color: red !important` |

注意：`:not()` 本身不参与优先级计算，但括号内的选择器参与。`:where()` 的优先级始终为 0，`:is()` 取括号内优先级最高的选择器。

### 优先级计算方式

同一等级内，按 (ID数, 类数, 标签数) 三元组比较：

```css
/* (0, 1, 1) */
div.foo { color: red; }

/* (0, 2, 0) — 类数更多，优先级更高 */
.foo.bar { color: blue; }

/* (1, 0, 0) — ID 直接碾压 */
#app { color: green; }
```

### 提升优先级的技巧

开发中需要提升优先级时，**不要**增加嵌套层级（增加耦合），推荐重复选择器自身：

```css
/* 不推荐：依赖父元素，耦合度高 */
.parent .foo { color: red; }

/* 推荐：重复自身，不增加耦合 */
.foo.foo { color: red; }

/* 也可以借助属性选择器 */
.foo[class] { color: red; }
#bar[id] { color: red; }
```

### `!important` 使用原则

`!important` 是最高优先级，唯一推荐的使用场景是覆盖行内样式（比如第三方库通过 JS 设置的 `style`）：

```css
/* 覆盖 JS 设置的行内样式 */
.foo[style*="display: none"] {
  display: block !important;
}
```

其他场景下应避免使用，否则会导致样式难以维护和覆盖。

---

## 实用技巧

### 属性选择器的妙用

属性选择器在实际开发中非常实用，比如根据链接类型自动添加图标、根据文件类型显示不同样式：

```css
/* 外部链接自动加图标 */
a[href^="http"]::after { content: " ↗"; }

/* 邮件链接 */
a[href^="mailto:"]::before { content: "📧 "; }

/* 根据文件后缀显示不同样式 */
a[href$=".pdf"] { color: red; }
a[href$=".zip"] { color: green; }

/* 禁用状态的按钮 */
button[disabled] { opacity: 0.5; cursor: not-allowed; }
```

### :nth-child 常用模式

```css
:nth-child(odd)    /* 奇数行 */
:nth-child(even)   /* 偶数行 */
:nth-child(3n)     /* 每3个一组的最后一个 */
:nth-child(n+4)    /* 第4个及之后 */
:nth-child(-n+3)   /* 前3个 */
```

### 伪类与伪元素的区别（面试常问）

伪类用单冒号 `:`，表示元素的某种状态或位置（如 `:hover`、`:first-child`），不会创建新元素。伪元素用双冒号 `::`，表示创建一个虚拟元素（如 `::before`、`::after`），可以通过 `content` 属性插入内容。历史原因 `:before` 和 `::before` 都能用，但规范推荐双冒号写法。
