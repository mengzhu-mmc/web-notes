# Git 工作流与团队协作

> 深入理解 Git 工作流模式，掌握团队协作中的分支管理策略、代码审查流程和冲突解决技巧。

## 面试高频考点

1. **Git Flow、GitHub Flow、GitLab Flow 的区别？**
2. **rebase 和 merge 的区别及使用场景？**
3. **cherry-pick 的使用场景？**
4. **如何解决复杂的代码冲突？**
5. **Git 的 hooks 有哪些实际应用？**

---

## 一、Git 工作流模式

### 1.1 Git Flow

Git Flow 是一种经典的分支管理模型，适合有明确发布周期的项目。

```
┌─────────────────────────────────────────────────────────────┐
│                        Git Flow 分支模型                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   master ─────●────────●────────●────────●────────●─────    │
│              /        /        /        /        /          │
│   hotfix ───●───────●────────────────────────────────       │
│                    /                                        │
│   develop ──●────●────●────●────●────●────●────●────●───    │
│                /    /    /    /    /    /                   │
│   feature ────●────●    ●────●    ●────●                    │
│                      /                                      │
│   release ──────────●────●                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**分支说明**：

| 分支 | 生命周期 | 用途 |
|------|----------|------|
| `master` | 永久 | 生产分支，只接受合并，不直接提交 |
| `develop` | 永久 | 开发分支，集成所有功能 |
| `feature/*` | 临时 | 功能分支，从 develop 创建 |
| `release/*` | 临时 | 发布分支，从 develop 创建 |
| `hotfix/*` | 临时 | 热修复分支，从 master 创建 |

**工作流程**：

```bash
# 1. 创建功能分支
git checkout -b feature/login develop

# 2. 开发完成后合并到 develop
git checkout develop
git merge --no-ff feature/login
git branch -d feature/login

# 3. 创建发布分支
git checkout -b release/1.0.0 develop

# 4. 发布完成后合并到 master 和 develop
git checkout master
git merge --no-ff release/1.0.0
git tag -a v1.0.0

git checkout develop
git merge --no-ff release/1.0.0
git branch -d release/1.0.0
```

### 1.2 GitHub Flow

GitHub Flow 是一种简化的工作流，适合持续部署的项目。

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Flow 流程                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. 从 master 创建功能分支                                   │
│           ↓                                                  │
│   2. 提交代码并推送到远程                                     │
│           ↓                                                  │
│   3. 创建 Pull Request                                       │
│           ↓                                                  │
│   4. 代码审查（Code Review）                                  │
│           ↓                                                  │
│   5. 合并到 master                                           │
│           ↓                                                  │
│   6. 自动部署到生产环境                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**特点**：
- 只有 `master` 一个长期分支
- 功能分支直接合并到 `master`
- 强调 Pull Request 和代码审查
- 适合持续集成/持续部署（CI/CD）

### 1.3 GitLab Flow

GitLab Flow 结合了 Git Flow 和 GitHub Flow 的优点，增加了环境分支的概念。

```
┌─────────────────────────────────────────────────────────────┐
│                      GitLab Flow 分支                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   production ──●────────●────────●────────●────────●────    │
│               /        /        /        /                  │
│   pre-prod ──●────────●────────●────────●────────────────   │
│             /        /        /                             │
│   master ──●────●────●────●────●────●────●────●─────────    │
│               /    /    /    /                              │
│   feature ───●────●    ●────●                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**特点**：
- `master` 作为开发分支
- 环境分支（`pre-prod`、`production`）表示不同部署环境
- 使用 Merge Request 进行代码审查

---

## 二、Rebase vs Merge

### 2.1 两者的区别

| 特性 | Merge | Rebase |
|------|-------|--------|
| **提交历史** | 保留分支历史，有合并提交 | 线性历史，无合并提交 |
| **可读性** | 能看出分支结构 | 历史更简洁 |
| **安全性** | 不会修改已有提交 | 会重写提交历史 |
| **使用场景** | 公共分支、保留上下文 | 个人分支、清理历史 |

### 2.2 Merge 的使用

```bash
# 创建功能分支并开发
git checkout -b feature-branch
git commit -m "feat: add new feature"

# 合并到主分支
git checkout main
git merge feature-branch

# 结果：产生一个合并提交
# *   abc1234 (HEAD -> main) Merge branch 'feature-branch'
# |\
# | * def5678 (feature-branch) feat: add new feature
# |/
# *   9ab9012 Previous commit
```

### 2.3 Rebase 的使用

```bash
# 在功能分支上执行 rebase
git checkout feature-branch
git rebase main

# 如果有冲突，解决后继续
git add .
git rebase --continue

# 结果：线性历史
# * def5678 (HEAD -> feature-branch) feat: add new feature
# * 9ab9012 (main) Previous commit
```

### 2.4 黄金法则

> **永远不要对已经推送到远程的公共分支执行 rebase**

```bash
# ✅ 可以 rebase：个人功能分支，还未推送
git checkout feature/my-work
git rebase main

# ❌ 不要 rebase：已经推送到远程的分支
git checkout main
git rebase feature/other  # 危险！会影响其他开发者
```

---

## 三、高级 Git 操作

### 3.1 Cherry-pick

将指定的提交应用到当前分支。

```bash
# 场景：将某个 bug 修复应用到多个版本

# 查看提交历史
git log --oneline
# a1b2c3d fix: critical bug
# e4f5g6h feat: new feature

# 将 bug 修复应用到当前分支
git cherry-pick a1b2c3d

# 如果有冲突，解决后
git add .
git cherry-pick --continue

# 或者放弃
git cherry-pick --abort
```

**使用场景**：
- 将某个提交应用到多个分支
- 从废弃分支中提取有用的提交
- 修复需要回退到旧版本的 bug

### 3.2 Stash

临时保存未提交的更改。

```bash
# 保存当前更改
git stash push -m "WIP: login feature"

# 查看 stash 列表
git stash list
# stash@{0}: WIP: login feature
# stash@{1}: WIP: bug fix

# 应用最近的 stash
git stash pop

# 应用指定 stash
git stash apply stash@{1}

# 删除 stash
git stash drop stash@{0}

# 清空所有 stash
git stash clear
```

### 3.3 Reflog

查看所有操作历史，用于恢复误操作。

```bash
# 查看所有操作记录
git reflog
# a1b2c3d HEAD@{0}: commit: feat: add feature
# d4e5f6g HEAD@{1}: checkout: moving from main to feature
# h7i8j9k HEAD@{2}: commit: fix: bug fix

# 恢复到某个状态
git reset --hard HEAD@{2}

# 恢复已删除的分支
git reflog | grep branch-name
git checkout -b branch-name commit-hash
```

---

## 四、代码冲突解决

### 4.1 冲突的产生

```bash
# 场景：两个人修改了同一文件的同一行
git merge feature-branch
# Auto-merging file.txt
# CONFLICT (content): Merge conflict in file.txt
# Automatic merge failed; fix conflicts and commit
```

### 4.2 冲突标记

```javascript
<<<<<<< HEAD
// 当前分支的代码
console.log('Hello from main');
=======
// 合并分支的代码
console.log('Hello from feature');
>>>>>>> feature-branch
```

### 4.3 解决步骤

```bash
# 1. 查看冲突文件
git status

# 2. 编辑文件，解决冲突（删除 <<<< ==== >>>> 标记）
# 手动编辑或使用 IDE 的冲突解决工具

# 3. 标记为已解决
git add file.txt

# 4. 完成合并
git commit -m "merge: resolve conflicts"

# 或者使用合并工具
git mergetool
```

### 4.4 预防冲突的策略

1. **频繁同步**：经常从主分支拉取最新代码
2. **小步提交**：将大功能拆分为小提交
3. **及时沟通**：与团队成员协调修改范围
4. **使用 .gitattributes**：定义合并策略

```bash
# 自动解决特定文件的冲突
# .gitattributes
package-lock.json merge=ours
yarn.lock merge=ours
```

---

## 五、Git Hooks

### 5.1 常用 Hooks

| Hook | 触发时机 | 用途 |
|------|----------|------|
| `pre-commit` | 提交前 | 代码格式化、lint 检查 |
| `prepare-commit-msg` | 打开编辑器前 | 自动生成提交信息 |
| `commit-msg` | 保存提交信息后 | 验证提交信息格式 |
| `post-commit` | 提交后 | 发送通知 |
| `pre-push` | 推送前 | 运行测试 |
| `pre-receive` | 服务器接收推送前 | 服务器端验证 |

### 5.2 Husky + lint-staged 配置

```bash
# 安装依赖
npm install --save-dev husky lint-staged

# 初始化 husky
npx husky install
```

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{css,scss,less}": [
      "stylelint --fix",
      "git add"
    ]
  }
}
```

### 5.3 提交信息规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型说明**：

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |

```bash
# 示例
git commit -m "feat(auth): add OAuth2 login support

- Implement Google OAuth2
- Add user profile page
- Update login UI

Closes #123"
```

---

## 六、团队协作最佳实践

### 6.1 分支命名规范

```bash
# 功能分支
feature/JIRA-123-add-login
feature/user-profile-page

# 修复分支
fix/JIRA-456-fix-memory-leak
fix/login-button-style

# 热修复分支
hotfix/critical-security-patch

# 发布分支
release/v1.2.0
```

### 6.2 Pull Request 规范

```markdown
## 描述
简要说明这个 PR 做了什么

## 变更类型
- [ ] Bug 修复
- [x] 新功能
- [ ] 文档更新
- [ ] 性能优化

## 测试
- [x] 单元测试通过
- [x] 手动测试通过

## 相关 Issue
Closes #123
```

### 6.3 代码审查清单

- [ ] 代码是否符合团队规范
- [ ] 是否有足够的测试覆盖
- [ ] 是否存在性能问题
- [ ] 是否有安全风险
- [ ] 提交信息是否清晰

---

## 七、常见问题解决

### 7.1 撤销操作

```bash
# 撤销工作区的修改
git checkout -- file.txt

# 撤销暂存区的文件
git reset HEAD file.txt

# 修改最后一次提交
git commit --amend

# 撤销多次提交（保留修改）
git reset --soft HEAD~3

# 撤销多次提交（丢弃修改）
git reset --hard HEAD~3
```

### 7.2 远程操作问题

```bash
# 强制推送（谨慎使用！）
git push --force-with-lease

# 推送本地分支到远程
git push -u origin feature-branch

# 删除远程分支
git push origin --delete feature-branch

# 同步远程分支
git fetch --prune
```

---

## 参考资源

- [Git 官方文档](https://git-scm.com/doc)
- [Atlassian Git 教程](https://www.atlassian.com/git/tutorials)
- [Pro Git 中文版](https://git-scm.com/book/zh/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)
