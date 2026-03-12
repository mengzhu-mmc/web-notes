# Git 高级用法与工作流

## 关联笔记

- [[11-Git与工具/1.回滚]]
- [[11-Git与工具/2.分支]]

---

## 一、rebase 与 merge 的区别

这是 Git 面试中最常被问到的问题之一。两者都能合并分支，但产生的提交历史完全不同。

### merge：保留完整历史

```bash
# 当前在 main 分支，合并 feature 分支
git merge feature

# 产生一个新的合并提交（merge commit），保留两条分支的历史
# main:    A---B---C---M
#                     /
# feature:     D---E
```

### rebase：线性历史

```bash
# 当前在 feature 分支，变基到 main
git rebase main

# 把 feature 的提交"搬到" main 的最新提交后面，历史变成一条直线
# main:    A---B---C
# feature:           D'---E'  （D' E' 是重新创建的提交，hash 会变）
```

### 什么时候用哪个？

rebase 适合在自己的 feature 分支上同步主分支的最新代码（`git pull --rebase`），让提交历史保持干净。merge 适合将 feature 分支合入主分支，保留完整的开发历史。**黄金法则：不要对已经推送到远程的公共分支执行 rebase**，因为它会改写提交历史，导致其他人的代码冲突。

---

## 二、交互式 rebase

交互式 rebase 是整理提交历史的利器，可以合并、修改、删除、重排提交。

```bash
# 对最近 3 个提交进行交互式 rebase
git rebase -i HEAD~3

# 会打开编辑器，显示类似：
# pick abc1234 feat: 添加登录功能
# pick def5678 fix: 修复登录按钮样式
# pick ghi9012 feat: 添加记住密码功能

# 常用操作：
# pick   - 保留该提交
# reword - 保留提交但修改提交信息
# squash - 合并到上一个提交（保留提交信息）
# fixup  - 合并到上一个提交（丢弃提交信息）
# drop   - 删除该提交
# edit   - 暂停在该提交，允许修改

# 例：把修复提交合并到功能提交中
# pick abc1234 feat: 添加登录功能
# fixup def5678 fix: 修复登录按钮样式
# pick ghi9012 feat: 添加记住密码功能
```

> [!tip] 实际场景
> 开发过程中可能有很多零碎的 fix 提交，在合入主分支前用 `rebase -i` 把它们整理成几个有意义的提交，让 code review 更清晰。

---

## 三、cherry-pick

cherry-pick 可以把某个分支上的特定提交"摘"到当前分支，而不需要合并整个分支。

```bash
# 把某个提交应用到当前分支
git cherry-pick <commit-hash>

# 一次 cherry-pick 多个提交
git cherry-pick <hash1> <hash2> <hash3>

# cherry-pick 一个范围（不包含起始提交）
git cherry-pick <start-hash>..<end-hash>

# 如果有冲突，解决后继续
git cherry-pick --continue

# 放弃 cherry-pick
git cherry-pick --abort
```

适用场景：线上紧急 bug 修复后，需要把修复提交同步到开发分支；或者从一个废弃的分支中挑选有用的提交。

---

## 四、stash 暂存

当你正在开发一个功能，突然需要切换分支处理紧急问题时，stash 可以暂存当前的修改。

```bash
# 暂存当前修改（包括已暂存和未暂存的）
git stash

# 暂存时添加描述信息
git stash save "正在开发登录功能，还没完成"

# 也暂存未跟踪的新文件
git stash -u

# 查看暂存列表
git stash list
# stash@{0}: On feature: 正在开发登录功能，还没完成
# stash@{1}: WIP on main: abc1234 上一次提交信息

# 恢复最近一次暂存（并从列表中删除）
git stash pop

# 恢复指定的暂存（不删除）
git stash apply stash@{1}

# 删除某个暂存
git stash drop stash@{0}

# 清空所有暂存
git stash clear
```

---

## 五、reset 与 revert

### reset：回退提交（改写历史）

```bash
# 三种模式：
# --soft：回退提交，保留修改在暂存区
git reset --soft HEAD~1

# --mixed（默认）：回退提交，保留修改在工作区
git reset HEAD~1

# --hard：回退提交，丢弃所有修改（危险！）
git reset --hard HEAD~1
```

### revert：撤销提交（不改写历史）

```bash
# 创建一个新提交来撤销指定提交的修改
git revert <commit-hash>

# 撤销最近一次提交
git revert HEAD

# 撤销合并提交（需要指定保留哪个父提交）
git revert -m 1 <merge-commit-hash>
```

reset 适合本地还没推送的提交，revert 适合已经推送到远程的提交（因为不会改写历史）。

---

## 六、Git 工作流

### 6.1 Git Flow

最经典的工作流，适合有明确版本发布周期的项目。

```
main ─────────────────────────────────── 生产环境
  │                                  ↑
  └── develop ──────────────────── 开发主线
        │         ↑        ↑
        ├── feature/login   │     功能分支
        ├── feature/cart    │
        │                   │
        └── release/1.0 ────┘     发布分支
                │
                └── hotfix/bug-fix ──→ main  紧急修复
```

### 6.2 GitHub Flow

更简单的工作流，适合持续部署的项目（大多数前端项目用这个）。

```
main ──────────────────────── 始终可部署
  │         ↑
  └── feature/xxx ──── PR ──→ Code Review → Merge
```

规则很简单：main 分支始终可部署，所有开发在 feature 分支上进行，通过 Pull Request 合入 main。

### 6.3 Trunk-Based Development

主干开发，所有人直接在 main 上开发（或用非常短命的分支），配合 Feature Flag 控制功能上线。适合团队协作紧密、CI/CD 完善的场景。

---

## 七、实用技巧

### 7.1 修改最近一次提交

```bash
# 修改提交信息
git commit --amend -m "新的提交信息"

# 追加文件到最近一次提交（不改变提交信息）
git add forgotten-file.js
git commit --amend --no-edit
```

### 7.2 查找引入 bug 的提交

```bash
# 二分查找法定位问题提交
git bisect start
git bisect bad          # 标记当前版本有 bug
git bisect good v1.0    # 标记某个已知正常的版本
# Git 会自动切换到中间的提交，你测试后标记 good/bad
# 最终定位到引入 bug 的那个提交
git bisect reset        # 结束 bisect
```

### 7.3 查看文件的修改历史

```bash
# 查看某个文件的提交历史
git log --oneline -- path/to/file

# 查看某个文件每一行是谁在什么时候修改的
git blame path/to/file

# 查看某次提交的具体修改
git show <commit-hash>
```

### 7.4 清理与维护

```bash
# 删除已合并的本地分支
git branch --merged | grep -v "main\|master" | xargs git branch -d

# 清理远程已删除但本地还有引用的分支
git fetch --prune

# 查看仓库大小和大文件
git count-objects -vH
```
