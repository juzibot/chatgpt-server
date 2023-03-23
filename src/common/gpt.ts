import { encode as gptEncode } from 'gpt-3-encoder';

export const getTokenCount = (text: string) => {
  try {
    const count = gptEncode(text).length;
    return count;
  } catch (e) {
    console.error(`Error encoding text: ${text}`, e);
    return text.length * 2;
  }
}
