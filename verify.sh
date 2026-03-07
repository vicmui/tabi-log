#!/bin/bash
echo "=== CHECKING YOUR LOCAL PROJECT FILES ==="
echo ""

check() {
  local file=$1
  local search=$2
  local should_exist=$3
  
  if [ ! -f "$file" ]; then
    echo "❌ FILE NOT FOUND: $file"
    return
  fi
  
  if grep -q "$search" "$file"; then
    if [ "$should_exist" = "yes" ]; then
      echo "✅ OK: $file contains '$search'"
    else
      echo "❌ BAD: $file STILL has '$search' — NOT YET UPDATED"
    fi
  else
    if [ "$should_exist" = "yes" ]; then
      echo "❌ BAD: $file is MISSING '$search' — NOT YET UPDATED"
    else
      echo "✅ OK: $file correctly removed '$search'"
    fi
  fi
}

check "components/layout/Sidebar.tsx"  "Osaka"        "no"
check "components/layout/Sidebar.tsx"  "VM&apos;S"    "yes"
check "app/layout.tsx"                 "isLoaded ?"   "no"
check "app/layout.tsx"                 "pb-24 md:pb-0" "yes"
check "components/ui/Dialog.tsx"       "去邊度好呢"   "yes"
check "components/ui/Dialog.tsx"       "cursor-pointer transition-opacity text-white" "yes"
check "app/planning/page.tsx"          "sessionStorage" "yes"

echo ""
echo "=== GIT STATUS ==="
git status --short
