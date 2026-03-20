import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService],
})
export class AttendanceModule {}
