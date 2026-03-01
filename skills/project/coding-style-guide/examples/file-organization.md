# 파일 구조 (규칙 9, 10, 11)

## Re-export (Barrel Index) 금지

```typescript
// ❌ Barrel export
// src/components/order/index.ts
export { OrderList } from './OrderList';
export { OrderDetail } from './OrderDetail';

import { OrderList } from '@/components/order';

// ✅ 직접 import
import { OrderList } from '@/components/order/OrderList';
import { OrderDetail } from '@/components/order/OrderDetail';
```

## 응집도를 위한 파일 분리 기준

```typescript
// ✅ 같은 파일에 유지 — 재사용되지 않는 경우
// OrderForm.tsx
interface OrderFormData { title: string; price: number; }

const validateOrderForm = (data: OrderFormData): boolean => {
  return data.title.length > 0 && data.price > 0;
};

export function OrderForm() {
  const [formData, setFormData] = useState<OrderFormData>({ title: '', price: 0 });
  const handleSubmit = () => {
    if (!validateOrderForm(formData)) return;
  };
  return <form>...</form>;
}

// ✅ 별도 파일 — 재사용되는 경우
// utils/validation.ts
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

## 500줄 이상 시 분리 전략

```typescript
// 1. 컴포넌트 분리
export function LargeComponent() {
  return (
    <div>
      <ComponentHeader />
      <ComponentBody />
      <ComponentFooter />
    </div>
  );
}

// 2. 로직 분리 (훅)
export function OrderPage() {
  const orderData = useOrderData();
  const operations = useOrderOperations();
  return <div>...</div>;
}
```
