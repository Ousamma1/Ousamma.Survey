import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import { surveyService } from '../../services/survey.service';
import { responseService } from '../../services/response.service';
import 'survey-core/defaultV2.min.css';

export const SurveyTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadSurvey(id);
    }
  }, [id]);

  const loadSurvey = async (surveyId: string) => {
    setLoading(true);
    try {
      const surveyData = await surveyService.getSurveyById(surveyId);

      if (surveyData.status !== 'published') {
        alert('This survey is not available');
        navigate('/');
        return;
      }

      const surveyModel = new Model(surveyData.surveyJson);

      // Customize survey appearance
      surveyModel.showProgressBar = 'top';
      surveyModel.showCompletedPage = true;
      surveyModel.completedHtml = '<h3>Thank you for completing the survey!</h3><p>Your response has been recorded.</p>';

      // Handle survey completion
      surveyModel.onComplete.add(async (sender) => {
        setSubmitting(true);
        try {
          await responseService.submitResponse({
            surveyId,
            responseData: sender.data,
          });
          // Survey will show completion page automatically
        } catch (error) {
          console.error('Failed to submit response:', error);
          alert('Failed to submit response. Please try again.');
        } finally {
          setSubmitting(false);
        }
      });

      setSurvey(surveyModel);
    } catch (error) {
      console.error('Failed to load survey:', error);
      alert('Failed to load survey');
      navigate('/');
    } finally {
      setLoading(false);
    }
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

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Survey not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {submitting && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            Submitting your response...
          </div>
        )}
        <Survey model={survey} />
      </div>
    </div>
  );
};
