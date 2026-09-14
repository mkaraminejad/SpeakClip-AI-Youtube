import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  HelpCircle,
  Volume2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Edit3,
} from 'lucide-react';
import { LessonItem, ExpressionDetail, Project } from '../types';
import { Locale, translations } from '../lib/i18n';

interface LessonEditorProps {
  project: Project;
  locale: Locale;
  onUpdateProject: (updatedProject: Project) => void;
  onProceedToVideo: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  project,
  locale,
  onUpdateProject,
  onProceedToVideo,
}) => {
  const t = translations[locale];
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    project.lessonItems[0]?.id || null
  );

  const handleUpdateItem = (updatedItem: LessonItem) => {
    const updatedList = project.lessonItems.map((it) =>
      it.id === updatedItem.id ? updatedItem : it
    );
    saveLessonItems(updatedList);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= project.lessonItems.length) return;

    const list = [...project.lessonItems];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    saveLessonItems(list);
  };

  const handleDeleteItem = (id: string) => {
    const list = project.lessonItems.filter((it) => it.id !== id);
    saveLessonItems(list);
  };

  const handleRegenerateItem = async (itemId: string) => {
    setRegeneratingId(itemId);
    try {
      const res = await fetch(`/api/projects/${project.id}/regenerate-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonItemId: itemId }),
      });
      const data = await res.json();
      if (data.item) {
        handleUpdateItem(data.item);
      }
    } catch (e) {
      console.error('Regenerate item error', e);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRemoveExpression = (
    item: LessonItem,
    expId: string,
    category: 'idioms' | 'phrasal_verbs' | 'collocations' | 'key_vocabulary'
  ) => {
    const updated = {
      ...item,
      [category]: item[category].filter((e) => e.id !== expId),
    };
    handleUpdateItem(updated);
  };

  const handleAddExpression = (
    item: LessonItem,
    category: 'idioms' | 'phrasal_verbs' | 'collocations' | 'key_vocabulary'
  ) => {
    const newExp: ExpressionDetail = {
      id: `custom_${Date.now()}`,
      term: 'New Expression',
      type:
        category === 'idioms'
          ? 'idiom'
          : category === 'phrasal_verbs'
          ? 'phrasal_verb'
          : category === 'collocations'
          ? 'collocation'
          : 'advanced_vocab',
      meaning_in_context: 'Meaning in this context',
      persian_equivalent: 'معادل فارسی',
      formality: 'neutral',
      natural_example: 'She used this expression in conversation.',
    };
    const updated = {
      ...item,
      [category]: [...item[category], newExp],
    };
    handleUpdateItem(updated);
  };

  const saveLessonItems = async (lessonItems: LessonItem[]) => {
    const updated = {
      ...project,
      lessonItems,
    };
    onUpdateProject(updated);

    try {
      await fetch(`/api/projects/${project.id}/lesson`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonItems }),
      });
    } catch (e) {
      console.error('Failed to sync lesson items', e);
    }
  };

  const speakText = (text: string, lang = 'en-US') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t.lessonEditor}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              {project.lessonItems.length} {locale === 'fa' ? 'آیتم درس' : 'Lesson Cards'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {locale === 'fa'
              ? 'ترجمه، توضیحات فارسی، اصطلاحات و کوئیزهای هر بخش را ویرایش کنید یا به دلخواه بازتولید نمایید.'
              : 'Review Persian translations, idiom distinctions, grammar notes, and comprehension quizzes.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onProceedToVideo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{t.videoEditor}</span>
            <span className="text-cyan-200">→</span>
          </button>
        </div>
      </div>

      {/* Lesson Items Accordion/Cards */}
      <div className="space-y-4">
        {project.lessonItems.map((item, index) => {
          const isExpanded = expandedItemId === item.id;
          const isRegen = regeneratingId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                isExpanded
                  ? 'border-cyan-500/50 shadow-xl shadow-cyan-950/20 ring-1 ring-cyan-500/20'
                  : 'border-slate-800/90 hover:border-slate-700/80'
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer bg-slate-900/90 hover:bg-slate-800/40 select-none"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                        CEFR {item.CEFR_level}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                        ★ {item.teaching_priority_score}/10 Priority
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {item.start_time.toFixed(1)}s - {item.end_time.toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate font-english">
                      "{item.original_sentence}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveItem(index, 'up')}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 hover:bg-slate-800 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === project.lessonItems.length - 1}
                      onClick={() => handleMoveItem(index, 'down')}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 hover:bg-slate-800 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegenerateItem(item.id);
                    }}
                    disabled={isRegen}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors text-xs flex items-center gap-1"
                    title={t.regenerateSegment}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <div className="text-slate-500">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Card Expanded Content */}
              {isExpanded && (
                <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/50 space-y-6">
                  {/* Original Speech Audio & Pronunciation */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakText(item.original_sentence)}
                        className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors"
                        title="Listen to sentence"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-slate-300 italic font-english">
                        "{item.original_sentence}"
                      </span>
                    </div>
                    {item.pronunciation_notes && (
                      <span className="text-[11px] text-amber-300/90 font-persian bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                        {item.pronunciation_notes}
                      </span>
                    )}
                  </div>

                  {/* Persian Translation & Simple English Explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-cyan-400 font-persian flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{t.persianTranslation}</span>
                      </label>
                      <textarea
                        value={item.Persian_translation}
                        onChange={(e) =>
                          handleUpdateItem({ ...item, Persian_translation: e.target.value })
                        }
                        rows={2}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 font-persian leading-relaxed focus:outline-none focus:border-cyan-500/50"
                        dir="rtl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 font-english flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.englishExplanation}</span>
                      </label>
                      <textarea
                        value={item.simple_English_explanation}
                        onChange={(e) =>
                          handleUpdateItem({ ...item, simple_English_explanation: e.target.value })
                        }
                        rows={2}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 font-english leading-relaxed focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  {/* Persian Deep Explanation */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-cyan-400 font-persian flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t.persianExplanation} (آموزش ساختار و نکات کلیدی)</span>
                    </label>
                    <textarea
                      value={item.Persian_explanation}
                      onChange={(e) =>
                        handleUpdateItem({ ...item, Persian_explanation: e.target.value })
                      }
                      rows={2}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 font-persian leading-relaxed focus:outline-none focus:border-cyan-500/50"
                      dir="rtl"
                    />
                  </div>

                  {/* Expressions breakdown: Idioms, Phrasal Verbs, Collocations */}
                  <div className="space-y-4 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {locale === 'fa' ? 'اصطلاحات، هم‌آیی‌ها و افعال چندقسمتی شناسایی‌شده' : 'Identified Linguistic Expressions'}
                      </span>
                    </div>

                    {/* IDIOMS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                        <span>💡 {t.idioms}</span>
                        <button
                          onClick={() => handleAddExpression(item, 'idioms')}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Idiom
                        </button>
                      </div>
                      {item.idioms.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No genuine idiom in this segment.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.idioms.map((idm) => (
                            <div
                              key={idm.id}
                              className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/20 space-y-1 relative group"
                            >
                              <button
                                onClick={() => handleRemoveExpression(item, idm.id, 'idioms')}
                                className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-amber-300 font-english">
                                  {idm.term}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300">
                                  {idm.formality}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 font-persian" dir="rtl">
                                {idm.persian_equivalent}
                              </p>
                              <p className="text-[11px] text-slate-400 font-english italic">
                                "{idm.natural_example}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PHRASAL VERBS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                        <span>🔄 {t.phrasalVerbs}</span>
                        <button
                          onClick={() => handleAddExpression(item, 'phrasal_verbs')}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Phrasal Verb
                        </button>
                      </div>
                      {item.phrasal_verbs.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No phrasal verb in this segment.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.phrasal_verbs.map((pv) => (
                            <div
                              key={pv.id}
                              className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/20 space-y-1 relative group"
                            >
                              <button
                                onClick={() => handleRemoveExpression(item, pv.id, 'phrasal_verbs')}
                                className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-xs text-cyan-300 font-english block">
                                {pv.term}
                              </span>
                              <p className="text-xs text-slate-200 font-persian" dir="rtl">
                                {pv.persian_equivalent}
                              </p>
                              <p className="text-[11px] text-slate-400 font-english italic">
                                "{pv.natural_example}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* COLLOCATIONS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                        <span>🤝 {t.collocations}</span>
                        <button
                          onClick={() => handleAddExpression(item, 'collocations')}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Collocation
                        </button>
                      </div>
                      {item.collocations.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No special collocation in this segment.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.collocations.map((col) => (
                            <div
                              key={col.id}
                              className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 space-y-1 relative group"
                            >
                              <button
                                onClick={() => handleRemoveExpression(item, col.id, 'collocations')}
                                className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-xs text-emerald-300 font-english block">
                                {col.term}
                              </span>
                              <p className="text-xs text-slate-200 font-persian" dir="rtl">
                                {col.persian_equivalent}
                              </p>
                              <p className="text-[11px] text-slate-400 font-english italic">
                                "{col.natural_example}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comprehension Quiz Preview */}
                  {item.comprehension_question && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4" />
                          <span>{t.comprehensionQuiz}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Included in YouTube clip</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200">
                        {item.comprehension_question.question_en}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.comprehension_question.options.map((opt, oIdx) => {
                          const isCorrect =
                            oIdx === item.comprehension_question.correct_option_index;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual Teacher Note & Card Footer */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.manual_notes || ''}
                        onChange={(e) =>
                          handleUpdateItem({ ...item, manual_notes: e.target.value })
                        }
                        placeholder={t.addManualNote}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 w-64 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.deleteProject}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
