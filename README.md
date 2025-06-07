# PayStream V2 🚀

> 现代化的 TypeScript 统一支付解决方案 - 采用面向对象架构

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-13%2B-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

PayStream V2 是一个强大的 TypeScript 支付库，采用现代面向对象架构，统一处理微信支付和支付宝的订单创建、支付查询、退款操作和回调通知。通过 Provider 模式和工厂设计模式，提供了清晰、可扩展、类型安全的完整支付解决方案。

## ✨ 核心特性

- 🏗️ **面向对象架构** - 基于 Provider 抽象的清晰设计
- 💳 **统一支付接口** - 支持微信支付和支付宝的订单创建、查询、退款
- 🔒 **类型安全** - 完整的 TypeScript 类型支持
- 📱 **多种支付方式** - Native扫码、JSAPI、H5、APP等支付方式
- 🎯 **精简设计** - 专注核心功能，移除冗余代码
- 📊 **详细日志** - 可配置的调试和性能监控
- 🔧 **自定义响应** - 灵活的响应构建器接口
- ⚡ **高性能** - 优化的处理流程和错误处理
- 🧪 **易于测试** - 清晰的接口便于单元测试
- 📈 **生产就绪** - 完整的错误恢复和监控支持

## 🚀 快速开始

### 安装

```bash
npm install paystream
# 或
pnpm add paystream
# 或
yarn add paystream
```

### 基础配置

```typescript
import { createPaymentManagerV2, PaymentConfig } from 'paystream';

const config: PaymentConfig = {
  wechat: {
    enabled: true,
    sandbox: true, // 开发环境使用沙箱
    appId: 'wx1234567890abcdef',
    mchId: '1234567890',
    apiV3Key: 'your-32-character-api-v3-key',
    privateKey: 'your-private-key',
    serialNo: 'your-certificate-serial-no',
    platformCertificate: 'platform-certificate', // 可选
    notifyUrl: 'https://your-domain.com/api/payment/notify/wechat',
  },
  alipay: {
    enabled: true,
    sandbox: true,
    appId: '2021001234567890',
    privateKey: 'your-private-key',
    alipayPublicKey: 'alipay-public-key',
    signType: 'RSA2',
    notifyUrl: 'https://your-domain.com/api/payment/notify/alipay',
  },
  global: {
    enableLog: true,
    logLevel: 'info',
    timeout: 30000,
  },
};

// 创建支付管理器
const paymentManager = createPaymentManagerV2(config);
```

## 💳 支付订单创建

### 微信支付 Native 扫码支付

```typescript
import { CreateOrderRequest } from 'paystream';

// 创建 Native 扫码支付订单
const createNativeOrder = async () => {
  const orderRequest: CreateOrderRequest = {
    outTradeNo: `ORDER_${Date.now()}`,
    totalAmount: 100, // 1元，单位：分
    subject: '测试商品',
    body: '这是一个测试商品的描述',
    timeExpire: 30, // 30分钟过期
    clientIp: '192.168.1.100',
  };

  try {
    const result = await paymentManager.createOrder('wechat.native', orderRequest);
    
    if (result.success) {
      console.log('💳 微信Native支付订单创建成功');
      console.log('二维码链接:', result.paymentData?.qrCode);
      
      // 将二维码链接生成二维码图片展示给用户扫描
      // 可以使用 qrcode 库：npm install qrcode
      // const QRCode = require('qrcode');
      // const qrCodeImage = await QRCode.toDataURL(result.paymentData.qrCode);
      
      return result.paymentData?.qrCode;
    } else {
      console.error('❌ 创建订单失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error);
  }
};
```

### 微信支付 JSAPI 支付（小程序/公众号）

```typescript
import { WechatCreateOrderRequest } from 'paystream';

// 创建 JSAPI 支付订单
const createJSAPIOrder = async (openid: string) => {
  const orderRequest: WechatCreateOrderRequest = {
    outTradeNo: `JSAPI_${Date.now()}`,
    totalAmount: 299, // 2.99元
    subject: '会员充值',
    body: '购买VIP会员服务',
    openid, // 用户的 openid，必填
    clientIp: '192.168.1.100',
  };

  try {
    const result = await paymentManager.createOrder('wechat.jsapi', orderRequest);
    
    if (result.success) {
      console.log('💳 微信JSAPI支付订单创建成功');
      const payParams = result.paymentData?.payParams;
      
      // 在小程序中调用支付
      // wx.requestPayment({
      //   timeStamp: payParams.timeStamp,
      //   nonceStr: payParams.nonceStr,
      //   package: payParams.package,
      //   signType: payParams.signType,
      //   paySign: payParams.paySign,
      //   success: (res) => console.log('支付成功', res),
      //   fail: (err) => console.log('支付失败', err)
      // });
      
      return payParams;
    } else {
      console.error('❌ 创建订单失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error);
  }
};
```

### 微信支付 H5 支付

```typescript
import { WechatCreateOrderRequest } from 'paystream';

// 创建 H5 支付订单
const createH5Order = async () => {
  const orderRequest: WechatCreateOrderRequest = {
    outTradeNo: `H5_${Date.now()}`,
    totalAmount: 1999, // 19.99元
    subject: '在线课程',
    body: 'JavaScript高级教程',
    clientIp: '192.168.1.100',
    sceneInfo: {
      h5Info: {
        type: 'Wap',
        appName: '我的在线教育平台',
        appUrl: 'https://my-education.com',
      },
    },
  };

  try {
    const result = await paymentManager.createOrder('wechat.h5', orderRequest);
    
    if (result.success) {
      console.log('💳 微信H5支付订单创建成功');
      const payUrl = result.paymentData?.payUrl;
      
      // 跳转到支付页面
      // window.location.href = payUrl;
      
      return payUrl;
    } else {
      console.error('❌ 创建订单失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error);
  }
};
```

### 支付宝扫码支付

```typescript
import { AlipayCreateOrderRequest } from 'paystream';

// 创建支付宝扫码支付订单
const createAlipayQROrder = async () => {
  const orderRequest: AlipayCreateOrderRequest = {
    outTradeNo: `ALIPAY_${Date.now()}`,
    totalAmount: 500, // 5元
    subject: '数字商品',
    body: '虚拟物品购买',
    timeExpire: 30,
    productCode: 'FAST_INSTANT_TRADE_PAY',
  };

  try {
    const result = await paymentManager.createOrder('alipay.qrcode', orderRequest);
    
    if (result.success) {
      console.log('💳 支付宝扫码支付订单创建成功');
      console.log('二维码链接:', result.paymentData?.qrCode);
      
      return result.paymentData?.qrCode;
    } else {
      console.error('❌ 创建订单失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error);
  }
};
```

### 支付宝 H5 支付

```typescript
// 创建支付宝 H5 支付订单
const createAlipayH5Order = async () => {
  const orderRequest: AlipayCreateOrderRequest = {
    outTradeNo: `ALIPAY_H5_${Date.now()}`,
    totalAmount: 888, // 8.88元
    subject: '手机充值',
    body: '100元话费充值',
    returnUrl: 'https://your-domain.com/payment/return',
  };

  try {
    const result = await paymentManager.createOrder('alipay.h5', orderRequest);
    
    if (result.success) {
      console.log('💳 支付宝H5支付订单创建成功');
      const payUrl = result.paymentData?.payUrl;
      
      // 跳转到支付页面
      // window.location.href = payUrl;
      
      return payUrl;
    } else {
      console.error('❌ 创建订单失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error);
  }
};
```

## 🔔 设置事件监听器

```typescript
// 全局事件监听器
paymentManager.onSuccess(async (notification) => {
  console.log('🎉 支付成功:', notification.outTradeNo);
  
  // 更新订单状态
  await updateOrderStatus(notification.outTradeNo, 'paid');
  
  // 发送通知
  await sendPaymentNotification(notification);
});

paymentManager.onFail(async (notification) => {
  console.log('❌ 支付失败:', notification.outTradeNo);
  await updateOrderStatus(notification.outTradeNo, 'failed');
});

paymentManager.onPending(async (notification) => {
  console.log('⏳ 支付待处理:', notification.outTradeNo);
  await updateOrderStatus(notification.outTradeNo, 'pending');
});
```

## 🔍 订单查询

```typescript
import { QueryOrderRequest } from 'paystream';

// 查询微信支付订单
const queryWechatOrder = async (outTradeNo: string) => {
  const queryRequest: QueryOrderRequest = {
    outTradeNo,
  };

  try {
    const result = await paymentManager.queryOrder('wechat', queryRequest);
    
    if (result.success && result.orderInfo) {
      console.log('✅ 订单查询成功');
      console.log('订单状态:', result.orderInfo.tradeStatus);
      console.log('支付金额:', result.orderInfo.totalAmount);
      console.log('支付时间:', result.orderInfo.payTime);
      
      return result.orderInfo;
    } else {
      console.log('❌ 订单查询失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 查询订单异常:', error);
  }
};

// 查询支付宝订单
const queryAlipayOrder = async (tradeNo: string) => {
  const queryRequest: QueryOrderRequest = {
    tradeNo,
  };

  const result = await paymentManager.queryOrder('alipay', queryRequest);
  return result;
};
```

## 💰 退款操作

```typescript
import { RefundRequest } from 'paystream';

// 微信支付退款
const refundWechatOrder = async (outTradeNo: string, refundAmount: number) => {
  const refundRequest: RefundRequest = {
    outTradeNo,
    outRefundNo: `REFUND_${Date.now()}`,
    refundAmount, // 退款金额，单位：分
    refundReason: '用户申请退款',
  };

  try {
    const result = await paymentManager.refund('wechat', refundRequest);
    
    if (result.success && result.refundInfo) {
      console.log('✅ 退款申请成功');
      console.log('退款单号:', result.refundInfo.refundId);
      console.log('退款状态:', result.refundInfo.refundStatus);
      
      return result.refundInfo;
    } else {
      console.log('❌ 退款申请失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 退款申请异常:', error);
  }
};

// 支付宝退款
const refundAlipayOrder = async (tradeNo: string, refundAmount: number) => {
  const refundRequest: RefundRequest = {
    tradeNo,
    outRefundNo: `ALIPAY_REFUND_${Date.now()}`,
    refundAmount,
    refundReason: '商品质量问题',
  };

  const result = await paymentManager.refund('alipay', refundRequest);
  return result;
};
```

## 📋 Next.js 集成

### 方式一：动态路由处理器

```typescript
// app/api/payment/notify/[...slug]/route.ts
import { NextRequest } from 'next/server';
import { createNotifyHandlerV2 } from 'paystream';
import { paymentManager } from '@/lib/payment';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const [provider, method] = params.slug;
  
  if (!provider) {
    return new Response('缺少支付提供商', { status: 400 });
  }

  // 构建支付方式
  const paymentMethod = method 
    ? `${provider}.${method}` 
    : `${provider}.${provider === 'wechat' ? 'native' : 'qrcode'}`;

  // 创建处理器
  const handler = createNotifyHandlerV2({
    paymentManager,
    method: paymentMethod as any,
    enableDebugLog: true,
    
    // 可选的局部回调
    onSuccess: async (notification) => {
      console.log(`💳 [${provider}] 支付成功:`, notification.outTradeNo);
      // 特定业务逻辑
    },
    
    onError: async (error) => {
      console.error(`⚠️ [${provider}] 处理错误:`, error.message);
      // 发送告警
      await sendAlert({ provider, error: error.message });
    },
  });

  return handler(request);
}
```

### 方式二：固定路由处理器

```typescript
// app/api/payment/notify/wechat/route.ts
import { createWechatNotifyHandlerV2 } from 'paystream';
import { paymentManager } from '@/lib/payment';

export const POST = createWechatNotifyHandlerV2(
  paymentManager,
  'wechat.native',
  {
    enableDebugLog: true,
    onSuccess: async (notification) => {
      // 微信支付特定逻辑
      await recordWechatPayment(notification);
      await updateMemberPoints(notification);
    },
  }
);
```

```typescript
// app/api/payment/notify/alipay/route.ts
import { createAlipayNotifyHandlerV2 } from 'paystream';
import { paymentManager } from '@/lib/payment';

export const POST = createAlipayNotifyHandlerV2(
  paymentManager,
  'alipay.qrcode',
  {
    enableDebugLog: true,
    onSuccess: async (notification) => {
      // 支付宝特定逻辑
      await recordAlipayPayment(notification);
      await syncToFinanceSystem(notification);
    },
  }
);
```

## 🔧 高级功能

### 自定义响应构建器

```typescript
import { ResponseBuilder, BaseProvider } from 'paystream';

class CustomResponseBuilder implements ResponseBuilder {
  constructor(private provider: BaseProvider) {}

  buildSuccessResponse() {
    const response = this.provider.generateSuccessResponse();
    return {
      status: 200,
      body: {
        ...response,
        timestamp: Date.now(),
        server: 'my-payment-server',
        version: '2.0',
      },
      headers: {
        'Content-Type': 'application/json',
        'X-PayStream-Version': '2.0',
      },
    };
  }

  buildFailureResponse(error?: string) {
    const response = this.provider.generateFailureResponse(error);
    return {
      status: 400,
      body: {
        ...response,
        timestamp: Date.now(),
        error_detail: error,
      },
      headers: {
        'Content-Type': 'application/json',
        'X-PayStream-Version': '2.0',
      },
    };
  }
}

// 使用自定义响应构建器
const handler = createNotifyHandlerV2({
  paymentManager,
  method: 'wechat.native',
  responseBuilder: new CustomResponseBuilder(
    paymentManager.getProviderInstance('wechat')
  ),
});
```

### Provider 状态监控

```typescript
// 获取 Provider 状态
const statuses = paymentManager.getProvidersStatus();
console.log('Provider 状态:', statuses);

// 检查支持的支付方式
const supportedMethods = paymentManager.getSupportedMethods();
console.log('支持的支付方式:', supportedMethods);

// 检查特定支付方式是否支持
const isSupported = paymentManager.isSupportedMethod('wechat.native');
console.log('微信 Native 支付支持:', isSupported);
```

## 📊 数据格式

### 统一支付通知格式

```typescript
interface UnifiedPaymentNotification {
  /** 支付提供商 */
  provider: 'wechat' | 'alipay';
  /** 交易状态 */
  tradeStatus: 'SUCCESS' | 'FAIL' | 'PENDING';
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付平台交易号 */
  tradeNo: string;
  /** 交易金额（分） */
  totalAmount: number;
  /** 付款方ID */
  payerId: string;
  /** 原始回调数据 */
  raw: any;
  /** 时间戳 */
  timestamp: number;
}
```

## 🎯 架构设计

### Provider 模式

PayStream V2 采用 Provider 模式，每个支付平台都有对应的 Provider 实现：

```typescript
// 基础 Provider 抽象
abstract class BaseProvider<TConfig extends BaseProviderConfig> {
  abstract handleNotify(payload: PaymentNotifyPayload): Promise<UnifiedPaymentNotification>;
  abstract generateSuccessResponse(): string | object;
  abstract generateFailureResponse(error?: string): string | object;
  abstract getSupportedMethods(): string[];
}

// 微信支付 Provider
class WechatProvider extends BaseProvider<WechatProviderConfig> {
  // 实现微信支付特有逻辑
}

// 支付宝 Provider
class AlipayProvider extends BaseProvider<AlipayProviderConfig> {
  // 实现支付宝特有逻辑
}
```

### 工厂模式

通过工厂模式管理 Provider 的创建和注册：

```typescript
// 自动注册内置 Provider
registerBuiltInProviders();

// 获取 Provider 信息
const providerInfo = getRegisteredProviderInfo();

// 创建自定义 Provider
const customProvider = defaultProviderFactory.create('custom', config);
```

## 🧪 测试

PayStream V2 设计时充分考虑了测试友好性：

```typescript
import { PaymentManagerV2, createPaymentManagerV2 } from 'paystream';

// 创建测试配置
const testConfig = {
  wechat: {
    enabled: true,
    sandbox: true,
    // ... 测试配置
  },
  global: {
    enableLog: false, // 测试时关闭日志
  },
};

// 创建测试实例
const testManager = createPaymentManagerV2(testConfig);

// 模拟回调测试
const mockPayload = {
  provider: 'wechat',
  raw: { /* 模拟数据 */ },
  headers: { /* 模拟头部 */ },
};

// 测试处理逻辑
const result = await testManager.handleNotify('wechat.native', mockPayload);
```

## 📈 性能特性

- **按需加载**: Provider 按需初始化
- **内存优化**: 合理的对象生命周期管理  
- **错误恢复**: 完整的错误处理和恢复机制
- **性能监控**: 内置处理时间统计
- **异步优化**: 全异步处理流程

## 🔒 安全特性

- **签名验证**: 支持微信支付 v3 和支付宝 RSA/RSA2 验签
- **数据解密**: 微信支付 AES-GCM 回调数据解密
- **配置验证**: 严格的配置参数验证
- **错误处理**: 安全的错误信息处理
- **沙箱支持**: 开发环境沙箱模式

## 📚 API 参考

### 核心类

- `PaymentManagerV2` - 支付管理器主类
- `BaseProvider` - Provider 抽象基类
- `WechatProvider` - 微信支付 Provider
- `AlipayProvider` - 支付宝 Provider
- `ProviderFactory` - Provider 工厂类

### 适配器函数

- `createNotifyHandlerV2()` - 创建通用回调处理器
- `createWechatNotifyHandlerV2()` - 创建微信支付处理器
- `createAlipayNotifyHandlerV2()` - 创建支付宝处理器

### 工具函数

- `createPaymentManagerV2()` - 创建支付管理器实例
- `getRegisteredProviderInfo()` - 获取注册的 Provider 信息
- `registerBuiltInProviders()` - 注册内置 Provider

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/your-username/paystream/issues)
- 查看 [文档](https://paystream.dev)

---

**PayStream V2** - 让支付回调处理变得简单、安全、高效！ 🚀 