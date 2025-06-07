// 版本信息
export const version = '2.0.0';

// 核心类型
export * from './types/payment';

// 配置类型
export type { PaymentConfig, WechatPayConfig, EnvConfig } from './types/config';

// 核心面向对象架构 - PayStream V2
export {
  PaymentManagerV2,
  createPaymentManagerV2,
} from './core/PaymentManagerV2';

export { HookManager, callStatusHooks } from './core/hooks';

// Provider 架构
export { BaseProvider } from './providers/base/BaseProvider';
export { WechatProvider } from './providers/wechat/WechatProvider';
export { AlipayProvider } from './providers/alipay/AlipayProvider';

// Provider 工厂
export {
  ProviderFactory,
  defaultProviderFactory,
  registerBuiltInProviders,
  getRegisteredProviderInfo,
} from './providers/base';

export type {
  BaseProviderConfig,
  VerifyResult,
  ProviderConstructor,
  ProviderRegistration,
  WechatProviderConfig,
  AlipayProviderConfig,
} from './providers/base';

// 配置管理
export {
  getConfig,
  loadConfigFromEnv,
  mergeConfig,
  validateWechatConfig,
  validateAlipayConfig,
} from './config';

// 工具函数
export {
  generateNonce,
  generateTimestamp,
  generateOrderNo,
  generateUUID,
  formatAmount,
  parseAmount,
  validateOrderNo,
  safeCompare,
  base64UrlEncode,
  base64UrlDecode,
} from './utils/crypto';

// 加密工具（旧版兼容）
export {
  aesGcmDecrypt,
  verifyWithRSA2,
  verifyWithRSA,
  signWithRSA,
  verifyWechatSignature,
} from './utils/crypto';

// HTTP客户端
export {
  HttpClient,
  type HttpRequestConfig,
  type HttpResponse,
} from './utils/http';

// 微信支付工具
export {
  WechatPayV3Client,
  WechatPayV3Signer,
  generateJSAPIPayParams,
  WECHAT_PAY_API_BASE,
  type WechatNativeOrderParams,
  type WechatNativeOrderResponse,
  type WechatJSAPIOrderParams,
  type WechatJSAPIOrderResponse,
  type WechatH5OrderParams,
  type WechatH5OrderResponse,
  type WechatOrderQueryResponse,
  type WechatRefundParams,
  type WechatRefundResponse,
  type WechatRefundQueryResponse,
} from './utils/wechat';

// 支付宝工具
export {
  AlipayClient,
  AlipaySignature,
  ALIPAY_API_BASE,
  ALIPAY_SANDBOX_API_BASE,
  type AlipayResponse,
  type AlipayTradeCreateParams,
  type AlipayTradeCreateResponse,
  type AlipayTradeWapPayParams,
  type AlipayTradePagePayParams,
  type AlipayTradeQueryParams,
  type AlipayTradeQueryResponse,
  type AlipayTradeCloseParams,
  type AlipayTradeCloseResponse,
  type AlipayTradeRefundParams,
  type AlipayTradeRefundResponse,
  type AlipayTradeRefundQueryParams,
  type AlipayTradeRefundQueryResponse,
} from './utils/alipay';

/**
 * 创建微信支付Provider
 */
export function createWechatProvider(
  config: import('./providers/base').WechatProviderConfig
): import('./providers/wechat/WechatProvider').WechatProvider {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WechatProvider } = require('./providers/wechat/WechatProvider');
  return new WechatProvider(config);
}

/**
 * 创建支付宝Provider
 */
export function createAlipayProvider(
  config: import('./providers/base').AlipayProviderConfig
): import('./providers/alipay/AlipayProvider').AlipayProvider {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AlipayProvider } = require('./providers/alipay/AlipayProvider');
  return new AlipayProvider(config);
}
