export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
};

export type AIProvider = {
  id: string;
  name: string;
  chat(input: ChatRequest): Promise<string>;
};
