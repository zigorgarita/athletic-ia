import { AIProvider, AIProviderConfig, AIMessage, AIResponse } from './provider';
import { GoogleGenAI } from '@google/genai';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  async chat(messages: AIMessage[], config?: Partial<AIProviderConfig>): Promise<AIResponse> {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
    const modelName = config?.model || process.env.AI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada.');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Extraer el system prompt si existe
    const systemMessage = messages.find(m => m.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    // Mapear los mensajes de usuario y asistente con soporte para mediaParts (PDFs, imágenes, etc.)
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: m.content }];
        if (m.mediaParts && m.mediaParts.length > 0) {
          for (const media of m.mediaParts) {
            parts.push({
              inlineData: {
                mimeType: media.mimeType,
                data: media.data
              }
            });
          }
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: config?.temperature ?? 0.2,
          maxOutputTokens: config?.maxTokens,
        }
      });

      return {
        content: response.text || '',
        model: modelName,
      };
    } catch (error: unknown) {
      console.error('Error al llamar a Gemini API:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Error en Gemini API: ${msg}`);
    }
  }
}
