# 구조분해 할당 (규칙 14)

## Props 구조분해

```typescript
// ❌ 점 표기법
export function OrderCard(props: OrderCardProps) {
  return <h3>{props.order.title}</h3>;
}

// ✅ 구조분해
export function OrderCard({ order, onEdit, onDelete }: OrderCardProps) {
  return <h3>{order.title}</h3>;
}
```

## 중첩 구조분해

```typescript
// ✅ 적절한 수준
const { profile: { name, email }, settings: { theme } } = user;

// ❌ 과도한 중첩 (3단계+)
const { order: { customer: { address: { street: { name: streetName } } } } } = data;

// ✅ 대안
const { order } = data;
const streetName = order.customer.address.street.name;
```

## 기본값 + Rest Properties

```typescript
export function OrderCard({
  order,
  onEdit,
  showActions = true,
  variant = 'default',
}: OrderCardProps) { ... }

export function Button({ variant, size, ...restProps }: ButtonProps) {
  return <button className={`btn-${variant} btn-${size}`} {...restProps} />;
}
```
