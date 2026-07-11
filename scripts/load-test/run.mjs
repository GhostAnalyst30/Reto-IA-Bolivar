#!/usr/bin/env node
/**
 * Load test — simula tráfico concurrente contra web + API.
 *
 * Uso:
 *   node scripts/load-test/run.mjs
 *   BASE_URL=http://localhost:3000 API_URL=http://localhost:8000 node scripts/load-test/run.mjs
 *
 * Variables:
 *   BASE_URL     — Next.js (default http://localhost:3000)
 *   API_URL      — FastAPI (default http://localhost:8000)
 *   CONCURRENCY  — conexiones simultáneas (default 50)
 *   DURATION_S   — duración en segundos (default 30)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';
const CONCURRENCY = Number(process.env.CONCURRENCY || 50);
const DURATION_S = Number(process.env.DURATION_S || 30);
const WARMUP_S = Number(process.env.WARMUP_S || 15);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 60_000);

const SCENARIOS = [
  { name: 'Landing (/)', weight: 30, url: `${BASE_URL}/` },
  { name: 'Health API', weight: 25, url: `${BASE_URL}/api/health` },
  { name: 'Institutions (cached)', weight: 20, url: `${BASE_URL}/api/institutions` },
  { name: 'Quienes somos', weight: 15, url: `${BASE_URL}/quienes-somos` },
  { name: 'FastAPI health', weight: 10, url: `${API_URL}/health` },
];

function pickScenario() {
  const total = SCENARIOS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SCENARIOS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SCENARIOS[0];
}

async function hit(scenario) {
  const start = performance.now();
  try {
    const res = await fetch(scenario.url, {
      headers: { 'Accept': 'text/html,application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = performance.now() - start;
    return { ok: res.ok, status: res.status, ms, name: scenario.name };
  } catch (err) {
    return { ok: false, status: 0, ms: performance.now() - start, name: scenario.name, error: String(err) };
  }
}

async function worker(stats, endAt) {
  while (Date.now() < endAt) {
    const scenario = pickScenario();
    const result = await hit(scenario);
    stats.total++;
    if (result.ok) stats.ok++;
    else stats.fail++;
    stats.latencies.push(result.ms);
    const bucket = stats.byRoute[result.name] || { ok: 0, fail: 0, latencies: [] };
    if (result.ok) bucket.ok++;
    else bucket.fail++;
    bucket.latencies.push(result.ms);
    stats.byRoute[result.name] = bucket;
  }
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function warmup() {
  console.log(`Warm-up (${WARMUP_S}s) — pre-compilando rutas en dev...`);
  const endAt = Date.now() + WARMUP_S * 1000;
  while (Date.now() < endAt) {
    await Promise.all(SCENARIOS.map((s) => hit(s)));
  }
}

async function main() {
  console.log('=== Load Test — Reto IA Bolívar ===');
  console.log(`Target: ${BASE_URL} + ${API_URL}`);
  console.log(`Concurrency: ${CONCURRENCY} | Duration: ${DURATION_S}s | Warmup: ${WARMUP_S}s\n`);

  await warmup();

  const stats = { total: 0, ok: 0, fail: 0, latencies: [], byRoute: {} };
  const endAt = Date.now() + DURATION_S * 1000;

  const workers = Array.from({ length: CONCURRENCY }, () => worker(stats, endAt));
  await Promise.all(workers);

  const rps = (stats.total / DURATION_S).toFixed(1);
  const p50 = percentile(stats.latencies, 50).toFixed(0);
  const p95 = percentile(stats.latencies, 95).toFixed(0);
  const p99 = percentile(stats.latencies, 99).toFixed(0);
  const errorRate = ((stats.fail / Math.max(stats.total, 1)) * 100).toFixed(2);

  console.log('--- Resumen global ---');
  console.log(`Requests:  ${stats.total}`);
  console.log(`OK:        ${stats.ok} | Fail: ${stats.fail} (${errorRate}% errors)`);
  console.log(`RPS:       ${rps}`);
  console.log(`Latency:   p50=${p50}ms  p95=${p95}ms  p99=${p99}ms`);

  console.log('\n--- Por ruta ---');
  for (const [name, bucket] of Object.entries(stats.byRoute)) {
    const p95r = percentile(bucket.latencies, 95).toFixed(0);
    console.log(`  ${name}: ${bucket.ok + bucket.fail} req | fail=${bucket.fail} | p95=${p95r}ms`);
  }

  if (stats.fail > stats.total * 0.05) {
    console.log('\n⚠ Más del 5% de errores — revisar capacidad o timeouts.');
    process.exit(1);
  }
  console.log('\n✓ Load test completado.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
