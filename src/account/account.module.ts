import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountWeightModule } from 'src/account-weight/account-weight.module';
import { ChatgptAccount } from 'src/entities';
import { NotificationModule } from 'src/notification/notification.module';
import { AccountService } from './account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatgptAccount,
    ]),
    NotificationModule,
    AccountWeightModule,
  ],
  providers: [
    AccountService,
  ],
  exports: [
    AccountService,
  ],
})
export class AccountModule {};
