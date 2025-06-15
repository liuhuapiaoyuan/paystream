import { describe, it, expect } from 'vitest';
import { WechatPayV2Client } from '../wechat.v2';

describe('WechatPayV2Client - generateSignature', () => {
  // 用户提供的测试参数
  const testParams = {
    appid: 'wxd930ea5d5a258f4f',
    mch_id: '10000100',
    device_info: '1000',
    body: 'test',
    nonce_str: 'ibuaiVcKdpRxkhJA',
  };
  const apiKey = '192006250b4c09247ec02edce69f6a2d';

  describe('MD5签名验证', () => {
    it('应该使用MD5算法正确生成签名', () => {
      // 创建微信支付V2客户端实例，使用MD5签名
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );

      // 生成签名
      const signature = client.generateSignature(testParams);

      // 验证签名
      expect(signature).toBeDefined();
      expect(signature).toBeTypeOf('string');
      expect(signature.length).toBe(32); // MD5签名长度为32位
      expect(signature).toMatch(/^[A-F0-9]{32}$/); // MD5签名应该是32位大写十六进制字符串

      console.log('测试参数:', testParams);
      console.log('API Key:', apiKey);
      console.log('生成的MD5签名:', signature);

      // 手动计算预期签名进行验证
      // 按照微信支付V2签名规则：
      // 1. 参数按key的字母序排序
      // 2. 拼接成 key1=value1&key2=value2&...&key=apikey 的格式
      // 3. 进行MD5加密并转为大写
      const sortedKeys = Object.keys(testParams).sort();
      const signString =
        sortedKeys
          .map(key => `${key}=${testParams[key as keyof typeof testParams]}`)
          .join('&') + `&key=${apiKey}`;

      console.log('待签名字符串:', signString);

      // 预期的签名值（根据微信支付V2文档计算）
      // appid=wxd930ea5d5a258f4f&body=test&device_info=1000&mch_id=10000100&nonce_str=ibuaiVcKdpRxkhJA&key=192006250b4c09247ec02edce69f6a2d
      // 这个字符串的MD5值应该是固定的
      const expectedSignature = '9A0A8659F005D6984697E2CA0A9CF3B7';
      expect(signature).toBe(expectedSignature);
    });

    it('应该正确处理空值和sign字段过滤', () => {
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );

      // 包含空值和sign字段的参数
      const paramsWithEmpty = {
        ...testParams,
        empty_field: '',
        undefined_field: undefined,
        sign: 'should_be_filtered',
      };

      const signature = client.generateSignature(paramsWithEmpty);

      // 应该和原始参数生成相同的签名（空值和sign字段被过滤）
      const originalSignature = client.generateSignature(testParams);
      expect(signature).toBe(originalSignature);

      console.log('包含空值的参数签名:', signature);
      console.log('原始参数签名:', originalSignature);
    });
  });

  describe('HMAC-SHA256签名验证', () => {
    it('应该使用HMAC-SHA256算法正确生成签名', () => {
      // 创建微信支付V2客户端实例，使用HMAC-SHA256签名
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'HMAC-SHA256'
      );

      // 生成签名
      const signature = client.generateSignature(testParams);

      // 验证签名
      expect(signature).toBeDefined();
      expect(signature).toBeTypeOf('string');
      expect(signature.length).toBe(64); // HMAC-SHA256签名长度为64位
      expect(signature).toMatch(/^[A-F0-9]{64}$/); // HMAC-SHA256签名应该是64位大写十六进制字符串

      console.log('生成的HMAC-SHA256签名:', signature);

      // 验证签名不同于MD5
      const md5Client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );
      const md5Signature = md5Client.generateSignature(testParams);
      expect(signature).not.toBe(md5Signature);
    });
  });

  describe('签名一致性验证', () => {
    it('相同参数应该生成相同签名', () => {
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );

      const signature1 = client.generateSignature(testParams);
      const signature2 = client.generateSignature(testParams);

      expect(signature1).toBe(signature2);
    });

    it('参数顺序不同应该生成相同签名', () => {
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );

      // 改变参数顺序
      const reorderedParams = {
        nonce_str: testParams.nonce_str,
        body: testParams.body,
        appid: testParams.appid,
        device_info: testParams.device_info,
        mch_id: testParams.mch_id,
      };

      const signature1 = client.generateSignature(testParams);
      const signature2 = client.generateSignature(reorderedParams);

      expect(signature1).toBe(signature2);
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理只有必需参数的情况', () => {
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );

      const minimalParams = {
        appid: testParams.appid,
        mch_id: testParams.mch_id,
        nonce_str: testParams.nonce_str,
      };

      const signature = client.generateSignature(minimalParams);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[A-F0-9]{32}$/);

      console.log('最小参数签名:', signature);
    });

    it('应该正确处理包含特殊字符的参数', () => {
      const client = new WechatPayV2Client(
        testParams.appid,
        testParams.mch_id,
        apiKey,
        'MD5'
      );

      const specialParams = {
        ...testParams,
        body: 'test&special=chars',
        attach: 'data with spaces',
      };

      const signature = client.generateSignature(specialParams);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[A-F0-9]{32}$/);

      console.log('特殊字符参数签名:', signature);
    });
  });
});
