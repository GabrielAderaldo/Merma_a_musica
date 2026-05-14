# Bun Docs — `guides/write-file`

Escrita de arquivos, append, FileSink, stdout.

**10** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`append.md`](./append.md) | Append content to a file | Bun implements the `node:fs` module, which includes the `fs.appendFile` and `fs.appendFileSync` functions for appending … |
| [`basic.md`](./basic.md) | Write a string to a file | This code snippet writes a string to disk at a particular *absolute path*. |
| [`blob.md`](./blob.md) | Write a Blob to a file | This code snippet writes a `Blob` to disk at a particular path. |
| [`cat.md`](./cat.md) | Write a file to stdout | Bun exposes `stdout` as a `BunFile` with the `Bun.stdout` property. This can be used as a destination for [`Bun.write()`… |
| [`file-cp.md`](./file-cp.md) | Copy a file to another location | This code snippet copies a file to another location on disk. |
| [`filesink.md`](./filesink.md) | Write a file incrementally | Bun provides an API for incrementally writing to a file. This is useful for writing large files, or for writing to a fil… |
| [`response.md`](./response.md) | Write a Response to a file | This code snippet writes a `Response` to disk at a particular path. Bun will consume the `Response` body according to it… |
| [`stdout.md`](./stdout.md) | Write to stdout | The `console.log` function writes to `stdout`. It will automatically append a line break at the end of the printed data. |
| [`stream.md`](./stream.md) | Write a ReadableStream to a file | To write a `ReadableStream` to disk, first create a `Response` instance from the stream. This `Response` can then be wri… |
| [`unlink.md`](./unlink.md) | Delete a file | The `Bun.file()` function accepts a path and returns a `BunFile` instance. Use the `.delete()` method to delete the file… |
