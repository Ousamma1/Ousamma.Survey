import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { surveyService } from '../../services/survey.service';
import { Survey } from '../../types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';

export const SurveyList: React.FC = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Survey['status'] | 'all'>('all');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');

  useEffect(() => {
    loadSurveys();
  }, [statusFilter]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const response = await surveyService.getMySurveys({ page: 1, pageSize: 50 });
      setSurveys(response.data);
    } catch (error) {
      console.error('Failed to load surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSurvey) return;

    try {
      await surveyService.deleteSurvey(selectedSurvey.id);
      setSurveys(surveys.filter((s) => s.id !== selectedSurvey.id));
      setShowDeleteModal(false);
      setSelectedSurvey(null);
    } catch (error) {
      console.error('Failed to delete survey:', error);
      alert('Failed to delete survey');
    }
  };

  const handleDuplicate = async () => {
    if (!selectedSurvey || !duplicateTitle.trim()) return;

    try {
      await surveyService.duplicateSurvey(selectedSurvey.id, duplicateTitle);
      setShowDuplicateModal(false);
      setSelectedSurvey(null);
      setDuplicateTitle('');
      loadSurveys();
    } catch (error) {
      console.error('Failed to duplicate survey:', error);
      alert('Failed to duplicate survey');
    }
  };

  const handlePublish = async (survey: Survey) => {
    try {
      await surveyService.publishSurvey(survey.id);
      loadSurveys();
    } catch (error) {
      console.error('Failed to publish survey:', error);
      alert('Failed to publish survey');
    }
  };

  const handleClose = async (survey: Survey) => {
    try {
      await surveyService.closeSurvey(survey.id);
      loadSurveys();
    } catch (error) {
      console.error('Failed to close survey:', error);
      alert('Failed to close survey');
    }
  };

  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch = survey.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || survey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Survey['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading surveys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Surveys</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage your surveys
            </p>
          </div>
          <Link to="/surveys/new">
            <Button variant="primary" size="lg">
              Create Survey
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search surveys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Survey['status'] | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Survey Grid */}
      {filteredSurveys.length === 0 ? (
        <Card className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new survey.
          </p>
          <div className="mt-6">
            <Link to="/surveys/new">
              <Button variant="primary">Create Survey</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSurveys.map((survey) => (
            <Card key={survey.id} hover className="flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {survey.title}
                  </h3>
                  {getStatusBadge(survey.status)}
                </div>
                {survey.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {survey.description}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Created {new Date(survey.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/surveys/${survey.id}/edit`)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/surveys/${survey.id}/analytics`)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Analytics
                  </button>
                </div>

                <div className="relative group">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 hidden group-hover:block">
                    {survey.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(survey)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Publish
                      </button>
                    )}
                    {survey.status === 'published' && (
                      <button
                        onClick={() => handleClose(survey)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Close
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSurvey(survey);
                        setDuplicateTitle(`${survey.title} (Copy)`);
                        setShowDuplicateModal(true);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSurvey(survey);
                        setShowDeleteModal(true);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Survey"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{selectedSurvey?.title}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Duplicate Survey"
      >
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Survey Title
          </label>
          <input
            type="text"
            value={duplicateTitle}
            onChange={(e) => setDuplicateTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setShowDuplicateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDuplicate}>
            Duplicate
          </Button>
        </div>
      </Modal>
    </div>
  );
};
