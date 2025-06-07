import { PaymentManagerV2 } from '../src/core/PaymentManagerV2';
import { 
  defaultProviderFactory, 
  WechatProvider, 
  AlipayProvider,
  getRegisteredProviderInfo 
} from '../src/providers/base';
import { PaymentConfig } from '../src/types/config';

// 1. 查看已注册的 Provider 信息
console.log('📋 已注册的 Provider 信息:');
const providerInfo = getRegisteredProviderInfo();
providerInfo.forEach(info => {
  console.log(`  - ${info.name}: ${info.description}`);
  console.log(`    支持的支付方式: ${info.supportedMethods.join(', ')}`);
  console.log(`    默认配置:`, info.defaultConfig);
});

// 2. 基础配置示例（与之前兼容）
const config: PaymentConfig = {
  wechat: {
    enabled: true,
    sandbox: true, // 沙箱环境
    appId: 'wx1234567890abcdef',
    mchId: '1234567890',
    apiV3Key: 'your-32-character-api-v3-key-here',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
-----END PRIVATE KEY-----`,
    serialNo: 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0',
    notifyUrl: 'https://your-domain.com/api/payment/notify/wechat',
  },
  alipay: {
    enabled: true,
    sandbox: true, // 沙箱环境
    appId: '2021001234567890',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
-----END PRIVATE KEY-----`,
    alipayPublicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`,
    signType: 'RSA2',
    notifyUrl: 'https://your-domain.com/api/payment/notify/alipay',
  },
  global: {
    timeout: 30000,
    retries: 3,
    logLevel: 'info',
    enableLog: true,
  },
};

// 3. 创建新版支付管理器
console.log('\n🚀 创建 PaymentManagerV2 实例...');
const paymentManager = new PaymentManagerV2(config);

// 4. 查看 Provider 状态
console.log('\n📊 Provider 状态:');
const statuses = paymentManager.getProvidersStatus();
statuses.forEach(status => {
  console.log(`  - ${status.name}:`);
  console.log(`    启用: ${status.enabled}`);
  console.log(`    沙箱: ${status.sandbox}`);
  console.log(`    支持的方式: ${status.supportedMethods.join(', ')}`);
});

// 5. 注册事件监听器
paymentManager.onNotify(async (notification) => {
  console.log('\n📥 收到支付通知:', {
    provider: notification.provider,
    outTradeNo: notification.outTradeNo,
    tradeNo: notification.tradeNo,
    status: notification.tradeStatus,
    amount: notification.totalAmount,
  });
});

paymentManager.onSuccess(async (notification) => {
  console.log('\n✅ 支付成功处理:', notification.outTradeNo);
  
  // 业务逻辑示例
  await simulateBusinessLogic('updateOrderStatus', notification.outTradeNo, 'paid');
  await simulateBusinessLogic('sendNotification', notification);
});

paymentManager.onFail(async (notification) => {
  console.log('\n❌ 支付失败处理:', notification.outTradeNo);
  
  // 业务逻辑示例
  await simulateBusinessLogic('updateOrderStatus', notification.outTradeNo, 'failed');
});

// 6. 演示回调处理 - 微信支付
async function demoWechatCallback() {
  console.log('\n🔹 演示微信支付回调处理...');
  
  // 模拟微信支付回调数据
  const wechatPayload = {
    provider: 'wechat' as const,
    raw: {
      id: 'EV-2024-01-01-001',
      create_time: '2024-01-01T12:00:00+08:00',
      event_type: 'TRANSACTION.SUCCESS',
      resource_type: 'encrypt-resource',
      resource: {
        ciphertext: 'base64-encrypted-data...',
        nonce: 'random-nonce',
        associated_data: 'transaction',
      },
    },
    headers: {
      'wechatpay-timestamp': '1704067200',
      'wechatpay-nonce': 'random-nonce-string',
      'wechatpay-signature': 'signature-string',
      'wechatpay-serial': 'certificate-serial-no',
    },
  };

  try {
    // 注意：这里会因为加密数据是模拟的而失败，但演示了调用流程
    const result = await paymentManager.handleNotify('wechat.native', wechatPayload);
    console.log('微信支付回调处理结果:', result);
  } catch (error) {
    console.log('微信支付回调处理失败（预期的，因为使用了模拟数据）:', error);
  }
}

// 7. 演示回调处理 - 支付宝
async function demoAlipayCallback() {
  console.log('\n🔸 演示支付宝回调处理...');
  
  // 模拟支付宝回调数据
  const alipayPayload = {
    provider: 'alipay' as const,
    raw: {
      notify_time: '2024-01-01 12:00:00',
      notify_type: 'trade_status_sync',
      notify_id: '2024010100001',
      app_id: '2021001234567890',
      charset: 'utf-8',
      version: '1.0',
      sign_type: 'RSA2',
      sign: 'simulated-signature',
      trade_status: 'TRADE_SUCCESS',
      out_trade_no: 'ORDER-2024-0101-001',
      trade_no: '2024010122001234567890123456',
      total_amount: '99.99',
      buyer_id: '2088001234567890',
      buyer_logon_id: 'test@example.com',
      subject: '测试商品',
      gmt_create: '2024-01-01 11:55:00',
      gmt_payment: '2024-01-01 12:00:00',
    },
  };

  try {
    // 注意：这里会因为签名验证失败而失败，但演示了调用流程
    const result = await paymentManager.handleNotify('alipay.qrcode', alipayPayload);
    console.log('支付宝回调处理结果:', result);
  } catch (error) {
    console.log('支付宝回调处理失败（预期的，因为使用了模拟签名）:', error);
  }
}

// 8. 演示动态添加自定义 Provider
async function demoCustomProvider() {
  console.log('\n🔧 演示动态添加自定义 Provider...');
  
  // 创建一个模拟的 Provider 实例
  try {
    const mockProvider = defaultProviderFactory.create('wechat', {
      enabled: true,
      sandbox: true,
      appId: 'wx1234567890abcdef',
      mchId: '1234567890',
      apiV3Key: '00000000000000000000000000000000', // 32字符
      privateKey: 'mock-private-key',
      serialNo: 'mock-serial-no',
    });

    // 添加到管理器
    paymentManager.addProvider('wechat-test', mockProvider);
    
    console.log('✅ 成功添加自定义 Provider: wechat-test');
    console.log('当前已启用的 Provider:', paymentManager.getEnabledProviders());
  } catch (error) {
    console.log('添加自定义 Provider 失败:', error);
  }
}

// 9. 演示获取支持的支付方式
function demoSupportedMethods() {
  console.log('\n🎯 支持的支付方式:');
  const methods = paymentManager.getSupportedMethods();
  methods.forEach(method => {
    const isSupported = paymentManager.isSupportedMethod(method as any);
    console.log(`  - ${method}: ${isSupported ? '✅' : '❌'}`);
  });
}

// 10. 业务逻辑模拟函数
async function simulateBusinessLogic(action: string, ...args: any[]): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`    📋 执行业务逻辑: ${action}`, args);
      resolve();
    }, 100);
  });
}

// 11. 主函数
async function main() {
  console.log('🎯 面向对象支付架构演示\n');
  
  // 演示各种功能
  demoSupportedMethods();
  await demoWechatCallback();
  await demoAlipayCallback();
  await demoCustomProvider();
  
  console.log('\n✨ 演示完成！');
  console.log('\n📈 面向对象架构的优势:');
  console.log('  1. 🏗️  统一的 Provider 抽象，易于扩展');
  console.log('  2. 🔒  每个 Provider 独立管理配置和逻辑');
  console.log('  3. 🧩  插件化架构，支持动态添加/移除 Provider');
  console.log('  4. 🎣  保持原有的 Hook 事件系统');
  console.log('  5. 🔄  更好的错误处理和日志记录');
  console.log('  6. 🧪  支持沙箱环境和生产环境切换');
  
  // 销毁管理器
  paymentManager.destroy();
}

// 导出示例函数
export {
  paymentManager,
  demoWechatCallback,
  demoAlipayCallback,
  demoCustomProvider,
  main,
};

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
} 