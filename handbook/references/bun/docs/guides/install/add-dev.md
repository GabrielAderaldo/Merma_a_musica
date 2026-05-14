# Add a development dependency
Source: https://bun.com/docs/guides/install/add-dev



To add an npm package as a development dependency, use `bun add --development`.

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun add zod --dev
bun add zod -d # shorthand
```

***

This will add the package to `devDependencies` in `package.json`.

```json theme={"theme":{"light":"github-light","dark":"dracula"}}
{
  "devDependencies": {
    "zod": "^3.0.0" // [!code ++]
  }
}
```

***

See [Docs > Package manager](/docs/pm/cli/install) for complete documentation of Bun's package manager.
