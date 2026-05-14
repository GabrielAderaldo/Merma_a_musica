# Bun Docs — `guides/runtime`

Runtime: envs, define, codesign, debugger, importação de JSON/TOML/YAML/HTML.

**20** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`build-time-constants.md`](./build-time-constants.md) | Build-time constants with --define | The `--define` flag can be used with `bun build` and `bun build --compile` to inject build-time constants into your appl… |
| [`cicd.md`](./cicd.md) | Install and run Bun in GitHub Actions | Use the official [`setup-bun`](https://github.com/oven-sh/setup-bun) GitHub Action to install `bun` in your GitHub Actio… |
| [`codesign-macos-executable.md`](./codesign-macos-executable.md) | Codesign a single-file JavaScript executable on macOS | Fix the "can't be opened because it is from an unidentified developer" Gatekeeper warning when running your JavaScript e… |
| [`define-constant.md`](./define-constant.md) | Define and replace static globals & constants | The `--define` flag lets you declare statically-analyzable constants and globals. It replace all usages of an identifier… |
| [`delete-directory.md`](./delete-directory.md) | Delete directories | To recursively delete a directory and all its contents, use `rm` from `node:fs/promises`. This is like running `rm -rf` … |
| [`delete-file.md`](./delete-file.md) | Delete files | To delete a file, use `Bun.file(path).delete()`. |
| [`heap-snapshot.md`](./heap-snapshot.md) | Inspect memory usage using V8 heap snapshots | Bun implements V8's heap snapshot API, which allows you to create snapshots of the heap at runtime. This helps debug mem… |
| [`import-html.md`](./import-html.md) | Import a HTML file as text | To import a `.html` file in Bun as a text file, use the `type: "text"` attribute in the import statement. |
| [`import-json.md`](./import-json.md) | Import a JSON file | Bun natively supports `.json` imports. |
| [`import-json5.md`](./import-json5.md) | Import a JSON5 file | Bun natively supports `.json5` imports. |
| [`import-toml.md`](./import-toml.md) | Import a TOML file | Bun natively supports importing `.toml` files. |
| [`import-yaml.md`](./import-yaml.md) | Import a YAML file | Bun natively supports `.yaml` and `.yml` imports. |
| [`read-env.md`](./read-env.md) | Read environment variables | The current environment variables can be accessed via `process.env`. |
| [`set-env.md`](./set-env.md) | Set environment variables | The current environment variables can be accessed via `process.env` or `Bun.env`. |
| [`shell.md`](./shell.md) | Run a Shell Command | Bun Shell is a cross-platform bash-like shell built in to Bun. |
| [`timezone.md`](./timezone.md) | Set a time zone in Bun | Bun supports programmatically setting a default time zone for the lifetime of the `bun` process. To do set, set the valu… |
| [`tsconfig-paths.md`](./tsconfig-paths.md) | Re-map import paths | Bun reads the `paths` field in your `tsconfig.json` to re-write import paths. This is useful for aliasing package names … |
| [`typescript.md`](./typescript.md) | Install TypeScript declarations for Bun | To install TypeScript definitions for Bun's built-in APIs in your project, install `@types/bun`. |
| [`vscode-debugger.md`](./vscode-debugger.md) | Debugging Bun with the VS Code extension | <Note> |
| [`web-debugger.md`](./web-debugger.md) | Debugging Bun with the web debugger | Bun speaks the [WebKit Inspector Protocol](https://github.com/oven-sh/bun/blob/main/packages/bun-inspector-protocol/src/… |
