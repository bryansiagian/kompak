import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}