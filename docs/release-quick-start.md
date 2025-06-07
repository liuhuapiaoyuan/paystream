# 🚀 PayStream V2 自动发布快速开始指南

本指南帮助你快速配置GitHub Actions自动发布PayStream V2到npm。

## ⚡ 快速配置 (5分钟)

### 1️⃣ 配置npm token

```bash
# 1. 访问 https://www.npmjs.com/settings/tokens
# 2. 创建新的 Automation token
# 3. 复制 token (格式: npm_xxxxxxxxxxxx)
```

### 2️⃣ 在GitHub仓库添加Secret

```bash
# 仓库设置 → Secrets and variables → Actions
# 添加 NPM_TOKEN = 你的npm token
```

### 3️⃣ 可选：创建Environment

```bash
# 仓库设置 → Environments → 创建 "npm-publish"
# 添加保护规则和Environment Secret
```

## 🎯 发布方式

### 方法1: 手动触发发布

1. **进入Actions页面** → 选择 "Release & Publish"
2. **点击 "Run workflow"**
3. **输入版本号**：
   - 正式版：`2.1.0` → npm tag: `latest`
   - Beta版：`2.1.0-beta.1` → npm tag: `beta`
   - Alpha版：`2.1.0-alpha.1` → npm tag: `alpha`

### 方法2: 创建Release自动发布

1. **创建Release**：`Releases` → `Create a new release`
2. **Tag格式**：`v2.1.0` (必须以v开头)
3. **发布**：自动触发workflow

## 🔍 Workflow功能特性

我们的GitHub Actions workflow具备以下功能：

### ✅ 完整的CI/CD流程
- **多Node版本测试** (18, 20)
- **代码质量检查** (ESLint, TypeScript)
- **构建验证** (tsup)
- **V2导出验证** (确保无V1代码)
- **安全审计** (pnpm audit)

### 🎯 智能版本管理
- **自动识别版本类型**
- **自动选择npm tag**
- **支持预发布版本**
- **自动创建GitHub Release**

### 🛡️ 安全和监控
- **Environment保护**
- **构建缓存优化**
- **详细的执行日志**
- **失败自动通知**

## 📋 所有配置文件

项目中包含以下配置文件：

```
├── .github/workflows/
│   ├── ci.yml           # 持续集成
│   └── release.yml      # 发布workflow
├── package.json         # V2配置，版本2.0.0
├── CHANGELOG.md         # 版本变更记录
└── docs/
    ├── github-actions-setup.md  # 详细设置指南
    └── release-quick-start.md   # 本文件
```

## 🚦 发布状态检查

### 验证发布成功

```bash
# 检查npm包信息
npm view paystream

# 检查版本列表
npm view paystream versions --json

# 本地安装测试
npm install paystream@latest
# 或 npm install paystream@beta
```

### 监控Actions状态

- ✅ **成功**：绿色勾号，包已发布到npm
- ❌ **失败**：红色叉号，查看日志排错
- 🟡 **进行中**：黄色圆点，正在执行

## 🔧 常见发布场景

### 场景1: 发布正式版本

```bash
# 方法1: 手动触发
# Actions → Run workflow → 输入 "2.1.0" → latest

# 方法2: 创建Release
# Releases → Create Release → Tag "v2.1.0"
```

### 场景2: 发布Beta版本

```bash
# 方法1: 手动触发
# Actions → Run workflow → 输入 "2.1.0-beta.1" → beta

# 方法2: 本地发布
npm version 2.1.0-beta.1
git push --tags
# 然后创建Release
```

### 场景3: 快速修复版本

```bash
# 版本号: 2.0.1 (patch版本)
# 自动识别为 latest tag
```

## 🛠️ 故障排查

### 问题1: NPM_TOKEN失效
```bash
# 症状: 401 Unauthorized
# 解决: 重新生成token并更新GitHub Secret
```

### 问题2: 版本号冲突
```bash
# 症状: 403 You cannot publish over existing version
# 解决: 检查npm版本，更新package.json版本号
```

### 问题3: 构建失败
```bash
# 症状: Build失败
# 解决: 检查TypeScript错误，确保pnpm build本地成功
```

## 📊 预期结果

配置完成后，你将获得：

- ✅ **完全自动化**的npm发布流程
- ✅ **多环境支持** (latest, beta, alpha)
- ✅ **安全的**token管理
- ✅ **完整的**CI/CD流水线
- ✅ **详细的**发布日志和通知

## 🎉 下一步

1. **测试发布**：创建一个beta版本测试workflow
2. **设置通知**：配置Slack/邮件通知发布状态
3. **监控使用**：关注npm下载量和用户反馈
4. **持续优化**：根据使用情况调整发布策略

---

**🚀 现在你的PayStream V2已经具备了生产级的自动化发布能力！** 