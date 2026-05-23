from __future__ import annotations

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
