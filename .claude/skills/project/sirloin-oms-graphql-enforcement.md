---
name: sirloin-oms-graphql-enforcement
description: Sirloin OMS GraphQL 스타일 가이드 강화 체크리스트. 모든 GraphQL 관련 코드 작성 시 필수 검증 규칙.
---

# GraphQL Style Guide Enforcement Checklist

Sirloin OMS 프로젝트의 GraphQL 코딩 컨벤션을 엄격하게 준수하기 위한 **필수 검증 체크리스트**입니다.

> **주의**: 이 체크리스트는 `sirloin-oms-graphql.md` 스킬과 함께 작동합니다. 모든 GraphQL 관련 작업에서 이 체크리스트를 먼저 확인하세요.

---

## 🚨 Critical Rules (반드시 준수)

### 1. **커스텀 훅 분리 (필수)**

모든 `useQuery`, `useMutation` 호출은 **반드시 커스텀 훅으로 분리**해야 합니다.

❌ **금지된 패턴** - 컴포넌트에서 직접 호출:
```typescript
function MyComponent() {
  // ❌ 절대 금지
  const { data } = useQuery(GET_ORDERS);
  const [updateOrder] = useMutation(UPDATE_ORDER);

  return <div>{/* ... */}</div>;
}
```

✅ **필수 패턴** - 커스텀 훅 분리:
```typescript
// src/hooks/order/mutations/useUpdateOrderMutation.ts
import { useMutation, MutationHookOptions } from '@apollo/client';
import { Mutation } from '@graphql/__generated__/graphqlType';
import { UPDATE_ORDER } from '@graphql/query/orderQuery';

export function useUpdateOrderMutation(
  options?: MutationHookOptions<
    Pick<Mutation, 'updateOrder'>,
    UpdateOrderVariables
  >,
) {
  return useMutation<
    Pick<Mutation, 'updateOrder'>,
    UpdateOrderVariables
  >(UPDATE_ORDER, options);
}

// 컴포넌트에서 사용
function MyComponent() {
  const [updateOrder] = useUpdateOrderMutation({
    onCompleted: (data) => {
      // 처리...
    },
  });

  return <div>{/* ... */}</div>;
}
```

**검증 항목**:
- [ ] useQuery/useMutation이 컴포넌트에 직접 있는가? → 훅으로 분리하기
- [ ] 훅 파일명이 `use~~Query.ts` 또는 `use~~Mutation.ts` 형식인가?
- [ ] 훅이 `src/hooks/[domain]/queries/` 또는 `src/hooks/[domain]/mutations/` 디렉토리에 있는가?

---

### 2. **Pick<Query, '...'> / Pick<Mutation, '...'> 필수**

타입 정의 시 **반드시 `Pick`을 사용**하여 특정 필드만 선택해야 합니다.

❌ **금지된 패턴**:
```typescript
// ❌ 전체 Query 타입 사용
const { data } = useQuery<Query>(GET_ORDERS);

// ❌ 타입 지정 안 함
const { data } = useQuery(GET_ORDERS);

// ❌ 마치 Response 타입 같이 정의
const { data } = useQuery<GetOrdersResponse>(GET_ORDERS);
```

✅ **필수 패턴**:
```typescript
// ✅ Pick으로 필드 선택
const { data } = useQuery<Pick<Query, 'getOrders'>>(GET_ORDERS);

// ✅ 훅에서 Pick 적용
export function useGetOrdersQuery() {
  return useQuery<Pick<Query, 'getOrders'>>(GET_ORDERS);
}

// ✅ Mutation도 마찬가지
export function useUpdateOrderMutation() {
  return useMutation<
    Pick<Mutation, 'updateOrder'>,
    UpdateOrderVariables
  >(UPDATE_ORDER);
}
```

**검증 항목**:
- [ ] useQuery 타입이 `<Query>` 또는 `<Mutation>`가 아닌가?
- [ ] `Pick<Query, '...'>` 또는 `Pick<Mutation, '...'>` 형식인가?
- [ ] Variables 타입도 명시적으로 정의되어 있는가?

---

### 3. **WMS API는 `context: { targetApi: 'wms' }` 필수**

WMS 관련 쿼리/뮤테이션은 **반드시 WMS 타겟 지정**이 필요합니다.

❌ **금지된 패턴**:
```typescript
// ❌ WMS 훅에 context 없음
export function useSyncProductMutation() {
  return useMutation<Pick<Mutation, 'syncProduct'>>(SYNC_PRODUCT);
}
```

✅ **필수 패턴**:
```typescript
// ✅ WMS 타겟 지정
export function useSyncProductMutation(
  options?: MutationHookOptions<...>
) {
  return useMutation<Pick<Mutation, 'syncProduct'>>(
    SYNC_PRODUCT,
    {
      context: { targetApi: 'wms' }, // ← 필수
      ...options,
    }
  );
}
```

**검증 항목**:
- [ ] WMS 훅이 `@graphql/__generated__/wmsGraphqlType`에서 타입을 import하는가?
- [ ] `context: { targetApi: 'wms' }`가 설정되어 있는가?
- [ ] OMS 훅은 context를 생략했는가?

---

### 4. **fetchPolicy 명시 (권장 및 특수 경우)**

쿼리가 항상 최신 데이터가 필요하면 `fetchPolicy: 'no-cache'`를 명시하세요.

✅ **권장 패턴**:
```typescript
export function useGetOrdersLazyQuery() {
  return useLazyQuery<Pick<Query, 'getOrderIds'>>(GET_ORDER_IDS, {
    fetchPolicy: 'no-cache', // ← 항상 최신 데이터 조회
  });
}
```

**검증 항목**:
- [ ] 동기화/조회 관련 쿼리는 `fetchPolicy: 'no-cache'`가 있는가?
- [ ] 캐싱이 필요한 쿼리는 fetchPolicy를 생략했는가?

---

## 🔍 Type Safety Rules

### 5. **Variables 타입 명시**

모든 쿼리/뮤테이션은 Variables 타입을 명시해야 합니다.

❌ **금지**:
```typescript
// ❌ Variables 타입 누락
const { data } = useQuery<Pick<Query, 'getOrder'>>(GET_ORDER, {
  variables: { id: '123' }, // 타입 불명확
});
```

✅ **필수**:
```typescript
// ✅ Variables 타입 명시
type GetOrderVariables = { id: string };

export function useGetOrderQuery() {
  return useQuery<Pick<Query, 'getOrder'>, GetOrderVariables>(
    GET_ORDER
  );
}
```

**검증 항목**:
- [ ] 변수가 있는 쿼리/뮤테이션은 Variables 타입이 정의되어 있는가?
- [ ] 타입이 코드젠으로 생성되었거나 명시적으로 정의되었는가?

---

### 6. **Response 타입 - Pick 사용**

응답 데이터도 `Pick`으로 명시합니다.

❌ **금지**:
```typescript
// ❌ 수동 정의
interface GetOrderResponse {
  orderId: string;
  status: string;
}

export function useGetOrderQuery() {
  return useQuery<GetOrderResponse>(GET_ORDER);
}
```

✅ **필수**:
```typescript
// ✅ Pick 사용
export function useGetOrderQuery() {
  return useQuery<Pick<Query, 'getOrder'>>(GET_ORDER);
}
```

**검증 항목**:
- [ ] Response 타입을 수동으로 정의했는가? → Pick 사용하기
- [ ] `Pick<Query, '..'>` 또는 `Pick<Mutation, '...'>` 형식인가?

---

## ✨ Naming Rules

### 7. **훅 네이밍 규칙**

```
Query:    use + [Get/List] + [Entity] + Query
Mutation: use + [Create/Update/Delete/Sync] + [Entity] + Mutation

✅ 올바른 예시:
useGetOrdersQuery              // 단수: 단일 아이템
useGetOrderListQuery           // 리스트: 목록
useCreateOrderMutation
useUpdateOrderMutation
useDeleteOrderMutation
useSyncBusinessOrderMutation

❌ 잘못된 예시:
useOrders                      // Query 접미사 누락
useOrder                       // get 동작 동사 누락
useCreateOrder                 // Mutation 접미사 누락
useMutateCreateOrder           // 중복 접두사
```

**검증 항목**:
- [ ] 훅명이 `use`로 시작하는가?
- [ ] Query 훅은 `Query`로 끝나는가?
- [ ] Mutation 훅은 `Mutation`으로 끝나는가?
- [ ] 동작 동사 (get, create, update, delete, sync)가 포함되었는가?

---

## 📁 Directory Structure

### 8. **훅 디렉토리 위치**

```
src/hooks/
├── order/
│   ├── queries/
│   │   ├── useGetOrderIdsLazyQuery.ts
│   │   └── useOrdersQuery.ts
│   └── mutations/
│       ├── useSyncBusinessOrderSyncProductMutation.ts
│       └── useUpdateInvoiceNumbersMutation.ts
├── business/
│   ├── queries/
│   └── mutations/
└── wms/
    ├── queries/
    └── mutations/
```

**검증 항목**:
- [ ] 훅이 `src/hooks/[domain]/` 경로에 있는가?
- [ ] Query 훅은 `queries/` 폴더에 있는가?
- [ ] Mutation 훅은 `mutations/` 폴더에 있는가?

---

## 🔗 Import Paths

### 9. **Path Alias 사용**

❌ **금지**:
```typescript
// ❌ 상대 경로
import { SYNC_PRODUCT } from '../../../graphql/wmsQuery/orderQuery';
import type { SyncProductResponse } from '../../../../types/businessOrderSync';
```

✅ **필수**:
```typescript
// ✅ Path Alias
import { SYNC_PRODUCT } from '@graphql/wmsQuery/orderQuery';
import type { Mutation } from '@graphql/__generated__/wmsGraphqlType';
```

**검증 항목**:
- [ ] 모든 import이 `@graphql`, `@hooks`, `@types` 등의 alias를 사용하는가?
- [ ] 상대 경로(`../../../`)가 없는가?
- [ ] 타입을 `src/types/` 같은 커스텀 디렉토리에서 import하지 않는가?

---

## 🎯 Code Generation

### 10. **Codegen 타입 사용 필수**

❌ **금지** - 수동 정의:
```typescript
// ❌ 타입 파일 생성
// src/types/businessOrderSync.ts
export interface SyncBusinessOrderSyncProductResponse {
  success: boolean;
  // ...
}
```

✅ **필수** - Codegen 생성:
```typescript
// ✅ yarn codegen 실행 후 생성된 타입 사용
import type { Mutation } from '@graphql/__generated__/wmsGraphqlType';
// wmsGraphqlType.ts에서 자동 생성된 타입 사용
```

**검증 항목**:
- [ ] GraphQL 스키마/쿼리를 변경했는가? → `yarn codegen` 실행했는가?
- [ ] 타입을 수동으로 정의했는가? → codegen 생성 타입으로 변경하기
- [ ] `src/types/` 같은 커스텀 타입 디렉토리가 있는가? → 제거하고 codegen 사용

---

## 🛡️ Error Handling

### 11. **에러 핸들링 패턴**

✅ **권장 패턴** - onCompleted/onError 외부 주입:
```typescript
// ✅ 훅은 옵션만 받음
export function useUpdateOrderMutation(
  options?: MutationHookOptions<Pick<Mutation, 'updateOrder'>, Variables>
) {
  return useMutation<Pick<Mutation, 'updateOrder'>, Variables>(
    UPDATE_ORDER,
    options // 에러 핸들링은 컴포넌트에서 주입
  );
}

// ✅ 컴포넌트에서 처리
function OrderForm() {
  const [updateOrder] = useUpdateOrderMutation({
    onCompleted: (data) => {
      if (!data.updateOrder.isSucceed) {
        openAlert(data.updateOrder.resultMessage);
        return;
      }
      openAlert('주문이 업데이트되었습니다');
    },
    onError: (error) => {
      openAlert('업데이트 중 오류가 발생했습니다');
    },
  });
}
```

❌ **금지 패턴** - try/catch 남용:
```typescript
// ❌ Mutation 훅에서 try/catch 처리
try {
  const { data } = await updateOrder({
    variables: { input },
  });
  if (data.updateOrder.isSucceed) { /* ... */ }
} catch {
  // 처리...
}
```

**검증 항목**:
- [ ] 에러 핸들링이 컴포넌트에서 주입되는가?
- [ ] onCompleted에서 `isSucceed` 필드를 검증하는가?
- [ ] 훅 내부에 try/catch가 없는가?

---

## ✅ Pre-Commit Checklist

모든 GraphQL 관련 PR을 생성하기 전에 다음을 확인하세요:

```
GraphQL Query/Mutation 코드 변경
  [ ] yarn codegen 실행했는가?
  [ ] __generated__ 타입이 생성되었는가?

커스텀 훅 작성
  [ ] 새로운 useQuery/useMutation이 훅으로 분리되었는가?
  [ ] 훅명이 use~~Query/use~~Mutation 형식인가?
  [ ] 훅이 src/hooks/[domain]/[queries|mutations]/ 위치에 있는가?

타입 정의
  [ ] Pick<Query, '...'> 또는 Pick<Mutation, '...'>을 사용했는가?
  [ ] Variables 타입이 명시적으로 정의되었는가?

WMS 관련
  [ ] WMS 훅은 context: { targetApi: 'wms' }이 설정되었는가?
  [ ] wmsGraphqlType에서 타입을 import했는가?

Import 경로
  [ ] @graphql, @hooks, @types 등 path alias를 사용했는가?
  [ ] 상대 경로(../../../)가 없는가?

에러 핸들링
  [ ] onCompleted/onError가 외부에서 주입되는가?
  [ ] 훅 내부에 try/catch가 없는가?

타입 체크
  [ ] npx tsc --noEmit 통과했는가?
  [ ] yarn lint 통과했는가?
```

---

## 🔗 참고 자료

- 기본 가이드: `sirloin-oms-graphql.md`
- 프로젝트 구조: `sirloin-oms.md`
- 코딩 스타일: `coding-style-guide.md`

---

## 🚀 Quick Reference

```typescript
// ✅ 올바른 구조

// 1. 훅 작성 (src/hooks/order/mutations/useSyncProductMutation.ts)
import { MutationHookOptions, useMutation } from '@apollo/client';
import type { Mutation } from '@graphql/__generated__/wmsGraphqlType';
import { SYNC_PRODUCT } from '@graphql/wmsQuery/orderQuery';

export function useSyncProductMutation(
  options?: MutationHookOptions<
    Pick<Mutation, 'syncProduct'>,
    SyncProductVariables
  >,
) {
  return useMutation<Pick<Mutation, 'syncProduct'>, SyncProductVariables>(
    SYNC_PRODUCT,
    {
      context: { targetApi: 'wms' },
      ...options,
    }
  );
}

// 2. 컴포넌트에서 사용
import { useSyncProductMutation } from '@hooks/order/mutations/useSyncProductMutation';

function SyncButton() {
  const [syncProduct, { loading }] = useSyncProductMutation({
    onCompleted: (data) => {
      if (!data.syncProduct.success) {
        openAlert(data.syncProduct.message);
        return;
      }
      openAlert('동기화되었습니다');
    },
    onError: () => {
      openAlert('동기화 중 오류가 발생했습니다');
    },
  });

  return (
    <button onClick={() => syncProduct({ variables: { input: {} } })}>
      {loading ? '동기화 중...' : '동기화'}
    </button>
  );
}
```

이 체크리스트를 모든 GraphQL 관련 작업에 적용하세요!
