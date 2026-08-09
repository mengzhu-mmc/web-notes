# Node 错误处理与异常兜底体系

> 错误处理不是「加个 try/catch」，而是一套分层体系：错误怎么分类、在哪一层转成响应、什么该告警、进程崩了怎么办。这套体系是「有没有做过生产项目」最直接的分水岭。

## 面试高频考点

1. **线上错误你是怎么分类的？不同类型的处理策略有什么不同？**
2. **`uncaughtException` 里能不能 `return` 让进程继续跑？为什么？**
3. **Koa 的顶层 try/catch 和 `app.on('error')` 分别负责什么？**
4. **`forEach` 里写 async 函数会有什么问题？错误去哪了？**
5. **重试为什么可能把下游打得更惨？熔断器的三个状态是怎么流转的？**

---

## 一、错误三分类

### 1.1 分类是处理策略的前提

线上错误绝不是一个整体。把「用户输入了非法邮箱」和「代码里读了 undefined 的属性」当成同一类处理，结果就是：要么该告警的被淹没，要么不该告警的把值班同学淹死。

| 维度 | ① 可预期业务错误 | ② 编程 Bug | ③ 系统性错误 |
| --- | --- | --- | --- |
| 典型例子 | 邮箱格式非法、余额不足、Token 过期、资源不存在 | 读 `undefined` 的属性、类型错误、逻辑分支漏了 | 下游超时、DB 连接池耗尽、OOM、磁盘满 |
| 是不是"预料之中" | ✅ 是，业务规则的一部分 | ❌ 不是，写代码时就错了 | ⚠️ 是，但不可控 |
| HTTP 状态码 | **4xx**（400/401/403/404/409/422） | **500** | **502 / 503 / 504** |
| 日志级别 | `info` / `warn` | **`error`**（带完整堆栈） | **`error`** |
| 是否告警 | ❌ **不告警**（量级正常时） | ✅ 告警，且要能定位到代码行 | ✅ 告警，通常伴随下游侧告警 |
| 是否可重试 | ❌ 无意义（再试还是非法） | ❌ 无意义（代码没变） | ✅ **可重试**（配合幂等 + 退避） |
| 响应体 | 面向用户的可读文案 + 业务错误码 | 通用文案，**绝不暴露堆栈** | 通用文案，可带 Retry-After |
| 修复动作 | 无需修（也许优化提示文案） | **改代码** | 扩容 / 熔断降级 / 找下游 |
| `isOperational` | `true` | `false` | `true` |

```
                     错误发生
                        │
         ┌──────────────┼──────────────────┐
         │              │                  │
   业务规则拒绝     代码写错了        依赖不可用
         │              │                  │
    ┌────▼────┐    ┌────▼────┐        ┌────▼────┐
    │  4xx    │    │  500    │        │ 502/503 │
    │ info    │    │ error   │        │ error   │
    │ 不告警  │    │ 告警    │        │ 告警    │
    │ 不重试  │    │ 不重试  │        │ 可重试  │
    │ 详细文案│    │ 通用文案│        │ 通用文案│
    └─────────┘    └─────────┘        └─────────┘
                        │                  │
                   进程状态可能已损坏   熔断/降级
                   → 严重时优雅退出    → 保护下游
```

> [!important] 面试要点
> 判断一个错误属于哪类，看的是 **`isOperational`（是否可运维）**：可运维的错误意味着「程序按预期识别并处理了它，进程状态依然可信」；不可运维的错误意味着「出现了未预料的状态，进程可能已经不可信」。这一个布尔值决定了要不要走优雅退出。

---

## 二、自定义错误类与错误码体系

### 2.1 AppError 基类

```javascript
// src/errors/AppError.js
class AppError extends Error {
  /**
   * @param {string} message     面向用户或日志的描述
   * @param {object} opts
   *   code          业务错误码（字符串或数字，前端按它做分支）
   *   httpStatus    HTTP 状态码
   *   isOperational 是否可运维错误（true = 已识别的预期错误，进程状态可信）
   *   cause         原始错误（Node 16.9+ 标准的错误链字段）
   *   context       结构化上下文（进日志，不进响应体）
   */
  constructor(message, opts = {}) {
    // Error.cause 是 Node 16.9+ / ES2022 标准，new Error(msg, { cause }) 原生支持
    super(message, opts.cause ? { cause: opts.cause } : undefined);

    this.name = this.constructor.name;
    this.code = opts.code ?? "INTERNAL_ERROR";
    this.httpStatus = opts.httpStatus ?? 500;
    this.isOperational = opts.isOperational ?? true;
    this.context = opts.context ?? {};

    // 让堆栈从「抛出点」开始，而不是从 AppError 构造函数开始，堆栈更干净
    Error.captureStackTrace(this, this.constructor);
  }

  // 转成响应体：只暴露安全字段，绝不带 stack / context
  toResponse() {
    return { code: this.code, message: this.message, data: null };
  }
}

// ───────── ① 可预期业务错误 ─────────
class ValidationError extends AppError {
  constructor(message, context) {
    super(message, { code: "COMMON_400_INVALID_PARAM", httpStatus: 400, context });
  }
}
class UnauthorizedError extends AppError {
  constructor(message = "登录状态已失效，请重新登录") {
    super(message, { code: "AUTH_401_TOKEN_INVALID", httpStatus: 401 });
  }
}
class ForbiddenError extends AppError {
  constructor(message = "无权访问该资源") {
    super(message, { code: "AUTH_403_FORBIDDEN", httpStatus: 403 });
  }
}
class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource}不存在`, { code: "COMMON_404_NOT_FOUND", httpStatus: 404 });
  }
}
class ConflictError extends AppError {
  constructor(message) {
    super(message, { code: "COMMON_409_CONFLICT", httpStatus: 409 });
  }
}

// ───────── ③ 系统性错误 ─────────
class DependencyError extends AppError {
  constructor(dep, cause) {
    super(`依赖服务不可用：${dep}`, {
      code: "SYS_502_DEPENDENCY_FAILED",
      httpStatus: 502,
      cause, // ✅ 保留原始错误，日志里能看到完整错误链
      context: { dependency: dep },
    });
  }
}
class TimeoutError extends AppError {
  constructor(dep, ms, cause) {
    super(`调用 ${dep} 超时`, {
      code: "SYS_504_TIMEOUT",
      httpStatus: 504,
      cause,
      context: { dependency: dep, timeoutMs: ms },
    });
  }
}
class CircuitOpenError extends AppError {
  constructor(dep) {
    super("服务繁忙，请稍后重试", {
      code: "SYS_503_CIRCUIT_OPEN",
      httpStatus: 503,
      context: { dependency: dep },
    });
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DependencyError,
  TimeoutError,
  CircuitOpenError,
};
```

### 2.2 业务错误码设计

错误码是**前后端契约**，比 HTTP 状态码粒度更细。HTTP 401 只说明「没通过认证」，但前端需要区分「Token 过期该刷新」还是「Token 非法该跳登录」。

```
命名格式：{模块前缀}_{HTTP状态}_{语义}

  AUTH_401_TOKEN_EXPIRED     → 前端：静默刷新 Token 后重放请求
  AUTH_401_TOKEN_INVALID     → 前端：清除本地态，跳登录页
  AUTH_403_FORBIDDEN         → 前端：展示无权限页
  TODO_404_NOT_FOUND         → 前端：从列表移除该项 + toast
  TODO_409_DUPLICATE_TITLE   → 前端：高亮标题输入框
  USER_400_EMAIL_FORMAT      → 前端：定位到邮箱字段
  SYS_503_CIRCUIT_OPEN       → 前端：展示"稍后重试"，可自动退避重试

设计原则：
  ① 前缀按模块划分，便于日志按模块聚合统计
  ② 含 HTTP 状态段，看码就知道大类，不用查表
  ③ 语义段用英文大写下划线，可读性 > 紧凑性
  ④ 只增不改：错误码一旦发布就是契约，改了会打断线上前端逻辑
  ⑤ 集中定义在一个文件，配注释说明「前端应该怎么处理」
```

### 2.3 Error.cause：保留错误链

```javascript
// ❌ 反面写法：原始错误被吞掉，只剩一句无用的话
async function getUser(id) {
  try {
    return await db.query("SELECT * FROM users WHERE id = ?", [id]);
  } catch (err) {
    throw new Error("查询用户失败"); // 到底是连接超时？语法错？死锁？完全看不出来
  }
}

// ✅ 用 cause 串起错误链，既有业务语义又保留根因
async function getUser(id) {
  try {
    return await db.query("SELECT * FROM users WHERE id = ?", [id]);
  } catch (err) {
    throw new DependencyError("mysql", err); // cause = 原始 SequelizeConnectionError
  }
}

// 日志层递归展开错误链
function serializeError(err, depth = 0) {
  if (!err || depth > 5) return undefined; // 防御循环引用与超深链
  return {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: err.stack,
    cause: serializeError(err.cause, depth + 1), // ← 根因在这里
  };
}

// 输出示例：
// {
//   "name": "DependencyError", "message": "依赖服务不可用：mysql", "code": "SYS_502_DEPENDENCY_FAILED",
//   "cause": {
//     "name": "SequelizeConnectionError", "message": "connect ETIMEDOUT",
//     "cause": { "name": "Error", "message": "connect ETIMEDOUT 10.0.0.5:3306", "code": "ETIMEDOUT" }
//   }
// }
// 一眼看到根因是网络超时，而不是 SQL 写错 ✓
```

---

## 三、中间件层统一错误处理

### 3.1 Koa：顶层 try/catch 与 `app.on('error')` 的分工

这两者不是二选一，而是**职责分离**：

| 机制 | 职责 | 为什么这么分 |
| --- | --- | --- |
| 顶层中间件 try/catch | **把错误转成 HTTP 响应** | 需要 `ctx` 才能写响应；且要在洋葱最外层，才能捕获整条链的错误 |
| `app.on('error')` | **集中记日志 / 上报 APM** | Koa 内部错误（如响应已发出后的写入失败、`ctx.body` 序列化失败）也会走这里，是最终兜底 |

```
        请求
          │
   ┌──────▼───────────────────────────────┐
   │ ① errorHandler（洋葱最外层）          │
   │   try { await next() }               │
   │   catch(err) {                       │
   │     分类 → 定 status/body → 写响应    │  ← 负责「给用户什么」
   │     ctx.app.emit('error', err, ctx)  │  ── 转交日志职责
   │   }                                  │
   └──────┬───────────────────────────────┘
          │
   ┌──────▼───────┐    抛出错误
   │ ② 业务中间件  │ ─────────┐
   └──────────────┘          │
                             ▼
              app.on('error', (err, ctx) => { logger... })
                             ▲
                             │
        Koa 框架内部错误（响应已发送后出错等）也直达这里
```

### 3.2 Todo 项目 `src/middleware/error.js` 改造

现有实现（`11-项目实战/Todo全栈项目/todo-api/src/middleware/error.js`）已经有了正确的骨架，但对生产环境有五个缺口。

```javascript
// ❌ 改造前：现有实现的问题
const errorMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // 问题①：console.error 且只打 message，堆栈全丢，线上根本没法定位
    console.error("[Error]", err.message);

    const status = err.status || err.statusCode || 500;
    const code = err.code || status;
    // 问题②：500 时把 err.message 直接返回给前端 —— 可能泄漏
    //         "ER_NO_SUCH_TABLE: Table 'todo.users' doesn't exist" 这类内部细节
    const message = err.message || "服务器内部错误";

    ctx.status = status;
    ctx.body = { code, message, data: null };

    // 问题③：错误不分类，业务 4xx 和编程 Bug 一样对待 → 无法配告警
    // 问题④：无 traceId，一条日志无法关联到具体请求
    // 问题⑤：不可运维错误（编程 Bug）没有触发优雅退出的判断
    ctx.app.emit("error", err, ctx);
  }
};
```

```javascript
// ✅ 改造后：src/middleware/error.js
const { AppError } = require("../errors/AppError");
const logger = require("../logger"); // 结构化日志，见《Node 日志与可观测性体系》

const isProd = process.env.NODE_ENV === "production";

/** 把任意抛出物归一化成 AppError，顺便完成三分类 */
function normalize(err) {
  // 已是自定义错误 → 直接用，分类信息都在里面
  if (err instanceof AppError) return err;

  // 抛了非 Error 对象（throw 'oops' / throw { code: 1 }）—— 是编程 Bug
  if (!(err instanceof Error)) {
    return new AppError("服务器内部错误", {
      isOperational: false,
      context: { thrown: String(err) },
    });
  }

  // Koa/koa-router 用 ctx.throw(400) 抛的错带 err.status 且 expose=true，属于业务错误
  if (err.expose && err.status) {
    return new AppError(err.message, {
      code: `COMMON_${err.status}`,
      httpStatus: err.status,
      isOperational: true,
      cause: err,
    });
  }

  // 把常见的第三方错误映射到分类
  const MAP = {
    SequelizeUniqueConstraintError: { code: "COMMON_409_CONFLICT", httpStatus: 409, op: true, msg: "数据已存在" },
    SequelizeValidationError: { code: "COMMON_400_INVALID_PARAM", httpStatus: 400, op: true, msg: "参数校验失败" },
    SequelizeConnectionError: { code: "SYS_502_DEPENDENCY_FAILED", httpStatus: 502, op: true, msg: "数据库不可用" },
    TokenExpiredError: { code: "AUTH_401_TOKEN_EXPIRED", httpStatus: 401, op: true, msg: "登录已过期" },
    JsonWebTokenError: { code: "AUTH_401_TOKEN_INVALID", httpStatus: 401, op: true, msg: "登录凭证无效" },
    SyntaxError: { code: "COMMON_400_INVALID_BODY", httpStatus: 400, op: true, msg: "请求体格式错误" },
  };
  const hit = MAP[err.name];
  if (hit) {
    return new AppError(hit.msg, { code: hit.code, httpStatus: hit.httpStatus, isOperational: hit.op, cause: err });
  }

  // 兜底：未识别的 Error 一律当编程 Bug（isOperational: false）
  return new AppError(err.message, { isOperational: false, cause: err });
}

const errorMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (raw) {
    const err = normalize(raw);

    ctx.status = err.httpStatus;
    ctx.body =
      // ✅ 生产环境的 5xx 一律用通用文案，绝不把内部 message 透给前端
      err.httpStatus >= 500 && isProd
        ? { code: err.code, message: "服务器内部错误，请稍后重试", data: null }
        : err.toResponse();

    // 非生产环境额外附上堆栈，方便本地/测试环境调试
    if (!isProd) ctx.body.stack = err.stack;

    // 把归一化后的错误交给 app.on('error') 统一记日志
    ctx.app.emit("error", err, ctx);
  }
};

/** 挂在 app 上：日志 + 告警 + 不可运维错误的兜底退出 */
function registerAppErrorHandler(app) {
  app.on("error", (err, ctx) => {
    const meta = {
      // traceId 由 AsyncLocalStorage 自动注入（见日志那篇），这里无需手动传
      method: ctx?.method,
      path: ctx?.path,
      status: ctx?.status,
      code: err.code,
      userId: ctx?.state?.user?.id,
      ...err.context,
      err, // pino 的 err 序列化器会展开 message/stack/cause
    };

    if (err.httpStatus >= 500) {
      logger.error(meta, "请求处理失败"); // → 触发告警
    } else if (err.httpStatus >= 400) {
      logger.info(meta, "业务错误"); // → ✅ 不告警，避免告警疲劳
    }

    // 不可运维错误（编程 Bug）不必立刻退出进程：
    // 它已经被中间件捕获，说明调用栈是完整的、进程状态仍可信，
    // 与 uncaughtException（栈已被破坏）是本质不同的情形。
    // 但要打上标记，让告警系统能按 isOperational=false 单独统计。
    if (!err.isOperational) {
      logger.error({ ...meta, isOperational: false }, "疑似编程 Bug，需修代码");
    }
  });
}

module.exports = { errorMiddleware, registerAppErrorHandler };
```

改造前后对照：

| 维度 | 改造前 | 改造后 |
| --- | --- | --- |
| 日志 | `console.error` 只打 message | 结构化日志 + 完整堆栈 + `cause` 链 + traceId |
| 错误分类 | 无，全靠 `err.status` | `normalize()` 三分类 + `isOperational` |
| 500 响应体 | 直接回 `err.message`（泄漏风险） | 生产环境统一通用文案 |
| 告警 | 无法区分，配了就是告警风暴 | 4xx 记 info 不告警、5xx 记 error 告警 |
| 第三方错误 | Sequelize / JWT 错误全落 500 | 显式映射到 409/400/401/502 |
| 非 Error 抛出物 | 会导致 `err.message` 为 undefined | 归一化并标记为编程 Bug |

### 3.3 Express：4 参数错误中间件与 async 陷阱

```javascript
// Express 的错误中间件靠「函数有 4 个参数」识别，少一个就变成普通中间件
// ⚠️ 必须写在所有路由之后
app.use((err, req, res, next) => {
  //  ↑ err 必须是第一个参数，且总数必须是 4 个
  const e = normalize(err);
  if (res.headersSent) return next(err); // 响应已发出，只能交给 Express 默认处理器
  res.status(e.httpStatus).json(e.toResponse());
});
```

```javascript
// ───── Express 4 的经典坑：async 路由抛错不会进错误中间件 ─────

// ❌ Express 4：Promise reject 无人接管 → 请求挂死到超时 + unhandledRejection
app.get("/todos", async (req, res) => {
  const todos = await Todo.findAll(); // 这里 reject，错误中间件收不到
  res.json(todos);
});
// 根因：Express 4 的 router 只 try/catch 同步抛出，
//       对返回的 Promise 不做 .catch()，所以 reject 直接逸出到 Promise 领域

// ✅ 方案一：包一个 wrapper（零依赖，最常用）
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next); // 把 reject 转成 next(err)

app.get(
  "/todos",
  asyncHandler(async (req, res) => {
    const todos = await Todo.findAll();
    res.json(todos);
  }),
);

// ✅ 方案二：入口顶部 require('express-async-errors')，它 monkey-patch 了 Layer.handle
// ✅ 方案三：升级到 Express 5 —— 原生支持 async handler 的 reject 自动转发到错误中间件

// 📌 Koa 天然没有这个问题：中间件链本身是 await 串起来的，reject 会一路冒泡到最外层 try/catch
```

---

## 四、全局兜底

### 4.1 `uncaughtException`：记日志 + 优雅退出，绝不 resume

```javascript
// src/process-guard.js
const logger = require("./logger");
const { triggerShutdown } = require("./shutdown"); // 复用优雅退出编排器

function registerProcessGuards() {
  process.on("uncaughtException", (err, origin) => {
    logger.fatal({ err, origin }, "uncaughtException，进程即将退出");

    // ❌ 绝对不要这样：吞掉异常让进程继续跑
    // process.on('uncaughtException', (err) => { console.error(err) })  // 然后什么都不做

    // ✅ 记日志 → 尽力优雅退出 → 硬性兜底强杀
    fatalExit(err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.fatal({ err: reason, promise: String(promise) }, "unhandledRejection");
    fatalExit(reason);
  });

  // 进程级警告：MaxListenersExceeded（事件监听器泄漏的早期信号）、废弃 API 等
  process.on("warning", (warning) => {
    logger.warn({ name: warning.name, message: warning.message, stack: warning.stack }, "process warning");
  });
}

let exiting = false;
function fatalExit(err) {
  if (exiting) return process.exit(1); // 退出过程中又崩了，直接死
  exiting = true;

  // 硬性兜底：优雅退出流程本身也可能因为进程状态已损坏而卡住
  const hardKill = setTimeout(() => process.exit(1), 10_000);
  hardKill.unref();

  Promise.resolve(triggerShutdown("uncaughtException"))
    .catch(() => {})
    .finally(() => {
      // ⚠️ 日志 flush 问题：pino/winston 的异步 transport 可能还没把 fatal 日志写出去
      // 直接 process.exit() 会丢掉最关键的那条日志
      if (typeof logger.flush === "function") logger.flush();
      process.exit(1); // 非 0 退出码，让 PM2/K8s 知道这是异常退出并触发重启
    });
}

module.exports = { registerProcessGuards };
```

**为什么绝不能 resume？**

```
错误一路逸出到 uncaughtException，说明：

  ① 没有任何 try/catch 或 .catch() 接管它
     → 也就意味着抛出点所在的调用栈已经被「异常展开」（stack unwinding）中断了

  ② 栈被中断的位置是不确定的，可能停在任何中间状态：

        async function transfer() {
          await db.begin()                  ← 事务开了
          await db.debit(from, 100)         ← 扣款成功
          somethingUndefined.foo()          ← 💥 TypeError 从这里逸出
          await db.credit(to, 100)          ← ✗ 永远不会执行
          await db.commit()                 ← ✗ 事务永远不会提交/回滚
        }

     此刻进程里留下：一个悬挂的事务、一个被占住不还的连接池连接、
     一个已扣款未入账的中间状态。

  ③ 如果此时 return 让进程继续跑：
     - 连接池慢慢泄漏到耗尽 → 若干分钟后全站 500，而告警指向的是"连接池耗尽"
     - 内存里的缓存/单例可能处于半初始化状态 → 产生更诡异、更难复现的二次故障
     - 真正的根因（那个 TypeError）已经被时间冲淡，排查成本指数级上升

  → 结论：进程状态已不可信，唯一安全的选择是「记录足够的现场信息，然后重启」。
    重启的成本（一次 Pod 重启 + 少量请求失败）远低于带着损坏状态运行的成本。

  📌 对比：被中间件 try/catch 捕获的错误不需要退出 —— 那说明栈是正常展开、
     被显式接管的，事务能回滚、连接能归还，进程状态仍然可信。
```

### 4.2 `unhandledRejection` 的行为变更

| Node 版本 | 默认行为 | 说明 |
| --- | --- | --- |
| ≤ Node 14 | 打印 `UnhandledPromiseRejectionWarning`，进程**继续运行** | 危险：错误被静默吞掉，只留一行 warning |
| **Node 15+** | 默认 `--unhandled-rejections=throw`，**抛出并使进程崩溃** | 与 `uncaughtException` 对齐；若注册了 `unhandledRejection` 监听器则走监听器 |

```bash
# 显式控制策略（一般不需要改，默认的 throw 就是对的）
node --unhandled-rejections=throw  server.js  # Node 15+ 默认：崩溃
node --unhandled-rejections=strict server.js  # 当作 uncaughtException 抛出
node --unhandled-rejections=warn   server.js  # 退回旧行为，只 warning ❌ 生产不要用
```

```javascript
// ⚠️ 一个反直觉点：注册了 unhandledRejection 监听器后，默认的 crash 行为就被接管了
// 如果监听器里只打日志不退出，等于把 Node 15+ 的保护机制关掉了
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection"); // ❌ 只记日志 = 变回 Node 14 的危险行为
});

// ✅ 监听器里必须自己完成「记日志 + 退出」
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandledRejection");
  fatalExit(reason);
});
```

### 4.3 退出前的日志 flush

```javascript
// ❌ 异步日志 + 立即 exit = 丢掉最关键的那条日志
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "crashed"); // 写入了内存 buffer，还没落盘
  process.exit(1); // 进程立刻死 → buffer 里的日志永久丢失
});

// ✅ 方案一：pino 的 destination 支持同步 flush
const pino = require("pino");
const dest = pino.destination({ sync: false }); // 生产用异步（性能）
const logger = pino(dest);

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "crashed");
  dest.flushSync(); // ← 同步刷盘，确保这条日志落地
  process.exit(1);
});

// ✅ 方案二：pino.final()（专为进程退出场景设计）
const finalLogger = pino.final(logger);
process.on("uncaughtException", (err) => {
  finalLogger.fatal({ err }, "crashed"); // 内部使用同步写
  process.exit(1);
});

// ✅ 方案三（更稳）：致命日志走同步 stderr，与业务日志的异步 transport 解耦
// 容器环境下 stderr 由编排层收集，同步写的性能代价只在崩溃这一次，完全可以接受
```

---

## 五、异步错误丢失的经典陷阱

### 5.1 `forEach` + async：不等待，错误静默丢失

```javascript
// ❌ 陷阱：forEach 不认识 async 函数返回的 Promise
async function syncAll(todos) {
  todos.forEach(async (todo) => {
    await saveToRemote(todo); // reject 时没人接 → unhandledRejection
  });
  console.log("全部同步完成"); // ❌ 立刻打印，实际上一个都没完成
}
// 根因：forEach 的回调返回值被直接丢弃，它不 await 也不收集 Promise。
//       循环瞬间跑完，函数直接 return，所有 reject 都逸出到进程级。

// ✅ 方案一：for...of —— 串行，逐个 await，错误正常冒泡
async function syncAll(todos) {
  for (const todo of todos) {
    await saveToRemote(todo); // 抛错会中断循环并冒泡到调用方 ✓
  }
}

// ✅ 方案二：Promise.all —— 并发，任一失败即 reject
async function syncAll(todos) {
  await Promise.all(todos.map((todo) => saveToRemote(todo)));
}

// ✅ 方案三：Promise.allSettled —— 并发且要求「部分失败不影响整体」
async function syncAll(todos) {
  const results = await Promise.allSettled(todos.map((t) => saveToRemote(t)));
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) logger.warn({ failedCount: failed.length }, "部分同步失败");
}

// ⚠️ 补充：Promise.all 并发数不可控，1 万条数据会同时打 1 万个请求打爆下游
//    要限流：p-limit / 手写分批
const pLimit = require("p-limit");
const limit = pLimit(5); // 并发上限 5
await Promise.all(todos.map((t) => limit(() => saveToRemote(t))));
```

### 5.2 EventEmitter 回调里 throw

```javascript
const EventEmitter = require("node:events");
const emitter = new EventEmitter();

// ❌ 外层 try/catch 抓不到「异步触发」的 emit 里抛的错
emitter.on("data", () => {
  throw new Error("处理失败");
});
try {
  setTimeout(() => emitter.emit("data"), 0); // 在新的事件循环 tick 中执行
} catch (err) {
  console.log("永远进不来"); // ❌ try/catch 早已出栈
}
// 根因：try/catch 只覆盖「同步执行栈」。emit 在下一个 tick 执行，
//       此时 try 块的栈帧已经弹出，抛出的错直接逸出到 uncaughtException。
// （注：同步 emit 的场景 try/catch 是能抓到的，但生产中 emit 多来自 I/O 回调）

// ❌ 更隐蔽的坑：async 监听器
emitter.on("data", async () => {
  throw new Error("处理失败"); // 返回一个 reject 的 Promise，EventEmitter 直接丢弃 → unhandledRejection
});

// ✅ 监听器内部自己兜住，把错误转成事件或日志
emitter.on("data", async (payload) => {
  try {
    await handle(payload);
  } catch (err) {
    logger.error({ err, payload }, "data 处理失败");
    emitter.emit("processError", err); // 转成显式的错误事件
  }
});

// ✅ 一定要监听 'error' 事件：EventEmitter 的 'error' 无人监听时会直接抛成 uncaughtException
emitter.on("error", (err) => logger.error({ err }, "emitter error"));

// ✅ 用 events.captureRejections 让 async 监听器的 reject 自动转发到 'error' 事件
const safeEmitter = new EventEmitter({ captureRejections: true });
safeEmitter.on("error", (err) => logger.error({ err }, "captured rejection"));
```

### 5.3 回调函数里 throw

```javascript
const fs = require("node:fs");

// ❌ error-first 回调里 throw，外层完全抓不到
try {
  fs.readFile("/nope.txt", (err, data) => {
    if (err) throw err; // 在 I/O 回调的栈里抛，逸出到 uncaughtException
  });
} catch (e) {
  console.log("抓不到"); // ❌
}

// ✅ 用 promise 版 API，让错误进入 Promise 领域，可被 await + try/catch 接管
const fsp = require("node:fs/promises");
try {
  const data = await fsp.readFile("/nope.txt");
} catch (err) {
  logger.error({ err }, "读文件失败"); // ✓
}

// ✅ 只能用回调 API 时，用 promisify 转换
const { promisify } = require("node:util");
const readFileAsync = promisify(fs.readFile);
```

### 5.4 Promise 链里忘记 return

```javascript
// ❌ 忘了 return：内层 Promise 脱离链条，错误不会流到 .catch
function save(todo) {
  return validate(todo)
    .then(() => {
      db.insert(todo); // ❌ 没 return！insert 的 reject 无人接管
    })
    .then(() => ({ ok: true })) // 不等 insert 完成就往下走了
    .catch((err) => logger.error({ err })); // 抓不到 insert 的错误
}

// ✅ 要么 return
function save(todo) {
  return validate(todo)
    .then(() => db.insert(todo)) // ← 箭头函数隐式 return，链条连上 ✓
    .then(() => ({ ok: true }))
    .catch((err) => {
      throw new DependencyError("mysql", err);
    });
}

// ✅ 更好：直接用 async/await，从语法上消灭这类错误
async function save(todo) {
  await validate(todo);
  await db.insert(todo);
  return { ok: true };
}
```

### 5.5 `setTimeout` 里 throw

```javascript
// ❌ 定时器回调在独立的栈里执行
try {
  setTimeout(() => {
    throw new Error("定时任务失败"); // → uncaughtException，进程直接挂
  }, 1000);
} catch (e) {
  /* ❌ 抓不到 */
}

// ✅ 定时器 / 后台任务的回调必须自己包一层 try/catch
setInterval(async () => {
  try {
    await cleanupExpiredTodos();
  } catch (err) {
    logger.error({ err }, "定时清理任务失败"); // ✓ 单次失败不影响后续调度
  }
}, 60_000).unref(); // unref 让定时器不阻塞进程退出（优雅退出友好）

// ✅ 通用封装：让所有后台任务默认安全
function safeTask(name, fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error({ err, task: name }, "后台任务失败");
    }
  };
}
setInterval(safeTask("cleanup", cleanupExpiredTodos), 60_000).unref();
```

### 5.6 陷阱速查表

| 陷阱 | 为什么外层抓不到 | 正确写法 |
| --- | --- | --- |
| `forEach` + async | 回调返回的 Promise 被丢弃，不等待 | `for...of` / `Promise.all` / `allSettled` |
| EventEmitter 监听器 throw | 监听器在 emit 的栈里执行，且 async 监听器的 reject 被丢弃 | 监听器内部 try/catch；`captureRejections: true`；必须监听 `'error'` |
| error-first 回调里 throw | 回调在 I/O 完成的独立栈中执行 | 用 `fs/promises` 或 `promisify` |
| Promise 链忘记 return | 内层 Promise 脱链，不参与错误传播 | 显式 return，或改用 async/await |
| `setTimeout`/`setInterval` 里 throw | 定时器回调是独立的栈 | 回调内 try/catch，或用 `safeTask` 封装 |
| `new Promise` 里 async executor | executor 内的 reject 无法被外层 Promise 捕获 | 不要在 `new Promise` 的 executor 里用 async |
| Express 4 async 路由 | router 不 catch 返回的 Promise | `asyncHandler` wrapper / `express-async-errors` / Express 5 |
| `await` 忘写 | 函数返回 Promise 但没等待 | 开启 ESLint `no-floating-promises`（TS）/ `require-await` |

---

## 六、重试、熔断、降级

### 6.1 重试的放大风险

```
❌ 无脑重试（3 次，无退避）在下游过载时的效果：

  正常态：      100 QPS ──> 下游（容量 150 QPS）  ✓
  下游变慢：    100 QPS ──> 下游开始超时
  客户端重试：  100 × 3 = 300 QPS ──> 下游（容量 150）💀
                        ↓
              下游彻底压死 → 100% 超时 → 重试 QPS 再翻倍
                        ↓
                  重试风暴（retry storm），下游永远起不来

  更糟的是「重试放大」在多层调用中是指数级的：
  网关重试 3 次 × BFF 重试 3 次 × 服务重试 3 次 = 27 倍放大 💀💀

✅ 安全重试的四个前提：
  ① 只重试「可重试错误」—— 网络超时、连接失败、5xx、429
     绝不重试 4xx（参数错了再试一万次还是错）
  ② 幂等：非幂等接口（下单、扣款、转账）不能重试，或必须带幂等键
  ③ 指数退避 + 随机抖动：给下游恢复窗口，并打散重试时刻
  ④ 有熔断兜底：连续失败到阈值直接快速失败，不再发起请求
```

### 6.2 指数退避 + 随机抖动

```javascript
// src/utils/retry.js
const RETRIABLE_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "EPIPE"]);

function isRetriable(err) {
  if (RETRIABLE_CODES.has(err.code)) return true; // 网络层错误
  const status = err.httpStatus ?? err.response?.status;
  if (status === 429) return true; // 限流，退避后重试
  if (status >= 500 && status !== 501) return true; // 服务端错误
  return false; // ✅ 4xx 一律不重试
}

/**
 * @param {object} opts
 *   retries    重试次数（不含首次），生产建议 1~2 次，不要 3 次以上
 *   baseDelay  基础延迟 ms
 *   maxDelay   单次延迟上限，防止指数爆炸出几十秒的等待
 *   idempotent 非幂等操作必须显式声明 false，否则不允许重试
 */
async function retry(fn, opts = {}) {
  const { retries = 2, baseDelay = 100, maxDelay = 2000, idempotent = true, name = "call" } = opts;

  // 安全闸门：非幂等操作直接不重试
  const maxAttempts = idempotent ? retries + 1 : 1;

  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (!isRetriable(err) || attempt === maxAttempts - 1) throw err;

      // 指数退避：100ms → 200ms → 400ms → 800ms（封顶 maxDelay）
      const exp = Math.min(baseDelay * 2 ** attempt, maxDelay);

      // 全抖动（full jitter）：在 [0, exp] 内取随机值
      // ❗ 为什么必须加抖动：没有抖动时，同一时刻失败的 1000 个请求
      //    会在完全相同的时刻一起重试，形成「惊群」（thundering herd），
      //    下游刚要恢复就被同步的重试洪峰再打死一次。
      const delay = Math.random() * exp;

      logger.warn({ name, attempt: attempt + 1, delay: Math.round(delay), err }, "调用失败，退避重试");
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// 用法：幂等的读操作可以重试
const user = await retry(() => http.get(`/users/${id}`), { retries: 2, name: "getUser" });

// ❌ 非幂等的写操作不能裸重试
// await retry(() => http.post('/orders', body))   // 可能创建重复订单

// ✅ 要重试就必须带幂等键，让下游能去重
const idempotencyKey = randomUUID();
await retry(() => http.post("/orders", body, { headers: { "Idempotency-Key": idempotencyKey } }), {
  idempotent: true, // 有幂等键才敢声明 true
  retries: 2,
});
```

### 6.3 熔断器三态状态机

```
                    ┌──────────────────────────────────┐
                    │                                  │
              失败率超阈值                        探测请求成功
              (如 10s 内 >50%)                    (连续 N 次)
                    │                                  │
         ┌──────────▼──────────┐            ┌──────────┴──────────┐
         │      CLOSED         │            │     HALF-OPEN       │
         │   （闭合/正常）      │            │   （半开/试探）      │
         │                     │            │                     │
         │ 请求正常放行         │            │ 只放行少量探测请求   │
         │ 统计失败率           │            │ 其余仍然快速失败     │
         └──────────┬──────────┘            └──────────┬──────────┘
                    │                                  │
                    │                            探测请求失败
                    │                                  │
                    │        ┌──────────────────┐      │
                    └───────>│      OPEN        │<─────┘
                             │   （断开/熔断）   │
                             │                  │
                             │ 所有请求立即失败  │
                             │ 不发起真实调用    │
                             │ (fail fast)      │
                             └────────┬─────────┘
                                      │
                                 resetTimeout 到期
                                （如 30s 后）
                                      │
                                      └──> HALF-OPEN

熔断解决的核心问题：
  ① 保护下游：下游已经挂了，不再往上加压，给它恢复的机会
  ② 保护自己：不再让请求卡在下游超时上（每个卡住的请求都占着一个连接
     和一份内存），避免自己被拖成「级联故障」
  ③ 快速失败：用户 30ms 拿到降级结果，比等 5s 超时体验好得多
```

```javascript
// 用 opossum（社区最常用的 Node 熔断库）
const CircuitBreaker = require("opossum");
const { CircuitOpenError } = require("../errors/AppError");

const breaker = new CircuitBreaker(
  async (userId) => http.get(`/api/profile/${userId}`, { timeout: 1000 }),
  {
    timeout: 1500, // 单次调用超时（超时也计入失败）
    errorThresholdPercentage: 50, // 失败率 > 50% 触发熔断
    volumeThreshold: 20, // 至少 20 次调用才开始统计（避免冷启动误熔断）
    resetTimeout: 30_000, // OPEN 状态持续 30s 后转 HALF-OPEN
    rollingCountTimeout: 10_000, // 统计窗口 10s
    rollingCountBuckets: 10, // 窗口分 10 桶，滑动统计
  },
);

// 降级函数：熔断期间和调用失败时的兜底
breaker.fallback(async (userId) => {
  const cached = await redis.get(`profile:${userId}`);
  if (cached) return { ...JSON.parse(cached), _stale: true }; // 返回过期缓存
  return { id: userId, nickname: "用户", avatar: DEFAULT_AVATAR, _degraded: true }; // 兜底数据
});

// 状态变化必须打日志 + 上报指标，否则线上熔断了你都不知道
breaker.on("open", () => logger.error({ dep: "profile-service" }, "熔断器打开"));
breaker.on("halfOpen", () => logger.warn({ dep: "profile-service" }, "熔断器半开，开始探测"));
breaker.on("close", () => logger.info({ dep: "profile-service" }, "熔断器关闭，恢复正常"));
breaker.on("reject", () => metrics.circuitRejected.inc({ dep: "profile-service" }));

// ⚠️ 每个下游依赖一个独立的 breaker 实例
// ❌ 共享一个 breaker：A 服务挂了会把 B 服务的调用也熔断掉
```

### 6.4 降级策略

| 策略 | 做法 | 适用场景 | 代价 |
| --- | --- | --- | --- |
| **返回过期缓存**（stale-while-error） | 下游挂了返回 Redis 里的旧数据，标记 `_stale` | 读多写少、容忍短暂不一致（商品详情、用户资料） | 数据可能过期 |
| **返回兜底数据** | 返回静态默认值（默认头像、空推荐列表） | 非核心模块（推荐位、运营banner） | 功能体验降级 |
| **降级页面/局部隐藏** | 前端拿到 `_degraded` 标记时隐藏该模块 | 页面上的次要区块 | 功能缺失但主流程可用 |
| **同步转异步** | 写操作先落消息队列，返回「处理中」 | 可延迟的写（发通知、生成报表） | 用户需等待最终结果 |
| **关闭非核心功能**（功能开关） | 配置中心一键关闭统计上报、日志采样 | 大促、突发流量保主链路 | 需提前埋好开关 |
| **快速失败** | 直接返回 503 + `Retry-After` | 实在无法降级的核心写操作 | 用户可见错误，但不拖垮系统 |

```javascript
// 降级要「显式、可观测」：不能悄悄降级
async function getProfile(userId) {
  try {
    return await breaker.fire(userId);
  } catch (err) {
    if (breaker.opened) {
      metrics.degraded.inc({ dep: "profile-service", strategy: "circuit_open" });
      throw new CircuitOpenError("profile-service"); // 有兜底就返回兜底，没有就明确报错
    }
    throw err;
  }
}
// 关键：降级次数必须上报为独立指标并配告警
// 否则会出现「降级持续生效了三天，业务数据一直不对，但没人发现」
```

---

## 七、告警联动

### 7.1 什么该告警，什么不该

```
❌ 告警疲劳的典型成因：把所有 error 日志都配成告警

  某天用户批量提交非法参数 → 5000 条 400 错误 → 5000 条告警
        ↓
  值班群被刷屏 → 大家把告警群设为免打扰
        ↓
  三天后真的挂了，P0 告警混在噪音里没人看见 💀

  告警的价值 = 信噪比。一条不需要人介入的告警，就是负价值。

✅ 判断标准：这条告警需要人「立刻做点什么」吗？
  - 不需要 → 不要告警，做成看板指标就够了
  - 需要，但可以等到明天 → 低优先级工单，不要电话
  - 需要立刻处理 → 才配 P0/P1 告警
```

| 错误类型 | 是否告警 | 告警级别 | 阈值示例 |
| --- | --- | --- | --- |
| 业务 4xx（参数非法、Token 过期） | ❌ 不告警 | — | 只做看板；但**突增**要告警（可能是攻击或前端发版 bug） |
| 401 突增 | ✅ 告警 | P2 | 5 分钟 401 占比 > 30%（可能是签名逻辑挂了或撞库） |
| 5xx 错误率 | ✅ 告警 | P1 | 5 分钟错误率 > 1%，且请求量 > 100 |
| `isOperational: false` 的错误 | ✅ 告警 | P1 | **出现 1 次就告警**（这是代码 Bug，必须有人看） |
| `uncaughtException` / 进程重启 | ✅ 告警 | **P0** | 出现 1 次即告警 |
| 熔断器 OPEN | ✅ 告警 | P1 | 状态变为 open 立即告警 |
| 降级生效 | ✅ 告警 | P2 | 降级次数 > 0 持续 5 分钟 |
| P99 耗时 | ✅ 告警 | P2 | P99 > SLO 阈值持续 10 分钟 |
| 事件循环延迟 | ✅ 告警 | P1 | P99 > 200ms 持续 5 分钟（Node 特有的关键健康指标） |

### 7.2 错误聚合与采样

```javascript
// ❌ 同一个 Bug 每秒抛 1000 次 → 1000 条一模一样的日志 + 1000 条告警
//    日志成本爆炸，告警毫无意义

// ✅ 按「错误指纹」聚合 + 采样
const crypto = require("node:crypto");

function fingerprint(err) {
  // 指纹 = 错误类型 + 堆栈首帧（去掉行号里的变量部分），同一处 Bug 指纹一致
  const topFrame = (err.stack || "").split("\n")[1] || "";
  return crypto.createHash("md5").update(`${err.name}|${err.code}|${topFrame}`).digest("hex").slice(0, 12);
}

const seen = new Map(); // fingerprint -> { count, lastLoggedAt }
const SAMPLE_WINDOW = 60_000;

function logErrorSampled(err, meta) {
  const fp = fingerprint(err);
  const now = Date.now();
  const rec = seen.get(fp) ?? { count: 0, lastLoggedAt: 0 };
  rec.count++;

  // 每个指纹每分钟最多打一条完整日志，但把窗口内的累计次数带上
  if (now - rec.lastLoggedAt > SAMPLE_WINDOW) {
    logger.error({ ...meta, err, fingerprint: fp, suppressedCount: rec.count - 1 }, "错误（已聚合）");
    rec.lastLoggedAt = now;
    rec.count = 0;
  }
  seen.set(fp, rec);

  // 无论是否打日志，指标计数都要准 —— 告警看指标，不看日志条数
  metrics.errorTotal.inc({ code: err.code, fingerprint: fp });
}

// ⚠️ seen 这个 Map 必须有上限，否则它自己就是内存泄漏源
if (seen.size > 1000) seen.clear();
```

### 7.3 告警阈值设置原则

```
① 用「比率」而不是「绝对值」
   ❌ 5 分钟内 5xx > 100 次        → 流量涨了就误报，流量跌了就漏报
   ✅ 5 分钟内 5xx 占比 > 1%       → 与流量规模解耦

② 加「最小样本量」守卫
   ❌ 错误率 > 1%                  → 凌晨只有 3 个请求，挂 1 个就是 33% → 误报
   ✅ 错误率 > 1% AND 请求数 > 100

③ 用「持续时间」过滤毛刺
   ❌ 单点超过阈值就告警            → GC 停顿、网络闪断都会误报
   ✅ 连续 2~3 个采样点超阈值

④ 分级而不是一刀切
   错误率 > 1%  → P2 企微通知
   错误率 > 5%  → P1 电话值班
   错误率 > 20% → P0 电话 + 升级到 Leader

⑤ 告警必须带「可执行信息」
   ❌ "todo-api 错误率升高"
   ✅ "todo-api 5xx 3.2%（基线 0.01%），Top 错误码 SYS_502_DEPENDENCY_FAILED（占 89%），
       依赖 mysql，traceId 示例 abc123，看板链接 …"
   → 值班人不用翻日志就能判断方向
```

---

## 生产实践清单

### 必须做（Must）

- [ ] 定义 `AppError` 基类，携带 `code` / `httpStatus` / `isOperational` / `cause`
- [ ] 错误码集中定义，命名含模块前缀 + HTTP 状态，只增不改
- [ ] 包装第三方错误时用 `Error.cause` 保留原始错误链，日志递归展开
- [ ] 顶层错误中间件把任意抛出物 `normalize()` 成 `AppError`（含非 Error 抛出物）
- [ ] 生产环境 5xx 响应体使用通用文案，**绝不返回 `err.message` 或 `stack`**
- [ ] 4xx 记 `info`/`warn` 不告警，5xx 记 `error` 并告警
- [ ] Express 4 项目所有 async 路由必须包 `asyncHandler`（或用 `express-async-errors` / 升到 Express 5）
- [ ] 注册 `uncaughtException` / `unhandledRejection`，**记日志 + 优雅退出 + 硬性强杀兜底**，绝不 resume
- [ ] 注册 `unhandledRejection` 监听器后必须自己退出（否则等于关掉 Node 15+ 的默认保护）
- [ ] 致命日志退出前 `flushSync()` 或用 `pino.final()`，避免丢最后一条
- [ ] 监听 `process.on('warning')`，捕获 MaxListenersExceeded 等泄漏早期信号
- [ ] 禁止 `forEach` + async，用 `for...of` / `Promise.all` / `allSettled`（并发大时加 `p-limit`）
- [ ] 所有 EventEmitter 都监听 `'error'` 事件；async 监听器内部自己 try/catch
- [ ] 定时器 / 后台任务回调内部必须 try/catch，且 `.unref()`
- [ ] 所有下游调用都有超时；重试只针对可重试错误 + 幂等操作 + 指数退避 **含随机抖动**
- [ ] 重试次数 ≤ 2，且多层调用链上不要每层都重试（避免指数放大）
- [ ] 核心下游有独立熔断器实例（不共享），状态变化打日志 + 上报指标 + 告警
- [ ] 降级路径显式上报指标并配告警，避免「悄悄降级三天没人知道」
- [ ] 错误日志按指纹聚合采样，聚合 Map 有容量上限
- [ ] ESLint 开 `no-floating-promises`（TS）/ `require-await` / `no-return-await` 类规则

### 常见踩坑

| 现象 | 根因 | 解法 |
| --- | --- | --- |
| 前端拿到 `"ER_NO_SUCH_TABLE: Table 'todo.users' doesn't exist"` | 500 时直接把 `err.message` 塞进响应体 | 生产环境 5xx 一律用通用文案 |
| 线上报错只有一句「查询失败」，无法定位 | 包装错误时丢掉了原始 error | 用 `Error.cause` 串错误链，日志递归展开 |
| Express 接口无响应、请求挂到超时 | Express 4 里 async 路由 reject 无人接管 | `asyncHandler` wrapper 或升 Express 5 |
| 告警群天天被 400 刷屏，真故障被淹没 | 所有 error 日志都配了告警 | 4xx 降为 info 不告警；告警用比率 + 最小样本量 + 持续时间 |
| 批量处理「显示成功」但数据没写进去 | `forEach` + async 不等待，reject 静默丢失 | 换 `for...of` / `Promise.all` |
| 进程莫名重启，日志里什么都没有 | 崩溃日志还在异步 buffer 里就 `process.exit()` 了 | `flushSync()` / `pino.final()` / 致命日志走同步 stderr |
| 连接池几小时后耗尽，全站 500 | `uncaughtException` 被吞掉后进程继续跑，事务/连接悬挂泄漏 | 绝不 resume，走优雅退出让编排层重启 |
| Node 从 14 升到 18 后进程开始频繁崩溃 | Node 15+ `unhandledRejection` 默认 crash，暴露了原本被静默吞掉的 reject | 这是**好事**：按堆栈逐个修，不要用 `--unhandled-rejections=warn` 掩盖 |
| 下游抖动一下，自己也跟着挂了 | 无超时 + 无熔断，请求全卡在下游超时上耗尽连接 | 全链路超时 + 熔断 + 降级 |
| 下游刚要恢复又被打挂 | 重试无抖动，大量请求在同一时刻同步重试（惊群） | 指数退避 + full jitter |
| 重复下单 / 重复扣款 | 对非幂等接口做了重试 | 非幂等操作禁止重试，或强制带幂等键 |
| A 服务故障导致 B 服务调用也全失败 | 多个下游共享同一个熔断器实例 | 每个依赖独立 breaker |
| 业务数据连续几天不对，无人发现 | 降级生效但没有指标和告警 | 降级路径上报独立指标 + 配 P2 告警 |
| 日志量突然涨 10 倍，日志成本爆炸 | 单个 Bug 高频抛错，每次都打完整堆栈 | 按错误指纹聚合采样 |

### 排查手册

| 看什么指标 | 用什么工具 | 定位到代码 | 怎么验证 |
| --- | --- | --- | --- |
| 5xx 错误率 + 按 `code` 的 Top N 分布 | APM / 日志平台按 `code` 聚合 | Top 错误码直接指向抛出它的模块 | 修复后该 `code` 计数应归零 |
| `isOperational: false` 的错误数 | 日志平台按该字段过滤 | 有值就一定是编程 Bug，看 `cause` 链首帧 | 补充测试用例，重放同样请求不再复现 |
| 进程重启次数 / Exit Code | `kubectl get pod`、`pm2 describe` | Exit Code 1 → `uncaughtException`；137 → 被 SIGKILL/OOMKill | 看重启前最后一条 fatal 日志的堆栈 |
| 某条错误的完整调用链 | 用 traceId 在日志平台串查 + Trace 视图 | Trace 里耗时最长/报错的那个 span | 修复后同类 trace 不再出现该 span 错误 |
| 熔断器状态与 reject 计数 | Prometheus / opossum 事件日志 | `open` 事件的 `dep` 字段指向具体依赖 | 下游恢复后应自动 halfOpen → close |
| 重试次数 / 重试成功率 | 自定义 Counter 指标 | 重试率高但成功率低 → 重试是无效放大，应改为快速失败 | 调整策略后下游 QPS 应下降 |
| 降级生效次数 | 自定义 Counter | 定位到具体的 `fallback` 分支 | 下游恢复后计数应归零 |
| unhandledRejection 的来源 | `--trace-warnings`、`process.on('unhandledRejection')` 里打 `String(promise)` | 堆栈定位到缺 `.catch()` / 缺 `await` 的位置 | 补上后不再出现该 fatal 日志 |
| 事件监听器是否泄漏 | `process.on('warning')` 的 MaxListenersExceeded | 堆栈指向重复 `on()` 却不 `off()` 的代码 | 加 `removeListener` 后 warning 消失 |

---

## 面试常见问答

**Q1：你们线上的错误是怎么分类处理的？**

分三类，因为处理策略完全不同。第一类是可预期的业务错误，比如参数非法、Token 过期、余额不足，返回 4xx 和明确的业务错误码，日志记 info，不告警也不重试——这是业务规则的一部分，不是故障。第二类是编程 Bug，比如读了 undefined 的属性，返回 500，日志记 error 带完整堆栈，出现一次就要告警，因为必须改代码。第三类是系统性错误，比如下游超时、连接池耗尽，返回 502/503/504，要告警，而且这类是唯一可以重试的——配合熔断和降级。落地上就是给自定义错误类加一个 `isOperational` 字段来标识，它同时决定了要不要走优雅退出。

**Q2：`uncaughtException` 里能不能记完日志就 return 让进程继续跑？**

不能，这是很危险的做法。错误能一路逸出到 `uncaughtException`，说明整条调用栈上没有任何人接管它，也就意味着栈已经被异常展开中断了，而且中断在什么位置是不确定的——可能有个事务开了没提交也没回滚，有个连接池的连接被占住没归还，有个内存里的单例处于半初始化状态。这时候让进程继续跑，泄漏会慢慢累积，几十分钟后表现出「连接池耗尽」这种完全指向错误方向的故障，真正的根因早被冲淡了。正确做法是：记录足够的现场信息，flush 日志，走优雅退出，让 PM2 或 K8s 重启进程。要注意区分的是——被中间件 try/catch 捕获的错误不需要退出，那说明栈是正常展开、被显式接管的，进程状态仍然可信。

**Q3：Koa 的顶层 try/catch 和 `app.on('error')` 是什么关系？**

是职责分离而不是二选一。顶层中间件的 try/catch 负责「把错误转成 HTTP 响应」——它需要 `ctx` 才能写响应，而且必须在洋葱最外层才能捕获整条链的错误。`app.on('error')` 负责「集中记日志和上报 APM」，它是最终兜底，因为 Koa 框架内部的错误——比如响应已经发出之后写入失败——只会走到这里，中间件的 try/catch 抓不到。所以标准写法是：中间件 catch 到错误后先归一化、写响应，然后 `ctx.app.emit('error', err, ctx)` 把日志职责转交出去。这样日志逻辑只有一处，不会散落在各个中间件里。

**Q4：`forEach` 里写 async 函数会有什么问题？**

两个问题。第一，`forEach` 会丢弃回调的返回值，它根本不认识 async 函数返回的 Promise，所以不会等待——循环瞬间跑完，后面的代码立刻执行，你会看到「全部同步完成」的日志，但实际上一条都没完成。第二个问题更严重：所有 reject 都没人接管，直接逸出成 `unhandledRejection`，在 Node 15+ 会让进程崩掉，在更老的版本会被静默吞掉，数据丢了都不知道。正确写法看需求：要串行用 `for...of`，要并发且任一失败就整体失败用 `Promise.all`，要并发且允许部分失败用 `Promise.allSettled`。用 `Promise.all` 时还要注意并发数不可控的问题，一万条数据会同时打一万个请求，得用 `p-limit` 限流。

**Q5：重试为什么可能让故障更严重？熔断器怎么解决？**

因为重试是乘法。假设下游容量 150 QPS，正常来 100 QPS。下游一变慢开始超时，客户端重试 3 次，瞬间变成 300 QPS，直接把下游彻底压死；压死之后 100% 超时，重试量再翻倍，形成重试风暴，下游永远起不来。而且这个放大在多层调用中是指数级的——网关重试 3 次乘 BFF 3 次乘服务 3 次就是 27 倍。所以安全重试有四个前提：只重试可重试错误，操作必须幂等，用指数退避加随机抖动，以及有熔断兜底。抖动很关键，没有抖动的话同一时刻失败的请求会在完全相同的时刻一起重试，形成惊群，下游刚要恢复就被同步的重试洪峰再打死一次。熔断器是三态状态机：Closed 正常放行并统计失败率，失败率超阈值转 Open 直接快速失败不发真实调用，Open 持续一段时间后转 Half-Open 放少量探测请求，探测成功回 Closed，失败回 Open。它同时保护三方：给下游恢复窗口、避免自己的请求全卡在超时上被拖死、让用户几十毫秒拿到降级结果而不是等五秒超时。

---

## 关联笔记

- [优雅退出与健康检查](./优雅退出与健康检查.md) —— 本篇 `uncaughtException` 触发的「被动退出」要复用那篇的退出编排器；那篇讲信号机制与探针，本篇讲错误分类与兜底
- [Node 日志与可观测性体系](./Node日志与可观测性体系.md) —— 本篇的错误日志字段、traceId 注入、错误指标上报的具体实现在那篇；本篇只讲「记什么」，那篇讲「怎么记」
- [Node 应用部署与进程守护](./Node应用部署与进程守护.md) —— 本篇「退出后由谁重启」由那篇的 PM2 / K8s 重启策略决定
- [Node.js 面试核心知识点](../Node.js面试核心知识点.md) —— Q4 有错误处理的入门版回答，本篇是它的生产级展开
- [Node.js Stream 流与中间件机制](../Node.js-Stream流与中间件机制.md) —— 洋葱模型原理，本篇第三章的错误中间件依赖它的执行顺序
- [Todo 全栈项目](../../11-项目实战/Todo全栈项目/README.md) —— 本篇第 3.2 节的改造锚点 `todo-api/src/middleware/error.js`
- [生产运维专题索引](./README.md) —— 本模块四篇的推荐阅读顺序
