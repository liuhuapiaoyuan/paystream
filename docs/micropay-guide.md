# 付款码支付使用指南

> PayStream V2.1.0+ 支持微信支付付款码支付功能

## 概述

付款码支付是一种线下收银场景的支付方式，用户在微信中生成付款码，商户通过扫码设备扫描用户的付款码完成支付。这种支付方式具有同步返回结果、无需回调通知的特点，非常适合POS机、收银台等线下场景。

## 特性

- ✅ **同步支付**: 支付结果立即返回，无需等待异步回调
- ✅ **智能重试**: 自动处理 `SYSTEMERROR` 和 `USERPAYING` 状态
- ✅ **状态轮询**: 支持异步状态查询，避免支付状态不明确
- ✅ **订单撤销**: 支持支付失败时自动撤销订单
- ✅ **完整日志**: 详细的调试日志和错误信息
- ✅ **类型安全**: 完整的 TypeScript 类型支持

## 配置要求

使用付款码支付需要配置微信支付 v2 API 密钥：

```typescript
import { createPaymentManagerV2, PaymentConfig } from 'paystream';

const config: PaymentConfig = {
  wechat: {
    enabled: true,
    sandbox: true, // 开发环境
    appId: 'wx1234567890abcdef',
    mchId: '1234567890',
    apiV3Key: 'your-32-character-api-v3-key',
    apiV2Key: 'your-32-character-api-v2-key', // 付款码支付必需
    privateKey: 'your-private-key',
    serialNo: 'your-certificate-serial-no',
    notifyUrl: 'https://your-domain.com/api/payment/notify/wechat',
  },
  global: {
    enableLog: true,
    logLevel: 'debug', // 开启调试日志
  },
};

const paymentManager = createPaymentManagerV2(config);
```

## 基础用法

### 创建付款码支付订单

```typescript
import { CreateOrderRequest } from 'paystream';

const createMicropayOrder = async (authCode: string, deviceInfo: string) => {
  const orderRequest: CreateOrderRequest = {
    outTradeNo: `MICROPAY_${Date.now()}`, // 商户订单号
    totalAmount: 100, // 支付金额（分）
    subject: '线下商品购买', // 商品描述
    body: '付款码支付测试商品', // 商品详情
    authCode, // 用户付款码（18位数字）
    deviceInfo, // 设备号（如：POS_001）
    clientIp: '192.168.1.100', // 终端IP
  };

  try {
    const result = await paymentManager.createOrder('wechat.micropay', orderRequest);
    
    if (result.success) {
      console.log('✅ 付款码支付成功');
      console.log('交易号:', result.tradeNo);
      console.log('支付时间:', result.raw?.time_end);
      
      return {
        success: true,
        tradeNo: result.tradeNo,
        payTime: result.raw?.time_end,
        amount: result.raw?.total_fee
      };
    } else {
      console.error('❌ 付款码支付失败:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ 付款码支付异常:', error);
    return { success: false, error: error.message };
  }
};
```

### 处理支付状态

付款码支付可能遇到以下状态，PayStream 会自动处理：

```typescript
const handleMicropayResult = async (authCode: string, deviceInfo: string) => {
  try {
    const result = await paymentManager.createOrder('wechat.micropay', {
      outTradeNo: `ORDER_${Date.now()}`,
      totalAmount: 100,
      subject: '商品购买',
      authCode,
      deviceInfo,
      clientIp: '127.0.0.1'
    });

    if (result.success) {
      // 支付成功
      return { status: 'SUCCESS', data: result };
    } else {
      // 根据错误码处理不同情况
      const errorCode = result.raw?.err_code;
      
      switch (errorCode) {
        case 'USERPAYING':
          // 用户支付中，系统会自动轮询
          return { status: 'PAYING', message: '用户支付中，请稍候...' };
          
        case 'SYSTEMERROR':
          // 系统错误，已自动查询订单状态
          return { status: 'SYSTEM_ERROR', message: '系统繁忙，请稍后重试' };
          
        case 'AUTHCODEEXPIRE':
          return { status: 'EXPIRED', message: '付款码已过期，请刷新后重试' };
          
        case 'NOTENOUGH':
          return { status: 'INSUFFICIENT', message: '用户余额不足' };
          
        case 'NOTSUPORTCARD':
          return { status: 'CARD_NOT_SUPPORT', message: '不支持当前支付方式' };
          
        default:
          return { status: 'FAILED', message: result.error || '支付失败' };
      }
    }
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
};
```

## 高级功能

### 场景信息配置

可以配置门店信息等场景数据：

```typescript
const orderRequest: CreateOrderRequest = {
  outTradeNo: `STORE_${Date.now()}`,
  totalAmount: 299,
  subject: '星巴克咖啡',
  body: '中杯拿铁',
  authCode: '134567890123456789',
  deviceInfo: 'POS_STORE_001',
  clientIp: '192.168.1.100',
  // 场景信息（可选）
  sceneInfo: {
    storeInfo: {
      id: 'STORE_001',
      name: '星巴克北京国贸店',
      areaCode: '110105',
      address: '北京市朝阳区建国门外大街1号'
    }
  }
};
```

### 自定义超时和重试

```typescript
// 自定义处理逻辑
const customMicropayHandler = async (authCode: string) => {
  const startTime = Date.now();
  const maxRetryTime = 45000; // 最大重试45秒
  
  const orderRequest: CreateOrderRequest = {
    outTradeNo: `CUSTOM_${Date.now()}`,
    totalAmount: 100,
    subject: '自定义处理',
    authCode,
    deviceInfo: 'CUSTOM_POS',
    clientIp: '127.0.0.1',
    timeExpire: 5 // 5分钟过期
  };

  while (Date.now() - startTime < maxRetryTime) {
    try {
      const result = await paymentManager.createOrder('wechat.micropay', orderRequest);
      
      if (result.success) {
        return { success: true, result };
      }
      
      const errorCode = result.raw?.err_code;
      
      if (errorCode === 'USERPAYING') {
        // 用户支付中，等待3秒后重试
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      } else {
        // 其他错误直接返回
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, error: '支付超时' };
};
```

## 错误处理

### 常见错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| `USERPAYING` | 用户支付中 | 轮询查询支付结果 |
| `SYSTEMERROR` | 系统错误 | 查询订单状态，必要时撤销 |
| `AUTHCODEEXPIRE` | 付款码过期 | 提示用户刷新付款码 |
| `NOTENOUGH` | 余额不足 | 提示用户充值或更换支付方式 |
| `NOTSUPORTCARD` | 不支持的卡类型 | 提示用户更换银行卡 |
| `ORDERPAID` | 订单已支付 | 查询订单状态确认 |
| `ORDERCLOSED` | 订单已关闭 | 重新创建订单 |

### 错误处理最佳实践

```typescript
const robustMicropayHandler = async (authCode: string, deviceInfo: string) => {
  try {
    const result = await paymentManager.createOrder('wechat.micropay', {
      outTradeNo: `ROBUST_${Date.now()}`,
      totalAmount: 100,
      subject: '健壮处理示例',
      authCode,
      deviceInfo,
      clientIp: '127.0.0.1'
    });

    if (result.success) {
      // 记录成功日志
      console.log(`✅ 支付成功 - 订单号: ${result.tradeNo}`);
      
      // 更新业务系统订单状态
      await updateOrderStatus(result.raw.out_trade_no, 'PAID');
      
      // 发送支付成功通知
      await sendPaymentNotification(result);
      
      return { success: true, data: result };
    } else {
      // 记录失败日志
      console.error(`❌ 支付失败 - 错误: ${result.error}`);
      
      // 根据错误类型进行不同处理
      const errorCode = result.raw?.err_code;
      
      if (['USERPAYING', 'SYSTEMERROR'].includes(errorCode)) {
        // 可重试错误，记录待处理状态
        await updateOrderStatus(result.raw?.out_trade_no, 'PENDING');
      } else {
        // 不可重试错误，记录失败状态
        await updateOrderStatus(result.raw?.out_trade_no, 'FAILED');
      }
      
      return { success: false, error: result.error, errorCode };
    }
  } catch (error) {
    console.error('❌ 付款码支付异常:', error);
    
    // 记录异常日志
    await logPaymentError({
      type: 'MICROPAY_EXCEPTION',
      authCode: authCode.substring(0, 6) + '***', // 脱敏处理
      deviceInfo,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return { success: false, error: '系统异常，请稍后重试' };
  }
};
```

## 测试

### 沙箱测试

在沙箱环境中测试付款码支付：

```typescript
const testConfig: PaymentConfig = {
  wechat: {
    enabled: true,
    sandbox: true, // 启用沙箱
    appId: 'wx1234567890abcdef',
    mchId: '1234567890',
    apiV2Key: 'test-api-v2-key-32-characters',
    // ... 其他沙箱配置
  },
  global: {
    enableLog: true,
    logLevel: 'debug'
  }
};

const testManager = createPaymentManagerV2(testConfig);

// 使用测试付款码
const testAuthCode = '120061098828009406'; // 微信沙箱测试付款码
const testResult = await testManager.createOrder('wechat.micropay', {
  outTradeNo: `TEST_${Date.now()}`,
  totalAmount: 1, // 测试金额1分
  subject: '测试商品',
  authCode: testAuthCode,
  deviceInfo: 'TEST_POS',
  clientIp: '127.0.0.1'
});
```

### 单元测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createPaymentManagerV2 } from 'paystream';

describe('付款码支付测试', () => {
  let paymentManager;
  
  beforeEach(() => {
    paymentManager = createPaymentManagerV2({
      wechat: {
        enabled: true,
        sandbox: true,
        // ... 测试配置
      }
    });
  });

  it('应该支持付款码支付方式', () => {
    const supportedMethods = paymentManager.getSupportedMethods();
    expect(supportedMethods).toContain('wechat.micropay');
  });

  it('应该验证必需参数', async () => {
    const orderRequest = {
      outTradeNo: 'TEST_001',
      totalAmount: 100,
      subject: '测试',
      // 缺少 authCode 和 deviceInfo
    };

    const result = await paymentManager.createOrder('wechat.micropay', orderRequest);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authCode');
  });
});
```

## 最佳实践

1. **参数验证**: 始终验证 `authCode` 和 `deviceInfo` 参数
2. **错误处理**: 根据不同错误码采取相应处理策略
3. **日志记录**: 记录详细的支付日志便于问题排查
4. **状态同步**: 及时更新业务系统的订单状态
5. **用户体验**: 为用户提供清晰的支付状态提示
6. **安全考虑**: 对敏感信息进行脱敏处理
7. **监控告警**: 设置支付异常监控和告警机制

## 常见问题

### Q: 付款码支付和扫码支付有什么区别？

A: 
- **付款码支付**: 用户出示付款码，商户扫码，同步返回结果
- **扫码支付**: 商户生成二维码，用户扫码，异步回调通知

### Q: 为什么需要配置 apiV2Key？

A: 付款码支付使用微信支付 v2 API，需要 v2 版本的 API 密钥进行签名验证。

### Q: 如何处理用户支付中状态？

A: PayStream 会自动轮询查询支付结果，最长轮询45秒。您也可以自定义轮询逻辑。

### Q: 付款码支付是否需要回调通知？

A: 不需要。付款码支付是同步返回结果的，无需配置回调地址。

### Q: 如何测试付款码支付？

A: 使用微信支付沙箱环境，配置测试商户号和测试付款码进行测试。

## 更新日志

- **v2.1.0**: 新增微信支付付款码支付功能
- 支持智能重试和状态轮询
- 完整的错误处理和类型安全
- 详细的调试日志和监控支持 