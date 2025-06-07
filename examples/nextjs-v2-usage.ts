/**
 * PayStream V2 - Next.js 适配器使用示例
 * 
 * 展示如何在 Next.js 应用中使用 PayStream V2 面向对象支付架构
 */

// ==================== 导入示例 ====================
/*
// 从主包导入 V2 架构
import { 
  PaymentManagerV2, 
  createPaymentManagerV2,
  PaymentConfig
} from 'paystream';

// 从适配器导入 V2 处理器
import { 
  createNotifyHandlerV2,
  createWechatNotifyHandlerV2,
  createAlipayNotifyHandlerV2,
  NotifyHandlerV2Config
} from 'paystream';

// Next.js 类型
import { NextRequest } from 'next/server';
*/

// ==================== 配置示例 ====================
const paymentConfig = {
  wechat: {
    enabled: true,
    sandbox: true,
    appId: 'wx1234567890abcdef',
    mchId: '1234567890',
    apiV3Key: 'your-32-character-api-v3-key-here',
    privateKey: 'your-private-key',
    serialNo: 'your-serial-no',
    platformCertificate: 'platform-certificate',
    notifyUrl: 'https://your-domain.com/api/payment/notify/wechat',
  },
  alipay: {
    enabled: true,
    sandbox: true,
    appId: '2021001234567890',
    privateKey: 'your-private-key',
    alipayPublicKey: 'alipay-public-key',
    signType: 'RSA2' as const,
    notifyUrl: 'https://your-domain.com/api/payment/notify/alipay',
  },
  global: {
    enableLog: true,
    logLevel: 'info' as const,
    timeout: 30000,
  },
};

// ==================== 基础使用 ====================

// 1. 创建支付管理器
const basicUsageExample = `
// 创建 PaymentManagerV2 实例
const paymentManager = createPaymentManagerV2(paymentConfig);

// 设置全局事件监听器
paymentManager.onSuccess(async (notification) => {
  console.log('🎉 支付成功:', notification.outTradeNo);
  await updateOrderStatus(notification.outTradeNo, 'paid');
  await sendNotification(notification);
});

paymentManager.onFail(async (notification) => {
  console.log('❌ 支付失败:', notification.outTradeNo);
  await updateOrderStatus(notification.outTradeNo, 'failed');
});

paymentManager.onPending(async (notification) => {
  console.log('⏳ 支付待处理:', notification.outTradeNo);
  await updateOrderStatus(notification.outTradeNo, 'pending');
});
`;

// 2. 动态路由处理器
const dynamicRouteExample = `
// app/api/payment/notify/[...slug]/route.ts
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
    ? \`\${provider}.\${method}\` 
    : \`\${provider}.\${provider === 'wechat' ? 'native' : 'qrcode'}\`;

  // 创建处理器
  const handler = createNotifyHandlerV2({
    paymentManager,
    method: paymentMethod as PaymentMethod,
    enableDebugLog: true,
    
    // 可选的局部回调
    onSuccess: async (notification) => {
      console.log(\`💳 [\${provider}] 局部成功处理:\`, notification.outTradeNo);
      // 这里可以添加特定于这个路由的业务逻辑
    },
    
    onError: async (error) => {
      console.error(\`⚠️ [\${provider}] 处理错误:\`, error.message);
      // 发送告警通知
      await sendAlert({
        type: 'payment_error',
        provider,
        error: error.message,
      });
    },
  });

  return handler(request);
}
`;

// 3. 固定路由处理器
const fixedRouteExample = `
// app/api/payment/notify/wechat/route.ts
export const POST = createWechatNotifyHandlerV2(
  paymentManager,
  'wechat.native',
  {
    enableDebugLog: true,
    onSuccess: async (notification) => {
      // 微信支付特定的业务逻辑
      await recordWechatPayment(notification);
      await updateMemberPoints(notification);
    },
  }
);

// app/api/payment/notify/alipay/route.ts  
export const POST = createAlipayNotifyHandlerV2(
  paymentManager,
  'alipay.qrcode',
  {
    enableDebugLog: true,
    onSuccess: async (notification) => {
      // 支付宝特定的业务逻辑
      await recordAlipayPayment(notification);
      await syncToFinanceSystem(notification);
    },
  }
);
`;

// 4. 自定义响应构建器
const customResponseExample = `
// 自定义响应构建器
class CustomResponseBuilder implements ResponseBuilder {
  constructor(private provider: BaseProvider) {}

  buildSuccessResponse() {
    const response = this.provider.generateSuccessResponse();
    return {
      status: 200,
      body: {
        ...response,
        timestamp: Date.now(),
        server: 'paystream-v2',
        provider: this.provider.getProviderName(),
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
        provider: this.provider.getProviderName(),
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
`;

// 5. 业务逻辑处理函数
const businessLogicExample = `
// 业务逻辑处理函数
async function updateOrderStatus(outTradeNo: string, status: string) {
  console.log(\`📊 更新订单状态: \${outTradeNo} -> \${status}\`);
  
  // 实际实现示例
  // await prisma.order.update({
  //   where: { outTradeNo },
  //   data: { 
  //     status, 
  //     paidAt: status === 'paid' ? new Date() : null,
  //     updatedAt: new Date() 
  //   }
  // });
}

async function sendNotification(notification: UnifiedPaymentNotification) {
  console.log(\`📧 发送支付通知: \${notification.outTradeNo}\`);
  
  // 实际实现示例
  // await emailService.send({
  //   to: notification.userEmail,
  //   template: 'payment-success',
  //   data: {
  //     orderNo: notification.outTradeNo,
  //     amount: (notification.totalAmount / 100).toFixed(2),
  //     provider: notification.provider
  //   }
  // });
}

async function sendAlert(alert: any) {
  console.log(\`🚨 发送告警:\`, alert);
  
  // 实际实现示例
  // await slackService.sendAlert({
  //   channel: '#payment-alerts',
  //   message: \`支付处理错误: \${alert.error}\`,
  //   provider: alert.provider,
  //   timestamp: new Date().toISOString()
  // });
}

async function recordWechatPayment(notification: UnifiedPaymentNotification) {
  console.log(\`💳 记录微信支付: \${notification.outTradeNo}\`);
  // 微信支付特定的记录逻辑
}

async function recordAlipayPayment(notification: UnifiedPaymentNotification) {
  console.log(\`💳 记录支付宝: \${notification.outTradeNo}\`);
  // 支付宝特定的记录逻辑
}
`;

// ==================== V2 架构优势 ====================
const v2Features = {
  '🏗️ 面向对象设计': 'Provider 抽象，清晰的代码结构',
  '🔒 类型安全': '完整的 TypeScript 类型支持',
  '🎯 精简架构': '移除冗余功能，专注核心能力',
  '📊 详细日志': '可配置的调试和性能监控',
  '🔧 自定义响应': '灵活的响应构建器接口',
  '⚡ 高性能': '优化的处理流程和错误处理',
  '🧪 易于测试': '清晰的接口便于单元测试',
  '📈 生产就绪': '完整的错误恢复和监控支持',
};

// ==================== 完整示例项目结构 ====================
const projectStructure = `
my-payment-app/
├── app/
│   └── api/
│       └── payment/
│           └── notify/
│               ├── [provider]/
│               │   └── route.ts          # 固定路由
│               └── [...slug]/
│                   └── route.ts          # 动态路由
├── lib/
│   ├── payment.ts                        # PaymentManager 配置
│   └── business-logic.ts                 # 业务逻辑函数
└── types/
    └── payment.ts                        # 扩展类型定义
`;

// 导出示例配置和代码模板
export {
  paymentConfig,
  basicUsageExample,
  dynamicRouteExample,
  fixedRouteExample,
  customResponseExample,
  businessLogicExample,
  v2Features,
  projectStructure,
};

console.log('🚀 PayStream V2 适配器示例准备完成！');
console.log('✨ V2 特性:');
console.log('  ✅ 纯面向对象架构');
console.log('  ✅ 精简设计，专注核心');
console.log('  ✅ 完整类型安全');
console.log('  ✅ 灵活响应构建');
console.log('  ✅ 生产级错误处理');
console.log('  ✅ 易于扩展和测试'); 