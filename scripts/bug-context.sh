#!/bin/bash
# bug-context.sh - 에러 발생 파일의 컨텍스트를 한번에 수집
# 사용법: scripts/bug-context.sh <file-path> [--depth=N]
#
# 옵션:
#   --depth=<N>  git log 조회 깊이 (기본값: 5)
#
# 예시:
#   scripts/bug-context.sh apps/shop/src/features/payment/PaymentForm.tsx
#   scripts/bug-context.sh apps/admin/src/pages/Orders.tsx --depth=10

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE_ROOT"

# 인자 파싱
FILE_PATH=""
DEPTH=5

for arg in "$@"; do
  case $arg in
    --depth=*)
      DEPTH="${arg#*=}"
      ;;
    -*)
      echo "알 수 없는 옵션: $arg"
      exit 1
      ;;
    *)
      FILE_PATH="$arg"
      ;;
  esac
done

if [ -z "$FILE_PATH" ]; then
  echo "사용법: scripts/bug-context.sh <file-path> [--depth=N]"
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "파일을 찾을 수 없습니다: $FILE_PATH"
  exit 1
fi

print_section() {
  echo ""
  echo "━━━ $1 ━━━"
}

echo "=== $FILE_PATH ==="

# 1. 최근 변경 이력
print_section "최근 변경 (최근 ${DEPTH}개 커밋)"

GIT_LOG=$(git log --oneline --format="%h %ar %s" -"$DEPTH" -- "$FILE_PATH" 2>/dev/null || true)
if [ -n "$GIT_LOG" ]; then
  echo "$GIT_LOG"
else
  echo "(변경 이력 없음)"
fi

# 2. 최근 변경된 라인 (blame에서 최근 커밋만)
print_section "최근 수정된 라인 (7일 이내)"

RECENT_BLAME=$(git blame --since="7.days" "$FILE_PATH" 2>/dev/null | grep -v "^\^" | head -10 || true)
if [ -n "$RECENT_BLAME" ]; then
  echo "$RECENT_BLAME"
else
  echo "(7일 이내 변경 없음)"
fi

# 3. 의존성 - 이 파일이 import하는 로컬 모듈
print_section "의존성 (이 파일이 사용하는 로컬 모듈)"

IMPORTS=$(grep -E "^import .+ from ['\"](\.|@/|~/)" "$FILE_PATH" 2>/dev/null | sed "s/.*from ['\"]//;s/['\"].*//" | sort -u || true)
if [ -n "$IMPORTS" ]; then
  echo "$IMPORTS"
else
  echo "(로컬 import 없음)"
fi

# 4. 역의존성 - 이 파일을 import하는 곳
print_section "역의존성 (이 파일을 사용하는 곳)"

# 파일명에서 확장자 제거, index 제거하여 import 패턴 생성
BASENAME=$(basename "$FILE_PATH" | sed 's/\.\(tsx\?\|jsx\?\|ts\)$//')
DIRNAME=$(dirname "$FILE_PATH")

# 파일명과 디렉토리 경로로 검색
REVERSE_DEPS=$(grep -rl --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -E "(from ['\"].*${BASENAME}['\"]|from ['\"].*${BASENAME}/)" \
  apps/ packages/ 2>/dev/null | grep -v "$FILE_PATH" | sort -u | head -15 || true)

if [ -n "$REVERSE_DEPS" ]; then
  echo "$REVERSE_DEPS"
else
  echo "(이 파일을 import하는 곳 없음)"
fi

# 5. 관련 테스트 파일
print_section "관련 테스트 파일"

TEST_PATTERNS=(
  "${FILE_PATH%.tsx}.test.tsx"
  "${FILE_PATH%.tsx}.spec.tsx"
  "${FILE_PATH%.ts}.test.ts"
  "${FILE_PATH%.ts}.spec.ts"
)

# __tests__ 디렉토리도 확인
TESTS_DIR="$(dirname "$FILE_PATH")/__tests__"
BASENAME_NO_EXT=$(basename "$FILE_PATH" | sed 's/\.\(tsx\?\|ts\)$//')

FOUND_TESTS=false
for pattern in "${TEST_PATTERNS[@]}"; do
  if [ -f "$pattern" ]; then
    echo "✓ $pattern"
    FOUND_TESTS=true
  fi
done

if [ -d "$TESTS_DIR" ]; then
  for f in "$TESTS_DIR"/*"$BASENAME_NO_EXT"*; do
    if [ -f "$f" ]; then
      echo "✓ $f"
      FOUND_TESTS=true
    fi
  done
fi

# E2E 테스트에서 관련 파일 검색
E2E_TESTS=$(grep -rl --include="*.spec.ts" "$BASENAME_NO_EXT" e2e/ tests/ 2>/dev/null | head -5 || true)
if [ -n "$E2E_TESTS" ]; then
  echo "$E2E_TESTS" | while read -r t; do echo "✓ $t (E2E)"; done
  FOUND_TESTS=true
fi

if [ "$FOUND_TESTS" = false ]; then
  echo "✗ 관련 테스트 없음"
fi

# 6. 파일 크기 및 export 요약
print_section "파일 요약"

LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')
EXPORT_COUNT=$(grep -cE "^export " "$FILE_PATH" 2>/dev/null || echo "0")
echo "라인 수: ${LINE_COUNT}"
echo "export 수: ${EXPORT_COUNT}"

# 주요 export 목록
EXPORTS=$(grep -E "^export (default |const |function |type |interface )" "$FILE_PATH" 2>/dev/null | head -10 | sed 's/[{(].*//' || true)
if [ -n "$EXPORTS" ]; then
  echo ""
  echo "주요 export:"
  echo "$EXPORTS"
fi

echo ""
echo "━━━ 완료 ━━━"
