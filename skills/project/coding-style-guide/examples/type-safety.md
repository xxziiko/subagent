# 타입 안정성 (규칙 8)

## `any` 타입 지양

```typescript
// ❌
const handleData = (data: any) => { console.log(data.name); };
const response: any = await fetchOrder();

// ✅ 명확한 타입
interface Order { id: string; name: string; price: number; }
const handleOrder = (order: Order) => { console.log(order.name); };
const response: Order = await fetchOrder();
```

## 불가피한 경우 — `unknown` + 타입 가드

```typescript
const parseResponse = (data: unknown): Order => {
  if (isOrder(data)) return data;
  throw new Error('Invalid order data');
};
```

## 동적 타입 — 제네릭

```typescript
const fetchData = <T>(url: string): Promise<T> => {
  return fetch(url).then((res) => res.json());
};
```
