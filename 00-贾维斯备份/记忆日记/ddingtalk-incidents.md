# 钉钉机器人故障记录

## 2026-03-10 故障（第二次 17:42）

**现象**：钉钉机器人又无法回复

**根因**：和上午一样，代理问题。但深入发现：
- squid 代理 (`nocode-supabase-squid.sankuai.com:443`) → ECONNRESET（不支持 WSS）
- 直连外网 → ETIMEDOUT（沙箱防火墙不允许直连外网 443）
- **上游代理 (`10.59.78.158:3128`)** → ✅ 既支持 HTTP 又支持 WSS

**最终解决方案**：
1. 用 `/tmp/restart-gateway.sh` 脚本，将 `HTTPS_PROXY`/`HTTP_PROXY` 覆盖为上游代理 `http://10.59.78.158:3128`
2. 同时修改了两个文件的代码补丁：
   - `monitor.ts` — 优先使用 `UPSTREAM_PROXY_HOST:UPSTREAM_PROXY_PORT` 建立 WSS
   - `client.cjs`（SDK）— axios 请求也用上游代理
3. 重启 gateway（必须完整重启，热加载不会重新编译 jiti 缓存）

**验证成功日志**：`[DingTalk] [default] DingTalk WebSocket connected via proxy`

---

## 2026-03-10 故障（第一次 10:40）

**现象**：钉钉机器人不回复消息

**诊断过程**：
1. `openclaw status --deep` 显示 DingTalk: OFF / not configured
2. 检查配置发现 `channels.ddingtalk` 完全不存在（凭证丢失）
3. 重新写入 `clientId` 和 `clientSecret` 后，Health 显示 OK
4. 但仍不收消息，查日志发现 `DingTalk Stream 连接失败: read ECONNRESET`

**根因**：
1. **配置丢失** — `channels.ddingtalk` 的 `clientId`/`clientSecret` 被清空
2. **squid 代理不支持 WSS** — 导致 DingTalk Stream 无法建立

---

## 凭证备忘（仅记录 ID，secret 不存储）
- clientId: `dingwcgl3f9ff7svnots`

## 快速排查清单

1. `openclaw status --deep` → 看 Health 表 DingTalk 状态
2. 如果 **OFF/not configured** → 检查 `~/.openclaw/openclaw.json` 里 `channels.ddingtalk` 凭证
3. 如果 **OK 但不收消息** → 查日志：
   ```bash
   grep -i "dingtalk.*ECONN\|ETIMEDOUT\|stream.*fail\|connect success\|connected via proxy" /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | tail -10
   ```
4. 如果 **ECONNRESET** → squid 代理问题，运行 `/tmp/restart-gateway.sh` 用上游代理重启
5. 如果 **ETIMEDOUT** → 直连不通，必须走代理，确认上游代理 `10.59.78.158:3128` 可用
6. **注意**：代码补丁在 gateway 进程重启后才生效（jiti 缓存问题），热加载不够

## 修复脚本
```bash
bash /tmp/restart-gateway.sh
```
该脚本：杀 gateway → 清 jiti 缓存 → 设置上游代理环境变量 → 重启 gateway

## 已修改的文件
- `/mnt/openclaw/.openclaw/extensions/ddingtalk/src/monitor.ts` — 优先使用上游代理
- `/mnt/openclaw/.openclaw/extensions/ddingtalk/node_modules/dingtalk-stream/dist/client.cjs` — axios 用上游代理
- `/tmp/restart-gateway.sh` — 修复脚本
