# Bun Docs — `guides/http`

Servidor HTTP, fetch, SSE, streaming, TLS, FormData, cluster.

**13** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`cluster.md`](./cluster.md) | Start a cluster of HTTP servers | Run multiple HTTP servers concurrently via the "reusePort" option to share the same port across multiple processes |
| [`fetch-unix.md`](./fetch-unix.md) | fetch with unix domain sockets in Bun | In Bun, the `unix` option in `fetch()` lets you send HTTP requests over a [unix domain socket](https://en.wikipedia.org/… |
| [`fetch.md`](./fetch.md) | Send an HTTP request using fetch | Bun implements the Web-standard [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API for sending HT… |
| [`file-uploads.md`](./file-uploads.md) | Upload files via HTTP using FormData | To upload files via HTTP with Bun, use the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) API. … |
| [`hot.md`](./hot.md) | Hot reload an HTTP server | Bun supports the [`--hot`](/docs/runtime/watch-mode#hot-mode) flag to run a file with hot reloading enabled. When any mo… |
| [`proxy.md`](./proxy.md) | Proxy HTTP requests using fetch() | In Bun, `fetch` supports sending requests through an HTTP or HTTPS proxy. This is useful on corporate networks or when y… |
| [`server.md`](./server.md) | Common HTTP server usage | This starts an HTTP server listening on port `3000`. It demonstrates basic routing with a number of common responses and… |
| [`simple.md`](./simple.md) | Write a simple HTTP server | This starts an HTTP server listening on port `3000`. It responds to all requests with a `Response` with status `200` and… |
| [`sse.md`](./sse.md) | Server-Sent Events (SSE) with Bun | [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) let you push a stream of text … |
| [`stream-file.md`](./stream-file.md) | Stream a file as an HTTP Response | This snippet reads a file from disk using [`Bun.file()`](/docs/runtime/file-io#reading-files-bun-file). This returns a `… |
| [`stream-iterator.md`](./stream-iterator.md) | Streaming HTTP Server with Async Iterators | In Bun, [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects can accept an async generator fu… |
| [`stream-node-streams-in-bun.md`](./stream-node-streams-in-bun.md) | Streaming HTTP Server with Node.js Streams | In Bun, [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects can accept a Node.js [`Readable`… |
| [`tls.md`](./tls.md) | Configure TLS on an HTTP server | Set the `tls` key to configure TLS. Both `key` and `cert` are required. The `key` should be the contents of your private… |
