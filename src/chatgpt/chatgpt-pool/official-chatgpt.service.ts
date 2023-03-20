import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { encode as gptEncode } from 'gpt-3-encoder';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { AccountService } from 'src/account/account.service';
import { ChatgptApiSessionService } from 'src/chatgpt-api-session/chatgpt-api-session.service';
import { AccountStatus } from 'src/entities/chatgpt-account';
import { MessageStore } from 'src/entities/chatgpt-api-session';
import { ExecQueueService } from 'src/exec-queue/exec-queue.service';

export interface ModelOptions {
  model?: string,
  temperature?: number,
  top_p?: number,
  presence_penalty?: number,
  stop?: string[],
  messages?: any,
  max_tokens?: number,
}

const MAX_TOKEN = 4096;
const RESPONSE_RESERVED_TOKEN = 1000;

const RETRY_ERROR_MESSAGE = [
  'Internal server error',
  '502 Bad Gateway',
  'retry your request',
  'Service Temporarily Unavailable',
];

const BANNED_ERROR_MESSAGE = [
  'Invalid URL',
  'access was terminated',
]

@Injectable()
export default class OfficialChatGPTService {
  @Inject()
  private readonly chatgptApiSessionService: ChatgptApiSessionService

  @Inject()
  private readonly accountService: AccountService

  @Inject()
  private readonly execQueueService: ExecQueueService;

  @Inject()
  private readonly configService: ConfigService;

  private readonly logger = new Logger(OfficialChatGPTService.name);

  private defaultModelOptions: ModelOptions

  constructor() {
    this.defaultModelOptions = {
      model: 'gpt-3.5-turbo',
      // temperature: typeof modelOptions.temperature === 'undefined' ? 1 : modelOptions.temperature,
      // top_p: typeof modelOptions.top_p === 'undefined' ? 1 : modelOptions.top_p,
      // presence_penalty: typeof modelOptions.presence_penalty === 'undefined' ? 0 : modelOptions.presence_penalty,
      // stop: modelOptions.stop || ['<|im_end|>', '<|im_sep|>'],
    };
    this.logger.log(`constructed, defaultModelOptions: ${JSON.stringify(this.defaultModelOptions)}`);
  }

  async sendMessage (
    message: string,
    sessionId: string,
  ) {
    const res = await this.execQueueService.exec(() => this._sendMessage(message, sessionId), { queueId: sessionId });
    return res;
  }

  async completion (body: any) {
    const apiKey = await this.accountService.getActiveApiKey();
    if (!apiKey) {
      throw new Error(`Can not send message since there is no available api key to use.`);
    }
    const result = await this.getCompletion(apiKey, body);
    return result;
  }

  private async _sendMessage(
    message: string,
    sessionId: string,
  ) {
    const apiKey = await this.accountService.getActiveApiKey();
    if (!apiKey) {
      throw new Error(`Can not send message since there is no available api key to use.`);
    }
    const conversation = await this.chatgptApiSessionService.getSession(sessionId);

    const userMessage: MessageStore = {
      role: 'user',
      content: message,
      tokenCount: this.getTokenCount(message),
      timestamp: Date.now(),
    };

    const messages = conversation?.messages || []
    messages.push(userMessage);

    const prompt = this.buildPrompt(messages);
    const result = await this.getCompletion(apiKey, {
      ...this.defaultModelOptions,
      max_tokens: prompt.max_tokens,
      messages: prompt.messages.map(m => ({ content: m.content, role: m.role })),
    });
    const reply = result.choices[0].message.content.trim();

    const replyMessage: MessageStore = {
      role: 'assistant',
      content: reply,
      tokenCount: this.getTokenCount(reply),
      timestamp: Date.now(),
    };

    const updatedMessage = [...prompt.messages, replyMessage]
    await this.chatgptApiSessionService.updateSession(sessionId, updatedMessage);

    return {
      response: replyMessage.content,
    };
  }

  private async getCompletion(
    apiKey: string,
    body: any,
    isRetry = false,
  ): Promise<any> {
    try {
      const result = await this.getCompletionRequest(apiKey, body);
      return result;
    } catch (e) {
      const errorMsg = e?.stack || e?.message;
      if (BANNED_ERROR_MESSAGE.some(msg => errorMsg.includes(msg))) {
        await this.accountService.updateAccountStatusByKey(apiKey, AccountStatus.BANNED);
        return this.getCompletion(apiKey, body, isRetry);
      } else if (errorMsg.includes('limit')) {
        await this.accountService.updateAccountStatusByKey(apiKey, AccountStatus.FREQUENT);
        return this.getCompletion(apiKey, body, isRetry);
      } else if (RETRY_ERROR_MESSAGE.some(msg => errorMsg.includes(msg))) {
        return this.getCompletion(apiKey, body, isRetry);
      } else {
        await this.accountService.updateAccountStatusByKey(apiKey, AccountStatus.ERROR, errorMsg);
        if (!isRetry) {
          return this.getCompletion(apiKey, body, true);
        }
      }
      throw e;
    }
  }

  private async getCompletionRequest(apiKey: string, data: any): Promise<any> {
    const socksHost = this.configService.get<string | undefined>('socksHost')
    let httpAgent: HttpAgent | undefined
    let httpsAgent: HttpsAgent | undefined
    if (socksHost) {
      httpAgent = new SocksProxyAgent(socksHost);
      httpsAgent = new SocksProxyAgent(socksHost)
    }

    try {
      const response = await axios('https://api.openai.com/v1/chat/completions', {
        httpAgent,
        httpsAgent,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        data: JSON.stringify(data),
      });
      if (response.status !== 200) {
        const body = response;
        const error: any = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
        error.status = response.status;
        throw error;
      }
      return response.data;
    } catch (e) {
      if (e.response) {
        throw new Error(`Failed to send message. HTTP ${e.response.status} - ${JSON.stringify(e.response.data)}`);
      } else if (e.request) {
        throw new Error(`Failed to send message. request: ${e.request}`);
      } else {
        throw e;
      }
    }
  }

  private buildPrompt(messages: MessageStore[]) {
    const outputMessages: Array<MessageStore> = [];
    let currentTokenCount = 0;

    const maxTokenCount = MAX_TOKEN - RESPONSE_RESERVED_TOKEN;
    while (currentTokenCount < maxTokenCount && messages.length > 0) {
      const message = messages.pop();
      if (message.tokenCount + currentTokenCount > maxTokenCount) {
        break;
      }
      outputMessages.unshift(message)
      // add 2 to count the stop word before and after the message to avoid exceed the length
      currentTokenCount += (message.tokenCount + 2);
    }
    // Use up to 4096 tokens (prompt + response), but try to leave 1000 tokens for the response.
    const max_tokens = Math.min(MAX_TOKEN - currentTokenCount, RESPONSE_RESERVED_TOKEN);

    return {
      max_tokens,
      messages: outputMessages,
    };
  }

  private getTokenCount(text: string) {
    return gptEncode(text).length;
  }
}
