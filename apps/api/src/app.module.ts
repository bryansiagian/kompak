import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BoardsModule } from './modules/boards/boards.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // .env ada di root monorepo; di Docker variabel datang dari env_file.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    BoardsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}