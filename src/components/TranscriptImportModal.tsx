import React, { useState } from 'react';
import { X, Sparkles, Upload, FileText, Check, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import { Project, TranscriptSegment } from '../types';
import { parseAnyTranscriptInput, parseSrt, parseVtt } from '../lib/transcriptParser';
import { PRESET_CATALOG, getPresetProject } from '../data/presets';

interface TranscriptImportModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: Project) => void;
  locale: 'en' | 'fa';
}

export const TranscriptImportModal: React.FC<TranscriptImportModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
  locale,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'ai' | 'preset'>('ai');
  const [pastedText, setPastedText] = useState('');
  const [previewSegments, setPreviewSegments] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle pasting text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg(locale === 'fa' ? 'لطفاً ابتدا متنی را وارد کنید.' : 'Please enter text first.');
      return;
    }
    setErrorMsg(null);
    const parsed = parseAnyTranscriptInput(pastedText, project.mediaDuration || 120);
    if (parsed.length === 0) {
      setErrorMsg(locale === 'fa' ? 'متن قابل تفکیک یافت نشد.' : 'Could not detect valid sentences.');
      return;
    }
    setPreviewSegments(parsed);
    setSuccessMsg(
      locale === 'fa'
        ? `${parsed.length} بخش با تایم‌کد خودکار شناسایی شد.`
        : `${parsed.length} segments identified with automatic timestamps.`
    );
  };

  // Handle subtitle file (.srt / .vtt) upload
  const handleSubtitleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let parsed: TranscriptSegment[] = [];
      if (file.name.endsWith('.vtt')) {
        parsed = parseVtt(content);
      } else {
        parsed = parseSrt(content);
      }

      if (parsed.length === 0) {
        parsed = parseAnyTranscriptInput(content, project.mediaDuration || 120);
      }

      if (parsed.length === 0) {
        setErrorMsg(locale === 'fa' ? 'فایل زیرنویس نامعتبر بود.' : 'Invalid subtitle file format.');
        return;
      }

      setPreviewSegments(parsed);
      setSuccessMsg(
        locale === 'fa'
          ? `${parsed.length} بخش از فایل زیرنویس با موفقیت استخراج شد.`
          : `Extracted ${parsed.length} segments from subtitle file.`
      );
    };
    reader.readAsText(file);
  };

  // Handle AI Auto-generation based on project title
  const handleGenerateWithAI = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/generate-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          duration: project.mediaDuration || 120,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate speech text');

      if (Array.isArray(data.segments) && data.segments.length > 0) {
        setPreviewSegments(data.segments);
        setSuccessMsg(
          locale === 'fa'
            ? `${data.segments.length} جمله سخنرانی متناسب با عنوان ویدیو تولید شد.`
            : `Generated ${data.segments.length} authentic spoken sentences for this video.`
        );
      } else {
        throw new Error('No segments returned from generator');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating transcript');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle choosing a preset
  const handleSelectPreset = (key: string) => {
    const preset = getPresetProject(key);
    if (!preset) return;
    setPreviewSegments(preset.transcript.segments);
    setSuccessMsg(
      locale === 'fa'
        ? `متن سخنرانی الگو (${preset.title}) انتخاب شد.`
        : `Selected preset transcript (${preset.title}).`
    );
  };

  // Save to project
  const handleSaveToProject = async () => {
    if (previewSegments.length === 0) {
      setErrorMsg(locale === 'fa' ? 'هیچ متنی برای ذخیره انتخاب نشده است.' : 'No segments ready to save.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/transcript`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: previewSegments,
          fullText: previewSegments.map((s) => s.text).join(' '),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update transcript');

      onSave(data.project);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving transcript');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>
                {locale === 'fa'
                  ? 'جایگزینی یا وارد کردن متن گفتار این ویدیو'
                  : 'Import / Replace Video Speech Transcript'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {locale === 'fa'
                ? `پروژه: ${project.title}`
                : `Project: ${project.title}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ai'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'تولید با هوش مصنوعی' : 'AI Generation'}</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'paste'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'چسباندن متن (Paste)' : 'Paste Text'}</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'آپلود زیرنویس (.SRT / .VTT)' : 'Upload Subtitles'}</span>
          </button>

          <button
            onClick={() => setActiveTab('preset')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'preset'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'سخنرانی‌های آماده' : 'Speech Presets'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: AI GENERATION */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                {locale === 'fa'
                  ? 'هوش مصنوعی متنی گفتاری، اصیل و دارای تایم‌کد دقیق متناسب با عنوان این ویدیو ایجاد می‌کند تا بتوانید به عنوان پایه آموزش استفاده کنید.'
                  : 'AI will generate authentic spoken English speech segments with accurate timestamps tailored directly to your video title.'}
              </p>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono">
                {project.title}
              </div>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{locale === 'fa' ? 'در حال تولید متن...' : 'Generating speech...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {locale === 'fa'
                        ? 'تولید متن گفتار متناسب با عنوان ویدیو'
                        : 'Generate Speech Segments for Video'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs text-slate-400">
                {locale === 'fa'
                  ? 'متن کامل گفتار انگلیسی این ویدیو را در کادر زیر وارد کنید:'
                  : 'Paste the authentic spoken English transcript below:'}
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={5}
                placeholder="Example: Technology is evolving rapidly and we need to embrace new challenges. Most people hesitate because of fear..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                {locale === 'fa' ? 'تفکیک جملات و اعمال تایم‌کدها' : 'Parse Sentences & Set Timestamps'}
              </button>
            </div>
          )}

          {/* TAB 3: UPLOAD SUBTITLE */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-950/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={handleSubtitleFileUpload}
                  className="sr-only"
                />
                <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {locale === 'fa'
                    ? 'انتخاب فایل زیرنویس (.srt یا .vtt)'
                    : 'Choose .srt or .vtt subtitle file'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {locale === 'fa' ? 'تایم‌کدهای زیرنویس دقیقاً حفظ خواهند شد' : 'Exact subtitle timestamps will be imported'}
                </span>
              </label>
            </div>
          )}

          {/* TAB 4: SPEECH PRESETS */}
          {activeTab === 'preset' && (
            <div className="space-y-2.5">
              <span className="text-xs text-slate-400">
                {locale === 'fa' ? 'انتخاب از سخنرانی‌های ماندگار:' : 'Choose from iconic speeches:'}
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_CATALOG.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleSelectPreset(preset.key)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-left transition-colors flex items-start gap-2.5"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        {locale === 'fa' ? preset.nameFa : preset.nameEn}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {preset.idioms}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Preview of segments */}
          {previewSegments.length > 0 && (
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-cyan-400">
                  {locale === 'fa' ? 'پیش‌نمایش جملات آماده اعمال:' : 'Ready to apply segments:'} ({previewSegments.length})
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {previewSegments.map((seg, i) => (
                  <div
                    key={seg.id || i}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex items-start justify-between gap-2"
                  >
                    <span className="text-slate-300 leading-snug">{seg.text}</span>
                    <span className="font-mono text-[10px] text-cyan-400 shrink-0 bg-slate-900 px-1.5 py-0.5 rounded">
                      {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
          >
            {locale === 'fa' ? 'انصراف' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSaveToProject}
            disabled={previewSegments.length === 0 || isLoading}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>
              {locale === 'fa'
                ? `ذخیره و اعمال روی پروژه (${previewSegments.length} جمله)`
                : `Apply to Project (${previewSegments.length} segments)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
