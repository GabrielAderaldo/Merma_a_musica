# Re-run tests multiple times with the Bun test runner
Source: https://bun.com/docs/guides/test/rerun-each



Use the `--rerun-each` flag to re-run every test multiple times with the Bun test runner. This is useful for finding flaky or non-deterministic tests.

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
# re-run each test 10 times
bun test --rerun-each 10
```

***

See [Docs > Test runner](/docs/test) for complete documentation of `bun test`.
