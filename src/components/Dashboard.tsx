import React, { useState } from 'react';
import {
  Plus,
  Search,
  Video,
  Clock,
  BookOpen,
  Sparkles,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Play,
  Filter,
} from 'lucide-react';
import { Project, ProjectStatus } from '../types';
import { Locale, translations } from '../lib/i18n';

interface DashboardProps {
  projects: Project[];
  locale: Locale;
  onSelectProject: (project: Project, tab?: 'transcript' | 'lesson' | 'video' | 'export') => void;
  onCreateNew: () => void;
  onDeleteProject: (projectId: string) => void;
  onLoadDemo: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  locale,
  onSelectProject,
  onCreateNew,
  onDeleteProject,
  onLoadDemo,
}) => {
  const t = translations[locale];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesQuery =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            {status === 'completed' ? t.statusCompleted : t.statusReady}
          </span>
        );
      case 'analyzing':
      case 'transcribing':
      case 'rendering':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            <Sparkles className="w-3 h-3" />
            {status === 'analyzing'
              ? t.statusAnalyzing
              : status === 'transcribing'
              ? t.statusTranscribing
              : t.statusRendering}
          </span>
        );
      case 'uploaded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            {t.statusUploaded}
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            {t.statusFailed}
          </span>
        );
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>{t.dashboard}</span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono font-normal">
              {projects.length} {locale === 'fa' ? 'پروژه' : 'Projects'}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t.appTagline}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadDemo}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{t.loadDemo}</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newProject}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchProjects}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 ml-1 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">{t.allStatuses}</option>
            <option value="ready">{t.statusReady}</option>
            <option value="completed">{t.statusCompleted}</option>
            <option value="analyzing">{t.statusAnalyzing}</option>
            <option value="uploaded">{t.statusUploaded}</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">{t.noProjectsFound}</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">{t.createFirstProject}</p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={onCreateNew}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition-colors"
            >
              {t.newProject}
            </button>
            <button
              onClick={onLoadDemo}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700"
            >
              {t.loadDemo}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-cyan-950/20"
            >
              <div className="space-y-3.5">
                {/* Status & Actions Header */}
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(project.status)}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title={t.deleteProject}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Project Title & Description */}
                <div>
                  <h3
                    onClick={() => onSelectProject(project, 'video')}
                    className="font-bold text-base text-white hover:text-cyan-400 transition-colors line-clamp-1 cursor-pointer"
                  >
                    {project.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {project.description || 'Educational English video clip.'}
                  </p>
                </div>

                {/* Badges / Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center">
                  <div className="bg-slate-950/60 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      {t.level}
                    </span>
                    <span className="text-xs font-bold text-cyan-400">
                      CEFR {project.learnerLevel}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      {t.segments}
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      {project.lessonItems.length > 0 ? project.lessonItems.length : project.numSegments}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      {t.duration}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {formatDuration(project.mediaDuration)}
                    </span>
                  </div>
                </div>

                {/* Extracted Highlights count */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    {project.lessonItems.reduce(
                      (acc, cur) => acc + cur.idioms.length + cur.collocations.length + cur.phrasal_verbs.length,
                      0
                    )}{' '}
                    {locale === 'fa' ? 'اصطلاح و ترکیب' : 'Expressions'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(project.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                  </span>
                </div>
              </div>

              {/* Bottom Card Navigation */}
              <div className="pt-4 mt-2 grid grid-cols-3 gap-1.5 border-t border-slate-800/60">
                <button
                  onClick={() => onSelectProject(project, 'transcript')}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors text-center border border-slate-800"
                >
                  {t.transcriptEditor}
                </button>
                <button
                  onClick={() => onSelectProject(project, 'lesson')}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors text-center border border-slate-800"
                >
                  {t.lessonEditor}
                </button>
                <button
                  onClick={() => onSelectProject(project, 'video')}
                  className="px-2 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors text-center border border-cyan-500/30 flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  <span>{t.videoEditor}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
