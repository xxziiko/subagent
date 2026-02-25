---
name: typescript-strict
description: TypeScript 타입 안전성 리뷰 스킬. any 타입 사용, 타입 정의, 제네릭 활용, 타입 가드 등 검토. 모든 .ts, .tsx 파일에 적용.
---

# TypeScript Strict Review

TypeScript 타입 안전성을 검토합니다.

---

## 검토 영역

### 1. any 타입 감지

```typescript
// 🔴 Critical - 명시적 any
const data: any = response;
function process(input: any): any { ... }

// 🔴 Critical - 암시적 any
const items = [];  // any[] 추론
function handle(e) { ... }  // 파라미터 any

// ✅ 올바른 패턴
const data: Order = response;
const items: Order[] = [];
function handle(e: React.ChangeEvent<HTMLInputElement>) { ... }
```

**any 허용 예외 (매우 드묾):**
- 외부 라이브러리 타입 없음 → `unknown` + 타입 가드 권장
- 레거시 코드 점진적 마이그레이션 → TODO 주석 필수

### 2. 타입 정의

```typescript
// ✅ 명확한 인터페이스
interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

// ❌ 피해야 할 패턴
interface Order {
  id: any;
  data: object;  // 구체적이지 않음
  [key: string]: any;  // 인덱스 시그니처 any
}
```

### 3. 함수 시그니처

```typescript
// ✅ 명확한 반환 타입
function getOrder(id: string): Order | null { ... }
async function fetchOrders(): Promise<Order[]> { ... }

// ✅ 제네릭 활용
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

// ❌ 반환 타입 누락 (복잡한 함수에서)
function processOrder(order) {  // 파라미터 + 반환 타입 없음
  if (order.status === 'pending') {
    return { ...order, status: 'confirmed' };
  }
  return null;
}
```

### 4. 타입 가드

```typescript
// ✅ 커스텀 타입 가드
function isOrder(value: unknown): value is Order {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'items' in value
  );
}

// ✅ 타입 가드 활용
function processData(data: unknown) {
  if (isOrder(data)) {
    // data는 Order 타입으로 좁혀짐
    console.log(data.items);
  }
}

// ❌ 타입 단언 남용
const order = data as Order;  // 검증 없는 단언
const element = document.getElementById('app') as HTMLDivElement;  // null 체크 없음
```

### 5. Null/Undefined 처리

```typescript
// ✅ 명시적 처리
function getName(user: User | null): string {
  return user?.name ?? 'Unknown';
}

// ✅ 타입 좁히기
function processOrder(order: Order | undefined) {
  if (!order) {
    throw new Error('Order is required');
  }
  // order는 Order 타입으로 좁혀짐
  return order.items;
}

// ❌ Non-null assertion 남용
const name = user!.name;  // 런타임 에러 위험
const element = document.getElementById('app')!;
```

### 6. 유니온 타입 & Discriminated Unions

```typescript
// ✅ Discriminated Union
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult(result: Result<Order>) {
  if (result.success) {
    // result.data 접근 가능
    console.log(result.data.id);
  } else {
    // result.error 접근 가능
    console.error(result.error);
  }
}

// ✅ 상태 유니온
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

---

## 흔한 문제 패턴

### 1. 타입 단언 vs 타입 가드

```typescript
// 🔴 문제 - 타입 단언
const order = response.data as Order;  // 검증 없음

// ✅ 해결 - 타입 가드
const data = response.data;
if (isOrder(data)) {
  const order = data;  // 안전한 타입
}
```

### 2. 이벤트 핸들러 타입

```typescript
// 🔴 문제
const handleChange = (e) => {  // any
  setValue(e.target.value);
};

// ✅ 해결
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// 또는 인라인
<input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)} />
```

### 3. API 응답 타입

```typescript
// 🔴 문제
const response = await fetch('/api/orders');
const data = await response.json();  // any

// ✅ 해결 - 타입 정의
interface OrdersResponse {
  orders: Order[];
  total: number;
}

const response = await fetch('/api/orders');
const data: OrdersResponse = await response.json();

// ✅ 더 안전한 패턴 - 런타임 검증
const data = await response.json();
if (!isOrdersResponse(data)) {
  throw new Error('Invalid response');
}
```

### 4. 제네릭 컴포넌트

```typescript
// ✅ 제네릭 리스트 컴포넌트
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// 사용
<List 
  items={orders} 
  renderItem={order => <span>{order.name}</span>}
  keyExtractor={order => order.id}
/>
```

---

## 리뷰 시 질문

1. **any 타입이 있는가?**
   - 명시적 any는 정말 불가피한가?
   - unknown + 타입 가드로 대체 가능한가?

2. **타입 단언(as)을 사용하는가?**
   - 런타임 검증이 선행되었는가?
   - 타입 가드로 대체 가능한가?

3. **null/undefined가 적절히 처리되는가?**
   - Non-null assertion(!) 사용 이유가 명확한가?
   - Optional chaining(?.)과 nullish coalescing(??)을 활용하는가?

4. **함수 시그니처가 명확한가?**
   - 반환 타입이 명시되어 있는가? (복잡한 함수)
   - 파라미터 타입이 완전한가?
