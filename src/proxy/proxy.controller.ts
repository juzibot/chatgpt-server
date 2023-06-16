import { Body, Controller, Headers, Inject, Post, StreamableFile } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller('proxy')
export class ProxyController {
  @Inject()
  private readonly service: ProxyService;

  @Post('/v1/chat/completions')
  async chatCompletion (@Body() body: any, @Headers() headers: any) {
    const result = await this.service.chatCompletion(body, headers);
    if (body.stream) {
      return new StreamableFile(result)
    }
    return result;
  }
}
