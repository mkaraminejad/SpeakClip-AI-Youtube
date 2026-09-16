import { GoogleGenAI, Type } from '@google/genai';
import { AIModelConfig, AIProviderType } from '../src/types';

export interface AIExecutionOptions {
  config?: AIModelConfig;
  systemPrompt: string;
  userPrompt: string;
  geminiSchema?: any;
}

// In-memory active configuration persisted during server lifecycle (Default: Groq)
let activeServerConfig: AIModelConfig = {
  provider: 'groq',
  modelName: 'llama-3.3-70b-versatile',
  apiKey: process.env.GROQ_API_KEY || '',
};

export function getActiveServerConfig(): AIModelConfig {
  return { ...activeServerConfig };
}

export function setActiveServerConfig(cfg: Partial<AIModelConfig>): AIModelConfig {
  activeServerConfig = {
    ...activeServerConfig,
    ...cfg,
  };
  return { ...activeServerConfig };
}

export function getDefaultAIConfig(): AIModelConfig {
  return { ...activeServerConfig };
}

// Unified runner supporting Groq, Gemini, OpenAI, Claude, and Local LLMs (Ollama / LM Studio / vLLM)
export async function runAICompletion(options: AIExecutionOptions): Promise<string> {
  const aiConfig = options.config || activeServerConfig || getDefaultAIConfig();
  const provider = aiConfig.provider || activeServerConfig.provider || 'groq';
  const modelName =
    aiConfig.modelName ||
    activeServerConfig.modelName ||
    (provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : provider === 'gemini'
      ? 'gemini-3.6-flash'
      : 'llama3.2');

  // 1. Google Gemini Provider
  if (provider === 'gemini') {
    const rawKey = aiConfig.apiKey || activeServerConfig.apiKey;
    const apiKey = (rawKey && rawKey.length > 10 && rawKey !== 'abcd') ? rawKey : process.env.GEMINI_API_KEY;
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
      defaultApiKey = process.env.GROQ_API_KEY || activeServerConfig.apiKey || '';
    } else if (provider === 'openai') {
      defaultBaseUrl = 'https://api.openai.com/v1';
      defaultApiKey = process.env.OPENAI_API_KEY || activeServerConfig.apiKey || '';
    } else if (provider === 'local_ollama') {
      defaultBaseUrl = process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1';
    }

    const baseUrl = (aiConfig.baseUrl || defaultBaseUrl).replace(/\/$/, '');
    const apiKey = aiConfig.apiKey || activeServerConfig.apiKey || defaultApiKey;

    if ((provider === 'groq' || provider === 'openai') && !apiKey) {
      throw new Error(
        `${provider === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'} is required. Please enter your API key in AI Model settings.`
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Explicitly enforce JSON object response format for Groq / OpenAI compatibility
    const systemWithJsonInstruction = `${options.systemPrompt}

IMPORTANT RULES:
1. You MUST respond with ONLY valid, raw JSON (no markdown \`\`\` code fences, no introductory phrases).
2. If returning multiple items, wrap them inside a JSON object with a key named "items" or "segments" (e.g. { "items": [ ... ] }).`;

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
      throw new Error(`LLM provider (${provider} - ${modelName}) request failed [${res.status}]: ${errText}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    return cleanJsonString(content);
  }

  // 3. Anthropic Claude Provider
  if (provider === 'anthropic') {
    const apiKey = aiConfig.apiKey || activeServerConfig.apiKey || process.env.ANTHROPIC_API_KEY;
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

/**
 * Transcribes audio or video binary using Groq Whisper API (whisper-large-v3)
 */
export async function transcribeAudioWithGroqWhisper(options: {
  buffer: Buffer;
  filename: string;
  apiKey?: string;
  prompt?: string;
}): Promise<{
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
}> {
  const apiKey = options.apiKey || activeServerConfig.apiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required to transcribe audio with Groq Whisper. Please provide your Groq API key.');
  }

  const formData = new FormData();
  const blob = new Blob([options.buffer], { type: 'audio/mp4' });
  formData.append('file', blob, options.filename || 'audio.mp4');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');
  if (options.prompt) {
    formData.append('prompt', options.prompt);
  }

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Whisper transcription failed [${res.status}]: ${errText}`);
  }

  const result = (await res.json()) as any;
  const segments = Array.isArray(result.segments)
    ? result.segments.map((s: any) => ({
        start: Number(s.start || 0),
        end: Number(s.end || 0),
        text: (s.text || '').trim(),
      }))
    : [];

  return {
    text: result.text || segments.map((s) => s.text).join(' '),
    segments,
  };
}

// Strips markdown fence blocks if a model returns ```json ... ```
export function cleanJsonString(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Robustly parses and extracts an array from any LLM JSON string,
 * whether it returned a root array [...] or an object { "items": [...], ... }
 */
export function extractJsonArray(raw: string): any[] {
  if (!raw || !raw.trim()) return [];
  const cleaned = cleanJsonString(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;

    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.items)) return parsed.items;
      if (Array.isArray(parsed.segments)) return parsed.segments;
      if (Array.isArray(parsed.lesson_items)) return parsed.lesson_items;
      if (Array.isArray(parsed.lessons)) return parsed.lessons;
      if (Array.isArray(parsed.data)) return parsed.data;

      // Find first array value in object
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val) && val.length > 0) return val;
      }
    }
  } catch (err) {
    // Attempt regex extraction of array if JSON had trailing characters
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // ignore
      }
    }
  }
  return [];
}
