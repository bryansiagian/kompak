import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [ListsController],
  providers: [ListsService],
})
export class ListsModule {}