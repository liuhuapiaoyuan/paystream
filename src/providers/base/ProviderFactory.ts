import { BaseProvider, BaseProviderConfig } from './BaseProvider';
import { PaymentError, PaymentErrorCode } from '../../types/payment';

/**
 * Provider 构造函数类型
 */
export type ProviderConstructor<
  TConfig extends BaseProviderConfig = BaseProviderConfig,
> = {
  new (config: TConfig): BaseProvider<TConfig>;
};

/**
 * Provider 注册信息
 */
export interface ProviderRegistration<
  TConfig extends BaseProviderConfig = BaseProviderConfig,
> {
  /** Provider 构造函数 */
  constructor: ProviderConstructor<TConfig>;
  /** 默认配置 */
  defaultConfig?: Partial<TConfig>;
  /** 描述信息 */
  description?: string;
}

/**
 * Provider 工厂类
 * 负责管理和创建 Provider 实例
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private providers: Map<string, ProviderRegistration<any>> = new Map();
  private instances: Map<string, BaseProvider> = new Map();

  /**
   * 获取单例实例
   */
  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * 注册 Provider
   * @param name Provider 名称
   * @param registration 注册信息
   */
  register<TConfig extends BaseProviderConfig>(
    name: string,
    registration: ProviderRegistration<TConfig>
  ): void {
    if (this.providers.has(name)) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        `Provider ${name} 已经注册`
      );
    }

    this.providers.set(name, registration);
  }

  /**
   * 注销 Provider
   * @param name Provider 名称
   */
  unregister(name: string): void {
    this.providers.delete(name);
    this.instances.delete(name);
  }

  /**
   * 创建 Provider 实例
   * @param name Provider 名称
   * @param config 配置
   * @returns Provider 实例
   */
  create<TConfig extends BaseProviderConfig>(
    name: string,
    config: TConfig
  ): BaseProvider<TConfig> {
    const registration = this.providers.get(
      name
    ) as ProviderRegistration<TConfig>;
    if (!registration) {
      throw new PaymentError(
        PaymentErrorCode.UNKNOWN_PROVIDER,
        `未知的 Provider: ${name}`
      );
    }

    // 合并默认配置
    const finalConfig = {
      ...registration.defaultConfig,
      ...config,
    } as TConfig;

    const instance = new registration.constructor(finalConfig);

    // 缓存实例
    this.instances.set(name, instance);

    return instance;
  }

  /**
   * 获取或创建 Provider 实例
   * @param name Provider 名称
   * @param config 配置（如果实例不存在）
   * @returns Provider 实例
   */
  getOrCreate<TConfig extends BaseProviderConfig>(
    name: string,
    config?: TConfig
  ): BaseProvider<TConfig> {
    const existingInstance = this.instances.get(name);
    if (existingInstance) {
      return existingInstance as BaseProvider<TConfig>;
    }

    if (!config) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        `Provider ${name} 不存在且未提供配置`
      );
    }

    return this.create(name, config);
  }

  /**
   * 获取已创建的 Provider 实例
   * @param name Provider 名称
   * @returns Provider 实例或 undefined
   */
  getInstance(name: string): BaseProvider | undefined {
    return this.instances.get(name);
  }

  /**
   * 检查 Provider 是否已注册
   * @param name Provider 名称
   * @returns 是否已注册
   */
  isRegistered(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * 获取所有已注册的 Provider 名称
   * @returns Provider 名称列表
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 获取所有已创建的实例
   * @returns 实例映射
   */
  getAllInstances(): Map<string, BaseProvider> {
    return new Map(this.instances);
  }

  /**
   * 批量创建 Provider 实例
   * @param configs Provider 配置映射
   * @returns 创建的实例映射
   */
  createBatch(
    configs: Record<string, BaseProviderConfig>
  ): Map<string, BaseProvider> {
    const results = new Map<string, BaseProvider>();

    for (const [name, config] of Object.entries(configs)) {
      try {
        const instance = this.create(name, config);
        results.set(name, instance);
      } catch (error) {
        console.warn(`创建 Provider ${name} 失败:`, error);
      }
    }

    return results;
  }

  /**
   * 清除所有实例
   */
  clearInstances(): void {
    this.instances.clear();
  }

  /**
   * 清除所有注册和实例
   */
  reset(): void {
    this.providers.clear();
    this.instances.clear();
  }

  /**
   * 获取 Provider 注册信息
   * @param name Provider 名称
   * @returns 注册信息
   */
  getRegistration(name: string): ProviderRegistration<any> | undefined {
    return this.providers.get(name);
  }

  /**
   * 获取所有注册信息
   * @returns 注册信息映射
   */
  getAllRegistrations(): Map<string, ProviderRegistration<any>> {
    return new Map(this.providers);
  }
}

/**
 * 默认工厂实例
 */
export const defaultProviderFactory = ProviderFactory.getInstance();
