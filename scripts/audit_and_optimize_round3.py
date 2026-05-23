from __future__ import annotations

import json
from pathlib import Path

ROOT = Path('/home/mira/.session/109002763539/web-notes')
TODAY = '2026-05-23'

SENSITIVE_CONFIGS = [
    '.obsidian/plugins/gemini-scribe/data.json',
]

THIN_GUIDE = ROOT / '99-其他' / '低信息量文件合并索引.md'
PLAN = ROOT / '99-其他' / '知识库整理规划.md'
GITIGNORE = ROOT / '.gitignore'
PACKAGE = ROOT / 'package.json'
GIT_INDEX = ROOT / '10-Git与工具' / '00-🌟索引.md'
GIT_SYNTH = ROOT / '10-Git与工具' / 'Git工作流速查与协作指南.md'


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='ignore')


def write(path: Path, text: str) -> None:
    path.write_text(text.rstrip() + '\n', encoding='utf-8')


def append_once(path: Path, marker: str, section: str) -> bool:
    text = read(path) if path.exists() else ''
    if marker in text:
        return False
    write(path, text + ('\n\n' if text.strip() else '') + section.strip())
    return True


def update_gitignore() -> bool:
    text = read(GITIGNORE)
    additions = [
        '.obsidian/plugins/*/data.json',
        '.obsidian/plugins/*/data.json.bak',
        '.obsidian/plugins/*/cache.json',
        '.obsidian/plugins/*/cache/',
        '*.tmp',
    ]
    changed = False
    for item in additions:
        if item not in text.splitlines():
            text += ('\n' if not text.endswith('\n') else '') + item + '\n'
            changed = True
    if changed:
        write(GITIGNORE, text)
    return changed


def redact_sensitive_configs() -> bool:
    changed = False
    for rel in SENSITIVE_CONFIGS:
        path = ROOT / rel
        if not path.exists():
            continue
        try:
            data = json.loads(read(path))
        except json.JSONDecodeError:
            continue
        if data.get('apiKey'):
            data['apiKey'] = ''
            write(path, json.dumps(data, ensure_ascii=False, indent=2))
            changed = True
    return changed


def update_package_scripts() -> bool:
    data = json.loads(read(PACKAGE))
    scripts = data.setdefault('scripts', {})
    desired = {
        'format': 'prettier --write "**/*.{md,json,js,ts,tsx,yml,yaml}"',
        'format:md': 'prettier --write "**/*.md"',
        'check:format': 'prettier --check "**/*.{md,json,js,ts,tsx,yml,yaml}"',
        'audit:thin': 'python3 scripts/audit_notes_quality.py',
    }
    changed = False
    for key, value in desired.items():
        if scripts.get(key) != value:
            scripts[key] = value
            changed = True
    lint = data.setdefault('lint-staged', {})
    if lint.get('*.{md,json,js,ts,tsx,yml,yaml}') != 'prettier --write':
        lint.clear()
        lint['*.{md,json,js,ts,tsx,yml,yaml}'] = 'prettier --write'
        changed = True
    if changed:
        write(PACKAGE, json.dumps(data, ensure_ascii=False, indent=2))
    return changed


def create_audit_script() -> bool:
    path = ROOT / 'scripts' / 'audit_notes_quality.py'
    content = '''from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_DIRS = {'.git', '.obsidian', 'node_modules', '.trash'}
THIN_BYTES = 650
THIN_LINES = 12


def is_excluded(path: Path) -> bool:
    return any(part in EXCLUDE_DIRS for part in path.parts)


def main() -> None:
    rows: list[tuple[int, int, str]] = []
    for path in ROOT.rglob('*.md'):
        if is_excluded(path):
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.endswith('/README.md') or path.name == 'README.md':
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        nonempty = [line for line in text.splitlines() if line.strip()]
        if len(text) <= THIN_BYTES or len(nonempty) <= THIN_LINES:
            rows.append((len(text), len(nonempty), rel))

    print(f'thin markdown candidates: {len(rows)}')
    for size, lines, rel in sorted(rows)[:120]:
        print(f'{size:>5} bytes | {lines:>3} lines | {rel}')


if __name__ == '__main__':
    main()
'''
    if path.exists() and read(path) == content.rstrip() + '\n':
        return False
    write(path, content)
    return True


def create_git_synthesis() -> bool:
    content = f'''# Git 工作流速查与协作指南

> Updated: {TODAY}. 本文合并 `Git高级用法与工作流.md`、`Git高级技巧.md`、`Git_Rebase与Merge实战比较.md` 与 `AI对话笔记-Git.md` 的重叠内容，作为 Git 目录的主入口；原文件暂保留为专题展开和历史来源。

## 一、先记住 4 条协作原则

1. **公共分支不改历史**：`main/master/develop/release` 这类多人共享分支不要 `rebase` 后强推。
2. **个人分支可整理历史**：自己的 feature 分支可以用 `rebase -i` 合并 WIP、改提交信息、保持 PR 清晰。
3. **合入主干优先保留审计线索**：团队协作中将 feature 合到主干，通常用 merge 或平台的 squash merge，具体看团队规范。
4. **遇到冲突先保护现场**：确认 `git status`，必要时先 `git stash` 或新建备份分支，再解决冲突。

## 二、merge vs rebase 一页决策

| 场景 | 推荐命令 | 原因 |
| --- | --- | --- |
| feature 合入 main，需要保留分支轨迹 | `git merge --no-ff feature/x` | 保留合并节点，方便审计 |
| 个人 feature 同步 main 最新提交 | `git rebase main` | 让个人提交排在线性历史末尾 |
| PR 前整理多个 WIP commit | `git rebase -i HEAD~N` | 合并、重命名、删除临时提交 |
| 已推送且多人基于它开发的分支 | `git merge` | 避免改写公共历史 |
| 只拿某个修复提交 | `git cherry-pick <commit>` | 不引入整个分支 |

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
git reset --hard HEAD@{{1}}
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
'''
    if GIT_SYNTH.exists() and '# Git 工作流速查与协作指南' in read(GIT_SYNTH):
        return False
    write(GIT_SYNTH, content)
    return True


def update_git_index() -> bool:
    text = read(GIT_INDEX)
    marker = '[Git 工作流速查与协作指南]'
    if marker in text:
        return False
    target = '## 主干文档\n\n'
    addition = '- [Git 工作流速查与协作指南](./Git工作流速查与协作指南.md)\n'
    if target in text:
        text = text.replace(target, target + addition, 1)
    else:
        text += '\n\n## 主干文档\n\n' + addition
    write(GIT_INDEX, text)
    return True


def create_thin_merge_index() -> bool:
    content = f'''# 低信息量文件合并索引

> Updated: {TODAY}. 本页记录全仓库巡检中发现的低信息量文件、占位文件和重复入口。原则：先合并入口和补足导航，不在未确认的情况下删除原文件。

## 一、已确认无需删除的轻量文件

这些文件虽然短，但承担导航或兼容入口功能，建议保留：

- 各目录 `README.md`：作为 GitHub/Obsidian 兼容入口。
- 各目录 `00-🌟索引.md`：作为中文主索引。
- `13-前端面试题/* - 一页速记.md`：作为高频复习卡片，短是预期形态。
- `01-HTML-CSS/00-原始旧笔记备份/*`：多数已替换为“合并目标提示”，可保留到确认删除阶段。

## 二、建议合并或补足的文件

| 文件 | 当前问题 | 建议处理 |
| --- | --- | --- |
| `13-前端面试题/牛客网-面试题-React/00-00-基础概念.md` | 只有标题和说明 | 合并进 `13-前端面试题/牛客网-面试题-React.md` 的顶部说明，或补成 React 面试知识地图 |
| `13-前端面试题/牛客网-面试题-JavaScript/00-00-基础概念.md` | 只有标题和说明 | 合并进 JavaScript 题库索引，补充题型地图 |
| `13-前端面试题/牛客网-面试题-工程化/00-00-基础概念.md` | 只有标题和说明 | 合并进工程化题库索引，补充 Webpack/Vite/CI/CD 路线 |
| `13-前端面试题/牛客网-面试题-性能优化/00-00-基础概念.md` | 只有标题和说明 | 合并进性能优化题库索引，补充 Core Web Vitals 指标地图 |
| `90-算法与数据结构/3周冲刺记录/week2-answers/00-00-基础概念.md` | 只有 Week 说明 | 合并进 `week2-answers.md` 或补充 DP/回溯题型总览 |
| `90-算法与数据结构/3周冲刺记录/week1-answers - 深挖专题索引.md` | 模板化清单 | 合并进 Week 1 总索引或填充真实薄弱专题 |
| `90-算法与数据结构/3周冲刺记录/week3-answers - 深挖专题索引.md` | 模板化清单 | 合并进 Week 3 总索引或填充图/树/DP 综合专题 |
| `10-Git与工具/Git高级用法与工作流.md` | 与 Git 高级技巧、工作流文档重叠 | 已新增 `Git工作流速查与协作指南.md` 作为合并入口，旧文暂保留 |
| `.obsidian/plugins/gemini-scribe/data.json` | 曾包含本地插件 API Key | 已清空 `apiKey` 并补充 ignore 规则，避免后续再次提交 |

## 三、巡检统计口径

- 低信息量候选：正文小于 650 bytes 或非空行不超过 12 行。
- 排除：`.git`、`.obsidian`、`node_modules`、`README.md`。
- 自动巡检命令：`npm run audit:thin`。

## 四、下一步建议

1. 优先处理 `13-前端面试题` 的四个 `00-00-基础概念.md`，它们是最典型的空壳文件。
2. 再处理算法 Week 索引模板，把“深挖专题索引”改成真实错题和题型地图。
3. 对旧备份目录只做“合并目标提示”，待确认后再批量删除，避免破坏 Obsidian 双链。
'''
    if THIN_GUIDE.exists() and '# 低信息量文件合并索引' in read(THIN_GUIDE):
        return False
    write(THIN_GUIDE, content)
    return True


def update_plan() -> bool:
    section = f'''### {TODAY} 全仓库质量巡检

- 新增 `99-其他/低信息量文件合并索引.md`，记录全仓库低信息量文件、占位文件、重复入口和处理建议。
- 新增 `10-Git与工具/Git工作流速查与协作指南.md`，合并 Git 工作流、rebase/merge、冲突处理、高级命令等重复内容，旧文件暂不删除。
- 新增 `scripts/audit_notes_quality.py` 与 `npm run audit:thin`，后续可自动列出低信息量 Markdown 候选。
- 更新 `.gitignore`，补充 Obsidian 插件本地配置、缓存和临时文件忽略规则。
- 清空已跟踪的 Obsidian 插件本地 `apiKey` 配置，避免本地凭证继续进入远程仓库。
- 更新 `package.json` 的 Prettier 脚本，覆盖 Markdown/JSON/JS/TS/YAML。
'''
    return append_once(PLAN, f'### {TODAY} 全仓库质量巡检', section)


def main() -> None:
    actions = [
        ('gitignore', update_gitignore),
        ('redact-sensitive-configs', redact_sensitive_configs),
        ('package-scripts', update_package_scripts),
        ('audit-script', create_audit_script),
        ('git-synthesis', create_git_synthesis),
        ('git-index', update_git_index),
        ('thin-merge-index', create_thin_merge_index),
        ('planning-log', update_plan),
    ]
    changed = []
    for name, fn in actions:
        if fn():
            changed.append(name)
    print('changed:', ', '.join(changed) if changed else 'none')


if __name__ == '__main__':
    main()
