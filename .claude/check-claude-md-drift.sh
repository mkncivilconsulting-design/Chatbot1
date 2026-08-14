#!/usr/bin/env bash
# Stop hook: warn when structural files have changed more recently than CLAUDE.md.
#
# Cheap by design — it only stats files, never reads them and never rewrites
# CLAUDE.md. Output is a systemMessage so the drift is visible without blocking
# the turn. Prints nothing when CLAUDE.md is up to date.
set -u

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
doc="$root/CLAUDE.md"

# Nothing to compare against.
[ -f "$doc" ] || exit 0

# Route/layout files and the mock-data module define the architecture the doc
# describes; the rest are config that changes commands or conventions.
loose_files="package.json components.json next.config.ts tsconfig.json eslint.config.mjs AGENTS.md README.md"

drifted="$(
  {
    find "$root/app" "$root/lib" -type f \
      \( -name 'page.tsx' -o -name 'layout.tsx' -o -name 'mock-data.ts' \) \
      -newer "$doc" 2>/dev/null
    for f in $loose_files; do
      if [ -f "$root/$f" ] && [ "$root/$f" -nt "$doc" ]; then
        echo "$root/$f"
      fi
    done
  } | sed "s|^$root/||" | sort
)"

[ -n "$drifted" ] || exit 0

count="$(printf '%s\n' "$drifted" | wc -l | tr -d '[:space:]')"
names="$(printf '%s\n' "$drifted" | head -6 | awk '{ printf "%s%s", sep, $0; sep = ", " }')"
[ "$count" -gt 6 ] && names="$names, …"

printf '{"systemMessage":"CLAUDE.md drift: %s structural file(s) changed since it was last written — %s. Ask Claude to refresh CLAUDE.md if the architecture or commands moved.","suppressOutput":true}\n' \
  "$count" "$names"

exit 0
