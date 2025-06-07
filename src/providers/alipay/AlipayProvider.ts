import { BaseProvider, BaseProviderConfig, VerifyResult } from '../base/BaseProvider';
import { 
  UnifiedPaymentNotification, 
  PaymentNotifyPayload, 
  PaymentError, 
  PaymentErrorCode,
  AlipayMethod 
} from '../../types/payment';
import { AlipayConfig } from '../../types/config';
import { verifyWithRSA2, verifyWithRSA } from '../../utils/crypto';

/**
 * 支付宝回调参数
 */
interface AlipayNotifyParams {
  /** 通知时间 */
  notify_time: string;
  /** 通知类型 */
  notify_type: string;
  /** 通知校验ID */
  notify_id: string;
  /** 应用ID */
  app_id: string;
  /** 编码格式 */
  charset: string;
  /** 接口版本 */
  version: string;
  /** 签名类型 */
  sign_type: string;
  /** 签名 */
  sign: string;
  /** 交易状态 */
  trade_status: string;
  /** 商户订单号 */
  out_trade_no: string;
  /** 支付宝交易号 */
  trade_no: string;
  /** 交易金额 */
  total_amount: string;
  /** 实际支付金额 */
  receipt_amount?: string;
  /** 付款方ID */
  buyer_id: string;
  /** 付款方账号 */
  buyer_logon_id: string;
  /** 商品描述 */
  subject: string;
  /** 商品详情 */
  body?: string;
  /** 交易创建时间 */
  gmt_create: string;
  /** 交易付款时间 */
  gmt_payment: string;
  /** 交易结束时间 */
  gmt_close?: string;
  /** 资金明细 */
  fund_bill_list?: string;
  /** 透传参数 */
  passback_params?: string;
  /** 优惠券信息 */
  voucher_detail_list?: string;
  [key: string]: any;
}

/**
 * 支付宝 Provider 配置接口
 */
export interface AlipayProviderConfig extends BaseProviderConfig {
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
  /** 同步回调地址 */
  returnUrl?: string;
}

/**
 * 支付宝 Provider 实现
 */
export class AlipayProvider extends BaseProvider<AlipayProviderConfig> {
  private readonly supportedMethods: AlipayMethod[] = ['qrcode', 'pc', 'h5', 'app'];

  constructor(config: AlipayProviderConfig) {
    super(config, 'alipay');
  }

  /**
   * 验证配置
   */
  protected validateConfig(): void {
    const required = ['appId', 'privateKey', 'alipayPublicKey'];
    
    for (const key of required) {
      if (!this.config[key as keyof AlipayProviderConfig]) {
        throw new PaymentError(
          PaymentErrorCode.CONFIG_ERROR,
          `支付宝配置缺少必要参数: ${key}`
        );
      }
    }

    // 验证 appId 格式
    if (!/^\d{16}$/.test(this.config.appId)) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        '支付宝 appId 格式错误，应为16位数字'
      );
    }

    // 验证签名类型
    const signType = this.config.signType || 'RSA2';
    if (!['RSA', 'RSA2'].includes(signType)) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        '支付宝签名类型错误，应为 RSA 或 RSA2'
      );
    }
  }

  /**
   * 验证载荷格式
   */
  protected validatePayload(payload: PaymentNotifyPayload): void {
    if (!payload.raw) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '支付宝回调数据为空'
      );
    }

    const params = payload.raw as AlipayNotifyParams;
    
    // 检查必要字段
    const requiredFields = ['notify_id', 'notify_type', 'trade_status', 'out_trade_no', 'trade_no'];
    for (const field of requiredFields) {
      if (!params[field]) {
        throw new PaymentError(
          PaymentErrorCode.INVALID_PARAMS,
          `支付宝回调缺少必要字段: ${field}`
        );
      }
    }

    // 检查签名字段
    if (!params.sign || !params.sign_type) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '支付宝回调缺少签名信息'
      );
    }
  }

  /**
   * 验证签名
   */
  protected async verifySignature(payload: PaymentNotifyPayload): Promise<VerifyResult> {
    const params = payload.raw as AlipayNotifyParams;
    const { sign, sign_type } = params;
    
    try {
      // 构建待验签字符串
      const signString = this.buildSignString(params);
      
      let isValid = false;
      
      // 根据签名类型选择验签方法
      if (sign_type === 'RSA2') {
        isValid = verifyWithRSA2(signString, sign, this.config.alipayPublicKey);
      } else if (sign_type === 'RSA') {
        isValid = verifyWithRSA(signString, sign, this.config.alipayPublicKey);
      } else {
        return {
          success: false,
          error: `不支持的签名类型: ${sign_type}`,
        };
      }

      return {
        success: isValid,
        error: isValid ? undefined : '签名验证失败',
        details: {
          signType: sign_type,
          signString: signString.substring(0, 100) + '...', // 只记录前100个字符
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `签名验证过程出错: ${error}`,
      };
    }
  }

  /**
   * 构建待验签字符串
   */
  private buildSignString(params: AlipayNotifyParams): string {
    // 过滤掉签名参数和空值参数
    const filteredParams: Record<string, string> = {};
    
    Object.keys(params).forEach(key => {
      if (key !== 'sign' && key !== 'sign_type' && params[key] !== '' && params[key] != null) {
        filteredParams[key] = String(params[key]);
      }
    });
    
    // 按键名升序排序
    const sortedKeys = Object.keys(filteredParams).sort();
    
    // 构建查询字符串
    return sortedKeys
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');
  }

  /**
   * 转换通知数据为统一格式
   */
  protected async transformNotification(payload: PaymentNotifyPayload): Promise<UnifiedPaymentNotification> {
    const params = payload.raw as AlipayNotifyParams;

    // 转换为统一格式
    const result: UnifiedPaymentNotification = {
      provider: 'alipay',
      tradeStatus: this.mapTradeStatus(params.trade_status),
      outTradeNo: params.out_trade_no,
      tradeNo: params.trade_no,
      totalAmount: Math.round(parseFloat(params.total_amount) * 100), // 转为分
      payerId: params.buyer_id,
      raw: params,
      timestamp: Date.now(),
    };

    return result;
  }

  /**
   * 映射支付宝交易状态到统一状态
   */
  private mapTradeStatus(tradeStatus: string): UnifiedPaymentNotification['tradeStatus'] {
    switch (tradeStatus) {
      case 'TRADE_SUCCESS':
      case 'TRADE_FINISHED':
        return 'SUCCESS';
      case 'TRADE_CLOSED':
        return 'FAIL';
      case 'WAIT_BUYER_PAY':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  }

  /**
   * 生成成功响应
   */
  generateSuccessResponse(): string {
    return 'success';
  }

  /**
   * 生成失败响应
   */
  generateFailureResponse(error?: string): string {
    return 'fail';
  }

  /**
   * 获取支持的支付方式
   */
  getSupportedMethods(): string[] {
    return this.supportedMethods.map(method => `alipay.${method}`);
  }

  /**
   * 后处理逻辑
   */
  protected async postProcess(
    notification: UnifiedPaymentNotification, 
    originalPayload: PaymentNotifyPayload
  ): Promise<void> {
    // 记录处理日志
    if (this.config.sandbox) {
      console.log('🧪 支付宝沙箱环境处理完成:', {
        outTradeNo: notification.outTradeNo,
        tradeNo: notification.tradeNo,
        status: notification.tradeStatus,
        amount: notification.totalAmount,
      });
    }

    // 可以在这里添加其他后处理逻辑，如数据持久化、缓存等
  }

  /**
   * 解析支付宝表单数据
   */
  parseFormData(formData: any): AlipayNotifyParams {
    const params: any = {};
    
    // 支持多种格式的表单数据
    if (typeof formData === 'object' && formData !== null) {
      // 如果是普通对象，直接使用
      if (formData.constructor === Object) {
        return formData as AlipayNotifyParams;
      }
      
      // 如果有 entries 方法（类似 FormData）
      if (typeof formData.entries === 'function') {
        for (const [key, value] of formData.entries()) {
          params[key] = value;
        }
      } else {
        // 其他情况，尝试遍历属性
        for (const [key, value] of Object.entries(formData)) {
          params[key] = value;
        }
      }
    }
    
    return params as AlipayNotifyParams;
  }

  /**
   * 解析支付宝 URL 编码数据
   */
  parseUrlEncodedData(data: string): AlipayNotifyParams {
    const params: any = {};
    const pairs = data.split('&');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
    
    return params as AlipayNotifyParams;
  }

  /**
   * 创建响应对象
   * @param success 是否成功
   * @param error 错误信息
   * @returns 响应对象
   */
  createResponse(success: boolean, error?: string): {
    status: number;
    body: string;
    headers: Record<string, string>;
  } {
    return {
      status: success ? 200 : (error?.includes('验签') ? 401 : 400),
      body: success ? this.generateSuccessResponse() : this.generateFailureResponse(),
      headers: {
        'Content-Type': 'text/plain',
      },
    };
  }

  /**
   * 验证应用ID匹配
   */
  validateAppId(appId: string): boolean {
    return this.config.appId === appId;
  }

  /**
   * 获取签名类型
   */
  getSignType(): 'RSA' | 'RSA2' {
    return this.config.signType || 'RSA2';
  }
} 