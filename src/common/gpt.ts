import { encode as gptEncode } from 'gpt-3-encoder';

export const getTokenCount = (text: string) => {
  return gptEncode(text).length;
}
