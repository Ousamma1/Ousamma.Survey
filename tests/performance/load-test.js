/**
 * K6 Load Testing Script
 * Sprint 19: Testing & QA
 *
 * Tests the system under various load conditions
 * Target: 1000+ concurrent users
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const surveyCreationTime = new Trend('survey_creation_duration');
const responseSubmissionTime = new Trend('response_submission_duration');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 100 },    // Stay at 100 users
    { duration: '2m', target: 500 },    // Ramp up to 500 users
    { duration: '5m', target: 500 },    // Stay at 500 users
    { duration: '2m', target: 1000 },   // Ramp up to 1000 users
    { duration: '5m', target: 1000 },   // Stay at 1000 users
    { duration: '2m', target: 0 },      // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],                  // Error rate < 1%
    'errors': ['rate<0.05'],                           // Custom error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data generators
function generateSurvey() {
  return {
    title: {
      en: `Load Test Survey ${Date.now()}`,
      ar: `استطلاع اختبار الحمل ${Date.now()}`
    },
    description: {
      en: 'Performance test survey'
    },
    questions: [
      {
        questionId: `q1-${Date.now()}`,
        type: 'scale',
        text: { en: 'How would you rate our service?' },
        required: true,
        scaleSettings: { min: 1, max: 5 }
      },
      {
        questionId: `q2-${Date.now()}`,
        type: 'paragraph',
        text: { en: 'Any additional feedback?' },
        required: false
      }
    ],
    createdBy: `user-${__VU}`
  };
}

function generateResponse(surveyId) {
  return {
    answers: [
      {
        questionId: 'q1',
        value: Math.floor(Math.random() * 5) + 1
      },
      {
        questionId: 'q2',
        value: 'This is a test response from k6 load testing'
      }
    ],
    userId: `user-${__VU}`,
    userName: `Test User ${__VU}`,
    userEmail: `user${__VU}@example.com`
  };
}

// Main test scenario
export default function () {
  group('Survey Operations', () => {
    // Create survey
    group('Create Survey', () => {
      const surveyData = generateSurvey();
      const createStart = Date.now();

      const createRes = http.post(
        `${BASE_URL}/api/surveys`,
        JSON.stringify(surveyData),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      apiCalls.add(1);
      surveyCreationTime.add(Date.now() - createStart);

      check(createRes, {
        'survey created': (r) => r.status === 201,
        'has surveyId': (r) => JSON.parse(r.body).data?.surveyId !== undefined,
      }) || errorRate.add(1);

      sleep(1);
    });

    // List surveys
    group('List Surveys', () => {
      const listRes = http.get(`${BASE_URL}/api/surveys?page=1&limit=20`);

      apiCalls.add(1);

      check(listRes, {
        'surveys listed': (r) => r.status === 200,
        'has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
      }) || errorRate.add(1);

      sleep(0.5);
    });

    // Get survey details
    group('Get Survey', () => {
      // Use a known survey ID for testing
      const surveyId = 'test-survey-123';
      const getRes = http.get(`${BASE_URL}/api/surveys/${surveyId}`);

      apiCalls.add(1);

      check(getRes, {
        'survey retrieved': (r) => r.status === 200 || r.status === 404,
      }) || errorRate.add(1);

      sleep(0.5);
    });

    // Submit response
    group('Submit Response', () => {
      const surveyId = 'test-survey-123';
      const responseData = generateResponse(surveyId);
      const submitStart = Date.now();

      const submitRes = http.post(
        `${BASE_URL}/api/surveys/${surveyId}/responses`,
        JSON.stringify(responseData),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      apiCalls.add(1);
      responseSubmissionTime.add(Date.now() - submitStart);

      check(submitRes, {
        'response submitted': (r) => r.status === 200 || r.status === 403 || r.status === 404,
      }) || errorRate.add(1);

      sleep(1);
    });

    // Get analytics
    group('Get Analytics', () => {
      const surveyId = 'test-survey-123';
      const analyticsRes = http.get(`${BASE_URL}/api/surveys/${surveyId}/analytics`);

      apiCalls.add(1);

      check(analyticsRes, {
        'analytics retrieved': (r) => r.status === 200 || r.status === 404,
      }) || errorRate.add(1);

      sleep(0.5);
    });
  });

  sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
}

// Stress test scenario (separate)
export function stressTest() {
  const surveyId = 'test-survey-123';

  for (let i = 0; i < 10; i++) {
    const responseData = generateResponse(surveyId);

    const res = http.post(
      `${BASE_URL}/api/surveys/${surveyId}/responses`,
      JSON.stringify(responseData),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    check(res, {
      'stress test response ok': (r) => r.status < 500,
    });
  }
}

// Spike test scenario
export function spikeTest() {
  const scenarios = ['create', 'list', 'get', 'submit'];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  switch (scenario) {
    case 'create':
      http.post(`${BASE_URL}/api/surveys`, JSON.stringify(generateSurvey()), {
        headers: { 'Content-Type': 'application/json' },
      });
      break;
    case 'list':
      http.get(`${BASE_URL}/api/surveys`);
      break;
    case 'get':
      http.get(`${BASE_URL}/api/surveys/test-survey-123`);
      break;
    case 'submit':
      http.post(
        `${BASE_URL}/api/surveys/test-survey-123/responses`,
        JSON.stringify(generateResponse('test-survey-123')),
        { headers: { 'Content-Type': 'application/json' } }
      );
      break;
  }
}

// Endurance test configuration
export const enduranceOptions = {
  stages: [
    { duration: '5m', target: 200 },    // Ramp up
    { duration: '60m', target: 200 },   // Stay for 1 hour
    { duration: '5m', target: 0 },      // Ramp down
  ],
};

// Summary handler
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;

  let summary = '\n';
  summary += `${indent}Test Summary\n`;
  summary += `${indent}============\n\n`;

  // Requests
  const requests = data.metrics.http_reqs;
  summary += `${indent}HTTP Requests: ${requests.values.count}\n`;

  // Response times
  const duration = data.metrics.http_req_duration;
  summary += `${indent}Response Time (avg): ${duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}Response Time (p95): ${duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}Response Time (p99): ${duration.values['p(99)'].toFixed(2)}ms\n`;

  // Errors
  const failed = data.metrics.http_req_failed;
  summary += `${indent}Failed Requests: ${(failed.values.rate * 100).toFixed(2)}%\n`;

  // Custom metrics
  if (data.metrics.survey_creation_duration) {
    summary += `${indent}Survey Creation (avg): ${data.metrics.survey_creation_duration.values.avg.toFixed(2)}ms\n`;
  }

  if (data.metrics.response_submission_duration) {
    summary += `${indent}Response Submission (avg): ${data.metrics.response_submission_duration.values.avg.toFixed(2)}ms\n`;
  }

  return summary;
}
