---
name: sirloin-oms-graphql
description: Sirloin OMS 프로젝트 특화 GraphQL 컨벤션. Apollo Client, 쿼리/뮤테이션 네이밍, 타입 패턴, 커스텀 훅, 에러 핸들링, 멀티 스키마(OMS + WMS) 지원.
---

# GraphQL Patterns Skill

Sirloin OMS 프로젝트의 GraphQL 코딩 컨벤션과 패턴을 정의합니다.

---

## 기술 스택

- **GraphQL Client**: Apollo Client v3
- **Code Generation**: GraphQL Code Generator
- **Type System**: TypeScript (Strict Mode)
- **Multi-Schema**: OMS + WMS (2개의 독립적인 GraphQL 스키마)

---

## 파일 구조

```
src/graphql/
├── query/              # OMS 쿼리/뮤테이션 (도메인별로 그룹화)
│   ├── goodsQuery.ts
│   ├── orderQuery.ts
│   └── ...
├── wmsQuery/           # WMS 쿼리/뮤테이션 (도메인별로 그룹화)
│   ├── inventoryQuery.ts
│   └── ...
├── __generated__/
│   ├── graphqlType.ts     # OMS 타입
│   └── wmsGraphqlType.ts  # WMS 타입
└── hooks/              # 커스텀 훅 (모든 쿼리/뮤테이션은 훅으로 래핑)
    ├── goods/
    │   ├── query/
    │   │   ├── useGetAllGoodsQuery.ts
    │   │   └── useGetGoodsByIdQuery.ts
    │   └── mutation/
    │       ├── useCreateGoodsMutation.ts
    │       ├── useUpdateGoodsMutation.ts
    │       └── useDeleteGoodsMutation.ts
    ├── order/
    │   ├── query/
    │   └── mutation/
    └── wms/
        ├── query/
        └── mutation/
```

**중요**:
- 쿼리와 뮤테이션 정의는 도메인별로 같은 파일에 작성 (예: `goodsQuery.ts`)
- 커스텀 훅은 도메인별로 `query/`, `mutation/` 폴더로 구분
- 훅 네이밍: Query는 `use~~Query`, Mutation은 `use~~Mutation`

---

## 네이밍 컨벤션

### GraphQL Operation 네이밍

**Query**: `get` 접두사 + camelCase + 선언적 네이밍

```typescript
// ✅ 올바른 예시
export const GET_ALL_GOODS = gql`
  query getAllGoods {
    getAllGoods {
      isSucceed
      resultMessage
      goodsList { ... }
    }
  }
`;

export const GET_GOODS_BY_ID = gql`
  query getGoodsById($id: ID!) {
    getGoodsById(id: $id) {
      isSucceed
      goods { ... }
    }
  }
`;

// ❌ 잘못된 예시
GetAllGoods  // PascalCase 사용 금지
fetchGoods   // get 접두사 필요
```

**Mutation**: `mutate` 접두사 + camelCase + 동작 동사

```typescript
// ✅ 올바른 예시
export const MUTATE_CREATE_GOODS = gql`
  mutation mutateCreateGoods($input: CreateGoodsInput!) {
    createGoods(input: $input) {
      isSucceed
      resultMessage
    }
  }
`;

export const MUTATE_UPDATE_GOODS = gql`
  mutation mutateUpdateGoods($input: UpdateGoodsInput!) {
    updateGoods(input: $input) {
      isSucceed
      resultMessage
    }
  }
`;

export const MUTATE_DELETE_GOODS = gql`
  mutation mutateDeleteGoods($id: ID!) {
    deleteGoods(id: $id) {
      isSucceed
      resultMessage
    }
  }
`;

// ❌ 잘못된 예시
CREATE_GOODS     // mutate 접두사 필요
MutateGoods      // PascalCase 금지, 동작 동사 누락
```

### Custom Hook 네이밍

**Query Hook**: `use` + 동작 + `Query`

```typescript
// ✅ 올바른 예시
useGetAllGoodsQuery
useGetGoodsByIdQuery
useGetOrderListQuery

// ❌ 잘못된 예시
useGetAllGoods      // Query 접미사 누락
useAllGoodsQuery    // get 동작 동사 누락
```

**Mutation Hook**: `use` + 동작 + `Mutation`

```typescript
// ✅ 올바른 예시
useCreateGoodsMutation
useUpdateGoodsMutation
useDeleteGoodsMutation

// ❌ 잘못된 예시
useCreateGoods          // Mutation 접미사 누락
useMutateCreateGoods    // mutate 중복
```

---

## Type 패턴

### Query 사용 패턴

**Query 타입**: `Pick<Query, 'fieldName'>`

```typescript
import { Query } from '@/graphql/__generated__/graphqlType';
import { useQuery } from '@apollo/client';

// ✅ 올바른 패턴
const { data } = useQuery<Pick<Query, 'getAllGoods'>>(GET_ALL_GOODS);

// ❌ 잘못된 패턴
const { data } = useQuery(GET_ALL_GOODS); // 타입 지정 누락
const { data } = useQuery<Query>(GET_ALL_GOODS); // 전체 Query 타입 사용 금지
```

### Mutation 사용 패턴

**Mutation 타입**: `Pick<Mutation, 'fieldName'>` + 변수 타입

```typescript
import { Mutation } from '@/graphql/__generated__/graphqlType';
import { useMutation } from '@apollo/client';

// ✅ 올바른 패턴
const [createGoods] = useMutation<
  Pick<Mutation, 'createGoods'>,
  { input: CreateGoodsInput }
>(MUTATE_CREATE_GOODS);

// ❌ 잘못된 패턴
const [createGoods] = useMutation(MUTATE_CREATE_GOODS); // 타입 지정 누락
```

---

## Custom Hooks 패턴 (필수)

**모든 쿼리와 뮤테이션은 반드시 커스텀 훅으로 작성해야 합니다.**

### Query Custom Hook (에러 핸들링 외부 주입)

```typescript
// src/graphql/hooks/goods/query/useGetAllGoodsQuery.ts
import { useQuery, QueryHookOptions } from '@apollo/client';
import { Query } from '@/graphql/__generated__/graphqlType';
import { GET_ALL_GOODS } from '@/graphql/query/goodsQuery';

type GetAllGoodsQuery = Pick<Query, 'getAllGoods'>;

export function useGetAllGoodsQuery(
  options?: QueryHookOptions<GetAllGoodsQuery>
) {
  const query = useQuery<GetAllGoodsQuery>(GET_ALL_GOODS, options);

  // ✅ 쿼리 객체 자체를 반환 (일관성 유지)
  return query;
}
```

**컴포넌트에서 사용 (에러 핸들링 주입)**:
```typescript
function GoodsList() {
  const { data, loading, error } = useGetAllGoodsQuery({
    onCompleted: (data) => {
      if (!data.getAllGoods.isSucceed) {
        toast.error(data.getAllGoods.resultMessage);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch goods:', error);
      toast.error('상품 조회에 실패했습니다');
    },
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;

  const goods = data?.getAllGoods.goodsList || [];

  return <List items={goods} />;
}
```

### Query with Variables

```typescript
// src/graphql/hooks/goods/query/useGetGoodsByIdQuery.ts
import { useQuery, QueryHookOptions } from '@apollo/client';
import { Query } from '@/graphql/__generated__/graphqlType';
import { GET_GOODS_BY_ID } from '@/graphql/query/goodsQuery';

type GetGoodsByIdQuery = Pick<Query, 'getGoodsById'>;
type GetGoodsByIdVariables = { id: string };

export function useGetGoodsByIdQuery(
  options?: QueryHookOptions<GetGoodsByIdQuery, GetGoodsByIdVariables>
) {
  const query = useQuery<GetGoodsByIdQuery, GetGoodsByIdVariables>(
    GET_GOODS_BY_ID,
    options
  );

  return query;
}
```

**사용 예시**:
```typescript
function GoodsDetail({ id }: { id: string }) {
  const { data, loading } = useGetGoodsByIdQuery({
    variables: { id },
    onCompleted: (data) => {
      if (!data.getGoodsById.isSucceed) {
        toast.error(data.getGoodsById.resultMessage);
      }
    },
    onError: () => {
      toast.error('상품 조회에 실패했습니다');
    },
  });

  if (loading) return <Spinner />;

  const goods = data?.getGoodsById.goods;
  return <GoodsCard goods={goods} />;
}
```

### Mutation Custom Hook (에러 핸들링 외부 주입)

```typescript
// src/graphql/hooks/goods/mutation/useCreateGoodsMutation.ts
import { useMutation, MutationHookOptions } from '@apollo/client';
import { Mutation } from '@/graphql/__generated__/graphqlType';
import { MUTATE_CREATE_GOODS } from '@/graphql/query/goodsQuery';

type CreateGoodsMutation = Pick<Mutation, 'createGoods'>;
type CreateGoodsVariables = { input: CreateGoodsInput };

interface CreateGoodsInput {
  name: string;
  price: number;
  stock: number;
  description?: string;
}

export function useCreateGoodsMutation(
  options?: MutationHookOptions<CreateGoodsMutation, CreateGoodsVariables>
) {
  const mutation = useMutation<CreateGoodsMutation, CreateGoodsVariables>(
    MUTATE_CREATE_GOODS,
    options
  );

  // ✅ 뮤테이션 객체 자체를 반환 (일관성 유지)
  return mutation;
}
```

**컴포넌트에서 사용 (에러 핸들링 주입)**:
```typescript
function GoodsForm() {
  const [createGoods, { loading }] = useCreateGoodsMutation({
    refetchQueries: [{ query: GET_ALL_GOODS }],
    onCompleted: (data) => {
      if (data.createGoods.isSucceed) {
        toast.success('상품이 생성되었습니다');
        router.push('/goods');
      } else {
        toast.error(data.createGoods.resultMessage);
      }
    },
    onError: (error) => {
      console.error('Failed to create goods:', error);
      toast.error('상품 생성에 실패했습니다');
    },
  });

  const handleSubmit = (formData: CreateGoodsInput) => {
    // ✅ onComplete/onError에서 처리하므로 try/catch 불필요
    createGoods({
      variables: { input: formData },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? '생성 중...' : '상품 생성'}
      </button>
    </form>
  );
}
```

### Mutation with Cache Update

```typescript
// src/graphql/hooks/goods/mutation/useDeleteGoodsMutation.ts
import { useMutation, MutationHookOptions } from '@apollo/client';
import { Mutation } from '@/graphql/__generated__/graphqlType';
import { MUTATE_DELETE_GOODS } from '@/graphql/query/goodsQuery';

type DeleteGoodsMutation = Pick<Mutation, 'deleteGoods'>;
type DeleteGoodsVariables = { id: string };

export function useDeleteGoodsMutation(
  options?: MutationHookOptions<DeleteGoodsMutation, DeleteGoodsVariables>
) {
  const mutation = useMutation<DeleteGoodsMutation, DeleteGoodsVariables>(
    MUTATE_DELETE_GOODS,
    {
      update(cache, { data }) {
        if (data?.deleteGoods.isSucceed) {
          cache.evict({ id: `Goods:${variables.id}` });
          cache.gc();
        }
      },
      ...options,
    }
  );

  return mutation;
}
```

**사용 예시**:
```typescript
function GoodsCard({ goods }: { goods: Goods }) {
  const [deleteGoods, { loading }] = useDeleteGoodsMutation({
    onCompleted: (data) => {
      if (data.deleteGoods.isSucceed) {
        toast.success('삭제되었습니다');
      } else {
        toast.error(data.deleteGoods.resultMessage);
      }
    },
    onError: () => {
      toast.error('삭제에 실패했습니다');
    },
  });

  const handleDelete = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteGoods({ variables: { id: goods.id } });
    }
  };

  return (
    <Card>
      <h3>{goods.name}</h3>
      <button onClick={handleDelete} disabled={loading}>
        삭제
      </button>
    </Card>
  );
}
```

---

## 에러 핸들링 패턴

### ✅ 올바른 패턴: onCompleted / onError 외부 주입

**패턴 1: 컴포넌트에서 직접 주입**
```typescript
function MyComponent() {
  const { data } = useGetAllGoodsQuery({
    onCompleted: (data) => {
      if (data.getAllGoods.isSucceed) {
        // 성공 처리
      }
    },
    onError: (error) => {
      toast.error('에러 발생');
    },
  });
}
```

**패턴 2: 공통 핸들러 재사용**
```typescript
// utils/graphqlErrorHandlers.ts
export const defaultErrorHandler = (error: ApolloError) => {
  console.error('GraphQL Error:', error);
  toast.error('요청에 실패했습니다');
};

// Component
function MyComponent() {
  const { data } = useGetAllGoodsQuery({
    onError: defaultErrorHandler,
  });
}
```

### ❌ 잘못된 패턴: try/catch 사용 금지

```typescript
// ❌ 이렇게 하지 마세요
const handleSubmit = async () => {
  try {
    const { data } = await createGoods({ variables: { input } });
    if (data?.createGoods.isSucceed) {
      alert('성공!');
    }
  } catch (error) {
    console.error(error);
  }
};
```

**이유**: Apollo Client의 선언적 에러 핸들링(onCompleted/onError)을 사용하면:
- 컴포넌트 로직이 간결해짐
- 에러 처리가 일관됨
- 재사용성이 높아짐
- 옵션으로 외부에서 주입 가능

---

## 캐시 업데이트 패턴

### refetchQueries 사용

```typescript
function MyComponent() {
  const [createGoods] = useCreateGoodsMutation({
    refetchQueries: [{ query: GET_ALL_GOODS }],
    onCompleted: (data) => {
      if (data.createGoods.isSucceed) {
        toast.success('생성 완료');
      }
    },
  });
}
```

### update 함수로 수동 캐시 업데이트

커스텀 훅 내부에서 기본 update 로직을 정의하고, 추가 options는 외부에서 주입:

```typescript
// src/graphql/hooks/goods/mutation/useUpdateGoodsMutation.ts
export function useUpdateGoodsMutation(
  options?: MutationHookOptions<UpdateGoodsMutation, UpdateGoodsVariables>
) {
  const mutation = useMutation<UpdateGoodsMutation, UpdateGoodsVariables>(
    MUTATE_UPDATE_GOODS,
    {
      update(cache, { data }) {
        // 기본 캐시 업데이트 로직
        if (data?.updateGoods.isSucceed) {
          cache.evict({ id: 'ROOT_QUERY', fieldName: 'getAllGoods' });
        }
      },
      ...options, // 외부에서 추가 options 주입 가능
    }
  );

  return mutation;
}
```

---

## Multi-Schema 지원 (OMS + WMS)

### OMS Schema

```typescript
// src/graphql/hooks/goods/query/useGetAllGoodsQuery.ts
import { Query } from '@/graphql/__generated__/graphqlType';
import { GET_ALL_GOODS } from '@/graphql/query/goodsQuery';

type GetAllGoodsQuery = Pick<Query, 'getAllGoods'>;

export function useGetAllGoodsQuery(
  options?: QueryHookOptions<GetAllGoodsQuery>
) {
  return useQuery<GetAllGoodsQuery>(GET_ALL_GOODS, options);
}
```

### WMS Schema

```typescript
// src/graphql/hooks/wms/query/useGetInventoryQuery.ts
import { Query as WMSQuery } from '@/graphql/__generated__/wmsGraphqlType';
import { GET_INVENTORY } from '@/graphql/wmsQuery/inventoryQuery';

type GetInventoryQuery = Pick<WMSQuery, 'getInventory'>;

export function useGetInventoryQuery(
  options?: QueryHookOptions<GetInventoryQuery>
) {
  return useQuery<GetInventoryQuery>(GET_INVENTORY, options);
}
```

**중요**: OMS와 WMS는 별도의 타입 파일을 사용합니다.
- OMS: `graphqlType.ts` (Query, Mutation)
- WMS: `wmsGraphqlType.ts` (Query as WMSQuery)

---

## 코드 생성 워크플로우

### 1. GraphQL 작성

```typescript
// src/graphql/query/goodsQuery.ts
export const GET_ALL_GOODS = gql`
  query getAllGoods {
    getAllGoods {
      isSucceed
      resultMessage
      goodsList {
        id
        name
        price
      }
    }
  }
`;
```

### 2. 타입 생성

```bash
yarn codegen
# 또는
yarn graphql:codegen && yarn prettier
```

### 3. 커스텀 훅 생성

```typescript
// src/graphql/hooks/goods/query/useGetAllGoodsQuery.ts
import { useQuery, QueryHookOptions } from '@apollo/client';
import { Query } from '@/graphql/__generated__/graphqlType';
import { GET_ALL_GOODS } from '@/graphql/query/goodsQuery';

type GetAllGoodsQuery = Pick<Query, 'getAllGoods'>;

export function useGetAllGoodsQuery(
  options?: QueryHookOptions<GetAllGoodsQuery>
) {
  const query = useQuery<GetAllGoodsQuery>(GET_ALL_GOODS, options);
  return query; // 쿼리 객체 자체 반환
}
```

### 4. 컴포넌트에서 사용

```typescript
function GoodsList() {
  const { data, loading } = useGetAllGoodsQuery({
    onCompleted: (data) => {
      // 완료 처리
    },
    onError: (error) => {
      // 에러 처리
    },
  });

  // 컴포넌트 로직
}
```

---

## 체크리스트

새로운 쿼리/뮤테이션 작성 시 확인:

- [ ] **GraphQL Operation 네이밍**: Query는 `get~`, Mutation은 `mutate~` 접두사 (camelCase)
- [ ] **Custom Hook 네이밍**: Query는 `use~~Query`, Mutation은 `use~~Mutation`
- [ ] **타입 패턴**: `Pick<Query, 'field'>` 또는 `Pick<Mutation, 'field'>` 사용
- [ ] **커스텀 훅**: 모든 쿼리/뮤테이션은 별도의 훅 파일로 작성
- [ ] **파일 구조**: `hooks/{domain}/query/` 또는 `hooks/{domain}/mutation/`에 배치
- [ ] **에러 핸들링**: options 파라미터로 onCompleted/onError 외부 주입 가능하도록 설계
- [ ] **반환값**: 쿼리/뮤테이션 객체 자체를 반환 (일관성)
- [ ] **캐시 업데이트**: 필요시 refetchQueries 또는 update 함수 사용
- [ ] **타입 생성**: `yarn codegen` 실행하여 타입 업데이트
- [ ] **스키마 구분**: OMS와 WMS 타입 파일 올바르게 import

---

## 예시: 완전한 CRUD 패턴

### 1. Query 정의

```typescript
// src/graphql/query/goodsQuery.ts
import { gql } from '@apollo/client';

export const GET_ALL_GOODS = gql`
  query getAllGoods {
    getAllGoods {
      isSucceed
      resultMessage
      goodsList {
        id
        name
        price
        stock
      }
    }
  }
`;

export const GET_GOODS_BY_ID = gql`
  query getGoodsById($id: ID!) {
    getGoodsById(id: $id) {
      isSucceed
      goods {
        id
        name
        price
        stock
        description
      }
    }
  }
`;

export const MUTATE_CREATE_GOODS = gql`
  mutation mutateCreateGoods($input: CreateGoodsInput!) {
    createGoods(input: $input) {
      isSucceed
      resultMessage
    }
  }
`;

export const MUTATE_UPDATE_GOODS = gql`
  mutation mutateUpdateGoods($input: UpdateGoodsInput!) {
    updateGoods(input: $input) {
      isSucceed
      resultMessage
    }
  }
`;

export const MUTATE_DELETE_GOODS = gql`
  mutation mutateDeleteGoods($id: ID!) {
    deleteGoods(id: $id) {
      isSucceed
      resultMessage
    }
  }
`;
```

### 2. Custom Hooks

**Query Hook**:
```typescript
// src/graphql/hooks/goods/query/useGetAllGoodsQuery.ts
import { useQuery, QueryHookOptions } from '@apollo/client';
import { Query } from '@/graphql/__generated__/graphqlType';
import { GET_ALL_GOODS } from '@/graphql/query/goodsQuery';

type GetAllGoodsQuery = Pick<Query, 'getAllGoods'>;

export function useGetAllGoodsQuery(
  options?: QueryHookOptions<GetAllGoodsQuery>
) {
  const query = useQuery<GetAllGoodsQuery>(GET_ALL_GOODS, options);
  return query;
}
```

**Mutation Hook**:
```typescript
// src/graphql/hooks/goods/mutation/useCreateGoodsMutation.ts
import { useMutation, MutationHookOptions } from '@apollo/client';
import { Mutation } from '@/graphql/__generated__/graphqlType';
import { MUTATE_CREATE_GOODS } from '@/graphql/query/goodsQuery';

type CreateGoodsMutation = Pick<Mutation, 'createGoods'>;
type CreateGoodsVariables = { input: CreateGoodsInput };

interface CreateGoodsInput {
  name: string;
  price: number;
  stock: number;
  description?: string;
}

export function useCreateGoodsMutation(
  options?: MutationHookOptions<CreateGoodsMutation, CreateGoodsVariables>
) {
  const mutation = useMutation<CreateGoodsMutation, CreateGoodsVariables>(
    MUTATE_CREATE_GOODS,
    options
  );
  return mutation;
}
```

### 3. Component Usage

```typescript
// src/components/goods/GoodsList.tsx
import { useGetAllGoodsQuery } from '@/graphql/hooks/goods/query/useGetAllGoodsQuery';
import { toast } from '@/utils/toast';

export function GoodsList() {
  const { data, loading, error } = useGetAllGoodsQuery({
    onError: (error) => {
      console.error('Failed to fetch goods:', error);
      toast.error('상품 목록 조회에 실패했습니다');
    },
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;

  const goods = data?.getAllGoods.goodsList || [];

  return (
    <div>
      {goods.map((item) => (
        <GoodsCard key={item.id} goods={item} />
      ))}
    </div>
  );
}
```

```typescript
// src/components/goods/GoodsForm.tsx
import { useCreateGoodsMutation } from '@/graphql/hooks/goods/mutation/useCreateGoodsMutation';
import { GET_ALL_GOODS } from '@/graphql/query/goodsQuery';
import { toast } from '@/utils/toast';

export function GoodsForm() {
  const [createGoods, { loading }] = useCreateGoodsMutation({
    refetchQueries: [{ query: GET_ALL_GOODS }],
    onCompleted: (data) => {
      if (data.createGoods.isSucceed) {
        toast.success('상품이 생성되었습니다');
        router.push('/goods');
      } else {
        toast.error(data.createGoods.resultMessage);
      }
    },
    onError: (error) => {
      console.error('Failed to create goods:', error);
      toast.error('상품 생성에 실패했습니다');
    },
  });

  const handleSubmit = (formData: CreateGoodsInput) => {
    createGoods({
      variables: { input: formData },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? '생성 중...' : '상품 생성'}
      </button>
    </form>
  );
}
```

---

## 정리

**핵심 원칙**:

1. **GraphQL Operation 네이밍**: Query는 `get~`, Mutation은 `mutate~` (camelCase)
2. **Custom Hook 네이밍**: Query는 `use~~Query`, Mutation은 `use~~Mutation`
3. **타입 패턴**: `Pick<Query, 'field'>` 또는 `Pick<Mutation, 'field'>`
4. **커스텀 훅**: 모든 쿼리/뮤테이션은 별도 훅으로 작성
5. **파일 구조**: `hooks/{domain}/query/` 및 `hooks/{domain}/mutation/`로 구분
6. **에러 핸들링**: options 파라미터로 onCompleted/onError 외부 주입
7. **반환값**: 쿼리/뮤테이션 객체 자체를 반환
8. **GraphQL 정의**: 도메인별로 쿼리와 뮤테이션을 같은 파일에 작성
9. **Multi-Schema**: OMS와 WMS 타입 파일을 구분하여 import

이 패턴을 따르면 타입 안정성, 일관성, 재사용성, 유연성이 보장됩니다.
