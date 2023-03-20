import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatgptAccount } from 'src/entities';
import { NotificationModule } from 'src/notification/notification.module';
import { AccountService } from './account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatgptAccount,
    ]),
    NotificationModule,
  ],
  providers: [
    AccountService,
  ],
  exports: [
    AccountService,
  ],
})
export class AccountModule {};
