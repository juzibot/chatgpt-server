import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MINUTE } from 'src/common/time';
import { AccountWeight } from 'src/entities/account-weight';
import { AccountType } from 'src/entities/chatgpt-account';
import { MongoRepository } from 'typeorm';

const CACHE_TTL = 1 * MINUTE;

@Injectable()
export class AccountWeightService {
  @InjectRepository(AccountWeight)
  private repository: MongoRepository<AccountWeight>

  private cache: AccountWeight[] = [];
  private cacheTime = 0;

  async getAccountType (): Promise<AccountType | null> {
    const accountWeights = await this.getAccountWeights();
    return this.getAccountTypeByWeight(accountWeights);
  }

  private async getAccountWeights (): Promise<AccountWeight[]> {
    // Check the data in cache first
    if (this.cache.length > 0 && Date.now() - this.cacheTime < CACHE_TTL) {
      return this.cache;
    }

    const accountWeights = await this.repository.find();
    this.cache = accountWeights;
    this.cacheTime = Date.now();

    return accountWeights;
  }

  private getAccountTypeByWeight (accountWeights: AccountWeight[]): AccountType | null {
    if (accountWeights.length === 0) {
      return null;
    }

    const totalWeight = accountWeights.reduce((acc, cur) => acc + cur.weight, 0);
    const random = Math.random() * totalWeight;
    let sum = 0;
    for (const accountWeight of accountWeights) {
      sum += accountWeight.weight;
      if (random < sum) {
        return accountWeight.type;
      }
    }
  }
}
