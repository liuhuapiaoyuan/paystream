import {
  UnifiedPaymentNotification,
  PaymentNotifyPayload,
  PaymentError,
  PaymentErrorCode,
} from '../../types/payment';

/**
 * Provider 配置基础接口
 */
export interface BaseProviderConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 是否为沙箱环境 */
  sandbox?: boolean;
  /** 回调地址 */
  notifyUrl?: string;
}

/**
 * Provider 验签结果
 */
export interface VerifyResult {
  /** 验签是否成功 */
  success: boolean;
  /** 错误信息（如果有） */
  error?: string;
  /** 额外信息 */
  details?: any;
}

/**
 * Provider 抽象基类
 * 所有支付提供商都必须实现这个抽象类
 */
export abstract class BaseProvider<
  TConfig extends BaseProviderConfig = BaseProviderConfig,
> {
  protected config: TConfig;
  protected readonly providerName: string;

  constructor(config: TConfig, providerName: string) {
    this.config = config;
    this.providerName = providerName;
    this.validateConfig();
  }

  /**
   * 获取提供商名称
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * 获取配置
   */
  getConfig(): TConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<TConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 处理支付回调通知（主入口）
   * @param payload 回调载荷
   * @returns 统一格式的支付通知
   */
  async handleNotify(
    payload: PaymentNotifyPayload
  ): Promise<UnifiedPaymentNotification> {
    if (!this.isEnabled()) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        `${this.providerName} 支付提供商未启用`
      );
    }

    try {
      // 1. 验证载荷格式
      this.validatePayload(payload);

      // 2. 验证签名
      const verifyResult = await this.verifySignature(payload);
      if (!verifyResult.success) {
        throw new PaymentError(
          PaymentErrorCode.VERIFY_FAILED,
          `${this.providerName} 签名验证失败: ${verifyResult.error || '未知错误'}`
        );
      }

      // 3. 解析和转换数据
      const notification = await this.transformNotification(payload);

      // 4. 后处理（子类可重写）
      await this.postProcess(notification, payload);

      return notification;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }

      throw new PaymentError(
        PaymentErrorCode.UNKNOWN_PROVIDER,
        `${this.providerName} 回调处理失败`,
        error
      );
    }
  }

  /**
   * 验证配置（抽象方法）
   * 子类必须实现这个方法来验证特定的配置
   */
  protected abstract validateConfig(): void;

  /**
   * 验证载荷格式（抽象方法）
   * @param payload 回调载荷
   */
  protected abstract validatePayload(payload: PaymentNotifyPayload): void;

  /**
   * 验证签名（抽象方法）
   * @param payload 回调载荷
   * @returns 验证结果
   */
  protected abstract verifySignature(
    payload: PaymentNotifyPayload
  ): Promise<VerifyResult>;

  /**
   * 转换通知数据为统一格式（抽象方法）
   * @param payload 回调载荷
   * @returns 统一格式的支付通知
   */
  protected abstract transformNotification(
    payload: PaymentNotifyPayload
  ): Promise<UnifiedPaymentNotification>;

  /**
   * 后处理逻辑（可选重写）
   * @param notification 转换后的通知
   * @param originalPayload 原始载荷
   */
  protected async postProcess(
    _notification: UnifiedPaymentNotification,
    _originalPayload: PaymentNotifyPayload
  ): Promise<void> {
    // 默认实现为空，子类可以重写进行额外处理
  }

  /**
   * 生成成功响应（抽象方法）
   * 不同提供商对成功响应的要求不同
   */
  abstract generateSuccessResponse(): string | object;

  /**
   * 生成失败响应（抽象方法）
   * 不同提供商对失败响应的要求不同
   */
  abstract generateFailureResponse(error?: string): string | object;

  /**
   * 获取支持的支付方式（抽象方法）
   * @returns 支持的支付方式列表
   */
  abstract getSupportedMethods(): string[];

  /**
   * 验证支付方式是否支持
   * @param method 支付方式
   * @returns 是否支持
   */
  isSupportedMethod(method: string): boolean {
    return this.getSupportedMethods().includes(method);
  }

  /**
   * 获取 Provider 状态信息
   */
  getStatus(): {
    providerName: string;
    enabled: boolean;
    sandbox: boolean;
    supportedMethods: string[];
  } {
    return {
      providerName: this.providerName,
      enabled: this.isEnabled(),
      sandbox: this.config.sandbox || false,
      supportedMethods: this.getSupportedMethods(),
    };
  }
}
