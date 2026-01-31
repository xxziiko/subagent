---
name: playwright-e2e
description: Project-specific Playwright E2E testing and debugging skill. Covers test execution commands, setup-test patterns, debugging modes, and bug reproduction workflows tailored to this project's Playwright configuration.
---

# Playwright E2E Testing & Debugging

Playwright를 활용한 E2E 테스트 실행, 디버깅, 버그 재현 가이드.

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
# Step-by-step 디버깅 (Playwright Inspector 열림)
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
# CI에서는 단일 워커, 2회 재시도
pnpm exec playwright test --workers=1 --retries=2
```

---

## 테스트 구조

### Setup-Test 패턴

Playwright는 setup 파일에서 인증/초기 상태를 설정하고, test 파일에서 이를 재사용합니다.

**Setup 파일** (`.setup.ts`): 인증 수행 → Storage State 저장

```typescript
import { expect, test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  // 로그인 수행...
  await page.context().storageState({ path: 'storageState.json' });
});
```

**Test 파일** (`.test.ts`): Storage State 재사용 → 인증된 상태에서 테스트

```typescript
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

Setup 프로젝트가 먼저 실행되어 `storageState.json`을 생성하고, 테스트 프로젝트가 이를 사용합니다.

---

## Locator 전략 (우선순위)

| 순위 | Locator | 용도 | 예시 |
|------|---------|------|------|
| 1 | `getByRole()` | 버튼, 링크, 체크박스 등 | `page.getByRole('button', { name: '로그인' })` |
| 2 | `getByLabel()` | 폼 입력 필드 | `page.getByLabel('이메일')` |
| 3 | `getByTestId()` | 커스텀 요소 | `page.getByTestId('order-list')` |
| 4 | `getByText()` | 텍스트 콘텐츠 | `page.getByText('주문 완료')` |
| 5 | `locator()` | 복잡한 셀렉터 | `page.locator('.order-item >> text=삭제')` |

---

## 대기 전략

```typescript
// 네트워크 안정화 대기
await page.waitForLoadState('networkidle');

// URL 변경 대기
await page.waitForURL('/dashboard');

// 특정 요소 대기
await page.waitForSelector('.loading', { state: 'hidden' });

// 특정 응답 대기
await page.waitForResponse(resp =>
  resp.url().includes('/api/orders') && resp.status() === 200
);
```

---

## 버그 재현 테스트 패턴

버그 수정 시 RED-GREEN 패턴을 따릅니다:

### 1. RED: 실패하는 테스트 작성

```typescript
test('버그: 빈 목록에서 삭제 버튼 클릭 시 에러 발생', async ({ page }) => {
  await page.goto('/orders');

  // 빈 목록 상태 확인
  await expect(page.getByText('주문이 없습니다')).toBeVisible();

  // 버그 재현: 삭제 버튼이 보이면 안 됨
  await expect(page.getByRole('button', { name: '삭제' })).not.toBeVisible();
});
```

### 2. GREEN: 버그 수정 후 테스트 통과 확인

```bash
pnpm exec playwright test path/to/bug-test.ts
```

### 3. 회귀 방지: 테스트를 테스트 스위트에 포함

---

## 디버깅 기법

### 브라우저 일시정지

```typescript
// 테스트 중 특정 지점에서 일시정지
await page.pause();
// Playwright Inspector가 열리며 수동으로 조작 가능
```

### 스크린샷 캡처

```typescript
// 특정 시점 스크린샷
await page.screenshot({ path: 'debug-screenshot.png' });

// 특정 요소만 캡처
await page.locator('.error-message').screenshot({ path: 'error.png' });

// 전체 페이지 캡처
await page.screenshot({ path: 'full-page.png', fullPage: true });
```

### 콘솔 로그 수집

```typescript
// 브라우저 콘솔 메시지 캡처
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`Browser Error: ${msg.text()}`);
  }
});
```

### 네트워크 요청 모니터링

```typescript
// 실패한 요청 감지
page.on('requestfailed', request => {
  console.log(`Failed: ${request.url()} - ${request.failure()?.errorText}`);
});

// 특정 API 응답 확인
page.on('response', response => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    console.log(`API Error: ${response.url()} - ${response.status()}`);
  }
});
```

### 네트워크 가로채기 (Mock)

```typescript
// API 응답 모킹
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

Playwright MCP가 설치된 경우, 에이전트가 직접 브라우저를 조작할 수 있습니다.

### 버그 재현 워크플로우

```
1. Playwright MCP로 브라우저 열기
2. 버그 발생 페이지로 이동
3. 버그 재현 시나리오 실행 (클릭, 입력 등)
4. 스크린샷으로 시각적 증거 수집
5. Chrome DevTools MCP와 연계하여 런타임 에러 확인
```

### 수정 검증 워크플로우

```
1. 코드 수정 후 개발 서버 반영 대기
2. Playwright MCP로 동일 시나리오 재실행
3. 에러가 사라졌는지 확인
4. 스크린샷으로 수정 결과 증거 수집
```

---

## 일반적인 문제 해결

### 타임아웃 에러

```typescript
// 기본 타임아웃 증가
test.setTimeout(60000); // 60초

// 특정 액션 타임아웃
await page.click('button', { timeout: 10000 });
```

### 인증 상태 만료

```bash
# Storage state 파일 삭제 후 재실행
rm storageState.json
pnpm exec playwright test --project=<project>-setup
```

### 포트 충돌

```bash
# 사용 중인 포트 확인
lsof -i :3000
lsof -i :5173
```

### Flaky 테스트 대응

```typescript
// 불안정한 테스트에 재시도 추가
test.describe('불안정한 영역', () => {
  test.describe.configure({ retries: 2 });

  test('가끔 실패하는 테스트', async ({ page }) => {
    // ...
  });
});
```
