# claude-subagent

Claude Code에서 사용할 수 있는 재사용 가능한 에이전트와 스킬 모음.
코드 리뷰, 버그 수정, PR 생성 등 개발 워크플로우를 자동화합니다.

## Agents

| 에이전트 | 설명 | 커맨드 |
|----------|------|--------|
| `code-reviewer` | React/TypeScript 코드 리뷰 전문가. PR/파일/diff/커밋 리뷰 | `/reviewer` |
| `bug-fixer` | Chrome DevTools + Playwright MCP 기반 E2E 버그 수정 파이프라인 | `/bug-fix` |
| `e2e-tester` | Playwright E2E 테스트 작성 전문가. 시나리오 설계, POM, `page.route()` Mock | `/e2e-test` |
| `integration-tester` | TDD 기반 통합 테스트 전문가. Vitest + RTL + MSW | `/integration-test` |
| `domain-modeler` | DDD 기반 도메인 분석 전문가. 바운디드 컨텍스트, 엔티티, 도메인 이벤트 매핑 | `/domain-modeler` |
| `wms-expert` | WMS(창고관리) 도메인 구현 전문가. 재고, 입고, 로케이션 등 7개 하위 도메인 | `/wms-expert` |
| `maestro` | 오케스트레이터. 여러 에이전트를 조합하여 복합 작업 수행 | `/maestro` |

## Skills

### Review Skills

| 스킬 | 설명 |
|------|------|
| `shared/review-checklist` | 코드 품질, 보안, 성능, 테스트 체크리스트 |
| `shared/review-format` | 리뷰 결과 출력 포맷 템플릿 |
| `reviewers/react-patterns` | React 컴포넌트 구조, Hook 패턴 검증 |
| `reviewers/typescript-strict` | TypeScript 타입 안전성 검증 |
| `reviewers/security-review` | 보안 취약점 검사 |
| `reviewers/performance-review` | 성능 최적화 검토 |

### Testing Skills

| 스킬 | 설명 |
|------|------|
| `playwright-e2e` | Playwright E2E 테스트 실행, 디버깅, CLI 명령어 가이드 |
| `playwright-mcp` | Playwright MCP 브라우저 자동화 도구 레퍼런스, DevTools MCP 협력 패턴 |
| `playwright-test-patterns` | E2E 테스트 작성 패턴. POM, Fixture, `page.route()` GraphQL Mock, 시나리오 설계 |
| `integration-test-patterns` | 통합 테스트 작성 패턴. Vitest + RTL + MSW 기반 TDD 워크플로우 |

### Development Skills

| 스킬 | 설명 |
|------|------|
| `coding-style-guide` | 14가지 코딩 원칙 (클린 코드, 네이밍, 타입 안전성 등) |
| `create-pr` | 변경점 분석 후 PR 자동 생성 |
| `commit` | 커밋 컨벤션에 맞는 커밋 생성 |
| `git-diff-review` | git diff 기반 코드 분석 |
| `react-performance` | React 렌더링 최적화 가이드 |
| `three-phase-workflow` | 3단계 워크플로우 패턴 (탐색 → 계획 → 구현) |

### Project-specific Skills

| 스킬 | 설명 |
|------|------|
| `project/sirloin-oms` | Sirloin OMS 기술 스택 및 컨벤션 |
| `project/sirloin-oms-graphql` | GraphQL, Apollo Client 패턴 |
| `project/sirloin-oms-graphql-enforcement` | GraphQL 스타일 가이드 강화 체크리스트 |

> Project-specific 스킬은 특정 프로젝트에 종속적이므로 기본 설치에서 제외됩니다.

## Scripts

| 스크립트 | 설명 |
|----------|------|
| `scripts/bug-context.sh` | 버그 파일의 변경 이력, 의존성, 관련 테스트 수집 |
| `scripts/verify.sh` | 타입 체크 → 빌드 → E2E 검증 파이프라인 |

## Installation

### npx (권장)

```bash
npx claude-subagent init
```

Interactive하게 에이전트와 스킬을 선택하여 설치합니다.
기본적으로 레포를 `.subagent/`에 clone하고 symlink로 연결하므로, 업데이트가 간편합니다.

#### Options

```bash
# non-interactive 설치
npx claude-subagent init --agents code-reviewer,bug-fixer --scripts

# 파일 복사 모드 (symlink 대신 복사)
npx claude-subagent init --copy

# project-specific 스킬 포함
npx claude-subagent init --project-skills

# 특정 디렉토리에 설치
npx claude-subagent init --target ./my-project

# 커스텀 레포 URL
npx claude-subagent init --repo https://github.com/xxziiko/subagent.git
```

### Available Commands

```bash
# 사용 가능한 에이전트/스킬 목록 및 설치 상태 확인
npx claude-subagent list

# 최신 버전으로 업데이트 (git pull)
npx claude-subagent update
```

## How It Works

### Symlink Mode (default)

```
your-project/
├── .subagent/                  ← git clone (source of truth)
│   └── .claude/
│       ├── agents/
│       └── skills/
├── .claude/
│   ├── agents/
│   │   └── code-reviewer.md   → symlink to .subagent/
│   ├── skills/
│   │   ├── shared/            → symlink to .subagent/
│   │   └── reviewers/         → symlink to .subagent/
│   ├── settings.local.json    ← your project config (untouched)
│   └── hooks.json             ← your project config (untouched)
```

- `.subagent/`에서 `git pull`하면 symlink를 통해 자동 반영
- `settings.local.json`, `hooks.json`은 절대 덮어쓰지 않음

### Copy Mode (`--copy`)

파일을 직접 복사합니다. 독립적으로 수정 가능하지만 업데이트 시 다시 복사해야 합니다.

## Customization

### 에이전트 커스터마이즈

Copy 모드로 설치한 후 `.claude/agents/*.md`를 직접 수정할 수 있습니다.
Symlink 모드에서는 원본 레포를 fork하여 수정하세요.

### 프로젝트별 스킬 추가

`.claude/skills/project/` 디렉토리에 프로젝트 전용 스킬을 추가할 수 있습니다:

```markdown
---
name: my-project-context
description: My project tech stack and conventions
---

# My Project Context

- Tech Stack: ...
- Conventions: ...
```

### 설정 파일

`settings.local.json`으로 도구 권한을 제어합니다:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm run check-types:*)",
      "Bash(pnpm run build:*)"
    ]
  }
}
```

## Project Structure

```
.claude/
├── agents/                     # Agent definitions
│   ├── bug-fixer.md
│   ├── code-reviewer.md
│   ├── domain-modeler.md
│   ├── e2e-tester.md
│   ├── integration-tester.md
│   ├── maestro.md
│   └── wms-expert.md
├── skills/                     # Modular skills
│   ├── shared/                 # Cross-agent shared skills
│   ├── reviewers/              # Domain-specific review skills
│   ├── project/                # Project-specific context
│   ├── coding-style-guide/
│   ├── commit/
│   ├── create-pr/
│   ├── git-diff-review/
│   ├── integration-test-patterns/
│   ├── playwright-e2e/
│   ├── playwright-mcp/
│   ├── playwright-test-patterns/
│   ├── react-performance/
│   └── three-phase-workflow/
scripts/                        # Utility scripts
bin/                            # CLI entrypoint
lib/                            # CLI core logic
templates/                      # Config file templates
```

## Contributing

### 에이전트 추가

`.claude/agents/`에 markdown 파일을 추가합니다:

```markdown
---
name: my-agent
description: What this agent does
tools: Read, Grep, Glob
skills: shared/review-checklist, my-skill
---

# My Agent

Instructions for the agent...
```

### 스킬 추가

단일 파일 스킬:
```
.claude/skills/reviewers/my-review.md
```

디렉토리 스킬 (여러 파일):
```
.claude/skills/my-skill/
├── SKILL.md          # Required
└── GUIDELINES.md     # Optional supporting files
```

## License

MIT
