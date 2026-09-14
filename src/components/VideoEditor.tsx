import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Tv,
  Smartphone,
  Palette,
  Volume2,
  Sparkles,
  Download,
  Settings,
  ChevronRight,
  Layers,
  Timer,
  CheckCircle2,
  HelpCircle,
  Eye,
  Sliders,
} from 'lucide-react';
import { Project, SceneDefinition, SubtitleStyleConfig, BrandingConfig } from '../types';
import { Locale, translations } from '../lib/i18n';

interface VideoEditorProps {
  project: Project;
  locale: Locale;
  onUpdateProject: (updatedProject: Project) => void;
  onProceedToExport: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  project,
  locale,
  onUpdateProject,
  onProceedToExport,
}) => {
  const t = translations[locale];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Studio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0); // 0 to 1
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [selectedVoice, setSelectedVoice] = useState<'sara' | 'arash' | 'nima'>('sara');
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);

  // Subtitle Style Customization
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleConfig>(
    project.subtitleStyle || {
      backgroundColor: '#0f172a',
      highlightColor: '#facc15',
      textColor: '#ffffff',
      fontSizePx: 28,
      fontFamily: 'Vazirmatn',
      showPersianSub: true,
      showEnglishSub: true,
      backgroundOpacity: 0.85,
    }
  );

  // Branding Customization
  const [branding, setBranding] = useState<BrandingConfig>(
    project.branding || {
      channelName: 'SpeakClip English',
      logoUrl: '',
      primaryColor: '#0ea5e9',
      introTitle: 'Master Spoken English from Real Speech',
      outroCtaText: 'Subscribe for daily spoken English lessons! • کانال یوتیوب ما را دنبال کنید',
    }
  );

  const scenes = project.scenes || [];
  const currentScene = scenes[activeSceneIndex] || scenes[0];

  // Animation frame loop for Canvas rendering
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying && currentScene) {
        setSceneProgress((prev) => {
          const next = prev + delta / (currentScene.duration || 5);
          if (next >= 1) {
            // Move to next scene
            if (activeSceneIndex < scenes.length - 1) {
              setActiveSceneIndex((idx) => idx + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 1;
            }
          }
          return next;
        });
      }

      drawCanvas();
      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, activeSceneIndex, currentScene, aspectRatio, subtitleStyle, sceneProgress]);

  // Helper to normalize scene type across snake_case and camelCase
  const getSceneType = (s?: SceneDefinition): string => {
    return s?.sceneType || s?.scene_type || 'original_clip';
  };

  // Main Canvas drawing logic
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background Fill
    ctx.clearRect(0, 0, width, height);

    if (!currentScene) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const sceneType = getSceneType(currentScene);

    // 1. Draw Scene Background based on type
    if (sceneType === 'branded_intro') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#0369a1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Intro Channel Banner
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(branding.channelName.toUpperCase(), width / 2, height / 2 - 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(currentScene.title || branding.introTitle, width / 2, height / 2 + 20);

      // Accent bar
      ctx.fillStyle = '#facc15';
      const barWidth = 240 * sceneProgress;
      ctx.fillRect(width / 2 - 120, height / 2 + 50, barWidth, 6);
    } else if (sceneType === 'pause_and_teach') {
      // Blurred navy backdrop
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Educational Card
      const cardMargin = aspectRatio === '16:9' ? 60 : 25;
      const cardW = width - cardMargin * 2;
      const cardH = height - cardMargin * 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      roundRect(ctx, cardMargin, cardMargin, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Card Header: Category Badge
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💡 SPEAKING LESSON & VOCABULARY', cardMargin + 30, cardMargin + 50);

      // Highlight term
      if (currentScene.highlightPhrase) {
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(`“${currentScene.highlightPhrase}”`, cardMargin + 30, cardMargin + 105);
      }

      // Persian Explanation Text
      if (currentScene.persianSub) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '26px Vazirmatn, Tahoma, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(currentScene.persianSub, width - cardMargin - 30, cardMargin + 180);
      }

      // English subtitle context
      if (currentScene.englishSub) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 20px sans-serif';
        ctx.textAlign = 'left';
        wrapText(ctx, `Context: "${currentScene.englishSub}"`, cardMargin + 30, cardMargin + 250, cardW - 60, 28);
      }
    } else if (sceneType === 'quiz' || sceneType === 'mini_quiz') {
      // Quiz Studio Canvas
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('⚡ QUICK PRACTICE QUIZ', width / 2, 80);

      // Question text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      wrapText(ctx, currentScene.englishSub || 'What does this idiom mean?', width / 2, 140, width - 100, 36);

      // Countdown Timer
      const remainingSecs = Math.max(0, Math.ceil(3 * (1 - sceneProgress)));
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 + 10, 45, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = remainingSecs > 1 ? '#eab308' : '#22c55e';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`${remainingSecs}`, width / 2, height / 2 + 22);

      // Answer reveal when progress > 60%
      if (sceneProgress > 0.6) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 24px Vazirmatn, sans-serif';
        ctx.fillText(`✓ ${currentScene.persianSub || 'پاسخ صحیح'}`, width / 2, height - 90);
      }
    } else if (sceneType === 'outro' || sceneType === 'summary_outro') {
      // Outro screen
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('WELL DONE! • درس به پایان رسید', width / 2, height / 2 - 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = '22px Vazirmatn, sans-serif';
      wrapText(ctx, branding.outroCtaText, width / 2, height / 2 + 30, width - 80, 32);
    } else {
      // Original clip or replay scene: simulate video playback with animated sound wave & captions
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(1, '#0b1329');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Simulated Speaker Frame / Center Graphic
      ctx.fillStyle = '#1e293b';
      roundRect(ctx, width / 2 - 120, height / 2 - 100, 240, 160, 16);
      ctx.fill();

      // Speaker Icon / Waves
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 20, 35, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sceneType === 'replay' || sceneType === 'replay_with_subtitles' ? 'REPLAY WITH SUBTITLES' : 'ORIGINAL SPEECH', width / 2, height / 2 + 40);

      // Subtitle Box at Bottom
      const boxW = width - 80;
      const boxH = 90;
      const boxX = 40;
      const boxY = height - boxH - 40;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      roundRect(ctx, boxX, boxY, boxW, boxH, 12);
      ctx.fill();

      // English Subtitle with Yellow highlight word
      if (currentScene.englishSub) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentScene.englishSub, width / 2, boxY + 38);
      }

      // Persian Subtitle
      if (subtitleStyle.showPersianSub && currentScene.persianSub) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '20px Vazirmatn, Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentScene.persianSub, width / 2, boxY + 72);
      }
    }

    // Top Channel Watermark
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(branding.channelName, 30, 36);

    // Scene badge indicator
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`SCENE ${activeSceneIndex + 1}/${scenes.length}`, width - 30, 36);
  };

  // Canvas helper for rounded rectangles
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Text wrap helper
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  };

  const handleTestVoice = () => {
    setIsSpeakingVoice(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSay =
        selectedVoice === 'sara'
          ? 'سلام! این نمونه صدای راوی فارسی برای تدریس اصطلاحات در ویدیوی شماست.'
          : 'درود به شما. با این ویژگی می‌توانید اصطلاحات انگلیسی را با بیان شیوا یاد بگیرید.';
      const utter = new SpeechSynthesisUtterance(textToSay);
      utter.lang = 'fa-IR';
      utter.rate = 1.0;
      utter.onend = () => setIsSpeakingVoice(false);
      utter.onerror = () => setIsSpeakingVoice(false);
      window.speechSynthesis.speak(utter);
    } else {
      setTimeout(() => setIsSpeakingVoice(false), 2000);
    }
  };

  const canvasWidth = aspectRatio === '16:9' ? 800 : 450;
  const canvasHeight = aspectRatio === '16:9' ? 450 : 800;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Studio Top Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t.videoEditor}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              {scenes.length} {locale === 'fa' ? 'سکانس' : 'Scenes'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {locale === 'fa'
              ? 'تایم‌لاین سکانس‌ها، کارت‌های آموزشی، استایل زیرنویس و صدای هوش مصنوعی را ویرایش کنید.'
              : 'Interactive scene timeline, custom Persian typography, and real-time canvas player.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                aspectRatio === '16:9'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>16:9 YouTube</span>
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                aspectRatio === '9:16'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16 Shorts</span>
            </button>
          </div>

          <button
            onClick={onProceedToExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>{t.renderVideo}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Video Canvas & Stage Controls */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-4">
            {/* HTML5 Canvas Stage */}
            <div
              className={`relative bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center transition-all ${
                aspectRatio === '16:9' ? 'w-full max-w-[800px] aspect-video' : 'w-[320px] sm:w-[360px] aspect-[9/16]'
              }`}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Playback Transport Bar */}
            <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    setActiveSceneIndex(0);
                    setSceneProgress(0);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Restart from beginning"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Scene progress scrubber */}
              <div className="flex-1 max-w-md mx-2">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-semibold text-slate-200">
                    {currentScene?.title || getSceneType(currentScene).replace(/_/g, ' ')}
                  </span>
                  <span>{Math.round(sceneProgress * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-100"
                    style={{ width: `${sceneProgress * 100}%` }}
                  />
                </div>
              </div>

              <span className="font-mono text-xs text-slate-400">
                {activeSceneIndex + 1} / {scenes.length}
              </span>
            </div>
          </div>

          {/* Interactive Scene Sequence Timeline */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{t.sceneTimeline}</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Click any scene block to preview immediately
              </span>
            </div>

            {/* Horizontal Timeline Blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {scenes.map((scene, idx) => {
                const isActive = activeSceneIndex === idx;
                const typeLabel = getSceneType(scene).replace(/_/g, ' ');
                return (
                  <button
                    key={scene.id}
                    onClick={() => {
                      setActiveSceneIndex(idx);
                      setSceneProgress(0);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">
                      0{idx + 1} • {scene.duration}s
                    </span>
                    <span className="text-xs font-bold text-slate-200 block truncate capitalize">
                      {typeLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      {scene.title || scene.highlightPhrase || 'Clip'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Studio Customizer (Subtitles, Branding, Persian AI Voice) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Subtitle Styling Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>{t.subtitleStyle}</span>
            </h3>

            {/* Subtitle Font Size */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Font Size</span>
                <span className="font-mono text-cyan-400">{subtitleStyle.fontSizePx}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="44"
                value={subtitleStyle.fontSizePx}
                onChange={(e) =>
                  setSubtitleStyle({ ...subtitleStyle, fontSizePx: parseInt(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Subtitle Language Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Show Persian Subtitle</span>
                <input
                  type="checkbox"
                  checked={subtitleStyle.showPersianSub}
                  onChange={(e) =>
                    setSubtitleStyle({ ...subtitleStyle, showPersianSub: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Show English Subtitle</span>
                <input
                  type="checkbox"
                  checked={subtitleStyle.showEnglishSub}
                  onChange={(e) =>
                    setSubtitleStyle({ ...subtitleStyle, showEnglishSub: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
              </label>
            </div>
          </div>

          {/* Persian Voiceover Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>{t.voiceoverSettings}</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sara', name: 'سارا (Sara)', role: 'Natural Teacher' },
                { id: 'arash', name: 'آرش (Arash)', role: 'Deep & Formal' },
                { id: 'nima', name: 'نیما (Nima)', role: 'Energetic' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    selectedVoice === v.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block">{v.name}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">{v.role}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleTestVoice}
              disabled={isSpeakingVoice}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <Volume2 className={`w-4 h-4 text-emerald-400 ${isSpeakingVoice ? 'animate-pulse' : ''}`} />
              <span>{isSpeakingVoice ? 'Playing Preview...' : 'Test Voice Audio'}</span>
            </button>
          </div>

          {/* Channel Branding */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>{t.brandingSettings}</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">YouTube Channel Name</label>
                <input
                  type="text"
                  value={branding.channelName}
                  onChange={(e) => setBranding({ ...branding, channelName: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Outro Call-to-Action</label>
                <input
                  type="text"
                  value={branding.outroCtaText}
                  onChange={(e) => setBranding({ ...branding, outroCtaText: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
