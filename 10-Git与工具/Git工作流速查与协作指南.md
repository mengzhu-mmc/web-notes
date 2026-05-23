# Git 工作流速查与协作指南

> Updated: 2026-05-23. 本文合并 `Git高级用法与工作流.md`、`Git高级技巧.md`、`Git_Rebase与Merge实战比较.md` 与 `AI对话笔记-Git.md` 的重叠内容，作为 Git 目录的主入口；原文件暂保留为专题展开和历史来源。

## 一、先记住 4 条协作原则

1. **公共分支不改历史**：`main/master/develop/release` 这类多人共享分支不要 `rebase` 后强推。
2. **个人分支可整理历史**：自己的 feature 分支可以用 `rebase -i` 合并 WIP、改提交信息、保持 PR 清晰。
3. **合入主干优先保留审计线索**：团队协作中将 feature 合到主干，通常用 merge 或平台的 squash merge，具体看团队规范。
4. **遇到冲突先保护现场**：确认 `git status`，必要时先 `git stash` 或新建备份分支，再解决冲突。

## 二、merge vs rebase 一页决策

| 场景                                | 推荐命令                      | 原因                       |
| ----------------------------------- | ----------------------------- | -------------------------- |
| feature 合入 main，需要保留分支轨迹 | `git merge --no-ff feature/x` | 保留合并节点，方便审计     |
| 个人 feature 同步 main 最新提交     | `git rebase main`             | 让个人提交排在线性历史末尾 |
| PR 前整理多个 WIP commit            | `git rebase -i HEAD~N`        | 合并、重命名、删除临时提交 |
| 已推送且多人基于它开发的分支        | `git merge`                   | 避免改写公共历史           |
| 只拿某个修复提交                    | `git cherry-pick <commit>`    | 不引入整个分支             |

## 三、冲突处理标准流程

```bash
# 1. 查看当前状态
git status

# 2. 同步远端；个人分支可用 rebase，公共分支用 merge/pull 默认策略
git fetch origin
git rebase origin/main

# 3. 打开冲突文件，保留正确内容，删除冲突标记
# <<<<<<< HEAD
# =======
# >>>>>>> commit

# 4. 标记已解决并继续
git add <file>
git rebase --continue

# 5. 如果判断方向错了，立即中止
git rebase --abort
```

合并冲突不是“谁覆盖谁”，而是以公共祖先为参照，判断两边变更是否能同时成立。解决后建议跑测试或至少执行相关构建/格式化命令。

## 四、常用高级命令

### 1. `git stash`：临时保存现场

```bash
git stash push -m "wip: before pulling main"
git stash list
git stash pop
```

适合正在改代码但需要先切分支、拉更新、临时修 bug 的情况。

### 2. `git bisect`：定位引入 bug 的提交

```bash
git bisect start
git bisect bad
git bisect good <known-good-commit>
# 每一步验证后执行：
git bisect good # 或 git bisect bad
git bisect reset
```

### 3. `git worktree`：一个仓库同时开多个工作区

```bash
git worktree add ../project-hotfix hotfix/login-crash
git worktree list
git worktree remove ../project-hotfix
```

适合当前分支改到一半，又要并行处理紧急修复。

### 4. `git reflog`：后悔药

```bash
git reflog
git reset --hard HEAD@{1}
```

`reflog` 记录本地 HEAD 移动轨迹，能救回误 reset、误 rebase 后的本地提交。执行 `reset --hard` 前必须确认没有未保存修改。

## 五、推荐团队工作流

### 小团队 / 持续交付：GitHub Flow

1. 从 `main` 拉 feature 分支。
2. 小步提交，保持 PR 聚焦。
3. CI 通过 + Code Review 后合入。
4. `main` 始终可发布。

### 有版本节奏：GitLab Flow / Release Branch

1. feature 分支进入 `main/develop`。
2. 发布前从主干切 `release/x.y`。
3. bugfix 同步回主干。
4. 线上紧急问题走 `hotfix/*`。

## 六、提交信息建议

```text
feat: add login form
fix: handle token refresh race condition
docs: update React 19 notes
refactor: simplify cache layer
test: add debounce unit tests
chore: update prettier config
```

提交信息要回答“做了什么”和“为什么”。避免 `update`、`fix bug`、`wip` 长期留在公共历史里。

## 七、旧文件分流建议

- `Git工作流与团队协作.md`：保留完整团队流程和面试展开。
- `Git高级技巧.md`：保留高级命令细节。
- `Git_Rebase与Merge实战比较.md`：保留通俗比喻版本。
- `Git高级用法与工作流.md`：后续可降级为归档或合并到本文。
- `AI对话笔记-Git.md`：已蒸馏，建议只保留归档提示。
