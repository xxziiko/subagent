---
name: review-checklist
description: 코드 리뷰 시 적용할 체크리스트 모음. code-reviewer, security-review, performance-review 등 리뷰 관련 에이전트/스킬에서 참조. 품질, 보안, 성능, 테스트, 베스트 프랙티스 영역별 검토 기준 제공.
---

# Review Checklist

리뷰 시 적용할 체크리스트입니다. 모든 항목을 검토할 필요는 없으며, 변경사항과 관련된 항목만 선택적으로 적용합니다.

---

## 1. 코드 품질 (Code Quality)

### 필수 검토
- [ ] 명확한 변수/함수명 (선언적 네이밍)
- [ ] 적절한 구조와 모듈화
- [ ] DRY 원칙 준수 (중복 코드 제거)
- [ ] 복잡도가 낮고 이해하기 쉬운 코드

### TypeScript 특화
- [ ] `any` 타입 사용 최소화
- [ ] 명확한 타입 정의
- [ ] 타입 가드 적절히 사용
- [ ] 제네릭 올바르게 활용

### React 특화
- [ ] 컴포넌트는 `export function` (페이지만 `export default`) → 상세: `reviewers/react-patterns` §1
- [ ] 유틸 함수는 `const` 표현식
- [ ] JSX 반환 함수는 컴포넌트로 분리 → 상세: `reviewers/react-patterns` §4
- [ ] Props는 컴포넌트 관심사만 포함 → 상세: `reviewers/react-patterns` §1
- [ ] 비즈니스 로직은 커스텀 훅으로 추상화 → 상세: `reviewers/react-patterns` §3
- [ ] API 호출 훅(useQuery/useMutation)은 개별 파일로 분리

---

## 2. 보안 (Security)

### 필수 검토
- [ ] 시크릿/API 키 노출 없음
- [ ] 입력값 검증 적절
- [ ] XSS 취약점 없음

### 프론트엔드 특화
- [ ] 민감한 데이터 클라이언트 저장 금지
- [ ] HTTPS 통신 확인
- [ ] 인증 토큰 안전한 처리

---

## 3. 성능 (Performance)

### React 렌더링
- [ ] 불필요한 리렌더링 방지 (memo, useMemo, useCallback)
- [ ] 적절한 의존성 배열
- [ ] 상태 최소화 및 적절한 위치

### 데이터 처리
- [ ] N+1 쿼리 문제 없음
- [ ] 불필요한 반복문 없음
- [ ] 대량 데이터는 가상화 고려

### 번들 사이즈
- [ ] 직접 import 사용 (트리 쉐이킹)
- [ ] 동적 import 고려
- [ ] 불필요한 의존성 추가 없음

---

## 4. 테스트 (Testing)

- [ ] 주요 로직에 테스트 존재
- [ ] 엣지 케이스 처리
- [ ] 에러 시나리오 테스트

---

## 5. 베스트 프랙티스 (Best Practices)

### 설계 원칙
- [ ] 낮은 결합도, 높은 응집도
- [ ] 단일 책임 원칙 (SRP)
- [ ] Props depth 4 이상이면 Context 사용

### 프로젝트 컨벤션
- [ ] index.ts를 통한 re-export 지양 (직접 파일 경로로 import)
- [ ] 파일 500줄 초과 시 분리 고려
- [ ] 구조분해 할당 사용
- [ ] 기존 패턴과 일관성 유지
- [ ] `get~` 접두사 사용 (`calculate~` 지양)

### 가독성 (Readability)
- [ ] Magic number 제거 (명명된 상수)
- [ ] 복잡한 조건식 변수로 추출
- [ ] 복잡한 삼항 연산자 단순화

### 예측 가능성 (Predictability)
- [ ] 일관된 반환 타입
- [ ] 숨겨진 side effect 없음
- [ ] 함수명이 동작을 정확히 설명

---

## 심각도 분류 기준

### 🔴 Critical (반드시 수정)
- 보안 취약점
- 런타임 에러 가능성
- 데이터 손실/무결성 위험
- 명백한 버그

### 🟡 Warning (수정 권장)
- 성능 이슈
- 유지보수성 문제
- 테스트 누락
- 컨벤션 위반 (중요)

### 🟢 Suggestion (고려사항)
- 코드 스타일 개선
- 리팩토링 기회
- 문서화 개선
- 더 나은 패턴 제안
