#!/usr/bin/env node
/**
 * self-heal — 系统自愈 skill
 * 检测并自动修复常见异常，修不了的记录等用户上线提醒
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const ISSUES_LOG = path.join(__dirname, 'pending_issues.json');
const CRON_JOBS_PATH = '/mnt/openclaw/.openclaw/cron/jobs.json';

// ── 工具函数 ──────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[self-heal ${ts}] ${msg}`);
}

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function run(cmd, opts = {}) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', timeout: 10000, ...opts }).trim() };
  } catch (e) {
    return { ok: false, out: e.message };
  }
}

// ── 持久化问题记录 ────────────────────────────────────

function loadIssues() {
  return readJson(ISSUES_LOG) || { pending: [] };
}

function saveIssue(type, detail) {
  const issues = loadIssues();
  const existing = issues.pending.find(i => i.type === type);
  if (!existing) {
    issues.pending.push({ type, detail, first_seen: new Date().toISOString() });
    writeJson(ISSUES_LOG, issues);
    log(`⚠️  新问题记录: ${type} — ${detail}`);
  }
}

function resolveIssue(type) {
  const issues = loadIssues();
  const before = issues.pending.length;
  issues.pending = issues.pending.filter(i => i.type !== type);
  if (issues.pending.length < before) {
    writeJson(ISSUES_LOG, issues);
    log(`✅ 问题已解决: ${type}`);
  }
}

// ── 检测 1: Gateway 进程 ──────────────────────────────

function checkGateway() {
  log('检查 gateway 进程...');
  const res = run("pgrep -f 'gateway-cli'");
  if (!res.ok || !res.out.trim()) {
    log('❌ Gateway 进程不存在，尝试重启...');
    // 用 nohup 后台重启
    const restart = run(
      'nohup openclaw gateway run >> /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>&1 &',
      { shell: true }
    );
    // 等 3 秒确认是否拉起
    run('sleep 3');
    const check = run("pgrep -f 'gateway-cli'");
    if (check.ok && check.out.trim()) {
      log('✅ Gateway 重启成功 PID: ' + check.out.trim());
      resolveIssue('gateway_down');
    } else {
      log('❌ Gateway 重启失败');
      saveIssue('gateway_down', 'Gateway 进程不存在且重启失败');
    }
  } else {
    log(`✅ Gateway 运行中 (PID: ${res.out.trim()})`);
    resolveIssue('gateway_down');
  }
}

// ── 检测 1b: 钉钉连接状态告警 ────────────────────────

function checkDingTalkConnectAlive() {
  log('检查钉钉 WebSocket 连接时效...');
  const today = new Date().toISOString().slice(0, 10);
  const logFile = `/tmp/openclaw/openclaw-${today}.log`;

  if (!fs.existsSync(logFile)) {
    log('⚠️  今日日志文件不存在，跳过');
    return;
  }

  // 找最后一条 connect success 的时间
  const res = run(`grep 'connect success' "${logFile}" | tail -1`);
  if (!res.ok || !res.out.trim()) {
    log('⚠️  未找到 connect success 记录');
    saveIssue('ddingtalk_connect_stale', '今日未见钉钉 connect success 记录');
    return;
  }

  // 解析时间戳（格式如 2026-03-24T14:43:13）
  const match = res.out.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (!match) {
    log('⚠️  无法解析 connect success 时间戳');
    return;
  }

  const lastConnectTime = new Date(match[1] + 'Z'); // UTC
  const nowMs = Date.now();
  const diffMin = (nowMs - lastConnectTime.getTime()) / 60000;

  log(`最后 connect success: ${match[1]} (${diffMin.toFixed(1)} 分钟前)`);

  if (diffMin > 10) {
    log(`❌ 钉钉连接超过 ${diffMin.toFixed(0)} 分钟未刷新，疑似断连`);
    saveIssue('ddingtalk_connect_stale', `钉钉 connect success 距今 ${diffMin.toFixed(0)} 分钟，疑似断连`);
    // 尝试自愈：重启 gateway
    log('尝试重启 gateway 自愈...');
    const pid = run("pgrep -f 'gateway-cli'");
    if (pid.ok && pid.out.trim()) {
      run(`kill ${pid.out.trim()}`);
      run('sleep 2');
    }
    run('nohup openclaw gateway run >> /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>&1 &', { shell: true });
    log('Gateway 已重启');
  } else {
    log(`✅ 钉钉连接正常（${diffMin.toFixed(1)} 分钟前刷新）`);
    resolveIssue('ddingtalk_connect_stale');
  }
}

// ── 检测 1c: 私聊 session deliveryContext 完整性 ─────

function checkDingTalkPrivateSessions() {
  log('检查钉钉私聊 session deliveryContext...');
  const sessionsDir = '/root/.openclaw/agents/main/sessions';
  if (!fs.existsSync(sessionsDir)) return;

  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
  let fixed = 0;

  for (const file of files) {
    const filePath = path.join(sessionsDir, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (e) { continue; }

    // 只处理钉钉私聊 session：必须同时满足：
    // 1. 内容包含 ddingtalk 特征
    // 2. type=session 行缺少 deliveryContext
    const hasDingTalkSign = content.includes('messageChannel=ddingtalk') ||
                            content.includes('ddingtalk:direct') ||
                            content.includes('[DingTalk]');
    if (!hasDingTalkSign) continue;

    // 找 type=session 那行，检查有没有 deliveryContext
    const lines = content.split('\n').filter(l => l.trim());
    let sessionMeta = null;
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.type === 'session') { sessionMeta = d; break; }
      } catch (e) {}
    }

    if (!sessionMeta) continue;

    // deliveryContext 存在且有 channel 字段 → 健康，跳过
    const dc = sessionMeta.deliveryContext;
    if (dc && dc.channel) continue;

    // deliveryContext 缺失且内容确实包含钉钉私聊消息 → 损坏
    const hasDingTalkDirect = content.includes('ddingtalk:direct') ||
                              (content.includes('messageChannel=ddingtalk') && content.includes('单聊'));
    if (!hasDingTalkDirect) continue;

    if (!dc || !dc.channel) {
      log(`❌ 发现损坏的钉钉私聊 session: ${file}，deliveryContext 缺失，自动删除`);
      const backupPath = filePath + `.bad-${Date.now()}`;
      fs.renameSync(filePath, backupPath);
      // 删除 lock 文件
      const lockPath = filePath + '.lock';
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      fixed++;
    }
  }

  if (fixed > 0) {
    log(`✅ 已清理 ${fixed} 个损坏的私聊 session，下次私聊将自动重建`);
    resolveIssue('ddingtalk_session_broken');
  } else {
    log('✅ 钉钉私聊 session 完整性正常');
    resolveIssue('ddingtalk_session_broken');
  }
}

// ── 检测 2: Channel 状态 ─────────────────────────────

function checkChannels() {
  log('检查 channel 状态...');
  const res = run('openclaw channels status 2>&1');
  if (!res.ok) {
    log('⚠️  无法检查 channel 状态');
    return;
  }

  const out = res.out;
  const ddingtalkOk = out.includes('DingTalk') && out.includes('running');
  const daxiangOk = out.includes('Daxiang') && out.includes('running');

  if (!ddingtalkOk) {
    log('❌ 钉钉 channel 异常，尝试重启 gateway...');
    const pid = run("ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}'");
    if (pid.ok && pid.out.trim()) {
      run(`kill -HUP ${pid.out.trim()}`);
      log('已发送 SIGHUP 给 gateway，等待重连...');
      resolveIssue('ddingtalk_disconnected');
    } else {
      saveIssue('ddingtalk_disconnected', '钉钉 channel 异常且 gateway 进程不存在');
    }
  } else {
    resolveIssue('ddingtalk_disconnected');
    log('✅ 钉钉 channel 正常');
  }

  if (!daxiangOk) {
    log('❌ 大象 channel 异常');
    saveIssue('daxiang_disconnected', '大象 channel 异常');
  } else {
    resolveIssue('daxiang_disconnected');
    log('✅ 大象 channel 正常');
  }
}

// ── 检测 3: Cron 任务 delivery target 失效 ───────────

function checkCronTargets() {
  log('检查 cron 任务 delivery target...');
  const cfg = readJson(CONFIG_PATH);
  if (!cfg) {
    log('⚠️  config.json 不存在，跳过 cron 检查');
    return;
  }

  const jobs = readJson(CRON_JOBS_PATH);
  if (!jobs || !jobs.jobs) {
    log('⚠️  无法读取 cron jobs');
    return;
  }

  const validDdingTargets = [cfg.ddingtalk_staff_id];
  const validDaxiangTargets = [
    `single_${cfg.daxiang_user_id}`,
    cfg.daxiang_user_id
  ];

  let fixed = 0;
  let modified = false;

  for (const job of jobs.jobs) {
    const d = job.delivery || {};
    const ch = d.channel;
    const to = d.to;
    const state = job.state || {};

    if (!to || !ch) continue;

    // 跳过 consecutive errors = 0 的健康任务
    const errors = state.consecutiveErrors || 0;
    const lastStatus = state.lastRunStatus || '';

    // 只修复有持续失败记录的任务
    if (errors < 2 && lastStatus !== 'error') continue;

    let needFix = false;
    let newTo = null;

    if (ch === 'ddingtalk') {
      // 检查是否是旧格式 staffId（包含 - 分隔的旧格式）
      if (to && to.includes('-') && !validDdingTargets.includes(to)) {
        needFix = true;
        newTo = cfg.ddingtalk_staff_id;
      }
    } else if (ch === 'daxiang') {
      // 检查大象 target 格式
      const rawId = to.replace(/^single_/, '');
      if (rawId !== cfg.daxiang_user_id) {
        needFix = true;
        newTo = `single_${cfg.daxiang_user_id}`;
      }
    }

    if (needFix && newTo) {
      log(`🔧 修复 cron [${job.name}]: ${to} → ${newTo}`);
      job.delivery.to = newTo;
      modified = true;
      fixed++;
    }
  }

  if (modified) {
    writeJson(CRON_JOBS_PATH, jobs);
    log(`✅ 修复了 ${fixed} 个 cron 任务 target`);
    // 重载 gateway
    const pid = run("ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}'");
    if (pid.ok && pid.out.trim()) {
      run(`kill -HUP ${pid.out.trim()}`);
      log('已通知 gateway 重载配置');
    }
    resolveIssue('cron_target_invalid');
  } else {
    log('✅ Cron 任务 target 检查正常');
    resolveIssue('cron_target_invalid');
  }
}

// ── 检测 4: openclaw.json 钉钉 deliveryTo 完整性 ─────
// 经验来自 2026-03-24 故障：deliveryTo / defaultTarget 为空
// 导致主动发送时出现 staffId.notExisted: 400

function checkDingTalkDeliveryConfig() {
  log('检查 openclaw.json 钉钉 deliveryTo 配置...');
  const cfg = readJson(CONFIG_PATH);
  const ocCfgPath = '/root/.openclaw/openclaw.json';

  if (!fs.existsSync(ocCfgPath)) {
    log('⚠️  openclaw.json 不存在，跳过');
    return;
  }

  let ocCfg;
  try {
    ocCfg = JSON.parse(fs.readFileSync(ocCfgPath, 'utf8'));
  } catch (e) {
    log('⚠️  openclaw.json 读取失败: ' + e.message);
    return;
  }

  const ddCh = ocCfg?.channels?.ddingtalk;
  if (!ddCh) {
    log('⚠️  openclaw.json 中无 ddingtalk channel 配置，跳过');
    return;
  }

  const hasDeliveryTo = ddCh.deliveryTo && ddCh.deliveryTo.trim();
  const hasDefaultTarget = ddCh.defaultTarget && ddCh.defaultTarget.trim();

  if (!hasDeliveryTo || !hasDefaultTarget) {
    log('❌ ddingtalk deliveryTo 或 defaultTarget 为空');

    // 如果 config.json 有持久化的 staffId，尝试自动修复
    if (cfg && cfg.ddingtalk_staff_id) {
      const staffId = cfg.ddingtalk_staff_id;
      log(`🔧 使用持久化 staffId 自动补全: ${staffId}`);

      try {
        if (!hasDeliveryTo) ddCh.deliveryTo = staffId;
        if (!hasDefaultTarget) ddCh.defaultTarget = staffId;

        // 写回（注意：openclaw.json 是敏感文件，只修改 delivery 相关字段）
        fs.writeFileSync(ocCfgPath, JSON.stringify(ocCfg, null, 2), 'utf8');
        log('✅ deliveryTo/defaultTarget 已自动补全，需重启 gateway 生效');

        // 重启 gateway
        const pid = run("pgrep -f 'gateway-cli'");
        if (pid.ok && pid.out.trim()) {
          run(`kill ${pid.out.trim()}`);
          run('sleep 2');
        }
        run(
          'nohup openclaw gateway run >> /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>&1 &',
          { shell: true }
        );
        log('✅ Gateway 已重启，deliveryTo 修复完成');
        resolveIssue('ddingtalk_delivery_empty');
      } catch (e) {
        log('❌ 自动修复失败: ' + e.message);
        saveIssue(
          'ddingtalk_delivery_empty',
          `钉钉 deliveryTo/defaultTarget 为空，自动修复失败: ${e.message}`
        );
      }
    } else {
      saveIssue(
        'ddingtalk_delivery_empty',
        '钉钉 deliveryTo/defaultTarget 为空，且 config.json 中无 staffId，需手动配置'
      );
    }
  } else {
    log(`✅ deliveryTo=${ddCh.deliveryTo} defaultTarget=${ddCh.defaultTarget} 正常`);
    resolveIssue('ddingtalk_delivery_empty');
  }
}

// ── 检测 5: 私聊 session deliveryContext 完整性 v2 ───
// 经验来自 2026-03-24 故障：session a4ee8b9a 的 type:session 行缺少
// deliveryContext.channel，导致私聊回复路由到大象 BridgeClient

function checkPrivateSessionDeliveryContext() {
  log('检查私聊 session deliveryContext 完整性 (v2)...');
  const sessionsDir = '/root/.openclaw/agents/main/sessions';
  if (!fs.existsSync(sessionsDir)) {
    log('⚠️  sessions 目录不存在，跳过');
    return;
  }

  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
  let cleaned = 0;

  for (const file of files) {
    const filePath = path.join(sessionsDir, file);
    let lines;
    try {
      lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
    } catch (e) { continue; }

    // 找 type=session 元数据行
    let sessionMeta = null;
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.type === 'session') { sessionMeta = d; break; }
      } catch (e) {}
    }
    if (!sessionMeta) continue;

    // 判断是否是私聊 session（有 inboundMeta 或消息体包含私聊特征）
    const raw = fs.readFileSync(filePath, 'utf8');
    const isDdPrivate =
      raw.includes('"chat_type":"direct"') ||
      raw.includes('ddingtalk:direct') ||
      raw.includes('conversationId":"single_') ||
      (raw.includes('ddingtalk') && raw.includes('chat_type') && raw.includes('direct'));

    if (!isDdPrivate) continue;

    const dc = sessionMeta.deliveryContext;
    const channelOk = dc && dc.channel;
    const toOk = dc && (dc.to || dc.userId || dc.staffId);

    if (!channelOk || !toOk) {
      log(`❌ 私聊 session ${file} deliveryContext 不完整 (channel=${dc?.channel}, to=${dc?.to})`);
      // 重命名备份，让系统重建
      const backupPath = filePath + `.bad-${Date.now()}`;
      try {
        fs.renameSync(filePath, backupPath);
        const lockPath = filePath + '.lock';
        if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
        log(`✅ 已备份损坏 session → ${path.basename(backupPath)}，下次私聊将重建`);
        cleaned++;
      } catch (e) {
        log('❌ 备份失败: ' + e.message);
        saveIssue('ddingtalk_session_broken', `session ${file} deliveryContext 损坏且无法自动清理`);
      }
    }
  }

  if (cleaned > 0) {
    log(`✅ 清理了 ${cleaned} 个损坏私聊 session`);
    resolveIssue('ddingtalk_session_broken');
  } else {
    log('✅ 私聊 session deliveryContext 全部正常');
  }
}

// ── 检测 6: WebSocket 断线后未重连检测 ───────────────
// 经验来自 2026-03-24：21:50 断线后 gateway 未自动重连，
// 直到用户发现才手动重启，此检测可更早发现

function checkWebSocketReconnect() {
  log('检查 WebSocket 重连状态...');
  const today = new Date().toISOString().slice(0, 10);
  const logFile = `/tmp/openclaw/openclaw-${today}.log`;

  if (!fs.existsSync(logFile)) {
    log('⚠️  今日日志不存在，跳过 WS 重连检测');
    return;
  }

  const raw = fs.readFileSync(logFile, 'utf8');
  const lines = raw.split('\n');

  // 找最后一条 close / error / disconnect 事件
  const closeLines = lines.filter(l =>
    l.includes('close') || l.includes('disconnect') || l.includes('WebSocket') && l.includes('error')
  );
  const connectLines = lines.filter(l => l.includes('connect success'));

  if (closeLines.length === 0) {
    log('✅ 今日无 WebSocket 断线记录');
    resolveIssue('ws_reconnect_failed');
    return;
  }

  const lastClose = closeLines[closeLines.length - 1];
  const lastConnect = connectLines.length > 0 ? connectLines[connectLines.length - 1] : null;

  // 提取时间戳
  const closeTs = lastClose.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)?.[1];
  const connectTs = lastConnect?.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)?.[1];

  if (!closeTs) {
    log('⚠️  无法解析断线时间戳，跳过');
    return;
  }

  const closeTime = new Date(closeTs + 'Z').getTime();
  const connectTime = connectTs ? new Date(connectTs + 'Z').getTime() : 0;

  // 如果最后一次断线在最后一次重连之后 → 当前处于断线状态
  if (closeTime > connectTime) {
    const diffMin = (Date.now() - closeTime) / 60000;
    log(`❌ WebSocket 断线 ${diffMin.toFixed(0)} 分钟后未重连，尝试重启 gateway`);
    saveIssue('ws_reconnect_failed', `WebSocket 断线 ${diffMin.toFixed(0)} 分钟未重连`);

    // 自愈：重启 gateway
    const pid = run("pgrep -f 'gateway-cli'");
    if (pid.ok && pid.out.trim()) {
      run(`kill ${pid.out.trim()}`);
      run('sleep 2');
    }
    run(
      'nohup openclaw gateway run >> /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log 2>&1 &',
      { shell: true }
    );
    log('✅ Gateway 已重启，等待重连...');
  } else {
    log(`✅ 最后断线后已成功重连（connect: ${connectTs}）`);
    resolveIssue('ws_reconnect_failed');
  }
}

// ── 检测 7: 待处理问题 ───────────────────────────────

function reportPendingIssues() {
  const issues = loadIssues();
  if (issues.pending.length === 0) return;

  log(`\n⚠️  有 ${issues.pending.length} 个待处理问题需要你确认：`);
  for (const issue of issues.pending) {
    log(`  - [${issue.type}] ${issue.detail} (首次发现: ${issue.first_seen})`);
  }

  // 通过 message 工具通知用户（在 OpenClaw 环境中）
  // 这里输出到 stdout，由 heartbeat 或 cron 捕获后推送
  console.log('\n__PENDING_ISSUES__:' + JSON.stringify(issues.pending));
}

// ── 主流程 ────────────────────────────────────────────

async function main() {
  log('=== 开始自愈检查 ===');

  // 基础进程检测
  checkGateway();

  // WebSocket 层检测（新增：基于 2026-03-24 断线未重连故障）
  checkWebSocketReconnect();

  // 连接层检测
  checkDingTalkConnectAlive();

  // Session 层检测（v1 旧逻辑 + v2 新逻辑）
  checkDingTalkPrivateSessions();         // v1: 旧版特征检测
  checkPrivateSessionDeliveryContext();   // v2: 精准 deliveryContext 字段检测（新增）

  // Channel 配置检测
  checkChannels();

  // openclaw.json 钉钉 delivery 配置检测（新增：基于 2026-03-24 deliveryTo 为空故障）
  checkDingTalkDeliveryConfig();

  // Cron 任务检测
  checkCronTargets();

  // 汇报待处理问题
  reportPendingIssues();

  log('=== 自愈检查完成 ===');
}

main().catch(e => {
  console.error('[self-heal] 致命错误:', e);
  process.exit(1);
});

module.exports = {
  main,
  checkGateway,
  checkChannels,
  checkCronTargets,
  checkDingTalkDeliveryConfig,
  checkPrivateSessionDeliveryContext,
  checkWebSocketReconnect,
};
