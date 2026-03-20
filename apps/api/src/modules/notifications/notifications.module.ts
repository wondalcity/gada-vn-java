import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { FirebaseModule } from '../../common/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
