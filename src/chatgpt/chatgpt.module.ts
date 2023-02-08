import { Module } from '@nestjs/common';
import { ChatgptService } from './chatgpt.service';
import { ChatgptController } from './chatgpt.controller';
import { ChatgptPoolService } from './chatgpt-pool/chatgpt-pool.service';
import { AccountModule } from 'src/account/account.module';
import { SessionModule } from 'src/session/session.module';
import { ExecQueueModule } from 'src/exec-queue/exec-queue.module';

@Module({
  imports: [
    AccountModule,
    SessionModule,
    ExecQueueModule,
  ],
  providers: [
    ChatgptService,
    ChatgptPoolService,
  ],
  controllers: [
    ChatgptController,
  ],
})
export class ChatgptModule {};
