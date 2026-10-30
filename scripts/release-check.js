#!/usr/bin/env node
/**
 * RELEASE CHECK — antes de publicar, a versão precisa contar a mesma história em três lugares:
 *   tag do Git  ==  "version" do package.json  ==  seção datada no CHANGELOG.md
 *
 *   node scripts/release-check.js v1.2.0
 *   (no CI usa GITHUB_REF_NAME quando não recebe argumento)
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const tag = process.argv[2] || process.env.GITHUB_REF_NAME || '';
const versaoDaTag = tag.replace(/^v/, '');
const versaoDoPacote = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
const changelog = fs.readFileSync(path.join(RAIZ, 'CHANGELOG.md'), 'utf8');

const erros = [];
if (!/^\d+\.\d+\.\d+$/.test(versaoDaTag)) erros.push(`tag "${tag}" não é uma versão (esperado vX.Y.Z)`);
if (versaoDaTag !== versaoDoPacote) erros.push(`tag (${versaoDaTag}) ≠ package.json (${versaoDoPacote})`);
const secao = new RegExp(`^## \\[${versaoDoPacote.replace(/\./g, '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}`, 'm');
if (!secao.test(changelog)) erros.push(`CHANGELOG.md não tem a seção datada "## [${versaoDoPacote}] - AAAA-MM-DD"`);

if (erros.length) {
  console.error('✖ RELEASE BLOQUEADO');
  erros.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✔ release ${versaoDoPacote} consistente (tag = package.json = CHANGELOG)`);
