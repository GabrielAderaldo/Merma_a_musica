# Convert an absolute path to a file URL
Source: https://bun.com/docs/guides/util/path-to-file-url



Use `Bun.pathToFileURL()` to convert an absolute path to a `file://` URL.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
Bun.pathToFileURL("/path/to/file.txt");
// => "file:///path/to/file.txt"
```

***

See [Docs > API > Utils](/docs/runtime/utils) for more useful utilities.
