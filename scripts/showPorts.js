const fs = require('fs');
const path = require('path');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      env[key] = rawValue.replace(/^["']|["']$/g, '');

      return env;
    }, {});
}

const rootDir = path.resolve(__dirname, '..');
const defaults = readEnvFile(path.join(rootDir, '.env.example'));
const local = readEnvFile(path.join(rootDir, '.env'));
const env = { ...defaults, ...local, ...process.env };

function value(name, fallback) {
  return env[name] || fallback;
}

const apiPort = value('API_GATEWAY_HOST_PORT', '3000');
const prometheusPort = value('PROMETHEUS_PORT', '9090');
const grafanaPort = value('GRAFANA_PORT', '3005');
const grafanaUser = value('GRAFANA_USER', 'admin');

const internalPorts = [
  ['api-gateway', value('GATEWAY_PORT', '3000')],
  ['auth-service', value('AUTH_SERVICE_PORT', '3001')],
  ['catalog-service', value('CATALOG_SERVICE_PORT', '3002')],
  ['game-service', value('GAME_SERVICE_PORT', '3003')],
  ['ranking-service', value('RANKING_SERVICE_PORT', '3004')],
  ['mongodb', '27017'],
  ['prometheus', '9090'],
  ['grafana', '3000']
];

console.log('');
console.log('Servicos publicos no localhost:');
console.log(`- API Gateway: http://localhost:${apiPort}`);
console.log(`- Swagger:     http://localhost:${apiPort}/docs`);
console.log(`- Prometheus:  http://localhost:${prometheusPort}`);
console.log(`- Grafana:     http://localhost:${grafanaPort} (usuario: ${grafanaUser})`);
console.log('');
console.log('Portas internas na rede Docker:');
for (const [service, port] of internalPorts) {
  console.log(`- ${service}: ${port}`);
}