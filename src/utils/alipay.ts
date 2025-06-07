import { createSign, createVerify } from 'crypto';
import { PaymentError, PaymentErrorCode } from '../types/payment';
import { HttpClient } from './http';

/**
 * 支付宝API基础URL
 */
export const ALIPAY_API_BASE = 'https://openapi.alipay.com/gateway.do';
export const ALIPAY_SANDBOX_API_BASE =
  'https://openapi.alipaydev.com/gateway.do';

/**
 * 支付宝签名工具
 */
export class AlipaySignature {
  private privateKey: string;
  private signType: 'RSA' | 'RSA2';

  constructor(privateKey: string, signType: 'RSA' | 'RSA2' = 'RSA2') {
    this.privateKey = privateKey;
    this.signType = signType;
  }

  /**
   * 生成支付宝签名
   */
  generateSignature(params: Record<string, any>): string {
    // 过滤空值并排序
    const filteredParams = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] != null)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, any>
      );

    // 构建待签名字符串
    const signString = Object.keys(filteredParams)
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    try {
      const algorithm = this.signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1';
      const sign = createSign(algorithm);
      sign.update(signString, 'utf8');
      return sign.sign(this.privateKey, 'base64');
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        '支付宝签名生成失败',
        error
      );
    }
  }

  /**
   * 验证支付宝签名
   */
  verifySignature(
    params: Record<string, any>,
    signature: string,
    publicKey: string
  ): boolean {
    // 移除签名参数
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sign, sign_type, ...filteredParams } = params;

    // 构建待验签字符串
    const signString = Object.keys(filteredParams)
      .filter(key => filteredParams[key] !== '' && filteredParams[key] != null)
      .sort()
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    try {
      const algorithm = sign_type === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1';
      const verify = createVerify(algorithm);
      verify.update(signString, 'utf8');
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      return false;
    }
  }
}

/**
 * 支付宝API客户端
 */
export class AlipayClient {
  private httpClient: HttpClient;
  private signature: AlipaySignature;
  private appId: string;
  private privateKey: string;
  private alipayPublicKey: string;
  private sandbox: boolean;
  private signType: 'RSA' | 'RSA2';

  constructor(
    appId: string,
    privateKey: string,
    alipayPublicKey: string,
    signType: 'RSA' | 'RSA2' = 'RSA2',
    sandbox = false
  ) {
    this.httpClient = new HttpClient();
    this.signature = new AlipaySignature(privateKey, signType);
    this.appId = appId;
    this.privateKey = privateKey;
    this.alipayPublicKey = alipayPublicKey;
    this.sandbox = sandbox;
    this.signType = signType;
  }

  /**
   * 获取API基础URL
   */
  private getBaseUrl(): string {
    return this.sandbox ? ALIPAY_SANDBOX_API_BASE : ALIPAY_API_BASE;
  }

  /**
   * 构建公共参数
   */
  private buildCommonParams(
    method: string,
    bizContent?: any
  ): Record<string, any> {
    const params: Record<string, any> = {
      app_id: this.appId,
      method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: this.signType,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
    };

    if (bizContent) {
      params.biz_content = JSON.stringify(bizContent);
    }

    return params;
  }

  /**
   * 发送支付宝API请求
   */
  async request<T extends { code: string; msg: string; sub_msg?: string }>(
    method: string,
    bizContent?: any,
    extraParams?: Record<string, any>
  ): Promise<T> {
    const params = {
      ...this.buildCommonParams(method, bizContent),
      ...extraParams,
    };

    // 生成签名
    params.sign = this.signature.generateSignature(params);

    try {
      const response = await this.httpClient.post<AlipayResponse<T>>(
        this.getBaseUrl(),
        new URLSearchParams(params).toString(),
        {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      );

      if (response.status >= 400) {
        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          `支付宝API请求失败: ${response.status} ${response.statusText}`,
          response.data
        );
      }

      // 解析响应
      const responseKey = method.replace(/\./g, '_') + '_response';
      const result = response.data[responseKey] as T;

      if (!result) {
        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          '支付宝API响应格式错误',
          response.data
        );
      }

      if (result.code !== '10000') {
        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          `支付宝API错误: ${result.code} ${result.msg || result.sub_msg}`,
          result
        );
      }

      return result;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        '支付宝API请求异常',
        error
      );
    }
  }

  /**
   * 统一收单交易创建接口（扫码支付）
   */
  async tradeCreate(
    params: AlipayTradeCreateParams
  ): Promise<AlipayTradeCreateResponse> {
    return this.request<AlipayTradeCreateResponse>(
      'alipay.trade.create',
      params
    );
  }

  /**
   * 手机网站支付接口2.0（H5支付）
   */
  async tradeWapPay(params: AlipayTradeWapPayParams): Promise<string> {
    const commonParams = this.buildCommonParams('alipay.trade.wap.pay', params);
    commonParams.sign = this.signature.generateSignature(commonParams);

    // 构建支付URL
    const queryString = new URLSearchParams(commonParams).toString();
    return `${this.getBaseUrl()}?${queryString}`;
  }

  /**
   * 电脑网站支付（PC支付）
   */
  async tradePagePay(params: AlipayTradePagePayParams): Promise<string> {
    const commonParams = this.buildCommonParams(
      'alipay.trade.page.pay',
      params
    );
    commonParams.sign = this.signature.generateSignature(commonParams);

    // 构建支付表单
    const formFields = Object.keys(commonParams)
      .map(
        key =>
          `<input type="hidden" name="${key}" value="${commonParams[key]}">`
      )
      .join('');

    return `
      <form id="alipayForm" action="${this.getBaseUrl()}" method="POST">
        ${formFields}
      </form>
      <script>document.getElementById('alipayForm').submit();</script>
    `;
  }

  /**
   * 统一收单线下交易查询
   */
  async tradeQuery(
    params: AlipayTradeQueryParams
  ): Promise<AlipayTradeQueryResponse> {
    return this.request<AlipayTradeQueryResponse>('alipay.trade.query', params);
  }

  /**
   * 统一收单交易关闭接口
   */
  async tradeClose(
    params: AlipayTradeCloseParams
  ): Promise<AlipayTradeCloseResponse> {
    return this.request<AlipayTradeCloseResponse>('alipay.trade.close', params);
  }

  /**
   * 统一收单交易退款接口
   */
  async tradeRefund(
    params: AlipayTradeRefundParams
  ): Promise<AlipayTradeRefundResponse> {
    return this.request<AlipayTradeRefundResponse>(
      'alipay.trade.refund',
      params
    );
  }

  /**
   * 统一收单交易退款查询
   */
  async tradeRefundQuery(
    params: AlipayTradeRefundQueryParams
  ): Promise<AlipayTradeRefundQueryResponse> {
    return this.request<AlipayTradeRefundQueryResponse>(
      'alipay.trade.fastpay.refund.query',
      params
    );
  }
}

/**
 * 支付宝API响应基础结构
 */
export interface AlipayResponse<T = any> {
  [key: string]: T;
}

/**
 * 支付宝统一收单交易创建参数
 */
export interface AlipayTradeCreateParams {
  out_trade_no: string;
  total_amount: string;
  subject: string;
  body?: string;
  buyer_id?: string;
  seller_id?: string;
  goods_detail?: Array<{
    goods_id: string;
    goods_name: string;
    quantity: number;
    price: string;
    goods_category?: string;
    categories_tree?: string;
    body?: string;
    show_url?: string;
  }>;
  product_code?: string;
  operator_id?: string;
  store_id?: string;
  disable_pay_channels?: string;
  enable_pay_channels?: string;
  terminal_id?: string;
  extend_params?: {
    sys_service_provider_id?: string;
    hb_fq_num?: string;
    hb_fq_seller_percent?: string;
    industry_reflux_info?: string;
    card_type?: string;
  };
  timeout_express?: string;
  settle_info?: {
    settle_detail_infos: Array<{
      trans_in_type: string;
      trans_in: string;
      summary_dimension?: string;
      settle_entity_id?: string;
      settle_entity_type?: string;
      amount: string;
    }>;
  };
  logistics_detail?: {
    logistics_type?: string;
  };
  business_params?: {
    campus_card?: string;
    card_type?: string;
    actual_order_time?: string;
  };
  receiver_address_info?: {
    name?: string;
    address?: string;
    mobile?: string;
    zip?: string;
    division_code?: string;
  };
}

/**
 * 支付宝统一收单交易创建响应
 */
export interface AlipayTradeCreateResponse {
  code: string;
  msg: string;
  sub_code?: string;
  sub_msg?: string;
  trade_no: string;
  out_trade_no: string;
  qr_code?: string;
}

/**
 * 支付宝手机网站支付参数
 */
export interface AlipayTradeWapPayParams {
  out_trade_no: string;
  total_amount: string;
  subject: string;
  body?: string;
  product_code?: string;
  time_expire?: string;
  goods_type?: string;
  passback_params?: string;
  promo_params?: string;
  extend_params?: {
    sys_service_provider_id?: string;
    hb_fq_num?: string;
    hb_fq_seller_percent?: string;
    industry_reflux_info?: string;
    card_type?: string;
  };
  merchant_order_no?: string;
  enable_pay_channels?: string;
  disable_pay_channels?: string;
  store_id?: string;
  quit_url?: string;
  ext_user_info?: {
    name?: string;
    mobile?: string;
    cert_type?: string;
    cert_no?: string;
    min_age?: string;
    fix_buyer?: string;
    need_check_info?: string;
  };
}

/**
 * 支付宝电脑网站支付参数
 */
export interface AlipayTradePagePayParams extends AlipayTradeWapPayParams {
  return_url?: string;
  notify_url?: string;
}

/**
 * 支付宝交易查询参数
 */
export interface AlipayTradeQueryParams {
  out_trade_no?: string;
  trade_no?: string;
  org_pid?: string;
  query_options?: string[];
}

/**
 * 支付宝交易查询响应
 */
export interface AlipayTradeQueryResponse {
  code: string;
  msg: string;
  sub_code?: string;
  sub_msg?: string;
  trade_no: string;
  out_trade_no: string;
  buyer_logon_id: string;
  trade_status: string;
  total_amount: string;
  trans_currency?: string;
  settle_currency?: string;
  settle_amount?: string;
  pay_currency?: string;
  pay_amount?: string;
  settle_trans_rate?: string;
  trans_pay_rate?: string;
  buyer_pay_amount?: string;
  point_amount?: string;
  invoice_amount?: string;
  send_pay_date?: string;
  receipt_amount?: string;
  store_id?: string;
  terminal_id?: string;
  fund_bill_list?: Array<{
    fund_channel: string;
    bank_code?: string;
    amount: string;
    real_amount?: string;
  }>;
  store_name?: string;
  buyer_user_id?: string;
  buyer_user_type?: string;
  mdiscount_amount?: string;
  discount_amount?: string;
  buyer_user_name?: string;
  subject?: string;
  body?: string;
  alipay_sub_merchant_id?: string;
  ext_infos?: string;
}

/**
 * 支付宝交易关闭参数
 */
export interface AlipayTradeCloseParams {
  trade_no?: string;
  out_trade_no?: string;
  operator_id?: string;
}

/**
 * 支付宝交易关闭响应
 */
export interface AlipayTradeCloseResponse {
  code: string;
  msg: string;
  sub_code?: string;
  sub_msg?: string;
  trade_no: string;
  out_trade_no: string;
}

/**
 * 支付宝退款参数
 */
export interface AlipayTradeRefundParams {
  trade_no?: string;
  out_trade_no?: string;
  refund_amount: string;
  refund_currency?: string;
  refund_reason?: string;
  out_request_no?: string;
  operator_id?: string;
  store_id?: string;
  terminal_id?: string;
  goods_detail?: Array<{
    goods_id: string;
    alipay_goods_id?: string;
    goods_name: string;
    quantity: number;
    price: string;
    goods_category?: string;
    categories_tree?: string;
    body?: string;
    show_url?: string;
  }>;
  refund_royalty_parameters?: Array<{
    royalty_type?: string;
    trans_out?: string;
    trans_out_type?: string;
    trans_in_type?: string;
    trans_in?: string;
    amount?: string;
    amount_percentage?: string;
    desc?: string;
  }>;
  org_pid?: string;
}

/**
 * 支付宝退款响应
 */
export interface AlipayTradeRefundResponse {
  code: string;
  msg: string;
  sub_code?: string;
  sub_msg?: string;
  trade_no: string;
  out_trade_no: string;
  buyer_logon_id: string;
  fund_change: string;
  refund_fee: string;
  refund_currency?: string;
  gmt_refund_pay: string;
  refund_detail_item_list?: Array<{
    fund_channel: string;
    bank_code?: string;
    amount: string;
    real_amount?: string;
    fund_type?: string;
  }>;
  store_name?: string;
  buyer_user_id: string;
  refund_preset_paytool_list?: Array<{
    amount: string;
    assert_type_code: string;
  }>;
  refund_settlement_id?: string;
  present_refund_buyer_amount?: string;
  present_refund_discount_amount?: string;
  present_refund_mdiscount_amount?: string;
}

/**
 * 支付宝退款查询参数
 */
export interface AlipayTradeRefundQueryParams {
  trade_no?: string;
  out_trade_no?: string;
  out_request_no: string;
  org_pid?: string;
  query_options?: string[];
}

/**
 * 支付宝退款查询响应
 */
export interface AlipayTradeRefundQueryResponse {
  code: string;
  msg: string;
  sub_code?: string;
  sub_msg?: string;
  trade_no: string;
  out_trade_no: string;
  out_request_no: string;
  refund_reason?: string;
  total_amount: string;
  refund_amount: string;
  refund_royaltys?: Array<{
    refund_amount?: string;
    royalty_type?: string;
    result_code?: string;
    trans_out?: string;
    trans_out_email?: string;
    trans_in?: string;
    trans_in_email?: string;
  }>;
  refund_status: string;
  refund_royalty_result?: Array<{
    trans_out?: string;
    trans_out_email?: string;
    trans_in?: string;
    trans_in_email?: string;
    amount?: string;
    result_code?: string;
  }>;
  refund_detail_item_list?: Array<{
    fund_channel: string;
    bank_code?: string;
    amount: string;
    real_amount?: string;
    fund_type?: string;
  }>;
  send_back_fee?: string;
  refund_settlement_id?: string;
  present_refund_buyer_amount?: string;
  present_refund_discount_amount?: string;
  present_refund_mdiscount_amount?: string;
}
