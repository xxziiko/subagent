---
name: react-patterns
description: React 컴포넌트 및 훅 패턴 리뷰 스킬. .tsx, .jsx 파일 리뷰 시 자동 적용. 컴포넌트 구조, 훅 사용법, 렌더링 최적화, 상태 관리 패턴 검토.
---

# React Patterns Review

React 컴포넌트와 훅의 패턴을 검토합니다.

---

## 검토 영역

### 1. 컴포넌트 구조

```typescript
// ✅ 올바른 패턴
export function OrderList({ orders }: OrderListProps) {
  return (...)
}

// ❌ 피해야 할 패턴
const OrderList = () => { ... }  // 함수 표현식
export default function OrderList() { ... }  // default export (페이지 아님)
```

**체크포인트:**
- [ ] 일반 컴포넌트는 `export function`
- [ ] 페이지만 `export default`
- [ ] JSX 반환하는 함수는 컴포넌트로 분리
- [ ] Props는 컴포넌트 관심사만 포함

### 2. 훅 사용법

#### useState
```typescript
// ✅ 올바른 패턴
const [orders, setOrders] = useState<Order[]>([]);

// ❌ 피해야 할 패턴
const [data, setData] = useState([]);  // any 추론
const [state, setState] = useState({ a: 1, b: 2, c: 3 });  // 관련 없는 상태 묶음
```

#### useEffect
```typescript
// ✅ 올바른 패턴
useEffect(() => {
  fetchOrders().then(setOrders);
}, [fetchOrders]);  // 의존성 명시

// ❌ 피해야 할 패턴
useEffect(() => {
  fetchOrders().then(setOrders);
}, []);  // 빈 의존성 - stale closure 위험

useEffect(() => {
  // 여러 관심사 혼합
  fetchOrders();
  trackPageView();
  initializeAnalytics();
}, []);
```

#### useMemo / useCallback
```typescript
// ✅ 필요한 경우에만 사용
const filteredOrders = useMemo(
  () => orders.filter(o => o.status === status),
  [orders, status]
);

const handleSubmit = useCallback((data: FormData) => {
  submitOrder(data);
}, [submitOrder]);

// ❌ 과도한 사용
const name = useMemo(() => user.name, [user.name]);  // 단순 접근은 불필요
```

### 3. 커스텀 훅 패턴

```typescript
// ✅ 관심사별 분리
function useOrderData(orderId: string) {
  const { data, loading, error } = useQuery(GET_ORDER, {
    variables: { id: orderId }
  });
  return { order: data?.order, loading, error };
}

function useOrderOperations() {
  const [createOrder] = useMutation(CREATE_ORDER);
  const [updateOrder] = useMutation(UPDATE_ORDER);
  return { createOrder, updateOrder };
}

// ❌ 과도한 책임
function useOrder(orderId: string) {
  // 데이터 조회 + 뮤테이션 + 폼 상태 + 유효성 검사 + ...
}
```

### 4. 조건부 렌더링

```typescript
// ✅ 명확한 패턴
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <OrderList orders={data.orders} />}

// ✅ 크게 다른 UI는 분리
return isAdmin ? <AdminView /> : <UserView />;

// ❌ 복잡한 중첩
{condition1 
  ? (condition2 
      ? <ComponentA /> 
      : <ComponentB />)
  : (condition3 
      ? <ComponentC /> 
      : <ComponentD />)}
```

### 5. Props Drilling vs Context

```typescript
// ⚠️ Props drilling (depth 4+)
<Page user={user}>
  <Container user={user}>
    <List user={user}>
      <Item user={user} />  // 4단계 - Context 고려
    </List>
  </Container>
</Page>

// ✅ Context 사용
<UserProvider>
  <Page>
    <Container>
      <List>
        <Item />  // useUserContext() 사용
      </List>
    </Container>
  </Page>
</UserProvider>
```

---

## 흔한 문제 패턴

### 1. Stale Closure

```typescript
// 🔴 문제
useEffect(() => {
  const timer = setInterval(() => {
    setCount(count + 1);  // count는 항상 초기값
  }, 1000);
  return () => clearInterval(timer);
}, []);  // count 의존성 누락

// ✅ 해결
useEffect(() => {
  const timer = setInterval(() => {
    setCount(prev => prev + 1);  // 함수형 업데이트
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### 2. 불필요한 리렌더링

```typescript
// 🔴 문제 - 매 렌더마다 새 객체/배열
<ChildComponent 
  style={{ color: 'red' }}  // 새 객체
  items={items.filter(i => i.active)}  // 새 배열
/>

// ✅ 해결
const style = useMemo(() => ({ color: 'red' }), []);
const activeItems = useMemo(() => items.filter(i => i.active), [items]);
<ChildComponent style={style} items={activeItems} />
```

### 3. 컴포넌트 내부 함수 정의

```typescript
// 🔴 문제 - 렌더마다 새 함수
function OrderList({ orders }) {
  function renderItem(order) {  // 내부 함수로 JSX 반환
    return <div>{order.name}</div>;
  }
  return orders.map(renderItem);
}

// ✅ 해결 - 별도 컴포넌트
function OrderItem({ order }) {
  return <div>{order.name}</div>;
}

function OrderList({ orders }) {
  return orders.map(order => <OrderItem key={order.id} order={order} />);
}
```

---

## 리뷰 시 질문

1. **상태 위치가 적절한가?**
   - 필요한 최소 범위에서 관리되는가?
   - 파생 상태를 별도 state로 관리하고 있지 않은가?

2. **리렌더링 범위가 적절한가?**
   - 상태 변경 시 불필요하게 많은 컴포넌트가 리렌더링되지 않는가?
   - memo, useMemo, useCallback이 필요한 곳에 적용되었는가?

3. **훅 규칙을 따르는가?**
   - 조건문/반복문 내에서 훅 호출하지 않는가?
   - 의존성 배열이 완전한가?

4. **컴포넌트 책임이 명확한가?**
   - 하나의 명확한 목적을 가지는가?
   - Props가 컴포넌트 관심사만 포함하는가?
