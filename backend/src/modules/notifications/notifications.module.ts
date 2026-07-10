import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification]), JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
