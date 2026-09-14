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
  Volume1,
  Upload,
  Headphones,
  Music,
  Radio,
  FileAudio,
  FileText,
} from 'lucide-react';
import { Project, TranscriptSegment } from '../types';
import { Locale, translations } from '../lib/i18n';
import { TranscriptImportModal } from './TranscriptImportModal';

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
  const [volume, setVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Audio Mode: 'tts' (speech synthesis) or 'media' (real audio track)
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(project.mediaUrl || null);
  const [audioMode, setAudioMode] = useState<'tts' | 'media'>(project.mediaUrl ? 'media' : 'tts');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSpokenSegmentId = useRef<string | null>(null);

  // Synthesize English speech using Web Speech API
  const speakSegment = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isMuted) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = playbackSpeed;
      utterance.volume = isMuted ? 0 : volume;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Find active segment
  const activeSegment = project.transcript.segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Handle Play/Pause toggle
  const togglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);

    if (nextPlay) {
      if (audioMode === 'media' && localAudioUrl && audioRef.current) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.muted = isMuted;
        audioRef.current.volume = volume;
        audioRef.current.play().catch((err) => {
          console.warn('Audio play request failed or was blocked:', err);
        });
      } else if (audioMode === 'tts') {
        const target = activeSegment || project.transcript.segments.find((s) => s.start >= currentTime);
        if (target) {
          lastSpokenSegmentId.current = target.id;
          speakSegment(target.text);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  // Playback timer simulation (used for TTS mode or when no audio file is loaded)
  useEffect(() => {
    let interval: any;
    if (isPlaying && (audioMode === 'tts' || !localAudioUrl)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= project.mediaDuration) {
            setIsPlaying(false);
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            return 0;
          }
          return Number((prev + 0.2).toFixed(1));
        });
      }, 200 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, project.mediaDuration, audioMode, localAudioUrl, playbackSpeed]);

  // Synchronize TTS speech with active segment changes during playback
  useEffect(() => {
    if (isPlaying && audioMode === 'tts' && activeSegment) {
      if (activeSegment.id !== lastSpokenSegmentId.current) {
        lastSpokenSegmentId.current = activeSegment.id;
        speakSegment(activeSegment.text);
      }
    }
  }, [activeSegment?.id, isPlaying, audioMode]);

  // Sync volume / mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
    if (isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isMuted, volume]);

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalAudioUrl(url);
      setAudioMode('media');
      setIsPlaying(false);
      setCurrentTime(0);

      const updated = {
        ...project,
        mediaUrl: url,
        mediaFileName: file.name,
      };
      onUpdateProject(updated);
    }
  };

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

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 hover:border-cyan-500/50 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>
              {locale === 'fa' ? 'جایگزینی / وارد کردن متن' : 'Import / Replace Transcript'}
            </span>
          </button>

          <button
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
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

            {/* Hidden Audio Element for authentic media playback */}
            {localAudioUrl && (
              <audio
                ref={audioRef}
                src={localAudioUrl}
                preload="auto"
                onTimeUpdate={() => {
                  if (audioRef.current && audioMode === 'media') {
                    setCurrentTime(Number(audioRef.current.currentTime.toFixed(1)));
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                }}
              />
            )}

            {/* Hidden file input for uploading custom audio */}
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*,video/*"
              onChange={handleAudioFileUpload}
              className="hidden"
            />

            {/* Playback Controls & Scrubber */}
            <div className="p-4 bg-slate-950/80 space-y-3 border-t border-slate-800/80">
              {/* Scrub Slider */}
              <input
                type="range"
                min="0"
                max={project.mediaDuration || 180}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const newTime = parseFloat(e.target.value);
                  setCurrentTime(newTime);
                  if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
                  }
                  if (audioMode === 'tts' && isPlaying) {
                    window.speechSynthesis?.cancel();
                  }
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center transition-all shadow-md shadow-cyan-500/20 active:scale-95"
                    title={isPlaying ? t.pause : t.play}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTime(0);
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                      }
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      setIsSpeaking(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Mute & Volume */}
                  <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        if (val > 0 && isMuted) setIsMuted(false);
                      }}
                      className="w-14 h-1 bg-slate-800 rounded appearance-none accent-cyan-400 cursor-pointer"
                      title={`Volume: ${Math.round(volume * 100)}%`}
                    />
                  </div>

                  {/* Playback Speed */}
                  <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-mono">
                    {[0.8, 1.0, 1.25].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          if (audioRef.current) {
                            audioRef.current.playbackRate = speed;
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          playbackSpeed === speed
                            ? 'bg-cyan-500 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-300">
                    {formatTime(currentTime)} / {formatTime(project.mediaDuration)}
                  </span>
                </div>
              </div>

              {/* Audio Source Engine Switch & Status Bar */}
              <div className="pt-2 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">
                    {locale === 'fa' ? 'منبع صوتی:' : 'Audio Engine:'}
                  </span>

                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => {
                        setAudioMode('tts');
                        if (audioRef.current) audioRef.current.pause();
                      }}
                      className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                        audioMode === 'tts'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={locale === 'fa' ? 'سنتز صوتی تلفظ هوشمند کلمات' : 'Browser Web Speech English TTS'}
                    >
                      <Headphones className="w-3 h-3" />
                      <span>{locale === 'fa' ? 'سنتز صوتی (TTS)' : 'Web Speech TTS'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!localAudioUrl) {
                          fileInputRef.current?.click();
                        } else {
                          setAudioMode('media');
                          window.speechSynthesis?.cancel();
                        }
                      }}
                      className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                        audioMode === 'media'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={locale === 'fa' ? 'پخش فایل صوتی اصلی گفتار' : 'Original speech audio track'}
                    >
                      <FileAudio className="w-3 h-3" />
                      <span>
                        {localAudioUrl
                          ? locale === 'fa'
                            ? 'فایل صوتی اصلی'
                            : 'Original Audio'
                          : locale === 'fa'
                          ? 'پیوست فایل صوتی'
                          : 'Attach Audio'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Upload or Audio Status */}
                <div className="flex items-center gap-2">
                  {isSpeaking && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30 animate-pulse">
                      <Volume2 className="w-3 h-3" />
                      <span>{locale === 'fa' ? 'در حال تلفظ صدا...' : 'Audio playing...'}</span>
                    </span>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 underline underline-offset-2 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    <span>
                      {localAudioUrl
                        ? locale === 'fa'
                          ? 'تغییر فایل صوتی'
                          : 'Change audio'
                        : locale === 'fa'
                        ? 'بارگذاری فایل صوتی (.mp3)'
                        : 'Upload .mp3 file'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Audio Note & Stats Helper */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Headphones className="w-4 h-4" />
              <span>{locale === 'fa' ? 'نحوه پخش صدا در این بخش:' : 'Audio Playback Guide:'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {locale === 'fa'
                ? 'با زدن دکمه Play یا دکمه «پخش صدا» در کنار هر جمله، تلفظ انگلیسی جمله با صدای طبیعی (TTS) پخش می‌شود. همچنین می‌توانید فایل صوتی واقعی سخنرانی (.mp3 یا .wav) را با دکمه بالا اضافه کنید تا صدای اصلی گوینده پخش شود.'
                : 'Press Play or the "Listen" button beside each sentence to hear natural English pronunciation via Web Speech TTS. You can also upload your authentic audio track (.mp3 or .wav) to play the speaker\'s original voice.'}
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
            {filteredSegments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
                <FileText className="w-10 h-10 text-cyan-400 mx-auto opacity-80" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {locale === 'fa' ? 'هنوز متنی برای این ویدیو ثبت نشده است' : 'No speech segments found for this video'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {locale === 'fa'
                      ? 'می‌توانید متن گفتار این ویدیو را پیست کنید، فایل زیرنویس آپلود نمایید یا با هوش مصنوعی جملات گفتاری بسازید.'
                      : 'You can paste speech text, upload subtitles, or let AI generate spoken sentences matching your video.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{locale === 'fa' ? 'وارد کردن یا تولید متن ویدیو' : 'Import or Generate Transcript'}</span>
                </button>
              </div>
            ) : (
              filteredSegments.map((segment, index) => {
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
                    <div className="flex flex-wrap items-center gap-2">
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
                          if (audioMode === 'media' && localAudioUrl && audioRef.current) {
                            audioRef.current.currentTime = segment.start;
                            audioRef.current.play();
                            setIsPlaying(true);
                          } else {
                            speakSegment(segment.text);
                            setIsPlaying(true);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 hover:text-cyan-300 font-mono text-[11px] border border-slate-800 flex items-center gap-1 transition-colors"
                        title={locale === 'fa' ? 'پرش به این زمان و پخش' : 'Seek and play'}
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </span>
                      </button>

                      {/* Quick Listen Button */}
                      <button
                        onClick={() => {
                          setCurrentTime(segment.start);
                          if (audioMode === 'media' && localAudioUrl && audioRef.current) {
                            audioRef.current.currentTime = segment.start;
                            audioRef.current.play();
                            setIsPlaying(true);
                          } else {
                            speakSegment(segment.text);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 font-mono text-[11px] flex items-center gap-1 transition-colors"
                        title={locale === 'fa' ? 'شنیدن تلفظ این جمله' : 'Listen to this sentence'}
                      >
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px]">{locale === 'fa' ? 'شنیدن صدا' : 'Listen'}</span>
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
            })
          )}
          </div>
        </div>
      </div>

      {/* Transcript Import & Generation Modal */}
      <TranscriptImportModal
        project={project}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSave={onUpdateProject}
        locale={locale}
      />
    </div>
  );
};
