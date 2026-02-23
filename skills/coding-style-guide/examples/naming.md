# 클린 코드 & 선언적 네이밍 (규칙 1, 2)

## 클린 코드

```typescript
// ❌ 불명확한 코드
const d = new Date();
const y = d.getFullYear();

// ✅ 명확한 코드
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
```

## 의도를 드러내고, 구현은 숨긴다

```typescript
// ❌
const data = fetchData();
const filterArrayByStatus = (items: Item[]) => { ... };

// ✅
const userProfile = fetchUserProfile();
const getActiveItems = (items: Item[]) => { ... };
```

## 반환 타입 힌트

```typescript
const getOrder = () => Order;
const isOrderValid = () => boolean;
const hasPermission = () => boolean;
const calculateTotal = () => number;
const formatOrderDate = () => string;
```
