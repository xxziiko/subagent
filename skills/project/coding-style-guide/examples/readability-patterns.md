# 가독성 패턴 (규칙 15)

## Magic Number → 명명된 상수

```typescript
// ❌
await delay(300);

// ✅
const ANIMATION_DELAY_MS = 300;
await delay(ANIMATION_DELAY_MS);
```

## 복잡한 삼항 → IIFE

```typescript
// ❌ 중첩 삼항
const status = ACondition ? (BCondition ? 'BOTH' : 'A') : 'NONE';

// ✅ IIFE
const status = (() => {
  if (ACondition && BCondition) return 'BOTH';
  if (ACondition) return 'A';
  return 'NONE';
})();
```

## 복잡한 조건식 명명

```typescript
// ❌ 인라인 복잡 조건
return product.categories.some(c => c.id === targetId) && price >= min && price <= max;

// ✅ 의미 변수로 추출
const isSameCategory = product.categories.some(c => c.id === targetId);
const isPriceInRange = price >= min && price <= max;
return isSameCategory && isPriceInRange;
```

## 구현 세부사항 추상화 (AuthGuard 패턴)

```tsx
// ❌ 인증 로직이 페이지에 혼재
function LoginPage() {
  const status = useCheckLoginStatus();
  useEffect(() => { if (status === 'LOGGED_IN') location.href = '/home'; }, [status]);
  return <>...</>;
}

// ✅ Guard 컴포넌트로 추상화
function AuthGuard({ children }) {
  const status = useCheckLoginStatus();
  useEffect(() => { if (status === 'LOGGED_IN') location.href = '/home'; }, [status]);
  return status !== 'LOGGED_IN' ? children : null;
}

function App() {
  return <AuthGuard><LoginPage /></AuthGuard>;
}
```

## 간단한 로직은 인라인 (policy 객체)

```tsx
function Page() {
  const user = useUser();
  const policy = {
    admin: { canInvite: true, canView: true },
    viewer: { canInvite: false, canView: true },
  }[user.role];

  return (
    <div>
      <Button disabled={!policy.canInvite}>Invite</Button>
      <Button disabled={!policy.canView}>View</Button>
    </div>
  );
}
```
