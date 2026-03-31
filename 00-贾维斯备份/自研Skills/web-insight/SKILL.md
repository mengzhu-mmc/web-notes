---
name: web-insight
description: 前端技术雷达。监控前端优质博客和技术站点，过滤已读文章，推送值得关注的新内容。当用户提到：前端雷达、技术扫描、有啥新东西、张鑫旭有啥新的、阮一峰有啥新的、前端新文章、保存到笔记时触发。
---

# Web Insight — 前端技术雷达

## 职责

定期抓取前端优质博客最新文章，去重过滤已读内容，按重要程度排序输出，支持一键保存为笔记。

---

## 1. 监控源列表

| 名称 | URL | 类型 |
|------|-----|------|
| 张鑫旭博客 | https://www.zhangxinxu.com/wordpress/ | CSS/JS 实战 |
| 阮一峰周刊 | https://ruanyifeng.com/blog/ | 技术周刊 |
| CSS-Tricks | https://css-tricks.com/ | CSS 深度 |
| web.dev | https://web.dev/blog/ | Web 标准/性能 |
| Chrome 开发者博客 | https://developer.chrome.com/blog/ | 浏览器新特性 |

---

## 2. 触发词映射

| 用户说 | 执行 |
|--------|------|
| 「前端雷达」「技术扫描」「有啥新东西」 | 全量扫描所有源 |
| 「张鑫旭有啥新的」「阮一峰有啥新的」等 | 只扫指定来源 |
| 「保存到笔记」 | 将当前扫描结果整理成笔记存入 notes/ |
| 「前端新文章」 | 全量扫描（同全量） |

---

## 3. 工作流

### Step 1：读取已读列表
```
read: data/web-insight-seen.json
格式：{ "seen": ["url1", "url2", ...] }
如果文件不存在，初始化为 { "seen": [] }
```

### Step 2：抓取各源最新文章
对每个监控源，使用 `web_fetch` 获取首页/博客列表页，提取：
- 文章标题
- 文章 URL
- 发布日期（如有）

### Step 3：过滤已读
将抓取到的 URL 与 `seen` 列表对比，只保留新文章。

### Step 4：相关性判断
对新文章标题做快速判断，过滤掉明显不相关内容（如纯营销、非技术内容）。
保留：CSS 新特性、JS 新 API、浏览器更新、性能优化、工程化、框架进展等。

### Step 5：输出报告
```
🔭 前端技术雷达 YYYY-MM-DD

⭐ 重点关注（高价值）
1. [标题](URL) — 来源：张鑫旭 — 简介：...
2. ...

📖 值得一读
1. [标题](URL) — 来源：web.dev
2. ...

📦 本次扫描：X 个新文章 | 已过滤 Y 个已读
```

### Step 6：更新已读列表
将本次扫描到的所有文章 URL 追加到 `data/web-insight-seen.json`。
保留最近 500 条，超出则删除最旧的。

---

## 4. 笔记生成（「保存到笔记」）

触发时，对重点关注文章执行：

1. `web_fetch` 获取文章全文
2. 提炼摘要（200-400字）+ 关键知识点
3. 生成 Markdown 笔记，按类型存入对应目录：

| 内容类型 | 存储路径 |
|---------|---------|
| CSS 相关 | `notes/css/YYYY-MM-DD-标题.md` |
| JavaScript 相关 | `notes/javascript/YYYY-MM-DD-标题.md` |
| 性能/工程化 | `notes/performance/YYYY-MM-DD-标题.md` |
| 其他/综合 | `notes/weekly-digest/YYYY-MM-DD-标题.md` |

**笔记模板：**
```markdown
# [文章标题]

> 来源：[博客名](原文链接) | 日期：YYYY-MM-DD

## 核心内容

[提炼的摘要]

## 关键知识点

- ...
- ...

## 代码示例

[如有，附关键代码]

## 面试相关

- [可能的面试考点]

## 相关笔记

- [[相关笔记双链]]
```

---

## 5. 数据文件

- **已读列表**：`data/web-insight-seen.json`
- **格式**：`{ "seen": ["url1", "url2"], "lastScan": "2026-03-18T10:00:00+08:00" }`

首次运行时自动创建 `data/` 目录和文件。

---

## 6. 执行步骤（Agent 操作指南）

```
1. 读取触发词，确定扫描范围（全量 or 指定源）
2. exec: mkdir -p /root/.openclaw/workspace/data
3. 读取 data/web-insight-seen.json（不存在则初始化）
4. 对目标源逐个调用 web_fetch 获取列表页
5. 解析文章列表（标题 + URL）
6. 过滤 seen 列表中已有的 URL
7. 对新文章做相关性判断
8. 输出报告（按重要程度排序）
9. 更新 data/web-insight-seen.json
10. 如果用户说「保存到笔记」，对 ⭐ 重点文章 fetch 全文并生成笔记
```

---

## 7. 配合 HEARTBEAT.md

每工作日心跳时检查：
1. 读取 `memory/heartbeat-state.json` 中 `lastWebInsightScan` 字段
2. 如果距上次扫描 > 24h，触发全量扫描
3. 有新文章 → 推送简报到钉钉
4. 更新 `lastWebInsightScan` 时间戳
