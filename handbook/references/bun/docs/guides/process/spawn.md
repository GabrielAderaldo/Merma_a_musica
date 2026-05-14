# Spawn a child process
Source: https://bun.com/docs/guides/process/spawn



Use [`Bun.spawn()`](/docs/runtime/child-process) to spawn a child process.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const proc = Bun.spawn(["echo", "hello"]);

// await completion
await proc.exited;
```

***

The second argument accepts a configuration object.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const proc = Bun.spawn(["echo", "Hello, world!"], {
  cwd: "/tmp",
  env: { FOO: "bar" },
  onExit(proc, exitCode, signalCode, error) {
    // exit handler
  },
});
```

***

By default, the `stdout` of the child process can be consumed as a `ReadableStream` using `proc.stdout`.

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const proc = Bun.spawn(["echo", "hello"]);

const output = await proc.stdout.text();
output; // => "hello\n"
```

***

See [Docs > API > Child processes](/docs/runtime/child-process) for complete documentation.
