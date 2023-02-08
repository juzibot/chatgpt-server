import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionInfo } from 'src/entities';
import { SessionService } from './session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionInfo,
    ]),
  ],
  providers: [
    SessionService,
  ],
  exports: [
    SessionService,
  ],
})
export class SessionModule {};
