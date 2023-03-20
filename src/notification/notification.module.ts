import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationModel } from 'src/entities/notification'
import { NotificationService } from './notification.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationModel]),
  ],
  providers: [
    NotificationService,
  ],
  exports: [
    NotificationService,
  ],
})
export class NotificationModule {}
