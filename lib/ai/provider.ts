import { GeminiProvider } from './gemini';

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIMediaPart {
  mimeType: string;
  data: string; // base64 string
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  mediaParts?: AIMediaPart[];
}

export interface AIResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
  model: string;
}

export interface AIProvider {
  readonly name: string;
  chat(messages: AIMessage[], config?: Partial<AIProviderConfig>): Promise<AIResponse>;
}

export function createProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || 'gemini';
  
  if (providerName === 'gemini') {
    return new GeminiProvider();
  }
  
  throw new Error(`AI Provider no soportado: ${providerName}`);
}
