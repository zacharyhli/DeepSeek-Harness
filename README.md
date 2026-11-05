# DeepSeek-Harness 工具集

DSH（DeepSeek Harness）的插件合集。`plugins/` 下每个子目录都是一个可直接安装的插件包：`lib/` 就是运行产物（无需构建），`package.json` 里的 `dsh` 字段向 DSH 声明组合包与浏览器半。

## 插件列表

| 插件 | 说明 |
| --- | --- |
| [`dsh-tokenhub-usage`](plugins/dsh-tokenhub-usage) | TokenHub 用量面板：积分余额、周期 Token 统计、模型用量排行、30 天积分趋势、最近调用 |

## 安装

> 本仓库是**私有**的，匿名 `git clone` 会被拒（404）。目标机器必须先具备只读权限，二选一：
>
> 1. 把目标机器的 SSH 公钥加到本仓库 **Settings → Deploy keys**（只勾读权限）
> 2. 或者目标机器本来就装有该 GitHub 账号的 SSH key
>
> 然后用 **SSH 形式**的安装地址：

```
git+ssh://git@github.com/zacharyhli/DeepSeek-Harness.git#path:/plugins/dsh-tokenhub-usage
```

在 DSH「设置 → 插件 → 安装」里选 **Git 仓库**粘贴，装完按提示「立即启用」，再重启 DSH，侧边栏就会出现入口。

> **`#path:` 不能省。** 仓库根目录不是 npm 包，安装器需要这个片段才知道包在哪个子目录。
>
> 三种写法实测结果（2026-11，pnpm 11.28.5）：
>
> | 写法 | 结果 |
> | --- | --- |
> | `git+ssh://git@github.com/…/DeepSeek-Harness.git#path:/plugins/…` | ✅ 私有库可用 |
> | `git@github.com:zacharyhli/DeepSeek-Harness.git#path:/plugins/…`（scp 写法） | ❌ pnpm 不认 |
> | `https://github.com/…` + PAT/credential helper | ❌ 安装器预检会清空 credential helper，过不了连通性检查 |
> | `https://github.com/…`（匿名 HTTPS） | ❌ 私有库返回 404 |
>
> 浏览器地址栏里的 `…/tree/main/plugins/dsh-tokenhub-usage` 只能浏览代码，粘进安装框会被拒绝。
>
> 如果你更希望"一条链接匿名安装"，把仓库切成 Public 即可，届时用
> `https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage`。

## 更新

插件有新提交后，重新执行一次同样的安装（或插件页里的更新操作），再重启 DSH。

## 手动安装（不走 GUI）

```bash
cd ~/.dsh/profiles/<profile>
pnpm add "git+ssh://git@github.com/zacharyhli/DeepSeek-Harness.git#path:/plugins/dsh-tokenhub-usage"
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
