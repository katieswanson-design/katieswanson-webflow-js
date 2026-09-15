#!/usr/bin/env bash
# Commit, bump the patch tag, push, then print the CDN URL + SRI hash for each
# script so the Webflow registered script can be updated.
set -euo pipefail

REPO="katieswanson-design/katieswanson-webflow-js"
MSG="${1:-update scripts}"

cd "$(dirname "$0")"

# ---- Pre-flight: never tag or push something that cannot run ---------------
FAIL=0

# Smart quotes are a SyntaxError in JS and silently wrong in CSS. They ride in
# from Notion/Docs/Slack pastes, so check before anything is committed.
# python3, not grep -P — BSD grep on macOS has no -P.
if ! python3 - <<'PYEOF'
import glob, sys, unicodedata
BAD = {"\u2018", "\u2019", "\u201c", "\u201d"}
found = False
for f in sorted(glob.glob("src/*.js") + glob.glob("src/*.css")):
    for n, line in enumerate(open(f, encoding="utf-8"), 1):
        for ch in BAD:
            if ch in line:
                print(f"!! {f}:{n} contains {ch} ({unicodedata.name(ch)})")
                print(f"     {line.rstrip()}")
                found = True
                break
sys.exit(1 if found else 0)
PYEOF
then
  echo "   replace smart quotes with straight ' or \""
  FAIL=1
fi

# Parse every script. A file that does not parse takes its whole feature down.
for f in src/*.js; do
  [ -e "$f" ] || continue
  if ! node --check "$f" 2>/dev/null; then
    echo "!! $f does not parse:"
    node --check "$f" 2>&1 | sed 's/^/     /' | head -6
    FAIL=1
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "Release aborted. Nothing committed, tagged, or pushed."
  exit 1
fi
echo "pre-flight: syntax and quotes OK"


if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -q -m "$MSG"
  echo "committed: $MSG"
else
  echo "no file changes — tagging current HEAD"
fi

LATEST=$(git tag -l 'v*' --sort=-v:refname | head -1)
if [[ -z "$LATEST" ]]; then
  NEXT="v1.0.0"
else
  IFS='.' read -r MAJ MIN PAT <<< "${LATEST#v}"
  NEXT="v${MAJ}.${MIN}.$((PAT + 1))"
fi

git tag "$NEXT"
git push -q origin HEAD --tags
echo "tagged and pushed: $NEXT"
echo
# ---- Only what CHANGED needs a new Webflow registration --------------------
# A registration pinned at an older tag is not stale — it is immutable, and
# that is the point. It only goes stale when the file behind it changes and
# the registration is left pointing at the old bytes. So the thing worth
# printing is the short list of files this release actually touched, not a
# hash for all twenty every time. (The nav-menu 1.0.74-vs-1.0.63 mismatch
# happened precisely because the signal was buried in that noise.)
if [[ -n "$LATEST" ]]; then
  CHANGED=$(git diff --name-only "$LATEST" HEAD -- 'src/*.js' 'src/*.css')
else
  CHANGED=$(ls src/*.js src/*.css 2>/dev/null)   # first ever release
fi

if [[ -z "$CHANGED" ]]; then
  echo "No src/ file changed since ${LATEST}. Nothing to re-register in Webflow."
  echo "Every existing registration stays valid — do not bump anything."
  exit 0
fi

echo "Waiting for jsDelivr to pick up the new tag..."

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

FAILED=0
OUTPUT=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -e "$f" ] || continue          # deleted in this release; nothing to serve
  URL="https://cdn.jsdelivr.net/gh/${REPO}@${NEXT}/${f}"
  OUT="$TMP/$(basename "$f")"
  OK=""
  for attempt in 1 2 3 4 5 6; do
    if curl -fsSL "$URL" -o "$OUT" 2>/dev/null; then OK=1; break; fi
    sleep 5
  done
  if [[ -z "$OK" ]]; then
    echo "  !! $f — jsDelivr not serving $NEXT yet. Retry later with:"
    echo "     curl -sL $URL | openssl dgst -sha384 -binary | openssl base64 -A"
    FAILED=1
    continue
  fi
  # Compare raw bytes — never via $(...), which strips trailing newlines and
  # would yield a hash the browser rejects.
  if ! cmp -s "$OUT" "$f"; then
    echo "  !! $f — CDN bytes differ from the committed file; not printing a hash"
    FAILED=1
    continue
  fi
  HASH=$(openssl dgst -sha384 -binary "$OUT" | openssl base64 -A)
  OUTPUT+="
  $f
    url:  $URL
    sri:  sha384-${HASH}
"
done <<< "$CHANGED"

echo
echo "═══════════════════════════════════════════════════════════════════"
echo " CHANGED in ${NEXT} — these Webflow registrations need bumping:"
echo "═══════════════════════════════════════════════════════════════════"
printf '%s\n' "$OUTPUT"

UNCHANGED=$(comm -23 \
  <(ls src/*.js src/*.css 2>/dev/null | sort) \
  <(printf '%s\n' "$CHANGED" | sort) | tr '\n' ' ')
if [[ -n "${UNCHANGED// /}" ]]; then
  echo " Unchanged, leave pinned where they are:"
  echo "   ${UNCHANGED}"
  echo
fi

echo "Bump only the files listed above (Site settings > Custom code, or ask"
echo "Claude to do it via the Webflow MCP), then PUBLISH — a registration"
echo "change is not live until the site is published."
echo
echo "Afterwards, ./check-pins.sh verifies the live pages against this repo."
[[ "$FAILED" -eq 0 ]] || exit 1
