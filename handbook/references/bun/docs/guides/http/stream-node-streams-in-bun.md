# Streaming HTTP Server with Node.js Streams
Source: https://bun.com/docs/guides/http/stream-node-streams-in-bun



In Bun, [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects can accept a Node.js [`Readable`](https://nodejs.org/api/stream.html#stream_readable_streams).

This works because Bun's `Response` object allows any async iterable as its body. Node.js streams are async iterables, so you can pass them directly to `Response`.

```ts server.ts icon="https://mintcdn.com/bun-1dd33a4e/JUhaF6Mf68z_zHyy/icons/typescript.svg?fit=max&auto=format&n=JUhaF6Mf68z_zHyy&q=85&s=7ac549adaea8d5487d8fbd58cc3ea35b" theme={"theme":{"light":"github-light","dark":"dracula"}}
import { Readable } from "stream";
import { serve } from "bun";
serve({
  port: 3000,
  fetch(req) {
    return new Response(Readable.from(["Hello, ", "world!"]), {
      headers: { "Content-Type": "text/plain" },
    });
  },
});
```
