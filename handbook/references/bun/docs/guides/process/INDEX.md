# Bun Docs — `guides/process`

Spawn, IPC, stdin/stdout, signals, argv.

**9** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`argv.md`](./argv.md) | Parse command-line arguments | The *argument vector* is the list of arguments passed to the program when it is run. It is available as `Bun.argv`. |
| [`ctrl-c.md`](./ctrl-c.md) | Listen for CTRL+C | The `ctrl+c` shortcut sends an *interrupt signal* to the running process. This signal can be intercepted by listening fo… |
| [`ipc.md`](./ipc.md) | Spawn a child process and communicate using IPC | Use [`Bun.spawn()`](/docs/runtime/child-process) to spawn a child process. When spawning a second `bun` process, you can… |
| [`nanoseconds.md`](./nanoseconds.md) | Get the process uptime in nanoseconds | Use `Bun.nanoseconds()` to get the total number of nanoseconds the `bun` process has been alive. |
| [`os-signals.md`](./os-signals.md) | Listen to OS signals | Bun supports the Node.js `process` global, including the `process.on()` method for listening to OS signals. |
| [`spawn-stderr.md`](./spawn-stderr.md) | Read stderr from a child process | When using [`Bun.spawn()`](/docs/runtime/child-process), the child process inherits the `stderr` of the spawning process… |
| [`spawn-stdout.md`](./spawn-stdout.md) | Read stdout from a child process | When using [`Bun.spawn()`](/docs/runtime/child-process), the `stdout` of the child process can be consumed as a `Readabl… |
| [`spawn.md`](./spawn.md) | Spawn a child process | Use [`Bun.spawn()`](/docs/runtime/child-process) to spawn a child process. |
| [`stdin.md`](./stdin.md) | Read from stdin | For CLI tools, it's often useful to read from `stdin`. In Bun, the `console` object is an `AsyncIterable` that yields li… |
