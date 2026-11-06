# DeepSeek-Harness 工具集

DSH（DeepSeek Harness）插件合集。`plugins/` 下每个子目录都是一个可直接安装的插件包：`lib/` 即运行产物（无需构建），`package.json` 的 `dsh` 字段向 DSH 声明组合包与浏览器端。

## 插件

| 插件 | 说明 |
| --- | --- |
| [dsh-tokenhub-usage](plugins/dsh-tokenhub-usage) | TokenHub 用量面板：积分余额、Token 统计、模型排行、30 天积分趋势（含今天）、最近调用 |

## 安装

在 DSH 的「设置 → 插件 → 安装」中选择 **Git 仓库**，粘贴：

```
https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage
```

装完点「立即启用」，重启 DSH，侧边栏就会出现入口。

> **`#path:` 片段不能省。** 仓库根目录不是 npm 包，安装器需要它定位到具体插件子目录。
>
> 仓库是公开的，安装时匿名 `git clone` 即可，目标机器不需要 GitHub 账号或 token。
> 浏览器地址栏里的 `…/tree/main/...` 不能用于安装，只保留仓库地址 + `#path:` 片段即可。

## 更新

推送新提交后，用同一链接重新安装（或在插件页点更新），再重启 DSH。

## 手动安装

```bash
cd ~/.dsh/profiles/<profile>
pnpm add "https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage"
```

再把 `dsh-tokenhub-usage` 加进该 profile `package.json` 的 `dsh.profile.bundles` 数组，重启 DSH。

## 目录约定

```
plugins/<插件包名>/
├── package.json      # name / type: module / exports / dsh{ bundle, client } / files
├── cordis.patch.yml  # 组合包补丁（新增行须包在 insert: 里）
├── lib/index.js      # Host 半（可选）：注册 HTTP 路由、提供数据
├── lib/client.js     # Client 半：window.__ModuleLoader__.load({...})
├── README.md
└── LICENSE
```

插件包名需与 `dsh.profile.bundles` 的条目一致，也与 client 半 `__ModuleLoader__.load({ id })` 的 `id` 一致。
