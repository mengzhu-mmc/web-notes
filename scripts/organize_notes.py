from __future__ import annotations

import os
import re
import shutil
from pathlib import Path
from urllib.parse import unquote

ROOT = Path('/home/mira/.session/109002763539/web-notes')

INDEX_NAME = '索引.md'
ROOT_INDEX = '知识库总览.md'
TODO_FILE = ROOT / '99-其他' / '知识库整理规划.md'

SECTIONS = [
    ('01-HTML-CSS', 'HTML & CSS', '盒模型、布局、选择器、BFC、CSS 工程化'),
    ('02-JavaScript', 'JavaScript', '数据类型、原型链、异步、ES6+、运行机制'),
    ('03-TypeScript', 'TypeScript', '类型系统、泛型、工程实践、高频面试题'),
    ('04-Vue', 'Vue', '响应式原理、组件通信、路由、工程实践'),
    ('05-React', 'React', 'Hooks、Fiber、RSC、并发渲染、React 19/19.2'),
    ('06-框架与跨端', '框架与跨端', '跨端方案、框架对比、端能力抽象'),
    ('07-Node', 'Node.js', '运行时、模块、异步 I/O、服务端基础'),
    ('08-网络与浏览器', '网络与浏览器', 'HTTP、缓存、安全、浏览器原理、性能'),
    ('09-工程化', '工程化', 'Webpack、Vite、构建、部署、CI/CD、质量体系'),
    ('10-Git与工具', 'Git 与工具', 'Git 工作流、团队协作、常用工具链'),
    ('11-项目实战', '项目实战', '架构设计、业务方案、性能优化、工程落地'),
    ('12-面试手写', '面试手写', '高频手写题、工具函数、Promise、并发控制'),
    ('13-前端面试题', '前端面试题', '分卷题库、专题深挖、复习路线'),
    ('90-算法与数据结构', '算法与数据结构', '高频算法、数据结构、刷题计划'),
    ('91-AI前端', 'AI 前端', 'AI 辅助开发、前端智能化实践'),
    ('92-前端周报', '前端周报', '前端趋势、版本更新、资料沉淀'),
    ('93-求职', '求职', '简历、投递、面试流程与准备'),
    ('94-面试复习计划', '面试复习计划', '阶段计划、复习节奏、查漏补缺'),
    ('99-其他', '其他', '待整理资料、归档内容、知识库治理记录'),
]

EXCLUDE_DIRS = {'node_modules', '.git'}


def title_from_file(path: Path) -> str:
    try:
        text = path.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return path.stem
    for line in text.splitlines()[:80]:
        m = re.match(r'^#\s+(.+?)\s*$', line)
        if m:
            return m.group(1).strip().replace('(README)', '').strip() or path.stem
    return path.stem


def md_files_under(directory: Path) -> list[Path]:
    files: list[Path] = []
    for p in directory.rglob('*.md'):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        if p.name.lower() == 'readme.md' or p.name == INDEX_NAME:
            continue
        files.append(p)
    return sorted(files, key=lambda p: str(p.relative_to(directory)))


def first_level_links(directory: Path, limit: int = 14) -> list[tuple[str, str]]:
    direct = [p for p in directory.glob('*.md') if p.name.lower() != 'readme.md' and p.name != INDEX_NAME]
    direct = sorted(direct, key=lambda p: p.name)
    chosen = direct[:limit]
    return [(title_from_file(p), './' + p.name) for p in chosen]


def write(path: Path, text: str) -> None:
    path.write_text(text.rstrip() + '\n', encoding='utf-8')


def generate_root_index() -> None:
    lines = [
        '# 前端知识库总览',
        '',
        '> 个人前端学习笔记总入口。知识库按“基础 → 语言 → 框架 → 工程化 → 网络浏览器 → 项目实战 → 面试复习”组织。',
        '',
        '## 使用约定',
        '',
        '- 每个一级目录使用 `索引.md` 作为中文主索引；`README.md` 仅保留为 GitHub 兼容入口。',
        '- 主干文档优先沉淀稳定知识；课程笔记、旧题库和原始资料先保留在原目录，后续逐步合并。',
        '- 已确认重复、过时或只剩跳转价值的内容，可在合并后删除。',
        '',
        '## 模块导航',
        '',
    ]
    for dirname, name, desc in SECTIONS:
        target = ROOT / dirname
        if target.exists():
            lines.append(f'- [{dirname} · {name}](./{dirname}/{INDEX_NAME}) — {desc}')
    lines += [
        '',
        '## 推荐学习路径',
        '',
        '1. **基础层**：HTML/CSS、JavaScript、TypeScript。',
        '2. **框架层**：React 为主线，Vue 与跨端作为对比和补充。',
        '3. **工程层**：网络与浏览器、工程化、Node.js、Git 与工具。',
        '4. **实战层**：项目实战、性能优化、架构设计。',
        '5. **面试层**：面试手写、前端面试题、算法与数据结构、复习计划。',
        '',
        '## 整理状态',
        '',
        '- [知识库整理规划](./99-其他/知识库整理规划.md)',
        '- [复习方法论](./复习方法论.md)',
        '- [复习清单](./复习清单.md)',
    ]
    write(ROOT / ROOT_INDEX, '\n'.join(lines))


def generate_root_readme() -> None:
    text = f'''# 前端知识库

> 中文主入口已迁移到 [{ROOT_INDEX}](./{ROOT_INDEX})。

为了符合个人笔记习惯，后续主要维护中文索引文件：

- 根目录主索引：[{ROOT_INDEX}](./{ROOT_INDEX})
- 各模块主索引：`索引.md`
- 本文件仅作为 GitHub 默认展示入口保留。
'''
    write(ROOT / 'README.md', text)


def generate_section_indexes() -> None:
    for dirname, name, desc in SECTIONS:
        directory = ROOT / dirname
        if not directory.exists():
            continue
        all_md = md_files_under(directory)
        direct_links = first_level_links(directory)
        subdirs = sorted([p for p in directory.iterdir() if p.is_dir() and p.name not in EXCLUDE_DIRS], key=lambda p: p.name)
        lines = [
            f'# {dirname} · {name}',
            '',
            f'> {desc}。',
            '',
            '## 学习定位',
            '',
            f'- **模块职责**：沉淀{name}相关的核心概念、实践经验和面试复习材料。',
            '- **整理原则**：优先维护主干文档；课程笔记、旧题库和原始资料暂存，后续合并到主干。',
            '- **索引约定**：本文是中文主索引；`README.md` 仅作为兼容入口。',
            '',
            '## 主干文档',
            '',
        ]
        if direct_links:
            for title, link in direct_links:
                lines.append(f'- [{title}]({link})')
        else:
            lines.append('- 暂无主干文档，待从原始资料中提炼。')
        lines += ['', '## 子目录', '']
        if subdirs:
            for sub in subdirs:
                readme = sub / 'README.md'
                index = sub / INDEX_NAME
                target = f'./{sub.name}/'
                if index.exists():
                    target = f'./{sub.name}/{INDEX_NAME}'
                elif readme.exists():
                    target = f'./{sub.name}/README.md'
                count = len(md_files_under(sub))
                lines.append(f'- [{sub.name}]({target}) — {count} 篇笔记')
        else:
            lines.append('- 暂无子目录。')
        lines += [
            '',
            '## 整理记录',
            '',
            f'- 当前 Markdown 文档数：{len(all_md)}',
            '- 待合并、待删除和断链问题统一记录在 [知识库整理规划](../99-其他/知识库整理规划.md)。',
        ]
        write(directory / INDEX_NAME, '\n'.join(lines))


def simplify_readmes() -> None:
    for dirname, name, _ in SECTIONS:
        directory = ROOT / dirname
        if not directory.exists():
            continue
        text = f'''# {dirname} · {name}

> 中文主索引已迁移到 [索引.md](./{INDEX_NAME})。

本文件仅作为 GitHub 默认展示入口保留；日常维护请优先更新中文索引。
'''
        write(directory / 'README.md', text)


def link_targets_from_markdown(text: str) -> list[str]:
    targets: list[str] = []
    for m in re.finditer(r'(?<!\!)\[[^\]]+\]\(([^)]+)\)', text):
        url = m.group(1).strip()
        if not url or re.match(r'^(https?://|mailto:|#|skill:|tel:)', url):
            continue
        if url.startswith('<') and url.endswith('>'):
            url = url[1:-1]
        targets.append(url)
    return targets


def is_broken_link(source: Path, url: str) -> bool:
    main = url.split('#', 1)[0]
    if not main:
        return False
    main = unquote(main)
    target = (source.parent / main).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        return False
    return not target.exists()


def collect_issues() -> tuple[list[str], list[str], list[str], list[str]]:
    broken: list[str] = []
    multi_h1: list[str] = []
    no_h1: list[str] = []
    duplicate_names: list[str] = []
    name_map: dict[str, list[Path]] = {}
    for p in sorted(ROOT.rglob('*.md')):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        rel = p.relative_to(ROOT).as_posix()
        try:
            text = p.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        h1_count = len(re.findall(r'^#\s+', text, flags=re.M))
        if h1_count == 0:
            no_h1.append(rel)
        elif h1_count > 1:
            multi_h1.append(f'{rel}（{h1_count} 个 H1）')
        for url in link_targets_from_markdown(text):
            if is_broken_link(p, url):
                broken.append(f'{rel} -> {url}')
        key = re.sub(r'\s+', '', p.stem.lower())
        name_map.setdefault(key, []).append(p)
    for _, paths in sorted(name_map.items()):
        if len(paths) >= 2:
            rels = [p.relative_to(ROOT).as_posix() for p in paths]
            duplicate_names.append(' / '.join(rels[:6]) + (f' / ... 共 {len(rels)} 个' if len(rels) > 6 else ''))
    return broken, multi_h1, no_h1, duplicate_names


def generate_todo() -> None:
    broken, multi_h1, no_h1, duplicate_names = collect_issues()
    lines = [
        '# 知识库整理规划',
        '',
        '> 本文记录知识库体系化治理过程中的待处理事项。已完成合并且确认无用的旧资料，可以删除；未确认前先归档记录。',
        '',
        '## 已执行',
        '',
        f'- 新增根目录中文主索引：`{ROOT_INDEX}`。',
        '- 为一级目录统一生成中文主索引：`索引.md`。',
        '- 将各级 `README.md` 简化为 GitHub 兼容入口，日常维护转向中文索引。',
        '',
        '## 后续治理规则',
        '',
        '1. **先合并再删除**：重复笔记先抽取到主干文档，确认内容已覆盖后再删除旧文档。',
        '2. **先修入口再修细节**：优先保证根索引、模块索引、重点专题入口可用。',
        '3. **一文一个主标题**：长文内部层级使用二级及以下标题，多 H1 文档逐步改造。',
        '4. **课程笔记保留上下文**：课程型资料不直接打散，先标注来源和适合合并的章节。',
        '',
        '## 待合并主题',
        '',
        '- React：Fiber、Hooks、性能优化、React 19/19.2 与 Server Components 相关文档继续整合为主线专题。',
        '- JavaScript：Event Loop、Promise、原型链、闭包、模块化相关重复题解继续合并。',
        '- 网络与浏览器：HTTP 版本、缓存、CDN、安全与性能优化文档继续归并。',
        '- 工程化：Webpack、Vite、CI/CD、代码质量和发布流程继续按工程链路重排。',
        '- 面试题：牛客题库与专题深挖保留题库形态，但重复答案沉淀到主干专题。',
        '',
        '## 待删除候选',
        '',
        '- 已被 `索引.md` 替代的长篇旧 README 内容：当前先简化保留入口，不直接删除文件。',
        '- 与主干专题完全重复的旧课程摘录：需完成内容迁移后删除。',
        '- 仅包含过期导航且无独立内容的索引页：确认无引用后删除。',
        '',
        f'## 待修复断链（自动扫描 {len(broken)} 条，优先处理真实文档链接）',
        '',
    ]
    if broken:
        for item in broken[:120]:
            lines.append(f'- `{item}`')
        if len(broken) > 120:
            lines.append(f'- ... 其余 {len(broken) - 120} 条后续分批处理')
    else:
        lines.append('- 暂无断链。')
    lines += ['', f'## 多 H1 文档（{len(multi_h1)} 个）', '']
    for item in multi_h1[:80]:
        lines.append(f'- `{item}`')
    if len(multi_h1) > 80:
        lines.append(f'- ... 其余 {len(multi_h1) - 80} 个后续分批处理')
    lines += ['', f'## 无 H1 文档（{len(no_h1)} 个）', '']
    for item in no_h1[:80]:
        lines.append(f'- `{item}`')
    if len(no_h1) > 80:
        lines.append(f'- ... 其余 {len(no_h1) - 80} 个后续分批处理')
    lines += ['', f'## 疑似重复文件名（{len(duplicate_names)} 组）', '']
    for item in duplicate_names[:80]:
        lines.append(f'- `{item}`')
    if len(duplicate_names) > 80:
        lines.append(f'- ... 其余 {len(duplicate_names) - 80} 组后续分批处理')
    write(TODO_FILE, '\n'.join(lines))


def main() -> None:
    generate_root_index()
    generate_root_readme()
    generate_section_indexes()
    simplify_readmes()
    generate_todo()
    print('generated Chinese indexes, simplified README files, and updated cleanup plan')


if __name__ == '__main__':
    main()
