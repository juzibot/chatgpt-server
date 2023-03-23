import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { MINUTE } from 'src/common/time';
import { AccountType, ChatgptAccount } from 'src/entities/chatgpt-account';

@Injectable()
export class OpenAIGatewayService {
  @Inject()
  private readonly configService: ConfigService;

  private readonly logger = new Logger(OpenAIGatewayService.name);

  async requestCompletion (account: ChatgptAccount, body: any) {
    const startTime = Date.now();
    let result: any
    const type = account.type || AccountType.OPEN_AI
    switch (type) {
      case AccountType.OPEN_AI:
        result = await this.requestOpenAI(account.apiKey, body);
        break;
      case AccountType.AZURE:
        result = await this.requestAzure(account.apiKey, body, account.resourceName, account.deploymentId);
        break;
      default:
        throw new Error(`Unknown account type: ${type}`);
    }

    this.logger.log(`${type} request took ${(Date.now() - startTime) / 1000}s`);
    return result;
  }

  private async requestOpenAI (
    apiKey: string,
    data: any,
  ): Promise<any> {
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
        timeout: 1 * MINUTE,
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

  private async requestAzure (
    apiKey: string,
    data: any,
    resourceName: string,
    deploymentId: string,
  ): Promise<any> {
    const apiVersion = this.configService.get<string>('azureApiVersion');
    const url = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;
    try {
      const response = await axios(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        data,
        timeout: 1 * MINUTE,
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
}
