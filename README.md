# API Roguelike de Cartas

Backend REST de um roguelike de cartas inspirado em jogos como Slay the
Spire. O jogador cria uma run, enfrenta cinco batalhas comuns, escolhe
recompensas, luta contra um boss e tem o resultado refletido no ranking.

O projeto é um estudo prático de microserviços com Node.js, Express, MongoDB,
Docker Compose, JWT, Prometheus, Grafana e testes automatizados.

## O que o projeto demonstra

- API pública centralizada em um gateway.
- Autenticação JWT e autorização por perfis `user` e `admin`.
- Catálogo administrativo de cartas, inimigos e bosses.
- Runs, batalhas, deck, HP, recompensas e boss no `floor` 6.
- Transações MongoDB para impedir atualizações parciais do jogo.
- Outbox persistente para entregar runs finalizadas ao ranking.
- Worker com retry, backoff, lock e dead-letter.
- Ranking idempotente: um `runId` altera os totais uma única vez.
- Métricas Prometheus, dashboard Grafana e testes de carga com k6.

## Arquitetura

![Fluxo lógico do jogo, outbox e ranking](docs/diagrams/architecture-logical.svg)

O fluxo público é síncrono: cliente → gateway → serviço. A atualização do
ranking é assíncrona:

1. O `game-service` finaliza a run e cria um `OutboxEvent` na mesma transação.
2. O `game-outbox-worker` busca o evento no MongoDB.
3. O worker chama o `ranking-service`.
4. O ranking registra `ProcessedRun` e atualiza `Ranking` na mesma transação.
5. Uma reentrega do mesmo `runId` retorna sucesso sem incrementar novamente.

O worker usa a mesma imagem do `game-service`, mas roda em outro container e
outro processo. Assim, indisponibilidade do ranking não bloqueia a requisição
do jogador.

Detalhes e diagrama de deploy: [docs/architecture.md](docs/architecture.md).

## Início rápido — instalação nova

### Pré-requisitos

- Docker Desktop com Docker Compose v2.
- Node.js e npm para instalar dependências e executar scripts locais.
- k6 apenas para os testes de carga opcionais.

### 1. Instale as dependências

```bash
npm install
```

### 2. Crie o arquivo de ambiente

```bash
cp .env.example .env
```

Troque, no mínimo, estes valores do `.env`:

| Variável | Uso |
| --- | --- |
| `JWT_SECRET` | Assinatura dos tokens JWT. |
| `INTERNAL_SERVICE_SECRET` | Autenticação entre gateway, serviços e worker. |
| `ADMIN_SEED_PASSWORD` | Senha do administrador criado pelo seed. |
| `GRAFANA_PASSWORD` | Senha do Grafana. |

Você pode gerar segredos com:

```bash
openssl rand -base64 32
```

Use valores diferentes para `JWT_SECRET` e `INTERNAL_SERVICE_SECRET`.

### 3. Suba os serviços principais

```bash
npm run up
```

Esse comando executa `docker compose up --build -d` e mostra as URLs públicas.
Ele não inicia o worker na primeira instalação porque o worker pertence ao
profile `outbox`.

### 4. Execute os seeds

```bash
docker compose exec auth-service npm run seed:admin
docker compose exec catalog-service npm run seed:catalog
```

### 5. Ative o worker

Em uma instalação nova, o ranking está vazio e não precisa de reset:

```bash
docker compose --profile outbox up -d game-outbox-worker
```

Pronto. O jogo e a entrega assíncrona do ranking estão ativos.

### 6. Verifique o ambiente

```bash
docker compose --profile outbox ps
docker compose exec mongodb mongosh --quiet --eval "rs.status().ok"
```

O Mongo deve retornar `1`. O container `mongo-init-replica` deve aparecer como
`Exited (0)`; isso significa que a inicialização one-shot terminou com sucesso.

## Migração de um ambiente que já possuía ranking

Esta seção é apenas para o primeiro rollout da outbox em um banco que já tinha
dados de ranking.

Execute na ordem:

```bash
npm run up
docker compose exec -e CONFIRM_RANKING_RESET=true ranking-service npm run reset:ranking
docker compose --profile outbox up -d game-outbox-worker
```

Não repita o reset depois que o worker estiver em uso, a menos que você
realmente queira apagar o ranking atual.

Nas próximas inicializações, suba o ambiente completo com:

```bash
docker compose --profile outbox up --build -d
npm run ports
```


## Primeiro fluxo pela API

Use o Swagger em `http://localhost:3000/docs` ou faça as chamadas diretamente:

1. `POST /v1/auth/register` — cadastra o jogador.
2. `POST /v1/auth/login` — retorna o JWT.
3. `POST /v1/runs` — cria a run e o deck inicial.
4. `POST /v1/runs/{id}/battles` — cria uma batalha.
5. `POST /v1/battles/{id}/actions/play-card` — joga uma carta.
6. `GET /v1/runs/{id}/rewards` — consulta a recompensa pendente.
7. `POST /v1/rewards/{id}/choose` — adiciona uma carta ao deck.
8. Depois de cinco vitórias comuns, a batalha seguinte é o boss.
9. `GET /v1/ranking` — consulta o ranking global.

Rotas protegidas exigem `Authorization: Bearer <token>`. A referência completa
está em [docs/api-endpoints.md](docs/api-endpoints.md).

## Serviços e portas

| Componente | Papel | Acesso |
| --- | --- | --- |
| `api-gateway` | Entrada pública. | `localhost:3000` |
| `auth-service` | Usuários e JWT. | Docker `3001` |
| `catalog-service` | Catálogo do jogo. | Docker `3002` |
| `game-service` | Regras e outbox. | Docker `3003` |
| `ranking-service` | Ranking idempotente. | Docker `3004` |
| `game-outbox-worker` | Entrega de eventos. | Docker `3005` |
| `mongodb` | Replica Set `rs0`. | Docker `27017` |
| `prometheus` | Métricas. | `localhost:9090` |
| `grafana` | Dashboards. | `localhost:3005` |

As portas públicas podem ser alteradas em `.env`. Consulte os valores efetivos
com:

```bash
npm run ports
```

## Configuração da outbox

| Variável | Padrão | Função |
| --- | ---: | --- |
| `OUTBOX_POLL_INTERVAL_MS` | `1000` | Intervalo entre ciclos do worker. |
| `OUTBOX_BATCH_SIZE` | `20` | Máximo de eventos sequenciais por ciclo. |
| `OUTBOX_MAX_ATTEMPTS` | `10` | Tentativas antes de `dead_letter`. |
| `OUTBOX_BASE_DELAY_MS` | `1000` | Primeiro atraso do backoff. |
| `OUTBOX_MAX_DELAY_MS` | `60000` | Teto do backoff. |
| `OUTBOX_LOCK_TIMEOUT_MS` | `30000` | Recuperação de lock. |
| `OUTBOX_HTTP_TIMEOUT_MS` | `5000` | Timeout da chamada ao ranking. |
| `OUTBOX_METRICS_PORT` | `3005` | Health e métricas. |

## Testes

Instale as dependências e execute:

```bash
npm test
```

A suíte atual possui 116 testes. Ela inclui testes unitários, rotas com
Supertest e transações reais usando `MongoMemoryReplSet`.

Por workspace:

```bash
npm test --workspace=services/api-gateway
npm test --workspace=services/auth-service
npm test --workspace=services/catalog-service
npm test --workspace=services/game-service
npm test --workspace=services/ranking-service
```

Testes de carga opcionais:

```bash
k6 run tests/load/k6/main.js
k6 run tests/load/k6/ranking.js
k6 run tests/load/k6/stress.js
k6 run tests/load/k6/populate.js
```

## Observabilidade

- Gateway e serviços expõem `/health` e `/metrics`.
- Os serviços internos também expõem `/live`.
- O worker expõe `/live`, `/health` e `/metrics` apenas na rede Docker.
- Prometheus coleta métricas a cada 15 segundos.
- Grafana usa o Prometheus como datasource provisionado.
- Métricas da outbox não usam `userId` nem `runId` como labels.

Exemplo de consulta no Prometheus:

```promql
rate(api_gateway_http_requests_total[1m])
```

Logs úteis:

```bash
docker compose logs -f api-gateway
docker compose --profile outbox logs -f game-outbox-worker
```

## Segurança e limites

- Senhas são armazenadas com bcrypt.
- JWT valida algoritmo, `issuer` e `audience`.
- Serviços internos exigem `INTERNAL_SERVICE_SECRET`.
- Apps Express usam Helmet, removem `x-powered-by` e limitam JSON a `100kb`.
- Serviços internos não publicam portas no host.
- As portas públicas do Compose são vinculadas a `127.0.0.1`.
- O Replica Set local possui um único nó: permite transações, mas não oferece
  alta disponibilidade.
- Produção deve usar MongoDB gerenciado ou um Replica Set com vários membros.

Nunca versione `.env`, reutilize os segredos de exemplo ou execute
`docker compose down -v` sem intenção: a opção `-v` apaga os volumes, incluindo
o banco.

## Estrutura do projeto

```text
.
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── catalog-service/
│   ├── game-service/
│   │   └── src/workers/outboxWorker.js
│   └── ranking-service/
├── infra/mongo/                 # inicialização do Replica Set
├── monitoring/                  # Prometheus e Grafana
├── tests/load/k6/               # testes de carga
├── docs/                        # documentação técnica
├── docker-compose.yml
├── .env.example
└── README.md
```

## Comandos úteis

Serviços principais, sem ativar um worker novo:

```bash
npm run up
```

Ambiente completo, incluindo o worker:

```bash
docker compose --profile outbox up --build -d
```

Estado, portas e testes:

```bash
docker compose --profile outbox ps
npm run ports
npm test
```

Parar sem apagar os dados:

```bash
docker compose --profile outbox down
```

Apagar também os volumes — incluindo o MongoDB:

```bash
docker compose --profile outbox down -v
```

## Documentação técnica

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura](docs/architecture.md) | Fluxo síncrono, outbox, worker e deploy. |
| [Requisitos](docs/requirements.md) | Regras de negócio e consistência. |
| [Modelagem MongoDB](docs/mongodb-modeling.md) | Coleções e transações. |
| [Endpoints](docs/api-endpoints.md) | Rotas públicas e internas. |
| [SDD](docs/sdd.md) | Decisões de desenho dos serviços. |


