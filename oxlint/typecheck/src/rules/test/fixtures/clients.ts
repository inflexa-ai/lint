// The values that a rule test calls into.
import { createTrustedApiClient, createUntrustedApiClient } from './api-client/src/create-api-client.ts'
import { createFetch } from './api-client/src/create-fetch.ts'

export const api = createTrustedApiClient({ baseUrl: 'https://api.test/v1' })
export const org = api.withPrefix('/organizations/7')
export const pubchem = createUntrustedApiClient({ baseUrl: 'https://pubchem.test' })
export const upload = createFetch()
