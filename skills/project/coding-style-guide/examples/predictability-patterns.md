# 예측 가능성 & 조기 추상화 지양 (규칙 16, 17)

## 일관된 반환 타입

```typescript
// ✅ React Query hooks → 항상 UseQueryResult 반환
function useUser(): UseQueryResult<User, Error> {
  return useQuery({ queryKey: ['user'], queryFn: fetchUser });
}

// ✅ Validation → 항상 ValidationResult 반환
type ValidationResult = { ok: true } | { ok: false; reason: string };

function checkIsNameValid(name: string): ValidationResult {
  if (name.length === 0) return { ok: false, reason: 'Name cannot be empty.' };
  if (name.length >= 20) return { ok: false, reason: 'Name too long.' };
  return { ok: true };
}
```

## 숨겨진 side effect 금지 (SRP)

```typescript
// ❌ fetchBalance가 logging도 수행
async function fetchBalance() {
  const balance = await http.get('...');
  logging.log('fetched'); // 숨겨진 side effect
  return balance;
}

// ✅ 각 책임 분리
async function fetchBalance(): Promise<number> {
  return await http.get('...');
}

async function handleUpdateClick() {
  const balance = await fetchBalance();
  logging.log('balance_fetched'); // 명시적
  await syncBalance(balance);
}
```

## 래퍼 함수는 구체적 이름

```typescript
// ❌ 원본과 혼동
const http = { get: (url) => { /* auth 추가 */ } };

// ✅ 명확한 의도
export const httpService = {
  async getWithAuth(url: string) {
    const token = await fetchToken();
    return httpLibrary.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
```

## 조기 추상화 지양 — 집중된 hook

```typescript
// ❌ 모든 query param을 하나의 hook에서 관리
function useQueryParams() {
  const [cardId, setCardId] = useQueryParam('cardId');
  const [dateRange, setDateRange] = useQueryParam('dateRange');
  const [status, setStatus] = useQueryParam('status');
  return { cardId, setCardId, dateRange, setDateRange, status, setStatus };
}

// ✅ 각 param마다 별도 hook (낮은 결합도)
function useCardIdQueryParam() {
  const [cardId, setCardId] = useQueryParam('cardId', NumberParam);
  return [cardId ?? undefined, setCardId] as const;
}

function useDateRangeQueryParam() { ... }
```
