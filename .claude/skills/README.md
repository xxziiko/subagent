# Code Reviewer Skill Ecosystem

AI 에이전트를 위한 모듈형 코드 리뷰 스킬 생태계입니다.

> **설계 원칙**: [AI 에이전트를 위한 좋은 스펙 작성법](https://addyosmani.com/blog/good-spec/) 기반

---

## 🎯 핵심 개선사항

기존 단일 에이전트 → **모듈형 스킬 생태계**로 리팩토링

| 원칙 | 적용 |
|------|------|
| **3단계 경계 시스템** | ✅항상 / ⚠️먼저 문의 / 🚫절대 금지 |
| **모듈화** | 공유 스킬 + 도메인별 스킬로 분리 |
| **자체 검증** | 리뷰 완료 후 검증 단계 추가 |
| **컨텍스트 관리** | 필요한 스킬만 선택적 로드 |

---

## 📁 폴더 구조

```
skills/
├── shared/                    # 공유 스킬 (재사용)
│   ├── review-checklist.md    # 검토 체크리스트
│   └── review-format.md       # 출력 형식 템플릿
│
├── reviewers/                 # 도메인별 리뷰 스킬
│   ├── react-patterns.md      # React 패턴 검토
│   ├── typescript-strict.md   # TypeScript 타입 안전성
│   ├── security-review.md     # 보안 취약점 검토
│   └── performance-review.md  # 성능 최적화 검토
│
├── coding-style-guide/        # 코드 스타일 가이드 (범용)
├── frontend-design-guide/     # 프론트엔드 설계 원칙 (범용)
├── react-performance/         # React 성능 최적화 (범용)
├── three-phase-workflow/       # 3단계 워크플로우 (범용)
├── create-pr/                 # PR 생성 (범용)
├── git-diff-review/           # Git diff 리뷰 (범용)
│
└── project/                   # 프로젝트 특화
    ├── sirloin-oms.md         # Sirloin OMS 컨텍스트
    ├── sirloin-oms-graphql.md # Sirloin OMS GraphQL 패턴
    └── playwright-e2e.md      # Playwright E2E 테스트/디버깅
```

---

## 🔄 워크플로우

```
사용자 요청: "PR 리뷰해줘"
        │
        ▼
┌─────────────────────────────┐
│   code-reviewer (에이전트)   │
│   ├─ Phase 1: 컨텍스트 파악  │
│   ├─ Phase 2: 스킬 선택      │
│   ├─ Phase 3: 상세 리뷰      │
│   └─ Phase 4: 자체 검증      │
└─────────────────────────────┘
        │
        ├──▶ shared/review-checklist (항상)
        ├──▶ shared/review-format (항상)
        │
        ├──▶ reviewers/react-patterns (.tsx 파일)
        ├──▶ reviewers/typescript-strict (.ts 파일)
        ├──▶ reviewers/security-review (인증 관련)
        ├──▶ reviewers/performance-review (리스트/대량 데이터)
        │
        └──▶ project/* (프로젝트 특화 컨텍스트)
```

---

## 📋 스킬 상세

### 공유 스킬 (shared/)

| 스킬 | 설명 | 항상 로드 |
|------|------|:--------:|
| `review-checklist` | 품질/보안/성능/테스트 체크리스트 | ✅ |
| `review-format` | 일관된 출력 형식 템플릿 | ✅ |

### 리뷰어 스킬 (reviewers/)

| 스킬 | 트리거 조건 | 검토 영역 |
|------|------------|----------|
| `react-patterns` | `.tsx`, `.jsx` 파일 | 컴포넌트 구조, 훅 사용법, 렌더링 |
| `typescript-strict` | `.ts`, `.tsx` 파일 | any 타입, 타입 정의, 타입 가드 |
| `security-review` | 인증/권한 관련 코드 | XSS, 시크릿, 입력 검증 |
| `performance-review` | 리스트/대량 데이터 | 렌더링 최적화, 번들 사이즈, 메모리 |

### 프로젝트 스킬 (project/)

| 스킬 | 설명 |
|------|------|
| `sirloin-oms` | 기술 스택, 도메인 지식, 컨벤션 요약 |
| `sirloin-oms-graphql` | GraphQL 패턴, Apollo Client, 멀티 스키마 |
| `playwright-e2e` | Playwright E2E 테스트 실행, 디버깅, 버그 재현 |

---

## 🚦 3단계 경계 시스템

### ✅ 항상 (Always Do)

- 변경사항 파악 후 컨텍스트 확인
- 체크리스트 기반 검토
- 심각도별 분류 (🔴→🟡→🟢)
- 수정안과 함께 문제점 제시

### ⚠️ 먼저 문의 (Ask First)

- 아키텍처 수준 변경 제안
- 새로운 패턴/라이브러리 도입 권고
- 대규모 리팩토링 제안
- 비즈니스 로직 관련 의문

### 🚫 절대 금지 (Never Do)

- 코드 직접 수정 (리뷰 모드에서)
- 변경사항 확인 없이 리뷰 진행
- 근거 없는 비판
- 프로젝트 컨벤션 무시한 제안

---

## 💡 사용 예시

### 기본 PR 리뷰
```
사용자: "PR 리뷰해줘"
→ 전체 워크플로우 실행
→ 변경 파일에 맞는 스킬 자동 선택
```

### 특정 영역 리뷰
```
사용자: "보안 관점에서 리뷰해줘"
→ security-review 스킬 집중 적용

사용자: "성능 이슈 있는지 확인해줘"
→ performance-review 스킬 집중 적용
```

### 특정 파일 리뷰
```
사용자: "OrderList.tsx만 리뷰해줘"
→ 해당 파일 + react-patterns 스킬 적용
```

---

## 🔧 확장 방법

### 새로운 리뷰어 스킬 추가

```markdown
---
name: graphql-patterns
description: GraphQL 쿼리/뮤테이션 패턴 리뷰. .graphql 파일 변경 시 자동 적용.
---

# GraphQL Patterns Review

[검토 영역 및 체크리스트]
```

### 새로운 프로젝트 스킬 추가

```markdown
---
name: my-project
description: My Project 특화 컨텍스트.
---

# My Project Context

[기술 스택, 도메인 지식, 컨벤션]
```

---

## 📊 기대 효과

| 영역 | Before | After |
|------|--------|-------|
| 컨텍스트 크기 | 모든 규칙 항상 로드 | 필요한 스킬만 선택 로드 |
| 일관성 | 리뷰마다 다른 형식 | 표준화된 출력 형식 |
| 확장성 | 단일 파일 수정 | 모듈 추가로 확장 |
| 유지보수 | 전체 파악 필요 | 개별 스킬만 수정 |

---

## 🔗 관련 리소스

- [AI 에이전트를 위한 좋은 스펙 작성법](https://addyosmani.com/blog/good-spec/)
- [GitHub: 2,500개 에이전트 파일 분석](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Anthropic: 효과적인 컨텍스트 엔지니어링](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
