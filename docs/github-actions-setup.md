# GitHub Actions 自动发布设置指南

本指南将帮助你配置 GitHub Actions 自动发布 PayStream V2 到 npm。

## 📋 前置要求

1. GitHub 仓库已创建
2. npm 账户已注册
3. 具有仓库管理员权限

## 🔑 配置 NPM Token

### 步骤 1: 生成 NPM Access Token

1. **登录 npm 官网**
   - 访问 [https://www.npmjs.com](https://www.npmjs.com)
   - 使用你的账户登录

2. **进入 Access Tokens 页面**
   - 点击右上角头像 → `Access Tokens`
   - 或直接访问: [https://www.npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)

3. **生成新的 Token**
   - 点击 `Generate New Token` → `Classic Token`
   - 输入 Token 名称，如: `paystream-github-actions`
   - 选择权限类型: `Automation` (推荐) 或 `Publish`
   - 点击 `Generate Token`

4. **复制 Token**
   - ⚠️ **重要**: 立即复制 token，页面刷新后将无法再次查看
   - Token 格式类似: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 步骤 2: 在 GitHub 中配置 Secrets

1. **进入仓库设置**
   - 打开你的 GitHub 仓库
   - 点击 `Settings` 标签页

2. **配置 Secrets**
   - 在左侧菜单中找到 `Secrets and variables` → `Actions`
   - 点击 `New repository secret`

3. **添加 NPM_TOKEN**
   - Name: `NPM_TOKEN`
   - Secret: 粘贴刚才复制的 npm token
   - 点击 `Add secret`

## 🏠 配置 Environment (可选但推荐)

为了增加安全性，建议创建一个专门的发布环境：

### 步骤 1: 创建 Environment

1. **进入 Environments 设置**
   - 在仓库的 `Settings` 页面
   - 点击左侧的 `Environments`

2. **创建新环境**
   - 点击 `New environment`
   - 名称: `npm-publish`
   - 点击 `Configure environment`

3. **配置保护规则** (可选)
   - ✅ `Required reviewers`: 添加需要审批发布的用户
   - ✅ `Wait timer`: 设置发布前等待时间（如 5 分钟）
   - ✅ `Deployment branches`: 限制只能从 `main` 分支发布

4. **添加环境 Secrets**
   - 在 `Environment secrets` 部分
   - 点击 `Add secret`
   - Name: `NPM_TOKEN`
   - Value: 你的 npm token

## 🚀 发布方式

配置完成后，你有以下几种发布方式：

### 方式 1: 手动触发发布

1. **进入 Actions 页面**
   - 在 GitHub 仓库中点击 `Actions` 标签
   - 选择 `Release & Publish` workflow

2. **手动运行**
   - 点击 `Run workflow`
   - 输入版本号 (如: `2.1.0` 或 `2.1.0-beta.1`)
   - 选择 npm tag (latest, beta, alpha)
   - 点击 `Run workflow`

### 方式 2: 创建 GitHub Release 自动发布

1. **创建新 Release**
   - 在仓库主页点击 `Releases` → `Create a new release`
   - Tag version: `v2.1.0` (必须以 v 开头)
   - Release title: `PayStream V2 v2.1.0`
   - 描述发布内容
   - 点击 `Publish release`

2. **自动触发**
   - Release 创建后会自动触发 workflow
   - 根据版本号自动判断 npm tag

## 📝 版本号规则

我们的 workflow 支持以下版本号格式：

### 正式版本
- `2.1.0` → npm tag: `latest`
- `2.1.1` → npm tag: `latest`

### 预发布版本
- `2.1.0-beta.1` → npm tag: `beta`
- `2.1.0-alpha.1` → npm tag: `alpha`
- `2.1.0-rc.1` → npm tag: `rc`

## 🔍 监控发布状态

### 查看 Workflow 执行状态

1. **Actions 页面**
   - 在 `Actions` 标签页查看 workflow 运行状态
   - 绿色 ✅ = 成功，红色 ❌ = 失败

2. **查看日志**
   - 点击具体的 workflow run
   - 查看每个步骤的详细日志

3. **验证发布**
   - 检查 npm: `npm view paystream`
   - 检查版本: `npm view paystream versions --json`

## 🛠️ 故障排除

### 常见问题

1. **NPM_TOKEN 无效**
   ```
   npm ERR! code E401
   npm ERR! 401 Unauthorized
   ```
   - 检查 token 是否正确复制
   - 确认 token 权限足够
   - 重新生成 token

2. **包名冲突**
   ```
   npm ERR! 403 Forbidden
   ```
   - 检查包名是否被占用
   - 修改 `package.json` 中的 `name` 字段

3. **版本已存在**
   ```
   npm ERR! 403 You cannot publish over the previously published versions
   ```
   - 更新版本号
   - 检查是否误重复发布

### 调试模式

如需调试 workflow，可以：

1. **启用 debug 日志**
   - 在仓库设置中添加 secret: `ACTIONS_STEP_DEBUG` = `true`

2. **本地测试构建**
   ```bash
   pnpm install
   pnpm build
   pnpm pack  # 生成 .tgz 文件用于测试
   ```

## 🔒 安全最佳实践

1. **定期轮换 Token**
   - 建议每 6-12 个月更新一次 npm token

2. **最小权限原则**
   - 使用 `Automation` token 而不是 `Publish`
   - 限制 Environment 访问权限

3. **监控发布活动**
   - 关注 npm 发布通知邮件
   - 定期检查包的下载统计

## 📞 获取帮助

如果遇到问题，可以：

1. 查看 [GitHub Actions 文档](https://docs.github.com/en/actions)
2. 查看 [npm CLI 文档](https://docs.npmjs.com/cli)
3. 在仓库中创建 Issue 寻求帮助 