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

/**
 * 支付订单创建请求
 */
export interface CreateOrderRequest {
  /** 商户订单号 */
  outTradeNo: string;
  /** 订单总金额（分） */
  totalAmount: number;
  /** 商品描述 */
  subject: string;
  /** 商品详情 */
  body?: string;
  /** 订单过期时间（分钟，默认30分钟） */
  timeExpire?: number;
  /** 异步通知地址 */
  notifyUrl?: string;
  /** 同步返回地址 */
  returnUrl?: string;
  /** 透传参数 */
  passbackParams?: string;
  /** 用户 openid（JSAPI 支付必填） */
  openid?: string;
  /** 用户 IP 地址 */
  clientIp?: string;
  /**
   * 付款码（付款码支付必填）
   */
  authCode?: string;
  /**
   * 设备信息（付款码支付必填）
   */
  deviceInfo?: string;
}

/**
 * 微信支付订单创建请求
 */
export interface WechatCreateOrderRequest extends CreateOrderRequest {
  /** 场景信息 */
  sceneInfo?: {
    /** 门店信息 */
    storeInfo?: {
      id: string;
      name?: string;
      areaCode?: string;
      address?: string;
    };
    /** H5 支付场景信息 */
    h5Info?: {
      type: 'Wap' | 'iOS' | 'Android';
      appName?: string;
      appUrl?: string;
      bundleId?: string;
      packageName?: string;
    };
  };
}

/**
 * 支付宝订单创建请求
 */
export interface AlipayCreateOrderRequest extends CreateOrderRequest {
  /** 商品类型 */
  productCode?: string;
  /** 商品主类型 */
  goodsType?: string;
  /** 销售产品码 */
  salesProductCode?: string;
  /** 优惠信息 */
  discountableAmount?: number;
  /** 不可打折金额 */
  undiscountableAmount?: number;
  /** 商户门店编号 */
  storeId?: string;
}

/**
 * 支付订单创建响应
 */
export interface CreateOrderResponse {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 支付订单号 */
  tradeNo?: string;
  /** 支付数据 */
  paymentData?: {
    /** 二维码链接（Native 支付） */
    qrCode?: string;
    /** 支付参数（JSAPI 支付） */
    payParams?: any;
    /** 支付 URL（H5 支付） */
    payUrl?: string;
    /** 支付表单（PC 支付） */
    payForm?: string;
  };
  /** 原始响应数据 */
  raw?: any;
}

/**
 * 订单查询请求
 */
export interface QueryOrderRequest {
  /** 商户订单号 */
  outTradeNo?: string;
  /** 支付平台交易号 */
  tradeNo?: string;
}

/**
 * 订单查询响应
 */
export interface QueryOrderResponse {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 订单信息 */
  orderInfo?: {
    /** 交易状态 */
    tradeStatus: 'SUCCESS' | 'FAIL' | 'PENDING' | 'CLOSED' | 'REFUND';
    /** 商户订单号 */
    outTradeNo: string;
    /** 支付平台交易号 */
    tradeNo: string;
    /** 交易金额（分） */
    totalAmount: number;
    /** 实际支付金额（分） */
    receiptAmount?: number;
    /** 付款方ID */
    payerId?: string;
    /** 交易创建时间 */
    createTime?: string;
    /** 交易支付时间 */
    payTime?: string;
  };
  /** 原始响应数据 */
  raw?: any;
}

/**
 * 退款请求
 */
export interface RefundRequest {
  /** 商户订单号 */
  outTradeNo?: string;
  /** 支付平台交易号 */
  tradeNo?: string;
  /** 商户退款单号 */
  outRefundNo: string;
  /** 退款金额（分） */
  refundAmount: number;
  /** 退款原因 */
  refundReason?: string;
  /** 异步通知地址 */
  notifyUrl?: string;
}

/**
 * 退款响应
 */
export interface RefundResponse {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 退款信息 */
  refundInfo?: {
    /** 退款单号 */
    refundId: string;
    /** 商户退款单号 */
    outRefundNo: string;
    /** 退款金额（分） */
    refundAmount: number;
    /** 退款状态 */
    refundStatus: 'SUCCESS' | 'FAIL' | 'PENDING';
    /** 退款时间 */
    refundTime?: string;
  };
  /** 原始响应数据 */
  raw?: any;
}

/**
 * 支付回调数据
 */
export type PaymentData = Record<string, any>;

/**
 * 支付回调结果
 */
export interface PaymentCallback {
  success: boolean;
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  payTime: Date;
  rawData: any;
}

/**
 * 扩展的错误码
 */
export enum ExtendedPaymentErrorCode {
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
  /** 无效参数 */
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  /** 回调错误 */
  CALLBACK_ERROR = 'CALLBACK_ERROR',
  /** 创建订单失败 */
  CREATE_ORDER_FAILED = 'CREATE_ORDER_FAILED',
  /** 查询订单失败 */
  QUERY_ORDER_FAILED = 'QUERY_ORDER_FAILED',
  /** 退款失败 */
  REFUND_FAILED = 'REFUND_FAILED',
}

/**
 * 扩展的支付方式枚举
 */
export enum PaymentMethodEnum {
  WECHAT_NATIVE = 'wechat.native',
  WECHAT_JSAPI = 'wechat.jsapi',
  WECHAT_H5 = 'wechat.h5',
  WECHAT_APP = 'wechat.app',
  ALIPAY_QR = 'alipay.qrcode',
  ALIPAY_PC = 'alipay.pc',
  ALIPAY_H5 = 'alipay.h5',
  ALIPAY_APP = 'alipay.app',
}

/**
 * 新的创建订单请求接口
 */
export interface NewCreateOrderRequest {
  orderId: string;
  amount: number;
  description: string;
  body?: string;
  attach?: string;
  timeExpire?: Date;
  clientIp?: string;
  openid?: string;
  quitUrl?: string;
}

/**
 * 新的创建订单响应接口
 */
export interface NewCreateOrderResponse {
  orderId: string;
  paymentData: Record<string, any>;
  rawData: any;
}

/**
 * 新的查询订单请求接口
 */
export interface NewQueryOrderRequest {
  orderId?: string;
  transactionId?: string;
}

/**
 * 新的查询订单响应接口
 */
export interface NewQueryOrderResponse {
  orderId: string;
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  payTime?: Date;
  rawData: any;
}

/**
 * 新的退款请求接口
 */
export interface NewRefundRequest {
  orderId?: string;
  transactionId?: string;
  refundId?: string;
  amount: number;
  reason?: string;
}

/**
 * 新的退款响应接口
 */
export interface NewRefundResponse {
  refundId: string;
  orderId: string;
  transactionId: string;
  amount: number;
  status: string;
  refundTime?: Date;
  rawData: any;
}

/**
 * 微信支付创建订单请求
 */
export interface WechatNewCreateOrderRequest extends NewCreateOrderRequest {
  // 微信支付特有字段
}

/**
 * 支付宝创建订单请求
 */
export interface AlipayNewCreateOrderRequest extends NewCreateOrderRequest {
  subject: string;
  // 支付宝特有字段
}
