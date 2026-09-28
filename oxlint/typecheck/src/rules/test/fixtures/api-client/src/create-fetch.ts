// A `fetch` scoped to one origin. Its signature is declared in the client
// folder, thus a call through it is a request of the client.
export declare function createFetch(options?: { baseUrl?: string }): typeof globalThis.fetch
