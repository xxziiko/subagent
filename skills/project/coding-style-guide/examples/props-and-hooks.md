# Props & 커스텀 훅 (규칙 6, 7)

## Props는 관심사만

```typescript
// ❌ 너무 많은 관심사
interface OrderCardProps {
  order: Order;
  user: User;              // 불필요
  permissions: Permission; // 불필요
  theme: Theme;            // 컨텍스트에서 처리
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

// ✅ 필요한 것만
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

## 비즈니스 로직 → 커스텀 훅

```typescript
// ❌ 컴포넌트에 비즈니스 로직 혼재
export function OrderForm() {
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

// ✅ 커스텀 훅으로 분리
function useCreateOrder() {
  const [createOrder, { loading }] = useCreateOrderMutation({
    onCompleted: (data) => {
      if (data.createOrder.isSucceed) {
        toast.success('주문 생성 완료');
        router.push('/orders');
      }
    },
    onError: () => toast.error('주문 생성 실패'),
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

## 관심사별 훅 분리

```typescript
function useOrderData(orderId: string) { ... }     // 데이터
function useOrderForm() { ... }                      // 폼 상태
function useOrderPermissions() { ... }               // 권한
function useOrderOperations() {                      // CRUD
  return { createOrder, updateOrder, deleteOrder };
}
```
