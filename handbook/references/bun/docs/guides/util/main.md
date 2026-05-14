# Get the absolute path to the current entrypoint
Source: https://bun.com/docs/guides/util/main



The `Bun.main` property contains the absolute path to the current entrypoint.

<CodeGroup>
  ```ts foo.ts icon="https://mintcdn.com/bun-1dd33a4e/JUhaF6Mf68z_zHyy/icons/typescript.svg?fit=max&auto=format&n=JUhaF6Mf68z_zHyy&q=85&s=7ac549adaea8d5487d8fbd58cc3ea35b" theme={"theme":{"light":"github-light","dark":"dracula"}}
  console.log(Bun.main);
  ```

  ```ts index.ts icon="https://mintcdn.com/bun-1dd33a4e/JUhaF6Mf68z_zHyy/icons/typescript.svg?fit=max&auto=format&n=JUhaF6Mf68z_zHyy&q=85&s=7ac549adaea8d5487d8fbd58cc3ea35b" theme={"theme":{"light":"github-light","dark":"dracula"}}
  import "./foo.ts";
  ```
</CodeGroup>

***

The printed path corresponds to the file that is executed with `bun run`.

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun run index.ts
```

```txt theme={"theme":{"light":"github-light","dark":"dracula"}}
/path/to/index.ts
```

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun run foo.ts
```

```txt theme={"theme":{"light":"github-light","dark":"dracula"}}
/path/to/foo.ts
```

***

See [Docs > API > Utils](/docs/runtime/utils) for more useful utilities.
