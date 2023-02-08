import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatgptAccount } from 'src/entities';
import { AccountService } from './account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatgptAccount,
    ]),
  ],
  providers: [
    AccountService,
  ],
  exports: [
    AccountService,
  ],
})
export class AccountModule {};
