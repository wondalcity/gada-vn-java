import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsRepository } from './contracts.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsRepository],
  exports: [ContractsService],
})
export class ContractsModule {}
