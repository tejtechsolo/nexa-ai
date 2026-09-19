export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
};

export type AIProvider = {
  id: string;
  name: string;
  chat(input: ChatRequest): Promise<string>;
  stream(input: ChatRequest): Promise<ReadableStream<Uint8Array>>;
};
