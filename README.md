# API Roguelike de Cartas

Backend REST para um jogo de cartas roguelike simplificado, inspirado em jogos como Slay the Spire. O jogador cria uma run, enfrenta batalhas, escolhe recompensas, vence ou perde a tentativa e tem o resultado refletido no ranking.

Este projeto foi criado como estudo prático de arquitetura em microserviços com Node.js, Docker, MongoDB, autenticação JWT, observabilidade com Prometheus/Grafana e testes automatizados.

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Modelagem dos dados](#modelagem-dos-dados)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Como executar](#como-executar)
- [URLs do ambiente local](#urls-do-ambiente-local)
- [Fluxo principal](#fluxo-principal)
- [Documentação da API](#documentação-da-api)
- [Testes](#testes)
- [Observabilidade](#observabilidade)
- [Segurança](#segurança)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Comandos úteis](#comandos-úteis)
- [Documentos técnicos](#documentos-técnicos)
- [Licença](#licença)

## Visão geral

A API é organizada em microserviços. O cliente nunca chama os serviços diretamente; toda requisição pública entra pelo `api-gateway`, que valida autenticação, aplica rate limit e encaminha a chamada para o serviço correto.

O jogo tem uma regra central: cada usuário pode ter uma run ativa por vez. Durante a run, ele enfrenta 5 batalhas comuns, escolhe recompensas entre batalhas e depois enfrenta o boss no `floor` 6. Ao vencer, perder ou abandonar, o resultado alimenta o ranking.

## Funcionalidades

- Cadastro e login de usuários.
- Autenticação com JWT.
- Controle de acesso por perfil `user` e `admin`.
- CRUD administrativo de cartas, inimigos e bosses.
- Soft delete no catálogo.
- Criação e consulta de runs.
- Criação de batalhas.
- Ação de jogar carta em batalha.
- Escolha de recompensa.
- Ranking global e estatísticas do usuário.
- Atualizações atômicas de batalha, run, recompensa e outbox.
- Entrega assíncrona do resultado ao ranking com retry e dead-letter.
- Ranking idempotente por `runId`.
- Swagger para testar a API.
- Métricas Prometheus e dashboard Grafana.
- Testes unitários/integrados com Jest e Supertest.
- Testes de carga com k6.

## Arquitetura

A visão geral abaixo mostra o papel do gateway, dos microserviços, do MongoDB e da observabilidade.

![Arquitetura lógica da API Roguelike de Cartas](docs/diagrams/architecture-logical.svg)

| Serviço | Responsabilidade |
|---|---|
| `api-gateway` | Entrada pública da API, JWT, CORS, rate limit, Swagger e proxy |
| `auth-service` | Cadastro, login, usuários e seed do admin |
| `catalog-service` | Catálogo de cartas, inimigos e bosses |
| `game-service` | Runs, batalhas, recompensas e regras do jogo |
| `game-outbox-worker` | Publica resultados de runs no ranking com retry |
| `ranking-service` | Ranking global e estatísticas do jogador |
| `mongodb` | Persistência dos dados |
| `prometheus` | Coleta de métricas |
| `grafana` | Visualização das métricas |

Fluxo resumido:

```text
Cliente/k6/Swagger
  -> api-gateway
    -> auth-service
    -> catalog-service
    -> game-service
      -> catalog-service
    -> ranking-service
game-service -> MongoDB (run, batalha, recompensa e outbox na mesma transacao)
game-outbox-worker -> MongoDB (claim da outbox) -> ranking-service
Prometheus -> /metrics dos serviços
Grafana -> Prometheus
```

Veja mais detalhes em [docs/architecture.md](docs/architecture.md).

## Modelagem dos dados

O projeto usa MongoDB com Mongoose. A modelagem mistura dois conceitos:

- **Referência**: um documento aponta para outro, como `Battle.runId`.
- **Snapshot**: o jogo copia dados importantes para preservar o estado histórico, como cartas dentro do deck da run e dados do inimigo dentro da batalha.

Isso é importante porque o catálogo pode mudar depois. Se o admin editar uma carta, uma run antiga continua mostrando a carta como ela era naquele momento.

| Coleção | Serviço | Papel |
|---|---|---|
| `users` | `auth-service` | Usuários, email, senha hasheada e perfil |
| `cards` | `catalog-service` | Cartas do catálogo |
| `enemies` | `catalog-service` | Inimigos comuns |
| `bosses` | `catalog-service` | Bosses |
| `runs` | `game-service` | Tentativas do jogador, HP, floor, deck e status |
| `battles` | `game-service` | Estado da batalha e log de ações |
| `rewards` | `game-service` | Opções de recompensa e carta escolhida |
| `outboxevents` | `game-service` | Eventos pendentes, publicados ou em dead-letter |
| `rankings` | `ranking-service` | Estatísticas agregadas por usuário |
| `processedruns` | `ranking-service` | Controle idempotente dos `runId` já aplicados |

O diagrama ER completo e exemplos de documentos ficam em [docs/mongodb-modeling.md](docs/mongodb-modeling.md).

## Stack

- Node.js
- Express
- MongoDB
- Mongoose
- Docker Compose
- JWT
- bcrypt
- Zod
- Helmet
- Prometheus
- Grafana
- Jest
- Supertest
- k6

## Pré-requisitos

- Docker Desktop instalado e rodando.
- Node.js e npm instalados para usar scripts locais.
- k6 instalado apenas se você quiser rodar testes de carga.

## Configuração

Crie o `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

Depois edite o `.env`. Os valores abaixo precisam ser trocados antes de subir o ambiente:

| Variável | Para que serve |
|---|---|
| `JWT_SECRET` | Segredo usado para assinar tokens JWT |
| `INTERNAL_SERVICE_SECRET` | Segredo usado entre gateway e microserviços |
| `ADMIN_SEED_PASSWORD` | Senha do usuário admin criado pelo seed |
| `GRAFANA_PASSWORD` | Senha do usuário do Grafana |

As portas públicas também ficam no `.env`:

| Variável | Padrão | Serviço |
|---|---:|---|
| `API_GATEWAY_HOST_PORT` | `3000` | API Gateway e Swagger |
| `PROMETHEUS_PORT` | `9090` | Prometheus |
| `GRAFANA_PORT` | `3005` | Grafana |

Para gerar segredos fortes:

```bash
openssl rand -base64 32
```

Use um valor diferente para `JWT_SECRET` e `INTERNAL_SERVICE_SECRET`.

## Como executar

Suba todos os containers:

```bash
npm run up
```

Esse comando executa `docker compose up --build -d` e imprime as portas principais no terminal. Na primeira migração para a outbox, o worker fica propositalmente desligado até o reset controlado do ranking.

Em um ambiente novo, sem ranking anterior para migrar, ative o worker depois que os servicos base estiverem saudaveis:

```bash
docker compose --profile outbox up -d game-outbox-worker
```

### Primeiro rollout da outbox

Execute esta sequência uma única vez no ambiente que já possuía dados de ranking:

```bash
npm run up
docker compose exec -e CONFIRM_RANKING_RESET=true ranking-service npm run reset:ranking
docker compose --profile outbox up -d game-outbox-worker
```

O reset apaga somente `rankings` e `processedruns`. Ele nunca roda automaticamente e falha se `CONFIRM_RANKING_RESET` não for exatamente `true`. Depois desse primeiro rollout, suba o ambiente com o profile do worker:

```bash
docker compose --profile outbox up --build -d
```
 |

Se você já subiu o ambiente e quer apenas rever as portas:

```bash
npm run ports
```

Aguarde os serviços ficarem saudáveis:

```bash
docker compose ps
```

Execute os seeds:

```bash
docker compose exec auth-service npm run seed:admin
docker compose exec catalog-service npm run seed:catalog
```

## URLs do ambiente local

Com os valores padrão do `.env.example`:

| Recurso | URL |
|---|---|
| API Gateway | `http://localhost:3000` |
| Swagger | `http://localhost:3000/docs` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3005` |

Se você mudar as portas no `.env`, rode:

```bash
npm run ports
```

## Fluxo principal

1. `POST /v1/auth/register` cadastra usuário.
2. `POST /v1/auth/login` retorna o JWT.
3. `POST /v1/runs` cria uma run.
4. `POST /v1/runs/:id/battles` cria uma batalha.
5. `POST /v1/battles/:id/actions/play-card` joga uma carta.
6. `POST /v1/rewards/:id/choose` escolhe uma recompensa.
7. Depois de 5 vitórias comuns, o próximo combate é o boss.
8. Ao finalizar a run, um evento é salvo na mesma transação do jogo.
9. O worker entrega o evento ao ranking; reentregas do mesmo `runId` não duplicam totais.
10. `GET /v1/ranking` consulta o ranking global.

## Documentação da API

Acesse o Swagger:

```text
http://localhost:${API_GATEWAY_HOST_PORT}/docs
```

Com a porta padrão:

```text
http://localhost:3000/docs
```

Para testar rotas protegidas:

1. Execute `POST /auth/login`.
2. Copie o token retornado.
3. Clique em `Authorize` no Swagger.
4. Cole o token no formato `Bearer <token>`.

Resumo dos grupos de endpoints:

| Grupo | Rotas |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/users/me`, `/users` |
| Catálogo | `/cards`, `/enemies`, `/bosses` |
| Jogo | `/runs`, `/battles`, `/rewards` |
| Ranking | `/ranking`, `/ranking/me` |
| Infra | `/health`, `/metrics` |

Veja a lista completa em [docs/api-endpoints.md](docs/api-endpoints.md).

## Testes

Rodar todos os testes automatizados:

```bash
npm test
```

Rodar apenas alguns workspaces:

```bash
npm run test:auth
npm run test:gateway
```

Testes de carga com k6:

```bash
k6 run tests/load/k6/main.js
k6 run tests/load/k6/ranking.js
k6 run tests/load/k6/stress.js
k6 run tests/load/k6/populate.js
```

Os scripts de k6 usam `http://localhost:3000/v1` por padrão.

## Observabilidade

Todos os serviços expõem:

- `/health`
- `/metrics`

Prometheus coleta métricas dos serviços a cada 15 segundos. Grafana usa o Prometheus como datasource e já possui dashboard provisionado.

O worker expõe apenas dentro da rede Docker:

- `/live`: processo em execução;
- `/health`: Mongo conectado e loop ativo;
- `/metrics`: publicados, falhas, dead-letters, pendentes e duração.

As métricas não usam `userId` nem `runId` como labels, evitando cardinalidade crescente no Prometheus.

Query útil no Prometheus:

```text
rate(api_gateway_http_requests_total[1m])
```

## Segurança

Cuidados implementados:

- JWT com `issuer`, `audience` e algoritmo HS256.
- Senhas armazenadas com bcrypt.
- Senha de cadastro entre 12 e 72 caracteres.
- Rate limit no gateway.
- `helmet` nos apps Express.
- Remoção do header `x-powered-by`.
- Limite de JSON em `100kb`.
- Autorização por perfil.
- Comunicação interna protegida por `INTERNAL_SERVICE_SECRET`.
- Serviços internos não são publicados diretamente no host.
- Portas públicas do Compose ficam presas em `127.0.0.1`.

Cuidados que você deve manter:

- Não commitar `.env`.
- Não reutilizar `JWT_SECRET` e `INTERNAL_SERVICE_SECRET`.
- Não usar senhas de exemplo em produção.
- Não expor Grafana e Prometheus publicamente sem proteção extra.

## Estrutura do projeto

```text
.
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── catalog-service/
│   ├── game-service/
│   └── ranking-service/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
├── tests/
│   └── load/k6/
├── docs/
├── scripts/
│   └── showPorts.js
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

## Comandos úteis

| Comando | Uso |
|---|---|
| `npm run up` | Sobe containers e mostra portas |
| `npm run ports` | Mostra URLs e portas configuradas |
| `npm test` | Roda testes dos workspaces |
| `npm run reset:ranking` | Apaga ranking e runs processadas; exige `CONFIRM_RANKING_RESET=true` |
| `npm run outbox:retry -- --event-id <id>` | Reenvia um dead-letter específico |
| `npm run outbox:retry -- --all` | Reenvia todos os dead-letters |
| `docker compose ps` | Mostra status dos containers |
| `docker compose logs -f` | Mostra logs em tempo real |
| `docker compose logs -f api-gateway` | Mostra logs do gateway |
| `docker compose down` | Para o ambiente |
| `docker compose down -v` | Para e apaga volumes |

No ambiente Docker, execute a recuperação dentro do worker:

```bash
docker compose --profile outbox exec game-outbox-worker npm run outbox:retry -- --event-id <id>
docker compose --profile outbox exec game-outbox-worker npm run outbox:retry -- --all
```

## Consistência e limitações do Mongo local

O MongoDB local roda como Replica Set `rs0` de um único nó para permitir transações entre documentos. O inicializador `mongo-init-replica` é idempotente e os serviços só iniciam depois que o nó aceita escrita como primário.

Confira o estado com:

```bash
docker compose exec mongodb mongosh --quiet --eval "rs.status().ok"
```

O resultado esperado é `1`. Esse Replica Set de um nó serve apenas para desenvolvimento: ele não oferece alta disponibilidade. Em produção, use MongoDB gerenciado ou um Replica Set com pelo menos três membros.

O worker tenta publicar até 10 vezes. Falhas de rede, timeout, HTTP `408`, `429` e `5xx` usam backoff exponencial limitado a 60 segundos. Outros `4xx` vão diretamente para `dead_letter`. O lock expira em 30 segundos, permitindo que outro ciclo recupere um evento preso após queda do processo.

## Documentos técnicos

| Documento | Conteúdo |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Requisitos e regras de negócio |
| [docs/sdd.md](docs/sdd.md) | Desenho técnico dos serviços |
| [docs/mongodb-modeling.md](docs/mongodb-modeling.md) | Modelagem MongoDB |
| [docs/api-endpoints.md](docs/api-endpoints.md) | Rotas públicas e internas |
| [docs/architecture.md](docs/architecture.md) | Arquitetura e diagramas |

## Licença

Licença ainda não definida neste repositório.
