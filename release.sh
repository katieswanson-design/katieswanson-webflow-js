#!/usr/bin/env bash
# Commit, bump the patch tag, push, and print the CDN URLs to paste into Webflow.
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
echo "CDN URLs — swap the tag in your Webflow custom code:"
for f in src/*.js; do
  [[ "$f" == *.min.js ]] && continue
  echo "  https://cdn.jsdelivr.net/gh/${REPO}@${NEXT}/${f%.js}.min.js"
done
echo
echo "jsDelivr caches a new tag on first request; allow a few seconds."
