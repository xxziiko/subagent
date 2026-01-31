#!/bin/bash
# verify.sh - 버그 수정 후 검증 파이프라인 (check-types → build → E2E)
# 사용법: scripts/verify.sh [--project=shop|admin] [--skip-e2e]
#
# 옵션:
#   --project=<name>  E2E 테스트 대상 프로젝트 (shop 또는 admin)
#   --skip-e2e        E2E 테스트 건너뛰기
#
# 예시:
#   scripts/verify.sh --project=shop
#   scripts/verify.sh --skip-e2e

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE_ROOT"

# 옵션 파싱
PROJECT=""
SKIP_E2E=false

for arg in "$@"; do
  case $arg in
    --project=*)
      PROJECT="${arg#*=}"
      ;;
    --skip-e2e)
      SKIP_E2E=true
      ;;
    *)
      echo "알 수 없는 옵션: $arg"
      echo "사용법: scripts/verify.sh [--project=shop|admin] [--skip-e2e]"
      exit 1
      ;;
  esac
done

# 결과 저장
RESULTS=()
FAILED=false

print_separator() {
  echo "────────────────────────────────────────"
}

# Step 1: check-types
echo ""
print_separator
echo "▶ [1/3] check-types"
print_separator

if pnpm run check-types 2>&1; then
  RESULTS+=("✓ check-types: PASS")
else
  RESULTS+=("✗ check-types: FAIL")
  FAILED=true
  echo ""
  print_separator
  echo "⛔ check-types 실패 — 이후 단계 건너뜁니다"
  print_separator
  echo ""
  echo "=== 검증 결과 ==="
  for r in "${RESULTS[@]}"; do echo "  $r"; done
  echo "  - build: SKIP"
  echo "  - E2E: SKIP"
  exit 1
fi

# Step 2: build
echo ""
print_separator
echo "▶ [2/3] build"
print_separator

BUILD_CMD="pnpm run build"
if [ -n "$PROJECT" ]; then
  BUILD_CMD="pnpm run build:${PROJECT}"
fi

if $BUILD_CMD 2>&1; then
  RESULTS+=("✓ build: PASS")
else
  RESULTS+=("✗ build: FAIL")
  FAILED=true
  echo ""
  print_separator
  echo "⛔ build 실패 — E2E 건너뜁니다"
  print_separator
  echo ""
  echo "=== 검증 결과 ==="
  for r in "${RESULTS[@]}"; do echo "  $r"; done
  echo "  - E2E: SKIP"
  exit 1
fi

# Step 3: E2E
echo ""
print_separator
echo "▶ [3/3] E2E 테스트"
print_separator

if [ "$SKIP_E2E" = true ]; then
  RESULTS+=("- E2E: SKIP (--skip-e2e)")
  echo "E2E 테스트 건너뜀 (--skip-e2e 옵션)"
elif [ -z "$PROJECT" ]; then
  RESULTS+=("- E2E: SKIP (--project 미지정)")
  echo "E2E 테스트 건너뜀 (--project 옵션을 지정해주세요)"
else
  E2E_OUTPUT=$(pnpm exec playwright test --project="${PROJECT}" --project="${PROJECT}-setup" 2>&1) || true

  if echo "$E2E_OUTPUT" | grep -q "failed"; then
    FAILED_TESTS=$(echo "$E2E_OUTPUT" | grep -E "^\s+\d+\) " | head -5)
    SUMMARY=$(echo "$E2E_OUTPUT" | grep -E "^\s+\d+ (passed|failed)" | tail -1)
    RESULTS+=("✗ E2E: FAIL — $SUMMARY")
    FAILED=true
    echo "$E2E_OUTPUT" | tail -20
  else
    SUMMARY=$(echo "$E2E_OUTPUT" | grep -E "^\s+\d+ passed" | tail -1)
    RESULTS+=("✓ E2E: PASS — $SUMMARY")
  fi
fi

# 최종 요약
echo ""
print_separator
echo "=== 검증 결과 ==="
print_separator
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""

if [ "$FAILED" = true ]; then
  echo "❌ 검증 실패"
  exit 1
else
  echo "✅ 모든 검증 통과"
  exit 0
fi
