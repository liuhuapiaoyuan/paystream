import { BaseProvider, BaseProviderConfig, VerifyResult } from '../base/BaseProvider';
import { 
  UnifiedPaymentNotification, 
  PaymentNotifyPayload, 
  PaymentError, 
  PaymentErrorCode,
  WechatPayMethod 
} from '../../types/payment';
import { WechatPayConfig } from '../../types/config';
import { aesGcmDecrypt, verifyWechatSignature } from '../../utils/crypto';

/**
 * 微信支付回调数据结构
 */
interface WechatNotification {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  resource: {
    ciphertext: string;
    nonce: string;
    associated_data: string;
  };
}

/**
 * 解密后的微信支付数据
 */
interface WechatTransactionData {
  mchid: string;
  appid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: string;
  trade_state: string;
  trade_state_desc: string;
  bank_type: string;
  attach?: string;
  success_time: string;
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
 * 微信支付 Provider 配置接口
 */
export interface WechatProviderConfig extends BaseProviderConfig {
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
}

/**
 * 微信支付 Provider 实现
 */
export class WechatProvider extends BaseProvider<WechatProviderConfig> {
  private readonly supportedMethods: WechatPayMethod[] = ['native', 'jsapi', 'h5', 'app'];

  constructor(config: WechatProviderConfig) {
    super(config, 'wechat');
  }

  /**
   * 验证配置
   */
  protected validateConfig(): void {
    const required = ['appId', 'mchId', 'apiV3Key', 'privateKey', 'serialNo'];
    
    for (const key of required) {
      if (!this.config[key as keyof WechatProviderConfig]) {
        throw new PaymentError(
          PaymentErrorCode.CONFIG_ERROR,
          `微信支付配置缺少必要参数: ${key}`
        );
      }
    }

    // 验证 appId 格式
    if (!this.config.appId.startsWith('wx')) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        '微信支付 appId 格式错误，应以 "wx" 开头'
      );
    }

    // 验证商户号格式
    if (!/^\d{10}$/.test(this.config.mchId)) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        '微信支付商户号格式错误，应为10位数字'
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
        '微信支付回调数据为空'
      );
    }

    const notification = payload.raw as WechatNotification;
    
    if (!notification.resource) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '微信支付回调缺少 resource 字段'
      );
    }

    const { ciphertext, nonce, associated_data } = notification.resource;
    if (!ciphertext || !nonce || !associated_data) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '微信支付回调 resource 字段不完整'
      );
    }
  }

  /**
   * 验证签名
   */
  protected async verifySignature(payload: PaymentNotifyPayload): Promise<VerifyResult> {
    // 如果没有平台证书，跳过验签
    if (!this.config.platformCertificate) {
      return { success: true, details: ' 跳过验签（无平台证书）' };
    }

    const { headers, raw } = payload;
    
    if (!headers) {
      return { 
        success: false, 
        error: '缺少请求头信息' 
      };
    }

    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const signature = headers['wechatpay-signature'];
    const serialNo = headers['wechatpay-serial'];

    if (!timestamp || !nonce || !signature || !serialNo) {
      return { 
        success: false, 
        error: '缺少必要的签名参数' 
      };
    }

    try {
      const body = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const isValid = verifyWechatSignature(
        timestamp,
        nonce,
        body,
        signature,
        this.config.platformCertificate
      );

      return {
        success: isValid,
        error: isValid ? undefined : '签名验证失败',
        details: {
          timestamp,
          nonce,
          serialNo,
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
   * 转换通知数据为统一格式
   */
  protected async transformNotification(payload: PaymentNotifyPayload): Promise<UnifiedPaymentNotification> {
    const notification = payload.raw as WechatNotification;
    const { resource } = notification;

    try {
      // 解密回调数据
      const decryptedStr = aesGcmDecrypt(
        resource.ciphertext,
        resource.nonce,
        resource.associated_data,
        this.config.apiV3Key
      );

      const transactionData: WechatTransactionData = JSON.parse(decryptedStr);

      // 转换为统一格式
      const result: UnifiedPaymentNotification = {
        provider: 'wechat',
        tradeStatus: this.mapTradeStatus(transactionData.trade_state),
        outTradeNo: transactionData.out_trade_no,
        tradeNo: transactionData.transaction_id,
        totalAmount: transactionData.amount.total,
        payerId: transactionData.payer.openid,
        raw: transactionData,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      throw new PaymentError(
        PaymentErrorCode.DECRYPT_FAILED,
        '微信支付回调数据解密失败',
        error
      );
    }
  }

  /**
   * 映射微信支付交易状态到统一状态
   */
  private mapTradeStatus(tradeState: string): UnifiedPaymentNotification['tradeStatus'] {
    switch (tradeState) {
      case 'SUCCESS':
        return 'SUCCESS';
      case 'REFUND':
        return 'FAIL';
      case 'NOTPAY':
      case 'USERPAYING':
        return 'PENDING';
      case 'REVOKED':
      case 'PAYERROR':
        return 'FAIL';
      default:
        return 'PENDING';
    }
  }

  /**
   * 生成成功响应
   */
  generateSuccessResponse(): object {
    return {
      code: 'SUCCESS',
      message: 'OK'
    };
  }

  /**
   * 生成失败响应
   */
  generateFailureResponse(error?: string): object {
    return {
      code: 'FAIL',
      message: error || '处理失败'
    };
  }

  /**
   * 获取支持的支付方式
   */
  getSupportedMethods(): string[] {
    return this.supportedMethods.map(method => `wechat.${method}`);
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
      console.log('🧪 微信支付沙箱环境处理完成:', {
        outTradeNo: notification.outTradeNo,
        tradeNo: notification.tradeNo,
        status: notification.tradeStatus,
        amount: notification.totalAmount,
      });
    }

    // 可以在这里添加其他后处理逻辑，如数据持久化、缓存等
  }

  /**
   * 创建响应对象
   * @param success 是否成功
   * @param error 错误信息
   * @returns 响应对象
   */
  createResponse(success: boolean, error?: string): {
    status: number;
    body: object;
    headers: Record<string, string>;
  } {
    return {
      status: success ? 200 : (error?.includes('验签') ? 401 : 400),
      body: success ? this.generateSuccessResponse() : this.generateFailureResponse(error),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
} 