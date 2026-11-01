#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {
    ".md",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".jsonl",
    ".yml",
    ".yaml",
    ".html",
    ".css",
    ".scss",
    ".less",
    ".py",
    ".txt",
    ".example",
}
SKIP_PARTS = {".git", "node_modules", ".trash"}
ALLOWLIST_TOKEN_FILES = {
    "00-贾维斯备份/自研Skills/capability-evolver/test/sanitize.test.js",
}
ALLOWLIST_COMPANY_FILES = {
    "00-贾维斯备份/自研Skills/capability-evolver/test/sanitize.test.js",
}
ALLOWLIST_COMPANY_PATTERNS = {
    "lhci.internal.example.com",
}

PATTERNS = {
    "credential_token": re.compile(
        r"(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|gh[osrup]_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|npm_[A-Za-z0-9_-]{20,})"
    ),
    "company_internal_domain": re.compile(
        r"(?i)(bytedance\.net|byteintl\.net|tiktok-row\.net|sinf\.net|larkoffice\.com|feishu\.cn|\.corp\b)"
    ),
    "private_ip_or_local_service": re.compile(
        r"\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1:\d+|localhost:\d+)\b"
    ),
}


def git_files() -> list[Path]:
    output = subprocess.check_output(
        ["git", "-C", str(ROOT), "-c", "core.quotePath=false", "ls-files", "-z"]
    )
    paths: list[Path] = []
    for raw in output.split(b"\0"):
        if not raw:
            continue
        rel = raw.decode("utf-8", "surrogateescape")
        path = ROOT / rel
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        if path.suffix.lower() in TEXT_SUFFIXES:
            paths.append(path)
    return paths


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def mask(name: str, line: str) -> str:
    return PATTERNS[name].sub("[REDACTED]", line).strip()[:220]


def is_allowed(name: str, rel: str, line: str) -> bool:
    if name == "credential_token" and rel in ALLOWLIST_TOKEN_FILES:
        return True
    if name == "company_internal_domain":
        return rel in ALLOWLIST_COMPANY_FILES or any(
            value in line for value in ALLOWLIST_COMPANY_PATTERNS
        )
    return False


def main() -> int:
    counts: Counter[str] = Counter()
    blocking: list[tuple[str, str, int, str]] = []
    warnings: list[tuple[str, str, int, str]] = []

    for path in git_files():
        rel = path.relative_to(ROOT).as_posix()
        text = read_text(path)
        for lineno, line in enumerate(text.splitlines(), 1):
            for name, pattern in PATTERNS.items():
                if not pattern.search(line):
                    continue
                if is_allowed(name, rel, line):
                    counts[f"allowed_{name}"] += 1
                    break
                if name == "private_ip_or_local_service":
                    counts[f"warning_{name}"] += 1
                    if len(warnings) < 20:
                        warnings.append((name, rel, lineno, mask(name, line)))
                else:
                    counts[f"blocking_{name}"] += 1
                    blocking.append((name, rel, lineno, mask(name, line)))
                break

    print("Sensitive scan summary:")
    for key in sorted(counts):
        print(f"  {key}: {counts[key]}")

    if warnings:
        print("\nWarnings (local/private endpoints, usually acceptable in tutorials):")
        for name, rel, lineno, sample in warnings[:20]:
            print(f"  {name} {rel}:{lineno} {sample}")

    if blocking:
        print("\nBlocking findings:")
        for name, rel, lineno, sample in blocking[:50]:
            print(f"  {name} {rel}:{lineno} {sample}")
        return 1

    print("\nNo blocking credential or company-internal findings detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
