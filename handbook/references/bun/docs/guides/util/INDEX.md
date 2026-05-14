# Bun Docs — `guides/util`

Utilitários (uuid, base64, hash, deep-equal, gzip, sleep, upgrade…).

**19** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`base64.md`](./base64.md) | Encode and decode base64 strings | Bun implements the Web-standard [`atob`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/atob… |
| [`deep-equals.md`](./deep-equals.md) | Check if two objects are deeply equal | Check if two objects are deeply equal. This is used internally by `expect().toEqual()` in Bun's [test runner](/docs/test… |
| [`deflate.md`](./deflate.md) | Compress and decompress data with DEFLATE | Use `Bun.deflateSync()` to compress a `Uint8Array` with DEFLATE. |
| [`detect-bun.md`](./detect-bun.md) | Detect when code is executed with Bun | The recommended way to detect when code is being executed with Bun is to check `process.versions.bun`. This works in bot… |
| [`entrypoint.md`](./entrypoint.md) | Check if the current file is the entrypoint | Bun provides a handful of module-specific utilities on the [`import.meta`](/docs/runtime/module-resolution#import-meta) … |
| [`escape-html.md`](./escape-html.md) | Escape an HTML string | The `Bun.escapeHTML()` utility can be used to escape HTML characters in a string. The following replacements are made. |
| [`file-url-to-path.md`](./file-url-to-path.md) | Convert a file URL to an absolute path | Use `Bun.fileURLToPath()` to convert a `file://` URL to an absolute path. |
| [`gzip.md`](./gzip.md) | Compress and decompress data with gzip | Use `Bun.gzipSync()` to compress a `Uint8Array` with gzip. |
| [`hash-a-password.md`](./hash-a-password.md) | Hash a password | The `Bun.password.hash()` function provides a fast, built-in mechanism for securely hashing passwords in Bun. No third-p… |
| [`import-meta-dir.md`](./import-meta-dir.md) | Get the directory of the current file | Bun provides a handful of module-specific utilities on the [`import.meta`](/docs/runtime/module-resolution#import-meta) … |
| [`import-meta-file.md`](./import-meta-file.md) | Get the file name of the current file | Bun provides a handful of module-specific utilities on the [`import.meta`](/docs/runtime/module-resolution#import-meta) … |
| [`import-meta-path.md`](./import-meta-path.md) | Get the absolute path of the current file | Bun provides a handful of module-specific utilities on the [`import.meta`](/docs/runtime/module-resolution#import-meta) … |
| [`javascript-uuid.md`](./javascript-uuid.md) | Generate a UUID | Use `crypto.randomUUID()` to generate a UUID v4. This API works in Bun, Node.js, and browsers. It requires no dependenci… |
| [`main.md`](./main.md) | Get the absolute path to the current entrypoint | The `Bun.main` property contains the absolute path to the current entrypoint. |
| [`path-to-file-url.md`](./path-to-file-url.md) | Convert an absolute path to a file URL | Use `Bun.pathToFileURL()` to convert an absolute path to a `file://` URL. |
| [`sleep.md`](./sleep.md) | Sleep for a fixed number of milliseconds | The `Bun.sleep` method provides a convenient way to create a void `Promise` that resolves in a fixed number of milliseco… |
| [`upgrade.md`](./upgrade.md) | Upgrade Bun to the latest version | Bun can upgrade itself using the built-in `bun upgrade` command. This is the fastest way to get the latest features and … |
| [`version.md`](./version.md) | Get the current Bun version | Get the current version of Bun in a semver format. |
| [`which-path-to-executable-bin.md`](./which-path-to-executable-bin.md) | Get the path to an executable bin file | `Bun.which` is a utility function to find the absolute path of an executable file. It is similar to the `which` command … |
