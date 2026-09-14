import React, { useState } from 'react';
import { X, Layers, Database, Cpu, GitBranch, CheckCircle2, Copy, Check } from 'lucide-react';
import { Locale } from '../lib/i18n';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose, locale }) => {
  const [activeSubTab, setActiveSubTab] = useState<'diagram' | 'schema' | 'pipeline' | 'milestones'>('diagram');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const prismaSchemaCode = `// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String?
  projects      Project[]
  brandProfiles BrandProfile[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Project {
  id              String             @id @default(uuid())
  userId          String
  user            User               @relation(fields: [userId], references: [id])
  title           String
  description     String?
  status          String             @default("uploaded") // uploaded, transcribing, analyzing, ready, rendering, completed, failed
  nativeLanguage  String             @default("fa")
  learnerLevel    String             @default("B2")       // B1, B2, C1
  outputFormat    String             @default("16:9")     // 16:9, 9:16, both
  numSegments     Int                @default(5)
  tone            String             @default("friendly") // concise, friendly, indepth
  legalConfirmed  Boolean            @default(true)
  
  uploadedAssets  UploadedAsset[]
  transcript      Transcript?
  lessonItems     LessonItem[]
  scenes          SceneDefinition[]
  renderJobs      RenderJob[]
  exports         ExportArtifact[]
  
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

model UploadedAsset {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  fileName    String
  fileSize    Int
  mimeType    String
  s3Key       String
  durationSec Float
  createdAt   DateTime @default(now())
}

model Transcript {
  id          String              @id @default(uuid())
  projectId   String              @unique
  project     Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  language    String              @default("en")
  fullText    String
  segments    TranscriptSegment[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model TranscriptSegment {
  id              String     @id @default(uuid())
  transcriptId    String
  transcript      Transcript @relation(fields: [transcriptId], references: [id], onDelete: Cascade)
  startTime       Float
  endTime         Float
  text            String
  wordsJson       Json       // [{ word: "put", start: 2.1, end: 2.4 }, ...]
  isTeachingCandidate Boolean @default(true)
}

model LessonItem {
  id                      String   @id @default(uuid())
  projectId               String
  project                 Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  segmentIndex            Int
  originalSentence        String
  startTime               Float
  endTime                 Float
  cleanTranscript         String
  persianTranslation      String
  cefrLevel               String   // B1, B2, C1
  keyVocabulary           Json     // ExpressionDetail[]
  idioms                  Json     // ExpressionDetail[]
  phrasalVerbs            Json     // ExpressionDetail[]
  collocations            Json     // ExpressionDetail[]
  usefulGrammarPattern    Json?    // { pattern_name, explanation_en, explanation_fa, example }
  pronunciationNotes      String?
  culturalOrContextNote   String?
  simpleEnglishExplanation String
  persianExplanation      String
  exampleSentences        Json     // string[]
  comprehensionQuestion   Json     // { question_en, question_fa, options, correct_index, explanation_fa }
  answer                  String
  teachingPriorityScore   Int      @default(8) // 1 - 10
  manualNotes             String?
  isSelectedForTeaching   Boolean  @default(true)
  narrationScriptFa       String
}

model SceneDefinition {
  id                   String   @id @default(uuid())
  projectId            String
  project              Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sceneType            String   // branded_intro, original_clip, pause_and_teach, replay, quiz, outro
  startTime            Float
  duration             Float
  sourceRangeStart     Float?
  sourceRangeEnd       Float?
  title                String?
  persianTitle         String?
  englishSub           String?
  persianSub           String?
  highlightPhrase      String?
  animationStyle       String   @default("fade")
  backgroundMusicVol   Float    @default(0.15)
  orderIndex           Int      @default(0)
}

model RenderJob {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status      String   @default("queued") // queued, processing, completed, failed
  progress    Int      @default(0)
  targetFps   Int      @default(30)
  resolution  String   @default("1080p")
  outputS3Key String?
  errorMessage String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ExportArtifact {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  exportType  String   // mp4_16_9, mp4_9_16, srt_en, srt_fa, notes_md, vocab_csv
  s3Url       String
  fileSize    Int
  createdAt   DateTime @default(now())
}

model BrandProfile {
  id             String  @id @default(uuid())
  userId         String
  user           User    @relation(fields: [userId], references: [id])
  channelName    String
  channelTagline String?
  primaryColor   String  @default("#0f172a")
  accentColor    String  @default("#06b6d4")
  highlightColor String  @default("#facc15")
  introTitle     String  @default("Learn English from Real Speech")
  outroCtaTextEn String  @default("Subscribe for more lessons")
  outroCtaTextFa String  @default("عضو کانال شوید")
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SpeakClip AI Technical Architecture</h2>
              <p className="text-xs text-slate-400">Full-Stack Design, PostgreSQL Schema, FFmpeg Pipeline & Milestones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-800 bg-slate-900/50 text-xs">
          <button
            onClick={() => setActiveSubTab('diagram')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'diagram'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Architecture Diagram
          </button>
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'schema'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Prisma / PostgreSQL Schema
          </button>
          <button
            onClick={() => setActiveSubTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'pipeline'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            FFmpeg & Scene Timeline
          </button>
          <button
            onClick={() => setActiveSubTab('milestones')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'milestones'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Implementation Milestones
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {activeSubTab === 'diagram' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client Layer */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">1. Client Layer</div>
                  <h3 className="font-semibold text-white">React + Tailwind + RTL Engine</h3>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Bilingual UI (Persian RTL & English LTR)</li>
                    <li>• Interactive Transcript with word timestamps</li>
                    <li>• Real-time HTML5 Canvas Video Preview</li>
                    <li>• In-browser MediaRecorder Video Render</li>
                    <li>• Multi-track Scene Timeline Editor</li>
                  </ul>
                </div>

                {/* API & Worker Layer */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">2. Processing & AI Core</div>
                  <h3 className="font-semibold text-white">Express Backend + Gemini 3.8</h3>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Gemini 3.8 Flash structured JSON extraction</li>
                    <li>• Non-hallucinatory linguistic verification</li>
                    <li>• CEFR B1-C1 grading & Persian translation</li>
                    <li>• Idioms, phrasal verbs, collocations detector</li>
                    <li>• Whisper-compatible audio segmentation</li>
                  </ul>
                </div>

                {/* Video & Storage Layer */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">3. Video & Export Engine</div>
                  <h3 className="font-semibold text-white">FFmpeg & Scene Pipeline</h3>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• JSON Scene Timeline specification</li>
                    <li>• 16:9 YouTube & 9:16 Shorts support</li>
                    <li>• Persian shaped RTL subtitle rendering</li>
                    <li>• SRT subtitles (EN & FA) generator</li>
                    <li>• Markdown & CSV vocabulary exporters</li>
                  </ul>
                </div>
              </div>

              {/* Data Flow Diagram Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
{`+-----------------------+      +---------------------------+      +--------------------------+
|  User Video / Audio   | ---> |  Transcription Engine     | ---> |  AI Pedagogical Engine   |
|  (MP4, MOV, MP3, WAV) |      |  (Whisper / Gemini 3.8)   |      |  (Gemini 3.8 Flash JSON) |
+-----------------------+      +---------------------------+      +--------------------------+
                                             |                                  |
                                             v                                  v
                                  Word Timestamps & Clauses        Idioms, Collocations, Quiz
                                             |                                  |
                                             +----------------+-----------------+
                                                              |
                                                              v
+----------------------------------------------------------------------------------------+
|                          Editable Lesson & Scene Timeline                              |
|   1. Branded Intro (3s)                                                                |
|   2. Original Speech Clip (5-18s) with Word-by-Word Highlight                          |
|   3. Pause & Teach: Blurred Frame + Persian Translation + Idiom breakdown + Examples   |
|   4. Replay with Bilingual Subtitles                                                   |
|   5. Mini Quiz: Question -> 3s Countdown -> Revealed Correct Option                    |
|   6. Outro Summary & Subscribe Call-to-Action                                          |
+----------------------------------------------------------------------------------------+
                                                              |
                                                              v
                                  +---------------------------------------+
                                  |  FFmpeg / Canvas Video Render Engine  |
                                  |  -> 1080p MP4/WebM Video              |
                                  |  -> English & Persian SRT             |
                                  |  -> Markdown Lesson Notes & CSV Vocab |
                                  +---------------------------------------+`}
              </div>
            </div>
          )}

          {activeSubTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  PostgreSQL Prisma schema with relations for projects, transcripts, lesson items, scenes, and render jobs.
                </span>
                <button
                  onClick={() => copyCode(prismaSchemaCode)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Schema'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300/90 font-mono overflow-x-auto max-h-96">
                {prismaSchemaCode}
              </pre>
            </div>
          )}

          {activeSubTab === 'pipeline' && (
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed">
                The SpeakClip AI video composition engine formats raw educational clips into high-retention YouTube lessons. Each segment follows the proven educational sequence:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-cyan-400 block mb-1">Scene 1: Branded Intro (2-3s)</span>
                  <p className="text-xs text-slate-400">Channel watermark, animated lesson topic banner, high-energy music intro.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-cyan-400 block mb-1">Scene 2: Original Clip (5-20s)</span>
                  <p className="text-xs text-slate-400">Plays native speaker speech with synchronized word highlights in yellow over navy box.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-cyan-400 block mb-1">Scene 3: Pause & Teach</span>
                  <p className="text-xs text-slate-400">Freezes and applies Gaussian blur to background frame. Presents Persian card with meaning, idiom analysis, and new example sentences.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-cyan-400 block mb-1">Scene 4: Replay with Subtitles</span>
                  <p className="text-xs text-slate-400">Reinforces retention by replaying speech segment with synchronized bilingual English and Persian subtitles.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-cyan-400 block mb-1">Scene 5: Mini Quiz (7s)</span>
                  <p className="text-xs text-slate-400">Displays comprehension question. 3-second animated circular timer ticks before highlighting the correct answer.</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-semibold text-cyan-400 block mb-1">Scene 6: Outro & Summary (5s)</span>
                  <p className="text-xs text-slate-400">Card summarizing all 3-5 idioms and collocations learned, with YouTube subscribe call-to-action.</p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'milestones' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Milestone 1: Core Foundation & Data Architecture</h4>
                  <p className="text-xs text-slate-400">Data models, types, Express REST API, seed dataset with TED speech, and Persian RTL engine.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Milestone 2: Gemini 3.8 Flash Pedagogical Analysis</h4>
                  <p className="text-xs text-slate-400">System prompt with strict anti-hallucination rules for idioms, collocations, CEFR grading, and Persian explanations.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Milestone 3: Synchronized Transcript & Lesson Editors</h4>
                  <p className="text-xs text-slate-400">Interactive word-level player, segment split/merge, lesson cards, single-segment regeneration, and manual teaching notes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Milestone 4: Scene Studio & Canvas Video Renderer</h4>
                  <p className="text-xs text-slate-400">JSON scene timeline, multi-track player, aspect ratio switcher (16:9 / 9:16), animated captions, and Persian typography.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Milestone 5: Export Pipeline & Artifact Downloads</h4>
                  <p className="text-xs text-slate-400">Live MediaRecorder video export, English & Persian SRT files, Markdown lesson notes, CSV vocabulary list, and YouTube SEO pack.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-cyan-500/30 bg-cyan-950/20">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-cyan-300">Milestone 6: Multi-Model AI & Local LLM Integration</h4>
                  <p className="text-xs text-slate-300">Pluggable engine supporting Google Gemini, OpenAI GPT-4o, Anthropic Claude 3.5, and 100% private local models (Ollama / LM Studio) with live connection testing.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <span>SpeakClip AI v1.0 • Built for Persian-speaking English learners</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
