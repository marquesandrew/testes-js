/**
 * Test doubles reaproveitados pelo Jest (tests/) e pelo Cucumber (features/).
 */

// Relógio falso: o teste controla o tempo, sem esperar 15 minutos de verdade (Slide 3)
function criarRelogioFalso(inicio = Date.UTC(2026, 9, 15, 10, 0, 0)) {
  let agora = inicio;
  return {
    agora: () => agora,
    avancar: ({ minutos = 0, segundos = 0 }) => {
      agora += (minutos * 60 + segundos) * 1000;
    },
  };
}

// Serviço de e-mail falso (fake): guarda os e-mails "enviados" numa caixa de saída
function criarEmailFalso() {
  const enviados = [];
  return {
    enviados,
    enviar: async (mensagem) => {
      enviados.push(mensagem);
    },
    ultimoTokenPara: (email) => {
      const msgs = enviados.filter((m) => m.para === email);
      return msgs.length ? msgs[msgs.length - 1].token : undefined;
    },
  };
}

const USUARIOS_PADRAO = [{ email: 'ana@exemplo.com', senha: 'senhaAntiga123' }];

module.exports = { criarRelogioFalso, criarEmailFalso, USUARIOS_PADRAO };
