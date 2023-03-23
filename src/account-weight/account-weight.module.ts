import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountWeight } from 'src/entities/account-weight';
import { AccountWeightService } from './account-weight.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountWeight,
    ]),
  ],
  providers: [AccountWeightService],
  exports: [AccountWeightService],
})
export class AccountWeightModule {}
