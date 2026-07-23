import { AIProvider, AIProviderConfig, AIMessage, AIResponse } from './provider';
import { GoogleGenAI } from '@google/genai';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  async chat(messages: AIMessage[], config?: Partial<AIProviderConfig>): Promise<AIResponse> {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const modelName = config?.model || process.env.AI_MODEL || 'gemini-2.0-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY o GOOGLE_GEMINI_API_KEY no está configurada.');
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

      const candidate0 = response.candidates?.[0];
      const partTypes = candidate0?.content?.parts?.map((p: unknown) => {
        const pr = p as Record<string, unknown>;
        return pr.text !== undefined ? 'text' : (pr.inlineData ? 'inlineData' : 'unknown');
      }) || [];
      const resRecord = response as unknown as Record<string, unknown>;
      const promptFeedback = resRecord.promptFeedback as Record<string, unknown> | undefined;
      const usageMetadata = resRecord.usageMetadata as Record<string, unknown> | undefined;
      const candidate0Record = candidate0 as unknown as Record<string, unknown> | undefined;

      console.log('[DIAGNOSTICO_GEMINI]', JSON.stringify({
        modelRequested: modelName,
        status: '200 OK',
        modelVersion: (resRecord.modelVersion as string) || 'N/A',
        responseId: (resRecord.responseId as string) || 'N/A',
        candidatesLength: response.candidates?.length || 0,
        promptFeedback: {
          blockReason: promptFeedback?.blockReason || null,
          blockReasonMessage: promptFeedback?.blockReasonMessage || null,
        },
        candidate0: candidate0 ? {
          finishReason: candidate0.finishReason || null,
          finishMessage: candidate0Record?.finishMessage || null,
          safetyRatings: candidate0.safetyRatings || [],
          partTypes,
        } : null,
        textLength: response.text?.length || 0,
        usageMetadata: {
          promptTokenCount: usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: usageMetadata?.candidatesTokenCount || 0,
          thoughtsTokenCount: usageMetadata?.thoughtsTokenCount || 0,
          totalTokenCount: usageMetadata?.totalTokenCount || 0,
        }
      }, null, 2));

      return {
        content: response.text || '',
        model: modelName,
      };
    } catch (error: unknown) {
      console.error('[DIAGNOSTICO_GEMINI_ERROR]', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Error en Gemini API: ${msg}`);
    }
  }
}
