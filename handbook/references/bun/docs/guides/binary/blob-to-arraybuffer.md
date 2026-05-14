# Convert a Blob to an ArrayBuffer
Source: https://bun.com/docs/guides/binary/blob-to-arraybuffer



The [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) class provides a number of methods for consuming its contents in different formats, including `.arrayBuffer()`.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const blob = new Blob(["hello world"]);
const buf = await blob.arrayBuffer();
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
