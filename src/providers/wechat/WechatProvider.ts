import {
  BaseProvider,
  BaseProviderConfig,
  VerifyResult,
} from '../base/BaseProvider';
import {
  UnifiedPaymentNotification,
  PaymentNotifyPayload,
  PaymentError,
  PaymentErrorCode,
  WechatPayMethod,
} from '../../types/payment';
import { aesGcmDecrypt, verifyWechatSignature } from '../../utils/crypto';

/**
 * 微信支付回调数据结构
 */
interface WechatNotification {
  /** 通知ID */
  id: string;
  /** 通知创建时间 */
  create_time: string;
  /** 通知事件类型 */
  event_type: string;
  /** 通知资源类型 */
  resource_type: string;
  /** 通知资源数据 */
  resource: {
    /** 加密数据 */
    ciphertext: string;
    /** 随机串 */
    nonce: string;
    /** 附加数据 */
    associated_data: string;
  };
}

/**
 * 解密后的微信支付数据
 */
interface WechatTransactionData {
  /** 商户号 */
  mchid: string;
  /** 应用ID */
  appid: string;
  /** 商户订单号 */
  out_trade_no: string;
  /** 微信支付订单号 */
  transaction_id: string;
  /** 交易类型 */
  trade_type: string;
  /** 交易状态 */
  trade_state: string;
  /** 交易状态描述 */
  trade_state_desc: string;
  /** 付款银行类型 */
  bank_type: string;
  /** 附加数据 */
  attach?: string;
  /** 支付完成时间 */
  success_time: string;
  /** 支付者信息 */
  payer: {
    /** 用户标识 */
    openid: string;
  };
  /** 订单金额信息 */
  amount: {
    /** 订单总金额 */
    total: number;
    /** 用户支付金额 */
    payer_total: number;
    /** 货币类型 */
    currency: string;
    /** 用户支付币种 */
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
  private readonly supportedMethods: WechatPayMethod[] = [
    'native',
    'jsapi',
    'h5',
    'app',
  ];

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

    // 检查必要字段
    if (!notification.id || !notification.resource) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '微信支付回调数据格式错误'
      );
    }

    // 检查加密数据
    const { ciphertext, nonce, associated_data } = notification.resource;
    if (!ciphertext || !nonce || !associated_data) {
      throw new PaymentError(
        PaymentErrorCode.INVALID_PARAMS,
        '微信支付回调缺少加密数据'
      );
    }
  }

  /**
   * 验证签名
   */
  protected async verifySignature(
    payload: PaymentNotifyPayload
  ): Promise<VerifyResult> {
    try {
      const { headers, raw } = payload;

      if (!headers) {
        return {
          success: false,
          error: '缺少请求头信息',
        };
      }

      // 获取签名相关头部
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const signature = headers['wechatpay-signature'];
      const serial = headers['wechatpay-serial'];

      if (!timestamp || !nonce || !signature || !serial) {
        return {
          success: false,
          error: '缺少必要的签名头部信息',
        };
      }

      // 构建待验签字符串
      const body = typeof raw === 'string' ? raw : JSON.stringify(raw);

      // 验证签名
      const isValid = verifyWechatSignature(
        timestamp,
        nonce,
        body,
        signature,
        this.config.platformCertificate || ''
      );

      return {
        success: isValid,
        error: isValid ? undefined : '签名验证失败',
        details: {
          timestamp,
          nonce,
          serial,
        },
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
  protected async transformNotification(
    payload: PaymentNotifyPayload
  ): Promise<UnifiedPaymentNotification> {
    const notification = payload.raw as WechatNotification;

    // 解密数据
    const decryptedData = aesGcmDecrypt(
      notification.resource.ciphertext,
      this.config.apiV3Key,
      notification.resource.nonce,
      notification.resource.associated_data
    );

    const transactionData: WechatTransactionData = JSON.parse(decryptedData);

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
  }

  /**
   * 映射微信支付交易状态到统一状态
   */
  private mapTradeStatus(
    tradeState: string
  ): UnifiedPaymentNotification['tradeStatus'] {
    switch (tradeState) {
      case 'SUCCESS':
        return 'SUCCESS';
      case 'REFUND':
      case 'CLOSED':
      case 'REVOKED':
      case 'PAYERROR':
        return 'FAIL';
      case 'USERPAYING':
      case 'NOTPAY':
        return 'PENDING';
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
      message: '成功',
    };
  }

  /**
   * 生成失败响应
   */
  generateFailureResponse(_error?: string): object {
    return {
      code: 'FAIL',
      message: '失败',
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
    _originalPayload: PaymentNotifyPayload
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
   */
  createResponse(
    success: boolean,
    _error?: string
  ): {
    status: number;
    body: object;
    headers: Record<string, string>;
  } {
    return {
      status: success ? 200 : 400,
      body: success
        ? this.generateSuccessResponse()
        : this.generateFailureResponse(),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}
