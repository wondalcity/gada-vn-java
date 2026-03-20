import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [JobsController],
  providers: [JobsService, JobsRepository],
  exports: [JobsService],
})
export class JobsModule {}
