# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-01-15

### 🚀 新增功能 - 付款码支付支持

#### Added
- **微信支付付款码支付**: 完整的微信支付v2付款码支付功能
  - `WechatPayV2Client.micropay()`: 付款码支付API调用
  - `WechatPayV2Client.processMicropay()`: 智能付款码支付流程处理
  - 支持付款码支付重试逻辑和状态轮询
  - 自动处理 `SYSTEMERROR` 和 `USERPAYING` 状态
  - 支持订单查询和撤销操作
- **WechatProvider 付款码支持**: 
  - `createMicropay()` 方法支持付款码支付
  - 集成微信支付v2 API密钥配置
  - 完整的参数验证和错误处理
- **付款码支付参数扩展**:
  - `CreateOrderRequest` 接口新增 `authCode` 和 `deviceInfo` 字段
  - 支持场景信息 `scene_info` 配置
  - 支持分账、优惠标记等高级功能

#### Enhanced
- **类型安全增强**: 
  - `WechatV2MicropayRequest` 和 `WechatV2MicropayResponse` 接口定义
  - 完整的付款码支付参数类型支持
- **错误处理优化**:
  - 付款码支付特有的错误码处理
  - 智能重试和状态查询机制
  - 详细的错误信息和调试日志
- **性能优化**:
  - 付款码支付流程优化，减少不必要的API调用
  - 支持异步状态轮询，避免阻塞

#### Technical Details
- **微信支付v2 API集成**: 
  - 支持MD5和HMAC-SHA256签名算法
  - XML格式请求和响应处理
  - 完整的签名验证机制
- **付款码支付流程**:
  1. 调用 `/pay/micropay` 接口
  2. 处理 `SYSTEMERROR` - 查询订单状态
  3. 处理 `USERPAYING` - 轮询支付结果
  4. 支持订单撤销和错误恢复
- **配置要求**:
  - 需要配置 `apiV2Key` 用于微信支付v2 API
  - 付款码支付必须提供 `authCode` 和 `deviceInfo`

#### Usage Example
```typescript
// 微信付款码支付
const result = await paymentManager.createOrder('wechat.micropay', {
  outTradeNo: 'ORDER_123456',
  totalAmount: 100, // 1元
  subject: '商品名称',
  authCode: '134567890123456789', // 付款码
  deviceInfo: 'POS_001', // 设备号
  clientIp: '192.168.1.100'
});
```

### 🔧 配置更新
- **微信支付配置**: 新增 `apiV2Key` 配置项支持付款码支付
- **向后兼容**: 保持所有现有API的完全兼容性

---

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