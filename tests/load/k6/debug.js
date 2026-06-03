import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 3,
};

const BASE_URL = 'http://localhost:3000/v1';

export default function () {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'admin@email.com', password: 'admin123456' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  console.log(`Status: ${res.status}`);
  console.log(`Body: ${res.body}`);

  check(res, {
    'login 200': (r) => r.status === 200,
  });
}
