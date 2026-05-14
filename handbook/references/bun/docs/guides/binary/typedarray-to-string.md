# Convert a Uint8Array to a string
Source: https://bun.com/docs/guides/binary/typedarray-to-string



Bun implements the Web-standard [`TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder) class for converting from binary data types like `Uint8Array` and strings.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const arr = new Uint8Array([104, 101, 108, 108, 111]);
const decoder = new TextDecoder();
const str = decoder.decode(arr);
// => "hello"
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
