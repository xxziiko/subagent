# Context API (규칙 13)

## Props Drilling 4단계+ → Context로 지역화

```typescript
// ❌ Props Drilling
function OrderPage() { return <OrderContainer user={user} theme={theme} />; }
function OrderContainer({ user, theme }) { return <OrderList user={user} theme={theme} />; }
function OrderList({ user, theme }) { return <OrderItem user={user} theme={theme} />; }
function OrderItem({ user, theme }) { return <OrderDetail user={user} theme={theme} />; }

// ✅ Context API
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
  if (!context) throw new Error('useOrderContext must be used within OrderProvider');
  return context;
}

// 사용
export function OrderPage() {
  return <OrderProvider><OrderContainer /></OrderProvider>;
}

function OrderDetail() {
  const { user, theme } = useOrderContext();
  return <div style={{ color: theme.textColor }}>{user.name}</div>;
}
```

## Context 사용 기준

- **사용**: Props depth 4+, 여러 컴포넌트에서 같은 데이터, Feature 단위 상태
- **미사용**: depth 3 이하(Props), 단일 컴포넌트(local state), 전역(상태 관리 라이브러리)
