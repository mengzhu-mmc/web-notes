# Git 高级技巧速查

> 覆盖日常开发中最实用的 Git 进阶用法：rebase、bisect、worktree、stash 高级技巧，以及团队规范配置。

---

## 一、`git rebase` vs `git merge`

### 1.1 核心区别

| 维度 | `git merge` | `git rebase` |
|------|-------------|--------------|
| 历史记录 | 保留完整分叉历史，生成 merge commit | 线性历史，无 merge commit |
| 冲突解决 | 一次性解决所有冲突 | 逐 commit 解决 |
| 适用场景 | 功能分支合并到主干、PR/MR | 同步主干更新到特性分支 |
| 安全性 | 始终安全 | **禁止对已推送的公共分支 rebase** |

### 1.2 使用场景对比

**使用 `merge` 的场景：**
```bash
# 将 feature 合并到 main（记录分支历史）
git checkout main
git merge feature/login

# 保留 "何时合并" 的信息，适合多人协作的主干分支
```

**使用 `rebase` 的场景：**
```bash
# 开发过程中同步 main 的新提交，保持分支整洁
git checkout feature/login
git rebase main

# 冲突解决后继续
git add .
git rebase --continue

# 后悔了，取消 rebase
git rebase --abort
```

**交互式 rebase（整理提交历史）：**
```bash
# 合并/修改最近 3 个提交
git rebase -i HEAD~3

# 编辑器中常用命令：
# pick   → 保留该提交
# squash → 合并到上一个提交（常用：合并 WIP 提交）
# reword → 修改提交信息
# drop   → 删除该提交
# fixup  → 合并到上一个，不保留提交信息
```

### 1.3 黄金法则

> ⚠️ **绝对不要 rebase 已推送到远程的公共分支**（如 main、develop），会破坏他人的本地历史。
> 
> ✅ 只对**本地未推送**的提交或**自己独有的特性分支**做 rebase。

---

## 二、`git bisect` —— 二分查找 Bug 定位

当你不知道哪个提交引入了 bug，`bisect` 通过二分法快速定位，O(log n) 效率。

### 2.1 基本流程

```bash
# 1. 启动 bisect
git bisect start

# 2. 标记当前（有 bug）为 bad
git bisect bad

# 3. 标记某个已知正常的 commit 为 good
git bisect good v1.0.0         # 或指定 commit hash
git bisect good abc1234

# Git 会自动切换到中间的 commit，测试后告知结果：
git bisect good   # 这个版本正常
git bisect bad    # 这个版本有 bug

# Git 不断缩小范围，最终输出：
# xxxxxxx is the first bad commit

# 4. 退出 bisect，回到原 HEAD
git bisect reset
```

### 2.2 自动化 bisect（脚本判断）

```bash
# 用脚本自动判断 good/bad，无需手动测试每个版本
git bisect run npm test -- --grep "用户登录"

# 脚本退出码 0 → good，非 0 → bad
# 适合有自动化测试的项目，几秒内定位问题提交
```

### 2.3 实战技巧

```bash
# 查看 bisect 历史记录
git bisect log

# 跳过某个无法测试的 commit（如编译失败）
git bisect skip
```

---

## 三、`git worktree` —— 多工作区

`worktree` 允许**一个仓库同时检出多个分支到不同目录**，无需来回切换分支，完美解决"紧急修复 hotfix 打断当前开发"的场景。

### 3.1 基础用法

```bash
# 添加一个新工作区，检出 hotfix 分支
git worktree add ../my-repo-hotfix hotfix/critical-bug

# 现在你有两个目录同时工作：
# ~/my-repo/           → feature/login（当前开发）
# ~/my-repo-hotfix/    → hotfix/critical-bug（紧急修复）

# 在 hotfix 工作区完成修复后
cd ../my-repo-hotfix
git add . && git commit -m "fix: 修复关键 bug"
git push

# 删除工作区（先删目录，再清理引用）
git worktree remove ../my-repo-hotfix
# 或强制删除
git worktree remove --force ../my-repo-hotfix
```

### 3.2 常用命令

```bash
# 列出所有工作区
git worktree list

# 创建工作区并新建分支
git worktree add -b feature/new-feature ../my-repo-feature main

# 清理已删除工作区的引用
git worktree prune
```

### 3.3 适用场景

- **紧急 hotfix**：不想 stash / commit WIP，直接在新目录修复
- **并行开发**：前端同时跑 main 和 feature 环境对比
- **Code Review**：检出 PR 分支到单独目录，不影响当前工作

---

## 四、`git stash` 高级用法

### 4.1 基础回顾

```bash
git stash          # 暂存所有修改
git stash pop      # 恢复最新 stash（并删除）
git stash apply    # 恢复最新 stash（保留 stash 记录）
git stash list     # 查看所有 stash
```

### 4.2 `--patch` 交互式部分暂存

```bash
# 交互式选择哪些 hunk 加入 stash（类似 git add -p）
git stash -p

# 每个 hunk 会问你：
# y → 暂存这段
# n → 不暂存
# s → 拆分更小的 hunk
# q → 退出
```

**使用场景：** 只想暂存部分修改，其余继续工作。

### 4.3 `pop --index` 恢复暂存区状态

```bash
# 普通 pop：只恢复工作区，暂存区状态丢失
git stash pop

# --index：同时恢复暂存区（staged）状态
git stash pop --index

# 场景：stash 前有些文件已 git add，希望恢复时保持 staged 状态
```

### 4.4 带描述的 stash

```bash
# 加上描述，方便区分多个 stash
git stash push -m "WIP: 用户登录表单样式调整"
git stash push -m "WIP: 购物车逻辑"

# 查看
git stash list
# stash@{0}: On feature/cart: WIP: 购物车逻辑
# stash@{1}: On feature/login: WIP: 用户登录表单样式调整

# 恢复指定 stash
git stash pop stash@{1}
git stash apply stash@{1}
```

### 4.5 stash 单个文件

```bash
# 只 stash 指定文件
git stash push -m "login styles" -- src/components/Login.css

# 包含未追踪文件（新建文件）
git stash push -u -m "including untracked"

# 包含忽略文件
git stash push -a -m "including ignored"
```

---

## 五、团队 Commit 规范

### 5.1 Conventional Commits 规范

格式：`<type>(<scope>): <subject>`

```
feat(login): 新增手机号登录功能
fix(cart): 修复数量为 0 时仍能下单的问题
docs(README): 更新部署文档
style(button): 统一按钮间距
refactor(api): 重构用户接口调用逻辑
test(utils): 补充 formatDate 单测
chore(deps): 升级 vite 到 5.0
perf(list): 虚拟列表优化长列表渲染性能
ci(github): 添加 PR 自动检查 workflow
```

**type 速查：**

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 格式（不影响逻辑）|
| `refactor` | 重构（非 feat/fix）|
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链/依赖 |
| `ci` | CI/CD 配置 |
| `revert` | 回退提交 |

**Breaking Change：**
```
feat(auth)!: 移除 OAuth1.0 支持

BREAKING CHANGE: 不再支持 OAuth1.0，请迁移到 OAuth2.0
```

### 5.2 commitlint 配置

```bash
# 安装
npm install -D @commitlint/cli @commitlint/config-conventional

# 配合 husky 在 commit-msg hook 中检查
npm install -D husky
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // type 必须小写
    'type-case': [2, 'always', 'lower-case'],
    // subject 不能以句号结尾
    'subject-full-stop': [2, 'never', '.'],
    // subject 不能为空
    'subject-empty': [2, 'never'],
    // 最大长度 100 字符
    'header-max-length': [2, 'always', 100],
    // 允许的 type 列表（可按需扩展）
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'revert'],
    ],
  },
};
```

```js
// package.json —— 完整配置示例
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "husky": "^9.0.0"
  }
}
```

---

## 六、`.gitconfig` 实用别名配置

```ini
# ~/.gitconfig

[user]
  name = maomengchao
  email = your@email.com

[core]
  editor = code --wait          # 用 VS Code 编辑 commit 信息
  autocrlf = input              # macOS/Linux 换行符处理

[pull]
  rebase = true                 # git pull 默认用 rebase 而非 merge

[push]
  default = current             # git push 默认推当前分支

[alias]
  # 简化命令
  st = status -sb               # 简洁状态
  co = checkout
  br = branch
  ci = commit
  cp = cherry-pick

  # 美化日志
  lg = log --oneline --graph --decorate --all
  ll = log --oneline -20        # 最近 20 条
  
  # 查看某文件的修改历史
  fl = log --follow -p --

  # 撤销操作
  undo = reset HEAD~1 --mixed   # 撤销最后一次 commit，保留修改
  unstage = reset HEAD --       # 取消暂存

  # 快速暂存 & 恢复
  ss = stash push -m             # git ss "描述"
  sp = stash pop

  # 查看当前分支与 main 的差异
  diff-main = diff main...HEAD

  # 清理已合并的本地分支
  cleanup = "!git branch --merged | grep -v '\\*\\|main\\|master\\|develop' | xargs -n 1 git branch -d"

  # 修改最后一次 commit 信息（未推送）
  amend = commit --amend --no-edit

  # 统计贡献
  contrib = shortlog -sn --no-merges

[color]
  ui = auto

[diff]
  tool = vscode

[difftool "vscode"]
  cmd = code --wait --diff $LOCAL $REMOTE

[merge]
  tool = vscode
  conflictstyle = diff3         # 显示 base 版本，方便理解冲突

[mergetool "vscode"]
  cmd = code --wait $MERGED
```

**常用别名速查：**

```bash
git lg           # 好看的提交树
git st           # 简洁状态
git undo         # 撤销最后一次 commit（保留文件修改）
git cleanup      # 清理已合并分支
git ss "描述"    # 快速 stash
git amend        # 修正最后一次 commit（不改内容，只改信息）
```

---

## 关联笔记

- [[Git高级用法与工作流]] —— rebase、cherry-pick、bisect 深度解析
- [[Git工作流与团队协作]] —— Git Flow、GitHub Flow、冲突解决
- [[豆包对话提取-Git]] —— 推送冲突解决实战记录（已归档）
