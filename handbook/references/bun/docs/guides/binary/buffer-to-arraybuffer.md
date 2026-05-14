# Convert a Buffer to an ArrayBuffer
Source: https://bun.com/docs/guides/binary/buffer-to-arraybuffer



The Node.js [`Buffer`](https://nodejs.org/api/buffer.html) class provides a way to view and manipulate data in an underlying `ArrayBuffer`, which is available via the `buffer` property.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const nodeBuf = Buffer.alloc(64);
const arrBuf = nodeBuf.buffer;
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
