// The shape of an API client, which `require-abort-signal` recognizes by the
// folder where its signatures are declared. The methods mirror a real client:
// the options come last, and they can carry a `signal`. `withPrefix` and the
// factories have nowhere to put one, and the rule must leave them alone.
type Schema<T> = { parse: (value: unknown) => T }

type FetchOptions = Omit<RequestInit, 'body' | 'method'> & {
  query?: Record<string, string | number | boolean | undefined>
}

export type RequestOptions = FetchOptions & { schema?: never }
export type SchemaRequestOptions<T> = FetchOptions & { schema: Schema<T> }

type TrustedMethod = {
  <T>(path: string, options: SchemaRequestOptions<T>): Promise<T>
  <TResponse = unknown>(path: string, options?: RequestOptions): Promise<TResponse>
}

type TrustedBodyMethod = {
  <T>(path: string, body: unknown, options: SchemaRequestOptions<T>): Promise<T>
  <TResponse = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<TResponse>
}

type ValidatedMethod = <T>(path: string, options: SchemaRequestOptions<T>) => Promise<T>
type ValidatedBodyMethod = <T>(path: string, body: unknown, options: SchemaRequestOptions<T>) => Promise<T>

export type TrustedApiClient = {
  get: TrustedMethod
  post: TrustedBodyMethod
  put: TrustedBodyMethod
  patch: TrustedBodyMethod
  delete: TrustedMethod
  fetch: typeof globalThis.fetch
  withPrefix: (prefix: string) => TrustedApiClient
}

export type UntrustedApiClient = {
  get: ValidatedMethod
  post: ValidatedBodyMethod
  put: ValidatedBodyMethod
  patch: ValidatedBodyMethod
  delete: ValidatedMethod
  fetch: typeof globalThis.fetch
  withPrefix: (prefix: string) => UntrustedApiClient
}

export declare function createTrustedApiClient(options: { baseUrl: string }): TrustedApiClient
export declare function createUntrustedApiClient(options: { baseUrl: string }): UntrustedApiClient
