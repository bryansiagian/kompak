#!/usr/bin/env node
// No dependencies. Never prints credentials.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function parseEnv(input) {
  const env = {};
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

export function validateProductionEnv(env) {
  const problems = [];
  const required = ['APP_DOMAIN', 'ACME_EMAIL', 'POSTGRES_USER', 'POSTGRES_DB',
    'POSTGRES_PASSWORD', 'DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
    'EMAIL_CODE_SECRET', 'SMTP_URL', 'MAIL_FROM'];
  for (const key of required) {
    if (!env[key]) problems.push(`${key} is missing`);
    else if (/REPLACE|CHANGE_ME|example\.com|ganti-ini/i.test(env[key]) &&
      !['APP_DOMAIN', 'MAIL_FROM'].includes(key)) problems.push(`${key} contains a placeholder`);
  }

  const hostname = env.APP_DOMAIN ?? '';
  if (!/^(?=.{4,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/i.test(hostname) ||
      hostname === 'localhost' || hostname.endsWith('.example.com') || !hostname.includes('.')) {
    problems.push('APP_DOMAIN must be a real public hostname (not localhost or example.com)');
  }
  if (env.ACME_EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.ACME_EMAIL)) problems.push('ACME_EMAIL must be a valid email');

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'EMAIL_CODE_SECRET']) {
    if (env[key] && env[key].length < 32) problems.push(`${key} must be at least 32 characters`);
  }
  const secrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'EMAIL_CODE_SECRET'].map(k => env[k]).filter(Boolean);
  if (new Set(secrets).size !== secrets.length) problems.push('Authentication secrets must be distinct');
  if (env.POSTGRES_PASSWORD && env.POSTGRES_PASSWORD.length < 20) problems.push('POSTGRES_PASSWORD must be at least 20 characters');

  try {
    const url = new URL(env.DATABASE_URL);
    if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw Error('invalid protocol');
    if (url.hostname !== 'db') problems.push('DATABASE_URL must use internal hostname db');
    if (decodeURIComponent(url.username) !== env.POSTGRES_USER || decodeURIComponent(url.password) !== env.POSTGRES_PASSWORD || url.pathname.slice(1) !== env.POSTGRES_DB) {
      problems.push('DATABASE_URL credentials/database do not match POSTGRES_*');
    }
  } catch { problems.push('DATABASE_URL is invalid'); }

  if (env.CORS_ORIGIN && env.CORS_ORIGIN !== `https://${hostname}`) problems.push('CORS_ORIGIN must match https://APP_DOMAIN');
  if (env.COOKIE_DOMAIN) problems.push('COOKIE_DOMAIN must be empty for same-origin deployment');
  try {
    const smtp = new URL(env.SMTP_URL);
    if (!['smtp:', 'smtps:'].includes(smtp.protocol)) problems.push('SMTP_URL must be smtp:// or smtps://');
    if (smtp.hostname === 'mailpit' || smtp.hostname === 'localhost' || smtp.hostname.endsWith('.example.com')) problems.push('SMTP_URL must point to a real email provider');
  } catch { problems.push('SMTP_URL is invalid'); }
  if (env.AI_API_KEY && !env.AI_MODEL) problems.push('AI_MODEL required when AI_API_KEY is set');
  if (env.AI_MODEL && !env.AI_API_KEY) problems.push('AI_API_KEY required when AI_MODEL is set');
  const budget = Number(env.AI_DAILY_BUDGET ?? 12);
  if (!Number.isInteger(budget) || budget < 1 || budget > 100) problems.push('AI_DAILY_BUDGET must be between 1 and 100');
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? '.env.production';
  try {
    const issues = validateProductionEnv(parseEnv(readFileSync(file, 'utf8')));
    if (issues.length) {
      console.error(`Production environment check failed (${issues.length}):`);
      for (const issue of issues) console.error(`- ${issue}`);
      process.exitCode = 1;
    } else {
      console.log('Production environment: configuration checks passed (DNS, SMTP connectivity and application behavior still need live verification).');
    }
  } catch (error) {
    console.error(`Unable to read ${file}: ${error.message}`);
    process.exitCode = 1;
  }
}
