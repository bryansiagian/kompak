import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  imports: [WorkspacesModule, ActivityModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}