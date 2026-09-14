import { GoogleGenAI, Type } from '@google/genai';
import { AIModelConfig, AIProviderType } from '../src/types';

export interface AIExecutionOptions {
  config?: AIModelConfig;
  systemPrompt: string;
  userPrompt: string;
  geminiSchema?: any;
}

export function getDefaultAIConfig(): AIModelConfig {
  const provider = (process.env.AI_PROVIDER as AIProviderType) || 'gemini';
  let defaultModel = 'gemini-2.5-flash';
  if (provider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
  else if (provider === 'openai') defaultModel = 'gpt-4o';
  else if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
  else if (provider === 'local_ollama') defaultModel = 'llama3.2';

  const modelName = process.env.AI_MODEL || defaultModel;
  const baseUrl =
    provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1';

  return {
    provider,
    modelName,
    baseUrl,
  };
}

// Unified runner supporting Gemini, Groq, OpenAI, Claude, and Local LLMs (Ollama / LM Studio / vLLM)
export async function runAICompletion(options: AIExecutionOptions): Promise<string> {
  const aiConfig = options.config || getDefaultAIConfig();
  const provider = aiConfig.provider || 'gemini';
  const modelName =
    aiConfig.modelName ||
    (provider === 'gemini'
      ? 'gemini-2.5-flash'
      : provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : 'llama3.2');

  // 1. Google Gemini Provider
  if (provider === 'gemini') {
    const apiKey = aiConfig.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const geminiParams: any = {
      model: modelName,
      contents: options.userPrompt,
      config: {
        systemInstruction: options.systemPrompt,
        responseMimeType: 'application/json',
      },
    };

    if (options.geminiSchema) {
      geminiParams.config.responseSchema = options.geminiSchema;
    }

    const response = await ai.models.generateContent(geminiParams);
    return response.text || '';
  }

  // 2. Groq, Local LLM (Ollama, LM Studio, vLLM), OpenAI, or Custom OpenAI-compatible endpoint
  if (
    provider === 'groq' ||
    provider === 'local_ollama' ||
    provider === 'custom_compatible' ||
    provider === 'openai'
  ) {
    let defaultBaseUrl = 'http://localhost:11434/v1';
    let defaultApiKey = 'sk-local';

    if (provider === 'groq') {
      defaultBaseUrl = 'https://api.groq.com/openai/v1';
      defaultApiKey = process.env.GROQ_API_KEY || '';
    } else if (provider === 'openai') {
      defaultBaseUrl = 'https://api.openai.com/v1';
      defaultApiKey = process.env.OPENAI_API_KEY || '';
    } else if (provider === 'local_ollama') {
      defaultBaseUrl = process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1';
    }

    const baseUrl = (aiConfig.baseUrl || defaultBaseUrl).replace(/\/$/, '');
    const apiKey = aiConfig.apiKey || defaultApiKey;

    if ((provider === 'groq' || provider === 'openai') && !apiKey) {
      throw new Error(
        `${provider === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'} is required. Please set it in Settings or enter it in the AI Model dialog.`
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const systemWithJsonInstruction = `${options.systemPrompt}\n\nIMPORTANT: You must output ONLY a valid raw JSON object or array matching the requested schema. Do not enclose in markdown code blocks or add introductory text.`;

    const requestBody: any = {
      model: modelName,
      messages: [
        { role: 'system', content: systemWithJsonInstruction },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: aiConfig.temperature ?? 0.2,
      response_format: { type: 'json_object' },
    };

    const endpoint = `${baseUrl}/chat/completions`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM provider (${provider}) request failed [${res.status}]: ${errText}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    return cleanJsonString(content);
  }

  // 3. Anthropic Claude Provider
  if (provider === 'anthropic') {
    const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    const systemWithJson = `${options.systemPrompt}\n\nOutput only valid JSON. No conversational preamble.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemWithJson,
        messages: [{ role: 'user', content: options.userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API request failed [${res.status}]: ${errText}`);
    }

    const data = (await res.json()) as any;
    const textContent = data.content?.[0]?.text || '';
    return cleanJsonString(textContent);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

// Strips markdown fence blocks if a model returns ```json ... ```
export function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}
