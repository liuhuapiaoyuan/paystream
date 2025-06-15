import { createSign } from 'crypto';
import { PaymentError, PaymentErrorCode } from '../types/payment';
import { generateNonce, generateTimestamp } from './crypto';
import { HttpClient } from './http';

/**
 * 微信支付V3 API基础URL
 */
export const WECHAT_PAY_API_BASE = 'https://api.mch.weixin.qq.com';

/**
 * 微信支付V3签名工具
 */
export class WechatPayV3Signer {
  private privateKey: string;
  private mchId: string;
  private serialNo: string;

  constructor(privateKey: string, mchId: string, serialNo: string) {
    this.privateKey = privateKey;
    this.mchId = mchId;
    this.serialNo = serialNo;
  }

  /**
   * 生成微信支付V3签名
   */
  generateSignature(
    method: string,
    url: string,
    timestamp: string,
    nonce: string,
    body: string
  ): string {
    // 构建待签名字符串
    const signString = [method, url, timestamp, nonce, body].join('\n') + '\n';

    try {
      const sign = createSign('RSA-SHA256');
      sign.update(signString, 'utf8');
      return sign.sign(this.privateKey, 'base64');
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        '微信支付签名生成失败',
        error
      );
    }
  }

  /**
   * 生成Authorization头
   */
  generateAuthorizationHeader(
    method: string,
    url: string,
    body: string = ''
  ): string {
    const timestamp = generateTimestamp().toString();
    const nonce = generateNonce();
    const signature = this.generateSignature(
      method,
      url,
      timestamp,
      nonce,
      body
    );

    return [
      `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}"`,
      `nonce_str="${nonce}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.serialNo}"`,
    ].join(',');
  }
}

/**
 * 微信支付V3 API客户端
 */
export class WechatPayV3Client {
  private httpClient: HttpClient;
  private signer: WechatPayV3Signer;
  private sandbox: boolean;

  constructor(
    privateKey: string,
    mchId: string,
    serialNo: string,
    sandbox = false
  ) {
    this.httpClient = new HttpClient();
    this.signer = new WechatPayV3Signer(privateKey, mchId, serialNo);
    this.sandbox = sandbox;
  }

  /**
   * 获取API基础URL
   */
  private getBaseUrl(): string {
    return this.sandbox
      ? 'https://api.mch.weixin.qq.com' // 微信支付V3暂无沙箱环境
      : WECHAT_PAY_API_BASE;
  }

  /**
   * 发送微信支付API请求
   */
  async request<T = any>(method: string, path: string, data?: any): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`;
    const body = data ? JSON.stringify(data) : '';

    const headers = {
      Authorization: this.signer.generateAuthorizationHeader(
        method,
        path,
        body
      ),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'PayStream/2.0.0',
    };

    try {
      const response = await this.httpClient.request<T>({
        url,
        method: method as any,
        headers,
        data: data || undefined,
      });
      console.log(response);

      if (response.status >= 400) {
        // 如果有data 有code 有message 则使用data.message
        if (
          response.data &&
          typeof response.data === 'object' &&
          'code' in response.data &&
          'message' in response.data
        ) {
          throw new PaymentError(
            PaymentErrorCode.NETWORK_ERROR,
            `微信支付API请求失败: ${response.data.code} ${response.data.message}`,
            response.data.message
          );
        }
        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          `微信支付API请求失败: ${response.status} ${response.statusText}`,
          response.data
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        '微信支付API请求异常',
        error
      );
    }
  }

  /**
   * Native支付下单
   */
  async createNativeOrder(
    params: WechatNativeOrderParams
  ): Promise<WechatNativeOrderResponse> {
    return this.request<WechatNativeOrderResponse>(
      'POST',
      '/v3/pay/transactions/native',
      params
    );
  }

  /**
   * JSAPI支付下单
   */
  async createJSAPIOrder(
    params: WechatJSAPIOrderParams
  ): Promise<WechatJSAPIOrderResponse> {
    return this.request<WechatJSAPIOrderResponse>(
      'POST',
      '/v3/pay/transactions/jsapi',
      params
    );
  }

  /**
   * H5支付下单
   */
  async createH5Order(
    params: WechatH5OrderParams
  ): Promise<WechatH5OrderResponse> {
    return this.request<WechatH5OrderResponse>(
      'POST',
      '/v3/pay/transactions/h5',
      params
    );
  }

  /**
   * 查询订单（通过商户订单号）
   */
  async queryOrderByOutTradeNo(
    outTradeNo: string,
    mchId: string
  ): Promise<WechatOrderQueryResponse> {
    return this.request<WechatOrderQueryResponse>(
      'GET',
      `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchId}`
    );
  }

  /**
   * 查询订单（通过微信支付订单号）
   */
  async queryOrderByTransactionId(
    transactionId: string,
    mchId: string
  ): Promise<WechatOrderQueryResponse> {
    return this.request<WechatOrderQueryResponse>(
      'GET',
      `/v3/pay/transactions/id/${transactionId}?mchid=${mchId}`
    );
  }

  /**
   * 申请退款
   */
  async createRefund(
    params: WechatRefundParams
  ): Promise<WechatRefundResponse> {
    return this.request<WechatRefundResponse>(
      'POST',
      '/v3/refund/domestic/refunds',
      params
    );
  }

  /**
   * 查询退款
   */
  async queryRefund(outRefundNo: string): Promise<WechatRefundQueryResponse> {
    return this.request<WechatRefundQueryResponse>(
      'GET',
      `/v3/refund/domestic/refunds/${outRefundNo}`
    );
  }
}

/**
 * 微信支付Native下单参数
 */
export interface WechatNativeOrderParams {
  appid: string;
  mchid: string;
  description: string;
  out_trade_no: string;
  time_expire?: string;
  attach?: string;
  notify_url: string;
  goods_tag?: string;
  support_fapiao?: boolean;
  amount: {
    total: number;
    currency?: string;
  };
  detail?: {
    cost_price?: number;
    invoice_id?: string;
    goods_detail?: Array<{
      merchant_goods_id: string;
      wechatpay_goods_id?: string;
      goods_name?: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  scene_info?: {
    payer_client_ip: string;
    device_id?: string;
    store_info?: {
      id: string;
      name?: string;
      area_code?: string;
      address?: string;
    };
  };
  settle_info?: {
    profit_sharing?: boolean;
  };
}

/**
 * 微信支付Native下单响应
 */
export interface WechatNativeOrderResponse {
  code_url: string;
}

/**
 * 微信支付JSAPI下单参数
 */
export interface WechatJSAPIOrderParams
  extends Omit<WechatNativeOrderParams, 'scene_info'> {
  payer: {
    openid: string;
  };
  scene_info?: {
    payer_client_ip: string;
    device_id?: string;
    store_info?: {
      id: string;
      name?: string;
      area_code?: string;
      address?: string;
    };
  };
}

/**
 * 微信支付JSAPI下单响应
 */
export interface WechatJSAPIOrderResponse {
  prepay_id: string;
}

/**
 * 微信支付H5下单参数
 */
export interface WechatH5OrderParams
  extends Omit<WechatNativeOrderParams, 'scene_info'> {
  scene_info: {
    payer_client_ip: string;
    device_id?: string;
    h5_info: {
      type: 'Wap' | 'iOS' | 'Android';
      app_name?: string;
      app_url?: string;
      bundle_id?: string;
      package_name?: string;
    };
  };
}

/**
 * 微信支付H5下单响应
 */
export interface WechatH5OrderResponse {
  h5_url: string;
}

/**
 * 微信支付订单查询响应
 */
export interface WechatOrderQueryResponse {
  appid: string;
  mchid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: string;
  trade_state: string;
  trade_state_desc: string;
  bank_type: string;
  attach?: string;
  success_time?: string;
  payer: {
    openid: string;
  };
  amount: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  };
}

/**
 * 微信支付退款参数
 */
export interface WechatRefundParams {
  transaction_id?: string;
  out_trade_no?: string;
  out_refund_no: string;
  reason?: string;
  notify_url?: string;
  funds_account?: string;
  amount: {
    refund: number;
    total: number;
    currency?: string;
  };
  goods_detail?: Array<{
    merchant_goods_id: string;
    wechatpay_goods_id?: string;
    goods_name?: string;
    unit_price: number;
    refund_amount: number;
    refund_quantity: number;
  }>;
}

/**
 * 微信支付退款响应
 */
export interface WechatRefundResponse {
  refund_id: string;
  out_refund_no: string;
  transaction_id: string;
  out_trade_no: string;
  channel: string;
  user_received_account: string;
  success_time?: string;
  create_time: string;
  status: string;
  funds_account?: string;
  amount: {
    total: number;
    refund: number;
    payer_total: number;
    payer_refund: number;
    settlement_refund: number;
    settlement_total: number;
    discount_refund: number;
    currency: string;
  };
}

/**
 * 微信支付退款查询响应
 */
export interface WechatRefundQueryResponse extends WechatRefundResponse {
  promotion_detail?: Array<{
    promotion_id: string;
    scope: string;
    type: string;
    amount: number;
    refund_amount: number;
    goods_detail?: Array<{
      goods_id: string;
      quantity: number;
      unit_price: number;
      discount_amount: number;
      goods_remark?: string;
    }>;
  }>;
}

/**
 * 生成JSAPI支付参数
 */
export function generateJSAPIPayParams(
  appId: string,
  prepayId: string,
  privateKey: string
): {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
} {
  const timeStamp = generateTimestamp().toString();
  const nonceStr = generateNonce();
  const packageStr = `prepay_id=${prepayId}`;
  const signType = 'RSA';

  // 构建待签名字符串
  const signString = [appId, timeStamp, nonceStr, packageStr].join('\n') + '\n';

  // 生成签名
  const sign = createSign('RSA-SHA256');
  sign.update(signString, 'utf8');
  const paySign = sign.sign(privateKey, 'base64');

  return {
    appId,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType,
    paySign,
  };
}
