// The cache that a rule test calls into, built from the real library: what
// `no-inline-query-key` recognizes is the class that the compiler resolved the
// method on, thus a stand-in would test the stand-in.
import { QueryClient } from '@tanstack/query-core'

export const queryClient = new QueryClient()
export const queryCache = queryClient.getQueryCache()
