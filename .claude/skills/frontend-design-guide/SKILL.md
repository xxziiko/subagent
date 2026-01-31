---
name: frontend-design-guide
description: "컨벤션 적용", "코드 리뷰", "분석", "개선", "적용" 요청 시 사용. Frontend design principles and coding standards. Readability, predictability, cohesion, and low coupling.
allowed-tools: Read, Edit, Write
model: inherit
---

# Frontend Design Guide Skill

프론트엔드 코드 작성 원칙을 정의합니다. 모든 React/TypeScript 코드는 다음 4가지 핵심 원칙을 따라야 합니다.

**전체 가이드라인:** [GUIDELINES.md](GUIDELINES.md)를 참조하세요.

---

## 핵심 원칙 요약

### 1. Readability (가독성)

코드를 명확하고 이해하기 쉽게 작성합니다.

#### 체크리스트

- [ ] **Magic Number 제거**: 숫자 상수는 명명된 변수로 추출

  ```typescript
  const ANIMATION_DELAY_MS = 300;
  await delay(ANIMATION_DELAY_MS);
  ```

- [ ] **구현 세부사항 추상화**: 복잡한 로직은 별도 컴포넌트/HOC로 분리

  ```tsx
  // AuthGuard로 인증 로직 추상화
  <AuthGuard>
    <LoginPage />
  </AuthGuard>
  ```

- [ ] **조건부 렌더링 분리**: 크게 다른 UI는 별도 컴포넌트로 분리

  ```tsx
  return isViewer ? <ViewerButton /> : <AdminButton />;
  ```

- [ ] **복잡한 삼항 연산자 단순화**: IIFE나 if/else 사용

  ```typescript
  const status = (() => {
    if (ACondition && BCondition) return 'BOTH';
    if (ACondition) return 'A';
    return 'NONE';
  })();
  ```

- [ ] **간단한 로직은 인라인 배치**: 컨텍스트 스위칭 최소화

  ```tsx
  // 간단한 policy는 컴포넌트 내부에 정의
  const policy = { admin: { canEdit: true }, viewer: { canEdit: false } }[role];
  ```

- [ ] **복잡한 조건식 명명**: 의미를 명확히 하는 변수명 사용
  ```typescript
  const isSameCategory = product.categories.some((c) => c.id === targetId);
  const isPriceInRange = price >= min && price <= max;
  return isSameCategory && isPriceInRange;
  ```

---

### 2. Predictability (예측 가능성)

코드의 이름과 시그니처만으로 동작을 예측할 수 있게 합니다.

#### 체크리스트

- [ ] **일관된 반환 타입**: 유사한 함수는 동일한 타입 반환

  ```typescript
  // React Query hooks는 항상 UseQueryResult 반환
  function useUser(): UseQueryResult<User, Error> { ... }

  // Validation 함수는 항상 ValidationResult 반환
  type ValidationResult = { ok: true } | { ok: false; reason: string };
  ```

- [ ] **숨겨진 로직 제거 (SRP)**: 함수는 이름이 시사하는 것만 수행

  ```typescript
  // ❌ 나쁜 예: fetchBalance가 logging도 함
  async function fetchBalance() {
    const balance = await http.get('...');
    logging.log('fetched'); // 숨겨진 side effect
    return balance;
  }

  // ✅ 좋은 예: 각 책임 분리
  async function handleClick() {
    const balance = await fetchBalance();
    logging.log('fetched'); // 명시적
  }
  ```

- [ ] **명확하고 고유한 이름**: 래퍼 함수는 구체적 이름 사용
  ```typescript
  // ❌ 나쁜 예: http (원본과 혼동)
  // ✅ 좋은 예: httpService.getWithAuth (명확한 의도)
  ```

---

### 3. Cohesion (응집도)

관련된 코드를 함께 배치하고 모듈이 단일 목적을 갖도록 합니다.

#### 체크리스트

- [ ] **Form 응집도 고려**: 필드 레벨 vs 폼 레벨 선택

  - **필드 레벨**: 독립적 검증, 비동기 체크, 재사용 가능한 필드
  - **폼 레벨**: 관련 필드들, 위저드 폼, 상호 의존적 검증

- [ ] **기능/도메인별 구조화**: 타입이 아닌 기능으로 디렉토리 구성

  ```
  src/
  ├── domains/
  │   ├── user/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   └── utils/
  │   └── order/
  ```

- [ ] **상수는 로직과 함께**: Magic number를 관련 로직 근처에 정의
  ```typescript
  const ANIMATION_DELAY_MS = 300; // 애니메이션 관련 함수 근처 정의
  ```

---

### 4. Coupling (결합도)

컴포넌트 간 의존성을 최소화합니다.

#### 체크리스트

- [ ] **조기 추상화 지양**: 유즈케이스가 분화될 가능성이 있으면 중복 허용

  - 진짜 동일하고 계속 동일할 로직만 추상화
  - 불확실하면 중복을 유지하는 것이 낫다

- [ ] **상태 관리 범위 제한**: 넓은 hook은 작고 집중된 hook으로 분리

  ```typescript
  // ❌ 나쁜 예: 모든 query param을 하나의 hook에서
  // ✅ 좋은 예: 각 param마다 별도 hook
  function useCardIdQueryParam() { ... }
  function useDateRangeQueryParam() { ... }
  ```

- [ ] **Props Drilling 제거**: Component Composition 활용

  ```tsx
  // ❌ 나쁜 예: 중간 컴포넌트가 불필요하게 props 전달
  <Modal><Body keyword={k} items={i} /></Modal>

  // ✅ 좋은 예: 직접 조합
  <Modal>
    <Input value={keyword} onChange={setKeyword} />
    <List items={items} />
  </Modal>
  ```

---

## 코드 작성 시 적용 방법

### 새로운 컴포넌트 작성 시

1. **구조 설계**

   - 복잡한 로직은 별도 컴포넌트로 추상화
   - Props drilling이 발생하면 composition 고려
   - 조건부 렌더링이 복잡하면 컴포넌트 분리

2. **상태 관리**

   - 각 상태는 필요한 최소 범위에서만 관리
   - 관련 없는 상태는 별도 hook으로 분리
   - Form은 요구사항에 맞게 field-level/form-level 선택

3. **가독성 체크**
   - Magic number는 명명된 상수로
   - 복잡한 조건식은 변수로 추출
   - 삼항 연산자가 중첩되면 if/else나 IIFE로 변경

### 기존 코드 수정 시

1. **변경 범위 최소화**

   - 불필요한 추상화 추가 지양
   - 유사한 패턴 유지
   - 조기 추상화 경계

2. **일관성 유지**

   - 같은 도메인의 기존 패턴 따르기
   - 반환 타입 일관성 유지
   - 네이밍 컨벤션 준수

3. **응집도 개선**
   - 관련 로직은 함께 배치
   - 상수는 사용처 근처에 정의
   - 도메인별 구조 유지

---

## 리뷰 체크리스트

코드 작성 후 다음을 자가 점검:

### Readability

- [ ] 모든 magic number가 명명되었는가?
- [ ] 복잡한 로직이 적절히 추상화되었는가?
- [ ] 조건부 렌더링이 명확한가?
- [ ] 복잡한 조건식이 변수로 추출되었는가?

### Predictability

- [ ] 함수 이름이 동작을 정확히 설명하는가?
- [ ] 반환 타입이 일관적인가?
- [ ] 숨겨진 side effect가 없는가?

### Cohesion

- [ ] 관련 코드가 함께 배치되었는가?
- [ ] 각 모듈이 단일 책임을 갖는가?
- [ ] Form 구조가 요구사항에 적합한가?

### Coupling

- [ ] Props drilling이 없는가?
- [ ] 조기 추상화를 하지 않았는가?
- [ ] 상태 관리 범위가 적절한가?

---

## 참고 자료

- **전체 가이드라인**: [GUIDELINES.md](GUIDELINES.md)
- **프로젝트 컨텍스트**: 프로젝트 루트의 CLAUDE.md
- **기존 코드**: 같은 도메인의 기존 컴포넌트/hook 참조

---

## 요약: 코드 작성 전 자문하기

1. **이 코드를 3개월 후에 봐도 쉽게 이해할 수 있는가?** (Readability)
2. **함수/컴포넌트 이름만 봐도 동작을 예측할 수 있는가?** (Predictability)
3. **관련된 것들이 함께 있고, 각자 명확한 책임을 갖는가?** (Cohesion)
4. **불필요한 의존성이 없고, 독립적으로 변경 가능한가?** (Coupling)

이 4가지 질문에 모두 "예"라면 좋은 코드입니다!
