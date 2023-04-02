import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { AccountType } from 'src/entities/chatgpt-account';

export const chatGPTModels = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-0301',
];

export class ChatGPTCompletionMessage {
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant'

  @IsString()
  content: string
}

export class ChatGPTCompletionBody {
  @IsIn(chatGPTModels)
  model: string

  @ValidateNested({ each: true })
  @Type(() => ChatGPTCompletionMessage)
  @IsDefined()
  messages: ChatGPTCompletionMessage[]

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number

  @IsNumber()
  @IsOptional()
  n?: number

  @IsBoolean()
  @IsOptional()
  stream?: boolean

  @IsString()
  @IsOptional()
  stop?: string

  @IsNumber()
  @IsOptional()
  max_tokens?: number

  @IsNumber()
  @IsOptional()
  @Min(-2)
  @Max(2)
  presence_penalty?: number

  @IsNumber()
  @IsOptional()
  @Min(-2)
  @Max(2)
  frequency_penalty?: number

  @IsObject()
  @IsOptional()
  logit_bias?: object
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
