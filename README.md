# Sub2API Account Renderer（Kindle 前端工作副本）

这是一个面向 600×800 Kindle/e-ink 屏幕的黑白账号额度页面。页面只显示账号、今日请求、7d 剩余额度、7d 重置时间和 7d 请求总次数；账号名过长会截断，请求数超过 1000 会显示为两位小数的 K，例如 `2333 → 2.33K`。

## 本地预览

需要 Node.js 18 或更高版本，项目没有第三方运行时依赖：

```bash
npm install
npm run build
npm run serve
```

然后打开 <http://127.0.0.1:8787>。也可以运行 `npm start` 一步构建并预览。页面默认使用 `web/accounts-data.js` 中的脱敏演示数据，不会直接访问 Sub2API。

## 更新真实数据

管理员 Key 只放在本地环境变量中，不要写入 HTML、JavaScript、GitHub 或 Kindle：

```bash
export SUB2API_BASE_URL='http://sub2api.raycloud.cn'
export SUB2API_ADMIN_KEY='你的管理员 Key'

npm run update-data
npm run build
```

`npm run update-data` 会在本地请求：

- `/api/v1/admin/accounts`
- `/api/v1/admin/accounts/usage/batch`
- `/api/v1/admin/accounts/today-stats/batch`

脚本会先从账号列表接口自动提取全部账号 ID，再请求对应的总额度和今日统计。只提取 Kindle 需要的字段并写入 `web/accounts-data.js`，不会保存 API Key；分组字段虽然保留在数据中，但不会在页面展示。

如果只想更新指定账号，可以临时设置可选筛选项；不设置或设置为 `0` 表示更新全部账号：

```bash
export SUB2API_ACCOUNT_IDS='27,24,28'
npm run update-data
unset SUB2API_ACCOUNT_IDS
```

更新完成后可清除环境变量：

```bash
unset SUB2API_BASE_URL SUB2API_ADMIN_KEY SUB2API_ACCOUNT_IDS
```

## 发布到 GitHub Pages

先在你自己的 GitHub 仓库中启用 Pages，发布源选择 `main` 分支的 `/docs` 目录。然后执行：

```bash
mkdir -p docs
cp -R dist/. docs/
git add web/accounts-data.js docs
git commit -m "update account usage"
git push origin main
```

Kindle 访问：

```text
https://你的用户名.github.io/仓库名/
```

如果页面仍是旧缓存，在地址后追加 `?v=时间戳` 刷新。`docs/` 中的账号名称和用量会公开给能访问 Pages 地址的人，因此不要把敏感账号信息发布到公开页面。

## 主要文件

- `web/index.html`：Kindle 页面结构
- `web/accounts.css`：兼容旧版 Kindle 浏览器的黑白布局
- `web/accounts-runtime.js`：账号渲染、K 格式、额度和重置时间逻辑
- `web/accounts-data.js`：本地演示或最近一次更新的数据
- `scripts/update-data.cjs`：本地安全更新数据
- `scripts/build-site.cjs`：生成 `dist/` 静态页面
- `scripts/serve.cjs`：本地静态预览服务器

许可证：MIT，见 [LICENSE](LICENSE)。
