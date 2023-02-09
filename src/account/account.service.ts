import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountStatus, ChatgptAccount } from 'src/entities';
import { Repository } from 'typeorm';

@Injectable()
export class AccountService {
  @InjectRepository(ChatgptAccount)
  private repository: Repository<ChatgptAccount>

  async createAccount (
    email: string,
    password: string,
  ) {
    const existingAccount = await this.repository.findOneBy({ email });
    if (existingAccount) {
      return existingAccount;
    }

    const account = this.repository.create();
    account.email = email;
    account.password = password;
    account.status = AccountStatus.DOWN;
    await this.repository.save(account);
  }

  async deleteAccount (
    email: string,
  ) {
    await this.repository.delete({ email });
  }

  async getAllAccounts () {
    const accounts = await this.repository.find();
    return accounts;
  }

  async updateAccountPassword (email: string, password: string) {
    await this.repository.update({
      email
    }, {
      password
    });
  }

  async getOneRunningAccount () {
    const account = await this.repository.find({
      where: {
        status: AccountStatus.RUNNING,
      },
      select: {
        email: true,
      },
    });
    if (!account) {
      throw new Error(`can not get active chatgpt`);
    }
    const email = account[Math.floor(Math.random() * account.length)]?.email;
    return email;
  }

  async updateAccountStatus (email: string, status: AccountStatus, errMsg?: string) {
    const updateData: Partial<ChatgptAccount> = {
      status,
    }
    if (status === AccountStatus.ERROR || status === AccountStatus.FREQUENT) {
      updateData.errorTimestamp = Date.now();
      updateData.errorMsg = errMsg;
    };
    await this.repository.update({
      email
    }, updateData);
  }

  async getChatGPTAccount (email: string) {
    return this.repository.findOne({
      where: { email },
      select: {
        email: true,
        password: true,
        status: true,
      },
    });
  }

  async getDownAccounts () {
    const accounts = await this.repository.find({
      where: { status: AccountStatus.DOWN },
      select: {
        email: true,
      },
    });
    return accounts;
  }

  async getAllRunningAccounts () {
    const accounts = await this.repository.find()
    return accounts.filter(a => a.status !== AccountStatus.DOWN);
  }
}
