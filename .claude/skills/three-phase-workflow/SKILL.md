---
name: three-phase-workflow
description: Systematic 3-phase workflow for bug fixes and feature implementation. Ensures thorough codebase exploration, detailed planning, and quality implementation. Use when fixing bugs or implementing complex features.
allowed-tools: Read, Grep, Glob, Bash, Edit
model: inherit
---

# Three-Phase Workflow Skill

체계적인 3단계 워크플로우를 통해 고품질의 버그 수정 및 기능 구현을 보장하는 Skill입니다.

---

## Core Directive

For EVERY task request, you MUST follow the three-phase process below in exact order. Each phase must be completed with expert-level precision and detail.

---

## Guiding Principles

- **Minimalistic Approach**: Implement high-quality, clean solutions while avoiding unnecessary complexity
- **Expert-Level Standards**: Every output must meet professional software engineering standards
- **Concrete Results**: Provide specific, actionable details at each step

---

## Phase 1: Codebase Exploration & Analysis

**목적**: 작업에 필요한 모든 컨텍스트를 수집하고 프로젝트의 패턴을 이해합니다.

### REQUIRED ACTIONS

#### 1. Systematic File Discovery
- List ALL potentially relevant files, directories, and modules
- Search for related keywords, functions, classes, and patterns
- Examine each identified file thoroughly

```bash
# Example commands to use
grep -r "keyword" src/
find src/ -name "*Component.tsx"
git log --oneline -10 --name-only
```

#### 2. Convention & Style Analysis
- Document coding conventions (naming, formatting, architecture patterns)
- Identify existing code style guidelines
- Note framework/library usage patterns
- Catalog error handling approaches

### OUTPUT FORMAT

```markdown
### Codebase Analysis Results

**Relevant Files Found:**
- [file_path]: [brief description of relevance]
- [file_path]: [brief description of relevance]

**Code Conventions Identified:**
- Naming: [convention details]
- Architecture: [pattern details]
- Styling: [format details]
- Error Handling: [approach details]

**Key Dependencies & Patterns:**
- [library/framework]: [usage pattern]
- [library/framework]: [usage pattern]
```

---

## Phase 2: Implementation Planning

**목적**: Phase 1의 발견 사항을 기반으로 상세한 구현 로드맵을 작성합니다.

### REQUIRED ACTIONS

Based on Phase 1 findings, create a detailed implementation roadmap.

### OUTPUT FORMAT

```markdown
## Implementation Plan

### Module: [Module Name]
**Summary:** [1-2 sentence description of what needs to be implemented]

**Tasks:**
- [ ] [Specific implementation task]
- [ ] [Specific implementation task]
- [ ] [Specific implementation task]

**Acceptance Criteria:**
- [ ] [Measurable success criterion]
- [ ] [Measurable success criterion]
- [ ] [Performance/quality requirement]

### Module: [Next Module Name]
[Repeat structure above]
```

---

## Phase 3: Implementation Execution

**목적**: Phase 2의 계획에 따라 실제 코드를 작성하고 검증합니다.

### REQUIRED ACTIONS

1. Implement each module following the plan from Phase 2
2. Verify ALL acceptance criteria are met before proceeding
3. Ensure code adheres to conventions identified in Phase 1

### QUALITY GATES

Before marking any task complete, verify:

- [ ] All acceptance criteria validated
- [ ] Code follows established conventions
- [ ] Minimalistic approach maintained
- [ ] Expert-level implementation standards met
- [ ] TypeScript type checking passes
- [ ] ESLint rules satisfied
- [ ] Existing tests pass (if applicable)
- [ ] No regressions introduced

### Implementation Example

```typescript
// ❌ Before (Issue found in Phase 1)
{mappedGoodsItems && <MappedGoodsTable items={mappedGoodsItems} />}

// ✅ After (Phase 2 plan + Phase 3 implementation)
{mappedGoodsItems?.length > 0 && (
  <MappedGoodsTable items={mappedGoodsItems} />
)}

// Or more explicit type safety
{Array.isArray(mappedGoodsItems) && mappedGoodsItems.length > 0 && (
  <MappedGoodsTable items={mappedGoodsItems} />
)}
```

---

## Success Validation

Before completing any task, confirm:

- ✅ All three phases completed sequentially
- ✅ Each phase output meets specified format requirements
- ✅ Implementation satisfies all acceptance criteria
- ✅ Code quality meets professional standards
- ✅ All quality gates passed
- ✅ No regressions confirmed

---

## Response Structure

Always structure your response as:

```markdown
## Phase 1: Codebase Analysis Results
[Exploration and analysis findings]

## Phase 2: Implementation Plan
[Detailed roadmap with modules, tasks, and acceptance criteria]

## Phase 3: Implementation & Validation
[Actual code + verification results]

## Final Verification
- ✅ [Acceptance criterion 1]
- ✅ [Acceptance criterion 2]
- ✅ [Quality gate passed]
```

---

## Summary

이 3단계 워크플로우는 다음을 보장합니다:

1. **Thorough Analysis** - Complete context through systematic exploration
2. **Clear Planning** - Direction and acceptance criteria established upfront
3. **Quality Implementation** - Professional standards maintained throughout

Always follow this sequence for high-quality bug fixes and feature implementations.
