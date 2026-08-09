# Node 应用部署与进程守护

> Node 服务从「本地能跑」到「生产可用」之间，隔着托管形态选型、进程守护、镜像构建、内存配额、配置管理和发布策略六道关。这一篇讲清每道关的判断依据和常见错误组合。

## 面试高频考点

1. **PM2、Docker、K8s 三种形态怎么选？容器里还要不要用 PM2 cluster？**
2. **`pm2 reload` 和 `pm2 restart` 有什么区别？**
3. **Node 的 Dockerfile 有哪些必做优化？为什么需要 `--init` 或 `dumb-init`？**
4. **容器设了 memory limit，为什么 Node 还是被 OOMKill？**
5. **配置怎么管？`.env` 能不能进镜像？**

---

## 一、三种托管形态的选型

### 1.1 对比表

| 维度 | **PM2 裸机 / VM** | **Docker 单机** | **K8s 编排** |
| --- | --- | --- | --- |
| 多核利用 | PM2 cluster 起 N 个 worker | 单容器单进程，或 compose 起多容器 | 扩副本数（Pod） |
| 进程守护 | PM2 自身 | Docker `--restart` 策略 | kubelet + ReplicaSet |
| 弹性伸缩 | ❌ 手动改 `instances` | ❌ 手动改 compose | ✅ HPA 按 CPU/QPS 自动扩缩 |
| 故障自愈 | ⚠️ 进程级（机器挂了没救） | ⚠️ 容器级（宿主挂了没救） | ✅ 跨节点重新调度 |
| 零停机发布 | ✅ `pm2 reload` | ⚠️ 需自己编排（起新容器再切流量） | ✅ RollingUpdate 原生支持 |
| 灰度 / 金丝雀 | ❌ 基本做不了 | ❌ 需外部网关配合 | ✅ 多 Deployment + 流量比例 / Service Mesh |
| 环境一致性 | ❌ 依赖宿主的 Node 版本、系统库 | ✅ 镜像即环境 | ✅ 镜像即环境 |
| 健康检查 | ⚠️ 只有进程存活，无 HTTP 探针语义 | ⚠️ `HEALTHCHECK` 能力有限 | ✅ liveness/readiness/startup 三种语义 |
| 资源隔离 | ❌ 进程间抢 CPU/内存 | ✅ cgroup 限制 | ✅ requests/limits |
| 运维成本 | 低（学一个 CLI） | 中 | **高**（需要平台或 SRE 支撑） |
| 适用规模 | 内部工具、小站点、单机脚本 | 单机部署、开发/测试环境 | 多服务、多副本、需要弹性的线上业务 |

```
选型决策路径

  有没有现成的 K8s 平台（公司提供 / 云托管）？
    ├─ 有 ──> 直接上 K8s，不要自建 PM2 集群
    │         理由：故障自愈、弹性、灰度、观测都是平台白送的，
    │               自己用 PM2 重新造这些能力性价比极低
    │
    └─ 没有 ──> 服务重要吗？需要弹性吗？
                 ├─ 内部工具 / 单机就够 ──> PM2（或 Docker + restart 策略）
                 │                          最省心，别过度工程
                 └─ 线上核心业务 ──> 想办法上 K8s / 云容器服务
                                     单机方案没有跨机自愈，机器挂了就是全站挂
```

### 1.2 容器化之后不要再用 PM2 cluster

这是新手最常见的错误组合：把「PM2 管多进程」和「容器编排管多副本」叠在一起。

```
❌ 错误组合：一个容器里跑 PM2 cluster 起 4 个 worker，K8s 再起 3 个 Pod
   → 实际是 12 个 Node 进程，分布在 3 个容器里

  问题① 资源限制失效
    容器 limit 设 1 CPU / 1Gi 内存，PM2 却按 os.cpus() 起了 16 个 worker
    （因为 os.cpus() 返回的是**宿主机**核数，不是 cgroup 配额）
    → 16 个进程抢 1 个 CPU，上下文切换开销吃掉大半算力
    → 16 个 V8 堆共享 1Gi，每个都以为自己能用很多 → OOMKill

  问题② 健康检查语义错乱
    K8s 探针探的是容器的 3000 端口。PM2 主进程活着、端口在监听，
    但里面 4 个 worker 可能全崩了（PM2 正在重启它们），
    探针依然返回 200 → K8s 认为一切正常，实际上请求全失败

  问题③ 信号传递多一层
    K8s → SIGTERM → PM2 主进程 → 转发给 worker
    PM2 的 kill_timeout 和 K8s 的 terminationGracePeriodSeconds
    要同时对齐，配错一个就退不干净

  问题④ 弹性伸缩两套机制打架
    HPA 想按 CPU 扩 Pod，PM2 内部又有自己的进程数
    → 扩容粒度混乱，容量规划无法计算

  问题⑤ 日志和观测多一层
    PM2 会给日志加自己的前缀、写自己的日志文件，
    破坏「JSON 写 stdout」的容器日志约定

✅ 正确组合：一个容器一个 Node 进程，扩缩容交给编排层

  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ Pod 1       │ │ Pod 2       │ │ Pod 3       │
  │ 1 × node    │ │ 1 × node    │ │ 1 × node    │  ← 进程模型极简
  │ 0.5 CPU     │ │ 0.5 CPU     │ │ 0.5 CPU     │  ← 资源账算得清
  │ 512Mi       │ │ 512Mi       │ │ 512Mi       │
  └─────────────┘ └─────────────┘ └─────────────┘
       ↑                ↑                ↑
       └────────── HPA 按指标扩到 N 个 ───┘

  好处：
    ① 一个容器一个进程，符合容器设计哲学，`CMD ["node", "src/server.js"]`
    ② 探针直接反映这个进程的真实状态，语义准确
    ③ 信号直达 Node 进程（配合 --init 处理 PID 1）
    ④ 资源账清晰：1 Pod = 1 进程 = 0.5 CPU，容量规划直接乘副本数
    ⑤ 扩缩容只有 HPA 一套机制
```

> [!important] 面试要点
> 被问到「容器里能不能用 PM2」时，标准回答是：**能跑但不该用**。容器编排层已经提供了进程守护、多实例、故障自愈、滚动发布这四件 PM2 的核心能力，叠加只会让进程模型和资源限制变复杂。唯一合理的例外是**过渡期**——老项目容器化第一步先把 PM2 一起塞进镜像保证行为不变，后续再拆掉。另外，如果只是想在容器里利用多核，正确做法是用 `node:cluster` 显式按 `--max-old-space-size` 和 cgroup 配额算出 worker 数，或者干脆多起副本。

---

## 二、PM2 实战

### 2.1 ecosystem.config.js 完整配置

```javascript
// ecosystem.config.js —— PM2 的声明式配置文件（用 pm2 start ecosystem.config.js 启动）
module.exports = {
  apps: [
    {
      // ───────── 基础 ─────────
      name: "todo-api",
      script: "src/server.js",
      cwd: "/opt/apps/todo-api", // 工作目录，避免相对路径依赖启动位置
      node_args: "--max-old-space-size=768", // 传给 node 的参数（V8 堆上限）

      // ───────── 进程模型 ─────────
      exec_mode: "cluster", // cluster 模式才能多进程 + reload 零停机
      instances: 4, // 数字 = 固定进程数；'max' = os.cpus().length
      // ⚠️ 裸机上 'max' 没问题；但在容器里 'max' 会读到宿主机核数，必须写死数字

      // ───────── 自动重启策略 ─────────
      autorestart: true,
      max_memory_restart: "900M", // 单进程 RSS 超过就重启（内存泄漏的兜底）
      // ⚠️ 这个值要和 node_args 的堆上限配合：堆 768M + 堆外开销 ≈ 900M
      max_restarts: 10, // 单位时间内最多重启次数
      min_uptime: "30s", // 启动不到 30s 就退出算「启动失败」，计入 max_restarts
      restart_delay: 2000, // 重启间隔，避免崩溃循环把 CPU 打满
      exp_backoff_restart_delay: 200, // 指数退避重启（崩溃循环时间隔逐步拉长）

      // ───────── 优雅退出（与优雅退出那篇强关联）─────────
      kill_signal: "SIGINT", // PM2 默认发 SIGINT；代码里要同时监听 SIGINT 和 SIGTERM
      kill_timeout: 20000, // ⚠️ 默认只有 1600ms！必须 ≥ 代码里的 forceTimeout
      wait_ready: true, // 等进程 process.send('ready') 才算启动完成
      listen_timeout: 10000, // wait_ready 的等待上限

      // ───────── 环境变量 ─────────
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        // 用 pm2 start ecosystem.config.js --env production 激活
        NODE_ENV: "production",
        PORT: 3000,
        LOG_LEVEL: "info",
      },
      // ⚠️ 绝不把密码/密钥写进这个文件 —— 它会进 git
      // 敏感配置从宿主的环境变量或密钥文件注入

      // ───────── 日志 ─────────
      out_file: "/var/log/todo-api/out.log",
      error_file: "/var/log/todo-api/error.log",
      merge_logs: true, // cluster 模式下所有 worker 写同一份（否则每个 worker 一个文件）
      time: false, // ⚠️ 设 true 会给每行加 PM2 的时间戳前缀，破坏 JSON 结构
      // → 用 pino 输出 JSON 时必须设 false，否则日志平台解析不了

      // ───────── 监听重启（仅开发用）─────────
      watch: false, // ❌ 生产绝不开：文件系统事件会导致意外重启
      ignore_watch: ["node_modules", "logs", "uploads"],
    },
  ],
};
```

### 2.2 reload vs restart vs stop

| 命令 | 行为 | 零停机 | 适用场景 |
| --- | --- | --- | --- |
| `pm2 reload <app>` | **逐个**替换 worker：起新的 → 等就绪 → 老的优雅退出 | ✅ | 日常代码发布（**要求 cluster 模式**） |
| `pm2 restart <app>` | 全部一起停，再一起起 | ❌ 有停机窗口 | 改了 `ecosystem.config.js`、换 Node 版本、改 `node_args` |
| `pm2 stop <app>` | 停止但保留在进程列表（状态 stopped） | — | 临时下线，之后 `pm2 start` 拉起 |
| `pm2 delete <app>` | 停止并从列表移除 | — | 彻底下线 |
| `pm2 scale <app> 8` | 动态调整 worker 数量（不重启现有进程） | ✅ | 临时扩容 |

```bash
# 零停机发布的标准流程
git pull
npm ci --omit=dev          # 只装生产依赖
pm2 reload ecosystem.config.js --env production

# ⚠️ reload 的两个前提，缺一个就不是真的零停机：
#   ① exec_mode: 'cluster'（fork 模式只有一个进程，reload 退化成 restart）
#   ② wait_ready + 代码里 process.send('ready')
#      否则 PM2 一看到进程启动就摘掉老进程，此时新进程可能还没连上 DB

# 改了配置文件必须用 restart，reload 不会重新读配置
pm2 restart ecosystem.config.js --env production --update-env
```

```javascript
// 配合 wait_ready：启动真正就绪后主动通知 PM2
const server = http.createServer(app.callback());
server.listen(PORT, async () => {
  await sequelize.authenticate(); // 等 DB 真的连上
  await redis.ping();
  if (process.send) process.send("ready"); // ← 少了这行 reload 会一直等到 listen_timeout
});
```

### 2.3 日志切割与开机自启

```bash
# ───────── 日志切割：pm2-logrotate 模块 ─────────
pm2 install pm2-logrotate

pm2 set pm2-logrotate:max_size 100M        # 单文件上限
pm2 set pm2-logrotate:retain 7             # 保留 7 个历史文件
pm2 set pm2-logrotate:compress true        # gzip 压缩历史文件
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'   # 每天 0 点切一次（cron 格式）
pm2 set pm2-logrotate:workerInterval 30    # 检查间隔（秒）

# ⚠️ 容器环境不要用这个：日志应该写 stdout 交给编排层收集（见日志那篇第七章）
#    pm2-logrotate 只适用于裸机/VM 场景

# ───────── 开机自启 ─────────
pm2 startup                # 生成并安装 systemd/upstart 启动脚本（会打印需要 sudo 执行的命令）
pm2 start ecosystem.config.js --env production
pm2 save                   # ⚠️ 关键：把当前进程列表快照存到 ~/.pm2/dump.pm2
                           #    不执行 save，重启机器后 PM2 起来但进程列表是空的

pm2 unstartup              # 卸载开机自启
pm2 resurrect              # 手动从 dump.pm2 恢复进程列表
```

### 2.4 常用排查命令

```bash
pm2 list                   # 进程总览：状态、重启次数、CPU、内存、uptime
                           # ⚠️ 先看 ↺ (restarts) 列：数字异常大 = 崩溃循环

pm2 describe todo-api      # 单进程详情：完整配置、脚本路径、node_args、
                           # 日志文件位置、创建时间、退出码历史

pm2 logs todo-api          # 实时日志（默认最后 15 行 + follow）
pm2 logs todo-api --lines 200        # 多看点历史
pm2 logs todo-api --err             # 只看 stderr
pm2 logs todo-api --json            # 不加 PM2 装饰，便于管道给 jq

pm2 monit                  # 交互式仪表盘：每个进程的实时 CPU / 内存 / 日志
                           # 排查内存泄漏时盯着 memory 列看是否单调上升

pm2 env 0                  # 查看进程 id=0 实际生效的环境变量
                           # ⚠️ 排查「改了 .env 却没生效」的第一站
                           #    PM2 会缓存环境变量，改了要 restart --update-env

pm2 reset todo-api         # 重置重启计数器和统计数据
pm2 flush                  # 清空所有日志文件（磁盘告急时的应急手段）

pm2 prettylist             # JSON 格式的完整进程信息（脚本化采集用）
pm2 jlist | jq '.[].pm2_env.restart_time'   # 提取重启次数做监控
```

```bash
# 内存泄漏的快速判断
watch -n 5 'pm2 jlist | jq -r ".[] | \"\(.name) \(.monit.memory/1048576|floor)MB\""'
# 内存单调上升且不回落 → 泄漏；锯齿状上下 → 正常 GC

# CPU 占满的排查
pm2 describe todo-api | grep -E "script|node args"   # 确认启动参数
node --cpu-prof --cpu-prof-dir=/tmp/prof src/server.js  # 单独起一个抓 profile
```

---

## 三、Node Dockerfile 最佳实践

### 3.1 完整多阶段 Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# ═══════════════ Stage 1: 依赖安装（可缓存）═══════════════
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# ✅ 只 COPY 依赖清单，不 COPY 源码
# 这样只要 package.json / lock 文件没变，下面的 npm ci 层就命中缓存，
# 改业务代码时跳过整个依赖安装（可以省几分钟）
COPY package.json package-lock.json ./

# npm ci 严格按 lock 文件安装，且会先清空 node_modules，保证可复现
# ❌ 不要用 npm install：它可能更新 lock 文件，导致构建不可复现
RUN npm ci

# ═══════════════ Stage 2: 构建（TS / 打包）═══════════════
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build          # 产物假设在 dist/

# ═══════════════ Stage 3: 生产依赖（剥掉 devDependencies）═══════════════
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ═══════════════ Stage 4: 运行时（最终镜像）═══════════════
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# dumb-init：解决 PID 1 信号转发问题（详见 3.3）
# 也可以在 docker run 时用 --init，两者取其一
RUN apt-get update \
 && apt-get install -y --no-install-recommends dumb-init \
 && rm -rf /var/lib/apt/lists/*

# ✅ 只从前面的 stage 拷「运行时真正需要的东西」
# builder 里的源码、devDependencies、构建缓存全部不进最终镜像
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder   --chown=node:node /app/dist         ./dist
COPY --chown=node:node package.json ./

# ✅ 非 root 用户运行（node 镜像自带 uid/gid 1000 的 node 用户）
# 容器逃逸时攻击者只有普通用户权限；也满足多数合规基线要求
USER node

EXPOSE 3000

# ✅ ENTRYPOINT 用 exec form（JSON 数组），不要用 shell form
# shell form（CMD node dist/server.js）会变成 /bin/sh -c "node ..."，
# 此时 PID 1 是 sh，它不转发信号 → SIGTERM 收不到 → 优雅退出失效
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

```
# .dockerignore —— 与 Dockerfile 同级，作用于 COPY 的源
# 不写这个文件，COPY . . 会把 node_modules 和 .git 一起塞进构建上下文，
# 既拖慢构建（上下文要传给 daemon），又可能把本地的 node_modules 覆盖掉镜像里的
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
*.md
Dockerfile*
.dockerignore
coverage
.nyc_output
dist
logs
uploads
.vscode
.idea
.DS_Store
test
__tests__
*.test.js
```

### 3.2 基础镜像选择

| 镜像 | 体积（量级） | libc | 取舍 |
| --- | --- | --- | --- |
| `node:22` | 最大（~1GB） | glibc | 带完整构建工具链，适合 builder 阶段 |
| `node:22-bookworm-slim` | 中（~200MB） | glibc | **推荐默认**：兼容性好，体积可接受 |
| `node:22-alpine` | 最小（~130MB） | **musl** | 体积小，但 musl 有兼容风险（见下） |
| `gcr.io/distroless/nodejs22` | 小 | glibc | 无 shell、无包管理器，攻击面最小；但**无法 exec 进去排查** |

```
alpine（musl libc）的取舍

  ✅ 优点：镜像体积最小，拉取快，攻击面小

  ⚠️ 风险：
    ① 原生模块（node-gyp 编译的 C++ addon）预编译产物通常只针对 glibc，
       在 alpine 上会退回源码编译（需要 python3/make/g++，构建变慢），
       或直接报错 "Error loading shared library ... not found"
       典型受影响的包：sharp、canvas、bcrypt、grpc、better-sqlite3
    ② DNS 解析行为与 glibc 有差异（musl 的 resolver 不支持某些 search domain 配置），
       容器内域名解析偶发失败的疑难问题常追到这里
    ③ 部分场景下 musl 的 malloc 在多线程高分配率下性能不如 glibc

  📌 判断：
    - 纯 JS 依赖、追求体积 → alpine 可以用
    - 有原生模块、或线上排障成本高 → 用 bookworm-slim，多 70MB 换省心
    - 安全要求极高、且有完善的观测（不需要 exec 进容器） → distroless
```

### 3.3 PID 1 与信号转发

这是与[优雅退出与健康检查](./优雅退出与健康检查.md)强关联的一环：**优雅退出代码写得再好，信号收不到就等于没写**。

```
容器里的 PID 1 有特殊语义（内核规定）：
  ① 它不会收到「默认动作」的信号 —— 没有显式注册 handler 的信号会被忽略
  ② 它负责回收孤儿进程（僵尸进程收割）

❌ 情况 A：shell form CMD

  Dockerfile: CMD node dist/server.js
  实际执行:   /bin/sh -c "node dist/server.js"

  进程树：
    PID 1: /bin/sh
      └─ PID 7: node

  docker stop / K8s 发 SIGTERM → 发给 PID 1（sh）
    → sh 不转发信号给子进程（它只是在等子进程退出）
    → node 永远收不到 SIGTERM
    → 宽限期到 → SIGKILL 强杀 → 请求被斩断，优雅退出代码一行都没跑 ✗


❌ 情况 B：npm start

  Dockerfile: CMD ["npm", "start"]
  进程树：
    PID 1: npm
      └─ PID 12: sh -c "node dist/server.js"
           └─ PID 13: node

  npm 对信号转发的支持不完整（且中间还夹了一层 sh）
  → 同样收不到，且多了两层进程 ✗


✅ 情况 C：exec form + init 系统

  Dockerfile:
    ENTRYPOINT ["dumb-init", "--"]
    CMD ["node", "dist/server.js"]

  进程树：
    PID 1: dumb-init
      └─ PID 7: node

  dumb-init 收到 SIGTERM → 转发给整个进程组 → node 收到 → 优雅退出正常执行 ✓
  同时 dumb-init 负责收割僵尸进程


✅ 情况 D：只用 exec form，让 node 直接当 PID 1

  Dockerfile: CMD ["node", "dist/server.js"]
  进程树：
    PID 1: node          ← node 直接是 PID 1

  信号直达 node ✓（因为代码里显式注册了 SIGTERM handler，PID 1 的忽略规则不影响它）
  ⚠️ 但 node 不会收割僵尸进程 —— 如果应用会 spawn 子进程（child_process），
     子进程退出后会变僵尸堆积。这种情况必须加 init。
  → 所以推荐统一加 --init 或 dumb-init，成本极低
```

```bash
# 三种加 init 的方式，任选其一

# ① Docker run 参数（用 Docker 自带的 tini，无需改 Dockerfile）
docker run --init -p 3000:3000 todo-api

# ② docker-compose
#   services:
#     app:
#       init: true

# ③ Dockerfile 里装 dumb-init（K8s 场景推荐，因为 K8s 没有 --init 等价物）
#   ENTRYPOINT ["dumb-init", "--"]
#   CMD ["node", "dist/server.js"]

# 验证信号能不能收到
docker run -d --name t --init todo-api
docker stop t                     # 默认发 SIGTERM，宽限 10s
docker logs t | tail -20          # 应该能看到「收到退出信号，开始优雅退出」的日志
docker inspect t --format '{{.State.ExitCode}}'
# 0   → 优雅退出成功 ✓
# 137 → 128+9，被 SIGKILL：信号没收到，或退出超过宽限期 ✗
```

### 3.4 层缓存优化与依赖安装

```dockerfile
# ❌ 反面：先 COPY 全部源码，再装依赖
COPY . .
RUN npm ci
# 问题：改一行业务代码 → COPY 层缓存失效 → 后面的 npm ci 也失效 → 每次构建都重装依赖

# ✅ 正面：按「变更频率从低到高」排列 COPY
COPY package.json package-lock.json ./
RUN npm ci                    # 只有依赖清单变了才重跑
COPY . .                      # 源码变更只失效这一层
RUN npm run build
```

```dockerfile
# 用 BuildKit 缓存挂载进一步加速（不把缓存写进镜像层）
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.npm \
    npm ci
# 效果：npm 的下载缓存跨构建复用，但不占镜像体积
```

| 命令 | 行为 | 何时用 |
| --- | --- | --- |
| `npm ci` | 严格按 `package-lock.json` 装，先清空 `node_modules`，不修改 lock | **CI/构建环境的标准选择** |
| `npm ci --omit=dev` | 同上，跳过 `devDependencies` | 生产依赖阶段 |
| `npm install` | 可能更新 lock 文件 | ❌ 构建环境不要用（破坏可复现性） |
| `npm prune --omit=dev` | 在已装好的 `node_modules` 里删掉 devDeps | 单阶段构建的折中（不如多阶段干净） |
| `pnpm install --frozen-lockfile` | pnpm 的 ci 等价物 | pnpm 项目 |
| `pnpm deploy --prod <dir>` | 把某个 workspace 包及其生产依赖**展平**拷到目标目录 | ✅ **monorepo 的最佳选择**：解决 pnpm 符号链接无法跨镜像 stage 拷贝的问题 |

```dockerfile
# pnpm monorepo 的正确姿势
FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @app/api build

# ✅ pnpm deploy 会把符号链接展平成真实文件，可以安全拷到 runner stage
# ❌ 直接 COPY node_modules 会拷到一堆指向 .pnpm store 的断裂符号链接
RUN pnpm --filter @app/api deploy --prod /deploy

FROM node:22-bookworm-slim AS runner
WORKDIR /app
COPY --from=builder --chown=node:node /deploy ./
USER node
CMD ["node", "dist/server.js"]
```

---

## 四、容器内存与 Node 堆的配合

### 4.1 为什么设了 memory limit 还会被 OOMKill

这是 Node 容器化最经典的坑。

```
❌ 只设容器 limit，不设 --max-old-space-size

  容器配置：resources.limits.memory = 512Mi

  V8 的默认老生代堆上限（--max-old-space-size）由 V8 自己根据
  「它看到的系统内存」推算，而 Node 进程默认**感知不到 cgroup 限制**：
  它读到的是宿主机的总内存（比如 64GB），于是把堆上限定得远高于 512Mi。

  运行时序：
    t=0    进程启动，heap used 80MB     容器内存占用 ~150MB  ✓
    t=1h   缓存增长，heap used 400MB    容器内存占用 ~520MB
                                              ↑
    此时 V8 心想：「我的堆上限还很远，不用着急做 Full GC」
    → 它不知道容器只给了 512Mi
    → 内存继续涨到 512Mi
    → cgroup OOM killer 直接 SIGKILL 进程（Exit Code 137）

  ⚠️ 关键：这个 SIGKILL 是内核发的，不可捕获。
     优雅退出代码一行都跑不了，正在处理的请求全部被斩断。
     而且日志里通常什么都没有 —— 进程是被瞬间销毁的。

✅ 显式设置 --max-old-space-size，让 V8 知道自己的边界

  容器 limit = 512Mi，设 --max-old-space-size=384（约 75%）

    t=1h   heap used 逼近 384MB
           → V8 触发 Full GC 努力回收
           → 回收不掉才抛 "JavaScript heap out of memory"
           → 这是 Node 主动抛的错误，**可以被 uncaughtException 捕获**
           → 能记日志、能走优雅退出、能上报告警 ✓

  → 从「静默被杀」变成「有堆栈、有日志、有告警的可控崩溃」
```

### 4.2 为什么是 75%

```
容器内存 = V8 老生代堆 + 堆外内存

  堆外内存包括（都不受 --max-old-space-size 限制）：
    ├─ V8 新生代（semi-space）：默认几十 MB
    ├─ Buffer / TypedArray：走 external memory，不算在 old space 里 ⚠️
    ├─ 原生模块内存（sharp 处理图片、DB driver 的缓冲区）
    ├─ Node/V8 自身代码段与元数据、JIT 编译产物
    ├─ 线程栈（libuv 线程池默认 4 线程 + worker_threads）
    └─ glibc/musl 的 malloc arena 碎片

  经验分配（512Mi 容器为例）：
    ┌────────────────────────────────────────────┐
    │ old space (--max-old-space-size=384)  75%  │
    ├────────────────────────────────────────────┤
    │ 新生代 + Buffer + 原生 + 栈 + 元数据  ~25%  │
    └────────────────────────────────────────────┘

  ⚠️ 需要调低比例（60~65%）的场景：
     - 大量 Buffer 操作（文件上传、图片处理、流转发）
     - 用了 sharp / canvas / node-gyp 类原生模块
     - 开了多个 worker_threads（每个 worker 有独立的堆！）

  ⚠️ 小容器要更保守：
     limit 256Mi 时，固定开销占比更高，堆只能给 ~150MB（约 60%）
```

| 容器 limit | 推荐 `--max-old-space-size` | 备注 |
| --- | --- | --- |
| 256Mi | 150 | 固定开销占比高，比例要压到 60% |
| 512Mi | 384 | 标准 75% |
| 1Gi | 768 | 标准 75% |
| 2Gi | 1536 | 标准 75% |
| 4Gi+ | 3072 | 单进程堆超过 4GB 时 GC 停顿会明显变长，考虑拆多副本而不是加大单实例 |

### 4.3 三种传参方式

```dockerfile
# ✅ 方式一：NODE_OPTIONS 环境变量（推荐，K8s 里可按环境覆盖，不用改镜像）
ENV NODE_OPTIONS="--max-old-space-size=384"
CMD ["node", "dist/server.js"]
```

```yaml
# K8s 里把两个值放在一起，避免改了一个忘改另一个
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/todo-api:v1.2.3
          env:
            # ⚠️ 这两个数字必须一起维护：384 ≈ 512 × 0.75
            - name: NODE_OPTIONS
              value: "--max-old-space-size=384"
          resources:
            requests:
              memory: "512Mi" # requests = limits，避免被超卖影响
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "1000m"
```

```javascript
// ✅ 方式二：启动时自检，配错就快速失败（比线上被 OOMKill 才发现好得多）
const v8 = require("node:v8");
const fs = require("node:fs");

function checkMemoryConfig() {
  const heapLimitMB = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;

  // 读 cgroup 限制（v2 路径；v1 是 /sys/fs/cgroup/memory/memory.limit_in_bytes）
  let containerLimitMB = null;
  try {
    const raw = fs.readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim();
    if (raw !== "max") containerLimitMB = Number(raw) / 1024 / 1024;
  } catch {
    /* 非容器环境，跳过 */
  }

  logger.info({ heapLimitMB: Math.round(heapLimitMB), containerLimitMB }, "内存配置");

  if (containerLimitMB && heapLimitMB > containerLimitMB * 0.85) {
    // ❌ 堆上限接近或超过容器 limit → 几乎必然 OOMKill
    logger.fatal(
      { heapLimitMB, containerLimitMB, suggested: Math.floor(containerLimitMB * 0.75) },
      "V8 堆上限过高，将导致 OOMKill，请设置 NODE_OPTIONS=--max-old-space-size",
    );
    process.exit(1); // 快速失败：启动时挂掉，比运行几小时后静默被杀好
  }
}
checkMemoryConfig();
```

```bash
# ✅ 方式三：命令行参数（PM2 用 node_args，或直接写在 CMD 里）
node --max-old-space-size=384 dist/server.js

# 排查现场：确认实际生效的堆上限
node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024)"

# 确认容器实际内存限制（cgroup v2）
cat /sys/fs/cgroup/memory.max
# cgroup v1
cat /sys/fs/cgroup/memory/memory.limit_in_bytes
```

> [!important] 面试要点
> 「容器设了 limit 为什么还 OOMKill」的完整回答链条是：① Node/V8 默认感知不到 cgroup 限制，它按宿主机内存推算堆上限；② 于是 V8 认为自己还有很多空间，不积极做 Full GC；③ 内存涨到容器 limit 被 cgroup OOM killer **SIGKILL**，不可捕获、无日志、优雅退出完全失效，Exit Code 137；④ 解法是显式设 `--max-old-space-size` 为 limit 的 75% 左右，让 V8 先抛 `JavaScript heap out of memory`——那是可捕获的、有堆栈的、能告警的。补充一句「用 Buffer 多或有原生模块时要压到 60~65%，因为堆外内存不受这个参数限制」会显得更有实战经验。

---

## 五、配置与环境管理

### 5.1 12-Factor 的配置外置原则

```
12-Factor App 第 3 条：在环境中存储配置（Store config in the environment）

  判断标准：「这份代码能不能在不改任何一行的前提下，直接开源出去？」
    → 能 = 配置外置做对了
    → 不能（里面有数据库密码） = 配置和代码耦合了 ❌

  为什么必须外置：
    ① 同一个镜像要能跑在 dev/staging/prod，靠环境变量区分
       → 如果配置进了镜像，每个环境都要单独构建，「测试通过的镜像」≠「上线的镜像」
    ② 密钥轮转不需要重新构建和发布
    ③ 代码仓库泄漏不等于凭证泄漏

  配置分三类，处理方式不同：
  ┌──────────────┬────────────────────┬──────────────────────────┐
  │ 类型         │ 例子               │ 存放位置                 │
  ├──────────────┼────────────────────┼──────────────────────────┤
  │ 环境差异配置 │ DB 地址、下游 URL  │ 环境变量 / ConfigMap     │
  │ 敏感凭证     │ DB 密码、JWT 密钥  │ Secret / 密钥管理服务 ⚠️ │
  │ 业务常量     │ 分页默认值、枚举   │ ✅ 代码里（不是配置）     │
  └──────────────┴────────────────────┴──────────────────────────┘

  ⚠️ 常见误区：把业务常量也做成配置项
     → 配置项膨胀到几百个，没人知道哪些真的会改，维护成本反而更高
     → 判断标准：不同环境的值会不一样吗？不会就是常量，写代码里
```

### 5.2 `.env` 只用于本地开发

```
❌ 三种错误用法

  ① .env 进 git
     git log 里永远留着旧密码，即使后来删了也能翻出来
     → 一旦仓库被克隆/泄漏，凭证全丢

  ② .env 进镜像（COPY . . 时被带进去）
     docker history / docker save 就能扒出来，镜像仓库里所有人可见
     → 必须在 .dockerignore 里排除 .env*

  ③ 生产环境依赖 .env 文件
     密钥轮转要登机器改文件 + 重启，无法审计谁改了什么
     → 且多副本时要保证每台机器的文件一致，很容易漂移

✅ 分环境策略

  本地开发：.env 文件（加进 .gitignore），提交 .env.example 作为模板
  CI/CD：   流水线的加密变量
  生产：    环境变量（来自 K8s Secret / 配置中心 / 云密钥服务）
```

```bash
# .env.example —— ✅ 这个要提交，作为「需要哪些变量」的文档
# 只写变量名和示例格式，绝不写真实值
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=todo
DB_USER=root
DB_PASSWORD=<your-password-here>

REDIS_URL=redis://localhost:6379

JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=7d

LOG_LEVEL=debug
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

```gitignore
# .gitignore
.env
.env.local
.env.*.local
!.env.example      # 例外：模板文件要提交
```

```javascript
// ✅ dotenv 只在非生产环境加载
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
// 生产环境完全依赖真实的环境变量，避免「本地文件覆盖了 Secret」这种诡异问题

// ⚠️ Todo 项目现在是 require('dotenv').config() 无条件加载（src/app.js 第一行），
//    本地开发没问题，容器化时要改成上面这样并把 .env 加进 .dockerignore
```

### 5.3 Secret 管理

```yaml
# ✅ K8s：ConfigMap 放非敏感配置，Secret 放凭证
apiVersion: v1
kind: ConfigMap
metadata:
  name: todo-api-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  DB_HOST: "mysql.default.svc.cluster.local"
  DB_PORT: "3306"
  DB_NAME: "todo"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318"
---
apiVersion: v1
kind: Secret
metadata:
  name: todo-api-secret
type: Opaque
stringData:
  # ⚠️ Secret 默认只是 base64 编码，不是加密
  #    要真正安全需要：① 开启 etcd 静态加密 ② 用 External Secrets Operator
  #    从 Vault / 云密钥服务同步 ③ 限制 RBAC 读取权限
  #    这个 YAML 本身也不该进 git —— 用 sealed-secrets 或 SOPS 加密后再提交
  DB_PASSWORD: "<REDACTED>"
  JWT_SECRET: "<REDACTED>"
  REDIS_PASSWORD: "<REDACTED>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/todo-api:v1.2.3
          envFrom:
            - configMapRef:
                name: todo-api-config
            - secretRef:
                name: todo-api-secret
          env:
            - name: NODE_OPTIONS
              value: "--max-old-space-size=384"
            # 从 Pod 元信息注入，用于日志的 hostname 字段
            - name: POD_NAME
              valueFrom:
                fieldRef: { fieldPath: metadata.name }
```

```
Secret 的红线（面试也会问）

  ❌ 绝不：硬编码在代码里、写进 Dockerfile 的 ENV、提交明文 Secret YAML、
          打进日志（见日志那篇的 redact）、放进前端可访问的接口响应
  ✅ 应该：从环境变量读取、支持热轮转（重启即生效）、限制 RBAC 读取范围、
          开启 etcd 静态加密、用 External Secrets / Vault 做真正的密钥管理

  ⚠️ 环境变量本身也不是绝对安全：
     同容器内任何进程都能读 /proc/1/environ，崩溃转储也可能带上。
     更高安全要求下用「挂载文件 + 内存文件系统」或运行时向密钥服务取。
```

### 5.4 启动时校验配置（快速失败）

```javascript
// src/config/index.js
const { z } = require("zod"); // 也可以用 envalid / joi，或手写校验

// ✅ 声明式定义所有配置项，含类型、默认值、校验规则
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1), // 没有默认值 = 必填
  DB_POOL_MAX: z.coerce.number().int().default(10),

  REDIS_URL: z.string().url(),

  // JWT 密钥必须有最小长度，防止用 'secret' 这种弱值
  JWT_SECRET: z.string().min(32, "JWT_SECRET 至少 32 字符，用 openssl rand -base64 32 生成"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().default(15000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // ✅ 快速失败（fail fast）：启动就退出，且一次列出所有缺失项
  // ❌ 反面：不校验，运行到某个接口第一次用到 JWT_SECRET 时才报
  //         "secretOrPrivateKey must have a value" —— 上线几小时后才被发现，
  //         而且报错信息完全指不向「环境变量没配」这个根因
  console.error("❌ 环境变量校验失败：");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1); // 非 0 退出 → K8s 会 CrashLoopBackOff，一眼就知道配置有问题
}

// ⚠️ 打印生效配置时必须脱敏
const config = parsed.data;
console.info(
  JSON.stringify({
    msg: "配置加载完成",
    ...config,
    DB_PASSWORD: "<REDACTED>",
    JWT_SECRET: "<REDACTED>",
    REDIS_URL: config.REDIS_URL.replace(/:\/\/[^@]*@/, "://<REDACTED>@"),
  }),
);

module.exports = config;
```

```javascript
// 业务代码统一从 config 读，不再直接摸 process.env
const config = require("./config");

// ✅ 类型确定（PORT 已经是 number）、必填已保证、默认值已应用
server.listen(config.PORT);

// ❌ 直接读 process.env 的三个问题
const port = process.env.PORT; // 是字符串 '3000' 不是数字
const poolMax = process.env.DB_POOL_MAX || 10; // 每处都要写默认值，容易不一致
const secret = process.env.JWT_SECRET; // 可能是 undefined，错误延迟到运行时
```

---

## 六、发布策略

### 6.1 四种策略对比

| 策略 | 做法 | 停机 | 资源开销 | 回滚速度 | 对 Node 应用的要求 |
| --- | --- | --- | --- | --- | --- |
| **滚动发布**（Rolling） | 逐批替换旧副本 | ✅ 零停机 | 低（`maxSurge` 那点） | 中（要滚回去） | **必须实现优雅退出**；新旧版本会短暂共存，接口要向后兼容 |
| **蓝绿**（Blue-Green） | 起一整套新环境，流量一次性切过去 | ✅ 零停机 | **高（双倍资源）** | ✅ 极快（切回去即可） | 新旧不共存，兼容压力小；但数据库是共享的，DB 变更仍需兼容 |
| **灰度/金丝雀**（Canary） | 先给 1%/5%/20% 流量，观察指标再逐步放大 | ✅ 零停机 | 低 | 快（把金丝雀副本干掉） | 需要按流量比例或用户特征路由；**必须有分版本的监控**（日志/指标带 version 标签） |
| **重建**（Recreate） | 全停再全起 | ❌ 有停机 | 低 | 慢 | 适合不兼容的大版本、后台任务型服务 |

```
滚动发布期间的「新旧共存」是最容易忽略的约束

  发布 v2 的过程中，v1 和 v2 的副本同时在线（可能持续几分钟）：

    Pod(v1) ─┐
    Pod(v1) ─┼──> 同一个 Service ──> 用户请求随机落到 v1 或 v2
    Pod(v2) ─┘

  这意味着必须保证：
    ① API 向后兼容：v2 不能删字段、不能改字段语义、不能改错误码含义
       ❌ v2 把响应里的 `name` 改成 `userName` → 落到 v1 的请求前端解析正常，
          落到 v2 的解析失败，表现为「偶发白屏」，且刷新就好了，极难复现
    ② DB schema 兼容：加字段可以，删字段/改类型不行
       → 标准做法是「扩展-收缩」（expand-contract）两次发布：
         第一次发布：加新字段，代码同时写新旧字段、读旧字段
         第二次发布：改成读新字段
         第三次发布：删掉旧字段和兼容代码
    ③ 消息格式兼容：v1 的消费者可能收到 v2 生产的消息
    ④ 缓存 key 兼容：v2 改了缓存结构要换 key 前缀，否则 v1 读到 v2 的数据会崩
```

### 6.2 滚动发布配置（与优雅退出联动）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api
spec:
  replicas: 4
  # 保留旧 ReplicaSet 供快速回滚（kubectl rollout undo）
  revisionHistoryLimit: 5
  # 新 Pod 必须稳定运行 30s 才算成功，防止「起来又崩」被误判为发布成功
  minReadySeconds: 30
  progressDeadlineSeconds: 600 # 超过 10 分钟没进展就标记失败
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1 # 最多多起 1 个（先起新再停老）
      maxUnavailable: 0 # ✅ 发布期间可用副本数不下降，容量不掉
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: app
          image: registry.example.com/todo-api:v1.2.3 # ✅ 用具体 tag，绝不用 :latest
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 5"] # 给摘 Endpoint 留时间
          readinessProbe: # ← 滚动发布的节奏由它控制
            httpGet: { path: /readyz, port: 3000 }
            periodSeconds: 5
            failureThreshold: 2
          livenessProbe:
            httpGet: { path: /healthz, port: 3000 }
            periodSeconds: 10
            failureThreshold: 3
```

```
滚动发布与优雅退出的配合链路（这是两篇笔记的接缝处）

  ① K8s 起 Pod(v2)
  ② Pod(v2) 的 readinessProbe 通过 → 加入 Service Endpoint → 开始接流量
  ③ K8s 摘除 Pod(v1) 的 Endpoint（异步）+ 执行 preStop（sleep 5s）
  ④ preStop 结束 → 发 SIGTERM 给 Pod(v1)
  ⑤ Pod(v1) 的优雅退出逻辑：readiness 转 false → server.close() → 等存量 → 关资源 → exit 0
  ⑥ Pod(v1) 退出，重复 ①~⑤ 处理下一个副本

  任何一环缺失的后果：
    缺 ② readiness  → 流量打到还没连上 DB 的新 Pod → 500
    缺 ③ preStop    → Endpoint 没摘完就杀进程 → 502
    缺 ⑤ 优雅退出   → 存量请求被斩断 → 502
    缺 minReadySeconds → 新版本启动即崩，但 K8s 已经继续滚下一批 → 全量崩溃
```

### 6.3 灰度/金丝雀

```yaml
# 简单方案：同一个 Service 选中两个 Deployment，用副本数比例近似控制流量
# stable: 9 副本 + canary: 1 副本 ≈ 10% 流量
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api-canary
spec:
  replicas: 1
  selector:
    matchLabels: { app: todo-api, track: canary }
  template:
    metadata:
      labels:
        app: todo-api # ← Service 靠这个 label 选中，与 stable 共享流量
        track: canary # ← 用于监控按 track 维度拆分
    spec:
      containers:
        - name: app
          image: registry.example.com/todo-api:v1.3.0-rc1
          env:
            - name: APP_VERSION # ✅ 注入版本，日志和指标才能按版本对比
              value: "v1.3.0-rc1"
```

```yaml
# 精确方案：Ingress 按 header / 权重路由（nginx-ingress 注解）
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: todo-api-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "5" # 5% 流量
    # 或按 header 定向（内部人员先试）
    nginx.ingress.kubernetes.io/canary-by-header: "x-canary"
    nginx.ingress.kubernetes.io/canary-by-header-value: "always"
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: todo-api-canary
                port: { number: 3000 }
```

```
灰度的观察清单（必须按 version / track 维度拆分，否则灰度毫无意义）

  ① 错误率     canary vs stable，差异 > 0.5% 立即回滚
  ② P99 耗时   canary 不能显著高于 stable
  ③ 事件循环延迟  新版本引入同步阻塞的第一信号
  ④ heap 使用率与 GC 频次  内存泄漏在小流量下也能看出趋势
  ⑤ 业务指标   下单成功率、登录成功率（技术指标全绿但业务指标掉了也要回滚）

  ⚠️ 前提：日志和指标都带 version 标签（见日志那篇的 base 字段和 setDefaultLabels）
     没有这个前提，灰度期间只能看到「整体错误率涨了 0.05%」，
     根本无法判断是 canary 引起的还是正常波动。

  节奏建议：1% → 观察 10min → 5% → 观察 30min → 20% → 观察 1h → 50% → 100%
  非工作时间不要放大灰度比例（出问题没人处置）
```

### 6.4 回滚预案

```bash
# ───────── K8s ─────────
kubectl rollout status deployment/todo-api          # 观察发布进度
kubectl rollout history deployment/todo-api         # 查看历史版本
kubectl rollout undo deployment/todo-api            # 回滚到上一版
kubectl rollout undo deployment/todo-api --to-revision=3   # 回滚到指定版本
kubectl rollout pause deployment/todo-api           # ⚠️ 发现异常先暂停，阻止继续滚动
kubectl rollout resume deployment/todo-api

# ───────── PM2 ─────────
# PM2 没有内置版本管理，靠目录软链实现
# /opt/apps/todo-api-v1.2.3/  /opt/apps/todo-api-v1.2.4/
ln -sfn /opt/apps/todo-api-v1.2.3 /opt/apps/current   # 切回旧版本
pm2 reload todo-api
```

```
回滚预案的四条铁律

  ① 回滚必须比修复快
     线上故障第一动作是「止损」不是「排查」。
     先 rollout undo 恢复，再慢慢看日志找原因。

  ② 数据库变更必须可回滚（或向后兼容）
     ❌ 代码可以回滚，DROP COLUMN 回滚不了
     → 所以 DB 变更用「扩展-收缩」拆成多次发布，
       任一时刻回滚代码都不会撞上不兼容的 schema

  ③ 镜像 tag 必须是不可变的具体版本
     ❌ :latest —— 回滚时 rollout undo 拉到的还是同一个 :latest（可能已被覆盖）
     ✅ :v1.2.3 或 :git-<sha>

  ④ 预案要演练过
     没演练过的预案 = 没有预案。至少在 staging 上跑一次完整的
     「发布 → 发现异常 → 回滚 → 验证恢复」，确认每一步的命令和耗时。
```

---

## 生产实践清单

### 必须做（Must）

- [ ] **容器化后不再用 PM2 cluster**，一个容器一个 Node 进程，扩缩容交给编排层
- [ ] 裸机用 PM2 时，`instances` 在容器里必须写死数字（`'max'` 会读到宿主机核数）
- [ ] PM2 的 `kill_timeout` ≥ 代码里的 `forceTimeout`（默认 1600ms 远远不够）
- [ ] PM2 配 `wait_ready: true` + 代码里 `process.send('ready')`，否则 reload 不是真零停机
- [ ] PM2 输出 JSON 日志时设 `time: false`（PM2 的时间戳前缀会破坏 JSON 结构）
- [ ] PM2 生产环境 `watch: false`；`pm2 startup` 后必须 `pm2 save`
- [ ] Dockerfile 用**多阶段构建**，最终镜像不含源码、devDependencies、构建缓存
- [ ] 先 `COPY package.json` 再 `npm ci`，最后 `COPY . .`（层缓存）
- [ ] 用 `npm ci --omit=dev`（不用 `npm install`）；pnpm monorepo 用 `pnpm deploy --prod`
- [ ] 写 `.dockerignore`，必须包含 `node_modules`、`.git`、**`.env*`**
- [ ] `USER node` 非 root 运行
- [ ] `CMD`/`ENTRYPOINT` 用 **exec form**（JSON 数组），不要 `CMD npm start` 或 shell form
- [ ] 加 `--init` 或 `dumb-init` 解决 PID 1 不转发信号导致优雅退出失效
- [ ] 镜像 tag 用具体版本或 git sha，**绝不用 `:latest`**
- [ ] **显式设置 `--max-old-space-size` 约为容器 memory limit 的 75%**（Buffer/原生模块多时降到 60~65%）
- [ ] 启动时自检 V8 堆上限与 cgroup limit 的比例，超标就快速失败
- [ ] `requests.memory = limits.memory`，避免超卖导致的意外 OOMKill
- [ ] 配置全部外置到环境变量；`.env` 只用于本地开发，**进 `.gitignore` 和 `.dockerignore`**
- [ ] 提交 `.env.example` 作为必需变量的文档（只写变量名和格式，不写真实值）
- [ ] `dotenv` 只在非生产环境加载
- [ ] 凭证走 Secret / 密钥服务，**绝不硬编码、不进 Dockerfile ENV、不打进日志**
- [ ] Secret YAML 不进 git（用 sealed-secrets / SOPS / External Secrets）
- [ ] **启动时校验所有必需环境变量**，缺失或格式错就 `exit(1)` 快速失败
- [ ] 打印生效配置时对密码、密钥、连接串脱敏
- [ ] 滚动发布配 `maxUnavailable: 0` + `minReadySeconds` + `preStop`
- [ ] 滚动发布期间保证 API / DB schema / 消息格式 / 缓存 key **向后兼容**
- [ ] DB 变更用「扩展-收缩」拆多次发布，保证任一时刻代码可回滚
- [ ] 灰度必须注入 `APP_VERSION`，日志和指标按 version/track 维度可拆分
- [ ] 回滚预案在 staging 演练过，确认命令和耗时

### 常见踩坑

| 现象 | 根因 | 解法 |
| --- | --- | --- |
| 容器里起了 16 个 worker 抢 1 个 CPU | PM2 `instances: 'max'` 读到宿主机核数而非 cgroup 配额 | 容器里去掉 PM2，或写死 `instances` 数字 |
| K8s 探针一直 200，但请求全失败 | PM2 主进程活着、端口在听，里面的 worker 全崩了 | 一个容器一个进程，让探针直接反映真实状态 |
| `docker stop` 后进程被强杀，优雅退出没执行 | `CMD node server.js`（shell form）导致 PID 1 是 `sh`，不转发信号 | exec form + `--init` / `dumb-init` |
| `CMD ["npm","start"]` 也收不到信号 | npm 信号转发不完整，且中间夹了一层 sh | 直接 `CMD ["node","dist/server.js"]` |
| Exit Code 137，日志里什么都没有 | cgroup OOM killer 发的 SIGKILL，不可捕获 | 设 `--max-old-space-size` ≈ limit × 75% |
| 设了 `--max-old-space-size=384`，容器 512Mi 还是 OOM | Buffer / 原生模块的堆外内存不受该参数限制 | 比例降到 60~65%，或排查 Buffer 泄漏 |
| 镜像 1.2GB，拉取要几分钟 | 单阶段构建，源码 + devDependencies + 构建缓存全在里面 | 多阶段构建 + slim 基础镜像 + `.dockerignore` |
| 改一行代码，构建要重装全部依赖 | `COPY . .` 在 `npm ci` 之前，缓存全失效 | 先 COPY 依赖清单再 `npm ci` |
| 本地 `node_modules` 覆盖了镜像里的 | 没写 `.dockerignore`，`COPY . .` 把它带进去了 | 写 `.dockerignore` |
| alpine 上 `sharp`/`bcrypt` 报找不到共享库 | musl libc 与预编译的 glibc 产物不兼容 | 换 `bookworm-slim`，或在 alpine 里装 `python3 make g++` 源码编译 |
| 容器内域名解析偶发失败 | musl 的 DNS resolver 行为与 glibc 有差异 | 换 glibc 基础镜像 |
| pnpm monorepo 镜像里 `node_modules` 全是断链 | 直接 COPY 了指向 `.pnpm` store 的符号链接 | 用 `pnpm deploy --prod` 展平 |
| 镜像里被扒出数据库密码 | `.env` 被 `COPY . .` 带进镜像，或写在 `ENV` 里 | `.dockerignore` 排除 `.env*`；凭证走 Secret |
| 上线几小时后才报 "secretOrPrivateKey must have a value" | 环境变量缺失，但代码没在启动时校验 | 启动时用 zod/envalid 校验，缺就 `exit(1)` |
| 改了环境变量但 PM2 里没生效 | PM2 缓存了环境变量 | `pm2 restart --update-env`；用 `pm2 env <id>` 确认 |
| 发布期间偶发白屏，刷新就好 | 新旧版本共存，v2 改了响应字段名，前端解析不了 v2 的返回 | 滚动发布期间保证 API 向后兼容 |
| 代码回滚了但接口还在报错 | 已经 `DROP COLUMN`，schema 回不去 | DB 变更用扩展-收缩拆多次发布 |
| `rollout undo` 之后还是坏的 | 镜像 tag 是 `:latest`，回滚拉到的是同一个镜像 | 用具体版本 tag |
| 新版本启动即崩，但 K8s 继续滚完全部副本 | 没配 `minReadySeconds`，探针通过就算成功 | 配 `minReadySeconds: 30`；异常时先 `rollout pause` |
| 灰度期间看不出新版本有没有问题 | 日志/指标没有 version 标签，无法按版本拆分 | 注入 `APP_VERSION`，日志 `base` 和指标 `setDefaultLabels` 带上 |

### 排查手册

| 看什么指标 | 用什么工具 | 定位到代码 | 怎么验证 |
| --- | --- | --- | --- |
| Pod `RESTARTS` 增长 + Exit Code | `kubectl describe pod` 的 Last State | 137 → OOMKill 或宽限期超时；1 → `uncaughtException`；143 → 128+15 正常收到 SIGTERM | 137 时对比 `--max-old-space-size` 与 memory limit |
| 容器内存占用逼近 limit | `kubectl top pod`、`container_memory_working_set_bytes` | 与 `nodejs_heap_size_used_bytes` 对比：堆没涨但 RSS 涨 → 堆外泄漏（Buffer/原生模块） | 调整堆上限或修泄漏后观察趋势 |
| V8 实际堆上限是多少 | `node -e "console.log(require('v8').getHeapStatistics().heap_size_limit/1048576)"` | 与 cgroup limit 比，> 85% 就是配置错了 | 设 `NODE_OPTIONS` 后重新打印确认 |
| 容器实际内存限制 | `cat /sys/fs/cgroup/memory.max`（v2） | 与 Deployment 里的 limits 对比，确认没被 LimitRange 改过 | — |
| SIGTERM 到底收到没 | `docker stop` 后看 `docker logs` 有没有退出日志 | 没有 → PID 1 / exec form 问题 | 加 `--init` 后重测，Exit Code 应为 0 |
| 进程树里 PID 1 是谁 | `kubectl exec -it <pod> -- ps -ef` | PID 1 是 `sh` / `npm` → 信号转发断了 | 改 exec form 后 PID 1 应是 `dumb-init` 或 `node` |
| PM2 重启次数异常 | `pm2 list` 的 ↺ 列、`pm2 describe` | 崩溃循环：看 `error_file` 里最后的堆栈 | `pm2 reset` 归零后观察是否再涨 |
| PM2 内存是否泄漏 | `pm2 monit`，或 `pm2 jlist \| jq .monit.memory` | 单调上升不回落 → 泄漏；锯齿 → 正常 | `max_memory_restart` 是兜底，不是修复 |
| 实际生效的环境变量 | `pm2 env <id>`；K8s 用 `kubectl exec -- env` | 与 ConfigMap/Secret 对比，找漏配或被覆盖的项 | 修正后 `restart --update-env` |
| 镜像里到底有什么 | `docker history <image>`、`dive <image>` | 找出体积最大的层和意外被打进去的文件 | 补 `.dockerignore` 后体积应下降 |
| 发布是否卡住 | `kubectl rollout status`、`kubectl get rs` | 新 RS 的 Pod 一直不 Ready → 看 readiness 探针和启动日志 | `rollout pause` 止损，修复后 resume |
| 灰度版本是否更差 | Grafana 按 `version` / `track` 拆分 RED 指标 | canary 的错误率/P99 显著高于 stable → 回滚 | 回滚后差异消失即确认 |

---

## 面试常见问答

**Q1：PM2、Docker、K8s 三种形态怎么选？容器里还要不要用 PM2 cluster？**

先看有没有现成的 K8s 平台：有就直接上，因为故障自愈、弹性伸缩、灰度发布、健康检查这些能力是平台白送的，自己用 PM2 重造性价比极低。没有平台的话看服务重要性——内部工具、单机够用就 PM2，别过度工程；线上核心业务想办法上云容器服务，因为单机方案没有跨机自愈，机器挂了就是全站挂。关于容器里用 PM2：**能跑但不该用**，这是新手最常见的错误组合。容器编排层已经提供了进程守护、多实例、故障自愈、滚动发布这四件 PM2 的核心能力，叠加只有坏处：`instances: 'max'` 读到的是宿主机核数不是 cgroup 配额，可能在 1 个 CPU 上起 16 个 worker；探针探到的是 PM2 主进程和端口，worker 全崩了探针还返回 200；信号要多经过 PM2 一层转发，`kill_timeout` 和 `terminationGracePeriodSeconds` 要同时对齐；HPA 和 PM2 的进程数两套伸缩机制打架，容量根本算不清。正确做法是一个容器一个 Node 进程，扩缩容交给编排层扩副本。唯一合理的例外是老项目容器化的过渡期。

**Q2：`pm2 reload` 和 `pm2 restart` 有什么区别？**

`restart` 是所有进程一起停再一起起，中间有停机窗口；`reload` 是逐个替换 worker——先起新进程，等它就绪，再让老进程优雅退出，所以是零停机的。但 reload 有两个前提，缺一个就不是真的零停机：第一是必须 `exec_mode: 'cluster'`，fork 模式只有一个进程，reload 会退化成 restart；第二是要配 `wait_ready: true` 并在代码里 `process.send('ready')`，否则 PM2 一看到进程启动就摘掉老进程，而这时新进程可能还没连上数据库。还有个必配项是 `kill_timeout`，PM2 默认只有 1600 毫秒，优雅退出的 drain 根本走不完就被杀了，要设成大于代码里的 `forceTimeout`。另外注意改了 `ecosystem.config.js` 必须用 `restart --update-env`，reload 不会重新读配置。

**Q3：Node 的 Dockerfile 有哪些必做优化？为什么需要 `--init`？**

四类优化。第一是多阶段构建：builder 阶段装全量依赖并构建，单独一个 prod-deps 阶段跑 `npm ci --omit=dev`，最终的 runner 阶段只从前面拷 `node_modules` 和 `dist`，源码、devDependencies、构建缓存都不进最终镜像。第二是层缓存：先 `COPY package.json package-lock.json` 再 `npm ci`，最后才 `COPY . .`，这样改业务代码不会让依赖安装层失效。第三是安全：`USER node` 非 root 运行、写 `.dockerignore` 排除 `node_modules` 和 `.env*`、镜像 tag 用具体版本不用 `:latest`。第四就是 `--init`。这一点和优雅退出强关联：容器里 PID 1 有特殊语义，没显式注册 handler 的信号会被内核忽略。如果写 `CMD node server.js`（shell form），实际执行的是 `/bin/sh -c "node ..."`，PID 1 是 sh，而 sh 不转发信号给子进程，node 永远收不到 SIGTERM，宽限期到了直接被 SIGKILL——优雅退出代码一行都没跑。`CMD ["npm","start"]` 也一样，npm 的信号转发不完整。所以要用 exec form 加 `dumb-init`（或 `docker run --init`），它会把信号转发给整个进程组，同时负责收割僵尸进程。验证方法很简单：`docker stop` 之后看 Exit Code，0 是优雅退出成功，137 就是被 SIGKILL 了。

**Q4：容器设了 memory limit，为什么 Node 还是被 OOMKill？**

因为 Node 默认感知不到 cgroup 限制。V8 的老生代堆上限是根据「它看到的系统内存」推算的，而进程读到的是宿主机的总内存，比如 64GB，于是把堆上限定得远高于容器的 512Mi。运行时 V8 心想「我的堆上限还很远，不用着急做 Full GC」，内存就一路涨到容器 limit，然后被 cgroup OOM killer 直接 SIGKILL，Exit Code 137。最糟的是这个 SIGKILL 内核发的、不可捕获，优雅退出一行都跑不了，日志里通常什么都没有——进程是被瞬间销毁的。解法是显式设 `--max-old-space-size` 为 limit 的 75% 左右，比如 512Mi 容器设 384。这样堆逼近上限时 V8 会主动做 Full GC 努力回收，实在回收不掉才抛 `JavaScript heap out of memory`——那是 Node 主动抛的、可以被 `uncaughtException` 捕获的错误，能记日志、能走优雅退出、能告警。为什么是 75%：剩下的 25% 要留给堆外内存，包括新生代、Buffer 和 TypedArray（走 external memory，不受这个参数限制）、原生模块内存、线程栈、V8 自身元数据。如果应用大量用 Buffer 或有 sharp、canvas 这类原生模块，要压到 60~65%；容器小到 256Mi 时固定开销占比更高，也要更保守。我一般还会在启动时读 `/sys/fs/cgroup/memory.max` 和 `v8.getHeapStatistics().heap_size_limit` 做个自检，比例超标直接 `exit(1)` 快速失败，比线上跑几小时被静默杀掉好得多。

**Q5：配置怎么管？`.env` 能不能进镜像？**

不能。判断配置管理做对没有，有个很简单的标准：这份代码能不能在不改任何一行的前提下直接开源出去？能就是对的。`.env` 有三种错误用法：进 git（`git log` 里永远留着旧密码，即使后来删了也能翻出来）、进镜像（`docker history` 就能扒出来，镜像仓库里所有人可见）、生产依赖 `.env` 文件（密钥轮转要登机器改文件，无法审计，多副本还容易漂移）。正确做法是分环境：本地开发用 `.env` 并加进 `.gitignore`，同时提交一个只有变量名和格式的 `.env.example` 作为文档；CI 用流水线的加密变量；生产用环境变量，来源是 K8s Secret 或配置中心。代码里 `dotenv` 只在非生产环境加载，避免本地文件覆盖 Secret。另外两个要点：一是 `.dockerignore` 必须排除 `.env*`；二是启动时要校验配置，我一般用 zod 声明所有环境变量的类型、默认值和校验规则（比如 `JWT_SECRET` 至少 32 字符），缺失或格式错就一次列出所有问题然后 `exit(1)`。这叫快速失败——不校验的话，可能上线几小时后某个接口第一次用到 `JWT_SECRET` 才报 `secretOrPrivateKey must have a value`，这个错误信息完全指不向「环境变量没配」这个根因。K8s 里 `exit(1)` 会变成 CrashLoopBackOff，一眼就知道是配置问题。最后，Secret 本身也要注意：K8s Secret 默认只是 base64 编码不是加密，真正安全需要开 etcd 静态加密、限制 RBAC、用 External Secrets 从 Vault 同步，Secret YAML 也不该进 git，要用 sealed-secrets 或 SOPS 加密。

---

## 关联笔记

- [优雅退出与健康检查](./优雅退出与健康检查.md) —— **强关联**：本篇第 3.3 节的 PID 1 信号转发是那篇优雅退出能否生效的前提；那篇讲信号处理与探针语义，本篇讲承载它的容器与编排配置（`terminationGracePeriodSeconds`、`preStop`、PM2 `kill_timeout`）
- [Node 错误处理与异常兜底体系](./Node错误处理与异常兜底体系.md) —— 本篇第四章说的「V8 主动抛 heap out of memory」由那篇的 `uncaughtException` 兜底；进程退出后由谁重启则取决于本篇的 PM2 / K8s 重启策略
- [Node 日志与可观测性体系](./Node日志与可观测性体系.md) —— 本篇的 `APP_VERSION` 注入是那篇日志 `base` 字段和指标 `setDefaultLabels` 的来源，也是第 6.3 节灰度对比的前提；「日志写 stdout 不写文件」的完整论证在那篇第七章
- [Node.js 面试核心知识点](../Node.js面试核心知识点.md) —— 第五章有 `cluster` / `child_process` 基础 API；本篇第 1.2 节讨论的是「容器化后还要不要用它做多进程」
- [CI/CD 持续集成与部署](../../09-工程化/CI-CD持续集成与部署.md) —— 前端部署视角的流水线与发布，可与本篇第六章的发布策略对照阅读
- [Todo 全栈项目](../../11-项目实战/Todo全栈项目/README.md) —— 第 5.2 节提到该项目当前 `src/app.js` 无条件 `require('dotenv').config()`，容器化时需要按本篇改造
- [生产运维专题索引](./README.md) —— 本模块四篇的推荐阅读顺序

