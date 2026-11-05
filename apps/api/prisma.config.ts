import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// .env berada di root monorepo; perintah Prisma dijalankan dari apps/api.
config({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` tidak butuh koneksi, jadi di CI dan Docker
    // build boleh memakai nilai bawaan ini.
    url:
      process.env.DATABASE_URL ??
      'postgresql://kompak:kompak@localhost:5432/kompak',
  },
});