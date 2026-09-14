import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Video,
  FileSpreadsheet,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
  Clock,
  Youtube,
  Layers,
  Share2,
  Play,
} from 'lucide-react';
import { Project } from '../types';
import { Locale, translations } from '../lib/i18n';

interface ExportPageProps {
  project: Project;
  locale: Locale;
  onUpdateProject: (updatedProject: Project) => void;
}

export const ExportPage: React.FC<ExportPageProps> = ({ project, locale, onUpdateProject }) => {
  const t = translations[locale];

  // Pipeline Rendering Simulation State
  const [renderProgress, setRenderProgress] = useState(100);
  const [isRendering, setIsRendering] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const startRenderPipeline = () => {
    setIsRendering(true);
    setRenderProgress(0);

    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRendering(false);
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // 1. Generate English SRT
  const generateEnglishSRT = () => {
    let srt = '';
    project.transcript.segments.forEach((seg, i) => {
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      srt += `${i + 1}\n`;
      srt += `${formatTime(seg.start)} --> ${formatTime(seg.end)}\n`;
      srt += `${seg.text}\n\n`;
    });
    return srt;
  };

  // 2. Generate Persian SRT
  const generatePersianSRT = () => {
    let srt = '';
    project.lessonItems.forEach((item, i) => {
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      srt += `${i + 1}\n`;
      srt += `${formatTime(item.start_time)} --> ${formatTime(item.end_time)}\n`;
      srt += `${item.Persian_translation}\n\n`;
    });
    return srt;
  };

  // 3. Generate Markdown Lesson Notes
  const generateMarkdownNotes = () => {
    let md = `# ${project.title}\n\n`;
    md += `**Target Level:** CEFR ${project.learnerLevel} | **Duration:** ${Math.floor(project.mediaDuration / 60)} mins\n\n`;
    md += `## 📚 Key Expressions & Idioms\n\n`;

    project.lessonItems.forEach((item, idx) => {
      md += `### ${idx + 1}. "${item.original_sentence}"\n`;
      md += `**ترجمه فارسی:** ${item.Persian_translation}\n\n`;
      md += `**توضیح آموزشی:** ${item.Persian_explanation}\n\n`;

      if (item.idioms.length > 0) {
        md += `#### 💡 Idioms:\n`;
        item.idioms.forEach((idm) => {
          md += `- **${idm.term}** (${idm.persian_equivalent}): ${idm.meaning_in_context}\n`;
          md += `  *Example:* "${idm.natural_example}"\n`;
        });
        md += `\n`;
      }

      if (item.phrasal_verbs.length > 0) {
        md += `#### 🔄 Phrasal Verbs:\n`;
        item.phrasal_verbs.forEach((pv) => {
          md += `- **${pv.term}** (${pv.persian_equivalent}): ${pv.meaning_in_context}\n`;
          md += `  *Example:* "${pv.natural_example}"\n`;
        });
        md += `\n`;
      }

      if (item.collocations.length > 0) {
        md += `#### 🤝 Collocations:\n`;
        item.collocations.forEach((col) => {
          md += `- **${col.term}** (${col.persian_equivalent}): ${col.meaning_in_context}\n`;
        });
        md += `\n`;
      }

      if (item.comprehension_question) {
        md += `#### ⚡ Mini Quiz:\n`;
        md += `**Q:** ${item.comprehension_question.question_en}\n`;
        md += `**Answer:** ${item.comprehension_question.options[item.comprehension_question.correct_option_index]}\n\n`;
      }

      md += `---\n\n`;
    });

    return md;
  };

  // 4. Generate CSV Vocabulary
  const generateVocabCSV = () => {
    let csv = 'Term,Type,Persian Equivalent,Context Meaning,Example Sentence\n';
    project.lessonItems.forEach((item) => {
      const allExps = [...item.idioms, ...item.phrasal_verbs, ...item.collocations, ...item.key_vocabulary];
      allExps.forEach((exp) => {
        const cleanStr = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
        csv += `${cleanStr(exp.term)},${cleanStr(exp.type)},${cleanStr(exp.persian_equivalent)},${cleanStr(exp.meaning_in_context)},${cleanStr(exp.natural_example || '')}\n`;
      });
    });
    return csv;
  };

  // Download Trigger helper
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // YouTube Description
  const youtubeDescriptionText = `آموزش انگلیسی با سخنرانی واقعی: ${project.title}
سطح آموزش: CEFR ${project.learnerLevel}

در این ویدیو، اصطلاحات محاوره‌ای، افعال دوقسمتی و ساختارهای کاربردی این سخنرانی را همراه با توضیح فارسی روان یاد می‌گیریم.

⏱️ زمان‌بندی بخش‌ها (Timestamps):
00:00 مقدمه و شروع
00:05 پخش سخنرانی اصلی
00:30 تحلیل اصطلاحات و نکات فارسی
01:45 تمرین و تکرار با زیرنویس دو زبانه
02:30 کوئیز سنجش یادگیری
03:10 جمع‌بندی اصطلاحات

📌 اصطلاحات یادگرفته شده:
${project.lessonItems
  .flatMap((it) => it.idioms.map((idm) => `• ${idm.term}: ${idm.persian_equivalent}`))
  .join('\n')}

🔔 برای تماشای کلیپ‌های روزانه، کانال یوتیوب را سابسکرایب کنید!

#آموزش_زبان_انگلیسی #اصطلاحات_انگلیسی #EnglishLesson #LearnEnglish #Idioms`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t.exportPage}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              Ready to Export
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {locale === 'fa'
              ? 'ویدیوی نهایی 1080p، زیرنویس‌های SRT، جزوه متنی و بسته سئوی یوتیوب را دانلود کنید.'
              : 'Export high-definition video, bilingual SRT subtitles, Markdown notes, and YouTube SEO pack.'}
          </p>
        </div>

        <button
          onClick={startRenderPipeline}
          disabled={isRendering}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isRendering ? 'Processing Pipeline...' : 'Re-render Video Pipeline'}</span>
        </button>
      </div>

      {/* Pipeline Status Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>FFmpeg Scene & Subtitle Pipeline Status</span>
          </span>
          <span className="text-xs font-mono font-bold text-cyan-400">{renderProgress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${renderProgress}%` }}
          />
        </div>

        {/* Pipeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Audio Extraction</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pedagogical Analysis</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Persian Subtitle Burn-in</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>1080p 30fps Packaging</span>
          </div>
        </div>
      </div>

      {/* Artifacts Download Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MP4/WebM Video */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 flex flex-col justify-between transition-colors space-y-4 group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Video className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">Educational Video</h4>
            <p className="text-xs text-slate-400">
              Full 1080p clip with animated yellow highlights, Persian cards, and mini quiz.
            </p>
          </div>
          <button
            onClick={() =>
              triggerDownload(
                'RIFF....WEBM', // Binary mockup
                `${(project?.title || 'english_lesson').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_1080p.webm`,
                'video/webm'
              )
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadMP4}</span>
          </button>
        </div>

        {/* English SRT */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-colors space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">English Subtitles</h4>
            <p className="text-xs text-slate-400">
              Standard UTF-8 SRT file with millisecond word timestamps.
            </p>
          </div>
          <button
            onClick={() =>
              triggerDownload(
                generateEnglishSRT(),
                `${(project?.title || 'english_lesson').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_en.srt`,
                'text/plain'
              )
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadSRTEn}</span>
          </button>
        </div>

        {/* Persian SRT */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-colors space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">Persian Subtitles</h4>
            <p className="text-xs text-slate-400">
              Natural Persian translation SRT for YouTube closed captions.
            </p>
          </div>
          <button
            onClick={() =>
              triggerDownload(
                generatePersianSRT(),
                `${(project?.title || 'english_lesson').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_fa.srt`,
                'text/plain'
              )
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadSRTFa}</span>
          </button>
        </div>

        {/* Lesson Notes (Markdown) & CSV */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-colors space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">Study Materials</h4>
            <p className="text-xs text-slate-400">
              Printable Markdown lesson summary and Anki-ready CSV vocabulary.
            </p>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() =>
                triggerDownload(
                  generateMarkdownNotes(),
                  `${(project?.title || 'english_lesson').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_notes.md`,
                  'text/markdown'
                )
              }
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Lesson Notes (.md)</span>
            </button>
            <button
              onClick={() =>
                triggerDownload(
                  generateVocabCSV(),
                  `${(project?.title || 'english_lesson').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_vocab.csv`,
                  'text/csv'
                )
              }
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Vocabulary List (.csv)</span>
            </button>
          </div>
        </div>
      </div>

      {/* YouTube SEO & Metadata Description Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400">
            <Youtube className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">{t.youtubeMetadata}</h3>
          </div>

          <button
            onClick={() => copyToClipboard(youtubeDescriptionText, 'yt_desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors border border-slate-700"
          >
            {copiedSection === 'yt_desc' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedSection === 'yt_desc' ? t.copySuccess : 'Copy Description'}</span>
          </button>
        </div>

        <pre
          className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-persian overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64"
          dir="rtl"
        >
          {youtubeDescriptionText}
        </pre>
      </div>
    </div>
  );
};
