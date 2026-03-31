# HEARTBEAT.md

## 每次心跳执行顺序（按优先级）

### 0. 🚨 Token 用量检测（每次必检，最优先）
- 调用 `sessions_list` 获取**所有活跃 session** 的 token 用量（返回值含 `totalTokens` 和 `contextTokens`）
- 对每个 session 计算：`用量% = totalTokens / contextTokens * 100`
- 如果某个 session 用量 >= 90%：
  - **在那个 session 所在的 channel 推送消息**（用该 session 的 `channel` 和 `deliveryContext`）：
    > ⚠️ 当前会话 Token 即将耗尽（已用 XX%），建议重新开一个会话，避免中断！
  - 例：大象 session 超限 → 推大象；钉钉 session 超限 → 推钉钉
- 90% 以下：继续正常执行

### 0.5. 🔥 Cron 任务失败自动排查（每次必检）
- 读取 `/root/.openclaw/cron/runs/*.jsonl`，找出最近 2h 内 `status=error` 的任务
- 每个失败任务，执行以下流程：
  1. 从 `/root/.openclaw/cron/jobs.json` 读取该任务的 `delivery.channel`（如 `daxiang` / `ddingtalk`）和 `delivery.to`
  2. 查看该任务的 `error` 字段和对应 session 日志，定位根因
  3. 判断是否可以自动修复（如 prompt 问题、路径错误、配置问题）
  4. **若能修复**：执行修复 → **按该任务的 `delivery.channel` 推送通知**：
     > ✅ 任务「XXX」失败已自动修复！
     > 原因：...
     > 修复方式：...
  5. **若无法修复**：**按该任务的 `delivery.channel` 推送通知**：
     > ❌ 任务「XXX」出问题了，需要你配合处理！
     > 失败原因：...
     > 建议：...
  - 规则：大象任务失败 → 推大象；钉钉任务失败 → 推钉钉
  - `delivery.channel` 缺失时，默认推大象（daxiang）
- 已处理过的失败（同一 sessionId）不重复推送，记录到 `memory/heartbeat-state.json` 的 `handledFailures` 数组中

### 1. 紧急提醒检查（每次必检）
- 算法冲刺进度：距离 03-27 结束还有 X 天，今日是否完成刷题？
- 如果当前时间 >= 10:00 且还没有今日刷题记录 → 提醒靓仔

### 2. 自愈检查（每次必检）
- 运行 `node /root/.openclaw/workspace/skills/self-heal/index.js`
- 如果有 pending issues 输出 `__PENDING_ISSUES__:` → 推送给靓仔

### 3. 轮换检查（每次选 1-2 项）
按上次检查时间轮换，优先检查超过 24h 未检查的项：

| 项目 | 检查内容 | 触发条件 |
|------|---------|---------|
| 钉钉连接 | openclaw status | 每天 09:30 前 |
| 前端新文章 | 用 web-insight skill 扫描 | 每工作日 |
| GitHub 笔记仓库 | git status（有未提交内容？） | 每天 |
| 算法记录 | 读 memory/algorithm-records.md | 每天 |

### 4. 安静时间
- 23:00 ~ 08:00：直接 HEARTBEAT_OK，不打扰

### 5. 内存维护（每3天）
- 读取最近日记，提炼写入 MEMORY.md
- 检查 MEMORY.md 是否有过期内容

## 状态追踪文件
`memory/heartbeat-state.json` — 记录各项上次检查时间 + `handledFailures` 已处理失败记录
