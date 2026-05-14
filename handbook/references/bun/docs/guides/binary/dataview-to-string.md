# Convert a DataView to a string
Source: https://bun.com/docs/guides/binary/dataview-to-string



If a [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) contains ASCII-encoded text, you can convert it to a string using the [`TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder) class.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const dv: DataView = ...;
const decoder = new TextDecoder();
const str = decoder.decode(dv);
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
