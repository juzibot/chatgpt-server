import { Test, TestingModule } from '@nestjs/testing';
import { ChatgptApiSessionService } from './chatgpt-api-session.service';

describe('ChatgptApiSessionService', () => {
  let service: ChatgptApiSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatgptApiSessionService],
    }).compile();

    service = module.get<ChatgptApiSessionService>(ChatgptApiSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
