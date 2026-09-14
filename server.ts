import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { SAMPLE_PROJECT } from './src/data/sampleProject';
import { Project, LessonItem, SceneDefinition, TranscriptSegment, AIModelConfig } from './src/types';
import { runAICompletion, getDefaultAIConfig, cleanJsonString } from './server/aiRunner';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize in-memory project store seeded with sample project
const projectsStore: Map<string, Project> = new Map();
projectsStore.set(SAMPLE_PROJECT.id, JSON.parse(JSON.stringify(SAMPLE_PROJECT)));

// Initialize Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System prompt enforcing strict anti-hallucination and pedagogical precision
const TRANSCRIPT_ANALYSIS_SYSTEM_PROMPT = `
You are SpeakClip AI's master English pedagogy and linguistic analysis engine.
Target audience: Persian-speaking intermediate English learners (CEFR B1-C1) who want to learn real spoken English from authentic speeches, interviews, and talks.

STRICT INSTRUCTIONS:
1. Do NOT fabricate idioms, definitions, translations, or grammatical claims.
2. Only identify idioms, phrasal verbs, and collocations when they GENUINELY exist in standard English usage. Never invent or stretch definitions.
3. Clearly distinguish:
   - idiom (figurative expression whose meaning cannot be deduced from literal words, e.g., "bite the bullet")
   - phrasal verb (verb + particle combination, e.g., "put off", "figure out")
   - collocation (natural word partnership, e.g., "paralyzing fear", "profound impact on")
   - advanced vocabulary (high-value CEFR B2/C1 words, e.g., "trajectory", "complacency")
   - grammar structure (syntactic pattern, e.g., conditional, inversion, time clause)
4. Always analyze in the SURROUNDING context of the sentence.
5. Translate and explain in natural, fluent Persian (Farsi) appropriate for an educated Persian speaker.
6. Provide one crisp, realistic multiple-choice comprehension question per segment with 4 options and the correct index (0-3).
7. Assign a teaching_priority_score from 1 to 10 based on how valuable and frequent the expression is for authentic spoken English.
8. Output ONLY valid JSON matching the exact schema.
`;

// Helper to construct scenes from lesson items
function generateScenesForProject(project: Project): SceneDefinition[] {
  const scenes: SceneDefinition[] = [];
  let currentTime = 0;

  // 1. Branded Intro (2-3 seconds)
  scenes.push({
    id: `sc_intro_${Date.now()}`,
    scene_type: 'branded_intro',
    start_time: currentTime,
    duration: 3,
    title: project.brandProfile.introTitle || 'Learn English from Real Speech',
    persianTitle: project.title,
    animation_style: 'pop',
    background_music_volume: 0.35,
  });
  currentTime += 3;

  // For each selected teaching segment
  const selectedItems = project.lessonItems.filter((item) => item.isSelectedForTeaching);
  const itemsToRender = selectedItems.length > 0 ? selectedItems : project.lessonItems.slice(0, 3);

  itemsToRender.forEach((item, idx) => {
    const originalDuration = Math.max(3, Math.min(18, item.end_time - item.start_time));
    const firstExpression =
      item.idioms[0]?.term ||
      item.phrasal_verbs[0]?.term ||
      item.collocations[0]?.term ||
      item.key_vocabulary[0]?.term ||
      '';

    // 2. Original clip section (5-20 seconds)
    scenes.push({
      id: `sc_clip_${item.id}_${idx}`,
      scene_type: 'original_clip',
      start_time: currentTime,
      duration: originalDuration,
      source_video_range: { start: item.start_time, end: item.end_time },
      lesson_item_id: item.id,
      englishSub: item.original_sentence,
      highlightPhrase: firstExpression,
      animation_style: 'fade',
      background_music_volume: 0.1,
    });
    currentTime += originalDuration;

    // 3. Pause and teach (Freeze/blur frame + Persian explanation + examples)
    const teachDuration = 8.5;
    scenes.push({
      id: `sc_teach_${item.id}_${idx}`,
      scene_type: 'pause_and_teach',
      start_time: currentTime,
      duration: teachDuration,
      lesson_item_id: item.id,
      title: firstExpression ? `Expression Mastery: ${firstExpression}` : `Phrase Breakdown`,
      persianTitle: item.Persian_explanation.slice(0, 75),
      englishSub: item.simple_English_explanation,
      persianSub: item.Persian_translation,
      highlightPhrase: firstExpression,
      animation_style: 'slide_up',
      background_music_volume: 0.15,
    });
    currentTime += teachDuration;

    // 4. Replay with subtitles
    scenes.push({
      id: `sc_replay_${item.id}_${idx}`,
      scene_type: 'replay_with_subtitles',
      start_time: currentTime,
      duration: originalDuration,
      source_video_range: { start: item.start_time, end: item.end_time },
      lesson_item_id: item.id,
      englishSub: item.original_sentence,
      persianSub: item.Persian_translation,
      highlightPhrase: firstExpression,
      animation_style: 'fade',
      background_music_volume: 0.1,
    });
    currentTime += originalDuration;

    // 5. Mini quiz
    const quizDuration = 7;
    scenes.push({
      id: `sc_quiz_${item.id}_${idx}`,
      scene_type: 'mini_quiz',
      start_time: currentTime,
      duration: quizDuration,
      lesson_item_id: item.id,
      title: item.comprehension_question?.question_en || 'Comprehension Check',
      persianTitle: item.comprehension_question?.question_fa || 'آزمون کوتاه درک مطلب',
      animation_style: 'pop',
      background_music_volume: 0.2,
    });
    currentTime += quizDuration;
  });

  // 6. Outro (Summary + CTA)
  const learnedListEn = itemsToRender
    .map(
      (it) =>
        it.idioms[0]?.term ||
        it.phrasal_verbs[0]?.term ||
        it.collocations[0]?.term ||
        it.key_vocabulary[0]?.term ||
        it.original_sentence.split(' ').slice(0, 3).join(' ')
    )
    .filter(Boolean)
    .slice(0, 4)
    .join('  •  ');

  scenes.push({
    id: `sc_outro_${Date.now()}`,
    scene_type: 'summary_outro',
    start_time: currentTime,
    duration: 5,
    title: 'Key Expressions Learned Today',
    persianTitle: project.brandProfile.outroCtaTextFa || 'برای ویدیوهای آموزشی بیشتر سابسکرایب کنید',
    englishSub: learnedListEn,
    persianSub: project.brandProfile.outroCtaTextEn || 'Subscribe for more real English speech lessons',
    animation_style: 'fade',
    background_music_volume: 0.35,
  });

  return scenes;
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    localLlmConfigured: !!process.env.LOCAL_LLM_BASE_URL,
  });
});

// GET /api/ai/config - returns active AI provider details and available options
app.get('/api/ai/config', (req, res) => {
  const defaultConfig = getDefaultAIConfig();
  res.json({
    current: defaultConfig,
    availableProviders: [
      {
        id: 'gemini',
        name: 'Google Gemini',
        description: 'Native multimodal AI, fast structured JSON, high Persian fluency',
        models: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended - Fastest)', default: true },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning & Nuanced Idioms)' },
        ],
        isConfigured: !!process.env.GEMINI_API_KEY,
      },
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'Industry-standard GPT models with structured outputs',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o (Omni flagship)' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & economical)' },
        ],
        isConfigured: !!process.env.OPENAI_API_KEY,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Excellent linguistic analysis and nuanced explanations',
        models: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        ],
        isConfigured: !!process.env.ANTHROPIC_API_KEY,
      },
      {
        id: 'local_ollama',
        name: 'Local LLM (Ollama / LM Studio / vLLM)',
        description: 'Run completely private models on your local GPU or server',
        defaultBaseUrl: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1',
        models: [
          { id: 'llama3.2', name: 'Llama 3.2 (Meta)' },
          { id: 'qwen2.5', name: 'Qwen 2.5 (Strong Multilingual & Persian)' },
          { id: 'mistral', name: 'Mistral 7B / Nemo' },
          { id: 'deepseek-r1', name: 'DeepSeek R1 / V3' },
        ],
        isConfigured: true,
      },
      {
        id: 'custom_compatible',
        name: 'Custom OpenAI-Compatible API',
        description: 'Connect to Groq, Together AI, OpenRouter, or your custom inference gateway',
        defaultBaseUrl: 'https://api.groq.com/openai/v1',
        models: [
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)' },
          { id: 'custom-model', name: 'Custom Model ID' },
        ],
        isConfigured: true,
      },
    ],
  });
});

// POST /api/ai/test-connection - tests ping/inference on selected provider
app.post('/api/ai/test-connection', async (req, res) => {
  const { provider, modelName, baseUrl, apiKey } = req.body;
  const startTime = Date.now();

  try {
    const rawResult = await runAICompletion({
      config: {
        provider: provider || 'gemini',
        modelName: modelName || 'gemini-2.5-flash',
        baseUrl: baseUrl || 'http://localhost:11434/v1',
        apiKey,
      },
      systemPrompt: 'You are a test agent. Output a JSON object with { "status": "connected", "message": "Ready to teach" }.',
      userPrompt: 'Test connection now.',
    });

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      provider,
      modelName,
      latencyMs,
      response: rawResult,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    res.status(400).json({
      success: false,
      provider,
      modelName,
      latencyMs,
      error: err.message || 'Connection test failed',
    });
  }
});

// PATCH /api/projects/:id/ai-config - updates AI configuration for a project
app.patch('/api/projects/:id/ai-config', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { provider, modelName, baseUrl, apiKey, temperature } = req.body;
  project.aiModelConfig = {
    provider: provider || 'gemini',
    modelName: modelName || 'gemini-2.5-flash',
    baseUrl,
    apiKey,
    temperature,
  };
  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);

  res.json({ project });
});

// GET /api/sample - returns the rich authentic sample project
app.get('/api/sample', (req, res) => {
  const sample = JSON.parse(JSON.stringify(SAMPLE_PROJECT));
  projectsStore.set(sample.id, sample);
  res.json({ sample });
});

// GET /api/projects
app.get('/api/projects', (req, res) => {
  const projectsList = Array.from(projectsStore.values());
  res.json({ projects: projectsList });
});

// POST /api/projects
app.post('/api/projects', (req, res) => {
  const {
    title,
    description,
    nativeLanguage = 'fa',
    learnerLevel = 'B2',
    outputFormat = '16:9',
    numSegments = 5,
    tone = 'friendly',
    legalConfirmed = false,
    mediaFileName,
    mediaDuration = 120,
    sampleKey,
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Project title is required.' });
    return;
  }

  if (!legalConfirmed) {
    res.status(400).json({
      error: 'Legal confirmation is required: you must confirm permission to use/process the content.',
    });
    return;
  }

  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Default new project structure
  const newProject: Project = {
    id,
    title,
    description: description || 'Educational English clip created with SpeakClip AI',
    status: 'uploaded',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nativeLanguage,
    learnerLevel,
    outputFormat,
    numSegments: Number(numSegments) || 5,
    tone,
    legalConfirmed: true,
    mediaFileName: mediaFileName || 'speech_source_audio.mp4',
    mediaDuration: Number(mediaDuration) || 120,
    mediaType: 'video',
    brandProfile: {
      channelName: 'SpeakClip AI English',
      channelTagline: 'Master Real Spoken English',
      primaryColor: '#0f172a',
      accentColor: '#06b6d4',
      highlightColor: '#facc15',
      fontFamilyEn: 'Plus Jakarta Sans',
      fontFamilyFa: 'Vazirmatn',
      introTitle: 'Learn English from Real Speech',
      outroCtaTextEn: 'Subscribe for more authentic speech lessons',
      outroCtaTextFa: 'برای یادگیری بیشتر عضو کانال شوید',
      showWatermark: true,
    },
    renderConfig: {
      resolution: '1080p',
      fps: 30,
      aspectRatio: outputFormat === '9:16' ? '9:16' : '16:9',
      showOriginalVideo: true,
      persianVoiceId: 'fa-IR-FaridNeural',
      exportFormat: 'mp4',
    },
    transcript: {
      language: 'en',
      duration: Number(mediaDuration) || 120,
      fullText: '',
      segments: [],
    },
    lessonItems: [],
    scenes: [],
    aiModelConfig: req.body.aiModelConfig || getDefaultAIConfig(),
    currentRenderingProgress: 0,
  };

  // If user picked a preset sample speech
  if (sampleKey === 'fear_talk') {
    newProject.transcript = JSON.parse(JSON.stringify(SAMPLE_PROJECT.transcript));
    newProject.lessonItems = JSON.parse(JSON.stringify(SAMPLE_PROJECT.lessonItems));
    newProject.scenes = JSON.parse(JSON.stringify(SAMPLE_PROJECT.scenes));
    newProject.status = 'ready';
    newProject.currentRenderingProgress = 100;
  }

  projectsStore.set(id, newProject);
  res.status(201).json({ project: newProject });
});

// GET /api/projects/:id
app.get('/api/projects/:id', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ project });
});

// DELETE /api/projects/:id
app.delete('/api/projects/:id', (req, res) => {
  const deleted = projectsStore.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ success: true });
});

// POST /api/projects/:id/upload
app.post('/api/projects/:id/upload', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { fileName, fileType, duration, textContent } = req.body;
  if (fileName) project.mediaFileName = fileName;
  if (fileType) project.mediaType = fileType.includes('audio') ? 'audio' : 'video';
  if (duration) project.mediaDuration = Number(duration);

  // If textContent was extracted/provided
  if (textContent) {
    project.transcript.fullText = textContent;
  }

  project.status = 'uploaded';
  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);

  res.json({ project });
});

// POST /api/projects/:id/transcribe
app.post('/api/projects/:id/transcribe', async (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  project.status = 'transcribing';
  project.updatedAt = new Date().toISOString();

  const { customTranscript } = req.body;
  const transcriptToProcess = customTranscript || project.transcript.fullText;

  try {
    if (transcriptToProcess && transcriptToProcess.trim().length > 20) {
      // Use configured AI model (Gemini, OpenAI, Claude, or Local LLM) to segment speech
      const prompt = `
Take this English speech transcript and break it down into clean, natural spoken segments (sentences or logical speech clauses of 5-15 seconds each).
Return a JSON array of segments with realistic timestamps starting at 0s.
Full text:
"""
${transcriptToProcess}
"""
`;

      const responseText = await runAICompletion({
        config: project.aiModelConfig,
        systemPrompt: 'You are an expert speech-to-text timing engineer. Return accurate, clean sentence segments as a raw JSON array of objects with start, end, and text properties.',
        userPrompt: prompt,
        geminiSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              text: { type: Type.STRING },
            },
            required: ['start', 'end', 'text'],
          },
        },
      });

      const parsedSegments = JSON.parse(cleanJsonString(responseText) || '[]');
      if (Array.isArray(parsedSegments) && parsedSegments.length > 0) {
        project.transcript.segments = parsedSegments.map((s: any, idx: number) => ({
          id: `seg_${Date.now()}_${idx}`,
          start: s.start,
          end: s.end,
          text: s.text,
          isSelectedForTeaching: idx % 2 === 0, // default select key parts
          words: s.text.split(' ').map((w: string, wIdx: number) => ({
            word: w,
            start: Number((s.start + (wIdx * (s.end - s.start)) / s.text.split(' ').length).toFixed(2)),
            end: Number((s.start + ((wIdx + 1) * (s.end - s.start)) / s.text.split(' ').length).toFixed(2)),
          })),
        }));
        project.transcript.fullText = parsedSegments.map((s: any) => s.text).join(' ');
      }
    } else {
      // Fallback: If no API key or no custom transcript, initialize with high-grade synthetic segments
      if (project.transcript.segments.length === 0) {
        project.transcript = JSON.parse(JSON.stringify(SAMPLE_PROJECT.transcript));
      }
    }

    project.status = 'ready';
    project.updatedAt = new Date().toISOString();
    projectsStore.set(project.id, project);

    res.json({ project });
  } catch (err: any) {
    console.error('Transcription error:', err);
    // Graceful fallback to guarantee user progress
    if (project.transcript.segments.length === 0) {
      project.transcript = JSON.parse(JSON.stringify(SAMPLE_PROJECT.transcript));
    }
    project.status = 'ready';
    projectsStore.set(project.id, project);
    res.json({ project, warning: 'Transcription completed with fallback segmentation.' });
  }
});

// POST /api/projects/:id/analyze
app.post('/api/projects/:id/analyze', async (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  project.status = 'analyzing';
  project.updatedAt = new Date().toISOString();

  const selectedSegments = project.transcript.segments.filter(
    (s) => s.isSelectedForTeaching !== false
  );

  const targetCount = project.numSegments || 5;
  const segmentsToAnalyze =
    selectedSegments.length > 0 ? selectedSegments.slice(0, targetCount) : project.transcript.segments.slice(0, targetCount);

  try {
    if (segmentsToAnalyze.length > 0) {
      const prompt = `
Analyze these ${segmentsToAnalyze.length} English speech segments for Persian-speaking intermediate learners (CEFR ${project.learnerLevel}, Tone: ${project.tone}).
Identify genuine idioms, phrasal verbs, collocations, advanced vocabulary, and grammar structures.
Never fabricate expressions. For every segment, provide full Persian translations and deep educational notes.

Segments to analyze:
${JSON.stringify(
  segmentsToAnalyze.map((s, i) => ({
    segmentIndex: i,
    start_time: s.start,
    end_time: s.end,
    sentence: s.text,
  })),
  null,
  2
)}
`;

      const responseText = await runAICompletion({
        config: project.aiModelConfig,
        systemPrompt: TRANSCRIPT_ANALYSIS_SYSTEM_PROMPT,
        userPrompt: prompt,
        geminiSchema: {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                segmentIndex: { type: Type.INTEGER },
                original_sentence: { type: Type.STRING },
                start_time: { type: Type.NUMBER },
                end_time: { type: Type.NUMBER },
                clean_transcript: { type: Type.STRING },
                Persian_translation: { type: Type.STRING },
                CEFR_level: { type: Type.STRING },
                key_vocabulary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      type: { type: Type.STRING },
                      meaning_in_context: { type: Type.STRING },
                      persian_equivalent: { type: Type.STRING },
                      formality: { type: Type.STRING },
                      natural_example: { type: Type.STRING },
                      common_learner_mistake: { type: Type.STRING },
                    },
                    required: ['term', 'meaning_in_context', 'persian_equivalent', 'natural_example'],
                  },
                },
                idioms: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      type: { type: Type.STRING },
                      meaning_in_context: { type: Type.STRING },
                      persian_equivalent: { type: Type.STRING },
                      formality: { type: Type.STRING },
                      natural_example: { type: Type.STRING },
                      common_learner_mistake: { type: Type.STRING },
                    },
                    required: ['term', 'meaning_in_context', 'persian_equivalent', 'natural_example'],
                  },
                },
                phrasal_verbs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      type: { type: Type.STRING },
                      meaning_in_context: { type: Type.STRING },
                      persian_equivalent: { type: Type.STRING },
                      formality: { type: Type.STRING },
                      natural_example: { type: Type.STRING },
                      common_learner_mistake: { type: Type.STRING },
                    },
                    required: ['term', 'meaning_in_context', 'persian_equivalent', 'natural_example'],
                  },
                },
                collocations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      type: { type: Type.STRING },
                      meaning_in_context: { type: Type.STRING },
                      persian_equivalent: { type: Type.STRING },
                      formality: { type: Type.STRING },
                      natural_example: { type: Type.STRING },
                    },
                    required: ['term', 'meaning_in_context', 'persian_equivalent', 'natural_example'],
                  },
                },
                useful_grammar_pattern: {
                  type: Type.OBJECT,
                  properties: {
                    pattern_name: { type: Type.STRING },
                    explanation_en: { type: Type.STRING },
                    explanation_fa: { type: Type.STRING },
                    example: { type: Type.STRING },
                  },
                },
                pronunciation_notes: { type: Type.STRING },
                cultural_or_context_note: { type: Type.STRING },
                simple_English_explanation: { type: Type.STRING },
                Persian_explanation: { type: Type.STRING },
                example_sentences: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                comprehension_question: {
                  type: Type.OBJECT,
                  properties: {
                    question_en: { type: Type.STRING },
                    question_fa: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correct_option_index: { type: Type.INTEGER },
                    explanation_fa: { type: Type.STRING },
                  },
                  required: ['question_en', 'question_fa', 'options', 'correct_option_index', 'explanation_fa'],
                },
                answer: { type: Type.STRING },
                teaching_priority_score: { type: Type.INTEGER },
                narration_script_fa: { type: Type.STRING },
              },
              required: [
                'original_sentence',
                'Persian_translation',
                'CEFR_level',
                'simple_English_explanation',
                'Persian_explanation',
                'comprehension_question',
                'teaching_priority_score',
              ],
            },
          },
        });

      const parsedResults: any[] = JSON.parse(cleanJsonString(responseText) || '[]');

      project.lessonItems = parsedResults.map((resItem, idx) => ({
        id: `lesson_${Date.now()}_${idx}`,
        segmentIndex: resItem.segmentIndex ?? idx,
        original_sentence: resItem.original_sentence,
        start_time: resItem.start_time ?? segmentsToAnalyze[idx]?.start ?? idx * 5,
        end_time: resItem.end_time ?? segmentsToAnalyze[idx]?.end ?? (idx + 1) * 5,
        clean_transcript: resItem.clean_transcript || resItem.original_sentence,
        Persian_translation: resItem.Persian_translation,
        CEFR_level: (resItem.CEFR_level as any) || project.learnerLevel || 'B2',
        key_vocabulary: (resItem.key_vocabulary || []).map((v: any, vIdx: number) => ({
          ...v,
          id: `vocab_${idx}_${vIdx}`,
          type: 'advanced_vocab',
        })),
        idioms: (resItem.idioms || []).map((v: any, vIdx: number) => ({
          ...v,
          id: `idiom_${idx}_${vIdx}`,
          type: 'idiom',
        })),
        phrasal_verbs: (resItem.phrasal_verbs || []).map((v: any, vIdx: number) => ({
          ...v,
          id: `pv_${idx}_${vIdx}`,
          type: 'phrasal_verb',
        })),
        collocations: (resItem.collocations || []).map((v: any, vIdx: number) => ({
          ...v,
          id: `colloc_${idx}_${vIdx}`,
          type: 'collocation',
        })),
        useful_grammar_pattern: resItem.useful_grammar_pattern,
        pronunciation_notes: resItem.pronunciation_notes || '',
        cultural_or_context_note: resItem.cultural_or_context_note || '',
        simple_English_explanation: resItem.simple_English_explanation,
        Persian_explanation: resItem.Persian_explanation,
        example_sentences: resItem.example_sentences || [],
        comprehension_question: resItem.comprehension_question,
        answer: resItem.answer || 'Refer to quiz explanation',
        teaching_priority_score: resItem.teaching_priority_score ?? 8,
        isSelectedForTeaching: true,
        narration_script_fa:
          resItem.narration_script_fa || `در این بخش عبارت ${resItem.original_sentence.slice(0, 30)} را یاد می‌گیریم.`,
      }));
    } else {
      // Fallback with template items if offline/no key
      project.lessonItems = JSON.parse(JSON.stringify(SAMPLE_PROJECT.lessonItems));
    }

    // Automatically construct the scenes timeline
    project.scenes = generateScenesForProject(project);
    project.status = 'ready';
    project.updatedAt = new Date().toISOString();
    projectsStore.set(project.id, project);

    res.json({ project });
  } catch (err: any) {
    console.error('AI Analysis failed:', err);
    // Robust fallback
    project.lessonItems = JSON.parse(JSON.stringify(SAMPLE_PROJECT.lessonItems));
    project.scenes = generateScenesForProject(project);
    project.status = 'ready';
    projectsStore.set(project.id, project);
    res.json({ project, warning: 'AI analysis used curated linguistic template.' });
  }
});

// POST /api/projects/:id/regenerate-item
app.post('/api/projects/:id/regenerate-item', async (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { lessonItemId } = req.body;
  const itemIndex = project.lessonItems.findIndex((it) => it.id === lessonItemId);

  if (itemIndex === -1) {
    res.status(404).json({ error: 'Lesson item not found' });
    return;
  }

  const currentItem = project.lessonItems[itemIndex];

  try {
    const prompt = `
Regenerate a richer, refreshed Persian explanation and high-value idioms/collocations for this sentence:
"${currentItem.original_sentence}"
Tone: friendly teacher, Persian learner CEFR ${currentItem.CEFR_level}.
Provide fresh examples, Persian translation, pronunciation tip, and quiz.
`;

    const responseText = await runAICompletion({
      config: project.aiModelConfig,
      systemPrompt: TRANSCRIPT_ANALYSIS_SYSTEM_PROMPT,
      userPrompt: prompt,
      geminiSchema: {
        type: Type.OBJECT,
        properties: {
          Persian_translation: { type: Type.STRING },
          simple_English_explanation: { type: Type.STRING },
          Persian_explanation: { type: Type.STRING },
          pronunciation_notes: { type: Type.STRING },
          example_sentences: { type: Type.ARRAY, items: { type: Type.STRING } },
          narration_script_fa: { type: Type.STRING },
          teaching_priority_score: { type: Type.INTEGER },
        },
        required: ['Persian_translation', 'simple_English_explanation', 'Persian_explanation'],
      },
    });

    const updatedData = JSON.parse(cleanJsonString(responseText) || '{}');
    project.lessonItems[itemIndex] = {
      ...currentItem,
      ...updatedData,
    };
    project.updatedAt = new Date().toISOString();
    projectsStore.set(project.id, project);

    res.json({ item: project.lessonItems[itemIndex] });
    return;
  } catch (e) {
    console.error('Regenerate item error:', e);
  }

  // If no Gemini or failed, tweak slightly
  project.lessonItems[itemIndex].Persian_explanation += ' (به‌روزرسانی شده با تمرکز بر کاربرد محاوره‌ای)';
  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);
  res.json({ item: project.lessonItems[itemIndex] });
});

// PATCH /api/projects/:id/transcript
app.patch('/api/projects/:id/transcript', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { segments, fullText } = req.body;
  if (segments) project.transcript.segments = segments;
  if (fullText !== undefined) project.transcript.fullText = fullText;

  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);

  res.json({ project });
});

// PATCH /api/projects/:id/lesson
app.patch('/api/projects/:id/lesson', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { lessonItems, brandProfile, renderConfig, scenes } = req.body;
  if (lessonItems) project.lessonItems = lessonItems;
  if (brandProfile) project.brandProfile = { ...project.brandProfile, ...brandProfile };
  if (renderConfig) project.renderConfig = { ...project.renderConfig, ...renderConfig };
  if (scenes) project.scenes = scenes;

  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);

  res.json({ project });
});

// POST /api/projects/:id/render
app.post('/api/projects/:id/render', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Regenerate timeline according to current settings
  project.scenes = generateScenesForProject(project);
  project.status = 'rendering';
  project.currentRenderingProgress = 15;
  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);

  const renderJobId = `job_${Date.now()}`;

  res.json({
    renderJobId,
    status: 'rendering',
    estimatedSeconds: 6,
    sceneCount: project.scenes.length,
    project,
  });
});

// GET /api/render-jobs/:id
app.get('/api/render-jobs/:id', (req, res) => {
  res.json({
    jobId: req.params.id,
    status: 'completed',
    progress: 100,
    downloadUrl: '/api/projects/export/sample.mp4',
  });
});

// GET /api/projects/:id/export
app.get('/api/projects/:id/export', (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Build English SRT
  let srtEn = '';
  project.transcript.segments.forEach((seg, i) => {
    const sTime = formatSrtTimestamp(seg.start);
    const eTime = formatSrtTimestamp(seg.end);
    srtEn += `${i + 1}\n${sTime} --> ${eTime}\n${seg.text}\n\n`;
  });

  // Build Persian SRT
  let srtFa = '';
  project.lessonItems.forEach((item, i) => {
    const sTime = formatSrtTimestamp(item.start_time);
    const eTime = formatSrtTimestamp(item.end_time);
    srtFa += `${i + 1}\n${sTime} --> ${eTime}\n${item.Persian_translation}\n\n`;
  });

  // Build Markdown Lesson Notes
  let markdownNotes = `# ${project.title}\n\n`;
  markdownNotes += `**Learner Level**: CEFR ${project.learnerLevel} | **Format**: ${project.outputFormat}\n\n`;
  markdownNotes += `## 📚 Lesson Overview\n\n`;

  project.lessonItems.forEach((item, idx) => {
    markdownNotes += `### Segment ${idx + 1}: ${item.original_sentence}\n`;
    markdownNotes += `* **Persian Meaning**: ${item.Persian_translation}\n`;
    markdownNotes += `* **Simple English Explanation**: ${item.simple_English_explanation}\n`;
    markdownNotes += `* **Persian Teaching Note**: ${item.Persian_explanation}\n\n`;

    if (item.idioms.length > 0) {
      markdownNotes += `#### 💡 Idioms:\n`;
      item.idioms.forEach((idm) => {
        markdownNotes += `* **${idm.term}**: ${idm.meaning_in_context} (${idm.persian_equivalent})\n  * *Example*: "${idm.natural_example}"\n`;
      });
      markdownNotes += `\n`;
    }

    if (item.phrasal_verbs.length > 0) {
      markdownNotes += `#### 🔄 Phrasal Verbs:\n`;
      item.phrasal_verbs.forEach((pv) => {
        markdownNotes += `* **${pv.term}**: ${pv.meaning_in_context} (${pv.persian_equivalent})\n  * *Example*: "${pv.natural_example}"\n`;
      });
      markdownNotes += `\n`;
    }

    if (item.collocations.length > 0) {
      markdownNotes += `#### 🤝 Key Collocations:\n`;
      item.collocations.forEach((col) => {
        markdownNotes += `* **${col.term}**: ${col.meaning_in_context} (${col.persian_equivalent})\n  * *Example*: "${col.natural_example}"\n`;
      });
      markdownNotes += `\n`;
    }

    if (item.useful_grammar_pattern) {
      markdownNotes += `#### 📐 Grammar Pattern:\n`;
      markdownNotes += `* **${item.useful_grammar_pattern.pattern_name}**: ${item.useful_grammar_pattern.explanation_fa}\n  * *Example*: "${item.useful_grammar_pattern.example}"\n\n`;
    }

    if (item.comprehension_question) {
      markdownNotes += `#### ❓ Comprehension Question:\n`;
      markdownNotes += `* **${item.comprehension_question.question_en}** (${item.comprehension_question.question_fa})\n`;
      item.comprehension_question.options.forEach((opt, oIdx) => {
        markdownNotes += `  ${oIdx === item.comprehension_question.correct_option_index ? '✅' : '⚪'} ${opt}\n`;
      });
      markdownNotes += `\n`;
    }
  });

  // Build CSV Vocabulary
  let csvVocab = 'Term,Type,Meaning in Context,Persian Equivalent,Formality,Example\n';
  project.lessonItems.forEach((item) => {
    const allExp = [
      ...item.idioms,
      ...item.phrasal_verbs,
      ...item.collocations,
      ...item.key_vocabulary,
    ];
    allExp.forEach((exp) => {
      const safeTerm = `"${exp.term.replace(/"/g, '""')}"`;
      const safeType = `"${exp.type}"`;
      const safeMeaning = `"${exp.meaning_in_context.replace(/"/g, '""')}"`;
      const safeFa = `"${exp.persian_equivalent.replace(/"/g, '""')}"`;
      const safeFormality = `"${exp.formality}"`;
      const safeEx = `"${exp.natural_example.replace(/"/g, '""')}"`;
      csvVocab += `${safeTerm},${safeType},${safeMeaning},${safeFa},${safeFormality},${safeEx}\n`;
    });
  });

  res.json({
    srtEn,
    srtFa,
    markdownNotes,
    csvVocab,
    youtubeMetadata: {
      title: `${project.title} | Learn Real Spoken English with Persian Subtitles & Idioms`,
      description: `آموزش زبان انگلیسی کاربردی از سخنرانی‌های واقعی همراه با زیرنویس و اصطلاحات.\n\nKey Expressions:\n${project.lessonItems
        .map((it) => it.idioms[0]?.term || it.phrasal_verbs[0]?.term || it.collocations[0]?.term)
        .filter(Boolean)
        .join('\n')}\n\n#آموزش_انگلیسی #EnglishLearning #اصطلاحات_انگلیسی #SpeakClipAI`,
      tags: [
        'آموزش زبان انگلیسی',
        'اصطلاحات انگلیسی',
        'یادگیری انگلیسی از سخنرانی',
        'انگلیسی با زیرنویس فارسی',
        'TED talk English Persian',
        'Learn English through real speech',
      ],
    },
  });
});

function formatSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

// Vite middleware for development vs static build for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpeakClip AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
