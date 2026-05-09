const { createApp } = require('./app');
const { loadConfig } = require('./config/env');

function start() {
  const config = loadConfig();
  const app = createApp({ config });

  app.listen(config.port, () => {
    console.log(`api-gateway rodando na porta ${config.port}`);
  });
}

start();
