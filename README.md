# DeepSeek-Harness 工具集

DSH（DeepSeek Harness）的插件合集。`plugins/` 下每个子目录都是一个可直接安装的插件包：`lib/` 就是运行产物（无需构建），`package.json` 里的 `dsh` 字段向 DSH 声明组合包与浏览器半。

## 插件列表

| 插件 | 说明 |
| --- | --- |
| [`dsh-tokenhub-usage`](plugins/dsh-tokenhub-usage) | TokenHub 用量面板：积分余额、周期 Token 统计、模型用量排行、30 天积分趋势、最近调用 |

## 安装

仓库是**公开**的，目标机器不需要 GitHub 账号或 token。在 DSH「设置 → 插件 → 安装」里选 **Git 仓库**，粘贴：

```
https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage
```

装完按提示「立即启用」，再重启 DSH，侧边栏就会出现入口。

> **`#path:` 不能省。** 仓库根目录不是 npm 包，安装器需要这个片段才知道包在哪个子目录。
>
> 实测（2026-11，pnpm 11.28.5，无任何凭据的环境）：
>
> | 写法 | 结果 |
> | --- | --- |
> | `https://github.com/…/DeepSeek-Harness#path:/plugins/…` | ✅ 匿名可装 |
> | `…/tree/main/plugins/dsh-tokenhub-usage`（浏览器地址） | ❌ 安装器拒绝：只认仓库地址 + `#path:` |
> | 不带 `#path:` 的仓库根地址 | ❌ 装出没有 `dsh` 声明的空包 |
>
> 如果以后仓库转回私有，改用 SSH 形式
> `git+ssh://git@github.com/zacharyhli/DeepSeek-Harness.git#path:/plugins/dsh-tokenhub-usage`，
> 并先给目标机器加只读 Deploy key（`git@github.com:…` 的 scp 写法 pnpm 不认）。

## 更新

插件有新提交后，重新执行一次同样的安装（或插件页里的更新操作），再重启 DSH。

## 手动安装（不走 GUI）

```bash
cd ~/.dsh/profiles/<profile>
pnpm add "https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage"
```

再把 `dsh-tokenhub-usage` 加进该 profile `package.json` 的 `dsh.profile.bundles` 数组，重启 DSH。

## 目录约定

```
plugins/<插件包名>/
├── package.json          # name / type:module / exports / dsh{ bundle, client } / files
├── cordis.patch.yml      # 组合包补丁（新增行必须包在 insert: 里）
├── lib/index.js          # Host 半（可选）：注册 HTTP 路由、提供数据
├── lib/client.js         # Client 半：window.__ModuleLoader__.load({...})
├── README.md
└── LICENSE
```

插件包名需与 `dsh.profile.bundles` 里的条目一致，也与 client 半 `__ModuleLoader__.load({ id })` 的 `id` 一致。
