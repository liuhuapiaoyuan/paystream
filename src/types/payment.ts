/**
 * 统一支付通知接口
 */
export interface UnifiedPaymentNotification {
  /** 支付提供商 */
  provider: 'wechat' | 'alipay';
  /** 交易状态 */
  tradeStatus: 'SUCCESS' | 'FAIL' | 'PENDING';
  /** 商户订单号 */
  outTradeNo: string;
  /** 第三方交易号 */
  tradeNo: string;
  /** 交易金额（分） */
  totalAmount: number;
  /** 付款人ID */
  payerId?: string;
  /** 原始回调数据 */
  raw: any;
  /** 回调时间戳 */
  timestamp?: number;
}

/**
 * 支付通知载荷
 */
export interface PaymentNotifyPayload {
  /** 支付提供商 */
  provider: 'wechat' | 'alipay';
  /** 原始回调数据 */
  raw: any;
  /** 请求头信息 */
  headers?: Record<string, string>;
}

/**
 * 支付提供商类型
 */
export type PaymentProvider = 'wechat' | 'alipay';

/**
 * 微信支付方式
 */
export type WechatPayMethod = 'native' | 'jsapi' | 'h5' | 'app';

/**
 * 支付宝支付方式
 */
export type AlipayMethod = 'qrcode' | 'pc' | 'h5' | 'app';

/**
 * 支付方式映射
 */
export type PaymentMethod =
  | `wechat.${WechatPayMethod}`
  | `alipay.${AlipayMethod}`;

/**
 * 支付状态
 */
export type PaymentStatus = 'SUCCESS' | 'FAIL' | 'PENDING' | 'REFUND';

/**
 * 支付配置基础接口
 */
export interface BasePaymentConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 是否为沙箱环境 */
  sandbox?: boolean;
}

/**
 * 错误码定义
 */
export enum PaymentErrorCode {
  /** 验签失败 */
  VERIFY_FAILED = 'VERIFY_FAILED',
  /** 解密失败 */
  DECRYPT_FAILED = 'DECRYPT_FAILED',
  /** 配置错误 */
  CONFIG_ERROR = 'CONFIG_ERROR',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 未知提供商 */
  UNKNOWN_PROVIDER = 'UNKNOWN_PROVIDER',
  /** 参数错误 */
  INVALID_PARAMS = 'INVALID_PARAMS',
}

/**
 * 支付错误类
 */
export class PaymentError extends Error {
  constructor(
    public code: PaymentErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Hook 事件类型
 */
export type HookEvent = 'onNotify' | 'onSuccess' | 'onFail' | 'onPending';

/**
 * Hook 处理函数
 */
export type HookHandler = (
  notification: UnifiedPaymentNotification
) => void | Promise<void>;

/**
 * Hook 配置
 */
export interface HookConfig {
  [key: string]: HookHandler[];
}
