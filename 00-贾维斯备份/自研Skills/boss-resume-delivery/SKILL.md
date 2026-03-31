---
name: boss-resume-delivery
description: 在 BOSS 直聘上自动批量投递简历。支持按关键词、城市、薪资筛选岗位，自动判断是否符合投递条件并点击"立即沟通"完成投递。使用浏览器自动化工具操作。当用户说"帮我投简历"、"在BOSS直聘投递前端岗位"、"自动投递简历"、"继续投递"等时触发。
---

# BOSS 直聘简历自动投递

## 环境准备

用户需已在浏览器中登录 BOSS 直聘，并上传附件简历。投递前确认登录状态：

```bash
~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"document.body.innerText.slice(0,100)"}'
```

## 搜索岗位

用以下 URL 格式搜索（salary=15 表示 15K 以上）：

```
# 全国
https://www.zhipin.com/web/geek/jobs?query=react前端&salary=15

# 指定城市（city 代码见下方）
https://www.zhipin.com/web/geek/jobs?query=react前端&salary=15&city=101020100
```

**常用城市代码：**
- 北京：101010100（默认，不传 city 参数时为北京）
- 上海：101020100
- 深圳：101280600
- 广州：101280100
- 杭州：101210100
- 武汉：101200100

获取岗位列表：

```bash
~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"[...document.querySelectorAll(\"a[href*=job_detail]\")].filter(a=>!a.href.includes(\"securityId\")&&a.href.length>50).map(a=>({id:a.href.match(/job_detail\\/([^.]+)/)?.[1], title:a.innerText.trim().slice(0,40)})).filter(a=>a.id&&a.title)"}'
```

## 检查单个岗位

导航到详情页并提取 JD 内容：

```bash
~/.catpaw/bin/catdesk browser-action '{"action":"navigate","url":"https://www.zhipin.com/job_detail/<ID>.html"}' && sleep 2 && ~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"document.body.innerText.slice(0,1200)"}'
```

## 跳过条件（命中任意一条则跳过）

详见 `references/skip-rules.md`。

## 投递操作

确认符合条件后，点击"立即沟通"：

```bash
~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"document.querySelector(\".btn.btn-startchat\").click(); \"clicked\""}'
sleep 3
~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"document.querySelector(\".btn.btn-startchat\")?.innerText || \"ok\""}'
```

返回"继续沟通"说明投递成功。

## 城市切换策略

当前城市页面符合条件的岗位 **不超过 3 个**时，切换到下一个城市。推荐顺序：北京 → 上海 → 深圳 → 广州 → 杭州 → 武汉。

## 注意事项

- 每次 navigate 后 sleep 2 秒等待页面加载
- 投递成功后继续下一个，无需额外停顿
- 记录已投递数量，达到目标数后停止
- 已投递过的公司（同一家公司多个岗位）可跳过重复投递

## 常见问题处理

**搜索页岗位列表为空（result: []）**：页面可能未加载搜索结果，改用以下方式获取链接：
```bash
~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"[...document.querySelectorAll(\"a[href*=job_detail]\")].filter(a=>!a.href.includes(\"securityId\")&&a.href.length>50).map(a=>({id:a.href.match(/job_detail\\/([^.]+)/)?.[1], title:a.innerText.trim().slice(0,40)})).filter(a=>a.id&&a.title)"}'
```

**页面跳转到推荐/首页而非搜索结果**：BOSS 直聘会根据 cookie 中的城市设置重定向，先导航到搜索页再等待 4 秒，或手动在浏览器中搜索后再用 evaluate 提取链接。

**navigate 报错 Navigation failed**：等待 3 秒后重试一次；若仍失败则跳过该岗位。

**按钮找不到（querySelector 返回 null）**：用以下方式查找所有可点击元素：
```bash
~/.catpaw/bin/catdesk browser-action '{"action":"evaluate","script":"[...document.querySelectorAll(\"button,a\")].filter(e=>e.innerText.includes(\"沟通\")||e.innerText.includes(\"投递\")).map(e=>({tag:e.tagName,text:e.innerText.trim(),cls:e.className}))"}'
```

**已投递状态识别**：按钮文字变为"继续沟通"表示已投递成功；若已是"继续沟通"则说明之前已投过，跳过即可。

## 跳过条件速查

完整规则见 `references/skip-rules.md`，核心要点：
- 薪资规则：上限≥25K时下限≥13K；上限<25K时下限≥15K；大厂子公司下限≥13K（不限上限）→ 否则跳过
- 只写 Vue / 精通 Vue / 要求 Flutter / 要求 WebGL·Three.js·Canvas → 跳过
- 人力资源服务许可证 / 劳务派遣 / IT外包 / 公司名模糊（含"某"字）→ 跳过
- 985/211 硬性要求 → 跳过
- 要求现场面试且非北京城市 → 跳过
