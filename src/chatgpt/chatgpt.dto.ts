import { IsIn, IsOptional, IsString } from 'class-validator';
import { AccountType } from 'src/entities/chatgpt-account';

export const chatGPTModels = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-0301',
];

// TODO: finish this object definition
export class ChatGPTRequestBody {
  @IsIn(chatGPTModels)
  model: string

  messages: []
}

export class CreateAccountRequestBody {
  @IsString()
  apiKey: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  type?: AccountType;

  @IsString()
  @IsOptional()
  resourceName?: string;

  @IsString()
  @IsOptional()
  deploymentId?: string;
}
