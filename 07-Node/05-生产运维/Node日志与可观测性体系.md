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

<!--PART2-->
