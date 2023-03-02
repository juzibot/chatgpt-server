import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatGptApiSession, MessageStore } from 'src/entities/chatgpt-api-session';
import { MongoRepository } from 'typeorm';

@Injectable()
export class ChatgptApiSessionService {
  @InjectRepository(ChatGptApiSession)
  private repository: MongoRepository<ChatGptApiSession>

  async updateSession (sessionId: string, messages: MessageStore[]) {
    const result = await this.repository.findOneAndUpdate({
      sessionId,
    }, {
      $set: {
        messages,
        createDate: new Date(),
      },
    }, { upsert: true, returnOriginal: false });
    return result.value
  }

  async getSession (sessionId: string) {
    const result = await this.repository.findOneBy({
      sessionId,
    });
    return result
  }
}
