---
name: sirloin-oms
description: Sirloin OMS 프로젝트 특화 컨텍스트. 기술 스택, 도메인 지식, 비즈니스 로직, 프로젝트 구조 정보 제공. 모든 Sirloin OMS 관련 작업에 자동 참조.
---

# Sirloin OMS Project Context

Sirloin OMS 프로젝트 특화 컨텍스트입니다.

---

## 기술 스택

| 영역        | 기술                                           |
| ----------- | ---------------------------------------------- |
| UI          | React 18, TypeScript                           |
| 상태 관리   | URL 기반, Context API, Recoil (점진적 제거 중) |
| 폼 관리     | React Hook Form (Formik 지양, 추후 제거)       |
| 데이터 페칭 | Apollo Client (GraphQL)                        |
| 스타일링    | MUI (Material-UI), Emotion                     |
| 빌드        | Vite                                           |
| 검증        | Yup                                            |
| 라우팅      | React Router v6                                |
| 날짜/시간   | date-fns (moment 지양, 추후 제거)              |

**상태 관리 전환 중**:

- **기존**: Recoil로 전역 상태 관리
- **신규**: URL 기반 (useSearchParams) + Context API로 지역 상태 관리
- **목표**: Recoil 의존성 완전 제거, URL을 Single Source of Truth로 사용

**폼 관리 정책**:

- **권장**: React Hook Form (RHF) + Yup
- **지양**: Formik (추후 제거 예정)

**날짜/시간 라이브러리 정책**:

- **권장**: date-fns (경량, 트리 쉐이킹, 함수형, 불변성)
- **지양**: moment (무겁고 유지보수 모드, 추후 제거 예정)

---

## 프로젝트 구조

```
src/
├── pages/              # 페이지 컴포넌트 (도메인별)
│   ├── order/          # 주문 페이지
│   ├── wms/            # WMS 페이지
│   ├── business/       # B2B 페이지
│   ├── goods/          # 상품 페이지
│   └── admin/          # 관리자 페이지
├── components/         # UI 컴포넌트 (도메인별)
│   ├── order/          # 주문 관련
│   ├── wms/            # WMS 관련
│   ├── business/       # B2B 관련
│   ├── shared/         # 공유 컴포넌트
│   └── layout/         # 레이아웃
├── hooks/              # 커스텀 훅 (도메인별)
│   ├── order/          # 주문 관련 훅
│   ├── wms/            # WMS 관련 훅
│   ├── business/       # B2B 관련 훅
│   └── shared/         # 공유 훅
├── graphql/            # GraphQL 쿼리/뮤테이션
│   ├── query/          # OMS 쿼리 (주문, 비즈니스)
│   ├── wmsQuery/       # WMS 쿼리 (재고, 입고 등)
│   └── __generated__/  # Codegen 생성 타입
├── store/              # Recoil 상태 (점진적 제거 중)
│   ├── order/          # 주문 상태
│   ├── business/       # B2B 상태
│   └── auth/           # 인증 상태
├── utils/              # 유틸리티 함수 (도메인별)
│   ├── order/          # 주문 관련 유틸
│   ├── wms/            # WMS 관련 유틸
│   ├── business/       # B2B 관련 유틸
│   └── api/            # API 클라이언트
├── interfaces/         # TypeScript 인터페이스
│   ├── order/
│   ├── wms/
│   └── business/
├── contexts/           # Context API (Recoil 대체용)
├── config/             # 설정 파일
├── assets/             # 정적 파일 (이미지, 아이콘)
└── styles/             # 전역 스타일
```

---

## 도메인 지식

### 1. Order (주문 관리)

주문의 전체 라이프사이클을 관리하는 핵심 도메인입니다.

#### 주문 상태 흐름

```
신규주문 → 주문확인 → 주문확정 → 출고대기 → 피킹 → 선포장 → 출고완료
   ↓          ↓         ↓
주문보류   취소접수  취소완료
```

#### 주요 상태 설명

| 상태         | 코드                 | 설명                          |
| ------------ | -------------------- | ----------------------------- |
| 신규주문     | `OrderNew`           | 외부 채널에서 수집된 주문     |
| 주문확인     | `OrderConfirm`       | 주문 확인 완료, 매핑 가능     |
| 주문보류     | `OrderPending`       | 재고 부족, 문의 등으로 보류   |
| 주문확정     | `OrderLocked`        | 판매상품 매핑 완료, 변경 불가 |
| 송장취소     | `InvoiceCancel`      | 송장 발급 후 취소             |
| 3PL 출고대기 | `ThreePLShipWaiting` | 3PL 출고 대기                 |
| 출고대기     | `ShipWaiting`        | 자체 출고 대기                |
| 피킹         | `Picking`            | 피킹 작업 중                  |
| 선포장       | `PrePacking`         | 선포장 작업 중                |
| 출고완료     | `ShipComplete`       | 출고 완료                     |
| 취소접수     | `OrderCancel`        | 취소 요청 접수                |
| 취소완료     | `OrderCancelConfirm` | 취소 처리 완료                |

#### 주요 기능

- **주문 수집**: 외부 채널(커머스, 사방넷 등)에서 주문 수집
- **판매상품 매핑**: 주문 상품과 재고 판매상품 매핑
- **출고 처리**: 피킹, 선포장, 송장 발행, 출고 완료
- **주문 수정**: 배송지, 상품, 수량 수정
- **주문 취소**: 취소 접수 및 처리
- **Excel 다운로드**: 일반 배송, 판매상품, WMS 연동 등

#### 핵심 비즈니스 규칙

- **주문확정 이후 매핑 변경 불가**: 재고 확보 후 변경 시 재고 무결성 문제
- **수량 일관성**: 주문 수량 = 매핑된 판매상품 총 수량
- **배송지 필수**: 출고 전 배송지 정보 완전성 체크
- **송장 번호**: 출고 시 송장 번호 필수

---

### 2. WMS (창고 관리)

재고, 입고, 로케이션 등 창고 운영을 관리하는 도메인입니다.

#### 주요 하위 도메인

**판매상품 (Goods Items)**

- 실제 판매되는 상품 단위 (SKU)
- OMS 주문과 매핑되는 기준
- B2B/B2C 판매 채널 지원
- 구성: 재고아이템 조합 (1:N)

**재고아이템 (Stock Items)**

- 물리적 재고 단위 (LOT, 유통기한 관리)
- 로케이션별 수량 관리
- 입고/출고 이력 추적
- 재고 조회 및 이동

**입고 (Receipt)**

- 재고아이템 입고 처리
- 공급업체별 입고 관리
- 패키지 입고 (묶음 입고)
- 입고 취소 및 수정

**로케이션 (Location)**

- 창고 내 위치 관리
- 로케이션별 재고 할당
- 로케이션 이동 이력

**카테고리 (Category)**

- 상품 분류 체계 (대-중-소)
- 카테고리별 재고 조회

**공급업체 (Supplier)**

- 입고 공급업체 관리
- 공급업체별 입고 이력

#### 핵심 관계

```
판매상품 (Goods Item)
  └─ 1:N ─> 재고아이템 (Stock Item)
              └─ M:N ─> 로케이션 (Location)
                          └─ 수량 정보
```

#### 핵심 비즈니스 규칙

- **판매상품 = 재고아이템 조합**: 판매상품은 여러 재고아이템으로 구성
- **가용 재고 계산**: (총 재고 - 출고 예정 - 안전 재고)
- **LOT 선입선출 (FIFO)**: 유통기한 빠른 순으로 출고
- **로케이션 재고 정확성**: 물리적 위치와 시스템 일치 필수

---

### 3. Business (B2B)

기업 고객 대상 주문 및 상품 관리 도메인입니다.

#### 주요 기능

- **B2B 주문**: 기업 고객 전용 주문 관리
- **B2B 상품**: 기업 고객 전용 상품 카탈로그
- **새벽배송**: 새벽배송 가능 여부 관리
- **배송일별 주문**: 배송 희망일 기준 주문 조회
- **주문 통계**: 기업별, 기간별 주문 통계
- **프리셋**: 자주 주문하는 상품 묶음

#### B2C와의 차이점

- 기업 고객 전용 가격 및 할인
- 정기 배송 지원
- 배송 희망일 지정 (새벽배송 포함)
- 거래명세서 발행

---

### 4. Goods (상품 마스터)

상품 기준 정보를 관리하는 도메인입니다.

#### 주요 기능

- 상품 마스터 데이터 관리
- 상품 정보 동기화 (외부 시스템)
- 상품 카테고리 관리

---

### 5. Admin (관리자)

사용자 및 권한 관리 도메인입니다.

#### 주요 기능

- 사용자 계정 관리
- 권한 및 역할 관리
- 시스템 설정

---

## 코딩 컨벤션 요약

### 필수 규칙

```typescript
// ✅ 컴포넌트: export function
export function OrderList() { ... }

// ✅ 페이지만: export default
export default function OrderPage() { ... }

// ✅ 유틸: const 함수 표현식
export const formatPrice = (price: number): string => { ... }

// ✅ 데이터 조회 함수: get~ 접두사
const getTotalPrice = () => { ... }
const getNetAvailableQty = () => { ... }

// ❌ calculate~ 지양 (함수는 본질적으로 계산)
```

### GraphQL 규칙

**2개의 GraphQL 스키마**:

- **OMS 스키마**: 주문, 비즈니스(B2B) 도메인 (`src/graphql/query/`)
- **WMS 스키마**: 재고, 입고, 로케이션 등 (`src/graphql/wmsQuery/`)

```typescript
// ✅ 쿼리는 별도 파일로 분리
// src/graphql/query/orderQuery.ts (OMS)
export const GET_ORDERS = gql`
  query GetOrders($status: OrderStatus) {
    orders(status: $status) {
      id
      items { ... }
    }
  }
`;

// src/graphql/wmsQuery/stockQuery.ts (WMS)
export const GET_STOCK_ITEMS = gql`
  query GetStockItems($filter: StockItemFilter) {
    stockItems(filter: $filter) {
      id
      quantity
    }
  }
`;

// ✅ 변경 후 codegen 실행 필수
// yarn codegen

// ✅ 커스텀 훅으로 분리
// src/hooks/order/queries/useOrdersQuery.ts
export function useOrdersQuery(variables: GetOrdersVariables) {
  return useQuery<GetOrdersData, GetOrdersVariables>(GET_ORDERS, {
    variables,
    fetchPolicy: 'network-only',
  });
}
```

### 폼 규칙

```typescript
// ✅ React Hook Form + Yup (권장)
const schema = yup.object({
  email: yup.string().email('올바른 이메일을 입력하세요').required(),
});

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: yupResolver(schema),
});

// ❌ Formik 사용 지양 (추후 제거 예정)
// 새로운 폼 개발 시 React Hook Form 사용
```

---

## 흔한 실수

### 1. Codegen 누락

```bash
# .graphql 파일 수정 후 반드시 실행
yarn codegen
```

### 2. any 타입 사용

```typescript
// ❌ 피하기
const data: any = response;

// ✅ 타입 정의
const data: Order = response;
```

### 3. 직접 import 누락

```typescript
// ❌ 번들 사이즈 증가
import { Button } from '@mui/material';

// ✅ 직접 import
import Button from '@mui/material/Button';
```

### 4. Props drilling (4단계+)

```typescript
// ❌ 4단계 이상 drilling
// ✅ Context API 사용
```

---

## 리뷰 시 특별 주의

### 출고/주문 관련 코드

- 비즈니스 로직 정확성 확인
- 수량 계산 로직 검증
- 상태 전이 규칙 확인

### GraphQL 변경

- 스키마 변경은 백엔드 팀과 협의
- Fragment 사용으로 중복 최소화
- N+1 쿼리 주의

### Recoil 상태

- 전역으로 관리되어야 하는 상태가 아니라면 지양하기.
- context 로 지역화하기.
- Atom key 고유성 확인
- Selector는 파생 상태 계산에만 사용
- 최소 단위로 분리

---

## Git 워크플로우

```
main (프로덕션)
  └── develop (개발)
       ├── feature/<기능명>
       ├── fix/<수정명>
       └── release/<버전>
```

### 커밋 메시지

```
<type>(<scope>): <subject>

type: feat, fix, docs, style, refactor, perf, test, chore
```

---

## Three-Phase Workflow 적용 가이드

### Phase 1에서 항상 확인할 것

Sirloin OMS 코드베이스 탐색 시 반드시 확인:
- GraphQL query/mutation definition files (`.graphql`)
- Recoil atoms and selectors
- MUI component usage patterns
- Yup validation schemas
- Apollo Client cache policies

### Phase 2 계획 시 고려사항

구현 계획 수립 시 고려:
- GraphQL 타입 변경 시 `yarn codegen` 필요 여부
- Recoil atom 추가/변경의 영향 범위
- MUI 테마 일관성
- Form validation 전략 (field-level vs form-level)

### Phase 3 구현 시 체크

구현 중 확인:
- TypeScript strict mode compliance
- Apollo Client 에러 핸들링
- MUI sx prop 일관 사용
- Frontend Design Guidelines 준수
- 불필요한 re-render 방지

---

## Git Diff Review 추가 체크리스트

### GraphQL 변경 시

```bash
# .graphql 파일 변경 확인
git diff origin/develop...HEAD -- "*.graphql"

# codegen 실행 필요
# ⚠️ GraphQL changed - run: yarn codegen
```

### Recoil 상태 변경 시

```bash
# recoil atoms 변경 확인
git diff origin/develop...HEAD -- "**/recoil/**"

# atom key 고유성 확인
```

### MUI 컴포넌트

- sx prop 일관 사용
- 테마 값 사용 (하드코딩 금지)
- 컬러/스페이싱 하드코딩 금지

### Form Validation

- Yup 스키마 정의
- 에러 메시지 한국어
- 적절한 validation 규칙

---

## 프론트엔드 기술 스택 참고

- **React 18**: Hooks, Composition Pattern 활용
- **TypeScript**: Strict 모드, 명확한 타입 정의
- **Apollo Client**: GraphQL 데이터 페칭
- **React Hook Form**: 폼 요구사항에 맞게 field/form level 선택
- **Zod**: Form-level validation에 활용
- **Recoil**: 점진적 제거 중 → URL 기반 + Context API로 전환

### 성능 최적화 팁 (Apollo/Recoil/MUI)

**Apollo Client 최적화**:

```typescript
// Query batching (여러 쿼리를 하나의 요청으로)
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const link = new BatchHttpLink({ uri: '/graphql' });

// Fragment로 중복 필드 제거
const ORDER_FRAGMENT = gql`
  fragment OrderFields on Order {
    id
    status
    createdAt
    totalPrice
  }
`;
```

**Recoil 최적화**:

```typescript
// Selector로 파생 상태 관리
const pendingOrdersState = selector({
  key: 'pendingOrdersState',
  get: ({ get }) => {
    const orders = get(ordersState);
    return orders.filter(o => o.status === 'PENDING');
  },
});
```

**MUI 최적화**:

```typescript
// sx prop으로 동적 스타일 (memo-friendly)
// 직접 import로 번들 사이즈 감소
import Button from '@mui/material/Button';
```

---

## 관련 스킬 및 문서

**프로젝트 특화 스킬**:

- `sirloin-oms-graphql`: GraphQL 쿼리/뮤테이션 패턴, Apollo Client, 커스텀 훅, 멀티 스키마

**범용 스킬** (프로젝트에 적용):

- `frontend-design-guide`: 4가지 설계 원칙 (Readability, Predictability, Cohesion, Coupling)
- `react-performance`: React/TypeScript 성능 최적화
- `coding-style-guide`: 코드 스타일 및 컨벤션
- `three-phase-workflow`: 3단계 워크플로우 (탐색-계획-구현)
- `create-pr`: PR 생성 자동화

**문서**:

- `/CLAUDE.md`: 프로젝트 전체 가이드라인 및 개발 워크플로우
- `.claude/agents/code-reviewer.md`: 코드 리뷰 체크리스트
- `.claude/agents/bug-fixer.md`: 버그 디버깅 가이드
- `.claude/agents/business-logic-validator.md`: 비즈니스 로직 검증
