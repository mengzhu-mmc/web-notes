# Node 日志与可观测性体系

> 生产环境排查问题靠的不是 `console.log`，而是「结构化日志 + 指标 + 链路追踪」三件套。这一篇讲清三者各自解决什么问题，以及在 Node 里怎么落地。

## 面试高频考点

1. **为什么生产环境不能用 `console.log`？它会阻塞事件循环吗？**
2. **结构化日志必须包含哪些字段？pino 为什么比 winston 快？**
3. **一个请求跨了 5 个服务，你怎么把它们的日志串起来？**
4. **Logs / Metrics / Traces 各自解决什么问题？「接口变慢了」该先看哪个？**
5. **Node 应用最该监控的指标是什么？为什么要看 P99 而不是平均值？**

---

## 一、为什么 `console.log` 在生产不可用

### 1.1 五个致命缺陷

| 缺陷 | 具体表现 | 后果 |
| --- | --- | --- |
| **可能同步阻塞** | 输出到**文件或管道**时，Node 对 stdout 的写入是同步的 | 高并发下每条日志都同步等 I/O 完成，直接拖慢事件循环 |
| **无级别** | 没有 debug/info/warn/error 之分 | 线上无法只保留 warn 以上；调试日志和关键日志混在一起 |
| **无结构** | 输出是自由文本 | 无法按字段检索聚合，日志平台只能做全文匹配 |
| **无采样** | 一个高频 Bug 每秒打 1000 条 | 日志成本爆炸，还可能把磁盘写满 |
| **无脱敏** | `console.log(req.body)` 把密码、Token 原样落盘 | 合规事故，日志平台上任何人都能看到明文凭证 |

### 1.2 同步阻塞的机制

```
Node 对 process.stdout 的写入行为，取决于 stdout 指向哪里：

  ┌────────────────────┬──────────┬──────────────────────────────────┐
  │ stdout 目标        │ 写入方式 │ 影响                             │
  ├────────────────────┼──────────┼──────────────────────────────────┤
  │ TTY（终端）        │ 异步     │ 本地开发无感，所以你从来没发现问题│
  │ 文件（> app.log）  │ 同步     │ 每条日志都同步等磁盘 I/O ⚠️       │
  │ 管道（| tee、Docker│ 同步     │ 管道满时 write 会阻塞 ⚠️⚠️        │
  │ 日志采集 sidecar） │          │                                  │
  └────────────────────┴──────────┴──────────────────────────────────┘

为什么「同步」在 Node 里格外要命：

  单线程模型下，同步 write 会占住唯一的 JS 执行线程：

    请求处理 ──> console.log ──> [同步等磁盘/管道] ──> 继续
                                       ↑
                            这段时间事件循环完全停转：
                            - 所有其他请求排队等着
                            - 定时器延迟
                            - liveness 探针可能超时 → 被误判为卡死重启

  更隐蔽的是管道场景：如果下游消费者（Docker 日志驱动、采集 agent）
  处理慢，管道缓冲区被填满，write 就会一直阻塞到有空间为止。
  「日志采集组件卡了 → 业务接口全部变慢」这种诡异的故障链就是这么来的。
```

```javascript
// ❌ 生产禁止
console.log("用户登录:", userId, "耗时:", Date.now() - start);
// 问题：同步风险 + 无级别 + 无结构（"耗时: 234" 无法被聚合成 P99）+ 无 traceId

// ✅ 结构化日志：异步写 + 分级 + 可检索
logger.info({ userId, duration: Date.now() - start }, "用户登录");
// 输出：{"level":30,"time":1712345678901,"traceId":"abc","userId":42,"duration":234,"msg":"用户登录"}
//        ↑ duration 是数字字段 → 日志平台可以直接算 P99、画趋势图
```

> [!tip] 面试要点
> 这里不要背「`console.log` 一定阻塞」这种绝对结论。准确的说法是：**`console.log` 的写入是否同步取决于 stdout 指向的目标**——TTY 下异步，文件和管道下同步。而生产环境恰恰就是管道（容器）或文件，所以「本地跑没问题、上线后接口莫名变慢」是很常见的现象。

---

## 二、结构化日志

### 2.1 为什么必须是 JSON

```
【非结构化】
  2026-08-09 10:23:45 用户 42 登录成功，耗时 234ms

  想回答「过去 1 小时登录接口的 P99 耗时」→ 只能写正则从文本里抠数字 ❌
  想回答「用户 42 今天做了什么」→ 全文搜 "42"，会匹配到耗时=42、id=42 的其他记录 ❌

【结构化】
  {"time":1712345678901,"level":30,"msg":"用户登录","userId":42,"duration":234,
   "traceId":"4bf92f...","service":"todo-api","env":"prod","path":"/api/login"}

  ELK / Loki / 内部日志平台可以直接：
    ✓ 按字段过滤：userId:42 AND level:>=40
    ✓ 按字段聚合：avg(duration) by path，percentile(duration, 99)
    ✓ 按 traceId 串出整条链路
    ✓ 建索引，亿级日志秒级检索
```

### 2.2 必备字段

| 字段 | 说明 | 为什么必须有 |
| --- | --- | --- |
| `time` / `timestamp` | 毫秒时间戳（推荐 epoch 数字，比字符串省空间且好排序） | 时序检索的基础 |
| `level` | 日志级别（pino 用数字：trace10/debug20/info30/warn40/error50/fatal60） | 线上按级别过滤；告警只看 error 以上 |
| `msg` | 人读的简短描述，**固定文案不要拼变量** | 拼了变量就无法按 msg 聚合同类日志 |
| `traceId` | 全链路唯一 ID | 跨服务串联的唯一手段 |
| `spanId` | 当前调用段 ID | 定位链路中的具体环节 |
| `service` | 服务名 | 多服务共用日志平台时必须区分 |
| `env` | 环境（prod/staging/dev） | 防止测试日志污染生产查询 |
| `version` | 应用版本 / commit sha | 判断问题是否由某次发布引入 |
| `hostname` / `pid` | 实例标识 | 定位到单个 Pod / worker |
| `userId` | 用户标识 | 用户报障时按人查 |
| `method` / `path` / `status` | HTTP 三要素 | 按接口维度聚合 |
| `duration` | 耗时（**数字**，不要写成 `"234ms"`） | 算 P99 的前提 |
| `err` | 错误对象（由序列化器展开 message/stack/cause） | 排查根因 |

```javascript
// ❌ msg 里拼变量：每条日志的 msg 都不一样，无法聚合
logger.info(`用户 ${userId} 登录成功，耗时 ${duration}ms`);

// ✅ msg 固定，变量放字段
logger.info({ userId, duration }, "用户登录成功");
// 这样 msg:"用户登录成功" 可以聚合出「今天有多少次登录」
```

### 2.3 pino vs winston

| 维度 | pino | winston |
| --- | --- | --- |
| 设计目标 | 极致低开销 | 功能丰富、可扩展 |
| 默认输出 | JSON（一等公民） | 需配 `format.json()` |
| 写入方式 | **transport 跑在独立子进程/worker**，主线程只做最小序列化 | transport 在**主线程**内执行 |
| 序列化 | 预编译序列化函数（根据固定字段生成专用代码） | 通用 JSON 序列化 + format 链 |
| 格式化/美化 | 靠外部进程（`pino-pretty`），生产环境零开销 | 内置 format 链，在主线程跑 |
| 多目标输出 | `pino.transport({ targets: [...] })` | 内置多 transport |
| 子 logger | `logger.child({ traceId })`，开销极低 | `logger.child()` 支持 |
| 脱敏 | **内置 `redact`**（编译期生成路径访问代码） | 需自己写 format 或用插件 |
| 生态 | `pino-http`、`pino-pretty`、`pino-loki`、`pino-elasticsearch` | transport 生态更广（DB、云服务） |
| 配置复杂度 | 简单 | 较高（levels/formats/transports 三层概念） |
| 适用 | **高吞吐服务、容器环境**（推荐默认选择） | 需要复杂 transport 编排的场景 |

**pino 快的核心原因**（面试常问）：

```
① 序列化预编译
   pino 在初始化时根据你声明的字段生成一个专用的序列化函数，
   而不是每条日志都走通用的 JSON.stringify + format 链遍历。

② transport 在子进程 / worker thread
   ┌─────────────── 主线程（业务）──────────────┐
   │ logger.info(...)                          │
   │   → 序列化成一行 JSON                      │
   │   → 写入 SonicBoom（带缓冲的异步写入器）    │  ← 主线程到这里就返回了
   └───────────────┬───────────────────────────┘
                   │ 通过管道
   ┌───────────────▼───────────────────────────┐
   │ transport 子进程 / worker                  │
   │   格式化、分文件、发 Loki/ES、切割……        │  ← 这些重活不占业务线程
   └───────────────────────────────────────────┘

   对比 winston：format 链（timestamp → json → colorize → 自定义）
   全部在主线程逐条执行，每条日志都要跑一遍。

⚠️ 不要背具体的「快 N 倍」数字，说清机制差异就够了。
```

### 2.4 pino 生产配置

```javascript
// src/logger.js
const pino = require("pino");
const { randomUUID } = require("node:crypto");

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  // 级别从环境变量读，线上可动态调（临时开 debug 排查后再关回去）
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),

  // 所有日志都自动带上的固定字段
  base: {
    service: process.env.SERVICE_NAME || "todo-api",
    env: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "unknown", // 通常注入 git commit sha
    pid: process.pid,
    hostname: process.env.HOSTNAME, // 容器里就是 Pod 名
  },

  // 时间戳：epoch 毫秒数字，比 ISO 字符串省空间、好排序
  timestamp: pino.stdTimeFunctions.epochTime,

  // level 输出成可读字符串（默认是数字，很多日志平台更认字符串）
  formatters: {
    level: (label, number) => ({ level: label, levelValue: number }),
  },

  // ───────── 脱敏：这是合规红线 ─────────
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-api-key"]',
      "req.body.password",
      "req.body.oldPassword",
      "req.body.newPassword",
      "req.body.idCard",
      "req.body.phone",
      "res.headers['set-cookie']",
      "*.token", // 通配：任意一层的 token 字段
      "*.accessToken",
      "*.refreshToken",
      "*.secret",
      "*.password",
    ],
    censor: "<REDACTED>", // 替换值
    remove: false, // false=替换成 censor；true=直接删除字段
  },

  // 错误序列化：展开 message/stack，并递归展开 cause 链
  serializers: {
    err: pino.stdSerializers.err, // 内置序列化器会处理 cause
    req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.ip }),
  },

  // 生产直接写 stdout（由编排层收集）；开发用 pino-pretty 美化
  transport: isProd
    ? undefined // ✅ 生产不加 transport，最快路径：序列化 → stdout
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l" } },
});

module.exports = logger;
```

```javascript
// ⚠️ redact 的两个注意点

// ① redact 只能命中「声明过的路径」，动态字段名会漏
logger.info({ user: { pwd: "123456" } }); // paths 里没写 *.pwd → 明文落盘 ❌
// → 对策：统一字段命名规范；对整个请求体做白名单而不是黑名单

// ② 最保险的做法是白名单：只记录明确安全的字段
function safeBody(body) {
  const ALLOW = ["title", "completed", "page", "pageSize"]; // 只放行已知安全字段
  return Object.fromEntries(Object.entries(body).filter(([k]) => ALLOW.includes(k)));
}
logger.info({ body: safeBody(ctx.request.body) }, "创建 Todo");
```

---

## 三、traceId 全链路串联

### 3.1 基础机制在别处，这里讲怎么用

`AsyncLocalStorage`（ALS）的**机制原理与完整示例**已经在 [Node.js 现代特性（Node 22 LTS） · 四、AsyncLocalStorage](../Node.js现代特性与新API.md) 讲过了——`run()` 创建上下文、`getStore()` 在任意异步深度取值、嵌套上下文的覆盖规则。

分工是这样的：**那篇讲「ALS 这个 API 是什么、怎么用它透传 requestId」，本节讲「怎么把它做成一套跨服务的日志追踪方案」**。本节在那篇的基础上补四件它没覆盖的事：

1. traceId 的**生成与继承**规则（什么时候新建，什么时候沿用上游的）
2. **W3C `traceparent`** 标准头的格式与跨服务传递
3. 调用下游时如何**自动透传**（fetch/axios 拦截器）
4. 让日志**自动带上** traceId 的 child logger 写法（业务代码零侵入）

### 3.2 traceId 的生成与继承

```javascript
// src/trace/context.js
const { AsyncLocalStorage } = require("node:async_hooks");
const { randomBytes } = require("node:crypto");

const traceContext = new AsyncLocalStorage();

// W3C Trace Context 规定：traceId 是 32 位小写 hex（16 字节），spanId 是 16 位 hex（8 字节）
// ⚠️ 不要用 randomUUID()：它是 36 字符带连字符的格式，不符合 W3C 规范，
//    与 OpenTelemetry / 网关 / 其他语言的服务对接时会被丢弃
const newTraceId = () => randomBytes(16).toString("hex");
const newSpanId = () => randomBytes(8).toString("hex");

/** 解析 W3C traceparent 头 */
function parseTraceparent(header) {
  if (!header) return null;
  // 格式：version-traceId-parentSpanId-traceFlags
  // 示例：00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
  const m = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(header.trim());
  if (!m) return null;
  const [, version, traceId, parentSpanId, flags] = m;
  if (traceId === "0".repeat(32) || parentSpanId === "0".repeat(16)) return null; // 全 0 非法
  return { version, traceId, parentSpanId, sampled: (parseInt(flags, 16) & 0x1) === 1 };
}

function buildTraceparent({ traceId, spanId, sampled }) {
  return `00-${traceId}-${spanId}-${sampled ? "01" : "00"}`;
}

module.exports = { traceContext, newTraceId, newSpanId, parseTraceparent, buildTraceparent };
```

```
traceId 的生成与继承规则：

  请求进入网关
     │
     ├─ 请求头里有合法 traceparent？
     │     ├─ 有 → 沿用其中的 traceId，把它的 spanId 当作 parentSpanId，
     │     │       自己生成新的 spanId               ← 继承，链路才能连起来
     │     └─ 无 → 生成全新 traceId + spanId          ← 新链路起点
     │
     └─ 调用下游时：traceId 不变，把自己的 spanId 作为下游的 parentSpanId

  ❌ 常见错误：每个服务都自己生成新 traceId
     → 链路断成 5 段，跨服务排查完全失效，等于白埋

  ⚠️ 安全提醒：来自公网的 traceparent 不可全信
     - 必须做格式校验（正则 + 全 0 检查），否则脏值会污染日志索引
     - 采样标志位可以不信（防止外部强制全采样打爆日志成本）
```

### 3.3 入口中间件 + child logger

```javascript
// src/middleware/trace.js
const { traceContext, newTraceId, newSpanId, parseTraceparent } = require("../trace/context");
const baseLogger = require("../logger");

function traceMiddleware() {
  return async (ctx, next) => {
    const parent = parseTraceparent(ctx.get("traceparent"));

    const traceId = parent?.traceId ?? newTraceId(); // ← 继承或新建
    const spanId = newSpanId();
    const parentSpanId = parent?.parentSpanId;

    // ✅ 回写响应头：前端在浏览器控制台就能拿到 traceId，报障时直接贴给后端
    ctx.set("traceparent", `00-${traceId}-${spanId}-01`);
    ctx.set("x-trace-id", traceId); // 兼容不认 W3C 格式的老前端

    // ───────── child logger：核心技巧 ─────────
    // child() 生成的 logger 会把这些字段自动拼进每一条日志，
    // 业务代码调 logger.info({ userId }) 时完全不需要关心 traceId
    const logger = baseLogger.child({ traceId, spanId, parentSpanId });

    const store = { traceId, spanId, parentSpanId, logger, startTime: process.hrtime.bigint() };

    // 用 ALS 包住整个请求处理：后续任意异步深度都能 getStore() 取到
    await traceContext.run(store, async () => {
      try {
        await next();
      } finally {
        const durationMs = Number(process.hrtime.bigint() - store.startTime) / 1e6;
        logger.info(
          { method: ctx.method, path: ctx.path, status: ctx.status, duration: Math.round(durationMs) },
          "请求完成",
        );
      }
    });
  };
}

module.exports = traceMiddleware;
```

```javascript
// src/logger-proxy.js —— 让业务代码「随手 logger」就自动带 traceId
const { traceContext } = require("./trace/context");
const baseLogger = require("./logger");

/** 优先取请求上下文里的 child logger，取不到（定时任务、启动阶段）则退回全局 logger */
function getLogger() {
  return traceContext.getStore()?.logger ?? baseLogger;
}

// 导出与 pino 同名的方法，业务代码用起来和普通 logger 一样
module.exports = {
  trace: (...a) => getLogger().trace(...a),
  debug: (...a) => getLogger().debug(...a),
  info: (...a) => getLogger().info(...a),
  warn: (...a) => getLogger().warn(...a),
  error: (...a) => getLogger().error(...a),
  fatal: (...a) => getLogger().fatal(...a),
};
```

```javascript
// 业务代码：零侵入，不传 traceId，也不用把 ctx 一路往下传
const logger = require("../logger-proxy");

async function createTodo(userId, title) {
  logger.info({ userId, title }, "创建 Todo"); // 自动带 traceId / spanId / service / env ✓
  const todo = await Todo.create({ userId, title });
  logger.info({ userId, todoId: todo.id }, "创建成功");
  return todo;
}

// ❌ 对比：没有 ALS 时只能层层传参，污染所有函数签名
// async function createTodo(userId, title, traceId) { ... }
// async function saveToDb(data, traceId) { ... }
// async function notify(userId, traceId) { ... }   // 传到第 5 层就没人愿意维护了
```

### 3.4 调用下游时自动透传

```javascript
// src/http-client.js
const { traceContext, newSpanId, buildTraceparent } = require("./trace/context");
const logger = require("./logger-proxy");

async function request(url, options = {}) {
  const store = traceContext.getStore();
  const headers = { ...options.headers };

  if (store) {
    // ✅ 关键：traceId 保持不变，spanId 换成新的（代表「本次下游调用」这一段）
    //    下游收到后会把这个 spanId 当作它的 parentSpanId，父子关系就连上了
    const childSpanId = newSpanId();
    headers.traceparent = buildTraceparent({ traceId: store.traceId, spanId: childSpanId, sampled: true });

    // tracestate 用于传递厂商私有信息（可选）
    if (store.tracestate) headers.tracestate = store.tracestate;
  }

  const start = Date.now();
  try {
    // 内置 fetch 基于 undici，超时要用 AbortSignal.timeout（Node 17.3+）
    const res = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(options.timeout ?? 3000) });
    logger.info({ url, status: res.status, duration: Date.now() - start }, "下游调用完成");
    return res;
  } catch (err) {
    logger.error({ url, duration: Date.now() - start, err }, "下游调用失败");
    throw err;
  }
}

module.exports = { request };
```

```javascript
// axios 版：用拦截器统一注入，避免每个调用点都改
const axios = require("axios");
const client = axios.create({ timeout: 3000 });

client.interceptors.request.use((config) => {
  const store = traceContext.getStore();
  if (store) {
    config.headers.traceparent = buildTraceparent({
      traceId: store.traceId,
      spanId: newSpanId(),
      sampled: true,
    });
  }
  return config;
});
```

### 3.5 串联效果

```
用户报障："我刚才提交失败了"
前端控制台里的 x-trace-id: 4bf92f3577b34da6a3ce929d0e0e4736
        ↓
在日志平台搜 traceId:4bf92f3577b34da6a3ce929d0e0e4736
        ↓
一次搜索拿到跨 4 个服务的完整链路（按 time 排序）：

  time     service       spanId    parentSpanId  msg              duration status
  10:23:45 gateway       a1b2..    -             请求完成         1823     500
  10:23:45 todo-api      c3d4..    a1b2..        创建 Todo        -        -
  10:23:45 todo-api      c3d4..    a1b2..        调用用户服务     -        -
  10:23:46 user-service  e5f6..    c3d4..        查询用户资料     1500     504  ← 根因在这
  10:23:46 todo-api      c3d4..    a1b2..        下游调用失败     1521     -
  10:23:46 todo-api      c3d4..    a1b2..        请求处理失败     1650     500

  → 3 秒定位到 user-service 超时，而不是在 4 个服务的日志里手工比对时间戳 ✓

⚠️ 前提：所有服务用同一套 traceId 生成/继承规则，且都把 traceId 打进日志。
   有一个服务没接，链路就在那里断掉。
```

---

## 四、可观测性三支柱

### 4.1 三者的分工

| 维度 | **Logs**（日志） | **Metrics**（指标） | **Traces**（链路） |
| --- | --- | --- | --- |
| 回答的问题 | **发生了什么？** | **整体健康吗？趋势如何？** | **这次请求慢在哪一环？** |
| 数据形态 | 离散事件，高基数、非结构化字段多 | 时序数值，低基数标签 | 有父子关系的 span 树 |
| 粒度 | 单条（个例） | 聚合（全局） | 单次请求（跨服务） |
| 存储成本 | **高**（量最大） | **低**（预聚合） | 中（通常采样） |
| 保留时长 | 7~30 天 | 数月~数年 | 1~7 天 |
| 能否做告警 | 可以但不推荐（成本高、抖动大） | ✅ **告警的主要来源** | 一般不直接告警 |
| 典型工具 | ELK / Loki / 内部日志平台 | Prometheus + Grafana | Jaeger / Tempo / OpenTelemetry |
| 什么时候看 | 已经知道大概位置，要看细节和堆栈 | 想知道有没有问题、影响面多大 | 知道慢/错了，但不知道在哪一环 |

```
三者的关系：不是三选一，而是「漏斗式」协作

  Metrics  ──告警触发──>  发现「有问题、影响 3% 请求、集中在 /api/todos」
     │                                    │
     │ 低成本、全量、可长期保留             │ 缩小范围
     ▼                                    ▼
  Traces   ──────────>  定位「慢在 user-service 的 DB 查询这一段，占了 1.5s」
     │                                    │
     │ 采样、有结构、跨服务                 │ 定位到环节
     ▼                                    ▼
  Logs     ──────────>  看清「具体是哪条 SQL、什么参数、完整错误堆栈」
                        高成本、细节最全，靠 traceId 与 Traces 关联

  ❌ 只有 Logs：能看到个例，但不知道影响面（是 1 个用户还是 10 万个？）
  ❌ 只有 Metrics：知道慢了，但不知道慢在哪（P99 涨到 2s，然后呢？）
  ❌ 只有 Traces：知道哪一环慢，但看不到那一环内部的具体原因和错误细节
```

### 4.2 一个「线上变慢了」的完整排查案例

```
【T+0】告警：todo-api P99 从 180ms 涨到 2.3s，持续 5 分钟
       来源：Metrics（Histogram 算出的 P99）

【T+1min】看 Metrics 看板，先确定影响面和方向
   ├─ 错误率：0.02% → 没涨。说明「变慢但没失败」，不是下游挂了
   ├─ QPS：1200 → 1250，基本没变。排除流量突增
   ├─ 按 path 拆分 P99：只有 /api/todos 涨了，其他接口正常 → 范围收窄
   ├─ 事件循环延迟 P99：8ms → 正常。排除 CPU 密集/同步阻塞
   ├─ heap 使用率：62% → 正常。排除内存压力和频繁 GC
   └─ MySQL 连接池等待数：0 → 45 ⚠️ 找到可疑点
   结论方向：连接池不够用，请求在排队等连接

【T+3min】看 Traces，验证并定位到具体环节
   随机抽一条 /api/todos 的慢 trace（2.4s）：

     ├─ koa.request                            2400ms
     │   ├─ middleware.auth                       3ms
     │   ├─ mysql.pool.acquire               ⚠️ 1800ms   ← 等连接就花了 1.8s
     │   └─ mysql.query SELECT * FROM todos      580ms   ← 查询本身也变慢了
     │       (正常基线 25ms)

   → 两个现象叠加：单条查询变慢（25ms→580ms），导致连接被占更久，
     进而连接池排队。查询变慢是因，连接池排队是果。

【T+5min】看 Logs，拿到最后的细节
   用这条 trace 的 traceId 搜日志：
     {"traceId":"4bf9...","msg":"慢查询","sql":"SELECT * FROM todos WHERE user_id=? ORDER BY created_at DESC",
      "duration":580,"rows":48200}
   ⚠️ rows: 48200 —— 这个用户有 4.8 万条 todo，而 SQL 没有 LIMIT

   再看 Metrics 里的发布标记：T-20min 有一次发版
   查 Logs 里的 version 字段，慢查询全部来自新版本 v1.2.4

【结论】v1.2.4 移除了分页的 LIMIT（代码 review 漏了），
        大数据量用户触发全表扫描 → 单查询变慢 → 连接占用变长 → 连接池排队 → P99 恶化

【处置】回滚 v1.2.4（2 分钟），P99 恢复到 180ms；补 LIMIT + 索引后重新发布

📌 三支柱各自的不可替代性：
   - Metrics 让我们在 1 分钟内知道「有问题、什么范围、排除了哪些方向」
   - Traces 让我们在 3 分钟内知道「是 DB 环节，且是等连接 + 查询双慢」
   - Logs 让我们在 5 分钟内知道「具体是哪条 SQL、返回了 4.8 万行、来自哪个版本」
   缺任何一环，这次排查都会从 5 分钟变成几小时。
```

---

## 五、Metrics 实战

### 5.1 prom-client 暴露 /metrics

```javascript
// src/metrics.js
const client = require("prom-client");

// 全局标签：所有指标自动带上，便于在 Grafana 按服务/环境/版本切分
client.register.setDefaultLabels({
  service: process.env.SERVICE_NAME || "todo-api",
  env: process.env.NODE_ENV || "development",
  version: process.env.APP_VERSION || "unknown",
});

// ✅ 一行开启 Node 默认指标：事件循环延迟、heap、GC、活跃句柄、CPU……
// 这些是 Node 服务的健康基线，必须开
client.collectDefaultMetrics({
  // GC 耗时的直方图分桶（秒）
  gcDurationBuckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// ───────── 业务指标 ─────────

// Counter：只增不减，用于「次数」
const httpRequestTotal = new client.Counter({
  name: "http_requests_total",
  help: "HTTP 请求总数",
  labelNames: ["method", "route", "status"],
});

// Histogram：分桶统计分布，用于「耗时/大小」，可以算分位数
const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP 请求耗时（秒）",
  labelNames: ["method", "route", "status"],
  // ⚠️ 分桶要贴合业务实际耗时分布，桶选错了分位数就不准
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Gauge：可增可减，用于「当前状态量」
const dbPoolInUse = new client.Gauge({
  name: "db_pool_connections_in_use",
  help: "数据库连接池当前使用中的连接数",
});
const dbPoolWaiting = new client.Gauge({
  name: "db_pool_waiting_requests",
  help: "等待获取数据库连接的请求数", // ← 上面案例里的关键指标
});

const businessErrorTotal = new client.Counter({
  name: "business_error_total",
  help: "业务错误数",
  labelNames: ["code", "is_operational"],
});

module.exports = { client, httpRequestTotal, httpDuration, dbPoolInUse, dbPoolWaiting, businessErrorTotal };
```

```javascript
// src/middleware/metrics.js
const { httpRequestTotal, httpDuration } = require("../metrics");

function metricsMiddleware() {
  return async (ctx, next) => {
    const end = httpDuration.startTimer(); // 返回一个「结束并记录」的函数
    try {
      await next();
    } finally {
      // ⚠️ 关键：route 必须用「路由模板」而不是实际 path
      // ❌ ctx.path = '/api/todos/12345' → 每个 id 一个 label 值 → 标签基数爆炸
      //    Prometheus 里每个 label 组合是一条独立时序，百万用户 = 百万条时序 = 打挂监控
      // ✅ ctx._matchedRoute = '/api/todos/:id' → 基数固定
      const route = ctx._matchedRoute || "unmatched";
      const labels = { method: ctx.method, route, status: ctx.status };
      end(labels);
      httpRequestTotal.inc(labels);
    }
  };
}
module.exports = metricsMiddleware;
```

```javascript
// src/router/metrics.js —— 暴露采集端点
const Router = require("@koa/router");
const { client, dbPoolInUse, dbPoolWaiting } = require("../metrics");
const { sequelize } = require("../models");

const router = new Router();

router.get("/metrics", async (ctx) => {
  // Gauge 类指标在被采集时才取当前值（拉模型）
  const pool = sequelize.connectionManager.pool;
  if (pool) {
    dbPoolInUse.set(pool.using ?? 0);
    dbPoolWaiting.set(pool.pending ?? 0);
  }

  ctx.set("Content-Type", client.register.contentType);
  ctx.body = await client.register.metrics();
});

// ⚠️ /metrics 不要暴露到公网：它会泄漏内部路由、版本、实例信息
//    做法：监听独立端口（只在集群内可达），或加内网 IP 白名单
module.exports = router;
```

### 5.2 四种指标类型

| 类型 | 语义 | 能做的查询 | 适用场景 | 反例 |
| --- | --- | --- | --- | --- |
| **Counter** | 单调递增，只增不减（进程重启归零） | `rate()` 算速率、`increase()` 算增量 | 请求数、错误数、重试次数、降级次数 | ❌ 用来记「当前在线人数」（会减少） |
| **Gauge** | 瞬时值，可增可减 | 直接取当前值、`avg/max over_time` | 连接池使用数、队列长度、内存占用、在线人数 | ❌ 用来记「累计请求数」（重启丢失且无法算速率） |
| **Histogram** | 预设分桶累计计数 | `histogram_quantile()` 算 P50/P90/P99 | **请求耗时**、响应体大小、批处理条数 | ❌ 桶设成 `[1,2,3]` 而实际耗时都在 10ms 内（分位数全落第一个桶，毫无分辨率） |
| **Summary** | 客户端直接算好分位数 | 只能读预设的分位数 | 极少用 | ❌ **不能跨实例聚合**（10 个 Pod 的 P99 无法合并成集群 P99），有 Histogram 就别用它 |

```
Histogram vs Summary（面试常问）

  Histogram：客户端只上报「每个桶的计数」
    le=0.01 → 850,  le=0.05 → 980,  le=0.1 → 995,  le=+Inf → 1000
    服务端用 histogram_quantile() 插值算分位数
    ✅ 可跨实例相加后再算 → 能得到「整个集群的 P99」
    ⚠️ 分位数是「桶内线性插值」的估算值，精度取决于桶设置

  Summary：客户端直接上报 P50=12ms, P99=180ms
    ✅ 精确（在单实例内）
    ❌ 无法聚合：Pod A 的 P99=100ms 和 Pod B 的 P99=200ms
       没有任何数学方法能合并成集群 P99（分位数不满足可加性）
    ❌ 客户端计算开销更大

  → 生产环境：耗时类指标统一用 Histogram。
```

### 5.3 RED 方法

```
RED = 面向「请求驱动型服务」的三个黄金指标（Google SRE 的 Four Golden Signals 简化版）

  R - Rate      请求速率（QPS/RPM）
                → sum(rate(http_requests_total[1m]))
                → 回答「流量多大、有没有突增突降」

  E - Errors    错误率（不是错误绝对数！）
                → sum(rate(http_requests_total{status=~"5.."}[1m]))
                  / sum(rate(http_requests_total[1m]))
                → 回答「有多少比例的用户受影响」

  D - Duration  耗时分布（看分位数，不看平均值）
                → histogram_quantile(0.99,
                    sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
                → 回答「用户实际等了多久」

配套的 USE 方法（面向资源：CPU/内存/磁盘/连接池）：
  U - Utilization 利用率    E - Errors 错误    S - Saturation 饱和度（排队长度）

  → RED 看「服务对外的表现」，USE 看「资源内部的压力」
  → 上面的排查案例里，「连接池等待数 45」就是 Saturation 指标，它比 P99 更早暴露问题
```

### 5.4 Node 必监控的核心指标

| 指标 | Prometheus 名称（默认采集） | 为什么重要 | 告警阈值参考 |
| --- | --- | --- | --- |
| **事件循环延迟** | `nodejs_eventloop_lag_p99_seconds` | ⭐ **Node 最重要的健康指标**：单线程模型下，它一涨说明有同步代码阻塞了整个进程，所有请求都会变慢 | P99 > 100~200ms 持续 5 分钟 |
| heap 使用率 | `nodejs_heap_size_used_bytes` / `nodejs_heap_size_total_bytes` | 接近上限会频繁 Full GC（每次都 stop-the-world），再涨就 OOM | > 85% 持续 10 分钟 |
| GC 耗时 | `nodejs_gc_duration_seconds` | Full GC 是 stop-the-world 的，耗时直接转化为请求延迟毛刺 | P99 > 100ms 或频次异常上升 |
| 活跃句柄数 | `nodejs_active_handles_total` | 只增不降 = socket/文件/定时器泄漏 | 持续单调上升即告警 |
| 活跃请求数 | `nodejs_active_requests_total` | libuv 层未完成的异步请求，堆积说明 I/O 打不出去 | 持续上升 |
| 连接池使用/等待 | 自定义 Gauge | **比 P99 更早暴露问题**（排队先于变慢） | waiting > 0 持续 1 分钟 |
| RSS 内存 | `process_resident_memory_bytes` | 与容器 memory limit 对比，判断 OOMKill 风险 | > limit × 85% |
| 进程重启次数 | K8s / PM2 侧 | 崩溃循环的直接证据 | 出现即告警 |

```javascript
// 事件循环延迟：默认指标已包含，但理解原理很重要（面试常问）
const { monitorEventLoopDelay } = require("node:perf_hooks");

const h = monitorEventLoopDelay({ resolution: 10 }); // 每 10ms 采样一次
h.enable();

setInterval(() => {
  // 原理：定时器设定在 T 时刻触发，实际在 T+delta 才被执行，
  //       delta 就是事件循环的「拥堵程度」——它衡量的是
  //       「一个新任务从入队到被执行需要等多久」
  logger.info(
    {
      lagMeanMs: +(h.mean / 1e6).toFixed(2),
      lagP99Ms: +(h.percentile(99) / 1e6).toFixed(2),
      lagMaxMs: +(h.max / 1e6).toFixed(2),
    },
    "事件循环延迟",
  );
  h.reset();
}, 30_000).unref();

// 为什么它是 Node 最重要的指标：
// 其他语言的线程池模型下，一个慢请求只拖累它自己那个线程；
// Node 单线程下，任何同步阻塞（大 JSON.parse、同步 crypto、正则回溯、
// 大数组排序、同步文件读写）都会让「所有」在排队的请求一起变慢。
// 事件循环延迟就是这种阻塞的唯一直接观测手段。
```

### 5.5 为什么看 P99 而不是平均值

```
两组耗时数据（各 1000 个请求）：

  服务 A：990 个请求 10ms，10 个请求 5000ms
          平均 = (990×10 + 10×5000) / 1000 = 59.9ms   ← 看起来"还不错"
          P99  = 5000ms                                ← 真相：1% 的用户等了 5 秒

  服务 B：1000 个请求都是 60ms
          平均 = 60ms   ← 和 A 几乎一样
          P99  = 60ms   ← 但体验完全不同

  → 平均值把长尾完全抹平了。两个服务的平均值几乎相同，
    但 A 每天有 1% 的用户（可能是几万人）遭遇 5 秒卡顿。

平均值的三个致命问题：
  ① 被长尾稀释：极少数极慢请求对平均值影响很小，但对用户口碑影响极大
  ② 掩盖分布形态：双峰分布（缓存命中 5ms / 未命中 800ms）的平均值毫无意义
  ③ 无法定 SLO：SLO 的语义天然是分位数——「99% 的请求在 200ms 内完成」

该看哪个分位数：
  P50  典型体验（一半用户比这快）
  P90  多数用户的上限
  P99  ⭐ SLO 的常用锚点，长尾的主要观测点
  P999 极端长尾，大流量服务才有统计意义（1000 个请求才 1 个）
  max  单点毛刺，容易被单次 GC/网络抖动带偏，只做辅助

⚠️ 分位数不可相加：不能把 10 个 Pod 的 P99 求平均得到集群 P99。
   必须先把各实例的 Histogram 桶计数相加，再用 histogram_quantile 计算。
   这也是「耗时指标用 Histogram 不用 Summary」的根本原因。
```

---

## 六、OpenTelemetry

### 6.1 它解决什么问题

```
没有 OTel 的时代：
  日志用 pino + ELK，指标用 prom-client + Prometheus，链路用 Jaeger 客户端
  → 三套 SDK、三套上下文传播规则、三套采样配置
  → 换一个后端（Jaeger → Tempo）就要改业务代码
  → traceId 在三套系统里格式不一致，串不起来

OpenTelemetry（OTel）= CNCF 的可观测性统一标准：
  ① 统一 API/SDK：Traces + Metrics + Logs 一套 SDK
  ② 统一传播协议：W3C traceparent（就是第三章用的那个格式）
  ③ 统一导出协议：OTLP，换后端只改 exporter 配置，业务代码不动
  ④ 自动埋点（instrumentation）：monkey-patch 常用库，不改业务代码就有 span
```

### 6.2 Node SDK 自动埋点

```javascript
// src/tracing.js —— ⚠️ 必须在所有业务模块之前加载
// 原因：自动埋点靠 monkey-patch 模块导出实现，
//       如果 http/koa/mysql2 已经被 require 过，patch 就打不上了
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { TraceIdRatioBasedSampler, ParentBasedSampler } = require("@opentelemetry/sdk-trace-base");

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || "todo-api",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || "unknown",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
  }),

  traceExporter: new OTLPTraceExporter({
    // 通常指向同一 Pod 里的 otel-collector sidecar 或节点级 DaemonSet
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  }),

  // ───────── 采样策略 ─────────
  // ParentBased：上游已决定采样就跟随（保证一条链路要么全采要么全不采）
  //              根 span 才用 ratio 决定 —— 这点很关键，否则链路会采出「半截」
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(Number(process.env.OTEL_SAMPLE_RATIO ?? 0.1)),
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      // 健康检查/指标端点不要生成 span，否则 90% 的 trace 都是探针噪音
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) => /^\/(healthz|readyz|startupz|metrics)/.test(req.url || ""),
      },
      // fs 埋点会产生海量 span，生产必须关掉
      "@opentelemetry/instrumentation-fs": { enabled: false },
      // 这些默认开启即可：koa / express / mysql2 / ioredis / pg / graphql / grpc
    }),
  ],
});

sdk.start();

// 优雅退出时 flush 未发送的 span，否则最后一批 trace 会丢
process.on("SIGTERM", () => {
  sdk.shutdown().catch(() => {});
});
```

```javascript
// package.json —— 用 --require 保证 tracing 最先加载，比在 server.js 顶部 require 更可靠
{
  "scripts": {
    "start": "node --require ./src/tracing.js src/server.js"
  }
}
```

自动埋点覆盖的常见库：

| Instrumentation | 自动产生的 span | 附带属性 |
| --- | --- | --- |
| `instrumentation-http` | 入站请求、出站请求 | method、url、status_code；**自动注入/解析 `traceparent`** |
| `instrumentation-koa` | 每个中间件一个 span | 中间件名、路由模板 |
| `instrumentation-express` | 每层 router / middleware | 路由路径 |
| `instrumentation-mysql2` | 每条 SQL | `db.statement`（SQL 模板，参数默认不带）、db.name |
| `instrumentation-ioredis` | 每个 Redis 命令 | 命令名、key |
| `instrumentation-pg` | 每条 SQL | 同 mysql2 |

### 6.3 手动创建 span

自动埋点只覆盖 I/O 边界，**业务逻辑内部的耗时**要手动埋。

```javascript
const { trace, SpanStatusCode, context } = require("@opentelemetry/api");

const tracer = trace.getTracer("todo-api", process.env.APP_VERSION);

async function batchImportTodos(userId, rows) {
  // startActiveSpan 会自动把 span 设为当前上下文，内部的自动埋点 span 自动成为它的子 span
  return tracer.startActiveSpan("batchImportTodos", async (span) => {
    try {
      // 属性用于在 Trace UI 里过滤和分析（如「只看 rows > 1000 的慢 trace」）
      span.setAttribute("todo.batch_size", rows.length);
      span.setAttribute("enduser.id", String(userId));

      const validated = await tracer.startActiveSpan("validate", async (s) => {
        try {
          return rows.filter(isValid); // 纯 CPU 计算，自动埋点看不到，必须手动埋
        } finally {
          s.end();
        }
      });

      span.setAttribute("todo.valid_count", validated.length);

      // 这里的 mysql span 由自动埋点产生，会自动挂在 batchImportTodos 之下
      await Todo.bulkCreate(validated);

      // 事件（event）：span 生命周期内的时间点标记
      span.addEvent("import_completed", { count: validated.length });
      span.setStatus({ code: SpanStatusCode.OK });
      return validated.length;
    } catch (err) {
      // ✅ 错误必须同时做这三件事，否则 Trace UI 里看不出这个 span 失败了
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      // ⚠️ span.end() 必须在 finally 里：漏掉会导致 span 永远不上报，链路缺一环
      span.end();
    }
  });
}
```

### 6.4 与日志的关联

```javascript
// 把 OTel 的 traceId/spanId 注入 pino，让 Logs 和 Traces 能互相跳转
const { trace } = require("@opentelemetry/api");

const logger = pino({
  mixin() {
    // mixin 在每条日志写入时调用，取当前 active span 的上下文
    const span = trace.getActiveSpan();
    if (!span) return {};
    const { traceId, spanId, traceFlags } = span.spanContext();
    return { traceId, spanId, sampled: (traceFlags & 1) === 1 };
  },
});

// 效果：
// ① 在 Trace UI 上看到某个 span 慢/报错 → 复制 traceId → 跳到日志平台看细节
// ② 在日志里看到一条 error → 复制 traceId → 跳到 Trace UI 看完整调用链
// 这就是「三支柱靠 traceId 缝合」的落地方式

// 📌 与第三章手写方案的关系：
//    接了 OTel 之后，traceId 的生成、继承、透传都由 instrumentation-http 自动完成，
//    第三章的手写 ALS 方案可以退化成「只负责把 logger 挂到上下文」，
//    或者直接用这里的 mixin 替代。手写方案的价值在于：
//    ① 理解原理（面试必问）② 不接 OTel 的小项目里够用
```

### 6.5 采样策略

| 策略 | 决策时机 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **头部采样**（head-based） | 链路**开始时**就决定采不采（如 10% 概率） | 实现简单、开销低、SDK 原生支持 | **可能漏掉慢/错的 trace**——出问题的那次刚好没被采到 |
| **尾部采样**（tail-based） | 链路**结束后**，由 Collector 看完整数据再决定 | 可以「只保留出错的和慢的」，命中率极高 | 需要 Collector 缓存所有 span（内存开销大），且要求所有 span 汇聚到同一 Collector 实例 |

```
生产推荐组合：头部采样宽松放行 + Collector 侧尾部采样精选

  应用侧：ParentBased(root: TraceIdRatio(1.0))  ← 全采，把决策权交给 Collector
       ↓ 全量 span 发到 Collector
  Collector 侧 tail_sampling processor：
       ├─ 有 error 状态的 → 100% 保留
       ├─ 耗时 > 1s 的    → 100% 保留
       └─ 其余正常的      → 抽 5%
       ↓
  存储成本可控，且「所有异常 trace 都在」

⚠️ ParentBased 的重要性：
  ❌ 如果每个服务独立按 10% 概率采样：
     5 个服务的链路完整保留概率 = 0.1^5 = 0.001% → 几乎永远拿不到完整链路
  ✅ ParentBased：根节点决定后，下游全部跟随 → 要么完整保留，要么完整丢弃
```

```yaml
# otel-collector-config.yaml —— 尾部采样配置
processors:
  tail_sampling:
    decision_wait: 10s # 等 10s 收齐一条 trace 的所有 span 再决策
    num_traces: 50000 # 内存中缓存的 trace 数上限
    policies:
      - name: keep-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: keep-slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: sample-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

---

## 七、容器环境的日志实践

### 7.1 日志写 stdout，不写文件

```
12-Factor App 第 11 条：把日志当作事件流（Treat logs as event streams）
  → 应用不应该关心日志的路由和存储，只把日志作为事件流写到 stdout/stderr

  ┌──────────────┐        ┌──────────────┐       ┌──────────────┐
  │ Node 进程     │ stdout │ 容器运行时    │       │ 采集 agent    │
  │ logger.info  ├───────>│ 写入          ├──────>│ Fluent Bit /  │
  │              │ stderr │ /var/log/     │ tail  │ Promtail /    │
  └──────────────┘        │ containers/*  │       │ Vector        │
                          └──────────────┘       └──────┬───────┘
                                                        │
                                                        ▼
                                              ELK / Loki / 日志平台

✅ 写 stdout 的好处：
  ① 应用零配置，换日志后端不改代码
  ② 容器是无状态的、可随时销毁的，写进容器文件系统的日志会随容器一起消失
  ③ kubectl logs 直接可用，排查最快路径
  ④ 不需要挂 volume，不需要管权限和磁盘配额

❌ 在容器里写文件的问题：
  ① 容器销毁日志就丢（除非挂 PV，但那又引入有状态依赖）
  ② 写满容器可写层 → 节点磁盘压力 → Pod 被驱逐（DiskPressure）
  ③ kubectl logs 看不到，排查要 exec 进容器 cat 文件
  ④ 多副本时日志散在各个 Pod 里，无法聚合
```

```javascript
// ✅ 容器环境：直接写 stdout，不加任何 transport
const logger = pino(); // 默认就是 process.stdout，这是最快的路径

// ❌ 容器环境不要这样
const logger = pino(pino.destination("/var/log/app.log")); // 容器销毁即丢失

// ⚠️ 级别路由：error 走 stderr 便于区分（可选，多数平台按 level 字段区分即可）
const logger = pino(
  { level: "info" },
  pino.multistream([
    { level: "info", stream: process.stdout },
    { level: "error", stream: process.stderr },
  ]),
);
```

### 7.2 不要在容器里做日志切割

```
❌ 在容器里跑 pino-roll / winston-daily-rotate-file / logrotate

  问题①：职责重复 —— 容器运行时（Docker json-file 驱动 / containerd）
         已经在做切割和保留了，再切一层纯属浪费 CPU 和 I/O
  问题②：切割需要写文件，与「写 stdout」的原则冲突
  问题③：logrotate 需要 cron，容器里跑 cron 违反「一个容器一个进程」
  问题④：切割/压缩是同步阻塞操作，在 Node 单线程里会顶到事件循环

✅ 正确分工

  应用层：只管把 JSON 写到 stdout
  容器运行时：负责切割与本地保留上限
  采集 agent：负责收集与转发
  日志平台：负责长期存储、索引、生命周期（ILM）

  # Docker：在 daemon.json 或 run 参数里配
  --log-opt max-size=100m --log-opt max-file=3

  # K8s：由 kubelet 配置（节点级，业务无需关心）
  # containerLogMaxSize: 100Mi
  # containerLogMaxFiles: 5
```

### 7.3 多行日志（错误堆栈）的收集问题

```
❌ 问题：一个错误堆栈在 stdout 里是多行的

  Error: connect ETIMEDOUT
      at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1146:16)
      at Object.getUser (/app/src/service/user.js:23:11)
      at async createTodo (/app/src/service/todo.js:45:20)

  采集 agent 默认「一行 = 一条日志」，上面会被拆成 4 条独立记录：
    ① 只有第一行有 level/traceId，后 3 行是孤立的无字段文本
    ② 日志平台里堆栈被打散，顺序还可能因为并发写入而错乱
    ③ 无法按 traceId 检索到完整堆栈

✅ 方案一（推荐）：让堆栈成为 JSON 的一个字段值

  pino 的 err 序列化器把 stack 放进字符串字段，换行符被转义成 \n：
  {"level":"error","traceId":"4bf9...","err":{"type":"Error",
   "message":"connect ETIMEDOUT",
   "stack":"Error: connect ETIMEDOUT\n    at TCPConnectWrap...\n    at Object.getUser..."}}
                                      ↑ 转义的 \n，物理上仍是一行
  → 天然单行，采集零配置，日志平台展示时按 \n 渲染成多行 ✓
  → 这是「结构化日志」相比 console.error 的又一个实质优势

✅ 方案二：采集侧配多行合并规则（仅在无法改应用时用）
  按「行首是否匹配时间戳/JSON 起始符」判断是否为新记录
```

```yaml
# Fluent Bit：解析 JSON 日志 + 兜底的多行合并
[FILTER]
    Name         parser
    Match        kube.*
    Key_Name     log
    Parser       json
    Reserve_Data On

[FILTER]
    Name                  multiline
    Match                 kube.*
    multiline.key_content log
    # 兜底：处理未 JSON 化的裸堆栈（如第三方库直接 console.error 的）
    multiline.parser      go, java, python
```

```javascript
// ⚠️ 第三方库绕过你的 logger 直接 console.log 怎么办？
// 用 pino 接管 console，把裸输出也变成结构化单行日志
const logger = require("./logger");
if (process.env.NODE_ENV === "production") {
  console.log = (...args) => logger.info({ via: "console" }, args.map(String).join(" "));
  console.warn = (...args) => logger.warn({ via: "console" }, args.map(String).join(" "));
  console.error = (...args) => logger.error({ via: "console" }, args.map(String).join(" "));
  console.debug = (...args) => logger.debug({ via: "console" }, args.map(String).join(" "));
}
// 附带收益：解决了第一章说的「console.log 同步阻塞」问题——
// 所有输出都走 pino 的异步写入路径
```

---

## 生产实践清单

### 必须做（Must）

- [ ] 生产环境禁用 `console.log`，统一走 pino（或在入口用 pino 接管 `console`）
- [ ] 日志输出 JSON，`msg` 固定不拼变量，变量一律放独立字段
- [ ] 必备字段齐全：`time` / `level` / `msg` / `traceId` / `service` / `env` / `version` / `hostname`
- [ ] 耗时字段是**数字**（`duration: 234`）而不是字符串（`"234ms"`），否则无法算 P99
- [ ] 配 `redact` 脱敏：`authorization` / `cookie` / `password` / `*.token` / 身份证 / 手机号；关键路径改用**白名单**记录请求体
- [ ] 日志级别从环境变量读，支持线上临时开 `debug`
- [ ] traceId 用 **32 位 hex**（W3C 规范），不要用 `randomUUID()`
- [ ] 入口中间件解析并**继承** `traceparent`，格式校验 + 全 0 校验，不可信外部值直接丢弃重新生成
- [ ] traceId 回写响应头（`traceparent` + `x-trace-id`），方便用户报障时直接提供
- [ ] 用 `AsyncLocalStorage` + `logger.child()` 让业务代码零侵入拿到 traceId
- [ ] 调用下游时透传 `traceparent`（traceId 不变、spanId 新建），用拦截器统一注入
- [ ] 暴露 `/metrics`，开启 `collectDefaultMetrics()`
- [ ] `/metrics` 与健康检查端点**不生成 trace span**，且 `/metrics` 不暴露到公网
- [ ] Histogram 的 label 用**路由模板**（`/api/todos/:id`）而非实际 path，防止标签基数爆炸
- [ ] 耗时指标用 **Histogram 不用 Summary**（Summary 无法跨实例聚合）
- [ ] 监控 RED 三指标 + Node 核心指标（**事件循环延迟**、heap、GC、活跃句柄、连接池等待数）
- [ ] 告警看 P99 而不是平均值；分位数不做跨实例平均
- [ ] OTel 的 `tracing.js` 用 `node --require` 在所有业务模块**之前**加载
- [ ] OTel 采样用 `ParentBasedSampler`，关掉 `instrumentation-fs`
- [ ] 手动 span 的 `end()` 写在 `finally`；错误时 `recordException` + `setStatus(ERROR)`
- [ ] 用 pino `mixin` 把 OTel 的 traceId/spanId 注入日志，实现 Logs ↔ Traces 互跳
- [ ] 容器内日志只写 stdout/stderr，**不写文件、不在容器内做切割**
- [ ] 错误堆栈作为 JSON 字段值（转义 `\n`）保持单行，避免多行日志被拆散
- [ ] 退出前 flush 日志（见错误处理那篇的 `pino.final()` / `flushSync()`）

### 常见踩坑

| 现象 | 根因 | 解法 |
| --- | --- | --- |
| 本地跑很快，上线后接口整体变慢 | stdout 指向管道/文件时 `console.log` 是同步写，阻塞事件循环 | 换 pino（异步 transport）；接管 `console` |
| 日志采集组件卡住，业务接口全部变慢 | stdout 管道缓冲区满，同步 `write` 阻塞 | 同上；并给采集侧扩容/限速 |
| 想算接口 P99，只能写正则从文本抠数字 | 日志非结构化，耗时是拼在字符串里的 | 输出 JSON，`duration` 作为数字字段 |
| 日志平台里同类日志无法聚合统计 | `msg` 里拼了变量，每条都不一样 | `msg` 固定，变量放字段 |
| 日志里出现明文密码/Token | 直接 `logger.info(req.body)`，或 `redact` 路径没覆盖到 | 补 `redact`；关键路径改白名单 |
| 配了 `redact` 还是漏了敏感字段 | `redact` 只命中声明过的路径，字段名不规范就漏 | 统一字段命名 + 白名单兜底 |
| 跨服务排查时链路断成好几段 | 每个服务都自己生成新 traceId，没继承上游 | 解析 `traceparent` 并沿用其 traceId |
| traceId 被网关/其他语言服务丢弃 | 用了 `randomUUID()`（36 字符带连字符），不符合 W3C 的 32 位 hex | 用 `randomBytes(16).toString('hex')` |
| 业务函数签名里到处传 `traceId` | 没用 AsyncLocalStorage | ALS + child logger |
| 定时任务的日志没有 traceId | ALS store 为空 | 任务入口也 `run()` 一个上下文，或退回全局 logger |
| Prometheus 被打挂 / 查询极慢 | label 里放了 userId、实际 path 等高基数值 | 只用低基数 label（路由模板、状态码、方法） |
| 10 个 Pod 的 P99 求平均，数值明显不对 | 分位数不满足可加性 | 先合并 Histogram 桶计数，再 `histogram_quantile` |
| P99 算出来只有两三个档位 | Histogram 桶设置与实际耗时分布不匹配 | 按实际分布重设 buckets |
| Trace UI 里 90% 都是 `/healthz` 的 span | 没过滤健康检查端点 | 配 `ignoreIncomingRequestHook` |
| Trace 里 span 数量爆炸、Collector OOM | `instrumentation-fs` 开着，每次文件读写都生成 span | 关掉 fs instrumentation |
| OTel 装了但完全没有 span | `tracing.js` 加载晚于业务模块，monkey-patch 打不上 | 用 `node --require ./src/tracing.js` |
| 采样率 10%，跨 5 服务几乎拿不到完整链路 | 每个服务独立按概率采样（0.1^5） | `ParentBasedSampler`，根节点决策后下游跟随 |
| 出问题的那次 trace 恰好没被采到 | 纯头部采样 | 应用侧全采 + Collector 尾部采样（保留 error/慢的） |
| 日志里少一环，某个 span 永远不上报 | 手动 span 漏了 `end()`，或异常路径跳过了 | `end()` 放 `finally` |
| 容器重启后日志全没了 | 日志写进了容器文件系统 | 只写 stdout |
| Pod 被以 DiskPressure 驱逐 | 容器内写日志文件写满可写层 | 只写 stdout；切割交给运行时 |
| 错误堆栈在日志平台里被拆成好几条 | 多行文本被采集 agent 按行拆分 | 堆栈作为 JSON 字段值（`\n` 转义）保持单行 |
| 进程崩溃时最关键的 fatal 日志丢了 | 异步 transport 的 buffer 未 flush 就 exit | `pino.final()` / `flushSync()` |
| 高并发下日志的 traceId 串号 | 用模块级变量存 traceId，被后续请求覆盖 | 用 `AsyncLocalStorage`（见第三章） |
| 内存缓慢上涨 | 每个请求都 `pino()` 新建 logger 实例 | logger 保持单例，请求级只用 `child()` |
| 热路径日志把服务拖慢 | 在高频循环里打 `info` 级日志 | 热路径日志降为 `trace` 并默认关闭 |

### 排查手册

| 看什么指标 | 用什么工具 | 定位到代码 | 怎么验证 |
| --- | --- | --- | --- |
| **事件循环延迟** P99 突增 | Grafana `nodejs_eventloop_lag_p99_seconds` | 有同步阻塞：大 `JSON.parse`、同步 crypto、正则回溯、大数组排序、`*Sync` 文件 API | 用 `node --cpu-prof` 或 `--inspect` 抓 CPU profile，找占满主线程的同步栈；改异步/分片后延迟回落 |
| P99 涨但错误率不涨 | RED 看板按 route 拆分 | 「变慢但没失败」→ 优先查 DB/下游耗时与连接池饱和度 | 抽慢 trace 看哪个 span 变长 |
| P99 和错误率同时涨 | RED 看板 + 熔断器指标 | 下游故障或自身资源耗尽 | 看下游服务的 RED；看熔断器是否 open |
| heap 使用率持续上升不回落 | `nodejs_heap_size_used_bytes` 趋势 | 内存泄漏：全局缓存无上限、监听器未移除、闭包持有大对象 | 取两次 heap snapshot 做 diff，看增长的对象类型 |
| GC 耗时/频次异常 | `nodejs_gc_duration_seconds` | 短命大对象过多，或 heap 接近上限 | 调 `--max-old-space-size` 或减少大对象分配后观察 |
| 活跃句柄数单调上升 | `nodejs_active_handles_total` | socket/定时器/文件句柄泄漏 | `process.getActiveResourcesInfo()` 看类型；`why-is-node-running` 定位 |
| 连接池 waiting > 0 | 自定义 Gauge | 慢查询占用连接过久，或池 size 配置过小 | 看慢查询日志的 `duration` 与 `rows` |
| 单个用户报障 | 拿他的 `x-trace-id`，在日志平台按 traceId 搜 | 时间序列里最后一条 error 的 `err.cause` 链 | 用同参数重放请求 |
| 某接口的慢请求分布 | Trace UI 按 service + latency > 阈值 过滤 | 火焰图上最宽的那个 span | 优化后该 span 耗时下降 |
| 问题是否由某次发布引入 | 日志/指标按 `version` 标签拆分 | 只在新 version 出现 → 查该版本 diff | 回滚后指标恢复即确认 |
| 日志量/成本突增 | 日志平台的写入量趋势 | 按 `msg` + `level` 聚合找 Top 来源 | 加采样或降级别后写入量回落 |
| 链路某环节完全没有数据 | Trace UI 看 span 是否缺失 | 该服务未接 OTel，或 `tracing.js` 加载顺序错 | 补接后链路应完整贯通 |

**「线上变慢了」的标准排查顺序**（三支柱各司其职，对应第 4.2 节的完整案例）：

| 步骤 | 看什么 | 用哪个支柱 | 能得到什么结论 |
| --- | --- | --- | --- |
| 1 | 是全局变慢还是某接口变慢 | **Metrics**（按 route 分组的 Duration P99） | 缩小到具体接口或确认全局问题 |
| 2 | 事件循环延迟是否同步飙升 | **Metrics** | 飙升 → 主线程被同步代码阻塞；平稳 → 是 I/O 等待 |
| 3 | 错误率有没有跟着涨 | **Metrics** | 不涨 → 「变慢但没失败」，查下游耗时与连接池饱和度 |
| 4 | 慢在哪一段 | **Traces**（挑一条慢链路看 span 瀑布） | 定位到 DB、下游还是本地计算 |
| 5 | 那一段发生了什么 | **Logs**（用 traceId 捞出全部日志） | 拿到 SQL、参数、行数、错误堆栈 |
| 6 | 是否需要函数级定位 | Profiling（`--cpu-prof` / 火焰图） | 定位到具体热点函数 |

关键：**Metrics 用来发现和定界，Traces 用来定位，Logs 用来看细节**。顺序反了就会陷入「捞了一堆日志但不知道该看哪条」。

---

## 面试常见问答

**Q1：为什么生产环境不能用 `console.log`？**

最要命的一点是它可能同步阻塞。Node 对 stdout 的写入方式取决于目标：指向 TTY 时是异步的，所以本地开发完全无感；但指向文件或管道时是**同步**的，而生产环境恰恰就是管道（容器日志驱动）或文件。单线程模型下，同步 write 会占住唯一的 JS 线程，事件循环停转，所有请求一起排队。我见过的典型故障链是「日志采集 agent 处理慢 → 管道缓冲区填满 → `write` 阻塞 → 业务接口全部变慢」。除此之外还有四个问题：没有级别，线上没法只留 warn 以上；没有结构，`"耗时 234ms"` 这种文本无法被聚合成 P99；没有采样，一个高频 Bug 每秒打一千条能把日志成本和磁盘打爆；没有脱敏，`console.log(req.body)` 直接把密码明文落盘。换成 pino 后这五个问题一次性都解决了。

**Q2：pino 为什么比 winston 快？**

两个机制上的差异。第一是序列化预编译：pino 在初始化时根据声明的字段生成专用的序列化函数，而不是每条日志都走通用的 `JSON.stringify` 加 format 链遍历。第二是更关键的——pino 的 transport 跑在**独立的子进程或 worker thread** 里，主线程只做最小的序列化然后写进一个带缓冲的异步写入器就返回了，格式化、分文件、发 Loki/ES 这些重活都不占业务线程；winston 的 format 链是在主线程里逐条执行的。另外 pino 内置了 `redact` 脱敏，也是编译期生成路径访问代码，比自己写 format 便宜。所以容器环境下 pino 的最佳配置其实是「不加任何 transport，直接写 stdout」，那是最短的路径。我不会去背「快 N 倍」这种数字，说清机制差异更有说服力。

**Q3：一个请求跨了 5 个服务，你怎么把日志串起来？**

靠 traceId 加 W3C Trace Context 标准。入口先看请求头有没有合法的 `traceparent`，格式是 `00-{32位hex traceId}-{16位hex spanId}-{flags}`；有就**沿用它的 traceId**、把它的 spanId 当作自己的 parentSpanId、自己生成新 spanId；没有就新建一个 traceId 作为链路起点。这里最常见的错误是每个服务都自己生成新 traceId，那链路就断成 5 段，等于白埋。然后用 `AsyncLocalStorage` 把 traceId 存进请求上下文，配合 `logger.child({ traceId })` 生成子 logger，业务代码调 `logger.info({ userId })` 时完全不用关心 traceId，也不用把 ctx 一路往下传——不然传到第五层就没人愿意维护了。调下游时在拦截器里统一注入 `traceparent`，traceId 保持不变、spanId 换新的，这样父子关系就连上了。还有个实用细节是把 traceId 回写到响应头，用户报障时直接从浏览器控制台复制给你，一次搜索就能拿到跨 4 个服务的完整链路。ALS 的机制本身在《Node.js 现代特性》那篇有完整示例，这里是它的工程化用法。

**Q4：Logs、Metrics、Traces 分别解决什么问题？接口变慢了先看哪个？**

三者是漏斗式协作，不是三选一。Metrics 是聚合的时序数值，成本最低、可以长期保留，回答「整体健康吗、影响面多大」，是**告警的主要来源**。Traces 是有父子关系的 span 树，回答「这次请求慢在哪一环」。Logs 是离散事件，细节最全但成本最高，回答「具体是什么原因、完整堆栈是什么」。接口变慢的标准路径是 Metrics → Traces → Logs：先看 Metrics 确定影响面和排除方向，比如错误率没涨说明不是下游挂了、事件循环延迟正常说明不是同步阻塞、连接池等待数从 0 涨到 45 就找到可疑点了；再抽一条慢 trace，看到是等连接花了 1.8 秒加查询本身 580 毫秒；最后用 traceId 搜日志，看到那条 SQL 返回了 4.8 万行且没有 LIMIT，再对比 version 字段确认是某次发版引入的。缺任何一环，这个排查都会从五分钟变成几小时——只有 Logs 就不知道影响面，只有 Metrics 就不知道慢在哪，只有 Traces 就看不到那一环内部的具体原因。

**Q5：Node 应用最该监控什么指标？为什么看 P99 不看平均值？**

最重要的是**事件循环延迟**，这是 Node 特有的关键健康指标。其他语言的线程池模型下一个慢请求只拖累它自己那个线程，Node 单线程下任何同步阻塞——大 JSON.parse、同步 crypto、正则回溯、`*Sync` 文件 API——都会让所有排队的请求一起变慢，而事件循环延迟是这种阻塞唯一的直接观测手段。其次是 heap 使用率和 GC 耗时（接近上限会频繁 Full GC，而 Full GC 是 stop-the-world 的，直接转化为延迟毛刺）、活跃句柄数（只增不降就是泄漏）、连接池使用与等待数（它比 P99 更早暴露问题，排队先于变慢）。业务层面用 RED 三指标：Rate、Errors（用比率不用绝对数）、Duration。至于为什么看 P99：平均值会把长尾完全抹平。990 个请求 10ms、10 个请求 5 秒，平均只有 60ms 看起来还不错，但每天有 1% 的用户——可能几万人——遭遇 5 秒卡顿。而且双峰分布（缓存命中 5ms、未命中 800ms）的平均值毫无意义，SLO 的语义本身也是分位数。补一个容易踩的坑：分位数不满足可加性，不能把 10 个 Pod 的 P99 求平均得到集群 P99，必须先把各实例的 Histogram 桶计数相加再算——这也是耗时指标要用 Histogram 而不是 Summary 的根本原因，Summary 在客户端就把分位数算完了，跨实例根本没法合并。

---

## 关联笔记

- [Node.js 现代特性（Node 22 LTS）](../Node.js现代特性与新API.md) —— 第四章有 `AsyncLocalStorage` 的机制原理与完整 traceId 透传示例；**本篇第三章是它的延伸**：那篇讲「ALS 这个 API 怎么用」，本篇讲「怎么把它做成跨服务的日志追踪方案」（生成/继承规则、W3C traceparent、下游透传、child logger）
- [Node 错误处理与异常兜底体系](./Node错误处理与异常兜底体系.md) —— 那篇讲错误「记什么」（分类、字段、告警策略），本篇讲「怎么记」（pino 配置、序列化、脱敏）；退出前的日志 flush 在那篇第 4.3 节
- [优雅退出与健康检查](./优雅退出与健康检查.md) —— 本篇的 `/metrics` 与探针端点需要一起排除出 trace 采样；探针语义见那篇第五章
- [Node 应用部署与进程守护](./Node应用部署与进程守护.md) —— 本篇第七章「日志写 stdout」的另一半是那篇的容器化实践与 12-Factor 配置管理
- [Node.js 事件循环详解](../Node.js事件循环详解.md) —— 本篇第 5.4 节「事件循环延迟」为什么是核心指标，其原理基础在那篇
- [Node.js 面试核心知识点](../Node.js面试核心知识点.md) —— Q5 讲了内存泄漏排查工具，可与本篇的排查手册对照
- [生产运维专题索引](./README.md) —— 本模块四篇的推荐阅读顺序
