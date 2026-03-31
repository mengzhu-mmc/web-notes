---
name: self-heal
description: 系统自愈 skill。检测并自动修复常见异常：钉钉/大象 channel 断连、gateway 进程挂掉、cron 任务 delivery target 失效。能自动修复的默默修，修不了的记录下来等用户上线提醒。当用户提到：自愈、自修复、断连、channel 异常、cron 失败、gateway 挂了、userId 失效时触发。
---

# self-heal — 系统自愈

## 功能

1. **Gateway 进程检测** — 进程挂了自动重启
2. **WebSocket 断线未重连检测** *(新)* — 断线后若 N 分钟内未重连，自动重启 gateway
3. **钉钉连接时效检测** — `connect success` 超过 10 分钟未刷新，视为断连并重启
4. **私聊 session deliveryContext 检测 v2** *(新)* — 精准检测 `channel` / `to` 字段缺失，自动备份损坏 session，让系统重建
5. **Channel 连通性检测** — 检查 ddingtalk / daxiang channel 状态
6. **钉钉 deliveryTo 配置检测** *(新)* — 检测 `openclaw.json` 中 `deliveryTo` / `defaultTarget` 是否为空，用持久化 staffId 自动补全
7. **Cron delivery 失效检测** — 扫描连续失败的 cron 任务，自动修复

> 新增检测项来自 2026-03-24 钉钉断线故障复盘：WebSocket 断线 + deliveryContext 损坏 + deliveryTo 为空三重叠加

## 使用

```bash
node /root/.openclaw/workspace/skills/self-heal/index.js
```

## 持久化 userId 配置

用户 userId 存储在：`/root/.openclaw/workspace/skills/self-heal/config.json`

```json
{
  "ddingtalk_staff_id": "gjg_573puhob2",
  "daxiang_user_id": "3694469245",
  "last_updated": "2026-03-19"
}
```

## 集成到 HEARTBEAT

在 HEARTBEAT.md 中加入自愈检查，每次心跳自动运行。
