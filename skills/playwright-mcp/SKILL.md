---
name: playwright-mcp
description: Playwright MCP 브라우저 자동화 도구 레퍼런스. MCP 도구 목록, Reconnaissance-Then-Action 패턴, DevTools MCP 협력 패턴, 버그 재현/검증 워크플로우 제공.
---

# Playwright MCP — 브라우저 자동화 도구 레퍼런스

Playwright MCP를 통해 에이전트가 브라우저를 직접 조작하는 방법을 정의합니다.
CLI 테스트 실행/디버깅은 `playwright-e2e` 스킬 참조.

---

## MCP 도구 레퍼런스

| 도구 | 용도 | 활용 시점 |
| --- | --- | --- |
| `browser_navigate` | URL로 페이지 이동 | 재현/검증 시작 |
| `browser_snapshot` | 접근성 트리 스냅샷 (DOM 상태 파악) | 셀렉터 식별, 상태 확인 |
| `browser_screenshot` | 시각적 상태 캡처 | 증거 수집, 전후 비교 |
| `browser_click` | 요소 클릭 (ref 기반) | 인터랙션 재현 |
| `browser_type` | 텍스트 입력 (ref 기반) | 폼 입력 재현 |
| `browser_hover` | 요소 호버 | 호버 관련 버그 재현 |
| `browser_select_option` | 드롭다운 선택 | 선택 관련 버그 재현 |
| `browser_press_key` | 키보드 입력 | 키보드 이벤트 재현 |
| `browser_console_messages` | 브라우저 콘솔 메시지 수집 | 런타임 에러 수집 |
| `browser_network_requests` | 네트워크 요청/응답 수집 | API 에러 확인 |
| `browser_evaluate` | JavaScript 실행 | 런타임 상태 검사 |
| `browser_wait` | 지정 시간 대기 | 비동기 작업 대기 |

---

## Reconnaissance-Then-Action 패턴 (MCP 버전)

동적 웹앱에서 브라우저를 조작할 때 **반드시** 이 순서를 따릅니다.

```
1. browser_navigate → 대상 페이지 이동
2. browser_wait → 페이지 로드 대기 (JS 렌더링 완료까지)
3. browser_snapshot → 접근성 트리로 현재 요소/ref 확인
4. browser_screenshot → 시각적 상태 확인 (선택)
5. browser_click / browser_type → 발견한 ref로 액션 실행
```

> **주의**: `browser_snapshot` 전에 충분한 대기 시간을 두지 않으면 JS 렌더링 전의 빈 상태를 보게 됩니다.

---

## DevTools MCP + Playwright MCP 협력 패턴

두 MCP는 역할이 다릅니다:
- **DevTools MCP**: 관찰 (수동적) — 실행 중인 브라우저의 상태를 읽어옴
- **Playwright MCP**: 행동 (능동적) — 브라우저를 자동으로 조작

### 협력 워크플로우

```
1. DevTools MCP로 에러 포착 → 에러 메시지/스택 트레이스 획득
2. 코드 탐색으로 원인 추적
3. Playwright MCP로 재현 자동화:
   - browser_navigate → browser_snapshot → browser_click/type
   - 동시에 DevTools MCP로 런타임 상태 관찰
4. 수정 구현
5. Playwright MCP로 수정 검증:
   - 동일 시나리오 재실행 → browser_screenshot으로 전후 비교
   - browser_console_messages로 에러 사라짐 확인
   - DevTools MCP로 추가 검증
```

---

## 버그 재현 워크플로우

Playwright MCP 도구로 브라우저를 직접 조작하여 버그를 재현합니다.

```
1. browser_navigate → 버그 발생 페이지로 이동
2. browser_snapshot → 접근성 트리로 현재 DOM 상태 파악
3. browser_screenshot → 시각적 상태 캡처 (Reconnaissance)
4. browser_click / browser_type → 버그 재현 시나리오 실행
5. browser_console_messages → 콘솔 에러 수집
6. browser_network_requests → 실패한 네트워크 요청 확인
```

---

## 수정 검증 워크플로우

코드 수정 후 동일 시나리오를 재실행하여 버그가 해결되었는지 확인합니다.

```
1. browser_navigate → 수정된 페이지로 이동
2. browser_wait → 개발 서버 반영 대기
3. browser_snapshot + browser_screenshot → 수정 후 상태 확인
4. browser_console_messages → 새로운 에러가 없는지 확인
5. browser_network_requests → API 요청이 정상인지 확인
6. 동일 재현 시나리오 재실행 → 에러가 사라졌는지 검증
```
