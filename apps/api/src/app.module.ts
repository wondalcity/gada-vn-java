import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { FirebaseModule } from './common/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkersModule } from './modules/workers/workers.module';
import { ManagersModule } from './modules/managers/managers.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.local' }),
    DatabaseModule,
    FirebaseModule,
    AuthModule,
    WorkersModule,
    ManagersModule,
    JobsModule,
    ApplicationsModule,
    ContractsModule,
    AttendanceModule,
    NotificationsModule,
    FilesModule,
  ],
})
export class AppModule {}
