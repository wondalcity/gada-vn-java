import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationsRepository } from './applications.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsRepository],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
