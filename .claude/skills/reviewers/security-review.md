---
name: security-review
description: 프론트엔드 보안 취약점 리뷰 스킬. 인증, 권한, 입력 검증, XSS, 민감 데이터 처리 등 검토. 보안 관련 코드 변경 시 자동 적용.
---

# Security Review

프론트엔드 보안 취약점을 검토합니다.

---

## 🔴 Critical 체크 (반드시 검토)

### 1. 시크릿 노출

```typescript
// 🔴 Critical - 하드코딩된 시크릿
const API_KEY = 'sk-1234567890abcdef';
const SECRET = process.env.NEXT_PUBLIC_SECRET_KEY;  // 클라이언트 노출

// ✅ 올바른 패턴
// API 키는 서버 사이드에서만 사용
// 클라이언트에서 필요시 프록시 API 사용
```

**검색 패턴:**
```bash
grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" --include="*.ts" --include="*.tsx"
grep -r "sk-\|pk_\|secret_" --include="*.ts" --include="*.tsx"
```

### 2. XSS (Cross-Site Scripting)

```typescript
// 🔴 Critical - dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// 🔴 Critical - eval 사용
eval(userCode);
new Function(userCode)();

// ✅ 올바른 패턴
// HTML 필요시 DOMPurify 사용
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// 또는 텍스트로 렌더링
<div>{userInput}</div>  // React가 자동 이스케이프
```

### 3. URL/경로 조작

```typescript
// 🔴 Critical - 검증 없는 리다이렉트
window.location.href = userInput;
router.push(params.redirect);

// ✅ 올바른 패턴
const ALLOWED_PATHS = ['/dashboard', '/orders', '/profile'];
if (ALLOWED_PATHS.includes(redirectPath)) {
  router.push(redirectPath);
}

// 또는 화이트리스트 검증
function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}
```

---

## 🟡 Warning 체크 (주의 필요)

### 4. 인증 토큰 처리

```typescript
// ⚠️ 위험 - localStorage에 민감 데이터
localStorage.setItem('authToken', token);
localStorage.setItem('refreshToken', refreshToken);

// ✅ 권장 패턴
// httpOnly 쿠키 사용 (서버 설정)
// 또는 메모리에만 저장 (새로고침 시 재인증)

// ⚠️ 주의 - 토큰을 URL에 포함
`/api/orders?token=${authToken}`

// ✅ Authorization 헤더 사용
fetch('/api/orders', {
  headers: { 'Authorization': `Bearer ${authToken}` }
})
```

### 5. 입력 검증

```typescript
// ⚠️ 위험 - 클라이언트만 검증
const handleSubmit = (data: FormData) => {
  if (isValidEmail(data.email)) {
    submitToServer(data);
  }
};

// ✅ 올바른 패턴
// 클라이언트 검증 + 서버 검증 필수
// 클라이언트 검증은 UX용, 보안은 서버에서
const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});
```

### 6. API 요청 보안

```typescript
// ⚠️ 주의 - CORS 설정
fetch('https://api.example.com', {
  mode: 'no-cors',  // 응답 데이터 접근 불가, 의도된 건지 확인
});

// ⚠️ 주의 - credentials 설정
fetch('/api/data', {
  credentials: 'include',  // 쿠키 전송, CSRF 고려 필요
});
```

---

## 🟢 Suggestion 체크

### 7. 권한 체크 위치

```typescript
// ⚠️ 개선 가능 - 컴포넌트 내부에서 권한 체크
function AdminPanel() {
  const { user } = useUser();
  if (!user.isAdmin) return <AccessDenied />;
  return <AdminContent />;
}

// ✅ 더 나은 패턴 - 라우터/가드 레벨
<Route 
  path="/admin" 
  element={
    <RequireAuth roles={['admin']}>
      <AdminPanel />
    </RequireAuth>
  } 
/>
```

### 8. 에러 메시지

```typescript
// ⚠️ 위험 - 상세한 에러 노출
catch (error) {
  setError(`Database error: ${error.message}`);
  // SQL 에러, 스택 트레이스 등 노출 가능
}

// ✅ 올바른 패턴
catch (error) {
  console.error(error);  // 개발자 콘솔용
  setError('요청을 처리할 수 없습니다. 다시 시도해주세요.');
}
```

### 9. 의존성 보안

```typescript
// package.json 변경 시 확인
// - 새 의존성의 보안 취약점
// - npm audit 실행 권장
// - 알려진 취약 버전 사용 여부
```

---

## 파일 유형별 주의점

### 인증 관련 파일

```
src/auth/*
src/hooks/useAuth*
src/contexts/AuthContext*
```

- 토큰 저장 방식
- 세션 만료 처리
- 자동 로그아웃

### API 호출 파일

```
src/services/*
src/api/*
*.graphql
```

- 인증 헤더 포함 여부
- 민감 데이터 요청/응답
- 에러 처리

### 폼 관련 파일

```
src/components/*Form*
src/pages/*Form*
```

- 입력 검증
- 민감 데이터 마스킹
- 제출 전 확인

---

## 보안 리뷰 체크리스트

### 🔴 Critical (머지 블로킹)

- [ ] 하드코딩된 시크릿 없음
- [ ] dangerouslySetInnerHTML 사용 시 sanitize
- [ ] eval/Function 생성자 미사용
- [ ] 검증 없는 리다이렉트 없음

### 🟡 Warning (수정 권장)

- [ ] 민감 데이터 localStorage 저장 지양
- [ ] 토큰 URL 파라미터 전송 지양
- [ ] 적절한 입력 검증
- [ ] 상세 에러 메시지 미노출

### 🟢 Suggestion (고려)

- [ ] 권한 체크 적절한 레벨에서 수행
- [ ] CSP 헤더 설정 고려
- [ ] 의존성 보안 취약점 확인

---

## 보안 이슈 리포트 형식

```markdown
### 🔴 [SECURITY] XSS 취약점

**파일**: src/components/Comment.tsx:45
**유형**: XSS (Cross-Site Scripting)

**문제 코드:**
```tsx
<div dangerouslySetInnerHTML={{ __html: comment.content }} />
```

**위험**: 사용자 입력이 그대로 렌더링되어 스크립트 실행 가능

**공격 시나리오:**
1. 공격자가 `<script>document.cookie</script>` 포함 댓글 작성
2. 다른 사용자가 해당 페이지 방문
3. 스크립트 실행으로 세션 탈취

**수정안:**
```tsx
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }} />
```

**영향도**: 🔴 Critical - 즉시 수정 필요
```
