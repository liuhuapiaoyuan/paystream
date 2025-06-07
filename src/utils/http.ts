import { PaymentError, PaymentErrorCode } from '../types/payment';

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

/**
 * HTTP 响应
 */
export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

/**
 * HTTP 客户端类
 */
export class HttpClient {
  private timeout: number;

  constructor(timeout = 30000) {
    this.timeout = timeout;
  }

  /**
   * 发送 HTTP 请求
   */
  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const { url, method, headers = {}, data, timeout = this.timeout } = config;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body =
          typeof data === 'string' ? data : JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: T;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as T;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new PaymentError(
            PaymentErrorCode.NETWORK_ERROR,
            '请求超时',
            error
          );
        }
        throw new PaymentError(
          PaymentErrorCode.NETWORK_ERROR,
          `网络请求失败: ${error.message}`,
          error
        );
      }
      throw new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        '未知网络错误',
        error
      );
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(
    url: string,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ url, method: 'GET', headers });
  }

  /**
   * POST 请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ url, method: 'POST', data, headers });
  }
}
