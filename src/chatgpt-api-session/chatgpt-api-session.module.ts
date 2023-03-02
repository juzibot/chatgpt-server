import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGptApiSession } from 'src/entities/chatgpt-api-session';
import { ChatgptApiSessionService } from './chatgpt-api-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatGptApiSession,
    ]),
  ],
  providers: [ChatgptApiSessionService],
  exports: [ChatgptApiSessionService],
})
export class ChatgptApiSessionModule {}
