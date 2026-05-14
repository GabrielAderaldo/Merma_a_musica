# bun update
Source: https://bun.com/docs/pm/cli/update

Update dependencies to latest versions

<Note>To upgrade your Bun CLI version, see [`bun upgrade`](/docs/installation#upgrading).</Note>

To update all dependencies to the latest version:

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun update
```

To update a specific dependency to the latest version:

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun update [package]
```

## `--interactive`

For a more controlled update experience, use the `--interactive` flag to select which packages to update:

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun update --interactive
bun update -i
```

This launches an interactive terminal interface that shows all outdated packages with their current and target versions. You can then select which packages to update.

### Interactive Interface

The interface displays packages grouped by dependency type:

```txt theme={"theme":{"light":"github-light","dark":"dracula"}}
? Select packages to update - Space to toggle, Enter to confirm, a to select all, n to select none, i to invert, l to toggle latest

  dependencies                Current  Target   Latest
    □ react                   17.0.2   18.2.0   18.3.1
    □ lodash                  4.17.20  4.17.21  4.17.21

  devDependencies             Current  Target   Latest
    □ typescript              4.8.0    5.0.0    5.3.3
    □ @types/node             16.11.7  18.0.0   20.11.5

  optionalDependencies        Current  Target   Latest
    □ some-optional-package   1.0.0    1.1.0    1.2.0
```

**Sections:**

* Packages are grouped under section headers: `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`
* Each section shows column headers aligned with the package data

**Columns:**

* **Package**: Package name (may have suffix like ` dev`, ` peer`, ` optional` for clarity)
* **Current**: Currently installed version
* **Target**: Version that would be installed (respects semver constraints)
* **Latest**: Latest available version

### Keyboard Controls

**Selection:**

* **Space**: Toggle package selection
* **Enter**: Confirm selections and update
* **a/A**: Select all packages
* **n/N**: Select none
* **i/I**: Invert selection

**Navigation:**

* **↑/↓ Arrow keys** or **j/k**: Move cursor
* **l/L**: Toggle between target and latest version for current package

**Exit:**

* **Ctrl+C** or **Ctrl+D**: Cancel without updating

### Visual Indicators

* **☑** Selected packages (will be updated)
* **□** Unselected packages
* **>** Current cursor position
* **Colors**: Red (major), yellow (minor), green (patch) version changes
* **Underlined**: Currently selected update target

### Package Grouping

Packages are organized in sections by dependency type:

* **dependencies** - Regular runtime dependencies
* **devDependencies** - Development dependencies
* **peerDependencies** - Peer dependencies
* **optionalDependencies** - Optional dependencies

Within each section, individual packages may have additional suffixes (` dev`, ` peer`, ` optional`) for extra clarity.

## `--recursive`

Use the `--recursive` flag with `--interactive` to update dependencies across all workspaces in a monorepo:

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun update --interactive --recursive
bun update -i -r
```

This displays an additional "Workspace" column showing which workspace each dependency belongs to.

## `--latest`

By default, `bun update` will update to the latest version of a dependency that satisfies the version range specified in your `package.json`.

To update to the latest version, regardless of if it's compatible with the current version range, use the `--latest` flag:

```sh terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun update --latest
```

In interactive mode, you can toggle individual packages between their target version (respecting semver) and latest version using the **l** key.

For example, with the following `package.json`:

```json package.json icon="file-json" theme={"theme":{"light":"github-light","dark":"dracula"}}
{
  "dependencies": {
    "react": "^17.0.2"
  }
}
```

* `bun update` would update to a version that matches `17.x`.
* `bun update --latest` would update to a version that matches `18.x` or later.

***

## CLI Usage

```bash terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
bun update <package> <version>
```

### Update Strategy

<ParamField type="boolean">
  Always request the latest versions from the registry & reinstall all dependencies. Alias: <code>-f</code>
</ParamField>

<ParamField type="boolean">
  Update packages to their latest versions
</ParamField>

### Dependency Scope

<ParamField type="boolean">
  Don't install devDependencies. Alias: <code>-p</code>
</ParamField>

<ParamField type="boolean">
  Install globally. Alias: <code>-g</code>
</ParamField>

<ParamField type="string">
  Exclude <code>dev</code>, <code>optional</code>, or <code>peer</code> dependencies from install
</ParamField>

### Project File Management

<ParamField type="boolean">
  Write a <code>yarn.lock</code> file (yarn v1). Alias: <code>-y</code>
</ParamField>

<ParamField type="boolean">
  Don't update <code>package.json</code> or save a lockfile
</ParamField>

<ParamField type="boolean">
  Save to <code>package.json</code> (true by default)
</ParamField>

<ParamField type="boolean">
  Disallow changes to lockfile
</ParamField>

<ParamField type="boolean">
  Save a text-based lockfile
</ParamField>

<ParamField type="boolean">
  Generate a lockfile without installing dependencies
</ParamField>

### Network & Registry

<ParamField type="string">
  Provide a Certificate Authority signing certificate
</ParamField>

<ParamField type="string">
  Same as <code>--ca</code>, but as a file path to the certificate
</ParamField>

<ParamField type="string">
  Use a specific registry by default, overriding <code>.npmrc</code>, <code>bunfig.toml</code> and environment variables
</ParamField>

<ParamField type="number">
  Maximum number of concurrent network requests (default 48)
</ParamField>

### Caching

<ParamField type="string">
  Store & load cached data from a specific directory path
</ParamField>

<ParamField type="boolean">
  Ignore manifest cache entirely
</ParamField>

### Output & Logging

<ParamField type="boolean">
  Don't log anything
</ParamField>

<ParamField type="boolean">
  Excessively verbose logging
</ParamField>

<ParamField type="boolean">
  Disable the progress bar
</ParamField>

<ParamField type="boolean">
  Don't print a summary
</ParamField>

### Script Execution

<ParamField type="boolean">
  Skip lifecycle scripts in the project's <code>package.json</code> (dependency scripts are never run)
</ParamField>

<ParamField type="number">
  Maximum number of concurrent jobs for lifecycle scripts (default 5)
</ParamField>

### Installation Controls

<ParamField type="boolean">
  Skip verifying integrity of newly downloaded packages
</ParamField>

<ParamField type="boolean">
  Add to <code>trustedDependencies</code> in the project's <code>package.json</code> and install the package(s)
</ParamField>

<ParamField type="string">
  Platform-specific optimizations for installing dependencies. Possible values: <code>clonefile</code> (default),
  <code>hardlink</code>, <code>symlink</code>, <code>copyfile</code>
</ParamField>

### General & Environment

<ParamField type="string">
  Specify path to config file (<code>bunfig.toml</code>). Alias: <code>-c</code>
</ParamField>

<ParamField type="boolean">
  Don't install anything
</ParamField>

<ParamField type="string">
  Set a specific cwd
</ParamField>

<ParamField type="boolean">
  Print this help menu. Alias: <code>-h</code>
</ParamField>
