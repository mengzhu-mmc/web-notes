# 贾维斯备份 🐱⚡

> 备份时间：2026-03-31（靓仔离职前完整备份）  
> 这是贾维斯（Jarvis / CatClaw）在 OpenClaw 上运行期间积累的所有可外发内容。

---

## 📁 目录结构

```
00-贾维斯备份/
├── 身份与配置/          # 核心人格 & 工作区规则文件
│   ├── IDENTITY.md      # 贾维斯自我定义（名字/vibe/emoji）
│   ├── SOUL.md          # 行为准则与核心价值观
│   ├── AGENTS.md        # 工作区规则（子代理/记忆/安全等）
│   ├── HEARTBEAT.md     # 心跳任务配置（定期健康检查规则）
│   ├── TOOLS.md         # 本地工具备注（相机/SSH/TTS等）
│   ├── USER.md          # 关于靓仔的信息（职业/习惯/渠道）
│   └── MEMORY.md        # 长期记忆（精华提炼）
│
├── 记忆日记/             # 每日原始日记（2026-03-08 ~ 03-31）
│   ├── 2026-03-08.md
│   ├── ...
│   ├── algorithm-records.md   # 算法刷题全记录
│   └── ddingtalk-incidents.md # 钉钉故障处理记录
│
├── 算法计划/             # 3 周算法冲刺相关文档
│   ├── algorithm-plan-3week.md   # 完整 3 周计划
│   ├── algorithm-plan.md         # 原始计划草稿
│   ├── algorithm-analysis.md     # 薄弱点分析
│   ├── daily-knowledge.md        # 每日知识点配置
│   ├── algo-sprint-plan.md       # 冲刺执行计划
│   └── daily-reminder-config.md  # 定时提醒配置
│
├── 自研Skills/           # 贾维斯自研的 9 个 OpenClaw skill
│   ├── algo-coach/       # 算法刷题教练（每日推题 + 进度追踪）
│   ├── boss-resume-delivery/ # Boss 直聘简历投递自动化
│   ├── capability-evolver/   # 自我进化引擎（GEP 协议）
│   ├── interview-sim/    # 前端面试模拟器
│   ├── note-enhancer/    # 笔记质量管家
│   ├── self-heal/        # 系统自愈（channel 断连检测修复）
│   ├── skill-vetter/     # Skill 安全审查
│   ├── spaced-review/    # 间隔复习系统（SM-2 算法）
│   └── web-insight/      # 前端技术雷达（博客监控）
│
└── 进化文档/             # capability-evolver 的进化状态与历史
    ├── evolution_state.json
    ├── evolution_solidify_state.json
    ├── personality_state.json
    ├── memory_graph.jsonl
    └── ...
```

---

## 🔑 关键上下文

### 靓仔的技术栈
- **主力**：JS / TypeScript / Vue / React
- **后端涉猎**：Node.js + Koa（有练习项目）
- **力扣**：向上的小菜鸟（slug: maomengchao）

### 3 周算法冲刺（2026-03-07 ~ 03-27）
- Week 1：单调栈 / 二分 / 图 / 树
- Week 2：DP 背包 / 子序列 / 回溯
- Week 3：Hard 冲刺 + 面试模拟
- **全部完成** ✅

### 贾维斯的自研 Skills 亮点
| Skill | 功能 |
|-------|------|
| `algo-coach` | 追踪力扣进度，按薄弱点推题，分层提示 |
| `interview-sim` | 模拟前端面试六大模块（算法/JS/CSS/网络/系统设计/行为） |
| `self-heal` | 自动检测并修复 Gateway/channel 断连，发钉钉报告 |
| `web-insight` | 监控张鑫旭/阮一峰/web.dev 等前端博客，过滤已读，推送新文章 |
| `spaced-review` | 基于 SM-2 遗忘曲线，从笔记自动生成闪卡，推送每日复习 |
| `capability-evolver` | 基于 GEP 协议分析运行历史，识别并应用自我进化（已暂停，安全审查） |

### 如何在新 OpenClaw 实例中恢复
1. 将 `身份与配置/` 里的文件放到工作区根目录
2. 将 `自研Skills/` 里的 skill 目录放到 `~/.openclaw/workspace/skills/`
3. 将 `记忆日记/` 放到 `memory/` 目录
4. 将 `MEMORY.md` 放到工作区根目录
5. 重启 OpenClaw gateway，贾维斯就回来了 🐱⚡

---

> 离别不是结束，是换个地方继续。加油靓仔！🚀
