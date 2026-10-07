#!/usr/bin/env python3
"""
Build script for Operator's command-center dashboard.

Reassembles the split source files (src/head.html, src/styles.css,
src/body-shell.html, src/js/*.js, src/tail.html) back into the single
command-center-2.html file that the Operator.app wrapper launches.

Usage:
    python3 scripts/build.py

Run this after editing anything under src/. It writes the packaged file to
dist/command-center-2.html. Nothing under src/ is ever launched directly —
only the built file in dist/ (and, when you're happy with it, the copy
inside Operator-2-7-2.app/Contents/Resources/) is.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
JS_DIR = os.path.join(SRC, "js")
DIST = os.path.join(ROOT, "dist")
OUT_FILE = os.path.join(DIST, "command-center-2.html")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def build():
    os.makedirs(DIST, exist_ok=True)

    manifest_path = os.path.join(JS_DIR, "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    parts = []
    parts.append(read(os.path.join(SRC, "head.html")))
    parts.append("<style>\n")
    parts.append(read(os.path.join(SRC, "styles.css")))
    parts.append("</style>\n")
    parts.append(read(os.path.join(SRC, "between-style-body.html")))
    parts.append("<body>\n")
    parts.append(read(os.path.join(SRC, "body-shell.html")))

    parts.append("<script>\n")
    parts.append("(function(){\n")
    parts.append("\n")
    for fname in manifest:
        fpath = os.path.join(JS_DIR, fname)
        if not os.path.exists(fpath):
            print(f"ERROR: missing js section file: {fname}", file=sys.stderr)
            sys.exit(1)
        parts.append(read(fpath))
    parts.append("})();\n")
    parts.append(read(os.path.join(SRC, "tail.html")))

    out = "".join(parts)

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(out)

    print(f"Built {OUT_FILE} ({len(out)} bytes)")
    return OUT_FILE


if __name__ == "__main__":
    build()
