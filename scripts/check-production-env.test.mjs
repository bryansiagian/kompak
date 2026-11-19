import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, validateProductionEnv } from './check-production-env.mjs';

const valid = {
  APP_DOMAIN: 'kompak.acme.test', ACME_EMAIL: 'owner@acme.test',
  POSTGRES_USER: 'kompak', POSTGRES_DB: 'kompak', POSTGRES_PASSWORD: 'x'.repeat(24),
  DATABASE_URL: `postgresql://kompak:${'x'.repeat(24)}@db:5432/kompak`,
  JWT_ACCESS_SECRET: 'a'.repeat(48), JWT_REFRESH_SECRET: 'b'.repeat(48),
  EMAIL_CODE_SECRET: 'c'.repeat(48),
  CORS_ORIGIN: 'https://kompak.acme.test', COOKIE_DOMAIN: '',
  SMTP_URL: 'smtps://user:password@mail.acme.test:465',
  MAIL_FROM: 'Kompak <no-reply@acme.test>', AI_DAILY_BUDGET: '12',
};

test('reads quotes, comments, and equal signs', () => {
  assert.deepEqual(parseEnv('A="hello world"\n# comment\nB=one=two\n'), { A: 'hello world', B: 'one=two' });
});

test('accepts internally consistent production configuration', () => {
  assert.deepEqual(validateProductionEnv(valid), []);
});

test('rejects placeholders, weak secrets, and exposed localhost database', () => {
  const issues = validateProductionEnv({ ...valid, APP_DOMAIN: 'kompak.example.com', JWT_ACCESS_SECRET: 'weak', DATABASE_URL: 'postgresql://kompak:pass@localhost:5432/kompak' });
  assert.ok(issues.some(issue => issue.includes('APP_DOMAIN')));
  assert.ok(issues.some(issue => issue.includes('JWT_ACCESS_SECRET')));
  assert.ok(issues.some(issue => issue.includes('DATABASE_URL')));
});

test('checks optional AI credentials are paired', () => {
  assert.ok(validateProductionEnv({ ...valid, AI_API_KEY: 'foo' }).some(x => x.includes('AI_MODEL')));
});
