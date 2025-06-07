// 导出基础抽象类和接口
export { BaseProvider } from './BaseProvider';
export type { BaseProviderConfig, VerifyResult } from './BaseProvider';
export { 
  ProviderFactory,
  defaultProviderFactory 
} from './ProviderFactory';
export type { 
  ProviderConstructor, 
  ProviderRegistration
} from './ProviderFactory';

// 导出具体的 Provider 实现
export { WechatProvider } from '../wechat/WechatProvider';
export type { WechatProviderConfig } from '../wechat/WechatProvider';
export { AlipayProvider } from '../alipay/AlipayProvider';
export type { AlipayProviderConfig } from '../alipay/AlipayProvider';

// 自动注册内置 Provider
import { defaultProviderFactory } from './ProviderFactory';
import { WechatProvider } from '../wechat/WechatProvider';
import { AlipayProvider } from '../alipay/AlipayProvider';

/**
 * 注册内置 Provider
 */
export function registerBuiltInProviders(): void {
  // 注册微信支付 Provider
  if (!defaultProviderFactory.isRegistered('wechat')) {
    defaultProviderFactory.register('wechat', {
      constructor: WechatProvider,
      defaultConfig: {
        enabled: false,
        sandbox: false,
      },
      description: '微信支付 Provider - 支持微信支付 v3 API',
    });
  }

  // 注册支付宝 Provider
  if (!defaultProviderFactory.isRegistered('alipay')) {
    defaultProviderFactory.register('alipay', {
      constructor: AlipayProvider,
      defaultConfig: {
        enabled: false,
        sandbox: false,
        signType: 'RSA2',
        gateway: 'https://openapi.alipay.com/gateway.do',
      },
      description: '支付宝 Provider - 支持支付宝开放平台 API',
    });
  }
}

/**
 * 获取所有注册的 Provider 信息
 */
export function getRegisteredProviderInfo(): Array<{
  name: string;
  description?: string;
  supportedMethods: string[];
  defaultConfig: any;
}> {
  const providers: Array<{
    name: string;
    description?: string;
    supportedMethods: string[];
    defaultConfig: any;
  }> = [];

  const registrations = defaultProviderFactory.getAllRegistrations();
  
  for (const [name, registration] of registrations) {
    // 创建临时实例获取支持的方法
    try {
      const tempInstance = new registration.constructor({
        enabled: false,
        ...registration.defaultConfig,
        // 提供最小必要配置以通过验证
        ...(name === 'wechat' ? {
          appId: 'wx0000000000000000',
          mchId: '0000000000',
          apiV3Key: '00000000000000000000000000000000',
          privateKey: 'temp-key',
          serialNo: 'temp-serial',
        } : {}),
        ...(name === 'alipay' ? {
          appId: '0000000000000000',
          privateKey: 'temp-key',
          alipayPublicKey: 'temp-key',
        } : {}),
      } as any);

      providers.push({
        name,
        description: registration.description,
        supportedMethods: tempInstance.getSupportedMethods(),
        defaultConfig: registration.defaultConfig,
      });
    } catch (error) {
      // 如果无法创建实例，至少提供基本信息
      providers.push({
        name,
        description: registration.description,
        supportedMethods: [],
        defaultConfig: registration.defaultConfig,
      });
    }
  }

  return providers;
}

// 自动注册内置 Provider
registerBuiltInProviders(); 