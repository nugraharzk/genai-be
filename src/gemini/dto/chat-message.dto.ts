export type ChatMessageDto = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};
