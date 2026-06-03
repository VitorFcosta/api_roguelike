import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '15s',
};

const BASE_URL = 'http://localhost:3000/v1';

export default function () {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'admin@email.com', password: 'admin123456' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    console.log(`FALHA status=${res.status} body=${res.body}`);
  }

  check(res, { 'login 200': (r) => r.status === 200 });
  sleep(1);
}
