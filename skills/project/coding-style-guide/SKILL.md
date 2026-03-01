---
name: coding-style-guide
description: "컨벤션 적용", "코드 리뷰", "분석" 요청 시 사용. Coding style guide and conventions. Clean code principles, declarative naming, component patterns, function expressions, custom hooks abstraction, type safety, file organization, and frontend design principles.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Coding Style Guide

React/TypeScript 프로젝트의 코드 스타일 가이드.

> **예시 참조**: 코드 리뷰나 수정 시 관련 규칙의 예시가 필요하면 `examples/` 에서 **해당 파일만** 읽으세요. 전체를 읽지 마세요.
>
> | 파일 | 규칙 |
> |---|---|
> | `examples/naming.md` | 1, 2 — 클린 코드, 네이밍 |
> | `examples/component-patterns.md` | 3, 4, 5 — export, 함수 표현식, JSX 분리 |
> | `examples/props-and-hooks.md` | 6, 7 — Props 관심사, 커스텀 훅 |
> | `examples/type-safety.md` | 8 — any 지양, unknown, 제네릭 |
> | `examples/file-organization.md` | 9, 10, 11 — barrel 금지, 응집도, 500줄 |
> | `examples/context-api.md` | 13 — Props drilling → Context |
> | `examples/destructuring.md` | 14 — 구조분해 할당 |
> | `examples/readability-patterns.md` | 15 — magic number, IIFE, 조건식 명명 |
> | `examples/predictability-patterns.md` | 16, 17 — 반환 타입, side effect, 래퍼 네이밍 |
> | `examples/guidelines-reference.md` | 전체 — 4원칙 종합 레퍼런스 (상세) |

---

## 1. 클린 코드 원칙

- **가독성**: 코드는 읽기 쉬워야 함
- **단순성**: 복잡한 것보다 단순한 것을 선호
- **명확성**: 의도가 명확하게 드러나야 함
- **일관성**: 프로젝트 전체에서 일관된 스타일 유지

## 2. 선언적 네이밍

**무엇을 하는지(What)** 중심으로 작성. 의도를 드러내고, 구현은 숨기고, 반환 타입 힌트를 제공.

| 접두사 | 반환 타입 | 예시 |
|---|---|---|
| `is~`, `has~`, `should~`, `can~` | boolean | `isLoading`, `hasPermission` |
| `get~`, `fetch~` | 데이터 | `getUser`, `fetchOrders` |
| `calculate~`, `format~` | 가공값 | `calculateTotal`, `formatDate` |
| `handle~`, `on~` | void (이벤트) | `handleSubmit`, `onClick` |
| `create~`, `update~`, `delete~` | 동작 | `createOrder`, `updateOrder` |

## 3. 컴포넌트 Export 규칙 (필수)

- **일반 컴포넌트**: `export function ComponentName()` (Named Export)
- **페이지 컴포넌트만 예외**: `export default function PageName()`
- 이유: Named export → 리팩토링 추적, tree-shaking 최적화. 페이지 → 라우팅 호환성.

## 4. 유틸/헬퍼 함수는 `const` 함수 표현식

컴포넌트를 제외한 유틸리티/헬퍼 함수는 `const` 화살표 함수로 작성.
- 이유: 호이스팅 방지, 컴포넌트와 구분 명확

## 5. JSX를 함수로 만들지 말고 컴포넌트로

JSX를 반환하는 `renderXxx()` 패턴 금지. 별도 컴포넌트로 분리.
- 이유: React DevTools 추적, 재사용성, 테스트 용이

## 6. 컴포넌트 Props는 관심사만 (Single Responsibility)

- 컴포넌트가 실제로 사용하는 데이터만 Props로 전달
- 불필요한 의존성 제거, Props drilling 최소화

## 7. 비즈니스 로직은 커스텀 훅으로 추상화 (필수)

비즈니스 로직을 관심사별 커스텀 훅으로 분리:
- `useOrderData()` — 데이터 조회
- `useOrderForm()` — 폼 상태
- `useOrderOperations()` — CRUD 로직

## 8. `any` 타입 지양 (Type Safety)

- `any` 대신 명확한 타입 정의
- 불가피한 경우: `unknown` + 타입 가드, 또는 제네릭 사용

## 9. Re-export (Barrel Index) 금지

`index.ts`를 통한 barrel export 금지. 각 파일에서 직접 import.
- 이유: tree-shaking 최적화, 빌드 성능 개선, 명확한 의존성
- 참고: [react-performance](../react-performance/SKILL.md)의 "Re-export 지양" 섹션

## 10. 응집도를 위한 파일 분리 기준

- 재사용되지 않는 타입/상수/헬퍼는 같은 파일에 유지 (높은 응집도)
- 재사용되는 경우에만 별도 파일로 분리

## 11. 파일 라인 수 제한 (500줄)

500줄 이상 시 분리 고려. 전략: 컴포넌트 분리, 훅으로 로직 분리, 유틸 분리.

## 12. 낮은 결합도, 높은 응집도

- 컴포넌트가 필요한 것만 Props로 받고, 전역 상태 의존성 최소화
- 관련된 데이터와 함수를 같은 파일에 배치
- 기능/도메인별 디렉토리 구조 (`domains/user/`, `domains/order/`)

## 13. Props Depth 4 이상이면 Context API 또는 Composition

Props drilling이 4단계 이상 → Context API 또는 Component Composition으로 해결.
- **Context API**: Feature 단위 상태 공유
- **Composition**: 중간 컴포넌트 제거, 직접 조합

**상태 관리 계층**:
```
전역 상태 관리 (Recoil) → Context API (Feature 단위) → Props (컴포넌트 간) → Local State (내부)
```

## 14. 객체는 구조분해 할당

- Props, 객체/배열 값 추출, 함수 파라미터에 구조분해 할당 사용
- 깊은 중첩(3단계+)은 피하고 적절한 수준에서 사용

## 15. 가독성 패턴 (Readability)

- **Magic Number 금지**: 숫자 상수는 명명된 변수로 추출 (`ANIMATION_DELAY_MS = 300`)
- **복잡한 삼항 → IIFE**: 중첩 삼항은 IIFE나 if/else로 단순화
- **복잡한 조건식 명명**: `isSameCategory`, `isPriceInRange` 등 의미 변수로 추출
- **구현 세부사항 추상화**: 복잡한 로직은 별도 컴포넌트/HOC로 분리 (AuthGuard 패턴)
- **간단한 로직은 인라인**: 컨텍스트 스위칭 최소화 (policy 객체 등)

## 16. 예측 가능성 (Predictability)

- **일관된 반환 타입**: 유사한 함수는 동일한 타입 반환 (ValidationResult 패턴)
- **숨겨진 side effect 금지**: 함수는 이름이 시사하는 것만 수행 (SRP)
- **래퍼 함수는 구체적 이름**: `http` → `httpService.getWithAuth` (명확한 의도)

## 17. 조기 추상화 지양

- 유즈케이스가 분화될 가능성이 있으면 **중복 허용**
- 진짜 동일하고 계속 동일할 로직만 추상화
- 불확실하면 중복을 유지하는 것이 낫다
- 넓은 hook은 작고 집중된 hook으로 분리 (`useCardIdQueryParam`, `useDateRangeQueryParam`)

## 18. Form 응집도

요구사항에 맞게 필드 레벨/폼 레벨 선택:
- **필드 레벨**: 독립적 검증, 비동기 체크, 재사용 가능한 필드
- **폼 레벨**: 관련 필드들, 위저드 폼, 상호 의존적 검증 (Zod + zodResolver)

---

## Compliance Checklist

> **Severity 기준** (RFC 2119)
> - **MUST**: 필수. 위반 시 비승인. 코드 수정 전 반드시 해결.
> - **SHOULD**: 권장. 위반 시 경고. 합당한 사유가 있으면 예외 허용.
> - **MAY**: 선택. 참고 사항. 위반해도 승인에 영향 없음.

| Severity | 규칙 | 체크 항목 |
|---|---|---|
| **MUST** | 3 | 일반 컴포넌트가 `export function`으로 작성되었는가? |
| **MUST** | 7 | 비즈니스 로직이 커스텀 훅으로 분리되었는가? |
| **MUST** | 8 | `any` 타입이 사용되지 않았는가? (`unknown`/제네릭으로 대체) |
| **MUST** | 9 | barrel export(`index.ts` re-export)가 없는가? |
| **MUST** | 16 | 함수에 숨겨진 side effect가 없는가? (SRP) |
| **SHOULD** | 2 | 변수/함수명이 의도를 드러내고 반환 타입 힌트를 제공하는가? |
| **SHOULD** | 4 | 유틸/헬퍼 함수가 `const` 함수 표현식인가? |
| **SHOULD** | 5 | JSX를 반환하는 `renderXxx()` 함수가 없는가? |
| **SHOULD** | 6 | Props가 컴포넌트의 관심사만 포함하는가? |
| **SHOULD** | 11 | 파일이 500줄을 초과하지 않는가? |
| **SHOULD** | 14 | Props와 객체에 구조분해 할당을 사용하는가? |
| **SHOULD** | 15 | magic number가 명명된 상수로 추출되었는가? |
| **SHOULD** | 16 | 유사한 함수의 반환 타입이 일관적인가? |
| **SHOULD** | 17 | 조기 추상화 없이 적절한 중복을 허용했는가? |
| **MAY** | 1 | 코드가 가독성, 단순성, 명확성, 일관성을 충족하는가? |
| **MAY** | 10 | 재사용되지 않는 코드가 같은 파일에 유지되는가? |
| **MAY** | 12 | 낮은 결합도, 높은 응집도를 유지하는가? |
| **MAY** | 13 | Props depth 4+ 시 Context/Composition을 사용하는가? |
| **MAY** | 18 | Form이 요구사항에 맞는 응집도 수준인가? |

### 성공 기준

- **MUST 전체 통과**: 승인 가능
- **MUST 위반 1건 이상**: 비승인 — 해당 항목 수정 필수
- **SHOULD 위반**: 경고 표시 — 사유 없으면 수정 권장
- **MAY 위반**: 참고로 안내
