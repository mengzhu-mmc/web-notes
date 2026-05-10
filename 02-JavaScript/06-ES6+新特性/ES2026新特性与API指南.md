# JavaScript 2026 新特性 (ES2026) 与浏览器动态

> Updated: 2026-05-10 based on W3Schools and TC39 proposals.

ES2026 带来了多项实用的 API，核心重点在显式资源管理、二进制数据处理以及异步流控制。

## 一、显式资源管理：`using` / `await using`

这可能是 JS 语言层面的重大变革，它引入了自动资源清理的机制，类似于 Python 的 `with` 语句或 C# 的 `using` 语句。

**痛点场景**：
操作文件句柄、数据库连接或持有内存的高开销对象时，我们常常需要在 `try...finally` 块中手动写清理代码。如果不小心忘记，会导致内存泄漏或文件锁死。

**ES2026 杀招**：
利用 `using`（同步）或 `await using`（异步），变量离开作用域时会自动调用对象的 `[Symbol.dispose]()` 或 `[Symbol.asyncDispose]()` 方法。

```tsx
// 1. 同步清理
class DatabaseConnection {
  constructor(name) {
    this.name = name;
  }
  [Symbol.dispose]() {
    console.log(`[Closed] Database Connection ${this.name}`);
  }
}

function queryData() {
  // 离开函数作用域时，自动调用 Symbol.dispose
  using db = new DatabaseConnection("Users");
  console.log(`Querying: ${db.name}`);
}

// 2. 异步清理
async function processLargeFile() {
  // 文件处理完毕后，自动异步关闭文件流
  await using fileHandle = await openFile("data.txt");
  const data = await fileHandle.read();
  console.log("File processed");
}
```

## 二、`Error.isError()`

**痛点场景**：
由于 JS 中可以 `throw` 任何类型（比如 `throw "some error string"` 或 `throw { msg: "error" }`），导致判断错误类型很繁琐。过去使用 `e instanceof Error`，但由于跨 Realm 问题（例如在 iframe 内部抛出的错误传到主窗口），`instanceof` 可能会失效（由于两边的全局对象不同）。

**ES2026 杀招**：
提供原生的静态方法，安全、跨 Realm 识别对象是否真正是 `Error` 的派生实例。

```tsx
Error.isError(new TypeError()); // true
Error.isError({ name: "Error" }); // false
Error.isError(new Error("msg")); // true

try {
  throw "Just a string";
} catch (e) {
  if (Error.isError(e)) {
    console.log(e.message);
  } else {
    console.log("Thrown value is not an Error object:", e);
  }
}
```

## 三、`Array.fromAsync()`

**痛点场景**：
当我们需要把一个异步生成器（Async Generator）或一组 Promise 解析的迭代对象转为普通的数组时，过去需要手动使用 `for await...of` 循环然后一点点 `push` 进去。

**ES2026 杀招**：
`Array.fromAsync` 是 `Array.from` 的异步版本。

```tsx
async function* fetchPages() {
  yield fetch("/api/page/1").then((r) => r.json());
  yield fetch("/api/page/2").then((r) => r.json());
}

async function collectAll() {
  // 直接一行代码收集所有的异步 yield 数据，最终拿到一个普通数组
  const pages = await Array.fromAsync(fetchPages());
  console.log(pages);
}
```

## 四、`Uint8Array` Base64 / Hex 原生支持

**痛点场景**：
二进制数组（`Uint8Array`）与 Base64 字符串或者十六进制字符串互相转换时，我们不得不依赖历史包袱极重的 `atob()` 和 `btoa()`，且它们对非 ASCII 字符处理极其痛苦。

**ES2026 杀招**：
直接挂载在原型链和构造函数上的编解码 API。

```tsx
// 1. Base64 互相转换
const bytes = Uint8Array.fromBase64("SGVsbG8gV29ybGQ=");
const base64Str = bytes.toBase64();

// 2. 十六进制互相转换
const hexBytes = Uint8Array.fromHex("48656c6c6f20576f726c64");
const hexStr = hexBytes.toHex();
```

## 五、Node.js 动态：Node 26 与 Temporal API

Node.js 26 已经默认启用了最新的时间处理标准 `Temporal` API。
JavaScript 内置的 `Date` 对象设计充满了缺陷（月份从 0 开始、不可变性缺失、时区处理困难等），而 `Temporal` 将彻底解决这些问题。目前，此 API 即将在各大现代环境全面铺开。
