#!/usr/bin/env bash
# Typography migration: font arrays, arbitrary text sizes, arbitrary leading.
set -euo pipefail
FILES=$(find src -type f \( -name "*.jsx" -o -name "*.tsx" \))
run() {
  local pattern="$1"
  local replacement="$2"
  for f in $FILES; do
    sed -i "s#${pattern}#${replacement}#g" "$f"
  done
}
run "font-\\['Instrument_Serif',serif\\]" 'font-serif'
run "font-\\['DM_Sans',system-ui,sans-serif\\]" 'font-sans'
run "font-\\['JetBrains_Mono',monospace\\]" 'font-mono'
run 'text-\[10px\]' 'text-2xs'
run 'text-\[11px\]' 'text-xs'
run 'text-\[12px\]' 'text-xs'
run 'text-\[13px\]' 'text-sm'
run 'text-\[14px\]' 'text-sm'
run 'text-\[15px\]' 'text-base'
run 'text-\[1.05rem\]' 'text-lg'
run 'text-\[0.8rem\]' 'text-xs'
run 'text-\[0.9rem\]' 'text-sm'
run 'leading-\[1\]' 'leading-none'
run 'leading-\[1.1\]' 'leading-tight'
run 'leading-\[1.15\]' 'leading-tight'
run 'leading-\[1.2\]' 'leading-tight'
run 'leading-\[1.3\]' 'leading-snug'
run 'leading-\[1.4\]' 'leading-snug'
run 'leading-\[1.5\]' 'leading-normal'
run 'leading-\[1.6\]' 'leading-relaxed'
run 'leading-\[1.65\]' 'leading-relaxed'
run 'leading-\[1.7\]' 'leading-relaxed'
echo "Done. Files touched:"
git diff --stat --no-color HEAD | tail -10
