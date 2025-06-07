import {
  createDecipheriv,
  createVerify,
  createSign,
  randomBytes,
} from 'crypto';
import { PaymentError, PaymentErrorCode } from '../types/payment';

/**
 * AES-GCM 解密函数（微信支付 v3）
 * @param ciphertext 密文（base64）
 * @param nonce 随机数
 * @param associatedData 附加数据
 * @param apiV3Key API v3 密钥
 * @returns 解密后的明文
 */
export function aesGcmDecrypt(
  ciphertext: string,
  nonce: string,
  associatedData: string,
  apiV3Key: string
): string {
  try {
    const buffer = Buffer.from(ciphertext, 'base64');
    const authTag = buffer.slice(buffer.length - 16);
    const data = buffer.slice(0, buffer.length - 16);

    const decipher = createDecipheriv('aes-256-gcm', apiV3Key, nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData));

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new PaymentError(
      PaymentErrorCode.DECRYPT_FAILED,
      '微信支付回调数据解密失败',
      error
    );
  }
}

/**
 * RSA2 验签函数（支付宝）
 * @param data 待验证的数据
 * @param signature 签名
 * @param publicKey 公钥
 * @returns 验证结果
 */
export function verifyWithRSA2(
  data: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verify = createVerify('RSA-SHA256');
    verify.write(data);
    verify.end();

    // 确保公钥格式正确
    const formattedKey = formatPublicKey(publicKey);

    return verify.verify(formattedKey, signature, 'base64');
  } catch (error) {
    throw new PaymentError(
      PaymentErrorCode.VERIFY_FAILED,
      '支付宝回调验签失败',
      error
    );
  }
}

/**
 * RSA 验签函数（支付宝 RSA）
 * @param data 待验证的数据
 * @param signature 签名
 * @param publicKey 公钥
 * @returns 验证结果
 */
export function verifyWithRSA(
  data: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verify = createVerify('RSA-SHA1');
    verify.write(data);
    verify.end();

    const formattedKey = formatPublicKey(publicKey);

    return verify.verify(formattedKey, signature, 'base64');
  } catch (error) {
    throw new PaymentError(
      PaymentErrorCode.VERIFY_FAILED,
      '支付宝回调验签失败',
      error
    );
  }
}

/**
 * 格式化公钥
 * @param publicKey 公钥字符串
 * @returns 格式化后的公钥
 */
function formatPublicKey(publicKey: string): string {
  if (publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
    return publicKey;
  }

  return `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
}

/**
 * 生成 RSA 签名（用于支付宝请求签名）
 * @param data 待签名数据
 * @param privateKey 私钥
 * @param algorithm 签名算法
 * @returns 签名结果
 */
export function signWithRSA(
  data: string,
  privateKey: string,
  algorithm: 'RSA-SHA1' | 'RSA-SHA256' = 'RSA-SHA256'
): string {
  try {
    const sign = createSign(algorithm);
    sign.write(data);
    sign.end();

    const formattedKey = formatPrivateKey(privateKey);

    return sign.sign(formattedKey, 'base64');
  } catch (error) {
    throw new PaymentError(
      PaymentErrorCode.CONFIG_ERROR,
      '生成签名失败',
      error
    );
  }
}

/**
 * 格式化私钥
 * @param privateKey 私钥字符串
 * @returns 格式化后的私钥
 */
function formatPrivateKey(privateKey: string): string {
  if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    return privateKey;
  }

  return `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

/**
 * 微信支付签名验证
 * @param timestamp 时间戳
 * @param nonce 随机字符串
 * @param body 请求体
 * @param signature 签名
 * @param publicKey 微信支付平台公钥
 * @returns 验证结果
 */
export function verifyWechatSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const message = `${timestamp}\n${nonce}\n${body}\n`;

    const verify = createVerify('RSA-SHA256');
    verify.write(message);
    verify.end();

    const formattedKey = formatPublicKey(publicKey);

    return verify.verify(formattedKey, signature, 'base64');
  } catch (error) {
    throw new PaymentError(
      PaymentErrorCode.VERIFY_FAILED,
      '微信支付签名验证失败',
      error
    );
  }
}

/**
 * 生成随机字符串
 */
export function generateNonce(length = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成时间戳（秒）
 */
export function generateTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 生成随机订单号
 */
export function generateOrderNo(prefix = ''): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * 格式化金额（分转元）
 */
export function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}

/**
 * 解析金额（元转分）
 */
export function parseAmount(amount: string | number): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(num * 100);
}

/**
 * 验证订单号格式
 */
export function validateOrderNo(orderNo: string): boolean {
  // 订单号应该是6-32位字符，只能包含数字、字母、下划线、横线
  const regex = /^[a-zA-Z0-9_-]{6,32}$/;
  return regex.test(orderNo);
}

/**
 * 生成UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 安全比较字符串（防止时序攻击）
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * URL安全的Base64编码
 */
export function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * URL安全的Base64解码
 */
export function base64UrlDecode(str: string): string {
  // 补齐padding
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return Buffer.from(base64, 'base64').toString('utf8');
}
