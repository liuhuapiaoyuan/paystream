import { describe, expect, it } from 'vitest';
import { WechatPayV3Client } from '../wechat';

describe('WechatPayV3Client 退款功能', () => {
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEwAIBADANBgkqhkiG9w0BAQEFAASCBKowggSmAgEAAoIBAQDB11b125QHRKKM
y0YTWaEfdWP0n2DN9K5ahnUHMT8oxGlmTNL4lopq52M0u+ns1S8BeQTPjLkaq7dd
gl5uDKj7le8Dev4YQ1wjoreZqYNKIhxQo7XSvwyiCwV7ff8A4hqf6+L9lUHW6RMU
be+ZkA9G50KgDkLoNj/kRr7saEFO1fKV8fVo+ULpYGEOT+khRbigeusIK9lQT0yG
PYa+oKtDnD207h8VwzQpDp7lcsznkJ3eYiaxTVKfxiyxhMPJnJ8xLTDYhLA6U25c
uWLIj10RbQdmvT/rmVLp2rdwYhwmpyTb8n6zSEk/kLg7XU13J8FYclqvXib9Jplj
tq7I77YZAgMBAAECggEBAKoZc6AP7dhq7FGs13OHhZJ7ixlQ+rwA6TdbIjsLhica
JHu3ErM+N30US8Qs2lwPv04FiqkvDghPg3s1OfRMe8U6jyF4vp1ADwzeb0sSq7lU
MZC5+IZVTJquHUN/D1URFNgdQXXRkpMquKmGx2j0N9O6gIa/vQrVAEArrML7wcOR
BxPrgPtnPhUVhLHbIXdvIcZ4EBEdfzCWQWKHAfCEhKZYhYqnjkzfwyGmIaQN5d1F
FmUdKyLpe0KgY+dX3n1o1m8DK6t/e75fCApKX3P6zdU5fY60t8ob0bpiIzTGeEWT
Z4EFX9ZNv+9IVSt4pJuKA8gRTBoZ5zmPoSnyrTCv2mECgYEA8lPgvsnrpYgMs0Jp
xl+4Cd4ju3XqJ7zMSWPjrG/t0W2TTyDEIvDcyo2CBzlCg5g7sMuzO16FNr5e2y6N
Ta8KswI0lAcS4b+/TIJUpc5H6GVySf9+S2b2gcVj/i+aQrWPThblBuDwxf8MCGou
biholFbPHbaGLfjH36FQps7ydQUCgYEAzMcigerJze9Bz9yDKpaITxLZbCiVE293
gES5EzUTCBUPvjs4W9RbLDdufIJkW/TAG72VVyLK90fU9Dqvkm1DH+aH5CT3KjtS
IANjmYr+NFA2YFCUAqJfgzTYc5WnCbQh9OUZSYK+ZrtUy+7bYaldmGH4VJN3qk0H
5vzK8HeRSQUCgYEAm5NEN9j049obpT6fIA+13Qfz0tdaFFb+pKNvuPZHLWx25Zc4
tOIELjp5X1/glxG2SMQOdrAxQDsqNPeHGnelm9VvohWEhtCO5XTLGYP84HO4008n
awtYeWobz0YKeIeN0GmccjUZ/1PGCuT4mBpzQcEVyZK0RHFzCNzNJbq5KG0CgYEA
no/LPoHIxTbv5L3AqudooKHdzQwXcrcq9x0/mYnNNMLqL8i3ORPTjQdW+/4TK8j2
QASqcJA2TQdH89zFOkJ0aW0d6CBfakoIq1U0eB3R/Dvn/ugl02xbPMNcnxNQBgl/
CZuj2vHr8Kw5WreXE6YLHQUvPn35eNqwtcEketJ6oukCgYEAsC3VEVrZfV8blvsw
Yqykc2VOFBgB39p9UAu9UsT7MsxlQ9+uT6onHRcYIsSDUmyxMO8EdxVWFGG3DuI4
p4E3Wh3tjZ6ndUEgZMyysv0yzrx7ATCspf+oK83rM4wyvsl5BbMArNQ1m+8CzzXA
GDgMsrWNb1GpHD7/vMDZh3siqN4=
-----END PRIVATE KEY-----
`;
  const mchId = '1721113080';
  const serialNo = '65D25DFE3FDFCA33E717CB1FC821694721BDF14E';

  describe('createRefund', () => {
    it('应该成功创建退款申请', async () => {
      const refundParams = {
        out_trade_no: 'cmcsxrux30001tf1w1jroixt5',
        out_refund_no: 'REFUND20240101123456',
        reason: '用户申请退款',
        amount: {
          refund: 5,
          total: 100,
          currency: 'CNY',
        },
      };
      const client = new WechatPayV3Client(privateKey, mchId, serialNo);
      const result = await client.createRefund(refundParams);
      console.log('返回的结果', { result });
      // 验证返回结果
      expect(result.out_refund_no).toBe('REFUND20240101123456');
      expect(result.status).toBe('SUCCESS');
      expect(result.amount.refund).toBe(5);
    });
  });
});
