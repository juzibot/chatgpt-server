import { IsIn } from 'class-validator';

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
