import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Agent as HttpAgent, IncomingMessage } from 'http';
import { Agent as HttpsAgent } from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { MINUTE } from 'src/common/time';
import { AccountType, ChatgptAccount } from 'src/entities/chatgpt-account';
import { PassThrough } from 'stream';

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
    // debug only, keep this for now, remove this after the feature getting stable
    // let count = 0;
    // result.on('data', data => console.log(`${count++}: ${data.toString()}`));
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
        responseType: data.stream ? 'stream' : 'json',
        data: JSON.stringify(data),
        timeout: 1 * MINUTE,
      });
      if (response.status !== 200) {
        const error = new HttpException(response.data, response.status);
        throw error;
      }
      return response.data;
    } catch (e) {
      if (e.response) {
        throw new HttpException(e.response.data, e.response.status);
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
        responseType: data.stream ? 'stream' : 'json',
        data,
        timeout: 1 * MINUTE,
      });
      if (response.status !== 200) {
        const error = new HttpException(response.data, response.status);
        throw error;
      }
      if (data.stream) {
        return this.convertAzureStreamToOpenAIStream(response.data);
      } else {
        return response.data;
      }
    } catch (e) {
      if (e.response) {
        throw new HttpException(e.response.data, e.response.status);
      } else if (e.request) {
        throw new Error(`Failed to send message. request: ${e.request}`);
      } else {
        throw e;
      }
    }
  }

  private convertAzureStreamToOpenAIStream (stream: IncomingMessage) {
    const normalizedStream = new PassThrough();
    let canvas = '\n\n';
    stream.on('data', (data: Buffer) => {
      const dataStr = data.toString();
      canvas += dataStr;
      const lines = canvas.split('\n\ndata: ').filter(line => !!line).map(line => line.trim());
      let firstMsg = '';
      for (const line of lines) {
        if (line === '[DONE]') {
          normalizedStream.write(Buffer.from(`data: ${line}`));
          continue;
        }
        try {
          const obj = JSON.parse(line);
          if (obj?.choices[0]?.delta?.role === 'assistant') {
            firstMsg = line;
            continue;
          }
          if (firstMsg) {
            normalizedStream.write(Buffer.from(`data: ${firstMsg}\n\ndata: ${line}\n\n`));
            firstMsg = '';
          } else {
            normalizedStream.write(Buffer.from(`data: ${line}\n\n`));
          }
        } catch (e) {
          this.logger.log(`Failed to parse line: ${line} (${e.message})`);
          canvas = `\n\ndata: ${line}`;
          continue;
        }
        canvas = '\n\n';
      }
    });
    stream.on('end', () => normalizedStream.end());
    stream.on('error', err => normalizedStream.emit('error', err));

    return normalizedStream;
  }
}
