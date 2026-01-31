---
name: coding-style-guide
description: "컨벤션 적용", "코드 리뷰", "분석" 요청 시 사용. Coding style guide and conventions. Clean code principles, declarative naming, component patterns, function expressions, custom hooks abstraction, type safety, and file organization rules.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Coding Style Guide

React/TypeScript 프로젝트의 코드 스타일 가이드입니다. 모든 코드는 이 원칙을 따라 작성되어야 합니다.

---

## 1. 클린 코드 원칙 (Clean Code Principles)

모든 코드는 클린 코드 원칙을 기반으로 작성합니다.

### 핵심 원칙

- **가독성**: 코드는 읽기 쉬워야 함
- **단순성**: 복잡한 것보다 단순한 것을 선호
- **명확성**: 의도가 명확하게 드러나야 함
- **일관성**: 프로젝트 전체에서 일관된 스타일 유지

### 예시

```typescript
// ❌ 나쁜 예: 불명확한 코드
const d = new Date();
const y = d.getFullYear();

// ✅ 좋은 예: 명확한 코드
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
```

---

## 2. 선언적 네이밍 (Declarative Naming)

네이밍은 **무엇을 하는지(What)** 중심으로 작성하며, 다음 원칙을 따릅니다.

### 2.1 의도를 드러낸다

```typescript
// ❌ 나쁜 예
const data = fetchData();
const list = getItems();

// ✅ 좋은 예
const userProfile = fetchUserProfile();
const activeOrders = getActiveOrders();
```

### 2.2 구현은 숨긴다

구현 방식이 아닌 목적을 드러내는 이름을 사용합니다.

```typescript
// ❌ 나쁜 예: 구현 방식이 드러남
const filterArrayByStatus = (items: Item[]) => { ... };
const loopThroughOrders = () => { ... };

// ✅ 좋은 예: 의도만 드러남
const getActiveItems = (items: Item[]) => { ... };
const processOrders = () => { ... };
```

### 2.3 반환 타입에 대한 명확한 힌트 제공

함수명에서 반환 타입을 유추할 수 있어야 합니다.

```typescript
// ❌ 나쁜 예
const order = () => { ... };  // 무엇을 반환하는지 불명확

// ✅ 좋은 예
const getOrder = () => Order;           // Order 객체 반환
const isOrderValid = () => boolean;     // boolean 반환
const hasPermission = () => boolean;    // boolean 반환
const calculateTotal = () => number;    // number 반환
const formatOrderDate = () => string;   // string 반환
```

### 네이밍 패턴

**불리언 반환**:

- `is~`: 상태 확인 (`isLoading`, `isValid`)
- `has~`: 소유 확인 (`hasPermission`, `hasError`)
- `should~`: 조건 확인 (`shouldRefetch`, `shouldRender`)
- `can~`: 가능 여부 (`canEdit`, `canDelete`)

**데이터 반환**:

- `get~`: 데이터 조회 (`getUser`, `getOrderList`)
- `fetch~`: 비동기 데이터 가져오기 (`fetchOrders`)
- `calculate~`: 계산 (`calculateTotal`, `calculateDiscount`)
- `format~`: 포맷팅 (`formatDate`, `formatPrice`)

**동작 수행**:

- `handle~`: 이벤트 핸들러 (`handleSubmit`, `handleClick`)
- `on~`: 콜백 함수 (`onComplete`, `onError`)
- `create~`: 생성 (`createOrder`)
- `update~`: 수정 (`updateOrder`)
- `delete~`: 삭제 (`deleteOrder`)

---

## 3. 컴포넌트 Export 규칙 (필수)

### 일반 컴포넌트: `export function`

페이지를 제외한 모든 컴포넌트는 `export function` 형태로 작성합니다.

```typescript
// ❌ 나쁜 예: 함수 표현식
const OrderList = () => {
  return <div>...</div>;
};
export default OrderList;

// ❌ 나쁜 예: export default function
export default function OrderList() {
  return <div>...</div>;
}

// ✅ 좋은 예: export function (Named Export)
export function OrderList() {
  return <div>...</div>;
}

export function OrderCard() {
  return <div>...</div>;
}
```

### 페이지 컴포넌트: `export default`

페이지 컴포넌트만 `export default`로 작성합니다.

```typescript
// ✅ 페이지 컴포넌트 (src/pages/OrderPage.tsx)
export default function OrderPage() {
  return (
    <div>
      <OrderList />
    </div>
  );
}
```

**이유**:

- **일반 컴포넌트**: Named export로 일관성 유지, 리팩토링 시 추적 용이
- **페이지 컴포넌트**: 라우팅 시스템(React Router, Next.js 등)과의 호환성

---

## 4. 유틸/헬퍼 함수는 `const` 함수 표현식

컴포넌트를 제외한 유틸리티 함수, 헬퍼 함수는 `const` 함수 표현식으로 작성합니다.

```typescript
// ✅ 유틸 함수
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(price);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const calculateDiscount = (price: number, rate: number): number => {
  return price * (1 - rate);
};
```

**이유**:

- 함수의 스코프가 명확
- 호이스팅 방지로 예측 가능한 동작
- 컴포넌트와 구분 명확

---

## 5. JSX를 함수로 만들지 말고 컴포넌트로 (중요)

JSX를 반환하는 것은 별도의 컴포넌트로 분리합니다.

```typescript
// ❌ 나쁜 예: JSX를 반환하는 함수
export function OrderList() {
  const renderOrderItem = (order: Order) => (
    <div className="order-item">
      <h3>{order.title}</h3>
      <p>{order.price}</p>
    </div>
  );

  return <div>{orders.map(renderOrderItem)}</div>;
}

// ✅ 좋은 예: 별도 컴포넌트로 분리
function OrderItem({ order }: { order: Order }) {
  return (
    <div className="order-item">
      <h3>{order.title}</h3>
      <p>{order.price}</p>
    </div>
  );
}

export function OrderList() {
  return (
    <div>
      {orders.map((order) => (
        <OrderItem key={order.id} order={order} />
      ))}
    </div>
  );
}
```

**이유**:

- 컴포넌트로 만들면 React DevTools에서 추적 가능
- 재사용성 향상
- 테스트 용이

---

## 6. 컴포넌트 인터페이스는 관심사만 (Single Responsibility)

컴포넌트의 Props는 해당 컴포넌트의 관심사만 포함해야 합니다.

```typescript
// ❌ 나쁜 예: 너무 많은 관심사
interface OrderCardProps {
  order: Order;
  user: User; // OrderCard는 user 전체가 필요 없음
  permissions: Permission; // 권한 체크는 다른 곳에서
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  theme: Theme; // 테마는 컨텍스트에서
}

// ✅ 좋은 예: 필요한 것만
interface OrderCardProps {
  order: Order;
  onEdit: () => void;
  onDelete: () => void;
}

export function OrderCard({ order, onEdit, onDelete }: OrderCardProps) {
  return (
    <div>
      <h3>{order.title}</h3>
      <button onClick={onEdit}>편집</button>
      <button onClick={onDelete}>삭제</button>
    </div>
  );
}
```

**원칙**:

- 컴포넌트가 실제로 사용하는 데이터만 전달
- 불필요한 의존성 제거
- Props drilling 최소화

---

## 7. 비즈니스 로직은 커스텀 훅으로 추상화 (필수)

비즈니스 로직은 관심사별로 커스텀 훅으로 분리합니다.

```typescript
// ❌ 나쁜 예: 컴포넌트에 비즈니스 로직
export function OrderForm() {
  const [order, setOrder] = useState<Order>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: OrderInput) => {
    setLoading(true);
    try {
      const result = await createOrder(data);
      if (result.isSucceed) {
        toast.success('주문 생성 완료');
        router.push('/orders');
      }
    } catch (error) {
      toast.error('주문 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// ✅ 좋은 예: 커스텀 훅으로 분리
function useCreateOrder() {
  const [createOrder, { loading }] = useCreateOrderMutation({
    onCompleted: (data) => {
      if (data.createOrder.isSucceed) {
        toast.success('주문 생성 완료');
        router.push('/orders');
      }
    },
    onError: () => {
      toast.error('주문 생성 실패');
    },
  });

  return { createOrder, loading };
}

export function OrderForm() {
  const { createOrder, loading } = useCreateOrder();

  const handleSubmit = (data: OrderInput) => {
    createOrder({ variables: { input: data } });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**관심사 별 훅 분리 예시**:

```typescript
// 데이터 관련
function useOrderData(orderId: string) { ... }

// 폼 상태 관련
function useOrderForm() { ... }

// 권한 관련
function useOrderPermissions() { ... }

// 비즈니스 로직 관련
function useOrderOperations() {
  return {
    createOrder,
    updateOrder,
    deleteOrder,
  };
}
```

---

## 8. `any` 타입 지양 (Type Safety)

`any` 타입 사용을 최대한 피하고, 명확한 타입을 정의합니다.

```typescript
// ❌ 나쁜 예
const handleData = (data: any) => {
  console.log(data.name); // 타입 안정성 없음
};

const response: any = await fetchOrder();

// ✅ 좋은 예
interface Order {
  id: string;
  name: string;
  price: number;
}

const handleOrder = (order: Order) => {
  console.log(order.name); // 타입 안정성 보장
};

const response: Order = await fetchOrder();
```

**불가피한 경우**:

- 외부 라이브러리 타입이 없는 경우 → `unknown` 사용 후 타입 가드
- 동적 타입이 필요한 경우 → 제네릭 사용

```typescript
// unknown 사용 예시
const parseResponse = (data: unknown): Order => {
  if (isOrder(data)) {
    return data;
  }
  throw new Error('Invalid order data');
};

// 제네릭 사용 예시
const fetchData = <T>(url: string): Promise<T> => {
  return fetch(url).then((res) => res.json());
};
```

---

## 9. 배럴 Export 사용 (Barrel Exports)

폴더의 파일을 export할 때는 `index.ts`를 사용한 배럴 export 형식을 사용합니다.

```typescript
// src/components/order/index.ts
export { OrderList } from './OrderList';
export { OrderDetail } from './OrderDetail';
export { OrderForm } from './OrderForm';

// 사용처
import { OrderList, OrderDetail, OrderForm } from '@/components/order';
```

**폴더 구조 예시**:

```
src/
├── components/
│   ├── order/
│   │   ├── OrderList.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── OrderForm.tsx
│   │   └── index.ts  ← 배럴 export
│   └── index.ts
├── hooks/
│   ├── useOrder.ts
│   ├── useAuth.ts
│   └── index.ts  ← 배럴 export
└── utils/
    ├── format.ts
    ├── validation.ts
    └── index.ts  ← 배럴 export
```

**이유**:

- import 경로 간결화
- 폴더 내부 구조 변경 시 외부 코드 영향 최소화
- 명확한 public API

---

## 10. 응집도를 위한 파일 분리 기준

재사용의 여지가 없다면 한 파일 내부에서 분리하지 않습니다.

### 같은 파일에 유지하는 경우

```typescript
// OrderForm.tsx
interface OrderFormData {
  title: string;
  price: number;
}

const validateOrderForm = (data: OrderFormData): boolean => {
  return data.title.length > 0 && data.price > 0;
};

const DEFAULT_ORDER_FORM: OrderFormData = {
  title: '',
  price: 0,
};

export function OrderForm() {
  const [formData, setFormData] = useState(DEFAULT_ORDER_FORM);

  const handleSubmit = () => {
    if (!validateOrderForm(formData)) {
      return;
    }
    // ...
  };

  return <form>...</form>;
}
```

**이유**:

- `OrderFormData`, `validateOrderForm`, `DEFAULT_ORDER_FORM`은 `OrderForm`에서만 사용
- 높은 응집도 유지
- 관련 코드가 한 곳에 모여 있어 이해하기 쉬움

### 별도 파일로 분리하는 경우

재사용되는 경우에만 분리합니다.

```typescript
// utils/validation.ts
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 여러 컴포넌트에서 사용
import { isValidEmail } from '@/utils/validation';
```

---

## 11. 파일 라인 수 제한 (500줄 기준)

한 파일의 코드 라인이 **500줄 이상**이 될 경우 분리를 고려합니다.

### 분리 전략

**1. 컴포넌트 분리**:

```typescript
// Before: LargeComponent.tsx (700줄)
export function LargeComponent() {
  // 700줄의 코드
}

// After: 관심사별로 분리
// LargeComponent.tsx (200줄)
export function LargeComponent() {
  return (
    <div>
      <ComponentHeader />
      <ComponentBody />
      <ComponentFooter />
    </div>
  );
}

// ComponentHeader.tsx (150줄)
// ComponentBody.tsx (200줄)
// ComponentFooter.tsx (150줄)
```

**2. 로직 분리**:

```typescript
// Before: OrderPage.tsx (600줄)
export function OrderPage() {
  // 복잡한 상태 관리 로직
  // 복잡한 비즈니스 로직
  // UI 렌더링
}

// After: 훅으로 분리
// hooks/useOrderData.ts
export function useOrderData() { ... }

// hooks/useOrderOperations.ts
export function useOrderOperations() { ... }

// OrderPage.tsx (150줄)
export function OrderPage() {
  const orderData = useOrderData();
  const operations = useOrderOperations();

  return <div>...</div>;
}
```

**3. 유틸 분리**:

```typescript
// utils/orderUtils.ts
export const formatOrderStatus = ...
export const calculateOrderTotal = ...
export const validateOrderData = ...
```

---

## 12. 낮은 결합도, 높은 응집도 (Low Coupling, High Cohesion)

> 상세 가이드라인은 [frontend-design-guide](../frontend-design-guide/SKILL.md)의 Cohesion, Coupling 섹션과 [GUIDELINES.md](../frontend-design-guide/GUIDELINES.md)를 참조하세요.

**핵심 원칙**:
- **낮은 결합도**: 컴포넌트가 필요한 것만 Props로 받고, 전역 상태 의존성을 최소화
- **높은 응집도**: 관련된 데이터와 함수를 같은 파일에 배치, 각 모듈이 단일 목적을 가짐

---

## 13. Props Depth가 4 이상이면 Context API 사용

Props drilling이 4단계 이상 깊어지는 경우, Context API를 활용하여 지역화합니다.

### Props Drilling 문제

```typescript
// ❌ 나쁜 예: Props Depth 4 이상
export function OrderPage() {
  const user = useUser();
  const theme = useTheme();

  return <OrderContainer user={user} theme={theme} />;
}

function OrderContainer({ user, theme }: Props) {
  return <OrderList user={user} theme={theme} />;
}

function OrderList({ user, theme }: Props) {
  return <OrderItem user={user} theme={theme} />;
}

function OrderItem({ user, theme }: Props) {
  return <OrderDetail user={user} theme={theme} />;
}

// 4단계 깊이 - Context 사용 고려
function OrderDetail({ user, theme }: Props) {
  return <div style={{ color: theme.textColor }}>{user.name}</div>;
}
```

### Context API로 해결

```typescript
// ✅ 좋은 예: Context API 사용
// OrderContext.tsx
interface OrderContextValue {
  user: User;
  theme: Theme;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const user = useUser();
  const theme = useTheme();

  return (
    <OrderContext.Provider value={{ user, theme }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrderContext() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within OrderProvider');
  }
  return context;
}

// OrderPage.tsx
export function OrderPage() {
  return (
    <OrderProvider>
      <OrderContainer />
    </OrderProvider>
  );
}

function OrderContainer() {
  return <OrderList />;
}

function OrderList() {
  return <OrderItem />;
}

function OrderItem() {
  return <OrderDetail />;
}

function OrderDetail() {
  const { user, theme } = useOrderContext();
  return <div style={{ color: theme.textColor }}>{user.name}</div>;
}
```

### Context 사용 가이드라인

**Context 사용이 적합한 경우**:

- Props depth가 4단계 이상
- 여러 컴포넌트에서 같은 데이터 필요
- 특정 영역(feature)에서만 사용되는 상태

**Context 사용을 피해야 하는 경우**:

- Props depth가 3단계 이하 (Props로 전달)
- 단일 컴포넌트에서만 사용 (로컬 state)
- 전역적으로 사용 (전역 상태 관리 라이브러리)

**지역화 원칙**:

```
전역 상태 관리 (Recoil)
    ↓
Context API (Feature 단위)
    ↓
Props (컴포넌트 간)
    ↓
Local State (컴포넌트 내부)
```

---

## 14. 객체는 구조분해 할당 (Destructuring)

객체와 배열은 구조분해 할당을 기본으로 사용합니다.

### 객체 구조분해

```typescript
// ❌ 나쁜 예: 점 표기법 반복
export function OrderCard(props: OrderCardProps) {
  return (
    <div>
      <h3>{props.order.title}</h3>
      <p>{props.order.price}</p>
      <button onClick={props.onEdit}>편집</button>
      <button onClick={props.onDelete}>삭제</button>
    </div>
  );
}

// ✅ 좋은 예: 구조분해 할당
export function OrderCard({ order, onEdit, onDelete }: OrderCardProps) {
  return (
    <div>
      <h3>{order.title}</h3>
      <p>{order.price}</p>
      <button onClick={onEdit}>편집</button>
      <button onClick={onDelete}>삭제</button>
    </div>
  );
}
```

### 중첩 구조분해

```typescript
// ❌ 나쁜 예
export function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.profile.name}</h2>
      <p>{user.profile.email}</p>
      <p>{user.settings.theme}</p>
    </div>
  );
}

// ✅ 좋은 예: 중첩 구조분해
export function UserProfile({ user }: { user: User }) {
  const {
    profile: { name, email },
    settings: { theme },
  } = user;

  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
      <p>{theme}</p>
    </div>
  );
}
```

### 배열 구조분해

```typescript
// ❌ 나쁜 예
const userData = useUser();
const user = userData[0];
const loading = userData[1];

// ✅ 좋은 예
const [user, loading] = useUser();
```

### 함수 파라미터 구조분해

```typescript
// ❌ 나쁜 예
const formatOrderDate = (order: Order) => {
  return new Date(order.createdAt).toLocaleDateString('ko-KR');
};

// ✅ 좋은 예
const formatOrderDate = ({ createdAt }: Order) => {
  return new Date(createdAt).toLocaleDateString('ko-KR');
};
```

### 기본값과 함께 사용

```typescript
// ✅ 구조분해 + 기본값
export function OrderCard({
  order,
  onEdit,
  onDelete,
  showActions = true, // 기본값
  variant = 'default', // 기본값
}: OrderCardProps) {
  return (
    <div className={variant}>
      <h3>{order.title}</h3>
      {showActions && (
        <>
          <button onClick={onEdit}>편집</button>
          <button onClick={onDelete}>삭제</button>
        </>
      )}
    </div>
  );
}
```

### 나머지 프로퍼티 (Rest Properties)

```typescript
// ✅ 필요한 것만 추출하고 나머지는 전달
export function Button({ variant, size, ...restProps }: ButtonProps) {
  return (
    <button
      className={`btn-${variant} btn-${size}`}
      {...restProps} // onClick, disabled 등 나머지 props 전달
    />
  );
}
```

### 구조분해 사용 원칙

**사용해야 하는 경우**:

- Props 받을 때
- 객체/배열에서 값을 추출할 때
- 함수 파라미터로 객체를 받을 때
- 여러 값을 반환하는 함수 결과를 받을 때

**사용을 피하는 경우**:

- 한 번만 사용되는 깊은 중첩 (가독성 저하)
- 변수명이 너무 길어지는 경우

```typescript
// ❌ 과도한 중첩 구조분해
const {
  order: {
    customer: {
      address: {
        street: { name: streetName },
      },
    },
  },
} = data;

// ✅ 적절한 수준
const { order } = data;
const streetName = order.customer.address.street.name;
```

---

## 체크리스트

새로운 코드 작성 시 확인:

- [ ] **클린 코드**: 가독성, 단순성, 명확성을 고려했는가?
- [ ] **선언적 네이밍**: 의도를 드러내고, 구현을 숨기고, 반환 타입 힌트를 제공하는가?
- [ ] **컴포넌트 Export**: 일반 컴포넌트는 `export function`, 페이지는 `export default`로 작성했는가?
- [ ] **유틸 함수**: `const` 함수 표현식으로 작성했는가?
- [ ] **JSX**: JSX를 반환하는 함수를 컴포넌트로 분리했는가?
- [ ] **Props**: 컴포넌트의 관심사만 포함하는가?
- [ ] **비즈니스 로직**: 커스텀 훅으로 추상화했는가?
- [ ] **타입 안정성**: `any` 타입을 사용하지 않았는가?
- [ ] **배럴 Export**: `index.ts`를 사용했는가?
- [ ] **파일 응집도**: 재사용되지 않는 코드를 무리하게 분리하지 않았는가?
- [ ] **파일 라인 수**: 500줄을 초과하는 경우 분리를 고려했는가?
- [ ] **결합도/응집도**: 낮은 결합도와 높은 응집도를 유지하는가?
- [ ] **Props Depth**: 4단계 이상이면 Context API를 사용했는가?
- [ ] **구조분해 할당**: 객체와 배열에 구조분해 할당을 사용했는가?

---

## 정리

**핵심 원칙 요약**:

1. **클린 코드** - 읽기 쉽고 명확한 코드
2. **선언적 네이밍** - 의도를 드러내는 이름 (의도 드러내기, 구현 숨기기, 타입 힌트)
3. **컴포넌트 Export** - 일반: `export function`, 페이지: `export default`
4. **`const` 표현식** - 유틸/헬퍼 함수
5. **컴포넌트 분리** - JSX는 컴포넌트로
6. **단일 책임** - 컴포넌트의 관심사만
7. **훅 추상화** - 비즈니스 로직 분리
8. **타입 안정성** - `any` 지양
9. **배럴 Export** - 폴더 단위 export
10. **응집도 우선** - 재사용 없으면 분리 안함
11. **500줄 제한** - 초과 시 분리 고려
12. **설계 원칙** - 낮은 결합도, 높은 응집도 (상세: frontend-design-guide 참조)
13. **Context API** - Props depth 4 이상이면 사용
14. **구조분해 할당** - 객체/배열 기본 사용

이 가이드를 따르면 **일관성 있고, 유지보수하기 쉬우며, 확장 가능한 코드**를 작성할 수 있습니다.
