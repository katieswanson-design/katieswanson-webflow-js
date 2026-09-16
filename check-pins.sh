#!/usr/bin/env bash
# check-pins.sh — compare the asset versions the LIVE site serves against this
# repo, and report only the ones that are genuinely out of date.
#
# The point, because it is easy to get backwards:
#
#   A registration pinned at an old tag is NOT a problem. It is immutable —
#   fixed bytes, fixed SRI, no surprise updates. Nineteen files pinned across
#   eight different tags is normal and healthy; the spread just records when
#   each file last changed.
#
#   A pin is stale ONLY when the file behind it has changed since that tag and
#   the registration was never bumped. Then the repo and the live site quietly
#   disagree, and reading the registry does not reveal it — Webflow's registry
#   and the published output are allowed to differ until a publish.
#
#   That is the failure this script catches. It happened on 2026-09-14, when
#   nav-menu.js was registered at 1.0.74 while the published pages still served
#   1.0.63, and the only way it surfaced was reading the version off the page.
#
# So: this reads the live pages, not the Webflow registry. The registry lies
# between a registration change and a publish; the page never does.
#
# Usage:
#   ./check-pins.sh                  # check the default page list
#   ./check-pins.sh new-home about   # check just these paths
#   BASE=https://… ./check-pins.sh   # point at a different host
#
# Exit status: 0 if every pin is current, 1 if anything is stale or unreachable
# — so it can gate a release if you ever want it to.

set -uo pipefail

REPO="katieswanson-design/katieswanson-webflow-js"
BASE="${BASE:-https://katieswanson-design-portfolio-sandbox.webflow.io}"

# Published paths. "" is the site root. Drafts are excluded on purpose: they are
# not published, so they serve nothing. Keep this in step with the site — it is
# the one part of this script that cannot discover itself, because the Webflow
# subdomain does not serve a sitemap.xml (checked 2026-09-15: 404).
PAGES=(
  ""  new-home  about  bookmarks  skills  guidelines  space
  case-studies/case-study-01
  case-studies/case-study-02
  case-studies/case-study-03
  case-studies/case-study-template
  admin/style  admin/components  admin/sandbox
  playground  404
)
[ $# -gt 0 ] && PAGES=("$@")

cd "$(dirname "$0")"
git fetch --tags -q 2>/dev/null || true

HEAD_TAG=$(git tag -l 'v*' --sort=-v:refname | head -1)
echo "repo HEAD tag : ${HEAD_TAG:-<none>}"
echo "checking      : $BASE"
echo "pages         : ${#PAGES[@]}"
echo

PINS=$(mktemp); trap 'rm -f "$PINS"' EXIT
UNREACHABLE=0
for p in "${PAGES[@]}"; do
  body=$(curl -fsS --max-time 20 "$BASE/$p" 2>/dev/null) || {
    echo "  !! could not fetch /$p"
    UNREACHABLE=1
    continue
  }
  printf '%s' "$body" \
    | grep -oE "${REPO//\//\\/}@v[0-9]+\.[0-9]+\.[0-9]+/src/[A-Za-z0-9_-]+\.(css|js)" \
    >> "$PINS"
done
sort -u "$PINS" -o "$PINS"

if [ ! -s "$PINS" ]; then
  echo "No repo assets found on any page. Either the pages changed or BASE is wrong."
  exit 1
fi

printf '%-24s %-10s %s\n' "FILE" "PINNED" "STATUS"
printf '%-24s %-10s %s\n' "------------------------" "----------" "--------------------------------"

STALE=0
MISSING=0
declare -a SEEN=()
while IFS= read -r pin; do
  ver=${pin#*@}; ver=${ver%%/*}
  file="src/${pin##*/src/}"
  SEEN+=("$file")

  if ! git cat-file -e "${ver}:${file}" 2>/dev/null; then
    printf '%-24s %-10s %s\n' "$(basename "$file")" "$ver" "?? not present at that tag"
    MISSING=1
  elif git diff --quiet "$ver" HEAD -- "$file" 2>/dev/null; then
    printf '%-24s %-10s %s\n' "$(basename "$file")" "$ver" "ok - unchanged since $ver"
  else
    n=$(git rev-list "${ver}..HEAD" --count -- "$file" 2>/dev/null || echo "?")
    printf '%-24s %-10s %s\n' "$(basename "$file")" "$ver" "STALE - $n commit(s) since; re-register"
    STALE=$((STALE + 1))
  fi
done < "$PINS"

# Files in the repo that no published page references. Not an error — a file can
# be page-level on a page not listed, or parked deliberately — but it is worth
# seeing, because it is also what an orphaned or forgotten asset looks like.
ORPHANS=""
for f in src/*.js src/*.css; do
  [ -e "$f" ] || continue
  # mode-boot is inline, never CDN-referenced, and has its own check below.
  case "$(basename "$f")" in mode-boot.js|mode-boot.inline.js) continue ;; esac
  hit=0
  for s in "${SEEN[@]:-}"; do [ "$s" = "$f" ] && hit=1 && break; done
  [ "$hit" -eq 0 ] && ORPHANS+="$(basename "$f") "
done

echo
if [ -n "${ORPHANS// /}" ]; then
  echo "In the repo but not referenced by any checked page:"
  echo "   $ORPHANS"
  echo
fi

# ---- mode boot: the one script no pin can cover ------------------------------
# mode-boot.js is not served from jsDelivr. It is registered as an INLINE script
# so it runs before first paint, and Webflow re-hosts those bytes on its own CDN
# under a name this script cannot predict from the repo. So the loop above,
# which matches jsDelivr URLs against tags, is blind to it.
#
# It is also the script where silent drift costs the most: a stale boot copy
# brings back the flash-of-wrong-theme, and nothing else would report it.
#
# src/mode-boot.inline.js is the derived artifact that build-mode-boot.sh
# produces from src/mode-boot.js. Two things get checked: that the artifact is
# current with its source, and that the live page serves exactly those bytes.
MODEBOOT=0
if ! ./build-mode-boot.sh --check >/dev/null 2>&1; then
  echo
  echo "mode-boot.inline.js is STALE against src/mode-boot.js."
  echo "   Run ./build-mode-boot.sh, then re-register the inline script."
  MODEBOOT=1
else
  MB_URL=$(curl -fsSL "${BASE}/new-home" 2>/dev/null \
    | grep -o 'https://[^"]*mode_boot-[^"]*\.js' | head -1)
  if [ -z "$MB_URL" ]; then
    echo
    echo "mode boot: no inline script found on the published page. Investigate."
    MODEBOOT=1
  elif curl -fsSL "$MB_URL" -o /tmp/ks-modeboot-live.js 2>/dev/null; then
    if cmp -s /tmp/ks-modeboot-live.js src/mode-boot.inline.js; then
      echo
      echo "mode boot            inline     ok - live bytes match the repo"
    else
      echo
      echo "mode boot            inline     STALE - live bytes differ from"
      echo "                                src/mode-boot.inline.js"
      echo "   Re-register the inline script with the output of ./build-mode-boot.sh"
      MODEBOOT=1
    fi
    rm -f /tmp/ks-modeboot-live.js
  else
    echo
    echo "mode boot: could not fetch $MB_URL"
    MODEBOOT=1
  fi
fi

if [ "$STALE" -eq 0 ] && [ "$MISSING" -eq 0 ] && [ "$UNREACHABLE" -eq 0 ] && [ "$MODEBOOT" -eq 0 ]; then
  echo "All pins current. Nothing to bump."
  exit 0
fi

[ "$STALE" -gt 0 ] && echo "$STALE stale pin(s) — bump those registrations in Webflow, then PUBLISH."
[ "$MISSING" -ne 0 ] && echo "Some pins point at a tag that does not contain the file. Investigate before bumping."
[ "$UNREACHABLE" -ne 0 ] && echo "Some pages could not be fetched; results are incomplete."
[ "$MODEBOOT" -ne 0 ] && echo "The inline mode boot script needs attention - see above."
exit 1
