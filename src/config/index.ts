import {
  PaymentConfig,
  WechatPayConfig,
  AlipayConfig,
  EnvConfig,
} from '../types/config';
import { PaymentError, PaymentErrorCode } from '../types/payment';

/**
 * 默认配置
 */
const defaultConfig: Partial<PaymentConfig> = {
  global: {
    timeout: 30000,
    retries: 3,
    logLevel: 'info',
    enableLog: true,
  },
};

/**
 * 从环境变量加载配置
 * @returns 配置对象
 */
export function loadConfigFromEnv(): Partial<PaymentConfig> {
  const env = process.env as unknown as EnvConfig;

  const config: Partial<PaymentConfig> = {
    ...defaultConfig,
  };

  // 微信支付配置
  if (env.WECHAT_APP_ID && env.WECHAT_MCH_ID) {
    config.wechat = {
      enabled: true,
      sandbox: false,
      appId: env.WECHAT_APP_ID,
      mchId: env.WECHAT_MCH_ID,
      apiV3Key: env.WECHAT_API_V3_KEY || '',
      privateKey: env.WECHAT_PRIVATE_KEY || '',
      serialNo: env.WECHAT_SERIAL_NO || '',
      platformCertificate: env.WECHAT_PLATFORM_CERT,
      notifyUrl: env.WECHAT_NOTIFY_URL,
    };
  }

  // 支付宝配置
  if (env.ALIPAY_APP_ID && env.ALIPAY_PRIVATE_KEY) {
    config.alipay = {
      enabled: true,
      sandbox: false,
      appId: env.ALIPAY_APP_ID,
      privateKey: env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: env.ALIPAY_PUBLIC_KEY || '',
      signType: (env.ALIPAY_SIGN_TYPE as 'RSA2' | 'RSA') || 'RSA2',
      gateway: env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      notifyUrl: env.ALIPAY_NOTIFY_URL,
      returnUrl: env.ALIPAY_RETURN_URL,
    };
  }

  // 全局配置
  if (env.PAYMENT_TIMEOUT) {
    config.global!.timeout = parseInt(env.PAYMENT_TIMEOUT, 10);
  }
  if (env.PAYMENT_RETRIES) {
    config.global!.retries = parseInt(env.PAYMENT_RETRIES, 10);
  }
  if (env.PAYMENT_LOG_LEVEL) {
    config.global!.logLevel = env.PAYMENT_LOG_LEVEL as any;
  }
  if (env.PAYMENT_ENABLE_LOG) {
    config.global!.enableLog = env.PAYMENT_ENABLE_LOG === 'true';
  }

  return config;
}

/**
 * 验证微信支付配置
 * @param config 微信支付配置
 */
export function validateWechatConfig(config: WechatPayConfig): void {
  const required = ['appId', 'mchId', 'apiV3Key', 'privateKey', 'serialNo'];

  for (const key of required) {
    if (!config[key as keyof WechatPayConfig]) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        `微信支付配置缺少必要参数: ${key}`
      );
    }
  }
}

/**
 * 验证支付宝配置
 * @param config 支付宝配置
 */
export function validateAlipayConfig(config: AlipayConfig): void {
  const required = ['appId', 'privateKey', 'alipayPublicKey'];

  for (const key of required) {
    if (!config[key as keyof AlipayConfig]) {
      throw new PaymentError(
        PaymentErrorCode.CONFIG_ERROR,
        `支付宝配置缺少必要参数: ${key}`
      );
    }
  }
}

/**
 * 合并配置
 * @param userConfig 用户配置
 * @param envConfig 环境变量配置
 * @returns 合并后的配置
 */
export function mergeConfig(
  userConfig: Partial<PaymentConfig> = {},
  envConfig: Partial<PaymentConfig> = {}
): PaymentConfig {
  return {
    wechat: { ...envConfig.wechat, ...userConfig.wechat },
    alipay: { ...envConfig.alipay, ...userConfig.alipay },
    hooks: { ...envConfig.hooks, ...userConfig.hooks },
    global: {
      ...defaultConfig.global,
      ...envConfig.global,
      ...userConfig.global,
    },
  } as PaymentConfig;
}

/**
 * 获取完整配置
 * @param userConfig 用户配置
 * @returns 完整配置
 */
export function getConfig(
  userConfig: Partial<PaymentConfig> = {}
): PaymentConfig {
  const envConfig = loadConfigFromEnv();
  const finalConfig = mergeConfig(userConfig, envConfig);

  // 验证配置
  if (finalConfig.wechat?.enabled) {
    validateWechatConfig(finalConfig.wechat);
  }

  if (finalConfig.alipay?.enabled) {
    validateAlipayConfig(finalConfig.alipay);
  }

  return finalConfig;
}
