import React from 'react';
import { Video, Globe, FileText, BookOpen, Film, Download, Database, Home, Cpu, Sparkles } from 'lucide-react';
import { Locale, translations } from '../lib/i18n';
import { Project } from '../types';

interface HeaderProps {
  currentLocale: Locale;
  setLocale: (locale: Locale) => void;
  activeTab: 'dashboard' | 'wizard' | 'transcript' | 'lesson' | 'video' | 'export';
  setActiveTab: (tab: 'dashboard' | 'wizard' | 'transcript' | 'lesson' | 'video' | 'export') => void;
  currentProject: Project | null;
  onOpenArchitecture: () => void;
  onOpenAISettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocale,
  setLocale,
  activeTab,
  setActiveTab,
  currentProject,
  onOpenArchitecture,
  onOpenAISettings,
}) => {
  const t = translations[currentLocale];
  const isRTL = currentLocale === 'fa';

  const activeModelDisplay =
    currentProject?.aiModelConfig?.modelName || 'Gemini 2.5 Flash';
  const isLocal = currentProject?.aiModelConfig?.provider === 'local_ollama';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group transition-transform active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  SpeakClip <span className="text-cyan-400">AI</span>
                </span>
                <span className="hidden sm:block text-xs text-slate-400 font-medium">
                  {currentLocale === 'fa' ? 'تولید کلیپ‌های آموزشی یوتیوب' : 'Real Speech English Clip Studio'}
                </span>
              </div>
            </button>

            {currentProject && (
              <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-700/60 text-xs">
                <span className="text-slate-400 max-w-[180px] truncate font-medium">
                  {currentProject.title}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-semibold uppercase">
                  {currentProject.status}
                </span>
              </div>
            )}
          </div>

          {/* Center Navigation when in project */}
          {currentProject && activeTab !== 'dashboard' && activeTab !== 'wizard' && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'transcript'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.transcriptEditor}</span>
              </button>

              <button
                onClick={() => setActiveTab('lesson')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'lesson'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t.lessonEditor}</span>
                {currentProject.lessonItems.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                    {currentProject.lessonItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'video'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{t.videoEditor}</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'export'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.exportPage}</span>
              </button>
            </nav>
          )}

          {/* Right actions: Architecture modal + Language switch */}
          <div className="flex items-center gap-2.5">
            {currentProject && activeTab !== 'dashboard' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors border border-slate-700/50"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{t.dashboard}</span>
              </button>
            )}

            {/* AI Model / Provider Selector Button */}
            <button
              id="header-ai-model-btn"
              onClick={onOpenAISettings}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isLocal
                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-300 hover:bg-amber-900/40'
                  : 'bg-slate-850 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/60'
              }`}
              title={currentLocale === 'fa' ? 'تنظیمات مدل هوش مصنوعی' : 'AI Model & Provider Settings'}
            >
              {isLocal ? (
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden md:inline font-mono text-[11px] truncate max-w-[130px]">
                {activeModelDisplay}
              </span>
            </button>

            <button
              onClick={onOpenArchitecture}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-700/60"
              title="Architecture & Schema"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{t.architecture}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  currentLocale === 'en'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLocale('fa')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors font-persian ${
                  currentLocale === 'fa'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                فارسی
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
