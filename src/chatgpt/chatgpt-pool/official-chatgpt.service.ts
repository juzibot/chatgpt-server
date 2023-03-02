import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { encode as gptEncode } from 'gpt-3-encoder';
import { AccountService } from 'src/account/account.service';
import { ChatgptApiSessionService } from 'src/chatgpt-api-session/chatgpt-api-session.service';
import { AccountStatus } from 'src/entities/chatgpt-account';
import { MessageStore } from 'src/entities/chatgpt-api-session';

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

@Injectable()
export default class OfficialChatGPTService {
  @Inject()
  private readonly chatgptApiSessionService: ChatgptApiSessionService

  @Inject()
  private readonly accountService: AccountService

  private defaultModelOptions: ModelOptions

  constructor() {
    this.defaultModelOptions = {
      model: 'gpt-3.5-turbo',
      // temperature: typeof modelOptions.temperature === 'undefined' ? 1 : modelOptions.temperature,
      // top_p: typeof modelOptions.top_p === 'undefined' ? 1 : modelOptions.top_p,
      // presence_penalty: typeof modelOptions.presence_penalty === 'undefined' ? 0 : modelOptions.presence_penalty,
      // stop: modelOptions.stop || ['<|im_end|>', '<|im_sep|>'],
    };
  }

  async sendMessage(
    message: string,
    sessionId: string,
    isRetry = false,
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
    let reply: string;
    try {
      const result = await this.getCompletion(apiKey, prompt);
      reply = result.choices[0].message.content.trim();
    } catch (e) {
      if (e?.message.includes('access was terminated')) {
        await this.accountService.updateAccountStatusByKey(apiKey, AccountStatus.BANNED);
        return this.sendMessage(message, sessionId, isRetry);
      } else if (e?.message.includes('limit')) {
        await this.accountService.updateAccountStatusByKey(apiKey, AccountStatus.FREQUENT);
        return this.sendMessage(message, sessionId, isRetry);
      } else {
        await this.accountService.updateAccountStatusByKey(apiKey, AccountStatus.ERROR, e?.stack || e?.message);
        if (!isRetry) {
          return this.sendMessage(message, sessionId, true);
        }
      }
      throw e;
    }

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

  private async getCompletion(apiKey: string, prompt: { max_tokens: number, messages: MessageStore[] }): Promise<any> {
    try {
      const response = await axios('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        data: JSON.stringify({
          ...this.defaultModelOptions,
          max_tokens: prompt.max_tokens,
          messages: prompt.messages.map(m => ({ content: m.content, role: m.role })),
        }),
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
      currentTokenCount += message.tokenCount;
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
