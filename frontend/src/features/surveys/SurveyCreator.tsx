import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react';
import { surveyService } from '../../services/survey.service';
import { Button } from '../../components/Button';
import 'survey-core/defaultV2.min.css';
import 'survey-creator-core/survey-creator-core.min.css';

// SurveyJS Creator options
const creatorOptions = {
  showLogicTab: true,
  showTranslationTab: true,
  showJSONEditorTab: true,
  isAutoSave: false,
  showState: true,
};

export const SurveyCreatorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creator] = useState(() => new SurveyCreator(creatorOptions));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');

  // Load existing survey if editing
  useEffect(() => {
    if (id) {
      loadSurvey(id);
    } else {
      // New survey - set default
      creator.text = JSON.stringify({
        title: 'New Survey',
        pages: [
          {
            name: 'page1',
            elements: [
              {
                type: 'text',
                name: 'question1',
                title: 'What is your name?',
              },
            ],
          },
        ],
      });
    }
  }, [id, creator]);

  const loadSurvey = async (surveyId: string) => {
    setLoading(true);
    try {
      const survey = await surveyService.getSurveyById(surveyId);
      setSurveyTitle(survey.title);
      setSurveyDescription(survey.description || '');
      creator.text = JSON.stringify(survey.surveyJson);
    } catch (error) {
      console.error('Failed to load survey:', error);
      alert('Failed to load survey');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    setSaving(true);
    try {
      const surveyJson = JSON.parse(creator.text);

      if (!surveyTitle.trim()) {
        alert('Please enter a survey title');
        return;
      }

      if (id) {
        // Update existing survey
        await surveyService.updateSurvey(id, {
          title: surveyTitle,
          description: surveyDescription,
          surveyJson,
          status: publish ? 'published' : 'draft',
        });

        if (publish) {
          await surveyService.publishSurvey(id);
        }
      } else {
        // Create new survey
        const newSurvey = await surveyService.createSurvey({
          title: surveyTitle,
          description: surveyDescription,
          surveyJson,
        });

        if (publish) {
          await surveyService.publishSurvey(newSurvey.id);
        }

        navigate(`/surveys/${newSurvey.id}`);
      }

      alert(publish ? 'Survey published successfully!' : 'Survey saved successfully!');
      navigate('/surveys');
    } catch (error) {
      console.error('Failed to save survey:', error);
      alert('Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    creator.showPreview();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 max-w-2xl">
              <input
                type="text"
                value={surveyTitle}
                onChange={(e) => setSurveyTitle(e.target.value)}
                placeholder="Enter survey title..."
                className="text-2xl font-bold border-none focus:outline-none focus:ring-0 w-full"
              />
              <input
                type="text"
                value={surveyDescription}
                onChange={(e) => setSurveyDescription(e.target.value)}
                placeholder="Add description (optional)..."
                className="text-sm text-gray-600 border-none focus:outline-none focus:ring-0 w-full mt-1"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/surveys')}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handlePreview}
              >
                Preview
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSave(false)}
                loading={saving}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave(true)}
                loading={saving}
              >
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Survey Creator */}
      <div className="max-w-7xl mx-auto">
        <SurveyCreatorComponent creator={creator} />
      </div>
    </div>
  );
};
