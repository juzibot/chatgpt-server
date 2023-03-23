import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountStatus, AccountType, ChatgptAccount } from 'src/entities';
import { AlarmType } from 'src/notification/notification.interface';
import { NotificationService } from 'src/notification/notification.service';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { AccountWeightService } from 'src/account-weight/account-weight.service';

const UNAVAILABLE_STATUS = [
  AccountStatus.ERROR,
  AccountStatus.FREQUENT,
  AccountStatus.BANNED,
  AccountStatus.NO_CREDITS,
]

const ALARM_THRESHOLD = 0.5;

@Injectable()
export class AccountService {
  @InjectRepository(ChatgptAccount)
  private repository: MongoRepository<ChatgptAccount>

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly accountWeightService: AccountWeightService;

  async createAccount (
    apiKey: string,
    email?: string,
    password?: string,
    type = AccountType.OPEN_AI,
    resourceName?: string,
    deploymentId?: string,
  ) {
    const existingAccount = await this.repository.findOneBy({ email });
    if (existingAccount) {
      return existingAccount;
    }

    const account = this.repository.create();
    account.email = email;
    account.password = password;
    account.type = type;
    account.apiKey = apiKey;
    account.status = apiKey ? AccountStatus.RUNNING : AccountStatus.DOWN;
    account.resourceName = resourceName;
    account.deploymentId = deploymentId;
    await this.repository.save(account);

    void this.checkAllAccountStatus();
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
    const result = await this.repository.findOneAndUpdate({
      email
    }, {
      $set: { password },
    });
    return result.value as ChatgptAccount | undefined;
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

  async getValidAccount () {
    const accountType = await this.accountWeightService.getAccountType();
    const matchQuery: Partial<ChatgptAccount> = { status: AccountStatus.RUNNING };
    if (accountType) {
      matchQuery.type = accountType;
    }

    const docs = await this.repository.aggregate<ChatgptAccount>([{
      $match: matchQuery,
    }, {
      $sample: { size: 10 },
    }]).toArray();
    if (!docs.length) {
      return null;
    }
    const account = docs[Math.floor(Math.random() * docs.length)];
    return account;
  }

  async updateAccountStatusByEmail (email: string, status: AccountStatus, errMsg?: string) {
    const updateData: Partial<ChatgptAccount> = {
      status,
    }
    if (UNAVAILABLE_STATUS.includes(status)) {
      updateData.errorTimestamp = Date.now();
      updateData.errorTime = new Date();
      updateData.errorMsg = errMsg;
    };
    await this.repository.update({
      email
    }, updateData);
    void this.checkAllAccountStatus();
  }

  async updateAccountStatus (accountId: string, status: AccountStatus, errMsg?: string) {
    const updateData: Partial<ChatgptAccount> = {
      status,
    }
    if (UNAVAILABLE_STATUS.includes(status)) {
      updateData.errorTimestamp = Date.now();
      updateData.errorTime = new Date();
      updateData.errorMsg = errMsg;
    };
    await this.repository.update({
      _id: new ObjectId(accountId),
    }, updateData);
    void this.checkAllAccountStatus();
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

  async getActiveApiKey (): Promise<string | null> {
    const docs = await this.repository.find({
      where: {
        status: AccountStatus.RUNNING,
        apiKey: { $exists: true },
      },
      select: { apiKey: true },
    });
    if (!docs.length) {
      return null;
    }
    const account = docs[Math.floor(Math.random() * docs.length)];
    return account?.apiKey || null;
  }

  // Check all account status, if the available ratio is low, send alarm.
  private async checkAllAccountStatus() {
    const accounts = await this.repository.aggregate<{
      _id: AccountStatus,
      count: number,
    }>([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    const total = accounts.reduce((acc, cur) => acc + cur.count, 0);
    const available = accounts.find(a => a._id === AccountStatus.RUNNING)?.count || 0;
    const ratio = available / total;
    if (available === 0) {
      await this.notificationService.sendSimpleAlarm(
        `ChatGPT 账号全部不可用`,
        `ChatGPT总账号数：${total}，可用账号数：${available}，可用比例：${(ratio * 100).toFixed(2)}%`,
        'chatgpt-account-all-down',
        'red',
        AlarmType.ACCOUNT_ALL_DOWN,
      );
    } else if (ratio < ALARM_THRESHOLD) {
      await this.notificationService.sendSimpleAlarm(
        `ChatGPT 账号可用率低于${ALARM_THRESHOLD * 100}%`,
        `ChatGPT总账号数：${total}，可用账号数：${available}，可用比例：${(ratio * 100).toFixed(2)}%`,
        'chatgpt-account-available-ratio',
        undefined,
        AlarmType.ACCOUNT_LOW_PERCENT,
      );
    }
  }
}
