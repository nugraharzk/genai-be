import { ChatMessageDto } from './chat-message.dto';

export type ChatRequestDto = {
  prompt?: string;
  messages?: ChatMessageDto[];
  model?: string;
  systemInstruction?: string;
};
