const request = require('supertest');
const { criarAppPedidos } = require('../../src/pedidos-app');

// BÔNUS: dependência externa simulada + idempotência (Slides 7 e 9)
describe('API de pedidos (bônus)', () => {
  let pagamentoOk;

  beforeEach(() => {
    // Fake do serviço externo: cada cobrança devolve um id novo
    let n = 0;
    pagamentoOk = { cobrar: jest.fn().mockImplementation(async () => ({ id: `cob-${++n}` })) };
  });

  test('cria pedido pago quando o serviço de pagamento responde', async () => {
    const app = criarAppPedidos({ servicoPagamento: pagamentoOk });

    const res = await request(app).post('/pedidos').send({ valor: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ valor: 100, status: 'pago' });
    expect(pagamentoOk.cobrar).toHaveBeenCalledTimes(1);
    expect(pagamentoOk.cobrar).toHaveBeenCalledWith({ valor: 100 });
  });

  test('retorna 502 quando o serviço de pagamento está fora do ar', async () => {
    const pagamentoFora = { cobrar: jest.fn().mockRejectedValue(new Error('timeout')) };
    const app = criarAppPedidos({ servicoPagamento: pagamentoFora });

    const res = await request(app).post('/pedidos').send({ valor: 100 });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ erro: 'Pagamento indisponível' });
  });

  test('não grava pedido quando o pagamento falha', async () => {
    const pagamentoFora = { cobrar: jest.fn().mockRejectedValue(new Error('timeout')) };
    const app = criarAppPedidos({ servicoPagamento: pagamentoFora });

    await request(app).post('/pedidos').send({ valor: 100 });
    const lista = await request(app).get('/pedidos');

    expect(lista.body).toEqual([]);
  });

  test.each([
    ['valor ausente', {}],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -10 }],
    ['valor em texto', { valor: '100' }],
  ])('rejeita %s com 400 e NÃO chama o pagamento', async (_d, payload) => {
    const app = criarAppPedidos({ servicoPagamento: pagamentoOk });

    const res = await request(app).post('/pedidos').send(payload);

    expect(res.status).toBe(400);
    expect(pagamentoOk.cobrar).not.toHaveBeenCalled();
  });

  describe('idempotência', () => {
    test('SEM chave: dois envios criam dois pedidos (o risco da cobrança dupla)', async () => {
      const app = criarAppPedidos({ servicoPagamento: pagamentoOk });

      await request(app).post('/pedidos').send({ valor: 100 });
      await request(app).post('/pedidos').send({ valor: 100 });

      expect(pagamentoOk.cobrar).toHaveBeenCalledTimes(2);
    });

    test('COM a mesma Idempotency-Key: um só pedido e uma só cobrança', async () => {
      const app = criarAppPedidos({ servicoPagamento: pagamentoOk });
      const headers = { 'Idempotency-Key': 'pedido-abc-123' };

      const r1 = await request(app).post('/pedidos').set(headers).send({ valor: 100 });
      const r2 = await request(app).post('/pedidos').set(headers).send({ valor: 100 });
      const lista = await request(app).get('/pedidos');

      expect(r1.status).toBe(201);
      expect(r2.status).toBe(200);
      expect(r2.body.id).toBe(r1.body.id);
      expect(lista.body).toHaveLength(1);
      expect(pagamentoOk.cobrar).toHaveBeenCalledTimes(1);
    });
  });
});
