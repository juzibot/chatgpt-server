import { Test, TestingModule } from '@nestjs/testing';
import { AccountWeightService } from './account-weight.service';

describe('AccountWeightService', () => {
  let service: AccountWeightService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountWeightService],
    }).compile();

    service = module.get<AccountWeightService>(AccountWeightService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
