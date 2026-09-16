#!/usr/bin/env bash
# Derive the exact bytes registered in Webflow as the inline "mode boot" script.
#
# src/mode-boot.js cannot be registered as-is: register_inline_script caps the
# source at 2000 characters and that file is ~2800, nearly all of it the comment
# block explaining why the script exists. So what Webflow holds has always been
# a stripped copy, produced by hand — which meant the repo file and the live
# script could drift with nothing to catch it. This makes that copy a build
# artifact instead: derived, committed, and checkable.
#
# The transform is deliberately dumb: drop comments, drop indentation, drop
# blank lines. No variable renaming, no expression rewriting. Dumb means the
# output is reproducible byte-for-byte, which is the whole point — check-pins.sh
# compares the live Webflow copy against it.
#
# Usage: ./build-mode-boot.sh          writes src/mode-boot.inline.js
#        ./build-mode-boot.sh --check  exits 1 if the committed file is stale
set -euo pipefail
cd "$(dirname "$0")"

SRC="src/mode-boot.js"
OUT="src/mode-boot.inline.js"
LIMIT=2000

DERIVED=$(python3 - "$SRC" <<'PYEOF'
import re, sys

src = open(sys.argv[1], encoding="utf-8").read()

# Refuse to run if a string literal contains a comment marker. The stripper
# below is not a JS parser, and such a string is the one thing that would make
# it silently corrupt the script rather than fail.
for m in re.finditer(r"'[^'\n]*'|\"[^\"\n]*\"", src):
    if "//" in m.group() or "/*" in m.group():
        sys.exit("!! string literal contains a comment marker: " + m.group()
                 + "\n   build-mode-boot.sh cannot strip this file safely.")

src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)   # block comments
src = re.sub(r"(?m)^\s*//.*$", "", src)           # whole-line // comments

lines = [ln.strip() for ln in src.splitlines()]
print("\n".join(ln for ln in lines if ln))
PYEOF
)

BYTES=${#DERIVED}
if [ "$BYTES" -ge "$LIMIT" ]; then
  echo "!! derived script is ${BYTES} chars, at or over Webflow's ${LIMIT} limit"
  exit 1
fi

if [ "${1:-}" = "--check" ]; then
  if [ ! -f "$OUT" ]; then
    echo "!! $OUT missing — run ./build-mode-boot.sh"; exit 1
  fi
  if [ "$DERIVED" != "$(cat "$OUT")" ]; then
    echo "!! $OUT is stale — src/mode-boot.js changed since it was built."
    echo "   Run ./build-mode-boot.sh, then re-register the inline script."
    exit 1
  fi
  echo "mode-boot inline copy: up to date (${BYTES} chars)"
  exit 0
fi

printf '%s' "$DERIVED" > "$OUT"
echo "wrote $OUT (${BYTES} chars, limit ${LIMIT})"
echo
echo "Register these exact bytes in Webflow as the inline script 'mode boot':"
echo "───────────────────────────────────────────────────────────────────"
cat "$OUT"
echo
echo "───────────────────────────────────────────────────────────────────"
