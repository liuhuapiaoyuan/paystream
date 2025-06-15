import { createHash, createHmac } from 'crypto';
import { PaymentError, PaymentErrorCode } from '../types/payment';
import { generateNonce } from './crypto';
import { HttpClient } from './http';

/**
 * 微信支付V2 API基础URL
 */
export const WECHAT_PAY_V2_API_BASE = 'https://api.mch.weixin.qq.com';

/**
 * 微信支付V2付款码支付请求参数
 */
export interface WechatV2MicropayRequest {
  /** 公众账号ID */
  appid: string;
  /** 商户号 */
  mch_id: string;
  /** 设备号 */
  device_info?: string;
  /** 随机字符串 */
  nonce_str: string;
  /** 签名 */
  sign: string;
  /** 签名类型 */
  sign_type?: 'MD5' | 'HMAC-SHA256';
  /** 商品描述 */
  body: string;
  /** 商品详情 */
  detail?: string;
  /** 附加数据 */
  attach?: string;
  /** 商户订单号 */
  out_trade_no: string;
  /** 订单金额 */
  total_fee: number;
  /** 货币类型 */
  fee_type?: string;
  /** 终端IP */
  spbill_create_ip: string;
  /** 订单优惠标记 */
  goods_tag?: string;
  /** 指定支付方式 */
  limit_pay?: string;
  /** 交易起始时间 */
  time_start?: string;
  /** 交易结束时间 */
  time_expire?: string;
  /** 电子发票入口开放标识 */
  receipt?: string;
  /** 付款码 */
  auth_code: string;
  /** 是否需要分账 */
  profit_sharing?: string;
  /** 场景信息 */
  scene_info?: string;
}

/**
 * 微信支付V2付款码支付响应
 */
export interface WechatV2MicropayResponse {
  /** 返回状态码 */
  return_code: string;
  /** 返回信息 */
  return_msg: string;
  /** 公众账号ID */
  appid?: string;
  /** 商户号 */
  mch_id?: string;
  /** 设备号 */
  device_info?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 签名 */
  sign?: string;
  /** 业务结果 */
  result_code?: string;
  /** 错误代码 */
  err_code?: string;
  /** 错误代码描述 */
  err_code_des?: string;
  /** 用户标识 */
  openid?: string;
  /** 是否关注公众账号 */
  is_subscribe?: string;
  /** 交易类型 */
  trade_type?: string;
  /** 付款银行 */
  bank_type?: string;
  /** 货币类型 */
  fee_type?: string;
  /** 订单金额 */
  total_fee?: number;
  /** 应结订单金额 */
  settlement_total_fee?: number;
  /** 代金券金额 */
  coupon_fee?: number;
  /** 现金支付货币类型 */
  cash_fee_type?: string;
  /** 现金支付金额 */
  cash_fee?: number;
  /** 微信支付订单号 */
  transaction_id?: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 商家数据包 */
  attach?: string;
  /** 支付完成时间 */
  time_end?: string;
  /** 营销详情 */
  promotion_detail?: string;
}

/**
 * 微信支付V2订单查询请求参数
 */
export interface WechatV2OrderQueryRequest {
  /** 公众账号ID */
  appid: string;
  /** 商户号 */
  mch_id: string;
  /** 微信支付订单号 */
  transaction_id?: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 随机字符串 */
  nonce_str: string;
  /** 签名 */
  sign: string;
  /** 签名类型 */
  sign_type?: 'MD5' | 'HMAC-SHA256';
}

/**
 * 微信支付V2订单查询响应
 */
export interface WechatV2OrderQueryResponse extends WechatV2MicropayResponse {
  /** 交易状态 */
  trade_state?: string;
  /** 交易状态描述 */
  trade_state_desc?: string;
}

/**
 * 微信支付V2撤销订单请求参数
 */
export interface WechatV2ReverseRequest {
  /** 公众账号ID */
  appid: string;
  /** 商户号 */
  mch_id: string;
  /** 微信支付订单号 */
  transaction_id?: string;
  /** 商户订单号 */
  out_trade_no?: string;
  /** 随机字符串 */
  nonce_str: string;
  /** 签名 */
  sign: string;
  /** 签名类型 */
  sign_type?: 'MD5' | 'HMAC-SHA256';
}

/**
 * 微信支付V2撤销订单响应
 */
export interface WechatV2ReverseResponse {
  /** 返回状态码 */
  return_code: string;
  /** 返回信息 */
  return_msg: string;
  /** 公众账号ID */
  appid?: string;
  /** 商户号 */
  mch_id?: string;
  /** 随机字符串 */
  nonce_str?: string;
  /** 签名 */
  sign?: string;
  /** 业务结果 */
  result_code?: string;
  /** 错误代码 */
  err_code?: string;
  /** 错误代码描述 */
  err_code_des?: string;
  /** 是否重调 */
  recall?: string;
}

export class WechatPayV2Client {
  private httpClient: HttpClient;
  private sandbox: boolean;
  private appId: string;
  private mchId: string;
  private apiKey: string;
  private signType: 'MD5' | 'HMAC-SHA256';

  constructor(
    appId: string,
    mchId: string,
    apiKey: string,
    signType: 'MD5' | 'HMAC-SHA256' = 'MD5',
    sandbox = false
  ) {
    this.httpClient = new HttpClient();
    this.sandbox = sandbox;
    this.appId = appId;
    this.mchId = mchId;
    this.apiKey = apiKey;
    this.signType = signType;
  }

  /**
   * 获取API基础URL
   */
  private getBaseUrl(): string {
    return this.sandbox ? WECHAT_PAY_V2_API_BASE : WECHAT_PAY_V2_API_BASE;
  }

  /**
   * 生成微信支付V2签名
   */
  public generateSignature(params: Record<string, any>): string {
    // 过滤空值和sign字段
    const filteredParams = Object.keys(params)
      .filter(
        key => params[key] !== undefined && params[key] !== '' && key !== 'sign'
      )
      .sort()
      .reduce(
        (obj, key) => {
          obj[key] = params[key];
          return obj;
        },
        {} as Record<string, any>
      );

    // 构建待签名字符串
    const signString =
      Object.keys(filteredParams)
        .map(key => `${key}=${filteredParams[key]}`)
        .join('&') + `&key=${this.apiKey}`;

    // 生成签名
    if (this.signType === 'HMAC-SHA256') {
      return createHmac('sha256', this.apiKey)
        .update(signString, 'utf8')
        .digest('hex')
        .toUpperCase();
    } else {
      return createHash('md5')
        .update(signString, 'utf8')
        .digest('hex')
        .toUpperCase();
    }
  }

  /**
   * 验证微信支付V2签名
   */
  private verifySignature(params: Record<string, any>): boolean {
    const receivedSign = params.sign;
    const calculatedSign = this.generateSignature(params);
    return receivedSign === calculatedSign;
  }

  /**
   * 将对象转换为XML格式
   */
  private objectToXml(obj: Record<string, any>): string {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== '') {
        xml += `<${key}><![CDATA[${value}]]></${key}>`;
      }
    }
    xml += '</xml>';
    return xml;
  }

  /**
   * 将XML转换为对象
   */
  private xmlToObject(xml: string): Record<string, any> {
    const obj: Record<string, any> = {};
    const regex = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const key = match[1];
      const value = match[2];
      obj[key] = value;
    }

    return obj;
  }

  /**
   * 发送微信支付V2 API请求
   */
  private async request<T = any>(
    path: string,
    data: Record<string, any>
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`;
    const xmlData = this.objectToXml(data);

    try {
      const response = await this.httpClient.post(url, xmlData, {
        'Content-Type': 'application/xml',
        'User-Agent': 'PayStream/2.0.0',
      });

      if (response.status >= 400) {
        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          `微信支付V2 API请求失败: ${response.status} ${response.statusText}`,
          response.data
        );
      }

      const result = this.xmlToObject(response.data as string);

      // 验证返回签名
      if (result.return_code === 'SUCCESS' && !this.verifySignature(result)) {
        throw new PaymentError(
          PaymentErrorCode.VERIFY_FAILED,
          '微信支付V2响应签名验证失败',
          result
        );
      }

      return result as T;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        '微信支付V2 API请求异常',
        error
      );
    }
  }

  /**
   * 付款码支付
   */
  async micropay(params: {
    body: string;
    out_trade_no: string;
    total_fee: number;
    spbill_create_ip: string;
    auth_code: string;
    device_info?: string;
    detail?: string;
    attach?: string;
    fee_type?: string;
    goods_tag?: string;
    limit_pay?: string;
    time_start?: string;
    time_expire?: string;
    receipt?: string;
    profit_sharing?: string;
    scene_info?: {
      store_info?: {
        id: string;
        name?: string;
        area_code?: string;
        address?: string;
      };
    };
  }): Promise<WechatV2MicropayResponse> {
    const requestData: WechatV2MicropayRequest = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: generateNonce(),
      sign_type: this.signType,
      body: params.body,
      out_trade_no: params.out_trade_no,
      total_fee: params.total_fee,
      spbill_create_ip: params.spbill_create_ip,
      auth_code: params.auth_code,
      device_info: params.device_info,
      detail: params.detail,
      attach: params.attach,
      fee_type: params.fee_type || 'CNY',
      goods_tag: params.goods_tag,
      limit_pay: params.limit_pay,
      time_start: params.time_start,
      time_expire: params.time_expire,
      receipt: params.receipt,
      profit_sharing: params.profit_sharing,
      scene_info: params.scene_info
        ? JSON.stringify(params.scene_info)
        : undefined,
      sign: '', // 临时占位，下面会生成真实签名
    };

    // 生成签名
    requestData.sign = this.generateSignature(requestData);

    return this.request<WechatV2MicropayResponse>('/pay/micropay', requestData);
  }

  /**
   * 查询订单
   */
  async queryOrder(params: {
    transaction_id?: string;
    out_trade_no?: string;
  }): Promise<WechatV2OrderQueryResponse> {
    if (!params.transaction_id && !params.out_trade_no) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '微信支付订单号和商户订单号不能同时为空'
      );
    }

    const requestData: WechatV2OrderQueryRequest = {
      appid: this.appId,
      mch_id: this.mchId,
      transaction_id: params.transaction_id,
      out_trade_no: params.out_trade_no,
      nonce_str: generateNonce(),
      sign_type: this.signType,
      sign: '', // 临时占位，下面会生成真实签名
    };

    // 生成签名
    requestData.sign = this.generateSignature(requestData);

    return this.request<WechatV2OrderQueryResponse>(
      '/pay/orderquery',
      requestData
    );
  }

  /**
   * 撤销订单
   */
  async reverseOrder(params: {
    transaction_id?: string;
    out_trade_no?: string;
  }): Promise<WechatV2ReverseResponse> {
    if (!params.transaction_id && !params.out_trade_no) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '微信支付订单号和商户订单号不能同时为空'
      );
    }

    const requestData: WechatV2ReverseRequest = {
      appid: this.appId,
      mch_id: this.mchId,
      transaction_id: params.transaction_id,
      out_trade_no: params.out_trade_no,
      nonce_str: generateNonce(),
      sign_type: this.signType,
      sign: '', // 临时占位，下面会生成真实签名
    };

    // 生成签名
    requestData.sign = this.generateSignature(requestData);

    return this.request<WechatV2ReverseResponse>(
      '/secapi/pay/reverse',
      requestData
    );
  }

  /**
   * 处理付款码支付流程（包含重试逻辑）
   */
  async processMicropay(params: {
    body: string;
    out_trade_no: string;
    total_fee: number;
    spbill_create_ip: string;
    auth_code: string;
    device_info?: string;
    detail?: string;
    attach?: string;
    fee_type?: string;
    goods_tag?: string;
    limit_pay?: string;
    time_start?: string;
    time_expire?: string;
    receipt?: string;
    profit_sharing?: string;
    scene_info?: {
      store_info?: {
        id: string;
        name?: string;
        area_code?: string;
        address?: string;
      };
    };
  }): Promise<WechatV2MicropayResponse> {
    try {
      const result = await this.micropay(params);

      // 支付成功
      if (
        result.return_code === 'SUCCESS' &&
        result.result_code === 'SUCCESS'
      ) {
        return result;
      }

      // 系统错误，需要查询订单状态
      if (result.err_code === 'SYSTEMERROR') {
        await this.sleep(5000); // 等待5秒
        const queryResult = await this.queryOrder({
          out_trade_no: params.out_trade_no,
        });

        if (
          queryResult.return_code === 'SUCCESS' &&
          queryResult.result_code === 'SUCCESS'
        ) {
          return queryResult as WechatV2MicropayResponse;
        }

        // 如果查询结果不明确，调用撤销订单
        if (
          queryResult.trade_state === 'NOTPAY' ||
          queryResult.trade_state === 'PAYERROR'
        ) {
          await this.reverseOrder({ out_trade_no: params.out_trade_no });
        }

        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          '系统错误，支付状态不明确',
          result
        );
      }

      // 用户支付中，需要轮询查询
      if (result.err_code === 'USERPAYING') {
        return this.pollPaymentResult(params.out_trade_no, 45000); // 轮询45秒
      }

      // 其他错误直接返回
      throw new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        result.err_code_des || result.return_msg || '付款码支付失败',
        result
      );
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        '付款码支付异常',
        error
      );
    }
  }

  /**
   * 轮询支付结果
   */
  private async pollPaymentResult(
    outTradeNo: string,
    timeout: number = 45000
  ): Promise<WechatV2MicropayResponse> {
    const startTime = Date.now();
    const interval = 10000; // 10秒间隔

    while (Date.now() - startTime < timeout) {
      await this.sleep(interval);

      try {
        const queryResult = await this.queryOrder({ out_trade_no: outTradeNo });

        if (
          queryResult.return_code === 'SUCCESS' &&
          queryResult.result_code === 'SUCCESS'
        ) {
          return queryResult as WechatV2MicropayResponse;
        }

        // 支付失败或订单关闭
        if (
          queryResult.trade_state === 'PAYERROR' ||
          queryResult.trade_state === 'CLOSED'
        ) {
          throw new PaymentError(
            PaymentErrorCode.NETWORK_ERROR,
            queryResult.trade_state_desc || '支付失败',
            queryResult
          );
        }
      } catch (error) {
        // 查询异常，继续轮询
        console.warn('查询订单异常:', error);
      }
    }

    // 超时后尝试撤销订单
    try {
      await this.reverseOrder({ out_trade_no: outTradeNo });
    } catch (error) {
      console.warn('撤销订单失败:', error);
    }

    throw new PaymentError(
      PaymentErrorCode.NETWORK_ERROR,
      '支付超时，订单已撤销',
      { out_trade_no: outTradeNo }
    );
  }

  /**
   * 延时函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
