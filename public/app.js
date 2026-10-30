// Helpers compartilhados pelas páginas
const $ = (id) => document.getElementById(id);

async function enviar(url, corpo, metodo = 'POST') {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch { /* 204 sem corpo */ }
  return { ok: r.ok, status: r.status, corpo: json };
}

// Sucesso -> role="status"; erro -> role="alert" (é isso que getByRole enxerga)
function mostrar(tipo, texto) {
  const el = $('mensagem');
  el.textContent = texto;
  el.className = tipo === 'erro' ? 'erro' : 'ok';
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.hidden = false;
}
