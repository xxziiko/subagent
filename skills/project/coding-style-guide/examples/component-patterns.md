# 컴포넌트 패턴 (규칙 3, 4, 5)

## Export 규칙

```typescript
// ❌ 함수 표현식 + default export
const OrderList = () => { return <div>...</div>; };
export default OrderList;

// ❌ export default function
export default function OrderList() { return <div>...</div>; }

// ✅ 일반 컴포넌트: Named Export
export function OrderList() { return <div>...</div>; }

// ✅ 페이지 컴포넌트만 예외
export default function OrderPage() { return <div><OrderList /></div>; }
```

## 유틸/헬퍼 함수 — `const` 표현식

```typescript
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

## JSX → 컴포넌트로 분리

```typescript
// ❌ JSX를 반환하는 함수
export function OrderList() {
  const renderOrderItem = (order: Order) => (
    <div className="order-item">
      <h3>{order.title}</h3>
      <p>{order.price}</p>
    </div>
  );
  return <div>{orders.map(renderOrderItem)}</div>;
}

// ✅ 별도 컴포넌트로 분리
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
