---
name: performance-review
description: React/TypeScript 성능 리뷰 스킬. 렌더링 최적화, 번들 사이즈, 메모리 누수, 비동기 처리 등 검토. 리스트, 대량 데이터, 복잡한 컴포넌트 관련 코드에 적용.
---

# Performance Review

React 애플리케이션 성능을 검토합니다.

---

## 검토 영역

### 1. 렌더링 최적화

#### 불필요한 리렌더링

```typescript
// 🔴 문제 - 매 렌더마다 새 참조
function ParentComponent() {
  const config = { theme: 'dark' };  // 매번 새 객체
  const handleClick = () => console.log('clicked');  // 매번 새 함수
  
  return <ChildComponent config={config} onClick={handleClick} />;
}

// ✅ 해결
function ParentComponent() {
  const config = useMemo(() => ({ theme: 'dark' }), []);
  const handleClick = useCallback(() => console.log('clicked'), []);
  
  return <ChildComponent config={config} onClick={handleClick} />;
}
```

#### memo 활용

```typescript
// ✅ 비용이 큰 컴포넌트에 memo
const ExpensiveList = memo(function ExpensiveList({ items }: Props) {
  return items.map(item => <ComplexItem key={item.id} item={item} />);
});

// ⚠️ memo가 불필요한 경우
// - Props가 항상 변경되는 경우
// - 렌더링 비용이 낮은 경우
// - 부모가 자주 리렌더링되지 않는 경우
```

#### 상태 위치 최적화

```typescript
// 🔴 문제 - 상태가 너무 상위에
function App() {
  const [searchTerm, setSearchTerm] = useState('');  // App 전체 리렌더링
  return (
    <Header />
    <Sidebar />
    <SearchInput value={searchTerm} onChange={setSearchTerm} />
    <ResultList term={searchTerm} />
  );
}

// ✅ 해결 - 상태를 필요한 곳으로
function App() {
  return (
    <Header />
    <Sidebar />
    <SearchSection />  // 상태를 내부로 이동
  );
}

function SearchSection() {
  const [searchTerm, setSearchTerm] = useState('');
  return (
    <>
      <SearchInput value={searchTerm} onChange={setSearchTerm} />
      <ResultList term={searchTerm} />
    </>
  );
}
```

### 2. 의존성 배열 최적화

```typescript
// 🔴 문제 - 객체/배열 의존성
useEffect(() => {
  fetchData(options);
}, [options]);  // options가 매 렌더마다 새 참조면 무한 루프

// ✅ 해결 - 원시값 또는 안정된 참조
useEffect(() => {
  fetchData({ page, limit });
}, [page, limit]);  // 원시값 의존

// 또는
const stableOptions = useMemo(() => ({ page, limit }), [page, limit]);
useEffect(() => {
  fetchData(stableOptions);
}, [stableOptions]);
```

### 3. 리스트 성능

#### 가상화 (Virtualization)

```typescript
// 🔴 문제 - 대량 리스트 전체 렌더링
function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {orders.map(order => <OrderRow key={order.id} order={order} />)}
    </div>
  );
}

// ✅ 해결 - 가상화 적용 (100개 이상)
import { FixedSizeList } from 'react-window';

function OrderList({ orders }: { orders: Order[] }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <OrderRow order={orders[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={orders.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

#### Key 최적화

```typescript
// 🔴 문제 - index를 key로
{items.map((item, index) => <Item key={index} item={item} />)}

// ✅ 해결 - 고유 ID 사용
{items.map(item => <Item key={item.id} item={item} />)}
```

### 4. 번들 사이즈

#### 직접 Import

```typescript
// 🔴 문제 - 전체 라이브러리 import
import { Button, TextField, Dialog } from '@mui/material';
import _ from 'lodash';

// ✅ 해결 - 직접 import
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import debounce from 'lodash/debounce';
```

#### 동적 Import

```typescript
// 🔴 문제 - 초기 로드에 모든 컴포넌트
import HeavyEditor from './HeavyEditor';

// ✅ 해결 - 필요시 로드
const HeavyEditor = lazy(() => import('./HeavyEditor'));

function EditorPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyEditor />
    </Suspense>
  );
}
```

### 5. 비동기 처리

#### 병렬 실행

```typescript
// 🔴 문제 - 순차 실행 (느림)
const orders = await fetchOrders();
const users = await fetchUsers();
const products = await fetchProducts();

// ✅ 해결 - 병렬 실행
const [orders, users, products] = await Promise.all([
  fetchOrders(),
  fetchUsers(),
  fetchProducts(),
]);
```

#### 디바운싱/쓰로틀링

```typescript
// 🔴 문제 - 매 입력마다 API 호출
const handleSearch = (term: string) => {
  searchAPI(term);
};

// ✅ 해결 - 디바운싱
const debouncedSearch = useMemo(
  () => debounce((term: string) => searchAPI(term), 300),
  []
);

useEffect(() => {
  return () => debouncedSearch.cancel();
}, [debouncedSearch]);
```

### 6. 메모리 누수

#### useEffect 클린업

```typescript
// 🔴 문제 - 클린업 없음
useEffect(() => {
  const subscription = someObservable.subscribe(handler);
  // 구독 해제 안 함
}, []);

// ✅ 해결
useEffect(() => {
  const subscription = someObservable.subscribe(handler);
  return () => subscription.unsubscribe();
}, []);
```

#### 타이머/인터벌

```typescript
// 🔴 문제 - 클린업 없음
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  // 클린업 없음
}, []);

// ✅ 해결
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

---

## 성능 리뷰 체크리스트

### 렌더링
- [ ] 불필요한 리렌더링이 없는가?
- [ ] 비용이 큰 계산에 useMemo 적용했는가?
- [ ] 콜백에 useCallback 적용했는가? (자식에게 전달 시)
- [ ] 상태가 필요한 최소 범위에 있는가?

### 리스트
- [ ] 100개 이상 아이템에 가상화 적용했는가?
- [ ] 적절한 key를 사용하는가? (index 아닌 고유 ID)
- [ ] 리스트 아이템이 memo로 감싸져 있는가?

### 번들 사이즈
- [ ] 직접 import를 사용하는가?
- [ ] 필요시 동적 import를 사용하는가?
- [ ] 불필요한 의존성이 추가되지 않았는가?

### 비동기
- [ ] 독립적인 요청을 병렬로 실행하는가?
- [ ] 검색/입력에 디바운싱 적용했는가?
- [ ] 스크롤 이벤트에 쓰로틀링 적용했는가?

### 메모리
- [ ] useEffect에 클린업 함수가 있는가?
- [ ] 구독/타이머/이벤트 리스너가 정리되는가?
- [ ] AbortController로 요청을 취소하는가?

---

## 성능 이슈 리포트 형식

```markdown
### 🟡 [PERFORMANCE] 불필요한 리렌더링

**파일**: src/components/OrderList.tsx:23
**유형**: Rendering Optimization

**문제 코드:**
```tsx
function OrderList({ orders }) {
  const handleClick = () => selectOrder(order.id);
  return orders.map(order => 
    <OrderRow key={order.id} onClick={handleClick} />
  );
}
```

**영향**: OrderList 리렌더링 시 모든 OrderRow도 리렌더링

**수정안:**
```tsx
function OrderList({ orders }) {
  const handleClick = useCallback((id: string) => {
    selectOrder(id);
  }, []);
  
  return orders.map(order => 
    <MemoizedOrderRow 
      key={order.id} 
      order={order}
      onClick={handleClick} 
    />
  );
}

const MemoizedOrderRow = memo(OrderRow);
```

**영향도**: 🟡 Medium - orders가 많을수록 성능 저하
```
