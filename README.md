# DeepSeek-Harness 工具集

DSH（DeepSeek Harness）的插件合集。`plugins/` 下每个子目录都是一个可直接安装的插件包：`lib/` 就是运行产物（无需构建），`package.json` 里的 `dsh` 字段向 DSH 声明组合包与浏览器半。

## 插件列表

| 插件 | 说明 |
| --- | --- |
| [`dsh-tokenhub-usage`](plugins/dsh-tokenhub-usage) | TokenHub 用量面板：积分余额、周期 Token 统计、模型用量排行、30 天积分趋势、最近调用 |

## 安装

在 DSH「设置 → 插件 → 安装」里选 **Git 仓库**，粘贴插件的安装地址：

```
https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage
```

装完按提示「立即启用」，再重启 DSH，侧边栏就会出现入口。

> **`#path:` 不能省。** 仓库根目录不是 npm 包，安装器需要这个片段才知道包在哪个子目录。
> 浏览器地址栏里的 `https://github.com/zacharyhli/DeepSeek-Harness/tree/main/plugins/dsh-tokenhub-usage`
> 只能用来浏览代码；直接粘进安装框会被拒绝（"a URL must point at a git repository or a tarball"），
> 不带 `#path:` 的仓库根地址则会装出一个没有 `dsh` 声明的空包。

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
