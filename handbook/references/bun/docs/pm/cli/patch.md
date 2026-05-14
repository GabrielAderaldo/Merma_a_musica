# bun patch
Source: https://bun.com/docs/pm/cli/patch

Persistently patch node_modules packages in a git-friendly way

`bun patch` lets you persistently patch node\_modules in a maintainable, git-friendly way.

Sometimes, you need to make a small change to a package in `node_modules/` to fix a bug or add a feature. `bun patch` lets you do this without vendoring the entire package and reuse the patch across multiple installs, multiple projects, and multiple machines.

Features:

* Generates `.patch` files applied to dependencies in `node_modules` on install
* `.patch` files can be committed to your repository, reused across multiple installs, projects, and machines
* `"patchedDependencies"` in `package.json` keeps track of patched packages
* `bun patch` lets you patch packages in `node_modules/` while preserving the integrity of Bun's [Global Cache](/docs/pm/global-cache)
* Test your changes locally before committing them with `bun patch --commit <pkg>`
* To preserve disk space and keep `bun install` fast, patched packages are committed to the Global Cache and shared across projects where possible

#### Step 1. Prepare the package for patching

To get started, use `bun patch <pkg>` to prepare the package for patching:

```bash terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
# you can supply the package name
bun patch react

# ...and a precise version in case multiple versions are installed
bun patch react@17.0.2

# or the path to the package
bun patch node_modules/react
```

<Note>
  Don't forget to call `bun patch <pkg>`! This ensures the package folder in `node_modules/` contains a fresh copy of the package with no symlinks/hardlinks to Bun's cache.

  If you forget to do this, you might end up editing the package globally in the cache!
</Note>

#### Step 2. Test your changes locally

`bun patch <pkg>` makes it safe to edit the `<pkg>` in `node_modules/` directly, while preserving the integrity of Bun's [Global Cache](/docs/pm/global-cache). This works by re-creating an unlinked clone of the package in `node_modules/` and diffing it against the original package in the Global Cache.

#### Step 3. Commit your changes

Once you're happy with your changes, run `bun patch --commit <path or pkg>`.

Bun will generate a patch file in `patches/`, update your `package.json` and lockfile, and Bun will start using the patched package:

```bash terminal icon="terminal" theme={"theme":{"light":"github-light","dark":"dracula"}}
# you can supply the path to the patched package
bun patch --commit node_modules/react

# ... or the package name and optionally the version
bun patch --commit react@17.0.2

# choose the directory to store the patch files
bun patch --commit react --patches-dir=mypatches

# `patch-commit` is available for compatibility with pnpm
bun patch-commit react
```

***

# CLI Usage

```bash theme={"theme":{"light":"github-light","dark":"dracula"}}
bun patch <package>@<version>
```

### Patch Generation

<ParamField type="boolean">
  Install a package containing modifications in <code>dir</code>
</ParamField>

<ParamField type="string">
  The directory to put the patch file in (only if --commit is used)
</ParamField>

### Dependency Management

<ParamField type="boolean">
  Don't install devDependencies. Alias: <code>-p</code>
</ParamField>

<ParamField type="boolean">
  Skip lifecycle scripts in the project's <code>package.json</code> (dependency scripts are never run)
</ParamField>

<ParamField type="boolean">
  Add to <code>trustedDependencies</code> in the project's <code>package.json</code> and install the package(s)
</ParamField>

<ParamField type="boolean">
  Install globally. Alias: <code>-g</code>
</ParamField>

<ParamField type="string">
  Exclude <code>dev</code>, <code>optional</code>, or <code>peer</code> dependencies from install
</ParamField>

### Project Files & Lockfiles

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

### Installation Control

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
  Always request the latest versions from the registry & reinstall all dependencies. Alias: <code>-f</code>
</ParamField>

<ParamField type="boolean">
  Skip verifying integrity of newly downloaded packages
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
