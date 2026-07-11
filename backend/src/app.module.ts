import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { AssetsModule } from './modules/assets/assets.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { LendingModule } from './modules/lending/lending.module';
import { LostFoundModule } from './modules/lostfound/lostfound.module';
import { StudyModule } from './modules/study/study.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'campusloop',
      password: process.env.DB_PASSWORD || 'campusloop_secret',
      database: process.env.DB_NAME || 'campusloop',
      ssl: {
  rejectUnauthorized: false,
},
      autoLoadEntities: true,
      synchronize: false,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
      
    }),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    AssetsModule,
    BookingsModule,
    LendingModule,
    LostFoundModule,
    StudyModule,
    AnalyticsModule,
    AiModule,
    NotificationsModule,
  ],
})
export class AppModule {}
