const express = require('express');

/**
 * Fábrica do app. Cada chamada cria uma instância NOVA, com memória própria.
 * É isso que garante o isolamento entre testes (cada beforeEach recria o app).
 * Importante: este arquivo NÃO chama listen(). Quem sobe o servidor é o server.js.
 */
function criarApp() {
  const app = express();
  app.use(express.json());

  let tarefas = [];
  let proximoId = 1;

  // Criar tarefa
  app.post('/tarefas', (req, res) => {
    const { titulo } = req.body ?? {};
    if (typeof titulo !== 'string' || titulo.trim() === '') {
      return res.status(400).json({ erro: 'titulo é obrigatório' });
    }
    const tarefa = { id: proximoId++, titulo: titulo.trim(), concluida: false };
    tarefas.push(tarefa);
    return res.status(201).json(tarefa);
  });

  // Buscar uma tarefa
  app.get('/tarefas/:id', (req, res) => {
    const tarefa = tarefas.find((t) => t.id === Number(req.params.id));
    if (!tarefa) {
      return res.status(404).json({ erro: 'tarefa não encontrada' });
    }
    return res.status(200).json(tarefa);
  });

  // Listar tarefas
  app.get('/tarefas', (req, res) => {
    return res.status(200).json(tarefas);
  });

  // DESAFIO EXTRA: remover tarefa (idempotente: apagar de novo continua dando 204)
  app.delete('/tarefas/:id', (req, res) => {
    const id = Number(req.params.id);
    tarefas = tarefas.filter((t) => t.id !== id);
    return res.status(204).send();
  });

  // JSON malformado no corpo -> 400 em vez de 500
  // (Express 5 repassa o erro do body-parser para este handler)
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON inválido' });
    }
    return res.status(500).json({ erro: 'erro interno' });
  });

  return app;
}

module.exports = { criarApp };
