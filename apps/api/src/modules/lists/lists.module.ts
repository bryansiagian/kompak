import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [WorkspacesModule, ActivityModule],
  controllers: [ListsController],
  providers: [ListsService],
})
export class ListsModule {}