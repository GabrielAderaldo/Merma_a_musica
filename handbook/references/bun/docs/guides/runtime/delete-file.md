# Delete files
Source: https://bun.com/docs/guides/runtime/delete-file



To delete a file, use `Bun.file(path).delete()`.

```ts delete-file.ts icon="https://mintcdn.com/bun-1dd33a4e/JUhaF6Mf68z_zHyy/icons/typescript.svg?fit=max&auto=format&n=JUhaF6Mf68z_zHyy&q=85&s=7ac549adaea8d5487d8fbd58cc3ea35b" theme={"theme":{"light":"github-light","dark":"dracula"}}
// Delete a file
const file = Bun.file("path/to/file.txt");
await file.delete();

// Now the file doesn't exist
const exists = await file.exists();
// => false
```

***

See [Docs > API > FileSystem](/docs/runtime/file-io) for more filesystem operations.
