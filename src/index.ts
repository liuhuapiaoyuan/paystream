// 核心面向对象架构 - PayStream V2
export { PaymentManagerV2, createPaymentManagerV2 } from './core/PaymentManagerV2';
export { HookManager, callStatusHooks } from './core/hooks';

// Provider 架构
export { 
  BaseProvider, 
  ProviderFactory, 
  defaultProviderFactory,
  WechatProvider,
  AlipayProvider,
  registerBuiltInProviders,
  getRegisteredProviderInfo
} from './providers/base';

export type { 
  BaseProviderConfig, 
  VerifyResult,
  ProviderConstructor,
  ProviderRegistration,
  WechatProviderConfig,
  AlipayProviderConfig
} from './providers/base';

// 类型定义
export type {
  UnifiedPaymentNotification,
  PaymentNotifyPayload,
  PaymentProvider,
  PaymentMethod,
  PaymentStatus,
  HookHandler,
  HookEvent,
  HookConfig,
  WechatPayMethod,
  AlipayMethod,
} from './types/payment';

export {
  PaymentError,
  PaymentErrorCode,
} from './types/payment';

export type {
  PaymentConfig,
  WechatPayConfig,
  AlipayConfig,
  EnvConfig,
} from './types/config';

// 配置管理
export {
  getConfig,
  loadConfigFromEnv,
  mergeConfig,
  validateWechatConfig,
  validateAlipayConfig,
} from './config';

// Next.js V2 适配器
export {
  createNotifyHandlerV2,
  createWechatNotifyHandlerV2,
  createAlipayNotifyHandlerV2,
} from './adapters/nextjsV2';

export type {
  NotifyHandlerV2Config,
} from './adapters/nextjsV2';

// 加密工具
export {
  aesGcmDecrypt,
  verifyWithRSA2,
  verifyWithRSA,
  signWithRSA,
  verifyWechatSignature,
  generateNonce,
  generateTimestamp,
  base64UrlEncode,
  base64UrlDecode,
} from './utils/crypto';

// 版本信息
export const version = '2.0.0'; 