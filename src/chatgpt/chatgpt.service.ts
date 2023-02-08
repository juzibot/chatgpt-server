import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatgptPoolService } from './chatgpt-pool/chatgpt-pool.service';
import { Cron } from '@nestjs/schedule';
import { AccountService } from 'src/account/account.service';
import { SessionService } from 'src/session/session.service';
import { AccountStatus } from 'src/entities';
import { ExecQueueService } from 'src/exec-queue/exec-queue.service';
@Injectable()
export class ChatgptService implements OnModuleInit {
  @Inject()
  private chatgptPoolService: ChatgptPoolService;

  @Inject()
  private accountService: AccountService;

  @Inject()
  private sessionService: SessionService;

  @Inject()
  private execQueueService: ExecQueueService;

  private logger = new Logger('ChatgptService');

  async onModuleInit () {
    await this.stopAllChatGPTInstances();
    await this.startAllDownAccount();
  }

  async createChatGPTAccount(account: {
    email: string;
    password: string;
  }) {
    const { email, password } = account;
    await this.accountService.createAccount(
      email,
      password,
    );
  }

  async deleteChatGPTAccount(email: string) {
    this.chatgptPoolService.deleteChatGPTInstanceByEmail(email);
    return this.accountService.deleteAccount(email);
  }

  async updateChatGPTAccount(
    email: string,
    password: string,
  ) {
    this.chatgptPoolService.deleteChatGPTInstanceByEmail(email);
    this.accountService.updateAccountPassword(email, password)
    this.chatgptPoolService.initChatGPTInstance(email, password);
  }

  async getAllChatGPT() {
    return this.accountService.getAllAccounts();
  }

  // Send Chatgpt Message via ChatgptPoolService
  async sendChatGPTMessage(
    message: string,
    sessionId: string,
  ) {
    const sessionInfo = await this.sessionService.getOrInitSession(sessionId);
    let email = sessionInfo.email;
    if (email) {
      const account = await this.accountService.getChatGPTAccount(email);
      if (account.status !== AccountStatus.RUNNING) {
        email = undefined;
      }
    }

    if (!email) {
      email = await this.accountService.getOneRunningAccount();
      if (!email) {
        throw new Error(`No account available for query.`);
      }
    }

    try {
      const messageResult = await this.execQueueService.exec(() => this.sendMessageWithEmail(
        email,
        message,
        sessionInfo.conversationId,
        sessionInfo.parentMessageId,
      ), { queueId: email });
      await this.sessionService.updateSession(sessionId, {
        email,
        conversationId: messageResult.conversationId,
        parentMessageId: messageResult.messageId,
      });
      return messageResult;
    } catch (e) {
      this.logger.error(`Send message to ${email} failed: ${e}`);
      if ((e?.stack || e?.message || '').includes('429')) {
        this.accountService.updateAccountStatus(
          email,
          AccountStatus.FREQUENT,
        );
      } else {
        this.accountService.updateAccountStatus(
          email,
          AccountStatus.ERROR,
          e?.stack || e?.message,
        );
      }
      await this.sessionService.updateSession(sessionId, {
        email: null,
        conversationId: null,
        parentMessageId: null,
      });
    } 
  }

  async sendMessageWithEmail (
    email: string,
    message: string,
    conversationId?: string,
    parentMessageId?: string,
  ) {
    // Send Message
    this.logger.debug(`Send message to ${email}: ${message}`);
    const messageResult = await this.chatgptPoolService.sendMessage(message, {
      email,
      conversationId,
      parentMessageId,
    });
    if (!messageResult) {
      throw new Error(`${email} Send message failed, message: ${message}`)
    }
    this.logger.debug(messageResult);
    return messageResult;
  }

  async startChatgptInstance(email: string) {
    // As Lock
    const account = await this.accountService.getChatGPTAccount(email);
    if (account.status !== AccountStatus.DOWN) {
      this.logger.error(`Account ${email} is not down`);
      return;
    }
    this.logger.debug(`Start account ${account.email}`);
    await this.accountService.updateAccountStatus(
      email,
      AccountStatus.INITIALIZING,
    );
    try {
      await this.chatgptPoolService.initChatGPTInstance(email, account.password);
      await this.accountService.updateAccountStatus(
        email,
        AccountStatus.RUNNING,
      );
    } catch (err) {
      this.logger.error(`Error starting account ${account.email}: ${err}`);
      await this.accountService.updateAccountStatus(
        email,
        AccountStatus.ERROR,
        err?.stack || err?.message,
      );
    }
  }

  async stopAllChatGPTInstances() {
    this.logger.debug('Stop all chatgpt instances');
    const accounts = await this.accountService.getAllRunningAccounts();
    for (const account of accounts) {
      this.chatgptPoolService.deleteChatGPTInstanceByEmail(account.email);
      await this.accountService.updateAccountStatus(
        account.email,
        AccountStatus.DOWN,
      );
    }
    this.logger.debug(`Found ${accounts.length} running accounts`);
  }

  @Cron('1 * * * * *')
  async startAllDownAccount() {
    this.logger.debug('Start all down account');
    const downAccounts = await this.accountService.getDownAccounts();
    
    this.logger.debug(`Found ${downAccounts.length} down accounts`);
    for (const account of downAccounts) {
      await this.startChatgptInstance(account.email);
    }
  }

  @Cron('0 */10 * * * *')
  async restoreErrorOrFrequentAccount () {
    const accounts = await this.accountService.getAllAccounts();
    const errorAccounts = accounts.filter(a => a.status === AccountStatus.ERROR);
    const frequentAccounts = accounts.filter(a => a.status === AccountStatus.FREQUENT);
    this.logger.log(`got ${errorAccounts.length} error accounts, ${frequentAccounts.length} frequent accounts, trying to restore...`);
    for (const account of frequentAccounts) {
      await this.accountService.updateAccountStatus(account.email, AccountStatus.RUNNING);
    }
    for (const account of errorAccounts) {
      this.chatgptPoolService.refreshChatGPTInstanceByEmail(account.email);
      await this.accountService.updateAccountStatus(account.email, AccountStatus.RUNNING);
    }
  }
}
