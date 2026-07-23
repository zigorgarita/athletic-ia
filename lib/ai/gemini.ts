import { AIProvider, AIProviderConfig, AIMessage, AIResponse } from './provider';
import { GoogleGenAI } from '@google/genai';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  async chat(messages: AIMessage[], config?: Partial<AIProviderConfig>): Promise<AIResponse> {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const modelName = config?.model || process.env.AI_MODEL;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY o GOOGLE_GEMINI_API_KEY no está configurada.');
    }
    if (!modelName) {
      throw new Error('AI_MODEL no está configurada en las variables de entorno. Configura la variable AI_MODEL en Vercel.');
    }

    console.log(`[GEMINI] Modelo activo: ${modelName}`);

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

    const MAX_ATTEMPTS = 3;
    const retryDelays = [2000, 5000]; // Esperas entre intento 1->2 y 2->3 (total 3 llamadas máximo)

    function is503Error(err: unknown): boolean {
      if (!err) return false;
      const msg = err instanceof Error ? err.message : String(err);
      const errObj = err as Record<string, unknown>;
      const status = errObj.status || errObj.statusCode || errObj.code;
      return (
        status === 503 ||
        status === 'UNAVAILABLE' ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand')
      );
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const startTime = Date.now();
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

        const duration = Date.now() - startTime;
        const candidate0 = response.candidates?.[0];
        const partTypes = candidate0?.content?.parts?.map((p: unknown) => {
          const pr = p as Record<string, unknown>;
          return pr.text !== undefined ? 'text' : (pr.inlineData ? 'inlineData' : 'unknown');
        }) || [];
        const resRecord = response as unknown as Record<string, unknown>;
        const promptFeedback = resRecord.promptFeedback as Record<string, unknown> | undefined;
        const usageMetadata = resRecord.usageMetadata as Record<string, unknown> | undefined;
        const candidate0Record = candidate0 as unknown as Record<string, unknown> | undefined;

        console.log('[TELEMETRIA_GEMINI]', JSON.stringify({
          modelRequested: modelName,
          attempt,
          status: '200 OK',
          durationMs: duration,
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
        const duration = Date.now() - startTime;
        const is503 = is503Error(error);

        console.log('[TELEMETRIA_GEMINI_INTENTO]', JSON.stringify({
          modelRequested: modelName,
          attempt,
          maxAttempts: MAX_ATTEMPTS,
          is503,
          durationMs: duration,
          error: error instanceof Error ? error.message : String(error),
        }));

        if (is503 && attempt < MAX_ATTEMPTS) {
          const baseDelay = retryDelays[attempt - 1] || 2000;
          const jitter = Math.floor(Math.random() * 400); // 0-400ms jitter aleatorio
          const waitMs = baseDelay + jitter;
          console.warn(`[GEMINI_RETRY] Modelo: ${modelName} | Intento: ${attempt}/${MAX_ATTEMPTS} | Código: 503 UNAVAILABLE | Reintentando en ${waitMs}ms...`);
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }

        const msg = error instanceof Error ? error.message : String(error);
        if (is503) {
          throw new Error('Gemini está experimentando una alta demanda temporal. No se ha perdido ningún dato. Inténtalo de nuevo en unos minutos.');
        }
        throw new Error(`Error en Gemini API: ${msg}`);
      }
    }

    throw new Error('Gemini está experimentando una alta demanda temporal. No se ha perdido ningún dato. Inténtalo de nuevo en unos minutos.');
  }
}
