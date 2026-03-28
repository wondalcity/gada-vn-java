import { Module } from '@nestjs/common';
import { ManagersController } from './managers.controller';
import { ManagersService } from './managers.service';
import { ManagersRepository } from './managers.repository';
import { SitesController } from './sites.controller';
import { SitesRepository } from './sites.repository';
import { ManagerJobsController } from './manager-jobs.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [ApplicationsModule, AttendanceModule],
  controllers: [ManagersController, SitesController, ManagerJobsController],
  providers: [ManagersService, ManagersRepository, SitesRepository],
  exports: [ManagersService],
})
export class ManagersModule {}
