/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { NewProjectWizard } from './components/NewProjectWizard';
import { TranscriptEditor } from './components/TranscriptEditor';
import { LessonEditor } from './components/LessonEditor';
import { VideoEditor } from './components/VideoEditor';
import { ExportPage } from './components/ExportPage';
import { ArchitectureModal } from './components/ArchitectureModal';
import { AIModelSettingsModal } from './components/AIModelSettingsModal';
import { Locale } from './lib/i18n';
import { Project, AIModelConfig } from './types';

export default function App() {
  const [locale, setLocale] = useState<Locale>('fa');
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'wizard' | 'transcript' | 'lesson' | 'video' | 'export'
  >('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync RTL / LTR document attributes with locale
  useEffect(() => {
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  // Load initial projects from backend
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setProjects(data.projects);
        if (!currentProject) {
          setCurrentProject(data.projects[0]);
        }
      } else {
        // If empty, fetch sample demo project
        const sampleRes = await fetch('/api/sample');
        const sampleData = await sampleRes.json();
        if (sampleData.sample) {
          setProjects([sampleData.sample]);
          setCurrentProject(sampleData.sample);
        }
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (
    project: Project,
    tab: 'transcript' | 'lesson' | 'video' | 'export' = 'video'
  ) => {
    setCurrentProject(project);
    setActiveTab(tab);
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProject(newProject);
    setActiveTab('transcript');
  };

  const handleUpdateProject = (updated: Project) => {
    setCurrentProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm(locale === 'fa' ? 'آیا از حذف این پروژه اطمینان دارید؟' : 'Delete this project?')) {
      try {
        await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
          setActiveTab('dashboard');
        }
      } catch (err) {
        console.error('Failed to delete project', err);
      }
    }
  };

  const handleLoadDemo = async () => {
    try {
      const res = await fetch('/api/sample');
      const data = await res.json();
      if (data.sample) {
        // Check if already in list
        const exists = projects.find((p) => p.id === data.sample.id);
        if (!exists) {
          setProjects((prev) => [data.sample, ...prev]);
        }
        setCurrentProject(data.sample);
        setActiveTab('video');
      }
    } catch (err) {
      console.error('Error loading demo project', err);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${locale === 'fa' ? 'font-persian' : 'font-english'}`}>
      {/* Global Navigation Header */}
      <Header
        currentLocale={locale}
        setLocale={setLocale}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentProject={currentProject}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenAISettings={() => setIsAISettingsOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            projects={projects}
            locale={locale}
            onSelectProject={handleSelectProject}
            onCreateNew={() => setActiveTab('wizard')}
            onDeleteProject={handleDeleteProject}
            onLoadDemo={handleLoadDemo}
          />
        )}

        {activeTab === 'wizard' && (
          <NewProjectWizard
            locale={locale}
            onCancel={() => setActiveTab('dashboard')}
            onProjectCreated={handleProjectCreated}
          />
        )}

        {activeTab === 'transcript' && currentProject && (
          <TranscriptEditor
            project={currentProject}
            locale={locale}
            onUpdateProject={handleUpdateProject}
            onProceedToLesson={() => setActiveTab('lesson')}
          />
        )}

        {activeTab === 'lesson' && currentProject && (
          <LessonEditor
            project={currentProject}
            locale={locale}
            onUpdateProject={handleUpdateProject}
            onProceedToVideo={() => setActiveTab('video')}
          />
        )}

        {activeTab === 'video' && currentProject && (
          <VideoEditor
            project={currentProject}
            locale={locale}
            onUpdateProject={handleUpdateProject}
            onProceedToExport={() => setActiveTab('export')}
          />
        )}

        {activeTab === 'export' && currentProject && (
          <ExportPage
            project={currentProject}
            locale={locale}
            onUpdateProject={handleUpdateProject}
          />
        )}
      </main>

      {/* Architecture & Blueprint Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
        locale={locale}
      />

      {/* AI Model & Provider Configuration Modal */}
      <AIModelSettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        locale={locale}
        currentProject={currentProject}
        onUpdateAIConfig={(newCfg) => {
          if (currentProject) {
            handleUpdateProject({
              ...currentProject,
              aiModelConfig: newCfg,
            });
          }
        }}
      />
    </div>
  );
}
