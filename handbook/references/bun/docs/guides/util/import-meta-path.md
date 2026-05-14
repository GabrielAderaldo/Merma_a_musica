# Get the absolute path of the current file
Source: https://bun.com/docs/guides/util/import-meta-path



Bun provides a handful of module-specific utilities on the [`import.meta`](/docs/runtime/module-resolution#import-meta) object. Use `import.meta.path` to retrieve the absolute path of the current file.

```ts /a/b/c.ts icon="https://mintcdn.com/bun-1dd33a4e/JUhaF6Mf68z_zHyy/icons/typescript.svg?fit=max&auto=format&n=JUhaF6Mf68z_zHyy&q=85&s=7ac549adaea8d5487d8fbd58cc3ea35b" theme={"theme":{"light":"github-light","dark":"dracula"}}
import.meta.path; // => "/a/b/c.ts"
```

***

See [Docs > API > import.meta](/docs/runtime/module-resolution#import-meta) for complete documentation.
