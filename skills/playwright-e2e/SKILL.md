---
name: playwright-e2e
description: Playwright E2E 테스트 실행, 디버깅, 브라우저 자동화 기반 스킬. 테스트 명령어, Decision Tree, Reconnaissance-Then-Action 패턴, MCP 활용, 버그 재현 워크플로우 제공.
---

# Playwright E2E — 실행 & 디버깅

Playwright 기반 E2E 테스트 실행, 디버깅, 브라우저 자동화 가이드.
bug-fixer와 e2e-tester 에이전트의 **공유 베이스 스킬**.

> **테스트 작성 패턴**(POM, 시나리오 설계, Fixture 등)은 `playwright-test-patterns` 스킬 참조.

---

## Decision Tree: 접근 방식 결정

```
사용자 요청 → 정적 HTML인가?
    ├─ Yes → HTML 파일을 직접 읽어 셀렉터 식별
    │         └─ Playwright 스크립트로 자동화
    │
    └─ No (동적 webapp) → 서버가 실행 중인가?
        ├─ No → dev 서버 시작 필요
        │        yarn dev 또는 scripts/with_server.py 활용
        │
        └─ Yes → Reconnaissance-Then-Action 패턴:
            1. 페이지 이동 + networkidle 대기
            2. 스크린샷 또는 DOM 탐색
            3. 렌더링된 상태에서 셀렉터 발견
            4. 발견한 셀렉터로 액션 실행
```

---

## 테스트 실행

### 기본 실행

```bash
# 전체 테스트 실행
pnpm exec playwright test

# 특정 프로젝트만 실행 (setup 포함)
PLAYWRIGHT_WEBSERVER=<project> pnpm exec playwright test \
  --project=<project> --project=<project>-setup

# 특정 테스트 파일 실행
pnpm exec playwright test path/to/test.ts

# 특정 테스트 이름으로 필터링
pnpm exec playwright test -g "테스트 이름"
```

### 디버깅 모드

```bash
# Step-by-step 디버깅 (Playwright Inspector)
pnpm exec playwright test --debug

# 브라우저 표시 (headful 모드)
pnpm exec playwright test --headed

# Trace 수집 (실패 분석용)
pnpm exec playwright test --trace on

# Trace 파일 열기
npx playwright show-trace trace.zip
```

### CI 환경

```bash
pnpm exec playwright test --workers=1 --retries=2
```

### 검증 파이프라인 (verify.sh)

```bash
# 전체 검증 (check-types → build → E2E)
scripts/verify.sh --project=shop

# E2E 없이 검증
scripts/verify.sh --skip-e2e
```

---

## Reconnaissance-Then-Action 패턴

동적 웹앱에서 테스트/디버깅 전 **반드시** 이 패턴을 따릅니다.

### Step 1: 탐색 (Reconnaissance)

```typescript
// 페이지 이동 + JS 실행 완료 대기 (필수)
await page.goto('http://localhost:5173/orders');
await page.waitForLoadState('networkidle');

// 스크린샷으로 시각적 상태 확인
await page.screenshot({ path: '/tmp/recon.png', fullPage: true });

// DOM에서 요소 발견
const buttons = await page.locator('button').all();
const inputs = await page.locator('input, textarea, select').all();
```

### Step 2: 셀렉터 식별

탐색 결과에서 실제 렌더링된 요소의 셀렉터를 확인합니다.

### Step 3: 액션 실행

발견한 셀렉터로 인터랙션을 수행합니다.

> **주의**: `networkidle` 대기 전에 DOM을 검사하면 JS가 렌더링하기 전의 빈 상태를 보게 됩니다.

---

## Setup-Test 패턴

### 인증 Setup

```typescript
// .setup.ts — 인증 수행 → Storage State 저장
import { expect, test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  // 로그인 수행...
  await page.context().storageState({ path: 'storageState.json' });
});
```

### 테스트에서 재사용

```typescript
// .test.ts — Storage State로 인증된 상태에서 테스트
import { expect, test } from '@playwright/test';

test.describe('기능 테스트', () => {
  test('인증된 사용자가 접근할 수 있다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome')).toBeVisible();
  });
});
```

### 프로젝트 의존성

```
project-setup (인증) → project (테스트)
```

---

## Locator 전략 (우선순위)

| 순위 | Locator | 용도 | 예시 |
|------|---------|------|------|
| 1 | `getByRole()` | 버튼, 링크, 체크박스 | `page.getByRole('button', { name: '로그인' })` |
| 2 | `getByLabel()` | 폼 입력 필드 | `page.getByLabel('이메일')` |
| 3 | `getByTestId()` | 커스텀 요소 | `page.getByTestId('order-list')` |
| 4 | `getByText()` | 텍스트 콘텐츠 | `page.getByText('주문 완료')` |
| 5 | `locator()` | 복잡한 셀렉터 | `page.locator('.order-item >> text=삭제')` |

---

## 대기 전략

```typescript
await page.waitForLoadState('networkidle');              // 네트워크 안정화
await page.waitForURL('/dashboard');                     // URL 변경
await page.waitForSelector('.loading', { state: 'hidden' }); // 요소 사라짐
await page.waitForResponse(resp =>                       // 특정 API 응답
  resp.url().includes('/api/orders') && resp.status() === 200
);
```

---

## 디버깅 기법

### 스크린샷 캡처

```typescript
await page.screenshot({ path: 'debug.png' });                    // 현재 뷰포트
await page.screenshot({ path: 'full.png', fullPage: true });     // 전체 페이지
await page.locator('.error-message').screenshot({ path: 'err.png' }); // 특정 요소
```

### 브라우저 콘솔 수집

```typescript
page.on('console', msg => {
  if (msg.type() === 'error') console.log(`Browser Error: ${msg.text()}`);
});
```

### 네트워크 모니터링

```typescript
page.on('requestfailed', req => {
  console.log(`Failed: ${req.url()} - ${req.failure()?.errorText}`);
});

page.on('response', resp => {
  if (resp.url().includes('/api/') && resp.status() >= 400) {
    console.log(`API Error: ${resp.url()} - ${resp.status()}`);
  }
});
```

### 네트워크 가로채기 (Mock)

```typescript
// 성공 응답 모킹
await page.route('**/api/orders', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ orders: [] }),
  });
});

// 에러 응답 시뮬레이션
await page.route('**/api/orders', route => {
  route.fulfill({ status: 500, body: 'Internal Server Error' });
});
```

---

## Playwright MCP 활용

Playwright MCP를 통한 브라우저 자동화(도구 레퍼런스, Reconnaissance-Then-Action 패턴, DevTools MCP 협력 패턴, 버그 재현/검증 워크플로우)는 `playwright-mcp` 스킬 참조.

---

## 일반적인 문제 해결

### 타임아웃

```typescript
test.setTimeout(60000);                              // 테스트 타임아웃 60초
await page.click('button', { timeout: 10000 });      // 액션 타임아웃 10초
```

### 인증 상태 만료

```bash
rm storageState.json
pnpm exec playwright test --project=<project>-setup
```

### 포트 충돌

```bash
lsof -i :3000
lsof -i :5173
```

### Flaky 테스트

```typescript
test.describe('불안정한 영역', () => {
  test.describe.configure({ retries: 2 });
  test('가끔 실패하는 테스트', async ({ page }) => { ... });
});
```
