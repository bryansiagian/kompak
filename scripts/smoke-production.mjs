#!/usr/bin/env node
// Smoke checks for a LIVE deployed domain. No credentials are needed.
const domain = process.argv[2];
if (!domain || !/^https:\/\/[^/]+$/.test(domain)) {
  console.error('Usage: node scripts/smoke-production.mjs https://kompak.yourdomain.id');
  process.exit(2);
}

const urls = [
  { path: '/', expected: 'html' },
  { path: '/login', expected: 'html' },
  { path: '/health', expected: 'json' },
];
let failures = 0;
for (const entry of urls) {
  try {
    const response = await fetch(domain + entry.path, { signal: AbortSignal.timeout(10000), redirect: 'follow' });
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    const validType = contentType.includes(entry.expected === 'html' ? 'text/html' : 'application/json');
    const validHealth = entry.path !== '/health' || (() => { try { return JSON.parse(body).status === 'ok'; } catch { return false; } })();
    const passed = response.ok && validType && validHealth;
    console.log(`${passed ? 'PASS' : 'FAIL'} ${entry.path} HTTP ${response.status} (${contentType})`);
    if (!passed) failures++;
  } catch (error) {
    failures++;
    console.error(`FAIL ${entry.path}: ${error.message}`);
  }
}
process.exitCode = failures ? 1 : 0;
