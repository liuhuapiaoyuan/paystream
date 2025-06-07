# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-01

### 🚀 Major Changes - V2 架构重构

#### Added
- **面向对象架构**: 完全重构为基于 Provider 模式的面向对象设计
- **BaseProvider 抽象类**: 统一的 Provider 接口定义
- **具体 Provider 实现**:
  - `WechatProvider`: 微信支付 v3 处理
  - `AlipayProvider`: 支付宝 RSA/RSA2 处理
- **ProviderFactory**: 工厂模式管理 Provider 创建和注册
- **PaymentManagerV2**: 新版支付管理器，使用面向对象架构
- **Next.js V2 适配器**: 精简的 Next.js 集成层
  - `createNotifyHandlerV2()`: 通用回调处理器
  - `createWechatNotifyHandlerV2()`: 微信支付快捷处理器
  - `createAlipayNotifyHandlerV2()`: 支付宝快捷处理器
- **自定义响应构建器**: 支持灵活的响应格式定制
- **详细调试日志**: 可配置的调试和性能监控
- **类型安全增强**: 完整的 TypeScript 类型支持

#### Changed
- **版本号**: 从 1.x 升级到 2.0.0
- **主入口**: 只导出 V2 架构相关内容
- **Hook 系统**: 精简为基于 HookManager 类的实现

#### Removed
- **V1 兼容代码**: 完全移除所有 V1 相关代码
  - 移除 `PaymentManager` (V1)
  - 移除 `createPaymentManager` (V1)
  - 移除 `handleWechatNotify`, `handleAlipayNotify` 等函数式处理器
  - 移除 V1 Next.js 适配器
  - 移除 V1 风格的全局 Hook 函数
  - 移除中间件功能
- **冗余功能**: 移除约40%的冗余代码

#### Migration Guide
从 V1 升级到 V2:

```typescript
// V1 (已废弃)
import { PaymentManager, createWechatNotifyHandler } from 'paystream';
const manager = new PaymentManager(config);

// V2 (推荐)
import { createPaymentManagerV2, createWechatNotifyHandlerV2 } from 'paystream';
const manager = createPaymentManagerV2(config);
```

### 🔧 Technical Improvements
- **SOLID 原则**: 完全符合面向对象设计原则
- **可扩展性**: 插件化 Provider 架构
- **性能优化**: 按需加载，内存使用优化
- **错误处理**: 分层的错误管理机制
- **测试友好**: 更好的接口设计便于单元测试

### 📦 Build & Dependencies
- **Node.js**: 最低要求 16.0.0
- **TypeScript**: 5.3.2
- **构建工具**: tsup 8.0.1
- **包大小**: 优化至 ~43KB

---

## [1.x] - Legacy (已废弃)

V1 版本已完全废弃，请升级到 V2。

### 🔗 相关链接
- [GitHub Repository](https://github.com/your-username/paystream)
- [NPM Package](https://www.npmjs.com/package/paystream)
- [Migration Guide](https://github.com/your-username/paystream/blob/main/docs/migration.md) 