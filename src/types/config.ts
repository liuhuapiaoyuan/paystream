import { BasePaymentConfig, HookConfig } from './payment';

/**
 * 微信支付配置
 */
export interface WechatPayConfig extends BasePaymentConfig {
  /** 应用ID */
  appId: string;
  /** 商户号 */
  mchId: string;
  /** API v3 密钥 */
  apiV3Key: string;
  /** 私钥内容或路径 */
  privateKey: string;
  /** 证书序列号 */
  serialNo: string;
  /** 微信支付平台证书（验签用） */
  platformCertificate?: string;
  /** 回调地址 */
  notifyUrl?: string;
}

/**
 * 支付宝配置
 */
export interface AlipayConfig extends BasePaymentConfig {
  /** 应用ID */
  appId: string;
  /** 应用私钥 */
  privateKey: string;
  /** 支付宝公钥 */
  alipayPublicKey: string;
  /** 签名类型 */
  signType?: 'RSA2' | 'RSA';
  /** 网关地址 */
  gateway?: string;
  /** 回调地址 */
  notifyUrl?: string;
  /** 同步回调地址 */
  returnUrl?: string;
}

/**
 * 支付配置
 */
export interface PaymentConfig {
  /** 微信支付配置 */
  wechat?: WechatPayConfig;
  /** 支付宝配置 */
  alipay?: AlipayConfig;
  /** Hook 配置 */
  hooks?: HookConfig;
  /** 全局配置 */
  global?: {
    /** 超时时间 */
    timeout?: number;
    /** 重试次数 */
    retries?: number;
    /** 日志级别 */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    /** 是否启用日志 */
    enableLog?: boolean;
  };
}

/**
 * 环境变量配置映射
 */
export interface EnvConfig {
  // 微信支付
  WECHAT_APP_ID?: string;
  WECHAT_MCH_ID?: string;
  WECHAT_API_V3_KEY?: string;
  WECHAT_PRIVATE_KEY?: string;
  WECHAT_SERIAL_NO?: string;
  WECHAT_PLATFORM_CERT?: string;
  WECHAT_NOTIFY_URL?: string;

  // 支付宝
  ALIPAY_APP_ID?: string;
  ALIPAY_PRIVATE_KEY?: string;
  ALIPAY_PUBLIC_KEY?: string;
  ALIPAY_SIGN_TYPE?: string;
  ALIPAY_GATEWAY?: string;
  ALIPAY_NOTIFY_URL?: string;
  ALIPAY_RETURN_URL?: string;

  // 全局配置
  PAYMENT_TIMEOUT?: string;
  PAYMENT_RETRIES?: string;
  PAYMENT_LOG_LEVEL?: string;
  PAYMENT_ENABLE_LOG?: string;
}
