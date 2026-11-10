import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController, InvitesController],
  providers: [WorkspacesService, WorkspaceAccessService],
  exports: [WorkspaceAccessService],
})
export class WorkspacesModule {}