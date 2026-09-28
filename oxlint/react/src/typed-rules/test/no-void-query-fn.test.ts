import { noVoidQueryFn } from '../no-void-query-fn.ts'
import { createRuleTester } from './rule-tester.ts'

// The cases of the upstream test of @tanstack/eslint-plugin-query 5.103.2.
createRuleTester().run('@inflexa-ai/react/no-void-query-fn', noVoidQueryFn, {
  valid: [
    {
      name: 'queryFn returns a value',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => ({ data: 'test' }),
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns a Promise',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async () => ({ data: 'test' }),
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns Promise.resolve',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve({ data: 'test' }),
  })
  return null
}
`,
    },
    {
      name: 'queryFn with explicit Promise type',
      code: `import { useQuery } from '@tanstack/react-query'

interface Data {
  value: string
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async (): Promise<Data> => {
      return { value: 'test' }
    },
  })
  return null
}
`,
    },
    {
      name: 'queryFn with generic Promise type',
      code: `import { useQuery } from '@tanstack/react-query'

interface Response<T> {
  data: T
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async (): Promise<Response<string>> => {
      return { data: 'test' }
    },
  })
  return null
}
`,
    },
    {
      name: 'queryFn with external async function',
      code: `import { useQuery } from '@tanstack/react-query'

async function fetchData(): Promise<{ data: string }> {
  return { data: 'test' }
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: fetchData,
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns null',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => null,
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns 0',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => 0,
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns false',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => false,
  })
  return null
}
`,
    },
    {
      name: 'useInfiniteQuery queryFn returns a value',
      code: `import { useInfiniteQuery } from '@tanstack/react-query'

function Component() {
  const query = useInfiniteQuery({
    queryKey: ['test'],
    queryFn: ({ pageParam }) => ({ data: 'test', page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => undefined,
  })
  return null
}
`,
    },
    {
      name: 'useSuspenseQuery queryFn returns a value',
      code: `import { useSuspenseQuery } from '@tanstack/react-query'

function Component() {
  const query = useSuspenseQuery({
    queryKey: ['test'],
    queryFn: () => ({ data: 'test' }),
  })
  return null
}
`,
    },
    {
      name: 'queryOptions queryFn returns a value',
      code: `import { queryOptions } from '@tanstack/react-query'

const options = queryOptions({
  queryKey: ['test'],
  queryFn: () => ({ data: 'test' }),
})
`,
    },
    {
      name: 'fetchQuery queryFn returns a value',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.fetchQuery({
  queryKey: ['test'],
  queryFn: () => fetch('/api/test').then((r) => r.json()),
})
`,
    },
    {
      name: 'prefetchQuery queryFn returns a value',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.prefetchQuery({
  queryKey: ['test'],
  queryFn: () => fetch('/api/test').then((r) => r.json()),
})
`,
    },
    {
      name: 'prefetchInfiniteQuery queryFn returns a value',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.prefetchInfiniteQuery({
  queryKey: ['test'],
  queryFn: ({ pageParam }: { pageParam: number }) =>
    fetch(\`/api/test?page=\${pageParam}\`).then((r) => r.json()),
  initialPageParam: 0,
})
`,
    },
    {
      name: 'ensureQueryData queryFn returns a value',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.ensureQueryData({
  queryKey: ['test'],
  queryFn: () => fetch('/api/test').then((r) => r.json()),
})
`,
    },
    {
      name: 'ensureInfiniteQueryData queryFn returns a value',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.ensureInfiniteQueryData({
  queryKey: ['test'],
  queryFn: ({ pageParam }: { pageParam: number }) =>
    fetch(\`/api/test?page=\${pageParam}\`).then((r) => r.json()),
  initialPageParam: 0,
})
`,
    },
    {
      name: 'queryFn returns a numeric enum member',
      code: `import { useQuery } from '@tanstack/react-query'

enum ExampleEnum {
  A,
  B,
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => ExampleEnum.A,
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns a string enum member',
      code: `import { useQuery } from '@tanstack/react-query'

enum StringEnum {
  Foo = 'foo',
  Bar = 'bar',
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => StringEnum.Foo,
  })
  return null
}
`,
    },
    {
      name: 'async queryFn returns a numeric enum member',
      code: `import { useQuery } from '@tanstack/react-query'

enum Status {
  Active,
  Inactive,
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      return Status.Active
    },
  })
  return null
}
`,
    },
    {
      name: 'queryFn returns a const enum member',
      code: `import { useQuery } from '@tanstack/react-query'

const enum Direction {
  Up = 'UP',
  Down = 'DOWN',
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => Direction.Up,
  })
  return null
}
`,
    },
    // The forms of the spec of this repository.
    {
      name: 'queryFn calls a function that gives data',
      code: `import { useQuery } from '@tanstack/react-query'\ntype Todo = { title: string }\ndeclare function fetchTodos(): Promise<Todo[]>\nexport const use = () => useQuery({ queryKey: ['todos'], queryFn: () => fetchTodos() })\n`,
    },
    {
      name: 'queryFn as a method that gives data',
      code: `import { useQuery } from '@tanstack/react-query'\nexport const use = () => useQuery({ queryKey: ['todos'], async queryFn() { return 1 } })\n`,
    },
  ],
  invalid: [
    {
      name: 'queryFn returns void',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => {
      console.log('test')
    },
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn returns undefined',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => undefined,
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'async queryFn returns void',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      await someOperation()
    },
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn with explicit void Promise',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async (): Promise<void> => {
      await someOperation()
    },
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn with Promise.resolve(undefined)',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve(undefined),
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn with external void async function',
      code: `import { useQuery } from '@tanstack/react-query'

async function voidOperation(): Promise<void> {
  await someOperation()
}

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: voidOperation,
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn with conditional return (one branch missing)',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => {
      if (Math.random() > 0.5) {
        return { data: 'test' }
      }
      // Missing return in the else case
    },
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn with ternary operator returning undefined',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: () => Math.random() > 0.5 ? { data: 'test' } : undefined,
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'async queryFn with try/catch missing return in catch',
      code: `import { useQuery } from '@tanstack/react-query'

function Component() {
  const query = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      try {
        return { data: 'test' }
      } catch (error) {
        console.error(error)
        // No return here results in an implicit undefined
      }
    },
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'useInfiniteQuery queryFn returns void',
      code: `import { useInfiniteQuery } from '@tanstack/react-query'

function Component() {
  const query = useInfiniteQuery({
    queryKey: ['test'],
    queryFn: async ({ pageParam }) => {
      await fetch('/api/test?page=' + pageParam)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => undefined,
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'useSuspenseQuery queryFn returns void',
      code: `import { useSuspenseQuery } from '@tanstack/react-query'

function Component() {
  const query = useSuspenseQuery({
    queryKey: ['test'],
    queryFn: () => {
      console.log('fetching')
    },
  })
  return null
}
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryOptions queryFn returns void',
      code: `import { queryOptions } from '@tanstack/react-query'

const options = queryOptions({
  queryKey: ['test'],
  queryFn: async () => {
    await fetch('/api/test')
  },
})
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'fetchQuery queryFn returns void',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.fetchQuery({
  queryKey: ['test'],
  queryFn: async () => {
    await fetch('/api/test')
  },
})
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'prefetchQuery queryFn returns void',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.prefetchQuery({
  queryKey: ['test'],
  queryFn: async () => {
    await fetch('/api/test')
  },
})
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'prefetchInfiniteQuery queryFn returns void',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.prefetchInfiniteQuery({
  queryKey: ['test'],
  queryFn: async ({ pageParam }: { pageParam: number }) => {
    await fetch(\`/api/test?page=\${pageParam}\`)
  },
  initialPageParam: 0,
})
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'ensureQueryData queryFn returns void',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.ensureQueryData({
  queryKey: ['test'],
  queryFn: async () => {
    await fetch('/api/test')
  },
})
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'ensureInfiniteQueryData queryFn returns void',
      code: `import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()
queryClient.ensureInfiniteQueryData({
  queryKey: ['test'],
  queryFn: async ({ pageParam }: { pageParam: number }) => {
    await fetch(\`/api/test?page=\${pageParam}\`)
  },
  initialPageParam: 0,
})
`,
      errors: [{ messageId: 'noVoidReturn' }],
    },
    {
      name: 'queryFn gives a union with undefined after await',
      code: `import { useQuery } from '@tanstack/react-query'\ntype Todo = { title: string }\ndeclare function fetchTodo(): Promise<Todo | undefined>\nexport const use = () => useQuery({ queryKey: ['todo'], queryFn: () => fetchTodo() })\n`,
      errors: [{ messageId: 'noVoidReturn', line: 4, column: 66 }],
    },
    {
      name: 'queryFn as a method that gives nothing',
      code: `import { useQuery } from '@tanstack/react-query'\ndeclare function load(): Promise<void>\nexport const use = () => useQuery({ queryKey: ['todos'], async queryFn() { await load() } })\n`,
      errors: [{ messageId: 'noVoidReturn', line: 3, column: 58 }],
    },
    {
      name: 'queryFn in the shorthand form that gives nothing',
      code: `import { useQuery } from '@tanstack/react-query'\nconst queryFn = async (): Promise<void> => {}\nexport const use = () => useQuery({ queryKey: ['todos'], queryFn })\n`,
      errors: [{ messageId: 'noVoidReturn', line: 3, column: 58 }],
    },
    {
      name: 'queryFn as an async function that awaits and gives nothing',
      code: `import { useQuery } from '@tanstack/react-query'\ndeclare const key: string[]\ndeclare function load(): Promise<void>\nexport const use = () => useQuery({ queryKey: key, queryFn: async () => { await load() } })\n`,
      errors: [{ messageId: 'noVoidReturn', line: 4, column: 61 }],
    },
  ],
})
