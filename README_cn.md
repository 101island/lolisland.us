# lolisland.us

[English](./README.md) | 简体中文

[![GitHub stars](https://img.shields.io/github/stars/101island/lolisland.us?style=social)](https://github.com/101island/lolisland.us)
[![GitHub forks](https://img.shields.io/github/forks/101island/lolisland.us?style=social)](https://github.com/101island/lolisland.us)
[![Repo size](https://img.shields.io/github/repo-size/101island/lolisland.us)](https://github.com/101island/lolisland.us)
[![Top Language](https://img.shields.io/github/languages/top/101island/lolisland.us)](https://github.com/101island/lolisland.us)

## 构建与开发

```sh
git clone https://github.com/101island/lolisland.us
cd lolisland.us
```

### 切换到 `dev` 分支

```sh
git checkout dev
```

### 安装依赖

```sh
bun install
```

### 开发

```sh
bun dev
```

### 构建

```sh
bun run build
```

## 发布说明

- 提交代码到 `dev` 分支。

```sh
git pull
git commit -m "your commit message"
git push origin dev
```

提交后可以在 [dev.lolisland.pages.dev](https://dev.lolisland.pages.dev) 查看 `dev` 分支的 commit 效果。

- 确认没问题后，发起 Pull Request 合并到 `main` 分支。

- 合并分支请统一使用普通 merge（Merge Commit），不使用 squash merge。
