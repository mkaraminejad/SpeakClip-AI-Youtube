export type ProjectStatus =
  | 'uploaded'
  | 'transcribing'
  | 'analyzing'
  | 'ready'
  | 'rendering'
  | 'completed'
  | 'failed';

export type LearnerLevel = 'B1' | 'B2' | 'C1';
export type VideoFormat = '16:9' | '9:16' | 'both';
export type TeachingTone = 'concise' | 'friendly' | 'indepth';

export interface ExpressionDetail {
  id: string;
  term: string;
  type: 'idiom' | 'phrasal_verb' | 'collocation' | 'advanced_vocab' | 'grammar';
  meaning_in_context: string;
  persian_equivalent: string;
  formality: 'formal' | 'informal' | 'neutral' | 'slang';
  natural_example: string;
  common_learner_mistake?: string;
}

export interface GrammarPattern {
  pattern_name: string;
  explanation_en: string;
  explanation_fa: string;
  example: string;
}

export interface ComprehensionQuestion {
  question_en: string;
  question_fa: string;
  options: string[];
  correct_option_index: number;
  explanation_fa: string;
}

export interface LessonItem {
  id: string;
  segmentIndex: number;
  original_sentence: string;
  start_time: number;
  end_time: number;
  clean_transcript: string;
  Persian_translation: string;
  CEFR_level: LearnerLevel;
  key_vocabulary: ExpressionDetail[];
  idioms: ExpressionDetail[];
  phrasal_verbs: ExpressionDetail[];
  collocations: ExpressionDetail[];
  useful_grammar_pattern?: GrammarPattern;
  pronunciation_notes: string;
  cultural_or_context_note: string;
  simple_English_explanation: string;
  Persian_explanation: string;
  example_sentences: string[];
  comprehension_question: ComprehensionQuestion;
  answer: string;
  teaching_priority_score: number; // 1 to 10
  manual_notes?: string;
  isSelectedForTeaching: boolean;
  narration_script_fa: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
  isSelectedForTeaching?: boolean;
}

export interface TranscriptData {
  language: string;
  duration: number;
  fullText: string;
  segments: TranscriptSegment[];
}

export interface SubtitleStyleConfig {
  backgroundColor: string;
  highlightColor: string;
  textColor: string;
  fontSizePx: number;
  fontFamily: string;
  showPersianSub: boolean;
  showEnglishSub: boolean;
  backgroundOpacity: number;
}

export interface BrandingConfig {
  channelName: string;
  logoUrl?: string;
  primaryColor: string;
  introTitle: string;
  outroCtaText: string;
}

export interface BrandProfile {
  channelName: string;
  channelTagline: string;
  primaryColor: string;
  accentColor: string;
  highlightColor: string;
  fontFamilyEn: string;
  fontFamilyFa: string;
  introTitle: string;
  outroCtaTextEn: string;
  outroCtaTextFa: string;
  showWatermark: boolean;
}

export type SceneType =
  | 'branded_intro'
  | 'original_clip'
  | 'pause_and_teach'
  | 'replay_with_subtitles'
  | 'replay'
  | 'quiz'
  | 'mini_quiz'
  | 'summary_outro'
  | 'outro';

export interface SceneDefinition {
  id: string;
  scene_type?: SceneType;
  sceneType?: string;
  start_time?: number; // relative timeline position
  startTime?: number;
  duration: number; // seconds
  source_video_range?: { start: number; end: number };
  lesson_item_id?: string;
  title?: string;
  persianTitle?: string;
  englishSub?: string;
  persianSub?: string;
  highlightPhrase?: string;
  animation_style?: 'fade' | 'slide_up' | 'pop' | 'typewriter';
  voiceover_audio?: string;
  background_music_volume?: number;
}

export type AIProviderType =
  | 'gemini'
  | 'groq'
  | 'openai'
  | 'anthropic'
  | 'local_ollama'
  | 'custom_compatible';

export interface AIModelConfig {
  provider: AIProviderType;
  modelName: string;
  baseUrl?: string;
  temperature?: number;
  apiKey?: string;
}

export interface RenderConfig {
  resolution: '1080p' | '720p';
  fps: 30 | 60;
  aspectRatio: '16:9' | '9:16';
  showOriginalVideo: boolean;
  persianVoiceId: string;
  exportFormat: 'mp4' | 'webm';
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  nativeLanguage: 'fa' | 'en';
  learnerLevel: LearnerLevel;
  outputFormat: VideoFormat;
  numSegments: number;
  tone: TeachingTone;
  legalConfirmed: boolean;
  mediaUrl?: string;
  mediaDuration: number;
  mediaFileName?: string;
  mediaType?: 'video' | 'audio';
  transcript: TranscriptData;
  lessonItems: LessonItem[];
  scenes: SceneDefinition[];
  brandProfile?: BrandProfile;
  branding?: BrandingConfig;
  subtitleStyle?: SubtitleStyleConfig;
  renderConfig?: RenderConfig;
  aiModelConfig?: AIModelConfig;
  currentRenderingProgress?: number;
}
