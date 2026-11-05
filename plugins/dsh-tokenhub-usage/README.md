# dsh-tokenhub-usage

DSH 客户端插件：在 Web GUI 侧边栏新增 **TokenHub 用量** 面板，可视化查看腾讯云 TokenHub 个人套餐的用量情况。

## 功能

![面板预览](./preview.png)

- **积分总览**：总积分 / 已用 / 剩余（进度条）、**已用百分比**（两位小数，如「已用 25.00%」；超支时按实际显示 >100%，进度条封顶；极小占比显示「<0.01%」）、套餐状态、有效期、自动续费状态
- **Token 统计**：近 7 天输入 / 输出 / 缓存 / 总 token
- **模型用量排行**：近 7 天按模型维度的 token 横向条形图，并标注各模型 **token 占比**
- **积分消耗趋势**：近 30 天每日积分柱状图
- **最近调用**：逐次请求明细（时间、模型、token 拆分、积分消耗）
- 页面每 2 分钟自动刷新，也可手动刷新
- **秒开**：上次快照缓存在浏览器模块作用域，切走再切回面板时直接用缓存渲染（不再转圈），随后后台静默校验；启动后和悬停侧边栏图标时也会预热一次快照

## 依赖

- DSH 客户端 `>= 0.2.1-rc.5`
- TokenHub CLI：`npm i -g tencent-tokenhub-cli`，然后 `th auth login`

插件按下面的顺序查找 `th`，任一路径命中即可：

1. 环境变量 `DSH_TOKENHUB_TH`（指向可执行文件）
2. `~/.local/bin/th`
3. `/usr/local/bin/th`
4. `/opt/homebrew/bin/th`
5. `/opt/local/bin/th`
6. `$PATH` 里的 `th`

都找不到时，面板会提示 `TokenHub CLI not found (th)…`，而不是抛裸的 `ENOENT`。

## 从 GitHub 安装（一条链接）

目标机器装好 DSH 后，在「设置 → 插件 → 安装」里把下面这条链接粘进输入框，选 **Git 仓库**：

```
https://github.com/zacharyhli/DeepSeek-Harness#path:/plugins/dsh-tokenhub-usage
```

> `#path:` 片段不能省：本插件放在 `DeepSeek-Harness` 仓库的 `plugins/` 子目录里，仓库根不是 npm 包。

然后按提示「立即启用」，重启 DSH 即可。装之前可以先在目标机器上确认 TokenHub CLI 就绪：

```bash
npm i -g tencent-tokenhub-cli   # 或已有 th 即可
th auth login
```

几点说明：

- 仓库是**公开**的，安装时匿名 `git clone` 即可，目标机器不需要 GitHub 账号或 token。
- 浏览器里的 `https://github.com/zacharyhli/DeepSeek-Harness/tree/main/plugins/dsh-tokenhub-usage` 只能浏览代码，粘进安装框会被拒（安装器只认仓库地址 + `#path:` 片段）。
- DSH 安装器会用内置 pnpm 执行 `pnpm add <链接>`，包内容由本仓库 `package.json` 的 `files` 白名单决定（只有 `lib/`、`cordis.patch.yml`、README/LICENSE），**不需要构建步骤**——`lib/` 就是产物，直接跑。
- 组合包声明来自 `package.json` 的 `dsh.bundle.patch`，安装器会自动把它加进 profile 的 `dsh.profile.bundles`，**不需要手工编辑 `cordis.patch.yml`**。
- 升级：重新执行一次同样的安装（或插件页里更新），然后重启 DSH。
- 若插件页显示已安装但面板没出现，检查 profile 的 `package.json` 里 `dsh.profile.bundles` 是否含 `dsh-tokenhub-usage`，缺了按下面「手工安装」补上。

## 其他安装方式

| 方式 | 做法 | 适合 |
| --- | --- | --- |
| **Git 仓库**（推荐） | 见上，粘带 `#path:` 的仓库地址 | 其他机器一键装、可升级 |
| **压缩包** | 本机 `npm pack` 得到 `dsh-tokenhub-usage-0.2.1.tgz` → 拷到目标机器 → 安装时选 **压缩包** | 内网、无外网 |
| **本地目录** | 把本目录整个拷过去（不用带 `node_modules`）→ 安装时选 **本地目录** 指向它 | 需要边改边用 |
| **npm 包名** | 发布到 npm 或内网源后，在安装框直接填 `dsh-tokenhub-usage`；私有源用「安装源」切换 | 多人复用、可升级 |

- 本地目录方式装的插件在目标机器上改了源码不会自动生效，同样需要重启。
- GitHub 连不上时，安装器的连接检查会给出提示，可点「改用国内镜像」。

## 手工安装（file: 链接，开发用）

```bash
# 1. 安装到 profile
cd ~/.dsh/profiles/desktop
pnpm add file:<本目录绝对路径>

# 2. package.json 的 dsh.profile.bundles 增加 "dsh-tokenhub-usage"

# 3. 重启 DSH
```

改代码后必须 `pnpm remove dsh-tokenhub-usage && pnpm add file:<目录>` 再重启——pnpm 对同版本 `file:` 依赖会复用旧拷贝。

## 结构

- `lib/index.js` — Host 半：在 Web 服务器注册 `/tokenhub-usage/snapshot` 路由，调用 `th` CLI 并做 30s 缓存 / 单飞
- `lib/client.js` — Client 半：`window.__ModuleLoader__` 工厂包，注入 `main` 面板与 `sidebar.panellist` 入口，同源 `fetch` 获取数据；模块级快照缓存 + 单飞请求，保证重开面板首帧有数据

> 注意：DSH 浏览器端可用的 Remote 命名空间是构建期静态生成的（`ctx.remote.$mount` 的固定清单），
> 第三方包无法新增 `remote.<ns>` 服务。因此本插件用 HTTP 路由 + 同源 fetch 传递数据。

## 卸载

设置 → 插件 → 卸载；或手工删掉 profile 的 `dsh.profile.bundles` 条目后 `pnpm remove dsh-tokenhub-usage`，重启 DSH。
