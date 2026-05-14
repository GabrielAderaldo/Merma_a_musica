# bun link
Source: https://bun.com/docs/pm/cli/link

Link local packages for development

Use `bun link` in a local directory to register the current package as a "linkable" package.

```bash terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
cd /path/to/cool-pkg
cat package.json
bun link
```

```txt theme={"theme":{"light":"github-light","dark":"dracula"}}
bun link v1.3.3 (7416672e)
Success! Registered "cool-pkg"

To use cool-pkg in a project, run:
  bun link cool-pkg

Or add it in dependencies in your package.json file:
  "cool-pkg": "link:cool-pkg"
```

This package can now be "linked" into other projects using `bun link cool-pkg`. This will create a symlink in the `node_modules` directory of the target project, pointing to the local directory.

```bash terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
cd /path/to/my-app
bun link cool-pkg
```

In addition, the `--save` flag can be used to add `cool-pkg` to the `dependencies` field of your app's package.json with a special version specifier that tells Bun to load from the registered local directory instead of installing from `npm`:

```json package.json icon="file-json" theme={"theme":{"light":"github-light","dark":"dracula"}}
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "cool-pkg": "link:cool-pkg" // [!code ++]
  }
}
```

## Unlinking

Use `bun unlink` in the root directory to unregister a local package.

```bash terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
cd /path/to/cool-pkg
bun unlink
```

```txt theme={"theme":{"light":"github-light","dark":"dracula"}}
bun unlink v1.3.3 (7416672e)
```

***

# CLI Usage

```bash theme={"theme":{"light":"github-light","dark":"dracula"}}
bun link <packages>
```

### Installation Scope

<ParamField type="boolean">
  Install globally. Alias: <code>-g</code>
</ParamField>

### Dependency Management

<ParamField type="boolean">
  Don't install devDependencies. Alias: <code>-p</code>
</ParamField>

<ParamField type="string">
  Exclude <code>dev</code>, <code>optional</code>, or <code>peer</code> dependencies from install
</ParamField>

### Project Files & Lockfiles

<ParamField type="boolean">
  Write a <code>yarn.lock</code> file (yarn v1). Alias: <code>-y</code>
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

<ParamField type="boolean">
  Don't update <code>package.json</code> or save a lockfile
</ParamField>

<ParamField type="boolean">
  Save to <code>package.json</code> (true by default)
</ParamField>

<ParamField type="boolean">
  Add to <code>trustedDependencies</code> in the project's <code>package.json</code> and install the package(s)
</ParamField>

### Installation Control

<ParamField type="boolean">
  Always request the latest versions from the registry & reinstall all dependencies. Alias: <code>-f</code>
</ParamField>

<ParamField type="boolean">
  Skip verifying integrity of newly downloaded packages
</ParamField>

<ParamField type="string">
  Platform-specific optimizations for installing dependencies. Possible values: <code>clonefile</code> (default),
  <code>hardlink</code>, <code>symlink</code>, <code>copyfile</code>
</ParamField>

<ParamField type="string">
  Linker strategy (one of <code>isolated</code> or <code>hoisted</code>)
</ParamField>

<ParamField type="boolean">
  Don't install anything
</ParamField>

<ParamField type="boolean">
  Skip lifecycle scripts in the project's <code>package.json</code> (dependency scripts are never run)
</ParamField>

### Network & Registry

<ParamField type="string">
  Provide a Certificate Authority signing certificate
</ParamField>

<ParamField type="string">
  Same as <code>--ca</code>, but as a file path to the certificate
</ParamField>

<ParamField type="string">
  Use a specific registry by default, overriding <code>.npmrc</code>, <code>bunfig.toml</code>, and environment
  variables
</ParamField>

<ParamField type="number">
  Maximum number of concurrent network requests (default 48)
</ParamField>

### Performance & Resource

<ParamField type="number">
  Maximum number of concurrent jobs for lifecycle scripts (default 5)
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
  Only show tarball name when packing
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

### Platform Targeting

<ParamField type="string">
  Override CPU architecture for optional dependencies (e.g., <code>x64</code>, <code>arm64</code>, <code>\*</code> for
  all)
</ParamField>

<ParamField type="string">
  Override operating system for optional dependencies (e.g., <code>linux</code>, <code>darwin</code>, <code>\*</code> for
  all)
</ParamField>

### Global Configuration & Context

<ParamField type="string">
  Specify path to config file (<code>bunfig.toml</code>). Alias: <code>-c</code>
</ParamField>

<ParamField type="string">
  Set a specific current working directory
</ParamField>

### Help

<ParamField type="boolean">
  Print this help menu. Alias: <code>-h</code>
</ParamField>
