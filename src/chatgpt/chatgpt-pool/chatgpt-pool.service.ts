import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import type { SendMessageOptions, ChatGPTAPIBrowser } from 'chatgpt';
import retry from 'async-retry';
@Injectable()
export class ChatgptPoolService {
  @Inject()
  private readonly config: ConfigService;

  logger = new Logger(ChatgptPoolService.name);

  // Record the conversation between user email
  chatgptPool: Map<string, any> = new Map();

  // Create new Chatgpt instance
  async initChatGPTInstance(email: string, password: string) {
    if (this.chatgptPool.has(email)) {
      return;
    }
    const options = {
      minimize: true,
      captchaToken: this.config.get<string | undefined>('captchaToken'),
      nopechaKey: this.config.get<string | undefined>('nopechaKey'),
      executablePath: this.config.get<string | undefined>('executablePath'),
      proxyServer: this.config.get<string | undefined>('proxyServer'),
      userDataDir: this.config.get<string | undefined>('userDataDir'),
    }
    const { ChatGPTAPIBrowser } = await import('chatgpt');
    const chatgpt = new ChatGPTAPIBrowser({
      email,
      password,
      ...options,
      userDataDir: options.userDataDir
        ? `${options.userDataDir}/${email}`
        : undefined,
    });
    await retry(
      async (_: any, num: number) => {
        try {
          await chatgpt.initSession();
          return chatgpt;
        } catch (e) {
          this.logger.error(
            `ChatGPT ${email} initSession error: ${e.message}, retry ${num} times`
          );
          chatgpt.closeSession();
          this.logger.debug(e.stack);
          throw e;
        }
      },
      {
        retries: 3,
      }
    );
    this.chatgptPool.set(email, chatgpt);
    return chatgpt;
  }

  get accounts() {
    return this.chatgptPool.keys();
  }

  get poolIsEmpty() {
    return this.chatgptPool.size === 0;
  }

  getChatGPTInstanceByEmail(email?: string) {
    if (!email) {
      return;
    }
    return this.chatgptPool.get(email);
  }

  deleteChatGPTInstanceByEmail(email: string) {
    const chatgpt = this.chatgptPool.get(email);
    if (chatgpt) {
      void chatgpt.closeSession();
    }
    return this.chatgptPool.delete(email);
  }

  refreshChatGPTInstanceByEmail(email: string) {
    const chatgpt = this.chatgptPool.get(email);
    if (chatgpt) {
      chatgpt.refreshSession();
    }
  }

  async sendMessage(
    message: string,
    options?: any & { email?: string }
  ) {
    const chatGPT = this.getChatGPTInstanceByEmail(options.email);
    if (!chatGPT) {
      throw new Error('ChatGPT instance not found');
    }
    const response = await chatGPT.sendMessage(message, options);
    return response;
  }
}
