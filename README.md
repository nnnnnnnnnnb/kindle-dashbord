# Sub2API Account Renderer（前端工作副本）

这是一个只保留页面代码的前端工作副本，当前页面按你提供的 Sub2API 账号列表截图裁剪成 Kindle 友好的黑白列表，适合继续调整布局、字号和交互。

## 本地预览

需要 Node.js 18 或更高版本。项目没有第三方运行时依赖：

```bash
npm install
npm run build
npm run serve
```

然后打开 <http://127.0.0.1:8787>。页面使用 `web/accounts-data.js` 中的脱敏演示数据，不会访问任何真实账户或外部 API。

也可以直接运行：

```bash
npm start
```

## 前端文件

- `web/index.html`：Kindle 账号表页面结构
- `web/accounts.css`：600×800 黑白 e-ink 布局和视觉样式
- `web/accounts-runtime.js`：账号行、剩余额度、重置时间和请求次数逻辑；提供 `renderAccountBatches()` 合并账号、总额度和今日统计接口响应
- `web/accounts-data.js`：从接口响应提取并脱敏后的本地演示数据
- `scripts/build-site.cjs`：将 Kindle 页面所需文件复制到 `dist/`
- `scripts/serve.cjs`：仅提供 `dist/` 静态文件的本地预览服务器

修改页面后重新运行 `npm run build`，再刷新浏览器即可。

批量接口应由服务端代理调用，再把三份 JSON 传给 `renderAccountBatches(accountResponse, usageResponse, todayStatsResponse)`。不要把管理员 Key 放进 Kindle 页面。

## 说明

本副本已移除额度采集器、凭证/配置、测试、Kindle 打包以及部署和服务端相关脚本。它只负责静态账号列表页面的开发与预览；真实数据接入应通过服务端代理完成。

许可证：MIT，见 [LICENSE](LICENSE)。
