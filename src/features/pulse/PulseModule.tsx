import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import { Survey, ResponseRecord, SurveyStatus } from '@/types';
import { SurveyList } from './components/SurveyList';
import { SurveyBuilder } from './components/builder/SurveyBuilder';
import { SurveyPlayer } from './components/SurveyPlayer';
import { SurveyReports } from './components/SurveyReports';

export const PulseModule: React.FC = () => {
  const { auth, showAlertDialog } = useAppStore();
  const currentUser = auth.user;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'builder' | 'player' | 'reports'>('list');

  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showLoadingState = false) => {
    if (showLoadingState) setIsRefreshing(true);
    try {
      // Carga inicial del caché local (rápido)
      setSurveys(dataService.getSurveys());
      setResponses(dataService.getResponses());

      // Sincronización asíncrona con Supabase
      const cloudData = await dataService.fetchSurveysAndResponses();
      setSurveys(cloudData.surveys);
      setResponses(cloudData.responses);
    } finally {
      if (showLoadingState) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const responsesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    responses.forEach(r => {
      map[r.survey_id] = (map[r.survey_id] || 0) + 1;
    });
    return map;
  }, [responses]);

  const handleCreateNew = (type: 'survey' | 'quiz') => {
    const newSurvey: Survey = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      owner_id: currentUser?.id || 'admin',
      owner_name: currentUser?.username || 'Administrador',
      type,
      category: 'General',
      title: type === 'quiz' ? 'Evaluación Operativa KFC' : 'Encuesta de Satisfacción',
      description: '',
      status: 'draft',
      access_mode: 'open',
      passing_score_percent: 70,
      scoring_type: 'simple',
      theme: {
        primary_color: '#E4002B',
        background_color: '#F8FAFC',
        card_style: 'standard',
        font_family: 'jakarta',
      },
      thank_you: {
        title: '¡Muchas gracias por participar!',
        message: 'Tus datos e información han sido registrados exitosamente.',
        show_button: false,
      },
      questions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSelectedSurvey(newSurvey);
    setActiveTab('builder');
  };

  const handleEdit = (survey: Survey) => {
    setSelectedSurvey(survey);
    setActiveTab('builder');
  };

  const handlePlay = (survey: Survey) => {
    setSelectedSurvey(survey);
    setActiveTab('player');
  };

  const handleReports = (survey: Survey) => {
    setSelectedSurvey(survey);
    setActiveTab('reports');
  };

  const handleDuplicate = async (survey: Survey) => {
    const duplicated: Survey = {
      ...survey,
      id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: `${survey.title} (Copia)`,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await dataService.saveSurvey(duplicated);
    loadData();
  };

  const handleDelete = async (surveyId: string) => {
    await dataService.deleteSurvey(surveyId);
    loadData();
  };

  const handleToggleStatus = async (survey: Survey, status: SurveyStatus) => {
    const updated = { ...survey, status, updated_at: new Date().toISOString() };
    await dataService.saveSurvey(updated);
    loadData();
  };

  const handleSaveSurveyFromBuilder = async (surveyToSave: Survey) => {
    const updatedSurvey = {
      ...surveyToSave,
      updated_at: new Date().toISOString()
    };
    await dataService.saveSurvey(updatedSurvey);
    setSurveys(prev => {
      const idx = prev.findIndex(s => s.id === updatedSurvey.id);
      if (idx >= 0) {
        return prev.map((s, i) => i === idx ? updatedSurvey : s);
      }
      return [updatedSurvey, ...prev];
    });
    setActiveTab('list');
    setSelectedSurvey(null);
    showAlertDialog('¡El formulario ha sido guardado exitosamente!');
  };

  const handleSubmitResponseFromPlayer = async (record: ResponseRecord) => {
    await dataService.saveResponse(record);
    loadData();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {activeTab === 'list' && (
        <SurveyList
          surveys={surveys}
          responsesCountMap={responsesCountMap}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onPlay={handlePlay}
          onReports={handleReports}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          onRefresh={() => loadData(true)}
          isRefreshing={isRefreshing}
        />
      )}

      {activeTab === 'builder' && selectedSurvey && (
        <SurveyBuilder
          initialSurvey={selectedSurvey}
          onSave={handleSaveSurveyFromBuilder}
          onCancel={() => {
            setActiveTab('list');
            setSelectedSurvey(null);
          }}
        />
      )}

      {activeTab === 'player' && selectedSurvey && (
        <SurveyPlayer
          survey={selectedSurvey}
          onSubmit={handleSubmitResponseFromPlayer}
          onClose={() => {
            setActiveTab('list');
            setSelectedSurvey(null);
          }}
        />
      )}

      {activeTab === 'reports' && selectedSurvey && (
        <SurveyReports
          survey={selectedSurvey}
          onBack={() => {
            setActiveTab('list');
            setSelectedSurvey(null);
          }}
        />
      )}
    </div>
  );
};

export default PulseModule;
