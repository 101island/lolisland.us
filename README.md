# lolisland.us

English | [简体中文](./README_cn.md)

[![GitHub stars](https://img.shields.io/github/stars/101island/lolisland.us?style=social)](https://github.com/101island/lolisland.us)
[![GitHub forks](https://img.shields.io/github/forks/101island/lolisland.us?style=social)](https://github.com/101island/lolisland.us)
[![Repo size](https://img.shields.io/github/repo-size/101island/lolisland.us)](https://github.com/101island/lolisland.us)
[![Top Language](https://img.shields.io/github/languages/top/101island/lolisland.us)](https://github.com/101island/lolisland.us)

## Build and Develop

```sh
git clone https://github.com/101island/lolisland.us
cd lolisland.us
```

### Switch to `dev` branch

```sh
git checkout dev
```

### Install dependencies

```sh
bun install
```

### Develop

```sh
bun dev
```

### Build

```sh
bun run build
```

## Release Instructions

- Submit code to the `dev` branch.

```sh
git pull
git commit -m "your commit message"
git push origin dev
```

After submission, you can view the commit effect on the `dev` branch at [dev.lolisland.pages.dev](https://dev.lolisland.pages.dev).

- After confirming everything is fine, create a Pull Request to merge into the `main` branch.

- Please use a normal merge (Merge Commit) for merging branches, not a squash merge.
