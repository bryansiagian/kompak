import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProvider } from './ai.provider';

@Module({
  imports: [WorkspacesModule],
  controllers: [AiController],
  providers: [AiService, AiProvider],
})
export class AiModule {}
