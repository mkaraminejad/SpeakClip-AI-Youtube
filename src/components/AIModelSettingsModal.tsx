/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { Locale, translations } from '../lib/i18n';
import { AIModelConfig, AIProviderType, Project } from '../types';

interface AIModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  currentProject: Project | null;
  onUpdateAIConfig?: (config: AIModelConfig) => void;
}

const PROVIDER_OPTIONS: {
  id: AIProviderType;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  icon: typeof Sparkles;
  badgeEn: string;
  badgeFa: string;
  models: { id: string; name: string; tag?: string }[];
  defaultModel: string;
  defaultBaseUrl?: string;
  requiresKey?: boolean;
}[] = [
  {
    id: 'gemini',
    nameEn: 'Google Gemini',
    nameFa: 'گوگل جمنای (Gemini)',
    descriptionEn: 'High-speed multimodal AI, native structured JSON, and excellent Persian fluency.',
    descriptionFa: 'سرعت فوق‌العاده، خروجی ساختاریافته دقیق و تسلط بالا بر زبان و ترجمه فارسی.',
    icon: Sparkles,
    badgeEn: 'Cloud • Recommended',
    badgeFa: 'ابری • توصیه شده',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Fastest & Cost-Efficient' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Deep Reasoning & Nuanced Idioms' },
    ],
    defaultModel: 'gemini-2.5-flash',
  },
  {
    id: 'groq',
    nameEn: 'Groq Cloud (Ultra-Fast LPU)',
    nameFa: 'گروک (Groq Cloud)',
    descriptionEn: 'Lightning-fast LPU inference (~500 tokens/sec) for instant transcription breakdowns.',
    descriptionFa: 'سرعت خارق‌العاده سخت‌افزار LPU (~۵۰۰ توکن در ثانیه) برای استخراج و ترجمه آنی.',
    icon: Zap,
    badgeEn: 'LPU • Sub-Second',
    badgeFa: 'فوق‌سریع • LPU',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', tag: 'Top Intelligence & Speed' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', tag: 'Blazing Fast (~800 t/s)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (MoE)', tag: 'Rich Context' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Google)', tag: 'Concise' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'local_ollama',
    nameEn: 'Local LLM (Ollama / LM Studio)',
    nameFa: 'مدل محلی (Ollama / LM Studio)',
    descriptionEn: '100% private, runs entirely on your GPU or local machine with zero API cost.',
    descriptionFa: '۱۰۰٪ محرمانه و آفلاین روی پردازنده کارت گرافیک شما، بدون هزینه API.',
    icon: Cpu,
    badgeEn: 'Self-Hosted • Private',
    badgeFa: 'روی سیستم شما • محرمانه',
    defaultBaseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2 (Meta)', tag: 'Lightweight & Sharp' },
      { id: 'qwen2.5', name: 'Qwen 2.5 (Alibaba)', tag: 'Strong Persian & Multi-language' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', tag: 'Reasoning Model' },
      { id: 'mistral', name: 'Mistral 7B / Nemo', tag: 'Reliable Grammatical Logic' },
    ],
    defaultModel: 'llama3.2',
  },
  {
    id: 'openai',
    nameEn: 'OpenAI',
    nameFa: 'اوپن‌ای‌آی (OpenAI)',
    descriptionEn: 'GPT-4o flagship models with native JSON schema instruction.',
    descriptionFa: 'مدل‌های استاندارد GPT-4o با قابلیت دریافت ساختار دقیق JSON.',
    icon: Zap,
    badgeEn: 'Cloud API',
    badgeFa: 'سرویس ابری',
    requiresKey: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', tag: 'Flagship' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'Fast & Economical' },
    ],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'anthropic',
    nameEn: 'Anthropic Claude',
    nameFa: 'آنتروپیک کلود (Claude)',
    descriptionEn: 'Claude 3.5 Sonnet known for natural literary and conversational pedagogy.',
    descriptionFa: 'کلود ۳.۵ سونت با توانمندی بالا در تفکیک سبک‌های بیانی و مکالمه.',
    icon: Server,
    badgeEn: 'Cloud API',
    badgeFa: 'سرویس ابری',
    requiresKey: true,
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tag: 'Top Quality' },
    ],
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'custom_compatible',
    nameEn: 'Custom OpenAI-Compatible',
    nameFa: 'سرویس‌های سازگار با OpenAI',
    descriptionEn: 'Connect to Groq, Together AI, OpenRouter, or your company vLLM server.',
    descriptionFa: 'اتصال به Groq، Together AI، OpenRouter یا سرورهای vLLM اختصاصی.',
    icon: Terminal,
    badgeEn: 'Custom Gateway',
    badgeFa: 'درگاه اختصاصی',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', tag: 'Ultra-Fast Groq' },
      { id: 'custom-model', name: 'Custom Model ID', tag: 'User Specified' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },
];

export function AIModelSettingsModal({
  isOpen,
  onClose,
  locale,
  currentProject,
  onUpdateAIConfig,
}: AIModelSettingsModalProps) {
  const t = translations[locale];

  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:11434/v1');
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Initialize from current project or default config
  useEffect(() => {
    if (currentProject?.aiModelConfig) {
      setSelectedProvider(currentProject.aiModelConfig.provider);
      setSelectedModel(currentProject.aiModelConfig.modelName);
      if (currentProject.aiModelConfig.baseUrl) {
        setBaseUrl(currentProject.aiModelConfig.baseUrl);
      }
    } else {
      // Fetch default config from server
      fetch('/api/ai/config')
        .then((r) => r.json())
        .then((data) => {
          if (data.current) {
            setSelectedProvider(data.current.provider || 'gemini');
            setSelectedModel(data.current.modelName || 'gemini-2.5-flash');
            if (data.current.baseUrl) setBaseUrl(data.current.baseUrl);
          }
        })
        .catch((e) => console.error('Could not fetch AI config:', e));
    }
  }, [currentProject, isOpen]);

  if (!isOpen) return null;

  const currentProviderDef = PROVIDER_OPTIONS.find((p) => p.id === selectedProvider) || PROVIDER_OPTIONS[0];

  const handleProviderChange = (providerId: AIProviderType) => {
    setSelectedProvider(providerId);
    setTestResult(null);
    setIsSaved(false);
    const def = PROVIDER_OPTIONS.find((p) => p.id === providerId);
    if (def) {
      setSelectedModel(def.defaultModel);
      if (def.defaultBaseUrl) {
        setBaseUrl(def.defaultBaseUrl);
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setIsSaved(false);

    const modelToTest = customModelInput.trim() || selectedModel;

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          modelName: modelToTest,
          baseUrl,
          apiKey: customApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: locale === 'fa' ? `اتصال موفق! پاسخ دریافت شد (${data.latencyMs}ms)` : `Connected successfully (${data.latencyMs}ms)`,
          latencyMs: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || (locale === 'fa' ? 'خطا در ارتباط با مدل' : 'Failed to connect to model'),
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || (locale === 'fa' ? 'عدم دسترسی به سرور' : 'Network error reaching model'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndApply = async () => {
    const finalModel = customModelInput.trim() || selectedModel;
    const newConfig: AIModelConfig = {
      provider: selectedProvider,
      modelName: finalModel,
      baseUrl: (selectedProvider === 'local_ollama' || selectedProvider === 'custom_compatible') ? baseUrl : undefined,
      apiKey: customApiKey || undefined,
    };

    if (currentProject) {
      try {
        await fetch(`/api/projects/${currentProject.id}/ai-config`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });
      } catch (e) {
        console.error('Failed to update project AI config', e);
      }
    }

    if (onUpdateAIConfig) {
      onUpdateAIConfig(newConfig);
    }

    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="ai-model-settings-modal"
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {t.aiModelSettings}
              </h2>
              <p className="text-xs text-slate-400">
                {t.providerNotice}
              </p>
            </div>
          </div>
          <button
            id="close-ai-settings-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
          {/* Provider Selection Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t.aiProvider}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROVIDER_OPTIONS.map((provider) => {
                const IconComponent = provider.icon;
                const isSelected = selectedProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    id={`provider-btn-${provider.id}`}
                    type="button"
                    onClick={() => handleProviderChange(provider.id)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/30 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-100 text-xs">
                          {locale === 'fa' ? provider.nameFa : provider.nameEn}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {locale === 'fa' ? provider.descriptionFa : provider.descriptionEn}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 self-start">
                      {locale === 'fa' ? provider.badgeFa : provider.badgeEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Options for Selected Provider */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {locale === 'fa' ? 'انتخاب یا تعیین مدل' : 'Select or Specify Model'}
              </label>
              <span className="text-xs text-slate-500 font-mono">
                {selectedProvider}
              </span>
            </div>

            {/* Radio / Model List */}
            <div className="space-y-2">
              {currentProviderDef.models.map((mod) => (
                <label
                  key={mod.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModel === mod.id && !customModelInput
                      ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="ai_model"
                      checked={selectedModel === mod.id && !customModelInput}
                      onChange={() => {
                        setSelectedModel(mod.id);
                        setCustomModelInput('');
                        setTestResult(null);
                      }}
                      className="accent-cyan-500"
                    />
                    <span className="font-medium text-sm text-slate-100">{mod.name}</span>
                  </div>
                  {mod.tag && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                      {mod.tag}
                    </span>
                  )}
                </label>
              ))}
            </div>

            {/* Custom Model Name (Useful for Ollama or new models) */}
            <div className="pt-2">
              <label className="block text-xs text-slate-400 mb-1">
                {locale === 'fa'
                  ? 'یا نام مدل دلخواه (مانند qwen2.5:14b یا deepseek-coder)'
                  : 'Or specify custom model name (e.g. qwen2.5:14b, deepseek-coder):'}
              </label>
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => {
                  setCustomModelInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder={selectedModel}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Base URL (For Local LLMs or Custom endpoints) */}
            {(selectedProvider === 'local_ollama' || selectedProvider === 'custom_compatible') && (
              <div className="pt-2 border-t border-slate-850 space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  {t.endpointUrl}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="http://localhost:11434/v1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  {selectedProvider === 'local_ollama'
                    ? (locale === 'fa'
                        ? 'برای اجرای محلی: دستور ollama run llama3.2 را در ترمینال خود اجرا کنید؛ سرور روی پورت ۱۱۴۳۴ در دسترس خواهد بود.'
                        : 'To run locally: run "ollama run llama3.2" in your terminal. Ollama provides an OpenAI-compatible /v1 endpoint on port 11434.')
                    : 'Endpoint should expose an OpenAI-compliant /chat/completions route.'}
                </p>
              </div>
            )}

            {/* Optional API Key for third-party providers */}
            {currentProviderDef.requiresKey && (
              <div className="pt-2 border-t border-slate-850 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    {selectedProvider === 'groq' ? 'Groq API Key (gsk_...)' : t.apiKeyOptional}
                  </label>
                  {selectedProvider === 'groq' && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2"
                    >
                      <span>{locale === 'fa' ? 'دریافت کلید رایگان از Groq' : 'Get free key on console.groq.com'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => {
                    setCustomApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={selectedProvider === 'groq' ? 'gsk_...' : 'sk-...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                {selectedProvider === 'groq' && (
                  <p className="text-[11px] text-slate-400">
                    {locale === 'fa'
                      ? 'سرعت پردازشگر LPU گروک بسیار بالا بوده و پلن رایگان با سرعت چندصد توکن در ثانیه ارائه می‌شود.'
                      : 'Groq LPUs process hundreds of tokens/sec with generous free rate limits.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latencyMs && (
                  <p className="text-[11px] opacity-80 font-mono">
                    Roundtrip Latency: {testResult.latencyMs}ms
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            id="test-ai-connection-btn"
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>{t.testingConnection}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.testConnection}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              id="cancel-ai-settings-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              {locale === 'fa' ? 'انصراف' : 'Cancel'}
            </button>
            <button
              id="apply-ai-settings-btn"
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition-all"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>{locale === 'fa' ? 'ذخیره شد!' : 'Applied!'}</span>
                </>
              ) : (
                <span>{currentProject ? t.useForProject : (locale === 'fa' ? 'اعمال تنظیمات' : 'Save & Apply')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
