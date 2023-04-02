import { Inject, Injectable, Logger } from '@nestjs/common';
import { AccountService } from 'src/account/account.service';
import { ChatgptApiSessionService } from 'src/chatgpt-api-session/chatgpt-api-session.service';
import { getTokenCount } from 'src/common/gpt';
import { SECOND, sleep } from 'src/common/time';
import { AccountStatus, AccountType } from 'src/entities/chatgpt-account';
import { MessageStore } from 'src/entities/chatgpt-api-session';
import { ExecQueueService } from 'src/exec-queue/exec-queue.service';
import { ChatGPTCompletionBody } from '../chatgpt.dto';
import { OpenAIGatewayService } from './openai-gateway.service';

export interface ModelOptions {
  model: string,
  temperature?: number,
  top_p?: number,
  presence_penalty?: number,
  stop?: string,
  messages?: any,
  max_tokens?: number,
}

const MAX_TOKEN = 4096;
const RESPONSE_RESERVED_TOKEN = 1000;
const MAX_RETRY = 10;

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
  private readonly openAiGateway: OpenAIGatewayService;

  private readonly logger = new Logger(OfficialChatGPTService.name);

  private defaultModelOptions: ModelOptions

  constructor() {
    this.defaultModelOptions = {
      model: 'gpt-3.5-turbo',
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

  async completion (body: ChatGPTCompletionBody) {
    const result = await this.getCompletion(body);
    return result;
  }

  private async _sendMessage(
    message: string,
    sessionId: string,
  ) {
    const conversation = await this.chatgptApiSessionService.getSession(sessionId);
    const userMessage: MessageStore = {
      role: 'user',
      content: message,
      tokenCount: getTokenCount(message),
      timestamp: Date.now(),
    };

    const messages = conversation?.messages || []
    messages.push(userMessage);

    const prompt = this.buildPrompt(messages);
    const result = await this.getCompletion({
      ...this.defaultModelOptions,
      max_tokens: prompt.max_tokens,
      messages: prompt.messages.map(m => ({ content: m.content, role: m.role })),
    });
    const reply = result?.choices[0]?.message?.content?.trim() || '';

    const replyMessage: MessageStore = {
      role: 'assistant',
      content: reply,
      tokenCount: getTokenCount(reply),
      timestamp: Date.now(),
    };

    const updatedMessage = [...prompt.messages, replyMessage]
    await this.chatgptApiSessionService.updateSession(sessionId, updatedMessage);

    return {
      response: replyMessage.content,
    };
  }

  private async getCompletion(
    body: ChatGPTCompletionBody,
    isRetry = false,
    retryCount = 0,
  ): Promise<any> {
    const account = await this.accountService.getValidAccount();
    if (!account) {
      throw new Error(`Can not send message since there is no available account to use.`);
    }
    const accountId = account._id.toHexString();

    try {
      const result = await this.openAiGateway.requestCompletion(account, body);
      return result;
    } catch (e) {
      const errorMsg = e?.stack || e?.message;
      const status = e.status;
      if (status === 400) {
        // directly throw error for bad request
        throw e;
      }
      if (BANNED_ERROR_MESSAGE.some(msg => errorMsg.includes(msg))) {
        if (account.type !== AccountType.AZURE) {
          await this.accountService.updateAccountStatus(accountId, AccountStatus.BANNED, errorMsg);
        }
        // banned api key can use another api key retry
        await sleep(0.5 * SECOND);
      } else if (errorMsg.includes('limit')) {
        if (account.type !== AccountType.AZURE) {
          await this.accountService.updateAccountStatus(accountId, AccountStatus.FREQUENT, errorMsg);
        }
        // rate limit can be retried with another api key
      } else if (status === 500 || RETRY_ERROR_MESSAGE.some(msg => errorMsg.includes(msg))) {
        // errors that can be retried
        await sleep(0.5 * SECOND);
      } else {
        if (account.type !== AccountType.AZURE) {
          await this.accountService.updateAccountStatus(accountId, AccountStatus.ERROR, errorMsg);
        }
        if (isRetry) {
          throw e;
        }
        isRetry = true;
      }
      if (retryCount >= MAX_RETRY) {
        throw new Error(`Failed to send message after ${MAX_RETRY} retries. last error: ${errorMsg}`);
      }
      return this.getCompletion(body, isRetry, retryCount + 1);
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
}
