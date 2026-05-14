#!/usr/bin/env python3
"""Copy solidjs/solid-docs .mdx files into docs/ with cleaned paths.

Source structure uses SolidStart route groups like `(0)concepts/(2)signals.mdx`.
Target removes the `(N)` prefixes so paths are human-friendly:
  src/routes/(0)concepts/(2)signals.mdx → docs/concepts/signals.md
"""
import re
import shutil
from pathlib import Path

REPO = Path("/tmp/solid-docs")
SRC = REPO / "src" / "routes"
ROOT = Path(__file__).parent
OUT = ROOT / "docs"

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

GROUP_PREFIX = re.compile(r"^\(\d+\)")


def clean(part: str) -> str:
    """Strip the (N) prefix from a path segment."""
    return GROUP_PREFIX.sub("", part)


def target_for(src_path: Path) -> Path:
    rel = src_path.relative_to(SRC)
    parts = [clean(p) for p in rel.parts]
    last = parts[-1]
    if last.endswith(".mdx"):
        last = last[:-4] + ".md"
    elif last.endswith(".md"):
        pass
    parts[-1] = last
    return OUT.joinpath(*parts)


files = sorted([p for p in SRC.rglob("*") if p.suffix in (".mdx", ".md") and p.is_file()])
print(f"Found {len(files)} files in solid-docs/src/routes")

counts = {}
for src in files:
    dst = target_for(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    bucket = str(dst.parent.relative_to(OUT)) or "_root"
    counts[bucket] = counts.get(bucket, 0) + 1

print(f"Wrote {len(files)} files under {OUT}")
for k in sorted(counts):
    print(f"  {k}: {counts[k]}")
