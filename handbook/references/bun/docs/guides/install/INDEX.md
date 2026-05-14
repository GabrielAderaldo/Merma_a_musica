# Bun Docs — `guides/install`

bun install — dependências, monorepo, registries customizados, CI.

**17** página(s) nesta seção.

| Arquivo | Título | Descrição |
|---|---|---|
| [`add-dev.md`](./add-dev.md) | Add a development dependency | To add an npm package as a development dependency, use `bun add --development`. |
| [`add-git.md`](./add-git.md) | Add a Git dependency | Bun supports directly adding GitHub repositories as dependencies of your project. |
| [`add-optional.md`](./add-optional.md) | Add an optional dependency | To add an npm package as an optional dependency, use the `--optional` flag. |
| [`add-peer.md`](./add-peer.md) | Add a peer dependency | To add an npm package as a peer dependency, use the `--peer` flag. |
| [`add-tarball.md`](./add-tarball.md) | Add a tarball dependency | Bun's package manager can install any publicly available tarball URL as a dependency of your project. |
| [`add.md`](./add.md) | Add a dependency | To add an npm package as a dependency, use `bun add`. |
| [`azure-artifacts.md`](./azure-artifacts.md) | Using bun install with an Azure Artifacts npm registry | <Note> |
| [`cicd.md`](./cicd.md) | Install dependencies with Bun in GitHub Actions | Use the official [`setup-bun`](https://github.com/oven-sh/setup-bun) GitHub Action to install `bun` in your GitHub Actio… |
| [`custom-registry.md`](./custom-registry.md) | Override the default npm registry for bun install | The default registry is `registry.npmjs.org`. This can be globally configured in `bunfig.toml`. |
| [`from-npm-install-to-bun-install.md`](./from-npm-install-to-bun-install.md) | Migrate from npm install to bun install | `bun install` is a Node.js compatible npm client designed to be an incredibly fast successor to npm. |
| [`git-diff-bun-lockfile.md`](./git-diff-bun-lockfile.md) | Configure git to diff Bun's lockb lockfile | <Note> |
| [`jfrog-artifactory.md`](./jfrog-artifactory.md) | Using bun install with Artifactory | [JFrog Artifactory](https://jfrog.com/artifactory/) is a package management system for npm, Docker, Maven, NuGet, Ruby, … |
| [`npm-alias.md`](./npm-alias.md) | Install a package under a different name | To install an npm package under an alias: |
| [`registry-scope.md`](./registry-scope.md) | Configure a private registry for an organization scope with bun install | Private registries can be configured using either [`.npmrc`](/docs/pm/npmrc) or [`bunfig.toml`](/docs/runtime/bunfig#ins… |
| [`trusted.md`](./trusted.md) | Add a trusted dependency | Unlike other npm clients, Bun does not execute arbitrary lifecycle scripts for installed dependencies, such as `postinst… |
| [`workspaces.md`](./workspaces.md) | Configuring a monorepo using workspaces | Bun's package manager supports npm `"workspaces"`. This allows you to split a codebase into multiple distinct "packages"… |
| [`yarnlock.md`](./yarnlock.md) | Generate a yarn-compatible lockfile | <Note> |
