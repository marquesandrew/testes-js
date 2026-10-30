const request = require('supertest');
const { criarApp } = require('../../src/app');

describe('API de tarefas', () => {
  let app;

  // Passo 6: estado limpo a cada teste. Nenhum teste enxerga dados de outro.
  beforeEach(() => {
    app = criarApp();
  });

  describe('POST /tarefas', () => {
    // Passo 3: POST válido
    test('cria uma tarefa válida e retorna 201', async () => {
      // Arrange
      const payload = { titulo: 'Estudar Supertest' };

      // Act
      const res = await request(app).post('/tarefas').send(payload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ titulo: 'Estudar Supertest', concluida: false });
      expect(res.body.id).toEqual(expect.any(Number));
    });

    test('remove espaços das pontas do título', async () => {
      const res = await request(app).post('/tarefas').send({ titulo: '  Revisar PR  ' });

      expect(res.status).toBe(201);
      expect(res.body.titulo).toBe('Revisar PR');
    });

    // Passo 4: payload inválido (equivalência: ausente, vazio, só espaços, tipo errado)
    test.each([
      ['sem o campo titulo', {}],
      ['titulo vazio', { titulo: '' }],
      ['titulo só com espaços', { titulo: '   ' }],
      ['titulo numérico', { titulo: 123 }],
      ['titulo nulo', { titulo: null }],
    ])('rejeita payload inválido (%s) com 400', async (_descricao, payload) => {
      const res = await request(app).post('/tarefas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'titulo é obrigatório' });
    });

    test('rejeita requisição sem corpo nenhum com 400', async () => {
      const res = await request(app).post('/tarefas');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'titulo é obrigatório' });
    });

    test('rejeita corpo com JSON malformado com 400 (e não 500)', async () => {
      const res = await request(app)
        .post('/tarefas')
        .set('Content-Type', 'application/json')
        .send('{ "titulo": "quebrado" ');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: 'JSON inválido' });
    });
  });

  describe('GET /tarefas/:id', () => {
    // Passo 5: GET existente
    test('retorna 200 e a tarefa quando o id existe', async () => {
      const criada = await request(app).post('/tarefas').send({ titulo: 'Escrever testes' });

      const res = await request(app).get(`/tarefas/${criada.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(criada.body);
    });

    // Passo 5: GET inexistente
    test('retorna 404 quando o id não existe', async () => {
      const res = await request(app).get('/tarefas/999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'tarefa não encontrada' });
    });
  });

  describe('contrato da resposta', () => {
    // Slide 8: asserir a FORMA, não só os valores
    test('a tarefa criada respeita o contrato (campos e tipos)', async () => {
      const res = await request(app).post('/tarefas').send({ titulo: 'Contrato' });

      expect(res.body).toEqual({
        id: expect.any(Number),
        titulo: expect.any(String),
        concluida: expect.any(Boolean),
      });
    });
  });

  describe('isolamento entre testes', () => {
    // Estes dois testes só passam juntos, em qualquer ordem, se o beforeEach funcionar.
    test('cria uma tarefa (e deixa a lista com 1 item)', async () => {
      await request(app).post('/tarefas').send({ titulo: 'Tarefa do teste A' });

      const lista = await request(app).get('/tarefas');

      expect(lista.body).toHaveLength(1);
    });

    test('começa com a lista vazia, sem enxergar dados do teste anterior', async () => {
      const lista = await request(app).get('/tarefas');

      expect(lista.status).toBe(200);
      expect(lista.body).toEqual([]);
    });

    test('o id volta a 1 em cada app novo', async () => {
      const res = await request(app).post('/tarefas').send({ titulo: 'Primeira' });

      expect(res.body.id).toBe(1);
    });
  });

  // DESAFIO EXTRA: DELETE idempotente
  describe('DELETE /tarefas/:id (idempotente)', () => {
    test('remove a tarefa e ela passa a retornar 404', async () => {
      const criada = await request(app).post('/tarefas').send({ titulo: 'Apagar' });

      const del = await request(app).delete(`/tarefas/${criada.body.id}`);
      const busca = await request(app).get(`/tarefas/${criada.body.id}`);

      expect(del.status).toBe(204);
      expect(busca.status).toBe(404);
    });

    test('apagar duas vezes tem o mesmo efeito: 204 nas duas', async () => {
      const criada = await request(app).post('/tarefas').send({ titulo: 'Apagar 2x' });

      const primeira = await request(app).delete(`/tarefas/${criada.body.id}`);
      const segunda = await request(app).delete(`/tarefas/${criada.body.id}`);

      expect(primeira.status).toBe(204);
      expect(segunda.status).toBe(204);
    });
  });
});
