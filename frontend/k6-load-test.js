import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // Simulates 50 users constantly hitting the backend for 30 seconds
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50 users
    { duration: '30s', target: 50 }, // Stay at 50 users for 30 seconds
    { duration: '10s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    // 95% of requests must complete within 3 seconds
    http_req_duration: ['p(95)<3000'],
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'], 
  },
};

export default function () {
  const url = 'http://localhost:3000/api/chat';
  
  const payload = JSON.stringify({
    userMessage: "I have eggs, milk, and bread. What can I make?",
    userConstraints: {
      dietaryPreference: "Any",
      maxCookingTime: 30,
      allergies: [],
      inventory: ["eggs", "milk", "bread"]
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'returns choices': (r) => r.json().choices !== undefined,
  });

  // Wait 1 second between requests to simulate human pacing slightly
  sleep(1);
}
