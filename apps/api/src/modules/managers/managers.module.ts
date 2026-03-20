import { Module } from '@nestjs/common';
import { ManagersController } from './managers.controller';
import { ManagersService } from './managers.service';
import { ManagersRepository } from './managers.repository';

@Module({
  controllers: [ManagersController],
  providers: [ManagersService, ManagersRepository],
  exports: [ManagersService],
})
export class ManagersModule {}
