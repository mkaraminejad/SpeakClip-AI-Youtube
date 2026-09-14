import React, { useState } from 'react';
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Zap,
  FileText,
  Subtitles,
  RefreshCw,
  Check,
} from 'lucide-react';
import { LearnerLevel, VideoFormat, TeachingTone, Project, AIProviderType, AIModelConfig, TranscriptSegment } from '../types';
import { Locale, translations } from '../lib/i18n';
import { parseAnyTranscriptInput, parseSrt, parseVtt } from '../lib/transcriptParser';

interface NewProjectWizardProps {
  locale: Locale;
  onCancel: () => void;
  onProjectCreated: (project: Project) => void;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  locale,
  onCancel,
  onProjectCreated,
}) => {
  const t = translations[locale];
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState<'fear_talk' | 'steve_jobs' | 'simon_sinek' | 'custom'>('fear_talk');
  const [projectTitle, setProjectTitle] = useState('Mastering Spoken English: Overcoming Fear & Taking Action');
  const [learnerLevel, setLearnerLevel] = useState<LearnerLevel>('B2');
  const [outputFormat, setOutputFormat] = useState<VideoFormat>('16:9');
  const [numSegments, setNumSegments] = useState<number>(5);
  const [tone, setTone] = useState<TeachingTone>('friendly');
  const [aiProvider, setAiProvider] = useState<AIProviderType>('gemini');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');
  const [localBaseUrl, setLocalBaseUrl] = useState<string>('http://localhost:11434/v1');
  const [legalConfirmed, setLegalConfirmed] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom Transcript & Subtitles State
  const [customTranscriptText, setCustomTranscriptText] = useState('');
  const [customSegments, setCustomSegments] = useState<TranscriptSegment[]>([]);
  const [isGeneratingCustomSpeech, setIsGeneratingCustomSpeech] = useState(false);
  const [transcriptTab, setTranscriptTab] = useState<'ai' | 'paste' | 'upload'>('ai');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedPresetKey('custom');
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setProjectTitle(cleanTitle);
      setCustomSegments([]);
      setCustomTranscriptText('');
    }
  };

  const handlePresetSelect = (key: 'fear_talk' | 'steve_jobs' | 'simon_sinek') => {
    setSelectedPresetKey(key);
    setSelectedFile(null);
    setCustomSegments([]);
    setCustomTranscriptText('');
    if (key === 'fear_talk') {
      setProjectTitle('Mastering Spoken English: Overcoming Fear & Taking Action');
    } else if (key === 'steve_jobs') {
      setProjectTitle('Steve Jobs: Connecting the Dots & Finding Your Purpose');
    } else {
      setProjectTitle('Simon Sinek: How Great Leaders Inspire Action (Start with Why)');
    }
  };

  const handleGenerateCustomSpeech = async () => {
    if (!projectTitle.trim()) {
      setErrorMsg('Please enter a project title first.');
      return;
    }
    setIsGeneratingCustomSpeech(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/generate-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          duration: selectedFile ? 180 : 120,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate transcript');
      if (Array.isArray(data.segments) && data.segments.length > 0) {
        setCustomSegments(data.segments);
        setCustomTranscriptText(data.fullText || data.segments.map((s: any) => s.text).join(' '));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating speech text');
    } finally {
      setIsGeneratingCustomSpeech(false);
    }
  };

  const handleCustomSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      let parsed: TranscriptSegment[] = [];
      if (file.name.endsWith('.vtt')) {
        parsed = parseVtt(text);
      } else {
        parsed = parseSrt(text);
      }

      if (parsed.length === 0) {
        parsed = parseAnyTranscriptInput(text, selectedFile ? 180 : 120);
      }

      setCustomSegments(parsed);
      setCustomTranscriptText(text);
    };
    reader.readAsText(file);
  };

  const handleParseCustomText = () => {
    if (!customTranscriptText.trim()) return;
    const parsed = parseAnyTranscriptInput(customTranscriptText, selectedFile ? 180 : 120);
    setCustomSegments(parsed);
  };

  const handleSubmit = async () => {
    if (!legalConfirmed) {
      setErrorMsg(t.legalCheckbox);
      return;
    }

    if (!projectTitle.trim()) {
      setErrorMsg('Please enter a valid project title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          nativeLanguage: 'fa',
          learnerLevel,
          outputFormat,
          numSegments,
          tone,
          legalConfirmed,
          mediaFileName: selectedFile ? selectedFile.name : 'speech_source_video.mp4',
          mediaDuration: selectedFile ? 180 : 184,
          sampleKey: selectedPresetKey,
          customTranscript: customTranscriptText || undefined,
          transcriptSegments: customSegments.length > 0 ? customSegments : undefined,
          aiModelConfig: {
            provider: aiProvider,
            modelName: aiModel,
            baseUrl: (aiProvider === 'local_ollama' || aiProvider === 'custom_compatible') ? localBaseUrl : undefined,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      onProjectCreated(data.project);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating project');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t.newProject}
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          {locale === 'fa'
            ? 'ویدئوی سخنرانی انگلیسی خود را بارگذاری کنید یا از نمونه‌های تاییدشده انتخاب نمایید.'
            : 'Transform real speech into an interactive, high-retention English lesson clip for YouTube.'}
        </p>
      </div>

      {/* Wizard Steps Indicator */}
      <div className="flex items-center justify-between max-w-md mx-auto relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              currentStep === step
                ? 'bg-cyan-500 text-white ring-4 ring-cyan-500/20 shadow-md shadow-cyan-500/30'
                : currentStep > step
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {currentStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Video/Audio Source */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-cyan-400" />
              <span>{t.step1Title}</span>
            </h3>

            {/* Presets Grid */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">{t.choosePresetSample}</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('fear_talk')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedPresetKey === 'fear_talk'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-xs text-slate-200">
                      {locale === 'fa' ? 'سخنرانی غلبه بر ترس (تیم فریس)' : 'Tim Ferriss Fear-Setting'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {locale === 'fa'
                      ? 'bite the bullet, put off, paralyzing fear, profound impact'
                      : 'Authentic idioms, high priority phrases, 3 min speech'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('steve_jobs')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedPresetKey === 'steve_jobs'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-xs text-slate-200">
                      {locale === 'fa' ? 'استیو جابز (استنفورد)' : 'Steve Jobs Stanford'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {locale === 'fa'
                      ? 'connect the dots, gut feeling, drop out, stay hungry'
                      : 'Iconic talk on trusting destiny, authentic speech & idioms'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('simon_sinek')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedPresetKey === 'simon_sinek'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-xs text-slate-200">
                      {locale === 'fa' ? 'سایمون سینک (شروع با چرا)' : 'Simon Sinek Start With Why'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {locale === 'fa'
                      ? 'gut decision, hold back, stand out, ripple effect'
                      : 'Golden Circle, leadership phrasal verbs, authentic delivery'}
                  </p>
                </button>
              </div>
            </div>

            {/* Custom Upload Dropzone */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">
                {locale === 'fa' ? 'یا آپلود فایل صوتی یا ویدیویی شخصی:' : 'Or upload your own MP4, MOV, MP3, or WAV:'}
              </span>
              <label className="relative border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/mp4"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-400 flex items-center justify-center transition-colors mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-200 text-center">
                  {selectedFile ? selectedFile.name : t.uploadDropzone}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  MP4, MOV, MP3, WAV (Up to 100MB, 2-8 minutes duration)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Educational Configuration */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>{t.step2Title}</span>
            </h3>

            {/* Project Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.projectTitle}</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder={t.projectTitlePlaceholder}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Custom Video Speech Transcript & Subtitles (Only when custom file/video selected) */}
            {selectedPresetKey === 'custom' && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-2">
                    <Subtitles className="w-4 h-4 text-cyan-400" />
                    <span>
                      {locale === 'fa'
                        ? 'متن گفتار و زیرنویس این ویدیو'
                        : 'Video Speech Transcript & Subtitles'}
                    </span>
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {customSegments.length > 0
                      ? `${customSegments.length} ${locale === 'fa' ? 'جمله آماده' : 'segments ready'}`
                      : locale === 'fa' ? 'انتخابی / خودکار' : 'Optional / Auto'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {locale === 'fa'
                    ? 'برای جلوگیری از متن تکراری پیش‌فرض، می‌توانید متن گفتار اختصاصی ویدیوی خود را وارد کنید، فایل زیرنویس آپلود نمایید، یا با هوش مصنوعی متن گفتار متناسب با عنوان بسازید.'
                    : 'Provide your own video script, upload a subtitle file (.srt), or let AI generate authentic speech tailored to your video title.'}
                </p>

                {/* Sub-tabs */}
                <div className="flex gap-2 border-b border-slate-800 pb-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTranscriptTab('ai')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                      transcriptTab === 'ai'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{locale === 'fa' ? 'تولید هوشمند با هوش مصنوعی' : 'AI Speech Generator'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTranscriptTab('paste')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                      transcriptTab === 'paste'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{locale === 'fa' ? 'چسباندن متن' : 'Paste Script'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTranscriptTab('upload')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                      transcriptTab === 'upload'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
                    }`}
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>{locale === 'fa' ? 'آپلود زیرنویس (.srt)' : 'Upload Subtitles'}</span>
                  </button>
                </div>

                {/* TAB 1: AI */}
                {transcriptTab === 'ai' && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateCustomSpeech}
                      disabled={isGeneratingCustomSpeech}
                      className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isGeneratingCustomSpeech ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{locale === 'fa' ? 'در حال ایجاد گفتار اختصاصی...' : 'Generating speech...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {locale === 'fa'
                              ? 'ایجاد متن گفتار متناسب با عنوان ویدیو'
                              : 'Generate Speech Transcript from Title'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* TAB 2: PASTE */}
                {transcriptTab === 'paste' && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={customTranscriptText}
                      onChange={(e) => setCustomTranscriptText(e.target.value)}
                      placeholder="Paste English speech lines here..."
                      rows={3}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleParseCustomText}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      {locale === 'fa' ? 'تفکیک جملات' : 'Parse Sentences'}
                    </button>
                  </div>
                )}

                {/* TAB 3: UPLOAD SUBTITLE */}
                {transcriptTab === 'upload' && (
                  <div className="pt-1">
                    <label className="border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-900/40 hover:bg-slate-900 transition-colors">
                      <input
                        type="file"
                        accept=".srt,.vtt,.txt"
                        onChange={handleCustomSubtitleUpload}
                        className="sr-only"
                      />
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-slate-300">
                        {locale === 'fa' ? 'انتخاب فایل SRT یا VTT' : 'Select .srt or .vtt subtitle file'}
                      </span>
                    </label>
                  </div>
                )}

                {/* Segments Preview */}
                {customSegments.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {locale === 'fa'
                          ? `${customSegments.length} جمله گفتاری برای آموزش تفکیک شد:`
                          : `${customSegments.length} authentic spoken sentences parsed:`}
                      </span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {customSegments.slice(0, 4).map((s, idx) => (
                        <div key={idx} className="text-[11px] text-slate-300 truncate bg-slate-950 p-1.5 rounded border border-slate-800">
                          {s.text}
                        </div>
                      ))}
                      {customSegments.length > 4 && (
                        <span className="text-[10px] text-slate-500">
                          +{customSegments.length - 4} more sentences
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Learner Level & Segments Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.targetLevel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['B1', 'B2', 'C1'] as LearnerLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLearnerLevel(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        learnerLevel === lvl
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.numSegmentsLabel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumSegments(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        numSegments === num
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {num} {locale === 'fa' ? 'بخش' : 'Clips'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Format & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.format}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['16:9', '9:16', 'both'] as VideoFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        outputFormat === fmt
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fmt === '16:9' ? '16:9 YouTube' : fmt === '9:16' ? '9:16 Shorts' : 'Both'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">{t.toneLabel}</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as TeachingTone)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="concise">{t.toneConcise}</option>
                  <option value="friendly">{t.toneFriendly}</option>
                  <option value="indepth">{t.toneIndepth}</option>
                </select>
              </div>
            </div>

            {/* AI Provider & Model Section */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>{t.aiModelSettings}</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {locale === 'fa' ? 'پشتیبانی از مدل‌های محلی و ابری' : 'Cloud & Local LLM Supported'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('gemini');
                    setAiModel('gemini-2.5-flash');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiProvider === 'gemini'
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Gemini</span>
                  </div>
                  <span className="text-[10px] opacity-75 block mt-0.5 font-mono">2.5 Flash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('groq');
                    setAiModel('llama-3.3-70b-versatile');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiProvider === 'groq'
                      ? 'border-amber-500 bg-amber-950/30 text-amber-200 ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Groq</span>
                  </div>
                  <span className="text-[10px] opacity-75 block mt-0.5 font-mono">Llama 3.3 (LPU)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('local_ollama');
                    setAiModel('llama3.2');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiProvider === 'local_ollama'
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Local LLM</span>
                  </div>
                  <span className="text-[10px] opacity-75 block mt-0.5 font-mono">Ollama (Offline)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('openai');
                    setAiModel('gpt-4o');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiProvider === 'openai'
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>OpenAI</span>
                  </div>
                  <span className="text-[10px] opacity-75 block mt-0.5 font-mono">GPT-4o</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiProvider('anthropic');
                    setAiModel('claude-3-5-sonnet-20241022');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    aiProvider === 'anthropic'
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Claude</span>
                  </div>
                  <span className="text-[10px] opacity-75 block mt-0.5 font-mono">3.5 Sonnet</span>
                </button>
              </div>

              {aiProvider === 'local_ollama' && (
                <div className="pt-2 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Model Name:</label>
                      <input
                        type="text"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder="llama3.2 or qwen2.5"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Ollama Base URL:</label>
                      <input
                        type="text"
                        value={localBaseUrl}
                        onChange={(e) => setLocalBaseUrl(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-300/80">
                    {locale === 'fa'
                      ? 'مدل محلی به صورت مستقیم و بدون ارسال داده به خارج از سیستم شما اجرا می‌شود.'
                      : 'Audio and transcript will be processed completely offline on your local machine.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Legal Confirmation & Finalize */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{t.step3Title}</span>
            </h3>

            {/* Legal Warning Box */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs text-amber-200 leading-relaxed">
              <span className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                {locale === 'fa' ? 'الزام حقوقی و کپی‌رایت' : 'Legal & Copyright Requirement'}
              </span>
              <p>{t.legalWarning}</p>
            </div>

            {/* Legal Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={legalConfirmed}
                onChange={(e) => setLegalConfirmed(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-medium text-slate-200 leading-normal">
                {t.legalCheckbox}
              </span>
            </label>

            {/* Summary Review */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{t.projectTitle}:</span>
                <span className="font-semibold text-slate-200">{projectTitle}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t.level} & {t.segments}:</span>
                <span className="font-semibold text-slate-200">
                  CEFR {learnerLevel} • {numSegments} Segments
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t.format}:</span>
                <span className="font-semibold text-slate-200">{outputFormat}</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => (s - 1) as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => (s + 1) as any)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !legalConfirmed}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? t.creating : t.createButton}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
