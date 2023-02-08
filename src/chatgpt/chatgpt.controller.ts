import {
  Controller,
  Post,
  Body,
  Get,
  Param,
} from '@nestjs/common';
import { ChatgptService } from './chatgpt.service';

@Controller('chatgpt')
export class ChatgptController {
  constructor(private readonly chatgptService: ChatgptService) {}
  @Post('/account/create')
  async createChatgptAccount(@Body() createCatDto: any) {
    return this.chatgptService.createChatGPTAccount(createCatDto);
  }

  @Get('/account')
  async getChatgptAccount() {
    return this.chatgptService.getAllChatGPT();
  }

  @Post('/account/delete')
  async deleteChatgptAccount(@Param('email') id: string) {
    return this.chatgptService.deleteChatGPTAccount(id);
  }

  @Post('/account/update')
  async updateChatgptAccount(
    @Param('email') id: string,
    @Body() updateCatDto: any
  ) {
    return this.chatgptService.updateChatGPTAccount(id, updateCatDto);
  }

  @Post('/message/:sessionId')
  async getChatGPTMessageBySessionId(
    @Param('sessionId') sessionId: string,
    @Body() messageDto: any
  ) {
    const { message } = messageDto;
    return this.chatgptService.sendChatGPTMessage(message, sessionId);
  }
}
