---
name: tanstack-query
description: TanStack Query(React Query) v5 기반 서버 상태 관리 스킬. Query Key 전략, useQuery/useMutation 커스텀 훅, 캐시 무효화, 낙관적 업데이트, 에러 핸들링, MSW 테스트 패턴 포함.
---

# TanStack Query — 서버 상태 관리 가이드

TanStack Query(구 React Query) v5 기반 **서버 상태 관리** 패턴과 컨벤션.

> **전역 클라이언트 상태**(UI 상태, 폼 상태 등)는 TanStack Query의 범위 밖입니다. Zustand, Jotai 등을 조합해 사용하세요.

---

## 핵심 개념

```
서버 상태 = 비동기 요청으로 가져오는 외부 데이터
                ↕
TanStack Query = 서버 상태의 캐시, 동기화, 업데이트 관리
```

| 훅 | 용도 |
|---|---|
| `useQuery` | 데이터 조회 (GET) |
| `useMutation` | 데이터 변경 (POST/PUT/PATCH/DELETE) |
| `useInfiniteQuery` | 무한 스크롤 / 페이지네이션 |
| `useSuspenseQuery` | React Suspense 통합 조회 |

---

## Query Key 전략

### Key 팩토리 패턴

```typescript
// src/queries/keys/orderKeys.ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
} as const;

// 사용 예
orderKeys.all          // ['orders']
orderKeys.lists()      // ['orders', 'list']
orderKeys.list({ status: 'pending' }) // ['orders', 'list', { status: 'pending' }]
orderKeys.detail('123')               // ['orders', 'detail', '123']
```

### Key 설계 원칙

- **계층 구조**: 상위 키 무효화로 하위 전체를 무효화 가능
- **직렬화 가능**: 객체/배열 형태로 구성, 함수/클래스 사용 금지
- **도메인별 분리**: `orderKeys`, `userKeys`, `productKeys` 등 파일 단위 관리

---

## useQuery 패턴

### 기본 커스텀 훅

```typescript
// src/queries/useOrderList.ts
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '@/api/orders';
import { orderKeys } from './keys/orderKeys';

interface UseOrderListParams {
  status?: OrderStatus;
  page?: number;
}

export function useOrderList(params: UseOrderListParams = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => fetchOrders(params),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 컴포넌트에서 사용
function OrderList() {
  const { data, isPending, isError, error } = useOrderList({ status: 'pending' });

  if (isPending) return <Spinner />;
  if (isError) return <ErrorMessage message={error.message} />;

  return <ul>{data.map(order => <OrderItem key={order.id} order={order} />)}</ul>;
}
```

### 조건부 실행

```typescript
export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(orderId!),
    queryFn: () => fetchOrder(orderId!),
    enabled: !!orderId, // orderId가 있을 때만 실행
  });
}
```

### Select로 데이터 변환

```typescript
export function useOrderSummary(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => fetchOrder(orderId),
    select: (data) => ({         // 원본 캐시는 유지, 구독 컴포넌트만 변환 데이터 수신
      id: data.id,
      total: data.items.reduce((sum, item) => sum + item.price, 0),
      itemCount: data.items.length,
    }),
  });
}
```

---

## useMutation 패턴

### 기본 뮤테이션 훅

```typescript
// src/queries/useConfirmOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmOrder } from '@/api/orders';
import { orderKeys } from './keys/orderKeys';

export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => confirmOrder(orderId),
    onSuccess: (_, orderId) => {
      // 관련 쿼리 무효화 → 자동 재조회
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
    onError: (error) => {
      console.error('주문확인 실패:', error.message);
    },
  });
}

// 컴포넌트에서 사용
function OrderActions({ orderId }: { orderId: string }) {
  const { mutate: confirmOrder, isPending } = useConfirmOrder();

  return (
    <button
      onClick={() => confirmOrder(orderId)}
      disabled={isPending}
    >
      {isPending ? '처리 중...' : '주문확인'}
    </button>
  );
}
```

### 낙관적 업데이트 (Optimistic Update)

```typescript
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),

    onMutate: async ({ orderId, status }) => {
      // 진행 중인 재조회 취소 (낙관적 업데이트 덮어쓰기 방지)
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(orderId) });

      // 현재 캐시 스냅샷 저장
      const previous = queryClient.getQueryData(orderKeys.detail(orderId));

      // 낙관적으로 캐시 업데이트
      queryClient.setQueryData(orderKeys.detail(orderId), (old: Order) => ({
        ...old,
        status,
      }));

      return { previous };
    },

    onError: (_err, { orderId }, context) => {
      // 실패 시 스냅샷으로 롤백
      if (context?.previous) {
        queryClient.setQueryData(orderKeys.detail(orderId), context.previous);
      }
    },

    onSettled: (_data, _err, { orderId }) => {
      // 성공/실패 모두 서버 상태로 동기화
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}
```

---

## 캐시 관리

### invalidateQueries

```typescript
const queryClient = useQueryClient();

// 특정 키 무효화 (정확히 일치)
queryClient.invalidateQueries({ queryKey: orderKeys.detail('123'), exact: true });

// 계층 하위 전체 무효화 (lists + list({...}))
queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

// 도메인 전체 무효화
queryClient.invalidateQueries({ queryKey: orderKeys.all });
```

### setQueryData (수동 업데이트)

```typescript
// 단건 업데이트
queryClient.setQueryData(orderKeys.detail('123'), (old: Order) => ({
  ...old,
  status: 'confirmed',
}));

// 목록 내 특정 항목 업데이트
queryClient.setQueryData(orderKeys.lists(), (old: Order[]) =>
  old.map(order => order.id === '123' ? { ...order, status: 'confirmed' } : order)
);
```

### prefetchQuery

```typescript
// 호버/포커스 시 미리 데이터 로드
async function prefetchOrderDetail(orderId: string) {
  await queryClient.prefetchQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => fetchOrder(orderId),
    staleTime: 1000 * 10, // 10초간 유효
  });
}
```

---

## QueryClient 설정

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // 1분 (기본 캐시 신선도)
      gcTime: 1000 * 60 * 10,   // 10분 (비활성 캐시 보관)
      retry: 1,                  // 실패 시 1회 재시도
      refetchOnWindowFocus: false, // 탭 전환 시 재조회 비활성화
    },
    mutations: {
      retry: 0,                  // 뮤테이션은 재시도 없음
    },
  },
});

// src/main.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

---

## 에러 핸들링

### 쿼리 레벨

```typescript
const { data, error, isError } = useQuery({
  queryKey: orderKeys.lists(),
  queryFn: fetchOrders,
  throwOnError: false,  // 기본값: false (Error Boundary로 전파 안 함)
});

if (isError) {
  // 로컬에서 에러 처리
  return <ErrorState message={error.message} onRetry={() => refetch()} />;
}
```

### Error Boundary 통합

```typescript
// throwOnError: true 또는 함수로 조건부 전파
const { data } = useQuery({
  queryKey: orderKeys.lists(),
  queryFn: fetchOrders,
  throwOnError: (error) => error.status >= 500, // 500 이상만 Boundary로
});

// ErrorBoundary 컴포넌트로 감싸기
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary onReset={reset} fallbackRender={ErrorFallback}>
      <OrderList />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

### 전역 에러 핸들러

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login');
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(`요청에 실패했습니다: ${error.message}`);
    },
  }),
});
```

---

## 무한 스크롤 / 페이지네이션

```typescript
// src/queries/useOrderListInfinite.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useOrderListInfinite(filters: OrderFilters) {
  return useInfiniteQuery({
    queryKey: [...orderKeys.lists(), 'infinite', filters],
    queryFn: ({ pageParam }) => fetchOrders({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap(page => page.orders), // 평탄화
  });
}

// 컴포넌트에서 사용
function InfiniteOrderList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrderListInfinite({ status: 'pending' });

  return (
    <>
      <ul>{data?.map(order => <OrderItem key={order.id} order={order} />)}</ul>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          더 보기
        </button>
      )}
    </>
  );
}
```

---

## TypeScript 통합

### 쿼리 응답 타입

```typescript
// API 응답 타입 정의
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// 함수 타입 명시
async function fetchOrder(orderId: string): Promise<Order> {
  const res = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
  return res.data.data;
}

// useQuery 타입 자동 추론
const { data } = useQuery({
  queryKey: orderKeys.detail(orderId),
  queryFn: () => fetchOrder(orderId), // data: Order | undefined
});
```

### useMutation 타입

```typescript
const mutation = useMutation<
  Order,          // TData: 성공 응답
  ApiError,       // TError: 에러 타입
  { orderId: string; status: OrderStatus }  // TVariables: 입력
>({
  mutationFn: ({ orderId, status }) => updateOrderStatus(orderId, status),
});
```

---

## 테스트 패턴 (Vitest + MSW)

### QueryClient 래퍼

```typescript
// src/test-utils/renderWithQuery.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithQuery(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  return { ...render(ui, { wrapper: Wrapper }), queryClient };
}
```

### 커스텀 훅 테스트

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/__mocks__/server';
import { http, HttpResponse } from 'msw';
import { useOrderList } from '../useOrderList';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useOrderList', () => {
  test('주문 목록을 반환한다', async () => {
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json([{ id: '1', status: 'pending' }])
      )
    );

    const { result } = renderHook(() => useOrderList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  test('에러 응답 시 isError가 true가 된다', async () => {
    server.use(
      http.get('/api/orders', () => HttpResponse.json({ message: '서버 오류' }, { status: 500 }))
    );

    const { result } = renderHook(() => useOrderList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### 뮤테이션 테스트

```typescript
test('주문확인 뮤테이션 후 목록 쿼리가 무효화된다', async () => {
  const user = userEvent.setup();

  server.use(
    http.post('/api/orders/:id/confirm', () => HttpResponse.json({ success: true })),
    http.get('/api/orders', () => HttpResponse.json([]))
  );

  const { queryClient } = renderWithQuery(<OrderActions orderId="1" />);
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  await user.click(screen.getByRole('button', { name: '주문확인' }));

  await waitFor(() => {
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
```

---

## 디렉토리 구조

```
src/
├── queries/
│   ├── keys/
│   │   ├── orderKeys.ts
│   │   └── userKeys.ts
│   ├── useOrderList.ts
│   ├── useOrderDetail.ts
│   ├── useConfirmOrder.ts
│   └── index.ts           # 공개 API re-export
├── api/
│   ├── orders.ts          # fetch 함수 (queryFn 분리)
│   └── client.ts          # axios/fetch 인스턴스
└── lib/
    └── queryClient.ts     # QueryClient 설정
```

---

## Compliance Checklist

| Severity | 항목 |
|---|---|
| **MUST** | Query Key는 Key 팩토리 패턴으로 관리 |
| **MUST** | fetch 함수(`queryFn`)는 `api/` 디렉토리로 분리 |
| **MUST** | 낙관적 업데이트 시 `onMutate`에서 스냅샷 저장 후 `onError`에서 롤백 |
| **MUST** | 뮤테이션 성공 후 관련 쿼리 `invalidateQueries` 호출 |
| **SHOULD** | 도메인별 커스텀 훅으로 캡슐화 (컴포넌트에서 `queryFn` 직접 사용 지양) |
| **SHOULD** | `staleTime` / `gcTime` 명시적 설정 (기본값 의존 금지) |
| **SHOULD** | 테스트에서 `retry: false` 설정으로 재시도 비활성화 |
| **MAY** | `useSuspenseQuery`로 로딩/에러 분기 제거 |
| **MAY** | `ReactQueryDevtools` 개발 환경에서 활성화 |
