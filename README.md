# claude-subagent

Claude Code에서 사용할 수 있는 재사용 가능한 에이전트와 스킬 모음.
코드 리뷰, 버그 수정, PR 생성 등 개발 워크플로우를 자동화합니다.

## Agents

### code-reviewer

React/TypeScript 프로젝트를 위한 코드 리뷰 전문 에이전트.

- PR 리뷰, 파일 리뷰, git diff 분석, 커밋 리뷰
- 품질, 보안, 성능, 모범 사례 기반 리뷰
- 5단계 워크플로우 (브랜치 확인 → 컨텍스트 이해 → 스킬 선택 → 상세 리뷰 → 셀프 검증)
- 트리거: `/review`, `코드 리뷰 해줘`, `분석 해줘`, `리뷰 해줘`

### bug-fixer

Chrome DevTools + Playwright 기반 end-to-end 버그 수정 파이프라인.

- 에러 캡처 → 코드 탐색 → 근본 원인 분석 → 최소 수정 → E2E 검증
- 분석 모드 / 수정 모드 분기 지원
- 3-체크포인트 파이프라인 (분석 → 수정 & 검증 → 커밋 & PR)
- 트리거: `버그`, `에러`, `디버깅`, `fix`, `debug`

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

### Development Skills

| 스킬 | 설명 |
|------|------|
| `coding-style-guide` | 14가지 코딩 원칙 (클린 코드, 네이밍, 타입 안전성 등) |
| `create-pr` | 변경점 분석 후 PR 자동 생성 (Mermaid 다이어그램 포함) |
| `git-diff-review` | git diff 기반 코드 분석 |
| `react-performance` | React 렌더링 최적화 가이드 |
| `playwright-e2e` | Playwright E2E 테스트 실행, 디버깅, 버그 재현 가이드 |
| `frontend-design-guide` | 프론트엔드 설계 원칙 (가독성, 예측가능성, 응집도, 결합도) |
| `three-phase-workflow` | 3단계 워크플로우 패턴 (탐색 → 계획 → 구현) |

### Project-specific Skills

| 스킬 | 설명 |
|------|------|
| `project/sirloin-oms` | Sirloin OMS 기술 스택 및 컨벤션 |
| `project/sirloin-oms-graphql` | GraphQL, Apollo Client 패턴 |

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
│   ├── code-reviewer.md
│   └── bug-fixer.md
├── skills/                     # Modular skills
│   ├── shared/                 # Cross-agent shared skills
│   ├── reviewers/              # Domain-specific review skills
│   ├── project/                # Project-specific context
│   ├── coding-style-guide/
│   ├── create-pr/
│   ├── frontend-design-guide/
│   ├── git-diff-review/
│   ├── playwright-e2e/
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
