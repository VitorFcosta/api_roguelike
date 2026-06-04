# Arquitetura

## Desenho geral

```mermaid
flowchart LR
  client["Cliente<br/>Swagger, k6 ou app"] --> gateway["api-gateway<br/>JWT, CORS, rate limit<br/>Swagger e proxy"]

  gateway --> auth["auth-service<br/>usuarios, login e JWT"]
  gateway --> catalog["catalog-service<br/>cartas, inimigos e bosses"]
  gateway --> game["game-service<br/>runs, batalhas e recompensas"]
  gateway --> rankingPublic["ranking-service<br/>ranking e estatisticas"]

  game -->|"busca cartas, inimigos e bosses"| catalog
  game -->|"envia evento de run finalizada"| rankingPublic

  auth --> mongo[("MongoDB<br/>roguelike")]
  catalog --> mongo
  game --> mongo
  rankingPublic --> mongo

  prometheus["Prometheus<br/>coleta /metrics"] --> gateway
  prometheus --> auth
  prometheus --> catalog
  prometheus --> game
  prometheus --> rankingPublic

  grafana["Grafana<br/>dashboard"] --> prometheus
```

## Fluxo de uma run

```mermaid
sequenceDiagram
  actor User as Usuario
  participant Gateway as api-gateway
  participant Auth as auth-service
  participant Game as game-service
  participant Catalog as catalog-service
  participant Ranking as ranking-service

  User->>Gateway: POST /v1/auth/login
  Gateway->>Auth: encaminha login
  Auth-->>Gateway: JWT
  Gateway-->>User: token

  User->>Gateway: POST /v1/runs
  Gateway->>Game: cria run com X-User-Id
  Game->>Catalog: GET /cards/starter
  Catalog-->>Game: deck inicial
  Game-->>Gateway: run active floor 1
  Gateway-->>User: run criada

  loop 5 batalhas comuns
    User->>Gateway: POST /v1/runs/{id}/battles
    Gateway->>Game: criar batalha
    Game->>Catalog: GET /enemies/random
    Catalog-->>Game: inimigo comum
    Game-->>User: batalha common active
    User->>Gateway: POST /v1/battles/{id}/actions/play-card
    Gateway->>Game: jogar carta
    Game-->>User: batalha victory + reward pending
    User->>Gateway: POST /v1/rewards/{id}/choose
    Gateway->>Game: escolher recompensa
  end

  User->>Gateway: POST /v1/runs/{id}/battles
  Gateway->>Game: criar boss
  Game->>Catalog: GET /bosses/random
  Catalog-->>Game: boss
  Game-->>User: batalha boss active
  User->>Gateway: POST /v1/battles/{id}/actions/play-card
  Gateway->>Game: vencer boss
  Game->>Ranking: POST /ranking/events/run-finished
  Ranking-->>Game: ranking atualizado
  Game-->>User: run victory
```

## Responsabilidade dos servicos

| Servico | Papel |
|---|---|
| `api-gateway` | Porta publica da API. Valida JWT, aplica CORS/rate limit e encaminha para os servicos internos. |
| `auth-service` | Cadastra usuarios, faz login, gera JWT e guarda usuarios. |
| `catalog-service` | Gerencia catalogo de cartas, inimigos e bosses. |
| `game-service` | Controla regras da run, batalhas, recompensas e fim da run. |
| `ranking-service` | Atualiza e consulta ranking. |
| `mongodb` | Persiste dados de todos os servicos. |
| `prometheus` | Coleta metricas dos endpoints `/metrics`. |
| `grafana` | Exibe dashboard com saude, requests, erros e latencia. |

## Fluxo principal

1. Usuario faz login em `POST /v1/auth/login`.
2. Gateway valida JWT nas rotas protegidas.
3. Usuario cria run em `POST /v1/runs`.
4. `game-service` busca cartas iniciais no `catalog-service`.
5. Usuario cria e joga batalhas.
6. Apos 5 batalhas comuns, o `game-service` cria o boss.
7. Ao finalizar a run, o `game-service` envia evento ao `ranking-service`.
8. Prometheus coleta metricas de todos os servicos.
9. Grafana exibe dashboard provisionado.
