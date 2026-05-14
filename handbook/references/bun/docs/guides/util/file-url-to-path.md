# Convert a file URL to an absolute path
Source: https://bun.com/docs/guides/util/file-url-to-path



Use `Bun.fileURLToPath()` to convert a `file://` URL to an absolute path.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
Bun.fileURLToPath("file:///path/to/file.txt");
// => "/path/to/file.txt"
```

***

See [Docs > API > Utils](/docs/runtime/utils) for more useful utilities.
