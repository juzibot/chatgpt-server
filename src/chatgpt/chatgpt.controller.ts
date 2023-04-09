import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpException,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { AccountType } from 'src/entities/chatgpt-account';
import { ChatGPTCompletionBody, CreateAccountRequestBody } from './chatgpt.dto';
import { ChatgptService } from './chatgpt.service';

@Controller('chatgpt')
export class ChatgptController {
  constructor(private readonly chatgptService: ChatgptService) {}
  @Post('/account/create')
  async createChatgptAccount(@Body() createAccountBody: CreateAccountRequestBody) {
    this.validateCreateAccountBody(createAccountBody);
    await this.chatgptService.createChatGPTAccount(createAccountBody);
    return { message: 'success' };
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
    if (!message) {
      throw new HttpException('message can not be empty to request the api', HttpStatus.BAD_REQUEST);
    }
    return this.chatgptService.sendMessage(message, sessionId);
  }

  @Post('completion')
  async completion (@Body() body: ChatGPTCompletionBody) {
    const result = await this.chatgptService.completion(body);
    if (body.stream) {
      return new StreamableFile(result);
    } else {
      return result;
    }
  }

  private validateCreateAccountBody (createAccountBody: CreateAccountRequestBody) {
    const type = createAccountBody.type || AccountType.OPEN_AI;
    switch (type) {
      case AccountType.OPEN_AI:
        if (!createAccountBody.apiKey) {
          throw new HttpException('apiKey is required for open ai account', HttpStatus.BAD_REQUEST);
        }
        if (!createAccountBody.email || !createAccountBody.password) {
          throw new HttpException('email and password is required for open ai account', HttpStatus.BAD_REQUEST);
        }
        break;
      case AccountType.AZURE:
        if (!createAccountBody.apiKey || !createAccountBody.resourceName || !createAccountBody.deploymentId) {
          throw new HttpException('apiKey, resourceName, deploymentId is required for azure account', HttpStatus.BAD_REQUEST);
        }
        break;
      default:
        throw new HttpException(`type ${type} is not supported`, HttpStatus.BAD_REQUEST);
    }
  }
}
