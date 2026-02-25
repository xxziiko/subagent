---
name: review-format
description: 코드 리뷰 결과 출력 형식 정의. 모든 리뷰 에이전트/스킬에서 일관된 형식으로 피드백을 제공하기 위한 템플릿. 요약, 상세 이슈, 전반적 평가 섹션 포함.
---

# Review Output Format

리뷰 결과를 일관되게 출력하기 위한 형식입니다.

---

## 전체 구조

```markdown
## 📊 리뷰 요약

[통계 및 개요]

## 📁 변경 파일

[파일 목록]

## ✅ 좋은 변경사항

[긍정적 피드백]

## 🔴 Critical Issues

[반드시 수정 필요]

## 🟡 Warnings

[수정 권장]

## 🟢 Suggestions

[고려사항]

## 🎯 전반적 평가

[상태 및 액션 아이템]
```

---

## 섹션별 상세

### 📊 리뷰 요약

```markdown
## 📊 리뷰 요약

**리뷰 타입**: PR / Commit / Working Changes
**변경 파일**: N개
**추가/삭제**: +N, -N 줄

🔴 Critical: N개
🟡 Warnings: N개
🟢 Suggestions: N개
```

### 📁 변경 파일

```markdown
## 📁 변경 파일

1. `src/components/Order/OrderList.tsx` (+45, -12)
2. `src/hooks/useOrder.ts` (+8, -3)
3. `src/utils/format.ts` (+15, -0)
```

### 이슈 상세 형식

각 이슈는 다음 형식을 따릅니다:

```markdown
### [파일경로]:[라인번호]

**문제 코드:**
```tsx
const [data, setData] = useState([])
useEffect(() => {
  fetchData().then(setData)
}, []) // Missing dependency
```

**문제점:**
fetchData가 의존성 배열에 없어 stale closure 문제 발생 가능

**수정안:**
```tsx
const fetchDataCallback = useCallback(() => {
  return fetchData()
}, [/* 필요한 의존성 */])

useEffect(() => {
  fetchDataCallback().then(setData)
}, [fetchDataCallback])
```

**영향도:** 🟡 Medium - 특정 조건에서 버그 발생 가능
```

### ✅ 좋은 변경사항

긍정적 피드백도 구체적으로:

```markdown
## ✅ 좋은 변경사항

### src/components/Order/OrderList.tsx:45

```diff
- {items && <List items={items} />}
+ {items?.length > 0 && <List items={items} />}
```

✅ **개선점**: Optional chaining과 배열 길이 체크 추가
- undefined/null 안전하게 처리
- 빈 배열일 때 불필요한 렌더링 방지
- 프로젝트 패턴과 일치
```

### 🎯 전반적 평가

```markdown
## 🎯 전반적 평가

**상태**: ✅ APPROVED / ⚠️ NEEDS_CHANGES / 🔴 BLOCKING

**요약**: 전반적으로 좋은 구현입니다. 타입 안전성 이슈 1건만 수정하면 머지 가능합니다.

**액션 아이템**:
- [ ] useOrder.ts의 any 타입 수정
- [ ] 단위 테스트 추가 고려
```

---

## 상황별 간소화

### 이슈 없을 때

```markdown
## 📊 리뷰 요약

**변경 파일**: 3개 (+58, -12)

🔴 Critical: 0개
🟡 Warnings: 0개
🟢 Suggestions: 2개

## ✅ 좋은 변경사항

[구체적인 긍정 피드백]

## 🟢 Suggestions

[선택적 개선 제안]

## 🎯 전반적 평가

**상태**: ✅ APPROVED

LGTM! 깔끔한 구현입니다. 🚀
```

### 단일 파일 리뷰

```markdown
## 📊 OrderList.tsx 리뷰

**변경**: +45, -12 줄

### 발견 사항

🟡 **L23**: useMemo 고려 - 필터링 로직이 매 렌더마다 실행됨
🟢 **L45**: 좋은 개선 - optional chaining 적용

### 평가

**상태**: ⚠️ NEEDS_CHANGES

useMemo 적용 후 머지 권장.
```

---

## 톤 & 스타일

### 권장
- 구체적이고 실행 가능한 피드백
- 문제와 해결책 함께 제시
- 긍정적 피드백 포함
- 근거 제시 (왜 문제인지)

### 지양
- 모호한 비판 ("이건 좀...")
- 근거 없는 주장
- 과도하게 긴 설명
- 개인 취향 강요

### 예시

```markdown
# ❌ 나쁜 피드백
이 코드는 별로입니다. 고쳐주세요.

# ✅ 좋은 피드백
### src/hooks/useOrder.ts:23

**문제점:** `any` 타입 사용으로 타입 안전성이 저하됩니다.

**수정안:**
```typescript
interface OrderResponse {
  id: string;
  items: OrderItem[];
}
const data: OrderResponse = await fetchOrder();
```

**이유:** 타입 추론이 가능해져 IDE 자동완성과 컴파일 타임 에러 감지가 됩니다.
```
