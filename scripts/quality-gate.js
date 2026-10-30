#!/usr/bin/env node
/**
 * QUALITY GATE — decide, com números, se a mudança pode seguir.
 *
 *   node scripts/quality-gate.js                         # avalia (usado no CI)
 *   node scripts/quality-gate.js --atualizar-baseline    # sobe o piso de cobertura (só aceita subir)
 *   node scripts/quality-gate.js --atualizar-baseline --forcar   # permite baixar (decisão consciente, vai no PR)
 *
 * Três gates:
 *   1. COBERTURA MÍNIMA  (quality/politica.json)         piso absoluto
 *   2. RATCHET           (quality/baseline.json)          cobertura nunca pode cair em relação ao último estado aprovado
 *   3. HIGIENE DE TESTES                                  .only / .skip / xit esquecidos escondem ou isolam testes
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const lerJson = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
const METRICAS = ['statements', 'branches', 'functions', 'lines'];
const args = new Set(process.argv.slice(2));

function lerCobertura() {
  const arquivo = path.join(RAIZ, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(arquivo)) {
    console.error('✖ coverage/coverage-summary.json não existe. Rode antes: npm run test:coverage');
    process.exit(2);
  }
  const total = JSON.parse(fs.readFileSync(arquivo, 'utf8')).total;
  return Object.fromEntries(METRICAS.map((m) => [m, total[m].pct]));
}

function arquivosDeTeste(pastas) {
  const achados = [];
  const visitar = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visitar(p);
      else if (/\.(js|feature)$/.test(e.name)) achados.push(p);
    }
  };
  pastas.forEach((p) => visitar(path.join(RAIZ, p)));
  return achados;
}

function acharViolacoesDeHigiene(politica) {
  const padroes = politica.bloquear.map((p) => new RegExp(p));
  const violacoes = [];
  for (const arq of arquivosDeTeste(politica.pastas)) {
    fs.readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
      if (linha.includes(politica.excecao)) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(linha)) return; // comentário
      if (padroes.some((re) => re.test(linha))) {
        violacoes.push(`${path.relative(RAIZ, arq)}:${i + 1}  ${linha.trim()}`);
      }
    });
  }
  return violacoes;
}

function atualizarBaseline(atual) {
  const arq = path.join(RAIZ, 'quality', 'baseline.json');
  const antigo = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : null;
  if (antigo && !args.has('--forcar')) {
    const caiu = METRICAS.filter((m) => atual[m] < antigo[m]);
    if (caiu.length) {
      console.error(`✖ Recusado: a cobertura (${caiu.join(', ')}) está abaixo do baseline. Use --forcar se for decisão consciente.`);
      process.exit(1);
    }
  }
  fs.writeFileSync(arq, JSON.stringify(atual, null, 2) + '\n');
  console.log('✔ baseline atualizado:', atual);
}

// ---------- execução ----------
const politica = lerJson('quality/politica.json');
const atual = lerCobertura();

if (args.has('--atualizar-baseline')) {
  atualizarBaseline(atual);
  process.exit(0);
}

const baseline = fs.existsSync(path.join(RAIZ, 'quality', 'baseline.json')) ? lerJson('quality/baseline.json') : null;
const tol = politica.cobertura.tolerancia_queda_pontos;
const linhas = [];
let reprovado = false;

for (const m of METRICAS) {
  const minimo = politica.cobertura.minimos[m];
  const base = baseline ? baseline[m] : null;
  const okMinimo = atual[m] >= minimo;
  const okRatchet = base === null || atual[m] >= base - tol;
  if (!okMinimo || !okRatchet) reprovado = true;
  linhas.push({ m, atual: atual[m], minimo, base, okMinimo, okRatchet });
}

const violacoes = acharViolacoesDeHigiene(politica.higiene);
if (violacoes.length) reprovado = true;

const fmt = (n) => (n === null ? '   —  ' : n.toFixed(2).padStart(6));
const out = [];
out.push('QUALITY GATE');
out.push('métrica       atual   mínimo  baseline  >=mín  ratchet');
for (const l of linhas) {
  out.push(`${l.m.padEnd(11)}  ${fmt(l.atual)}  ${fmt(l.minimo)}  ${fmt(l.base)}    ${l.okMinimo ? ' ✔ ' : ' ✖ '}   ${l.okRatchet ? ' ✔ ' : ' ✖ '}`);
}
out.push(violacoes.length ? `higiene      ✖ ${violacoes.length} violação(ões):` : 'higiene      ✔ nenhum .only / .skip / xit');
violacoes.forEach((v) => out.push('             - ' + v));
out.push(reprovado ? '\nRESULTADO: ✖ REPROVADO — merge bloqueado' : '\nRESULTADO: ✔ APROVADO');
console.log(out.join('\n'));

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n');
}
process.exit(reprovado ? 1 : 0);
