import { Module } from '@nestjs/common';
import { ChatgptService } from './chatgpt.service';
import { ChatgptController } from './chatgpt.controller';
import { ChatgptPoolService } from './chatgpt-pool/chatgpt-pool.service';
import { AccountModule } from 'src/account/account.module';
import { SessionModule } from 'src/session/session.module';
import { ExecQueueModule } from 'src/exec-queue/exec-queue.module';
import OfficialChatGPTService from './chatgpt-pool/official-chatgpt.service';
import { ChatgptApiSessionModule } from 'src/chatgpt-api-session/chatgpt-api-session.module';
import { OpenAIGatewayService } from './chatgpt-pool/openai-gateway.service';

@Module({
  imports: [
    AccountModule,
    SessionModule,
    ExecQueueModule,
    ChatgptApiSessionModule,
  ],
  providers: [
    ChatgptService,
    ChatgptPoolService,
    OfficialChatGPTService,
    OpenAIGatewayService,
  ],
  controllers: [
    ChatgptController,
  ],
})
export class ChatgptModule {};
