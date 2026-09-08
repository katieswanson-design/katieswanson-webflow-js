#!/usr/bin/env bash
# Commit, bump the patch tag, push, then print the CDN URL + SRI hash for each
# script so the Webflow registered script can be updated.
set -euo pipefail

REPO="katieswanson-design/katieswanson-webflow-js"
MSG="${1:-update scripts}"

cd "$(dirname "$0")"

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
echo "Waiting for jsDelivr to pick up the new tag..."

for f in src/*.js; do
  URL="https://cdn.jsdelivr.net/gh/${REPO}@${NEXT}/${f}"
  for attempt in 1 2 3 4 5 6; do
    BODY=$(curl -fsSL "$URL" 2>/dev/null) && break
    sleep 5
  done
  if [[ -z "${BODY:-}" ]]; then
    echo "  !! $f — jsDelivr not serving $NEXT yet; re-run: curl -s $URL | openssl dgst -sha384 -binary | openssl base64 -A"
    continue
  fi
  # Verify the CDN is serving exactly what we committed before trusting the hash.
  if ! diff -q <(printf '%s' "$BODY") <(cat "$f") >/dev/null 2>&1; then
    printf '  !! %s — CDN bytes differ from local file; not printing a hash\n' "$f"
    continue
  fi
  HASH=$(printf '%s' "$BODY" | openssl dgst -sha384 -binary | openssl base64 -A)
  echo
  echo "  $f"
  echo "    url:  $URL"
  echo "    sri:  sha384-${HASH}"
done

echo
echo "Update the Webflow registered script with the url + sri above"
echo "(Site settings > Custom code, or ask Claude to do it via the Webflow MCP)."
