---
name: integration-test-patterns
description: 통합 테스트 작성 전문 패턴. Vitest + React Testing Library + MSW 기반 TDD 워크플로우, 컴포넌트/훅/유틸 테스트 템플릿, GraphQL Mock, Apollo Client 테스트 패턴. integration-tester 에이전트 전용.
---

# Integration Test Patterns — 통합 테스트 가이드

Vitest + React Testing Library + MSW 기반 **통합 테스트 작성** 패턴과 TDD 워크플로우.

> **E2E 테스트**(Playwright)는 `playwright-test-patterns` 스킬 참조.

---

## 테스팅 피라미드에서의 위치

```
         /  E2E  \        ← Playwright (QA, e2e-tester)
        / ──────── \
       / Integration \     ← Vitest + RTL + MSW (TDD, integration-tester) ★
      / ──────────── \
     /     Unit       \    ← Vitest (순수 함수, integration-tester)
    / ──────────────── \
```

- **Unit**: 순수 함수, 유틸리티, 유효성 검증 (의존성 없음)
- **Integration**: 컴포넌트 + 훅 + API Mock 조합 (사용자 관점 테스트)
- **E2E**: 브라우저 기반 전체 흐름 (QA 보완)

---

## TDD 워크플로우

### RED → GREEN → REFACTOR 사이클

```
1. RED:      실패하는 테스트 작성 (기대 동작 정의)
2. GREEN:    테스트를 통과시키는 최소 구현
3. REFACTOR: 중복 제거, 패턴 정리 (테스트는 계속 통과)
```

### TDD 적용 기준

| 적합한 대상 | 부적합한 대상 |
|---|---|
| 비즈니스 로직 (validation, mapper) | 단순 UI 레이아웃 |
| 상태 전이 로직 (buttonVisibility) | 스타일링/CSS |
| 커스텀 훅 (데이터 변환, 필터링) | 외부 라이브러리 래퍼 |
| 유틸리티 함수 (포매터, 파서) | 이미 잘 테스트된 라이브러리 |
| 조건부 렌더링 로직 | 1:1 타입 매핑 |

---

## 테스트 파일 구조

### 디렉토리 구조

```
src/
├── hooks/
│   └── order/
│       ├── useOrderList.ts
│       └── __tests__/
│           └── useOrderList.test.ts
├── utils/
│   └── order/
│       ├── validation.ts
│       ├── mapper.ts
│       └── __tests__/
│           ├── validation.test.ts
│           └── mapper.test.ts
├── components/
│   └── order/
│       ├── OrderStatusBadge.tsx
│       └── __tests__/
│           └── OrderStatusBadge.test.tsx
└── __mocks__/
    ├── handlers.ts          # MSW 핸들러 (전역)
    └── order/
        └── handlers.ts      # 도메인별 MSW 핸들러
```

### 파일 네이밍

```
테스트:    {source}.test.ts(x)    (예: validation.test.ts)
핸들러:    handlers.ts            (MSW, 도메인별 디렉토리)
팩토리:    factories.ts           (테스트 데이터 생성)
```

### Co-location 원칙

- 테스트는 대상 파일과 같은 도메인 디렉토리의 `__tests__/`에 배치
- MSW 핸들러는 도메인별로 분리 (`__mocks__/order/handlers.ts`)
- 공유 테스트 유틸리티는 `src/test-utils/`에 배치

---

## Vitest 설정

### 기본 설정

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-utils/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/**/__mocks__/**', 'src/**/types/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 테스트 셋업

```typescript
// src/test-utils/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { server } from '../__mocks__/server';

// MSW 서버 시작/중지
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
```

---

## MSW (Mock Service Worker) 패턴

### GraphQL 핸들러 — OMS/WMS 구분

```typescript
// src/__mocks__/handlers.ts
import { graphql, HttpResponse } from 'msw';

// OMS GraphQL 엔드포인트
const omsGraphql = graphql.link('/graphql');

// WMS GraphQL 엔드포인트
const wmsGraphql = graphql.link('/wms/graphql');

export const handlers = [
  // OMS 쿼리
  omsGraphql.query('GetAllOrders', () => {
    return HttpResponse.json({
      data: {
        getAllOrders: {
          isSucceed: true,
          resultMessage: '',
          ordersList: [],
        },
      },
    });
  }),

  // WMS 쿼리
  wmsGraphql.query('GetStockItems', () => {
    return HttpResponse.json({
      data: {
        getStockItems: {
          isSucceed: true,
          resultMessage: '',
          stockItemsList: [],
        },
      },
    });
  }),
];
```

### MSW 서버 설정

```typescript
// src/__mocks__/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 테스트별 핸들러 오버라이드

```typescript
import { graphql, HttpResponse } from 'msw';
import { server } from '../../__mocks__/server';

test('에러 응답 시 에러 메시지를 표시한다', async () => {
  // 이 테스트에서만 에러 응답으로 오버라이드
  server.use(
    graphql.query('GetAllOrders', () => {
      return HttpResponse.json({
        errors: [{ message: '서버 오류' }],
      });
    }),
  );

  // 테스트 실행...
});
```

### 도메인별 핸들러 분리

```typescript
// src/__mocks__/order/handlers.ts
import { graphql, HttpResponse } from 'msw';
import { orderListFactory, emptyOrderListFactory } from './factories';

const omsGraphql = graphql.link('/graphql');

export const orderHandlers = {
  // 기본 성공 응답
  success: omsGraphql.query('GetAllOrders', () => {
    return HttpResponse.json({
      data: { getAllOrders: orderListFactory() },
    });
  }),

  // 빈 목록
  empty: omsGraphql.query('GetAllOrders', () => {
    return HttpResponse.json({
      data: { getAllOrders: emptyOrderListFactory() },
    });
  }),

  // 에러
  error: omsGraphql.query('GetAllOrders', () => {
    return HttpResponse.json({
      errors: [{ message: '조회에 실패했습니다' }],
    });
  }),
};
```

---

## 테스트 데이터 팩토리

### 팩토리 패턴

```typescript
// src/__mocks__/order/factories.ts

// 기본 주문 팩토리
export const createOrder = (overrides?: Partial<Order>): Order => ({
  id: '1',
  status: 'OrderConfirm',
  customerName: '홍길동',
  totalPrice: 50000,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// 주문 목록 응답 팩토리
export const orderListFactory = (orders?: Order[]) => ({
  isSucceed: true,
  resultMessage: '',
  ordersList: orders ?? [
    createOrder(),
    createOrder({ id: '2', status: 'ShipWaiting', customerName: '김영희', totalPrice: 30000 }),
  ],
});

export const emptyOrderListFactory = () => ({
  isSucceed: true,
  resultMessage: '',
  ordersList: [],
});
```

### 팩토리 작성 규칙

- **기본값은 유효한 데이터**: `createOrder()` 호출만으로 유효한 객체 생성
- **overrides 패턴**: 테스트별 특수 케이스에 필요한 필드만 덮어씀
- **GraphQL 응답 래핑**: `isSucceed`, `resultMessage` 포함
- **OMS 타입과 일치**: `graphqlType.ts` 또는 `wmsGraphqlType.ts` 기준

---

## React Testing Library 패턴

### 커스텀 render 함수

```typescript
// src/test-utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/theme';

type CustomRenderOptions = RenderOptions & {
  mocks?: MockedResponse[];
  route?: string;
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) => {
  const { mocks = [], route = '/', ...renderOptions } = options;

  window.history.pushState({}, '', route);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </MockedProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
```

### 컴포넌트 테스트

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/render';
import { OrderStatusBadge } from '../OrderStatusBadge';

describe('OrderStatusBadge', () => {
  // Happy Path
  test('주문확인 상태를 올바르게 표시한다', () => {
    renderWithProviders(<OrderStatusBadge status="OrderConfirm" />);

    expect(screen.getByText('주문확인')).toBeInTheDocument();
  });

  // Edge Case
  test('알 수 없는 상태는 기본 뱃지로 표시한다', () => {
    renderWithProviders(<OrderStatusBadge status="Unknown" />);

    expect(screen.getByText('알 수 없음')).toBeInTheDocument();
  });
});
```

### 커스텀 훅 테스트

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useOrderList } from '../useOrderList';
import { GET_ALL_ORDERS } from '../queries';
import { createOrder, orderListFactory } from '@/__mocks__/order/factories';

const createWrapper = (mocks: MockedResponse[]) => {
  return ({ children }: { children: React.ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
};

describe('useOrderList', () => {
  test('주문 목록을 반환한다', async () => {
    const mocks = [{
      request: { query: GET_ALL_ORDERS },
      result: { data: { getAllOrders: orderListFactory() } },
    }];

    const { result } = renderHook(() => useOrderList(), {
      wrapper: createWrapper(mocks),
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(2);
    });
  });

  test('로딩 상태를 반환한다', () => {
    const mocks = [{
      request: { query: GET_ALL_ORDERS },
      result: { data: { getAllOrders: orderListFactory() } },
    }];

    const { result } = renderHook(() => useOrderList(), {
      wrapper: createWrapper(mocks),
    });

    expect(result.current.loading).toBe(true);
  });
});
```

### 유저 인터랙션 테스트

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test-utils/render';
import { OrderSearchForm } from '../OrderSearchForm';

describe('OrderSearchForm', () => {
  test('검색어를 입력하고 검색할 수 있다', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<OrderSearchForm onSearch={onSearch} />);

    await user.type(screen.getByLabelText('주문 검색'), '홍길동');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(onSearch).toHaveBeenCalledWith('홍길동');
  });
});
```

---

## 유틸리티 / 순수 함수 테스트

### Validation 테스트

```typescript
// src/utils/order/__tests__/validation.test.ts
import { validateOrderForm, OrderFormData } from '../validation';

describe('validateOrderForm', () => {
  const validForm: OrderFormData = {
    customerName: '홍길동',
    phone: '010-1234-5678',
    address: '서울시 강남구',
  };

  // Happy Path
  test('유효한 폼 데이터를 통과시킨다', () => {
    const result = validateOrderForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // Edge Case
  test('빈 고객명은 에러를 반환한다', () => {
    const result = validateOrderForm({ ...validForm, customerName: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.customerName).toBe('고객명을 입력해주세요');
  });

  // Edge Case
  test('잘못된 전화번호 형식은 에러를 반환한다', () => {
    const result = validateOrderForm({ ...validForm, phone: '1234' });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });
});
```

### Mapper 테스트

```typescript
// src/utils/order/__tests__/mapper.test.ts
import { mapOrderStatus, mapPriceToDisplay } from '../mapper';

describe('mapOrderStatus', () => {
  test.each([
    ['OrderConfirm', '주문확인'],
    ['ShipWaiting', '출고대기'],
    ['DeliveryComplete', '배송완료'],
  ])('%s → %s', (input, expected) => {
    expect(mapOrderStatus(input)).toBe(expected);
  });
});

describe('mapPriceToDisplay', () => {
  test('천 단위 콤마를 포함한다', () => {
    expect(mapPriceToDisplay(50000)).toBe('50,000원');
  });

  test('0원을 올바르게 표시한다', () => {
    expect(mapPriceToDisplay(0)).toBe('0원');
  });
});
```

### buttonVisibility 테스트

```typescript
// src/utils/order/__tests__/buttonVisibility.test.ts
import { getAvailableActions } from '../buttonVisibility';

describe('getAvailableActions', () => {
  test('신규주문 상태에서 주문확인 버튼을 노출한다', () => {
    const actions = getAvailableActions('NewOrder');
    expect(actions).toContain('confirm');
    expect(actions).not.toContain('ship');
  });

  test('배송완료 상태에서 모든 액션 버튼을 숨긴다', () => {
    const actions = getAvailableActions('DeliveryComplete');
    expect(actions).toHaveLength(0);
  });
});
```

---

## Apollo Client 테스트 패턴

### MockedProvider 사용

```typescript
import { MockedProvider, MockedResponse } from '@apollo/client/testing';

// 성공 Mock
const successMock: MockedResponse = {
  request: {
    query: GET_ALL_ORDERS,
    variables: { status: 'OrderConfirm' },
  },
  result: {
    data: { getAllOrders: orderListFactory() },
  },
};

// 에러 Mock
const errorMock: MockedResponse = {
  request: { query: GET_ALL_ORDERS },
  error: new Error('네트워크 에러'),
};

// GraphQL 에러 Mock
const gqlErrorMock: MockedResponse = {
  request: { query: GET_ALL_ORDERS },
  result: {
    errors: [{ message: '권한이 없습니다' }],
  },
};
```

### Mutation 테스트

```typescript
test('주문확인 뮤테이션을 실행한다', async () => {
  const user = userEvent.setup();
  const confirmMock: MockedResponse = {
    request: {
      query: CONFIRM_ORDER,
      variables: { orderId: '1' },
    },
    result: {
      data: { confirmOrder: { isSucceed: true, resultMessage: '' } },
    },
  };

  renderWithProviders(<OrderDetail orderId="1" />, {
    mocks: [orderDetailMock, confirmMock],
  });

  await waitFor(() => {
    expect(screen.getByRole('button', { name: '주문확인' })).toBeInTheDocument();
  });

  await user.click(screen.getByRole('button', { name: '주문확인' }));

  await waitFor(() => {
    expect(screen.getByText('주문이 확인되었습니다')).toBeInTheDocument();
  });
});
```

---

## 테스트 실행 명령어

```bash
# 전체 테스트 실행
pnpm vitest run

# 감시 모드 (TDD에 적합)
pnpm vitest

# 특정 파일 실행
pnpm vitest run src/utils/order/__tests__/validation.test.ts

# 패턴 매칭
pnpm vitest run --reporter=verbose "order"

# 커버리지 리포트
pnpm vitest run --coverage

# UI 모드 (브라우저에서 결과 확인)
pnpm vitest --ui
```

---

## Assertion 패턴

### 기본 Assertion (Vitest)

```typescript
expect(value).toBe(expected);          // 엄격 동등
expect(value).toEqual(expected);       // 깊은 비교
expect(array).toContain(item);         // 배열 포함
expect(array).toHaveLength(3);         // 길이
expect(fn).toHaveBeenCalledWith(arg);  // 함수 호출
expect(fn).toHaveBeenCalledTimes(1);   // 호출 횟수
```

### DOM Assertion (Testing Library)

```typescript
expect(element).toBeInTheDocument();       // 존재
expect(element).toBeVisible();             // 가시성
expect(element).toHaveTextContent('text'); // 텍스트
expect(element).toBeDisabled();            // 비활성
expect(element).toHaveAttribute('href');   // 속성
```

### 비동기 Assertion

```typescript
// waitFor — 조건이 충족될 때까지 대기
await waitFor(() => {
  expect(screen.getByText('로딩 완료')).toBeInTheDocument();
});

// findBy — waitFor + getBy 조합 (단일 요소)
const element = await screen.findByText('로딩 완료');
expect(element).toBeVisible();
```

---

## Compliance Checklist

> **Severity 기준** (RFC 2119)

| Severity | 항목 | 체크 |
|---|---|---|
| **MUST** | TDD 사이클(RED→GREEN→REFACTOR) 준수 |
| **MUST** | MSW로 API Mock (실제 API 호출 금지) |
| **MUST** | GraphQL Mock에서 OMS/WMS 엔드포인트 구분 |
| **MUST** | 테스트 데이터에 팩토리 패턴 사용 |
| **MUST** | 모든 테스트 `pnpm vitest run`으로 통과 |
| **SHOULD** | Happy/Edge/Error 3단계 시나리오 커버 |
| **SHOULD** | `userEvent` 사용 (fireEvent 대신) |
| **SHOULD** | 커스텀 render 함수로 Provider 래핑 |
| **SHOULD** | Co-location 원칙 준수 (`__tests__/` 디렉토리) |
| **MAY** | test.each로 파라미터화 테스트 |
| **MAY** | 커버리지 리포트 생성 |

### 성공 기준

- **MUST 전체 통과**: 테스트 작성 완료
- **MUST 위반 1건 이상**: 수정 필수
