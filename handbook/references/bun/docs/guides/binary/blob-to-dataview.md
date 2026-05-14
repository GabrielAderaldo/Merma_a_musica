# Convert a Blob to a DataView
Source: https://bun.com/docs/guides/binary/blob-to-dataview



The [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) class provides a number of methods for consuming its contents in different formats. This snippets reads the contents to an `ArrayBuffer`, then creates a `DataView` from the buffer.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const blob = new Blob(["hello world"]);
const arr = new DataView(await blob.arrayBuffer());
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
