# Bun Docs — `guides/test`

bun test — coverage, snapshot, mock, watch, glob concurrency, happy-dom.

**19** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`bail.md`](./bail.md) | Bail early with the Bun test runner | Use the `--bail` flag to bail on a test run after a single failure. This is useful for aborting as soon as possible in a… |
| [`concurrent-test-glob.md`](./concurrent-test-glob.md) | Selectively run tests concurrently with glob patterns | Set a glob pattern to decide which tests from which files run in parallel |
| [`coverage-threshold.md`](./coverage-threshold.md) | Set a code coverage threshold with the Bun test runner | Bun's test runner supports built-in code coverage reporting via the `--coverage` flag. |
| [`coverage.md`](./coverage.md) | Generate code coverage reports with the Bun test runner | Bun's test runner supports built-in *code coverage reporting*. Use it to see how much of your codebase is covered by tes… |
| [`happy-dom.md`](./happy-dom.md) | Write browser DOM tests with Bun and happy-dom | You can write and run browser tests with Bun's test runner in conjunction with [Happy DOM](https://github.com/capricorn8… |
| [`migrate-from-jest.md`](./migrate-from-jest.md) | Migrate from Jest to Bun's test runner | In many cases, Bun's test runner can run Jest test suites with no code changes. Just run `bun test` instead of `npx jest… |
| [`mock-clock.md`](./mock-clock.md) | Set the system time in Bun's test runner | Bun's test runner supports setting the system time programmatically with the `setSystemTime` function. |
| [`mock-functions.md`](./mock-functions.md) | Mock functions in `bun test` | Create mocks with the `mock` function from `bun:test`. |
| [`rerun-each.md`](./rerun-each.md) | Re-run tests multiple times with the Bun test runner | Use the `--rerun-each` flag to re-run every test multiple times with the Bun test runner. This is useful for finding fla… |
| [`run-tests.md`](./run-tests.md) | Run your tests with the Bun test runner | Bun has a built-in [test runner](/docs/test) with a Jest-like `expect` API. |
| [`skip-tests.md`](./skip-tests.md) | Skip tests with the Bun test runner | To skip a test with the Bun test runner, use the `test.skip` function. |
| [`snapshot.md`](./snapshot.md) | Use snapshot testing in `bun test` | Bun's test runner supports Jest-style snapshot testing via `.toMatchSnapshot()`. |
| [`spy-on.md`](./spy-on.md) | Spy on methods in `bun test` | Use the `spyOn` utility to track method calls with Bun's test runner. |
| [`svelte-test.md`](./svelte-test.md) | import, require, and test Svelte components with bun test | Bun's [Plugin API](/docs/runtime/plugins) lets you add custom loaders to your project. The `test.preload` option in `bun… |
| [`testing-library.md`](./testing-library.md) | Using Testing Library with Bun | You can use [Testing Library](https://testing-library.com/) with Bun's test runner. |
| [`timeout.md`](./timeout.md) | Set a per-test timeout with the Bun test runner | Use the `--timeout` flag to set a timeout for each test in milliseconds. If any test exceeds this timeout, it will be ma… |
| [`todo-tests.md`](./todo-tests.md) | Mark a test as a "todo" with the Bun test runner | To remind yourself to write a test later, use the `test.todo` function. There's no need to provide a test implementation… |
| [`update-snapshots.md`](./update-snapshots.md) | Update snapshots in `bun test` | Bun's test runner supports Jest-style snapshot testing via `.toMatchSnapshot()`. |
| [`watch-mode.md`](./watch-mode.md) | Run tests in watch mode with Bun | Use the `--watch` flag to run your tests in watch mode. |
