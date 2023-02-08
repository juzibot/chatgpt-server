import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionInfo } from 'src/entities';
import { Repository } from 'typeorm';

@Injectable()
export class SessionService {
  @InjectRepository(SessionInfo)
  private repository: Repository<SessionInfo>

  async getOrInitSession (sessionId: string) {
    const session = await this.repository.findOneBy({ sessionId });
    if (session) {
      return session;
    }

    const model = this.repository.create();
    model.sessionId = sessionId;
    return this.repository.save(model);
  }

  async updateSession (sessionId: string, values: Partial<SessionInfo>) {
    await this.repository.update({
      sessionId,
    }, values);
  }
}
