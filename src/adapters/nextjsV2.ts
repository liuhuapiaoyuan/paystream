import { PaymentManagerV2 } from '../core/PaymentManagerV2';
import {
  PaymentNotifyPayload,
  PaymentMethod,
  UnifiedPaymentNotification,
  PaymentError,
  PaymentErrorCode,
} from '../types/payment';
import {
  BaseProvider,
  WechatProvider,
  AlipayProvider,
} from '../providers/base';

/**
 * Next.js App Router 响应类型
 */
type NextResponse = Response;

/**
 * Next.js App Router 请求类型
 */
interface NextRequest extends Request {
  formData(): Promise<FormData>;
  json(): Promise<any>;
}

/**
 * 响应构建器接口
 */
interface ResponseBuilder {
  buildSuccessResponse(): {
    status: number;
    body: any;
    headers: Record<string, string>;
  };
  buildFailureResponse(error?: string): {
    status: number;
    body: any;
    headers: Record<string, string>;
  };
}

/**
 * V2 回调处理器配置
 */
export interface NotifyHandlerV2Config {
  /** 支付管理器 V2 */
  paymentManager: PaymentManagerV2;
  /** 支付方式 */
  method: PaymentMethod;
  /** 成功回调 */
  onSuccess?: (
    notification: UnifiedPaymentNotification
  ) => void | Promise<void>;
  /** 失败回调 */
  onFail?: (notification: UnifiedPaymentNotification) => void | Promise<void>;
  /** 待处理回调 */
  onPending?: (
    notification: UnifiedPaymentNotification
  ) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: PaymentError) => void | Promise<void>;
  /** 自定义响应构建器 */
  responseBuilder?: ResponseBuilder;
  /** 启用调试日志 */
  enableDebugLog?: boolean;
}

/**
 * 默认响应构建器
 */
class DefaultResponseBuilder implements ResponseBuilder {
  constructor(private provider: BaseProvider) {}

  buildSuccessResponse() {
    const response = this.provider.generateSuccessResponse();
    return {
      status: 200,
      body: response,
      headers: this.getHeaders(response),
    };
  }

  buildFailureResponse(error?: string) {
    const response = this.provider.generateFailureResponse(error);
    return {
      status: 400,
      body: response,
      headers: this.getHeaders(response),
    };
  }

  private getHeaders(_response: any): Record<string, string> {
    if (this.provider instanceof WechatProvider) {
      return { 'Content-Type': 'application/json' };
    }
    if (this.provider instanceof AlipayProvider) {
      return { 'Content-Type': 'text/plain' };
    }
    return { 'Content-Type': 'application/json' };
  }
}

/**
 * 创建 V2 通用回调处理器
 * @param config 配置
 * @returns 路由处理函数
 */
export function createNotifyHandlerV2(config: NotifyHandlerV2Config) {
  const {
    paymentManager,
    method,
    onSuccess,
    onFail,
    onPending,
    onError,
    responseBuilder,
    enableDebugLog = false,
  } = config;

  return async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      if (enableDebugLog) {
        console.log(`🔄 [${method}] 开始处理支付回调...`);
      }

      // 解析支付载荷
      const payload = await parsePaymentPayload(request, method);

      if (enableDebugLog) {
        console.log(`📦 [${method}] 载荷解析完成`);
      }

      // 使用 PaymentManagerV2 处理回调
      const result = await paymentManager.handleNotify(method, payload);

      if (enableDebugLog) {
        console.log(`✅ [${method}] 回调处理完成:`, {
          outTradeNo: result.outTradeNo,
          status: result.tradeStatus,
          duration: Date.now() - startTime,
        });
      }

      // 执行状态回调
      await executeStatusCallbacks(result, { onSuccess, onFail, onPending });

      // 构建响应
      const response = await buildResponse(
        paymentManager,
        method,
        result,
        responseBuilder
      );

      return new Response(
        typeof response.body === 'string'
          ? response.body
          : JSON.stringify(response.body),
        {
          status: response.status,
          headers: response.headers,
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      if (enableDebugLog) {
        console.error(`❌ [${method}] 回调处理失败 (${duration}ms):`, error);
      }

      // 执行错误回调
      if (onError && error instanceof PaymentError) {
        try {
          await onError(error);
        } catch (callbackError) {
          console.error('错误回调执行失败:', callbackError);
        }
      }

      // 构建错误响应
      const errorResponse = await buildErrorResponse(
        paymentManager,
        method,
        error,
        responseBuilder
      );

      return new Response(
        typeof errorResponse.body === 'string'
          ? errorResponse.body
          : JSON.stringify(errorResponse.body),
        {
          status: errorResponse.status,
          headers: errorResponse.headers,
        }
      );
    }
  };
}

/**
 * 解析支付载荷
 */
async function parsePaymentPayload(
  request: NextRequest,
  method: PaymentMethod
): Promise<PaymentNotifyPayload> {
  if (method.startsWith('wechat.')) {
    const raw = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      provider: 'wechat',
      raw,
      headers,
    };
  }

  if (method.startsWith('alipay.')) {
    const formData = await request.formData();
    const raw: Record<string, string> = {};

    formData.forEach((value, key) => {
      raw[key] = value.toString();
    });

    return {
      provider: 'alipay',
      raw,
    };
  }

  throw new PaymentError(
    PaymentErrorCode.INVALID_PARAMS,
    `不支持的支付方式: ${method}`
  );
}

/**
 * 执行状态回调
 */
async function executeStatusCallbacks(
  result: UnifiedPaymentNotification,
  callbacks: {
    onSuccess?: (
      notification: UnifiedPaymentNotification
    ) => void | Promise<void>;
    onFail?: (notification: UnifiedPaymentNotification) => void | Promise<void>;
    onPending?: (
      notification: UnifiedPaymentNotification
    ) => void | Promise<void>;
  }
) {
  const { onSuccess, onFail, onPending } = callbacks;

  try {
    switch (result.tradeStatus) {
      case 'SUCCESS':
        if (onSuccess) await onSuccess(result);
        break;
      case 'FAIL':
        if (onFail) await onFail(result);
        break;
      case 'PENDING':
        if (onPending) await onPending(result);
        break;
    }
  } catch (error) {
    console.error('状态回调执行失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 构建响应
 */
async function buildResponse(
  paymentManager: PaymentManagerV2,
  method: PaymentMethod,
  result: UnifiedPaymentNotification,
  customBuilder?: ResponseBuilder
) {
  const providerName = method.split('.')[0];
  const provider = paymentManager.getProviderInstance(providerName);

  if (!provider) {
    throw new PaymentError(
      PaymentErrorCode.UNKNOWN_PROVIDER,
      `未找到 Provider: ${providerName}`
    );
  }

  const builder = customBuilder || new DefaultResponseBuilder(provider);

  if (result.tradeStatus === 'SUCCESS') {
    return builder.buildSuccessResponse();
  }

  return builder.buildFailureResponse(`处理失败: ${result.tradeStatus}`);
}

/**
 * 构建错误响应
 */
async function buildErrorResponse(
  paymentManager: PaymentManagerV2,
  method: PaymentMethod,
  error: any,
  customBuilder?: ResponseBuilder
) {
  const providerName = method.split('.')[0];
  const provider = paymentManager.getProviderInstance(providerName);

  if (provider) {
    const builder = customBuilder || new DefaultResponseBuilder(provider);
    return {
      ...builder.buildFailureResponse(error.message || '服务器错误'),
      status: 500,
    };
  }

  // 默认错误响应
  return {
    status: 500,
    body: { code: 'FAIL', message: '服务器错误' },
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * 创建快捷微信支付处理器
 */
export function createWechatNotifyHandlerV2(
  paymentManager: PaymentManagerV2,
  method: PaymentMethod = 'wechat.native',
  options?: Omit<NotifyHandlerV2Config, 'paymentManager' | 'method'>
) {
  return createNotifyHandlerV2({
    paymentManager,
    method,
    ...options,
  });
}

/**
 * 创建快捷支付宝处理器
 */
export function createAlipayNotifyHandlerV2(
  paymentManager: PaymentManagerV2,
  method: PaymentMethod = 'alipay.qrcode',
  options?: Omit<NotifyHandlerV2Config, 'paymentManager' | 'method'>
) {
  return createNotifyHandlerV2({
    paymentManager,
    method,
    ...options,
  });
}
