---
name: playwright-test-patterns
description: E2E 테스트 작성 전문 패턴. 시나리오 설계, Page Object Model, Fixture, GraphQL Mock, 도메인별 테스트 템플릿. e2e-tester 에이전트 전용.
---

# Playwright Test Patterns — 테스트 작성 가이드

E2E 테스트 **작성**에 특화된 패턴과 템플릿.

> **테스트 실행/디버깅**은 `playwright-e2e` 스킬 참조.

---

## 테스트 시나리오 설계

### 3단계 시나리오 분류

모든 기능의 E2E 테스트는 이 순서로 설계합니다:

```
1. Happy Path     — 정상 흐름 (필수, 최우선)
2. Edge Case      — 경계값, 빈 데이터, 대량 데이터
3. Error Case     — 네트워크 에러, 권한 부족, 검증 실패
```

### 시나리오 매트릭스 작성

기능 분석 시 다음 표를 채워 누락 없이 설계합니다:

```
| 시나리오 | 유형 | 사전 조건 | 기대 결과 | 우선순위 |
|---------|------|----------|----------|---------|
| 주문 목록 조회 | Happy | 인증됨, 주문 존재 | 목록 표시 | P0 |
| 빈 주문 목록 | Edge | 인증됨, 주문 없음 | 빈 상태 메시지 | P1 |
| 인증 만료 | Error | 토큰 만료 | 로그인 리다이렉트 | P1 |
```

**우선순위**: P0(필수) → P1(권장) → P2(선택)

---

## 테스트 파일 구조

### 디렉토리 구조

```
e2e/
├── fixtures/              # 공유 Fixture (인증, 데이터)
│   ├── auth.fixture.ts
│   └── data.fixture.ts
├── pages/                 # Page Object Model
│   ├── order/
│   │   ├── OrderListPage.ts
│   │   └── OrderDetailPage.ts
│   ├── wms/
│   │   ├── GoodsItemPage.ts
│   │   └── StockItemPage.ts
│   └── BasePage.ts
├── tests/                 # 테스트 파일 (도메인별)
│   ├── order/
│   │   ├── order-list.test.ts
│   │   └── order-detail.test.ts
│   ├── wms/
│   │   ├── goods-item.test.ts
│   │   └── stock-item.test.ts
│   └── business/
├── mocks/                 # GraphQL Mock 데이터
│   ├── order.mock.ts
│   └── wms.mock.ts
└── utils/                 # 테스트 유틸리티
    └── graphql.helpers.ts
```

### 파일 네이밍

```
테스트:  {feature}.test.ts     (예: order-list.test.ts)
POM:     {Feature}Page.ts      (예: OrderListPage.ts)
Mock:    {domain}.mock.ts      (예: order.mock.ts)
Fixture: {concern}.fixture.ts  (예: auth.fixture.ts)
```

---

## Page Object Model (POM)

### Base Page

```typescript
// e2e/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageReady() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `/tmp/${name}.png`, fullPage: true });
  }

  getByTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }
}
```

### 도메인별 Page Object

```typescript
// e2e/pages/order/OrderListPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class OrderListPage extends BasePage {
  private readonly orderTable: Locator;
  private readonly searchInput: Locator;
  private readonly statusFilter: Locator;

  constructor(page: Page) {
    super(page);
    this.orderTable = page.getByTestId('order-table');
    this.searchInput = page.getByLabel('주문 검색');
    this.statusFilter = page.getByLabel('상태');
  }

  async goto() {
    await this.page.goto('/orders');
    await this.waitForPageReady();
  }

  async searchOrder(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchInput.press('Enter');
    await this.waitForPageReady();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.waitForPageReady();
  }

  async getOrderCount(): Promise<number> {
    const rows = await this.orderTable.locator('tbody tr').all();
    return rows.length;
  }

  async expectEmptyState() {
    await expect(this.page.getByText('주문이 없습니다')).toBeVisible();
  }
}
```

### POM 작성 규칙

- Locator는 **constructor에서 선언** (재사용, 한 곳에서 관리)
- 메서드명은 **사용자 행동 기반** (`searchOrder`, `filterByStatus`)
- assertion은 `expect` 접두사 (`expectEmptyState`, `expectOrderVisible`)
- 페이지 이동은 `goto()` 메서드로 통일
- 모든 네비게이션/액션 후 `waitForPageReady()` 호출

---

## Fixture 패턴

### 인증 Fixture

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type AuthFixture = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('test@example.com');
    await page.getByLabel('비밀번호').fill('password');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/dashboard');
    await use(page);
  },
});
```

### POM + Fixture 조합

```typescript
// e2e/fixtures/data.fixture.ts
import { test as authTest } from './auth.fixture';
import { OrderListPage } from '../pages/order/OrderListPage';

type PageFixture = {
  orderListPage: OrderListPage;
};

export const test = authTest.extend<PageFixture>({
  orderListPage: async ({ authenticatedPage }, use) => {
    const page = new OrderListPage(authenticatedPage);
    await use(page);
  },
});
```

---

## GraphQL Mock 패턴 (`page.route()`)

Sirloin OMS는 Apollo Client + GraphQL 기반이므로 API Mock이 핵심입니다.
E2E 테스트에서는 **Playwright의 `page.route()`로 네트워크 요청을 가로채서 모킹**합니다. MSW는 사용하지 않습니다.

### GraphQL 요청 가로채기

```typescript
// e2e/utils/graphql.helpers.ts
import { Page } from '@playwright/test';

export const mockGraphQL = async (
  page: Page,
  operationName: string,
  responseData: unknown,
  targetApi?: 'oms' | 'wms',
) => {
  const endpoint = targetApi === 'wms' ? '**/wms/graphql' : '**/graphql';

  await page.route(endpoint, async (route, request) => {
    const body = JSON.parse(request.postData() || '{}');
    if (body.operationName === operationName) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: responseData }),
      });
    } else {
      await route.continue();
    }
  });
};

export const mockGraphQLError = async (
  page: Page,
  operationName: string,
  errorMessage: string,
) => {
  await page.route('**/graphql', async (route, request) => {
    const body = JSON.parse(request.postData() || '{}');
    if (body.operationName === operationName) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: errorMessage }],
        }),
      });
    } else {
      await route.continue();
    }
  });
};
```

### Mock 데이터 정의

```typescript
// e2e/mocks/order.mock.ts
export const orderListMock = {
  getAllOrders: {
    isSucceed: true,
    resultMessage: '',
    ordersList: [
      { id: '1', status: 'OrderConfirm', customerName: '홍길동', totalPrice: 50000 },
      { id: '2', status: 'ShipWaiting', customerName: '김영희', totalPrice: 30000 },
    ],
  },
};

export const emptyOrderListMock = {
  getAllOrders: {
    isSucceed: true,
    resultMessage: '',
    ordersList: [],
  },
};
```

### WMS GraphQL Mock

```typescript
// e2e/mocks/wms.mock.ts
export const stockItemsMock = {
  getStockItems: {
    isSucceed: true,
    resultMessage: '',
    stockItemsList: [
      { id: '1', name: '사과 1kg', quantity: 100, locationCode: 'A-01' },
    ],
  },
};
```

---

## 테스트 작성 템플릿

### 기본 테스트 구조

```typescript
import { expect } from '@playwright/test';
import { test } from '../../fixtures/data.fixture';
import { mockGraphQL } from '../../utils/graphql.helpers';
import { orderListMock, emptyOrderListMock } from '../../mocks/order.mock';

test.describe('주문 목록', () => {
  // Happy Path (P0)
  test('주문 목록을 조회할 수 있다', async ({ orderListPage, page }) => {
    await mockGraphQL(page, 'getAllOrders', orderListMock);
    await orderListPage.goto();

    const count = await orderListPage.getOrderCount();
    expect(count).toBe(2);
  });

  // Edge Case (P1)
  test('주문이 없으면 빈 상태를 표시한다', async ({ orderListPage, page }) => {
    await mockGraphQL(page, 'getAllOrders', emptyOrderListMock);
    await orderListPage.goto();

    await orderListPage.expectEmptyState();
  });

  // Error Case (P1)
  test('API 에러 시 에러 메시지를 표시한다', async ({ orderListPage, page }) => {
    await mockGraphQLError(page, 'getAllOrders', '서버 오류');
    await orderListPage.goto();

    await expect(page.getByText('조회에 실패했습니다')).toBeVisible();
  });
});
```

### 상태 전이 테스트 (Order)

```typescript
test.describe('주문 상태 전이', () => {
  test('신규주문 → 주문확인 전이', async ({ page }) => {
    // 사전 조건: 신규주문 상태의 주문
    await mockGraphQL(page, 'getOrderById', newOrderMock);
    await page.goto('/orders/1');
    await page.waitForLoadState('networkidle');

    // 액션: 주문확인 버튼 클릭
    await mockGraphQL(page, 'mutateConfirmOrder', confirmSuccessMock);
    await page.getByRole('button', { name: '주문확인' }).click();

    // 검증: 상태 변경 확인
    await expect(page.getByText('주문확인')).toBeVisible();
  });
});
```

### WMS 테스트 (context: wms)

```typescript
test.describe('WMS 재고아이템 조회', () => {
  test('재고 목록을 조회할 수 있다', async ({ page }) => {
    // WMS GraphQL Mock (endpoint 구분 필수)
    await mockGraphQL(page, 'getStockItems', stockItemsMock, 'wms');
    await page.goto('/wms/stock-items');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('사과 1kg')).toBeVisible();
    await expect(page.getByText('A-01')).toBeVisible();
  });
});
```

### 버그 회귀 테스트 (RED-GREEN)

```typescript
test.describe('회귀 테스트', () => {
  // BUG-123: 빈 목록에서 삭제 버튼 노출
  test('빈 목록에서 삭제 버튼이 보이지 않아야 한다', async ({ page }) => {
    await mockGraphQL(page, 'getAllOrders', emptyOrderListMock);
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // 버그 조건: 빈 상태에서 삭제 버튼 미노출 검증
    await expect(page.getByRole('button', { name: '삭제' })).not.toBeVisible();
  });
});
```

---

## MUI 컴포넌트 셀렉터 패턴

Sirloin OMS는 MUI 기반이므로 MUI 특화 셀렉터가 필요합니다.

```typescript
// MUI DataGrid
const dataGrid = page.locator('.MuiDataGrid-root');
const rows = dataGrid.locator('.MuiDataGrid-row');
const cell = rows.first().locator('.MuiDataGrid-cell').nth(2);

// MUI Select (드롭다운)
await page.getByLabel('상태').click();
await page.getByRole('option', { name: '주문확인' }).click();

// MUI Dialog
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible();
await dialog.getByRole('button', { name: '확인' }).click();

// MUI Snackbar (Toast)
await expect(page.locator('.MuiSnackbar-root')).toContainText('저장되었습니다');

// MUI Tab
await page.getByRole('tab', { name: '상세정보' }).click();

// MUI DatePicker
await page.getByLabel('시작일').fill('2024-01-01');
```

---

## Assertion 패턴

### 기본 Assertion

```typescript
// 요소 가시성
await expect(page.getByText('주문 목록')).toBeVisible();
await expect(page.getByRole('button', { name: '삭제' })).not.toBeVisible();

// 텍스트 포함
await expect(page.locator('.status')).toContainText('주문확인');

// 개수 확인
await expect(page.locator('tbody tr')).toHaveCount(5);

// URL 확인
await expect(page).toHaveURL(/\/orders\/\d+/);
```

### Soft Assertion (실패해도 계속 진행)

```typescript
test('주문 상세 정보 검증', async ({ page }) => {
  await expect.soft(page.getByText('홍길동')).toBeVisible();
  await expect.soft(page.getByText('50,000원')).toBeVisible();
  await expect.soft(page.getByText('주문확인')).toBeVisible();
  // 모든 soft assertion 결과를 한 번에 리포트
});
```

---

## 도메인별 테스트 체크리스트

### Order 도메인

- [ ] 주문 목록 조회 + 필터링 + 검색
- [ ] 주문 상세 조회
- [ ] 주문 상태 전이 (신규→확인→확정→출고대기→완료)
- [ ] 판매상품 매핑
- [ ] 주문 취소 흐름
- [ ] 배송지 수정

### WMS 도메인

- [ ] 판매상품 CRUD
- [ ] 재고아이템 조회 + 필터
- [ ] 입고 처리 + 취소
- [ ] 로케이션 관리
- [ ] 재고 조회 (6가지 유형)

### Business(B2B) 도메인

- [ ] B2B 주문 생성
- [ ] 배송일별 주문 조회
- [ ] 상품 동기화
- [ ] 프리셋 관리
