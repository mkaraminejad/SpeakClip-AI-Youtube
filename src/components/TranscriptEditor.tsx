import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Merge,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Volume2,
  Clock,
  Edit2,
  Check,
  RotateCcw,
  VolumeX,
} from 'lucide-react';
import { Project, TranscriptSegment } from '../types';
import { Locale, translations } from '../lib/i18n';

interface TranscriptEditorProps {
  project: Project;
  locale: Locale;
  onUpdateProject: (updatedProject: Project) => void;
  onProceedToLesson: () => void;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  project,
  locale,
  onUpdateProject,
  onProceedToLesson,
}) => {
  const t = translations[locale];
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(2.5);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Playback timer simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= project.mediaDuration) {
            setIsPlaying(false);
            return 0;
          }
          return Number((prev + 0.2).toFixed(1));
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, project.mediaDuration]);

  // Find active segment
  const activeSegment = project.transcript.segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  const handleToggleTeaching = (segmentId: string) => {
    const updatedSegments = project.transcript.segments.map((s) =>
      s.id === segmentId ? { ...s, isSelectedForTeaching: !s.isSelectedForTeaching } : s
    );
    saveSegments(updatedSegments);
  };

  const handleStartEdit = (segment: TranscriptSegment) => {
    setEditingSegmentId(segment.id);
    setEditingText(segment.text);
  };

  const handleSaveEdit = (segmentId: string) => {
    const updatedSegments = project.transcript.segments.map((s) =>
      s.id === segmentId ? { ...s, text: editingText } : s
    );
    setEditingSegmentId(null);
    saveSegments(updatedSegments);
  };

  const handleSplitSegment = (segmentId: string) => {
    const segIndex = project.transcript.segments.findIndex((s) => s.id === segmentId);
    if (segIndex === -1) return;

    const original = project.transcript.segments[segIndex];
    const midTime = Number(((original.start + original.end) / 2).toFixed(1));
    const words = original.text.split(' ');
    const halfLen = Math.max(1, Math.floor(words.length / 2));
    const text1 = words.slice(0, halfLen).join(' ');
    const text2 = words.slice(halfLen).join(' ');

    const seg1: TranscriptSegment = {
      id: `${original.id}_a`,
      start: original.start,
      end: midTime,
      text: text1,
      isSelectedForTeaching: original.isSelectedForTeaching,
    };

    const seg2: TranscriptSegment = {
      id: `${original.id}_b`,
      start: midTime,
      end: original.end,
      text: text2,
      isSelectedForTeaching: original.isSelectedForTeaching,
    };

    const newSegments = [...project.transcript.segments];
    newSegments.splice(segIndex, 1, seg1, seg2);
    saveSegments(newSegments);
  };

  const handleMergeWithNext = (segmentId: string) => {
    const segIndex = project.transcript.segments.findIndex((s) => s.id === segmentId);
    if (segIndex === -1 || segIndex >= project.transcript.segments.length - 1) return;

    const current = project.transcript.segments[segIndex];
    const next = project.transcript.segments[segIndex + 1];

    const merged: TranscriptSegment = {
      id: current.id,
      start: current.start,
      end: next.end,
      text: `${current.text} ${next.text}`,
      isSelectedForTeaching: current.isSelectedForTeaching || next.isSelectedForTeaching,
    };

    const newSegments = [...project.transcript.segments];
    newSegments.splice(segIndex, 2, merged);
    saveSegments(newSegments);
  };

  const saveSegments = async (segments: TranscriptSegment[]) => {
    const fullText = segments.map((s) => s.text).join(' ');
    const updated = {
      ...project,
      transcript: {
        ...project.transcript,
        segments,
        fullText,
      },
    };
    onUpdateProject(updated);

    // Persist to server
    try {
      await fetch(`/api/projects/${project.id}/transcript`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, fullText }),
      });
    } catch (e) {
      console.error('Failed to sync transcript changes', e);
    }
  };

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.project) {
        onUpdateProject(data.project);
        onProceedToLesson();
      }
    } catch (e) {
      console.error('AI analysis request failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredSegments = project.transcript.segments.filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t.transcriptEditor}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              {project.transcript.segments.length} {locale === 'fa' ? 'بخش زمانی' : 'Segments'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {locale === 'fa'
              ? 'متن استخراج شده از گفتار را مرور کنید، بخش‌های آموزشی را انتخاب نمایید و با هوش مصنوعی تحلیل کنید.'
              : 'Review speech-to-text timing, select key educational parts, and analyze with Gemini AI.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAnalyzing ? t.analyzingSpeech : t.analyzeWithAI}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Video Preview & Synchronized Audio Waveform Player */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Visual Stage Display */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 border-b border-slate-800/80">
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-mono text-cyan-400 border border-slate-800">
                <Clock className="w-3 h-3" />
                <span>{formatTime(currentTime)}</span>
              </div>

              {/* Speech Waveform Simulation */}
              <div className="w-full flex items-center justify-center gap-1 my-auto h-20 px-6">
                {[40, 65, 85, 30, 95, 55, 40, 75, 90, 60, 45, 80, 70, 35, 90, 50, 65, 85, 40, 30].map(
                  (height, i) => (
                    <div
                      key={i}
                      style={{
                        height: isPlaying ? `${Math.max(15, (height * (i % 3 + 1)) % 100)}%` : `${height * 0.4}%`,
                      }}
                      className={`w-1.5 rounded-full transition-all duration-150 ${
                        activeSegment ? 'bg-cyan-400' : 'bg-slate-700'
                      }`}
                    />
                  )
                )}
              </div>

              {/* Floating Subtitle Overlay */}
              <div className="w-full bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-center min-h-[58px] flex items-center justify-center">
                <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                  {activeSegment ? (
                    <span>
                      {activeSegment.words ? (
                        activeSegment.words.map((w, wIdx) => {
                          const isWordActive = currentTime >= w.start && currentTime <= w.end;
                          return (
                            <span
                              key={wIdx}
                              className={`transition-colors duration-100 ${
                                isWordActive
                                  ? 'bg-yellow-400 text-slate-950 px-1 py-0.5 rounded font-bold'
                                  : 'text-slate-200'
                              }`}
                            >
                              {w.word}{' '}
                            </span>
                          );
                        })
                      ) : (
                        activeSegment.text
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-xs">
                      {isPlaying ? 'Listening to speech...' : 'Press play to follow timestamps'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Playback Controls & Scrubber */}
            <div className="p-4 bg-slate-950/60 space-y-3">
              {/* Scrub Slider */}
              <input
                type="range"
                min="0"
                max={project.mediaDuration || 180}
                step="0.1"
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center transition-colors shadow-md shadow-cyan-500/20"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    onClick={() => setCurrentTime(0)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <span className="font-mono text-[11px] text-slate-300">
                  {formatTime(currentTime)} / {formatTime(project.mediaDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Helper */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <span className="font-semibold text-slate-200 block">
              {locale === 'fa' ? 'راهنمای انتخاب بخش‌های آموزشی:' : 'Teaching Selection Guide:'}
            </span>
            <p className="text-slate-400 leading-relaxed">
              {locale === 'fa'
                ? 'فقط جملاتی را انتخاب کنید که شامل اصطلاح، فعل دوقسمتی یا کالوکیشن واقعی باشند. هوش مصنوعی بخش‌های تیک‌خورده را برای ساخت کلیپ تدریس آنالیز خواهد کرد.'
                : 'Select sentences with genuine idioms, phrasal verbs, and collocations. Gemini AI extracts Persian explanations and quizzes for each selected segment.'}
            </p>
          </div>
        </div>

        {/* Right Side: Timestamped Segments List */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTranscript}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Segments Scroll Area */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredSegments.map((segment, index) => {
              const isSelected = segment.isSelectedForTeaching !== false;
              const isActive = currentTime >= segment.start && currentTime <= segment.end;
              const isEditing = editingSegmentId === segment.id;

              return (
                <div
                  key={segment.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-900 border-cyan-500/70 shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                      : isSelected
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Timestamp & Selection */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTeaching(segment.id)}
                        className={`p-1 rounded transition-colors ${
                          isSelected ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={isSelected ? t.selectedForTeaching : t.notSelected}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => {
                          setCurrentTime(segment.start);
                          setIsPlaying(true);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-cyan-300 font-mono text-[11px] border border-slate-800 flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </span>
                      </button>
                    </div>

                    {/* Segment Tools */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSplitSegment(segment.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
                        title={t.splitSegment}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </button>

                      {index < project.transcript.segments.length - 1 && (
                        <button
                          onClick={() => handleMergeWithNext(segment.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
                          title={t.mergeSegment}
                        >
                          <Merge className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() =>
                          isEditing ? handleSaveEdit(segment.id) : handleStartEdit(segment)
                        }
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
                        title="Edit text"
                      >
                        {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Text Body */}
                  <div className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed font-english">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={2}
                          className="w-full p-2 bg-slate-950 border border-cyan-500/50 rounded-lg text-xs sm:text-sm text-white focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingSegmentId(null)}
                            className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(segment.id)}
                            className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{segment.text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
