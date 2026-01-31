---
name: react-performance
description: React/TypeScript performance optimization guidelines. Focuses on async patterns, bundle size, re-rendering, and rendering performance.
allowed-tools: Read, Grep, Glob, Edit, Write
model: inherit
---

# React Performance Optimization Skill

React 성능 최적화 가이드입니다.

**기반**: Vercel의 [react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)

---

## 목차

1. [비동기 처리 최적화](#1-비동기-처리-최적화-async) (CRITICAL)
2. [번들 사이즈 최적화](#2-번들-사이즈-최적화-bundle) (CRITICAL)
3. [리렌더링 최적화](#3-리렌더링-최적화-re-render) (HIGH)
4. [렌더링 성능](#4-렌더링-성능-rendering) (MEDIUM)
5. [클라이언트 데이터 페칭](#5-클라이언트-데이터-페칭-client) (MEDIUM-HIGH)
6. [JavaScript 성능](#6-javascript-성능-js) (LOW-MEDIUM)
7. [고급 패턴](#7-고급-패턴-advanced) (LOW)

---

## 1. 비동기 처리 최적화 (Async)

### 1.1 독립적인 비동기 작업은 병렬 처리 (CRITICAL)

**영향도**: CRITICAL (2-10배 성능 향상)

상호 의존성이 없는 비동기 작업은 `Promise.all()`을 사용하여 병렬로 실행합니다.

```typescript
// ❌ 나쁜 예: 순차 실행 (느림)
async function loadOrderPage(orderId: string) {
  const order = await fetchOrder(orderId);
  const customer = await fetchCustomer();
  const inventory = await fetchInventory();
  // 3번의 왕복 시간이 모두 더해짐
}

// ✅ 좋은 예: 병렬 실행 (빠름)
async function loadOrderPage(orderId: string) {
  const [order, customer, inventory] = await Promise.all([
    fetchOrder(orderId),
    fetchCustomer(),
    fetchInventory(),
  ]);
  // 가장 느린 요청 하나의 시간만 소요
}
```

**Apollo Client 예시**:

```typescript
// ❌ 나쁜 예
const { data: orderData } = useOrderQuery({ variables: { id } });
const { data: customerData } = useCustomerQuery(); // 순차 실행

// ✅ 좋은 예: 병렬 쿼리
const { data: orderData } = useOrderQuery({ variables: { id } });
const { data: customerData } = useCustomerQuery(); // 자동으로 병렬 실행

// 또는 수동 fetch 시
const [orderData, customerData] = await Promise.all([
  client.query({ query: ORDER_QUERY }),
  client.query({ query: CUSTOMER_QUERY }),
]);
```

---

### 1.2 await는 필요한 시점에만 (CRITICAL)

**영향도**: CRITICAL (불필요한 대기 시간 제거)

`await`는 실제로 값이 필요한 지점에만 배치합니다.

```typescript
// ❌ 나쁜 예: 불필요한 await
async function processOrder(orderId: string) {
  const order = await fetchOrder(orderId); // 바로 await

  if (!order) {
    return null; // order가 null이면 아래 코드 실행 안 됨
  }

  const inventory = await fetchInventory(order.productId);
  return { order, inventory };
}

// ✅ 좋은 예: 조건부 await
async function processOrder(orderId: string) {
  const orderPromise = fetchOrder(orderId); // Promise만 생성

  // 조건 확인 후 await
  const order = await orderPromise;
  if (!order) {
    return null;
  }

  const inventory = await fetchInventory(order.productId);
  return { order, inventory };
}

// ✅ 더 좋은 예: 분기 내에서만 await
async function processOrder(orderId: string) {
  const orderPromise = fetchOrder(orderId);

  // 다른 작업 먼저 수행
  const settings = getSettings();

  // 필요한 시점에 await
  const order = await orderPromise;
  if (!order) return null;

  return processOrderWithSettings(order, settings);
}
```

---

### 1.3 의존성 체인 최소화 (HIGH)

**영향도**: HIGH (순차 처리 최소화)

데이터 의존성을 분석하여 병렬 실행 가능한 작업을 식별합니다.

```typescript
// ❌ 나쁜 예: 불필요한 의존성 체인
async function loadOrderDetails(orderId: string) {
  const order = await fetchOrder(orderId);
  const customer = await fetchCustomer(order.customerId);
  const products = await fetchProducts(order.productIds);
  // 총 3단계 순차 실행
}

// ✅ 좋은 예: 의존성 최소화
async function loadOrderDetails(orderId: string) {
  const order = await fetchOrder(orderId);

  // customer와 products는 독립적 → 병렬 실행
  const [customer, products] = await Promise.all([
    fetchCustomer(order.customerId),
    fetchProducts(order.productIds),
  ]);

  return { order, customer, products };
}
```

---

### 1.4 Suspense Boundaries 활용 (MEDIUM)

**영향도**: MEDIUM (UX 개선, 병렬 렌더링)

Suspense를 활용하여 독립적인 컴포넌트가 병렬로 로드되도록 합니다.

```tsx
// ❌ 나쁜 예: 단일 Suspense로 모든 것을 감쌈
export function OrderPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderHeader />
      <OrderDetails />
      <OrderHistory />
    </Suspense>
  );
  // Header가 느리면 Details와 History도 대기
}

// ✅ 좋은 예: 독립적인 Suspense Boundaries
export function OrderPage() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <OrderHeader />
      </Suspense>

      <Suspense fallback={<DetailsSkeleton />}>
        <OrderDetails />
      </Suspense>

      <Suspense fallback={<HistorySkeleton />}>
        <OrderHistory />
      </Suspense>
    </div>
  );
  // 각 컴포넌트가 독립적으로 로드됨
}
```

---

## 2. 번들 사이즈 최적화 (Bundle)

### 2.1 Barrel Import 회피 (CRITICAL)

**영향도**: CRITICAL (200-800ms 초기 로딩 시간 단축, 빌드 28% 개선)

Barrel 파일(`index.ts`)에서 import하지 말고 직접 소스 파일에서 import합니다.

```typescript
// ❌ 나쁜 예: Barrel import (1,500+ 모듈 로드)
import { Button, TextField, Dialog } from '@mui/material';
import { Check, X, Menu } from 'lucide-react';

// ✅ 좋은 예: 직접 import (필요한 것만 로드)
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Menu from 'lucide-react/dist/esm/icons/menu';
```

**Vite 최적화**:

Vite 설정에서 특정 패키지를 pre-bundle하도록 설정:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      '@mui/material/Button',
      '@mui/material/TextField',
      // 자주 사용되는 컴포넌트만 명시
    ],
  },
});
```

**프로젝트 내부 barrel exports**:

프로젝트 내부에서는 barrel exports를 사용해도 괜찮습니다 (Vite가 최적화). 단, 외부 라이브러리에서는 직접 import를 사용하세요.

---

### 2.2 조건부 모듈 로딩 (HIGH)

**영향도**: HIGH (초기 번들 사이즈 감소)

특정 조건에서만 필요한 모듈은 동적으로 import합니다.

```typescript
// ❌ 나쁜 예: 항상 import
import { exportToExcel } from '@/utils/excel';

export function OrderList({ orders }: Props) {
  const handleExport = () => {
    exportToExcel(orders); // 대부분의 사용자는 export 안 함
  };

  return <Button onClick={handleExport}>Export</Button>;
}

// ✅ 좋은 예: 동적 import
export function OrderList({ orders }: Props) {
  const handleExport = async () => {
    // Export 버튼 클릭 시에만 모듈 로드
    const { exportToExcel } = await import('@/utils/excel');
    exportToExcel(orders);
  };

  return <Button onClick={handleExport}>Export</Button>;
}
```

---

### 2.3 Dynamic Import로 코드 스플리팅 (HIGH)

**영향도**: HIGH (초기 로딩 시간 단축)

라우트별, 기능별로 코드를 분리합니다.

```typescript
// ❌ 나쁜 예: 모든 페이지를 한 번에 import
import OrderPage from './pages/OrderPage';
import CustomerPage from './pages/CustomerPage';
import InventoryPage from './pages/InventoryPage';

// ✅ 좋은 예: React.lazy로 dynamic import
const OrderPage = lazy(() => import('./pages/OrderPage'));
const CustomerPage = lazy(() => import('./pages/CustomerPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/orders" element={<OrderPage />} />
        <Route path="/customers" element={<CustomerPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
      </Routes>
    </Suspense>
  );
}
```

---

### 2.4 Third-party 라이브러리 지연 로딩 (MEDIUM)

**영향도**: MEDIUM (초기 번들 감소)

큰 third-party 라이브러리는 필요한 시점에 로드합니다.

```typescript
// ❌ 나쁜 예: date-fns 전체 import
import { format, parse, isValid } from 'date-fns';

export function OrderCard({ order }: Props) {
  const formattedDate = format(order.createdAt, 'yyyy-MM-dd');
  return <div>{formattedDate}</div>;
}

// ✅ 좋은 예: 개별 함수만 import
import format from 'date-fns/format';

export function OrderCard({ order }: Props) {
  const formattedDate = format(order.createdAt, 'yyyy-MM-dd');
  return <div>{formattedDate}</div>;
}

// ✅ 더 좋은 예: 동적 import (자주 사용 안 하는 경우)
export function OrderCard({ order }: Props) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    import('date-fns/format').then(({ default: format }) => {
      setFormattedDate(format(order.createdAt, 'yyyy-MM-dd'));
    });
  }, [order.createdAt]);

  return <div>{formattedDate}</div>;
}
```

---

## 3. 리렌더링 최적화 (Re-render)

### 3.1 memo로 불필요한 리렌더링 방지 (HIGH)

**영향도**: HIGH (리렌더링 횟수 감소)

비싼 컴포넌트는 `memo`로 감싸고, 조건부 렌더링 시 early return을 활용합니다.

```tsx
// ❌ 나쁜 예: useMemo 사용 (여전히 컴포넌트는 렌더링됨)
export function Profile({ user, isLoading }: Props) {
  const avatar = useMemo(() => generateAvatar(user), [user]);

  if (isLoading) {
    return <Skeleton />;
  }

  return <img src={avatar} />;
  // isLoading이 true여도 useMemo는 실행됨
}

// ✅ 좋은 예: 별도 컴포넌트 + memo
const UserAvatar = memo(function UserAvatar({ user }: { user: User }) {
  const avatar = generateAvatar(user);
  return <img src={avatar} />;
});

export function Profile({ user, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton />;
  }

  return <UserAvatar user={user} />;
  // isLoading이 true면 UserAvatar 자체가 렌더링 안 됨
}
```

---

### 3.2 의존성 배열 최소화 (HIGH)

**영향도**: HIGH (불필요한 effect 실행 방지)

useEffect, useMemo, useCallback의 의존성 배열을 최소화합니다.

```typescript
// ❌ 나쁜 예: 너무 많은 의존성
function useOrderFilter(orders: Order[], filters: Filters, settings: Settings) {
  const filtered = useMemo(() => {
    return orders.filter(order => {
      return order.status === filters.status; // settings는 사용 안 함
    });
  }, [orders, filters, settings]); // settings 변경 시에도 재계산

  return filtered;
}

// ✅ 좋은 예: 필요한 의존성만
function useOrderFilter(orders: Order[], filters: Filters) {
  const filtered = useMemo(() => {
    return orders.filter(order => {
      return order.status === filters.status;
    });
  }, [orders, filters.status]); // filters.status만 의존

  return filtered;
}
```

---

### 3.3 파생 상태는 계산으로 (MEDIUM)

**영향도**: MEDIUM (상태 동기화 문제 방지)

파생 상태는 별도 state로 관리하지 말고 계산으로 처리합니다.

```typescript
// ❌ 나쁜 예: 파생 상태를 별도 state로
export function OrderList({ orders }: Props) {
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setFilteredOrders(orders.filter(o => o.status === filter));
  }, [orders, filter]); // 동기화 필요

  return <div>{filteredOrders.map(...)}</div>;
}

// ✅ 좋은 예: 계산으로 처리
export function OrderList({ orders }: Props) {
  const [filter, setFilter] = useState('');

  // 파생 상태는 계산
  const filteredOrders = useMemo(
    () => orders.filter(o => o.status === filter),
    [orders, filter]
  );

  return <div>{filteredOrders.map(...)}</div>;
}
```

---

### 3.4 Functional setState 사용 (MEDIUM)

**영향도**: MEDIUM (의존성 감소, 안전한 상태 업데이트)

이전 상태 기반 업데이트는 functional form을 사용합니다.

```typescript
// ❌ 나쁜 예: 의존성 증가
function useCounter(initialValue: number) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(count + 1);
  }, [count]); // count가 바뀔 때마다 재생성

  return { count, increment };
}

// ✅ 좋은 예: functional setState
function useCounter(initialValue: number) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(prev => prev + 1); // count 의존성 제거
  }, []); // 한 번만 생성

  return { count, increment };
}
```

---

### 3.5 Lazy Initial State (LOW-MEDIUM)

**영향도**: LOW-MEDIUM (초기 렌더링 성능)

비싼 초기값 계산은 함수로 전달합니다.

```typescript
// ❌ 나쁜 예: 매 렌더링마다 계산
function OrderForm() {
  const [formData, setFormData] = useState(getInitialFormData()); // 매번 실행

  return <form>...</form>;
}

// ✅ 좋은 예: lazy initialization
function OrderForm() {
  const [formData, setFormData] = useState(() => getInitialFormData()); // 첫 렌더링에만

  return <form>...</form>;
}

// ✅ localStorage 예시
function usePersistedState(key: string) {
  const [state, setState] = useState(() => {
    // 첫 렌더링에만 localStorage 읽기
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  });

  return [state, setState];
}
```

---

### 3.6 읽기 작업 지연 (Defer Reads) (LOW)

**영향도**: LOW (리렌더링 전파 최소화)

상태 읽기를 가능한 늦게, 필요한 곳에서만 수행합니다.

```typescript
// ❌ 나쁜 예: 부모에서 읽어서 전달
function OrderPage() {
  const theme = useTheme(); // 테마 변경 시 OrderPage 리렌더링

  return (
    <div>
      <OrderHeader theme={theme} />
      <OrderList theme={theme} />
    </div>
  );
}

// ✅ 좋은 예: 자식에서 직접 읽기
function OrderPage() {
  return (
    <div>
      <OrderHeader />
      <OrderList />
    </div>
  );
}

function OrderHeader() {
  const theme = useTheme(); // 테마 변경 시 OrderHeader만 리렌더링
  return <header style={{ color: theme.textColor }}>...</header>;
}
```

**Recoil 예시**:

```typescript
// ❌ 나쁜 예: 부모에서 atom 읽기
function OrderPage() {
  const user = useRecoilValue(userAtom); // user 변경 시 전체 페이지 리렌더링

  return (
    <div>
      <UserAvatar userName={user.name} />
      <OrderList />
    </div>
  );
}

// ✅ 좋은 예: 필요한 컴포넌트에서만 읽기
function OrderPage() {
  return (
    <div>
      <UserAvatar />
      <OrderList />
    </div>
  );
}

function UserAvatar() {
  const user = useRecoilValue(userAtom); // user 변경 시 UserAvatar만 리렌더링
  return <Avatar name={user.name} />;
}
```

---

### 3.7 Transitions로 우선순위 조절 (LOW)

**영향도**: LOW (UX 개선)

급하지 않은 상태 업데이트는 `useTransition`으로 우선순위를 낮춥니다.

```tsx
// ❌ 나쁜 예: 모든 업데이트가 동등한 우선순위
function OrderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // 입력은 빨라야 함
    setResults(searchOrders(value)); // 검색은 느려도 됨 (하지만 입력을 블로킹)
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      <OrderList orders={results} />
    </div>
  );
}

// ✅ 좋은 예: transition으로 우선순위 분리
function OrderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // 높은 우선순위 (입력 반응성 유지)

    startTransition(() => {
      setResults(searchOrders(value)); // 낮은 우선순위 (입력을 블로킹 안 함)
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <OrderList orders={results} />
    </div>
  );
}
```

---

## 4. 렌더링 성능 (Rendering)

### 4.1 조건부 렌더링 최적화 (MEDIUM)

**영향도**: MEDIUM (불필요한 렌더링 방지)

조건이 자주 바뀌지 않으면 early return, 자주 바뀌면 삼항 연산자를 사용합니다.

```tsx
// ❌ 나쁜 예: 조건이 안 바뀌는데 삼항 연산자
export function OrderCard({ order }: Props) {
  return (
    <div>
      {order.status === 'CANCELLED' ? (
        <CancelledOrderView order={order} />
      ) : (
        <ActiveOrderView order={order} />
      )}
    </div>
  );
  // 두 컴포넌트가 완전히 다른데 계속 조건 체크
}

// ✅ 좋은 예: early return
export function OrderCard({ order }: Props) {
  if (order.status === 'CANCELLED') {
    return <CancelledOrderView order={order} />;
  }

  return <ActiveOrderView order={order} />;
}

// 또는 별도 컴포넌트로 분리
export function OrderCard({ order }: Props) {
  return order.status === 'CANCELLED'
    ? <CancelledOrderCard order={order} />
    : <ActiveOrderCard order={order} />;
}
```

---

### 4.2 JSX를 변수로 호이스팅 (LOW-MEDIUM)

**영향도**: LOW-MEDIUM (메모리 할당 감소)

정적 JSX는 컴포넌트 외부로 이동합니다.

```tsx
// ❌ 나쁜 예: 매 렌더링마다 JSX 생성
export function OrderList({ orders }: Props) {
  return (
    <div>
      <div className="header">
        <h1>주문 목록</h1>
        <p>총 {orders.length}개</p>
      </div>
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}

// ✅ 좋은 예: 정적 부분을 호이스팅
const OrderListHeader = (
  <div className="header">
    <h1>주문 목록</h1>
  </div>
);

export function OrderList({ orders }: Props) {
  return (
    <div>
      {OrderListHeader}
      <p>총 {orders.length}개</p>
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}

// 또는 컴포넌트로 분리
function OrderListHeader() {
  return (
    <div className="header">
      <h1>주문 목록</h1>
    </div>
  );
}
```

---

### 4.3 Content Visibility로 오프스크린 최적화 (LOW)

**영향도**: LOW (긴 리스트 성능)

긴 리스트의 오프스크린 항목은 CSS로 렌더링을 건너뜁니다.

```tsx
// ✅ CSS content-visibility 활용
export function OrderList({ orders }: Props) {
  return (
    <div className="order-list">
      {orders.map(order => (
        <div key={order.id} className="order-item">
          <OrderCard order={order} />
        </div>
      ))}
    </div>
  );
}

// CSS
// .order-item {
//   content-visibility: auto;
//   contain-intrinsic-size: 200px; /* 예상 높이 */
// }
```

**MUI DataGrid 예시**:

```tsx
// ✅ MUI DataGrid는 virtualization 내장
import { DataGrid } from '@mui/x-data-grid';

export function OrderTable({ orders }: Props) {
  return (
    <DataGrid
      rows={orders}
      columns={columns}
      // 자동으로 virtualization 적용
    />
  );
}
```

---

### 4.4 활동 기반 렌더링 제어 (LOW)

**영향도**: LOW (백그라운드 탭 최적화)

탭이 비활성화되면 polling이나 애니메이션을 중지합니다.

```typescript
// ✅ document visibility로 polling 제어
function useOrderPolling(orderId: string, interval = 5000) {
  const [order, setOrder] = useState<Order>();

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const poll = async () => {
      if (document.hidden) {
        // 탭이 비활성화면 polling 중지
        return;
      }

      const data = await fetchOrder(orderId);
      setOrder(data);
    };

    timerId = setInterval(poll, interval);
    return () => clearInterval(timerId);
  }, [orderId, interval]);

  return order;
}

// 또는 visibilitychange 이벤트 활용
function useVisibilityAwarePolling(callback: () => void, interval: number) {
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const startPolling = () => {
      timerId = setInterval(callback, interval);
    };

    const stopPolling = () => {
      clearInterval(timerId);
    };

    // 탭 활성화 시 시작
    if (!document.hidden) {
      startPolling();
    }

    // visibility 변경 시 처리
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback, interval]);
}
```

---

## 5. 클라이언트 데이터 페칭 (Client)

### 5.1 Apollo Client 자동 중복 제거 활용 (HIGH)

**영향도**: HIGH (불필요한 네트워크 요청 제거)

Apollo Client는 기본적으로 같은 쿼리를 중복 제거합니다. `fetchPolicy`를 적절히 설정합니다.

```typescript
// ✅ 기본 동작: 자동 중복 제거
function OrderPage({ orderId }: Props) {
  // 같은 쿼리가 동시에 여러 번 호출되어도 한 번만 요청
  const { data: orderData } = useOrderQuery({
    variables: { id: orderId },
  });

  const { data: sameOrderData } = useOrderQuery({
    variables: { id: orderId },
    // Apollo가 자동으로 첫 번째 요청 결과 재사용
  });
}

// ✅ fetchPolicy 명시적 설정
const { data } = useOrderQuery({
  variables: { id: orderId },
  fetchPolicy: 'cache-first', // 캐시 우선 (기본값)
  // fetchPolicy: 'network-only', // 항상 네트워크 요청
  // fetchPolicy: 'cache-and-network', // 캐시 먼저, 백그라운드에서 네트워크
});
```

---

### 5.2 이벤트 리스너 정리 (MEDIUM)

**영향도**: MEDIUM (메모리 누수 방지)

이벤트 리스너는 항상 cleanup 함수로 제거합니다.

```typescript
// ❌ 나쁜 예: cleanup 없음
function useWindowResize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // cleanup 없음 → 메모리 누수
  }, []);

  return width;
}

// ✅ 좋은 예: cleanup 함수
function useWindowResize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize); // cleanup
    };
  }, []);

  return width;
}
```

---

### 5.3 Passive Event Listeners (LOW)

**영향도**: LOW (스크롤 성능)

스크롤이나 터치 이벤트는 passive 옵션을 사용합니다.

```typescript
// ✅ passive event listener
function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);

    // passive: true로 스크롤 성능 향상
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return scrollY;
}
```

---

## 6. JavaScript 성능 (JS)

### 6.1 함수 결과 캐싱 (MEDIUM)

**영향도**: MEDIUM (중복 계산 방지)

비싼 계산은 `useMemo`로 캐싱합니다.

```typescript
// ❌ 나쁜 예: 매 렌더링마다 계산
export function OrderSummary({ orders }: Props) {
  const total = orders.reduce((sum, o) => sum + o.price, 0); // 매번 계산
  const average = total / orders.length;

  return <div>Total: {total}, Average: {average}</div>;
}

// ✅ 좋은 예: useMemo로 캐싱
export function OrderSummary({ orders }: Props) {
  const { total, average } = useMemo(() => {
    const total = orders.reduce((sum, o) => sum + o.price, 0);
    return { total, average: total / orders.length };
  }, [orders]); // orders가 바뀔 때만 재계산

  return <div>Total: {total}, Average: {average}</div>;
}
```

---

### 6.2 프로퍼티 접근 캐싱 (LOW-MEDIUM)

**영향도**: LOW-MEDIUM (반복 접근 최적화)

반복문에서 자주 접근하는 프로퍼티는 변수에 캐싱합니다.

```typescript
// ❌ 나쁜 예: 매번 프로퍼티 접근
function processOrders(orders: Order[]) {
  const results = [];
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status === 'PENDING') { // orders[i] 반복 접근
      results.push(orders[i].id);
    }
  }
  return results;
}

// ✅ 좋은 예: 변수에 캐싱
function processOrders(orders: Order[]) {
  const results = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]; // 한 번만 접근
    if (order.status === 'PENDING') {
      results.push(order.id);
    }
  }
  return results;
}

// ✅ 더 좋은 예: 선언적 코드
function processOrders(orders: Order[]) {
  return orders
    .filter(order => order.status === 'PENDING')
    .map(order => order.id);
}
```

---

### 6.3 Early Exit 패턴 (LOW)

**영향도**: LOW (불필요한 계산 방지)

조건을 먼저 체크하여 불필요한 작업을 건너뜁니다.

```typescript
// ❌ 나쁜 예: 모든 계산 후 조건 체크
function getOrderDiscount(order: Order): number {
  const baseDiscount = calculateBaseDiscount(order);
  const loyaltyDiscount = calculateLoyaltyDiscount(order);
  const seasonalDiscount = calculateSeasonalDiscount(order);

  if (!order.isDiscountEligible) {
    return 0; // 계산은 이미 다 함
  }

  return baseDiscount + loyaltyDiscount + seasonalDiscount;
}

// ✅ 좋은 예: early exit
function getOrderDiscount(order: Order): number {
  if (!order.isDiscountEligible) {
    return 0; // 바로 리턴
  }

  const baseDiscount = calculateBaseDiscount(order);
  const loyaltyDiscount = calculateLoyaltyDiscount(order);
  const seasonalDiscount = calculateSeasonalDiscount(order);

  return baseDiscount + loyaltyDiscount + seasonalDiscount;
}
```

---

### 6.4 Set/Map 활용 (LOW-MEDIUM)

**영향도**: LOW-MEDIUM (조회 성능)

배열 대신 Set이나 Map을 사용하여 O(1) 조회를 달성합니다.

```typescript
// ❌ 나쁜 예: 배열 includes (O(n))
function filterOrders(orders: Order[], allowedIds: string[]) {
  return orders.filter(order =>
    allowedIds.includes(order.id) // O(n) 조회
  );
}

// ✅ 좋은 예: Set 사용 (O(1))
function filterOrders(orders: Order[], allowedIds: string[]) {
  const allowedSet = new Set(allowedIds);
  return orders.filter(order =>
    allowedSet.has(order.id) // O(1) 조회
  );
}

// ✅ Map 예시 (key-value)
function getOrdersByIds(orders: Order[], ids: string[]) {
  const orderMap = new Map(orders.map(o => [o.id, o]));
  return ids.map(id => orderMap.get(id)).filter(Boolean);
}
```

---

## 7. 고급 패턴 (Advanced)

### 7.1 Ref를 활용한 이벤트 핸들러 (LOW)

**영향도**: LOW (리렌더링 방지)

자주 바뀌는 함수를 ref로 저장하여 의존성을 제거합니다.

```typescript
// ❌ 나쁜 예: 의존성 증가
function useDebounce(callback: () => void, delay: number) {
  useEffect(() => {
    const timerId = setTimeout(callback, delay);
    return () => clearTimeout(timerId);
  }, [callback, delay]); // callback이 바뀔 때마다 effect 재실행
}

// ✅ 좋은 예: ref로 최신 callback 유지
function useDebounce(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);

  // 항상 최신 callback 유지
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      callbackRef.current(); // 항상 최신 callback 호출
    }, delay);

    return () => clearTimeout(timerId);
  }, [delay]); // callback 의존성 제거
}
```

---

### 7.2 useLatest Hook (LOW)

**영향도**: LOW (stale closure 방지)

최신 값을 항상 참조하는 커스텀 hook입니다.

```typescript
// ✅ useLatest 구현
function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

// ✅ 사용 예시
function useInterval(callback: () => void, delay: number) {
  const callbackRef = useLatest(callback);

  useEffect(() => {
    const timerId = setInterval(() => {
      callbackRef.current();
    }, delay);

    return () => clearInterval(timerId);
  }, [delay]); // callback 의존성 제거
}

// 사용
function OrderPolling() {
  const [count, setCount] = useState(0);

  useInterval(() => {
    console.log('Count:', count); // 항상 최신 count 값 참조
  }, 1000);

  return <div>Count: {count}</div>;
}
```

---

## 체크리스트

성능 최적화 코드 작성 시 확인:

### 비동기 처리
- [ ] 독립적인 비동기 작업을 `Promise.all()`로 병렬 처리했는가?
- [ ] `await`를 실제로 필요한 시점에만 사용했는가?
- [ ] 데이터 의존성을 최소화했는가?

### 번들 사이즈
- [ ] MUI, lucide-react 등 큰 라이브러리를 직접 import했는가?
- [ ] 조건부로 필요한 모듈을 동적 import했는가?
- [ ] 라우트별로 코드 스플리팅을 적용했는가?

### 리렌더링
- [ ] 비싼 컴포넌트를 `memo`로 감쌌는가?
- [ ] 의존성 배열을 최소화했는가?
- [ ] 파생 상태를 별도 state가 아닌 계산으로 처리했는가?
- [ ] 이전 상태 기반 업데이트에 functional setState를 사용했는가?

### 렌더링
- [ ] 조건부 렌더링을 적절히 최적화했는가?
- [ ] 정적 JSX를 호이스팅했는가?
- [ ] 긴 리스트에 virtualization을 적용했는가?

### 데이터 페칭
- [ ] Apollo Client의 캐시와 중복 제거를 활용했는가?
- [ ] 이벤트 리스너에 cleanup 함수를 추가했는가?

### JavaScript 성능
- [ ] 비싼 계산을 `useMemo`로 캐싱했는가?
- [ ] 반복문에서 프로퍼티 접근을 캐싱했는가?
- [ ] Early exit 패턴을 사용했는가?
- [ ] 배열 조회 대신 Set/Map을 사용했는가?

---

## 참고 자료

- **Vercel React Best Practices**: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- **React Docs - Performance**: https://react.dev/learn/render-and-commit

---

## 요약

**핵심 원칙**:

1. **비동기는 병렬로** - `Promise.all()` 적극 활용
2. **번들은 작게** - 직접 import, 동적 import, 코드 스플리팅
3. **리렌더링은 최소화** - memo, 의존성 관리, 파생 상태 계산
4. **렌더링은 효율적으로** - 조건부 렌더링, JSX 호이스팅, virtualization
5. **데이터 페칭은 캐싱** - 중복 제거, 캐시 전략
6. **계산은 캐싱** - useMemo, useCallback, 프로퍼티 접근 최소화

이 가이드를 따르면 **빠르고 효율적인 React 애플리케이션**을 개발할 수 있습니다!
