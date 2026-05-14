# Convert a Blob to a ReadableStream
Source: https://bun.com/docs/guides/binary/blob-to-stream



The [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) class provides a number of methods for consuming its contents in different formats, including `.stream()`. This returns `Promise<ReadableStream>`.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const blob = new Blob(["hello world"]);
const stream = await blob.stream();
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
