#!/usr/bin/env node
/**
 * scripts/lib/osv-query.js — Consulta OSV.dev (https://osv.dev) para o devsecops-audit --online (v2.7.0)
 *
 * Entrada (stdin): JSON { packages: [{ name, version }] }
 * Saída  (stdout): JSON { results: [{ name, version, vulns: [{ id, aliases, summary, severity }] }] }
 *                  ou   { error: "mensagem" } quando não houver rede / timeout.
 *
 * Privacidade: envia SOMENTE nome e versão dos pacotes npm. Nenhum código-fonte sai da máquina.
 * Requer Node.js 18+ (fetch nativo).
 */

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_VULN_URL = 'https://api.osv.dev/v1/vulns/';
const TIMEOUT_MS = 5000;
const MAX_DETAILS = 40;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

function normalizeSeverity(vuln) {
  const dbSev = vuln && vuln.database_specific && vuln.database_specific.severity;
  const s = String(dbSev || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH' || s === 'LOW') return s;
  if (s === 'MODERATE' || s === 'MEDIUM') return 'MEDIUM';
  return 'MEDIUM';
}

async function main() {
  if (typeof fetch !== 'function') {
    process.stdout.write(JSON.stringify({ error: 'fetch indisponível (requer Node.js 18+)' }));
    return;
  }
  let input;
  try { input = JSON.parse(await readStdin()); } catch { input = { packages: [] }; }
  const packages = (input.packages || []).slice(0, 1000);
  if (packages.length === 0) {
    process.stdout.write(JSON.stringify({ results: [] }));
    return;
  }

  try {
    const res = await fetch(OSV_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: packages.map((p) => ({ package: { name: p.name, ecosystem: 'npm' }, version: p.version }))
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) throw new Error(`OSV HTTP ${res.status}`);
    const batch = await res.json();

    const hits = [];
    (batch.results || []).forEach((r, i) => {
      const ids = (r.vulns || []).map((v) => v.id);
      if (ids.length > 0) hits.push({ name: packages[i].name, version: packages[i].version, ids });
    });

    // Detalhes (resumo + severidade) para as primeiras vulnerabilidades
    const uniqueIds = Array.from(new Set(hits.flatMap((h) => h.ids))).slice(0, MAX_DETAILS);
    const details = new Map();
    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const d = await fetch(OSV_VULN_URL + encodeURIComponent(id), { signal: AbortSignal.timeout(TIMEOUT_MS) });
          if (d.ok) details.set(id, await d.json());
        } catch {
          // Ignora detalhes que falharem; o ID continua sendo reportado
        }
      })
    );

    const results = hits.map((h) => ({
      name: h.name,
      version: h.version,
      vulns: h.ids.map((id) => {
        const d = details.get(id) || {};
        return {
          id,
          aliases: d.aliases || [],
          summary: d.summary || '',
          severity: normalizeSeverity(d)
        };
      })
    }));
    process.stdout.write(JSON.stringify({ results }));
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
  }
}

main();
