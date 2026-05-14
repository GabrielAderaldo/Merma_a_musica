# Convert a Buffer to a string
Source: https://bun.com/docs/guides/binary/buffer-to-string



The [`Buffer`](https://nodejs.org/api/buffer.html) class provides a built-in `.toString()` method that converts a `Buffer` to a string.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const buf = Buffer.from("hello");
const str = buf.toString();
// => "hello"
```

***

You can optionally specify an encoding and byte range.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const buf = Buffer.from("hello world!");
const str = buf.toString("utf8", 0, 5);
// => "hello"
```

***

See [Docs > API > Binary Data](/docs/runtime/binary-data#conversion) for complete documentation on manipulating binary data with Bun.
