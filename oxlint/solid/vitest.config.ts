import { defineConfig } from 'vitest/config'

// A workspace package resolves another one to its source, thus a test never
// runs against an old build of it.
export default defineConfig({ resolve: { conditions: ['source'] }, ssr: { resolve: { conditions: ['source'] } } })
