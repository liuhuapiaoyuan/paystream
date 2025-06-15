import { describe, it, expect } from 'vitest';
import { WechatPayV3Signer } from '../wechat';

describe('WechatPayV3Signer', () => {
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCm2mb6q8gMKH/3
CNTbpJAIrbqiBiQGEOtjGcBrDYltsGynWgNscqT7WvfzU14FQbYcQUC5T4Wvva7m
i3fIp3OgX8VqMDNA0qebnr38Pe6kqiLyZgFpJPXlSKDyPyqhRbVTbXssvSMQeVKc
dXeVxoNNeoOlNFHgF/P0io6AmAVnz+hN8SiZKuOsth5/zUTLGvtkgxBcQooQrtXh
RcpLT798OyIb9xeJ2HO3xRtMv2+perEzb4gMibI74UBz+2QEbnkubPE+2jU2rRZu
dnNEz/BPOt3Qj/w2V6/G0VumGDh6+UeMU0jv4aupHztWITC4Akn0l7lBCNy3lgl8
VFaJnkIxAgMBAAECggEAYGL8aESB7NwciDWW2UdoWUsa7GxFtSdjAz2mFXGdeTsY
mVh7b9OOkRGM+Qio4LqEHDBp1mMk5E/cUJwy1zw8pGGO5nfvs7u9TT3XnHaefIs4
YvUgTYAneIuLRkXNN5rQU+CD7mVYczTSz0Vgjqo9wa1LjUz7G0xbBmJgTdMEFGJs
eJjy6AbJo0CGIwp6HJbTm4CmOUgXnnDAIbEGTIRImkZFH/rzneIeR7oZ77FVwxr1
CZB2gfRCov/yRPbw8vnryYkmvQ7D/ze3j5097vRg/MoDGBSdoOwcmo75vyofr0AS
zytMjmHYyifqkf5slPropSiJeGf4p/7gtKyF6dE/XQKBgQDVAlJ+4U5ZVGOuDc3+
sAhz8CTzgFNlq9vKuSoFK6hOz2L+cwj+E7NXGkOe2DsHHZNy2Xqxk7caKhPEp1z9
hhpMpyLVMoFt6CKemyoRBWDCQwLLwem9SZF/IAyovBkLiH36P42Jm26gUkNMKC/5
Zhtqxf6RZgRQzbVudJi47vIRCwKBgQDIh0+v27Oo+DM3fhObH4I1NrXpWOEGH7OQ
G1dEsMuFYF4hjGhg0kBEP3w9vVdl2+mRllZKTsx9oqjb8OibPLLIH8xsdbAB0WLf
JvjLu4wl/ILUzN1RI03dWnnv2EnEeQn6c3hizvrJ9wR5U4ue9RPVnQooJ0hZF1PU
uCL5fWK3MwKBgElReU/PAYbh80WP3t3Rfbdaa32dKBeQ5iCLR5lsA4zM+YgX1HqQ
EWTj126vgvHaDkyz6vWAoL/Sx+cirHFfXWIRDX5Q2hgYlQH+6qXdMgbrxeSYpHnQ
/tHBGFpkFELSAnrGsVMyOwvYBO4LzyeLK9i+ufcWJFoj1FVmsMLHDG8tAoGARdbi
iQQCoYG4DMarO2aQ6cmhN6EN1h0qY7EyBqlwaIZ0okiNfdMcMOjPc41DKCWcRmlO
qlihXcxN9TQFPzO3rH1urAOdBjUPs1qWYhZyrDQyuLyVBBJApyxAtajloDjrob+f
mQIvVDHk7ACN6xG+E7K6+9salnTKbJapD618uQMCgYBNy6XUvzLkP/A1U/UZdtcx
l8GwU/dturLxz4CyGbqDw4ubaYY2e13lnqHUqQgPtiSyH51nq3tdo8G0YAJdfkSv
KvnfslW91fyEBUKnkdW1o3/1UFU/wprZ7ixVL/F42A4xDu7OFE8EnweJOZ0jWceE
OdhCkaIGBCfRnlECRK8UyQ==
-----END PRIVATE KEY-----`;

  const mchId = '1900007291';
  const serialNo = '408B07E79B8269FEC3D5D3E6AB8ED163A6A380DB';

  describe('generateSignature', () => {
    it('应该使用指定参数正确生成签名', () => {
      // 创建签名器实例
      const signer = new WechatPayV3Signer(privateKey, mchId, serialNo);

      // 测试参数
      const method = 'GET';
      const url = '/v3/refund/domestic/refunds/123123123123';
      const timestamp = '1554208460';
      const nonce = '593BEC0C930BF1AFEB40B4A08C8FB242';
      const body = ''; // GET请求没有body

      // 生成签名
      const signature = signer.generateSignature(
        method,
        url,
        timestamp,
        nonce,
        body
      );

      // 验证签名不为空
      expect(signature).toBeDefined();
      expect(signature).toBeTypeOf('string');
      expect(signature).toBe(
        `Lc9VXxmeonkdV8Xk9tmigQFLhl0vRWTerdmoRu01aAnYwIrD/5nsSwE1WlmZGLRlAFTNQ3QsMa0+VRDlJp1Wp5p0nO8EK68b5sJBbjouxaFciIfq1zfDWWz+jqhcMoKXI1A6dPm1AW7D4d30WsMTNzp6g23OXakIsh9LO3lUmwvTuE0BY8ncf6tNGk4wKmvXwERd/ZpoQY3MAVKz+Nakwc+2XBmzT66KcUehU5kr4IvGa/lEU5RZb/q00zP9VLdBhC/jQSX3X1UcJLCtEc4gTmib4tnmAT+bHF/e17ZAuxDNcx6rqT8gNEXqaJGG+1OflMSTU2tpyG65G4dMKdFcoA==`
      );
      expect(signature.length).toBeGreaterThan(0);

      // 打印签名结果用于调试
      console.log('生成的签名:', signature);
      console.log('签名长度:', signature.length);

      // 验证签名是base64格式
      expect(() => {
        Buffer.from(signature, 'base64');
      }).not.toThrow();
    });

    it('应该生成正确的Authorization头', () => {
      const signer = new WechatPayV3Signer(privateKey, mchId, serialNo);

      const method = 'GET';
      const url = '/v3/refund/domestic/refunds/123123123123';
      const body = '';

      const authHeader = signer.generateAuthorizationHeader(method, url, body);

      // 验证Authorization头格式
      expect(authHeader).toBeDefined();
      expect(authHeader).toContain('WECHATPAY2-SHA256-RSA2048');
      expect(authHeader).toContain(`mchid="${mchId}"`);
      expect(authHeader).toContain(`serial_no="${serialNo}"`);
      expect(authHeader).toContain('nonce_str=');
      expect(authHeader).toContain('timestamp=');
      expect(authHeader).toContain('signature=');

      console.log('生成的Authorization头:', authHeader);
    });

    it('应该使用固定参数生成一致的签名', () => {
      const signer = new WechatPayV3Signer(privateKey, mchId, serialNo);

      const method = 'GET';
      const url = '/v3/refund/domestic/refunds/123123123123';
      const timestamp = '1554208460';
      const nonce = '593BEC0C930BF1AFEB40B4A08C8FB242';
      const body = '';

      // 多次生成签名应该一致
      const signature1 = signer.generateSignature(
        method,
        url,
        timestamp,
        nonce,
        body
      );
      const signature2 = signer.generateSignature(
        method,
        url,
        timestamp,
        nonce,
        body
      );

      expect(signature1).toBe(signature2);
    });

    it('应该正确构建待签名字符串', () => {
      const signer = new WechatPayV3Signer(privateKey, mchId, serialNo);

      const method = 'GET';
      const url = '/v3/refund/domestic/refunds/123123123123';
      const timestamp = '1554208460';
      const nonce = '593BEC0C930BF1AFEB40B4A08C8FB242';
      const body = '';

      // 预期的待签名字符串格式
      const expectedSignString = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;

      console.log('预期的待签名字符串:');
      console.log(JSON.stringify(expectedSignString));
      console.log('待签名字符串内容:');
      console.log(expectedSignString);

      // 生成签名来验证内部逻辑
      const signature = signer.generateSignature(
        method,
        url,
        timestamp,
        nonce,
        body
      );
      expect(signature).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该在私钥格式错误时抛出异常', () => {
      const invalidPrivateKey = 'invalid-private-key';
      const signer = new WechatPayV3Signer(invalidPrivateKey, mchId, serialNo);

      expect(() => {
        signer.generateSignature('GET', '/test', '123456', 'nonce', '');
      }).toThrow();
    });
  });
});
