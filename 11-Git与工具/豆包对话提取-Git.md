# 豆包对话提取 - Git

> 来源：豆包历史对话"GitHub推送文件冲突解决"，提取时间：2026-03-17

---

## GitHub 推送冲突解决全流程

### 背景场景
推送时遇到冲突（Comparing changes）或 `master had recent pushes X minutes ago` 提示。

---

### 一、本地解决冲突（推荐方式）

```bash
# 1. 先拉取最新代码
git pull

# Git 会提示：Automatic merge failed; fix conflicts and then commit the result.
# 冲突文件内容样式：
# <<<<<<< HEAD
# 你本地改的代码
# =======
# GitHub 远程的代码
# >>>>>>> origin/main

# 2. 手动修改：删掉 <<<<<<<、=======、>>>>>>> 符号，保留想要的代码，保存文件

# 3. 标记冲突已解决
git add .

# 4. 提交
git commit -m "解决合并冲突"

# 5. 推送
git push
```

---

### 二、处理 "master had recent pushes" 提示

**含义：** 远程 master 分支最近有新的推送，本地代码已不是最新，直接推送会被拒绝。

**完整操作流程：**

```bash
# 第一步：保存本地修改
git add .
git commit -m "修复XX功能/新增XX页面"

# 第二步：拉取远程最新代码（关键）
git pull origin master
# 如果 Already up to date → 直接推送
# 如果 Automatic merge failed → 按第一步解决冲突

# 第三步：推送
git push origin master
```

---

### 三、特殊情况：git pull 失败时（stash 法）

```bash
git stash            # 暂存本地改动
git pull origin master  # 拉取最新
git stash pop        # 恢复本地改动
# 再解决冲突（如有），提交推送
```

---

### 四、GitHub 网页端解决

1. 打开 Pull Request
2. 点击 **Resolve conflicts**
3. 删掉冲突符号，保留正确代码
4. 点 **Mark as resolved** → **Commit merge**

---

### 避坑要点

- ❌ 禁止 `git push -f` 强制推送（会覆盖他人代码）
- ✅ 冲突符号（`<<<<<<<` / `=======` / `>>>>>>>`）必须删干净
- ✅ 解决冲突后先跑一遍项目，确认功能正常再推送
- ✅ 拉取前先确认分支：`git branch` 看当前是否在正确分支

> **核心逻辑**：先同步远程 → 解决冲突 → 再推送
