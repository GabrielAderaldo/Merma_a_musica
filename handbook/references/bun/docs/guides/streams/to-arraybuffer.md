# Convert a ReadableStream to an ArrayBuffer
Source: https://bun.com/docs/guides/streams/to-arraybuffer



Bun provides several convenience functions for reading the contents of a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) into different formats.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const stream = new ReadableStream();
const buf = await Bun.readableStreamToArrayBuffer(stream);
```

***

See [Docs > API > Utils](/docs/runtime/utils#bun-readablestreamto) for documentation on Bun's other `ReadableStream` conversion functions.
