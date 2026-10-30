const express = require('express');

/**
 * BÔNUS (Slides 7 e 9): app de pedidos com DEPENDÊNCIA EXTERNA injetada
 * (serviço de pagamento) e IDEMPOTÊNCIA via cabeçalho Idempotency-Key.
 *
 * O serviço de pagamento é recebido por parâmetro. Em produção seria o cliente
 * HTTP real; nos testes, um fake que simula sucesso, lentidão ou falha.
 */
function criarAppPedidos({ servicoPagamento }) {
  const app = express();
  app.use(express.json());

  let pedidos = [];
  let proximoId = 1;
  const chavesProcessadas = new Map(); // Idempotency-Key -> pedido já criado

  app.post('/pedidos', async (req, res) => {
    const { valor } = req.body ?? {};
    if (typeof valor !== 'number' || valor <= 0) {
      return res.status(400).json({ erro: 'valor deve ser um número positivo' });
    }

    const chave = req.get('Idempotency-Key');
    if (chave && chavesProcessadas.has(chave)) {
      // Mesma chave = mesma intenção: devolve o pedido original, sem cobrar de novo
      return res.status(200).json(chavesProcessadas.get(chave));
    }

    try {
      const cobranca = await servicoPagamento.cobrar({ valor });
      const pedido = { id: proximoId++, valor, status: 'pago', cobrancaId: cobranca.id };
      pedidos.push(pedido);
      if (chave) chavesProcessadas.set(chave, pedido);
      return res.status(201).json(pedido);
    } catch {
      return res.status(502).json({ erro: 'Pagamento indisponível' });
    }
  });

  app.get('/pedidos', (req, res) => res.status(200).json(pedidos));

  return app;
}

module.exports = { criarAppPedidos };
