import {
  UnifiedPaymentNotification,
  PaymentNotifyPayload,
  PaymentError,
  PaymentErrorCode,
  PaymentMethod,
} from '../types/payment';
import { PaymentConfig } from '../types/config';
import { HookManager, callStatusHooks } from './hooks';
import {
  BaseProvider,
  defaultProviderFactory,
  WechatProviderConfig,
  AlipayProviderConfig,
} from '../providers/base';

/**
 * 新版支付管理器 - 使用面向对象的 Provider 架构
 */
export class PaymentManagerV2 {
  private providers: Map<string, BaseProvider> = new Map();
  private hookManager: HookManager;
  private config: PaymentConfig;

  /**
   * 构造函数
   * @param userConfig 用户配置
   */
  constructor(userConfig: Partial<PaymentConfig> = {}) {
    this.config = this.mergeConfig(userConfig);
    this.hookManager = new HookManager();
    this.initializeProviders();
    this.initializeHooks();
  }

  /**
   * 合并配置
   */
  private mergeConfig(userConfig: Partial<PaymentConfig>): PaymentConfig {
    const defaultConfig: PaymentConfig = {
      global: {
        timeout: 30000,
        retries: 3,
        logLevel: 'info',
        enableLog: true,
      },
    };

    return {
      ...defaultConfig,
      ...userConfig,
      global: {
        ...defaultConfig.global,
        ...userConfig.global,
      },
    };
  }

  /**
   * 初始化 Provider
   */
  private initializeProviders(): void {
    // 初始化微信支付 Provider
    if (this.config.wechat?.enabled) {
      try {
        const wechatProvider = defaultProviderFactory.create('wechat', {
          enabled: this.config.wechat.enabled,
          sandbox: this.config.wechat.sandbox,
          notifyUrl: this.config.wechat.notifyUrl,
          appId: this.config.wechat.appId,
          mchId: this.config.wechat.mchId,
          apiV3Key: this.config.wechat.apiV3Key,
          privateKey: this.config.wechat.privateKey,
          serialNo: this.config.wechat.serialNo,
          platformCertificate: this.config.wechat.platformCertificate,
        } as WechatProviderConfig);

        this.providers.set('wechat', wechatProvider);

        if (this.config.global?.enableLog) {
          console.log('✅ 微信支付 Provider 初始化成功');
        }
      } catch (error) {
        console.error('❌ 微信支付 Provider 初始化失败:', error);
      }
    }

    // 初始化支付宝 Provider
    if (this.config.alipay?.enabled) {
      try {
        const alipayProvider = defaultProviderFactory.create('alipay', {
          enabled: this.config.alipay.enabled,
          sandbox: this.config.alipay.sandbox,
          notifyUrl: this.config.alipay.notifyUrl,
          appId: this.config.alipay.appId,
          privateKey: this.config.alipay.privateKey,
          alipayPublicKey: this.config.alipay.alipayPublicKey,
          signType: this.config.alipay.signType,
          gateway: this.config.alipay.gateway,
          returnUrl: this.config.alipay.returnUrl,
        } as AlipayProviderConfig);

        this.providers.set('alipay', alipayProvider);

        if (this.config.global?.enableLog) {
          console.log('✅ 支付宝 Provider 初始化成功');
        }
      } catch (error) {
        console.error('❌ 支付宝 Provider 初始化失败:', error);
      }
    }
  }

  /**
   * 初始化 Hook
   */
  private initializeHooks(): void {
    if (this.config.hooks) {
      Object.entries(this.config.hooks).forEach(([event, handlers]) => {
        handlers.forEach(handler => {
          this.hookManager.on(event as any, handler);
        });
      });
    }
  }

  /**
   * 处理支付回调通知
   * @param method 支付方式
   * @param payload 回调载荷
   * @returns 统一格式的支付通知
   */
  async handleNotify(
    method: PaymentMethod,
    payload: PaymentNotifyPayload
  ): Promise<UnifiedPaymentNotification> {
    try {
      // 解析 Provider 名称
      const providerName = this.parseProviderName(method);

      // 获取 Provider 实例
      const provider = this.getProvider(providerName);

      // 验证支付方式是否支持
      if (!provider.isSupportedMethod(method)) {
        throw new PaymentError(
          PaymentErrorCode.INVALID_PARAMS,
          `${providerName} Provider 不支持支付方式: ${method}`
        );
      }

      // 使用 Provider 处理回调
      const result = await provider.handleNotify(payload);

      // 触发 Hook
      await callStatusHooks(result, this.hookManager);

      // 记录成功日志
      if (this.config.global?.enableLog) {
        console.log(`✅ ${providerName} 支付回调处理成功:`, {
          outTradeNo: result.outTradeNo,
          tradeNo: result.tradeNo,
          status: result.tradeStatus,
          amount: result.totalAmount,
        });
      }

      return result;
    } catch (error) {
      // 记录错误日志
      if (this.config.global?.enableLog) {
        console.error('❌ 支付回调处理失败:', error);
      }

      if (error instanceof PaymentError) {
        throw error;
      }

      throw new PaymentError(
        PaymentErrorCode.UNKNOWN_PROVIDER,
        '支付回调处理失败',
        error
      );
    }
  }

  /**
   * 解析 Provider 名称
   */
  private parseProviderName(method: PaymentMethod): string {
    const parts = method.split('.');
    return parts[0]; // 'wechat.native' -> 'wechat'
  }

  /**
   * 获取 Provider 实例
   */
  private getProvider(providerName: string): BaseProvider {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new PaymentError(
        PaymentErrorCode.UNKNOWN_PROVIDER,
        `未找到 Provider: ${providerName}`
      );
    }

    if (!provider.isEnabled()) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        `${providerName} Provider 未启用`
      );
    }

    return provider;
  }

  /**
   * 添加 Provider
   * @param name Provider 名称
   * @param provider Provider 实例
   */
  addProvider(name: string, provider: BaseProvider): void {
    this.providers.set(name, provider);

    if (this.config.global?.enableLog) {
      console.log(`➕ 添加 Provider: ${name}`);
    }
  }

  /**
   * 移除 Provider
   * @param name Provider 名称
   */
  removeProvider(name: string): void {
    this.providers.delete(name);

    if (this.config.global?.enableLog) {
      console.log(`➖ 移除 Provider: ${name}`);
    }
  }

  /**
   * 获取 Provider 实例
   * @param name Provider 名称
   * @returns Provider 实例或 undefined
   */
  getProviderInstance(name: string): BaseProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 注册 Hook
   */
  onNotify(
    handler: (notification: UnifiedPaymentNotification) => void | Promise<void>
  ): void {
    this.hookManager.on('onNotify', handler);
  }

  onSuccess(
    handler: (notification: UnifiedPaymentNotification) => void | Promise<void>
  ): void {
    this.hookManager.on('onSuccess', handler);
  }

  onFail(
    handler: (notification: UnifiedPaymentNotification) => void | Promise<void>
  ): void {
    this.hookManager.on('onFail', handler);
  }

  onPending(
    handler: (notification: UnifiedPaymentNotification) => void | Promise<void>
  ): void {
    this.hookManager.on('onPending', handler);
  }

  /**
   * 获取配置
   */
  getConfig(): PaymentConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<PaymentConfig>): void {
    this.config = this.mergeConfig(newConfig);

    // 清空并重新初始化 Provider
    this.providers.clear();
    this.initializeProviders();

    // 重新初始化 Hook
    this.hookManager.clear();
    this.initializeHooks();

    if (this.config.global?.enableLog) {
      console.log('🔄 配置已更新并重新初始化 Provider');
    }
  }

  /**
   * 检查 Provider 是否启用
   */
  isProviderEnabled(provider: 'wechat' | 'alipay'): boolean {
    const instance = this.providers.get(provider);
    return instance ? instance.isEnabled() : false;
  }

  /**
   * 获取已启用的 Provider 列表
   */
  getEnabledProviders(): string[] {
    const enabledProviders: string[] = [];

    for (const [name, provider] of this.providers) {
      if (provider.isEnabled()) {
        enabledProviders.push(name);
      }
    }

    return enabledProviders;
  }

  /**
   * 获取所有 Provider 状态
   */
  getProvidersStatus(): Array<{
    name: string;
    enabled: boolean;
    sandbox: boolean;
    supportedMethods: string[];
  }> {
    const statuses: Array<{
      name: string;
      enabled: boolean;
      sandbox: boolean;
      supportedMethods: string[];
    }> = [];

    for (const [name, provider] of this.providers) {
      statuses.push({
        name,
        ...provider.getStatus(),
      });
    }

    return statuses;
  }

  /**
   * 获取支持的支付方式
   */
  getSupportedMethods(): string[] {
    const methods: string[] = [];

    for (const provider of this.providers.values()) {
      if (provider.isEnabled()) {
        methods.push(...provider.getSupportedMethods());
      }
    }

    return methods;
  }

  /**
   * 验证支付方式是否支持
   */
  isSupportedMethod(method: PaymentMethod): boolean {
    try {
      const providerName = this.parseProviderName(method);
      const provider = this.providers.get(providerName);

      return provider ? provider.isSupportedMethod(method) : false;
    } catch {
      return false;
    }
  }

  /**
   * 获取 Hook 管理器
   */
  getHookManager(): HookManager {
    return this.hookManager;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.providers.clear();
    this.hookManager.clear();

    if (this.config.global?.enableLog) {
      console.log('🗑️ PaymentManager 已销毁');
    }
  }
}

/**
 * 创建支付管理器实例
 */
export function createPaymentManagerV2(
  config?: Partial<PaymentConfig>
): PaymentManagerV2 {
  return new PaymentManagerV2(config);
}
