# Arquitetura

## Desenho recomendado para apresentacao

Use este diagrama no slide de arquitetura. Ele segue a ideia de um diagrama de containers: mostra a entrada publica, os microservicos, o banco, as ferramentas de observabilidade e as comunicacoes principais.

Arquivos prontos:

```text
docs/diagrams/architecture-logical.mmd
docs/diagrams/architecture-logical.svg
```

Use o `.svg` no Gamma/Canva. Use o `.mmd` se quiser editar o diagrama no Mermaid.

```mermaid
flowchart LR
  %% Diagrama recomendado para o Slide 3.
  %% Ideia: mostrar responsabilidades e comunicacao sem excesso de setas.

  client["Cliente<br/>Swagger, app ou k6"]
  k6["k6<br/>carga e stress"]

  subgraph api["API Roguelike de Cartas"]
    direction LR

    gateway["api-gateway<br/>entrada publica<br/>JWT, CORS, rate limit<br/>Swagger e proxy"]

    subgraph services["Microservicos internos"]
      direction TB
      auth["auth-service<br/>usuarios, login e JWT"]
      catalog["catalog-service<br/>cartas, inimigos e bosses"]
      game["game-service<br/>runs, batalhas e recompensas"]
      ranking["ranking-service<br/>ranking e estatisticas"]
    end

    mongo[("MongoDB<br/>banco roguelike")]
  end

  subgraph obs["Observabilidade"]
    direction TB
    prometheus["Prometheus<br/>coleta /metrics"]
    grafana["Grafana<br/>dashboard"]
  end

  client -->|"HTTP REST<br/>/v1"| gateway
  k6 -->|"simula usuarios"| gateway

  gateway -->|"login e usuarios"| auth
  gateway -->|"CRUD catalogo"| catalog
  gateway -->|"fluxo de jogo"| game
  gateway -->|"leaderboard"| ranking

  game -->|"busca cartas,<br/>inimigos e bosses"| catalog
  game -->|"evento de run finalizada"| ranking

  auth --> mongo
  catalog --> mongo
  game --> mongo
  ranking --> mongo

  prometheus -.->|"scrape /metrics"| gateway
  prometheus -.->|"scrape /metrics"| auth
  prometheus -.->|"scrape /metrics"| catalog
  prometheus -.->|"scrape /metrics"| game
  prometheus -.->|"scrape /metrics"| ranking
  grafana -->|"consulta Prometheus"| prometheus

  classDef externalClass fill:#eef7ff,stroke:#1f6feb,stroke-width:1px,color:#0f172a;
  classDef gatewayClass fill:#0f5132,stroke:#0f5132,stroke-width:2px,color:#ffffff;
  classDef serviceClass fill:#ecfdf3,stroke:#17803d,stroke-width:1px,color:#0f172a;
  classDef databaseClass fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#0f172a;
  classDef observabilityClass fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px,color:#0f172a;

  class client,k6 externalClass;
  class gateway gatewayClass;
  class auth,catalog,game,ranking serviceClass;
  class mongo databaseClass;
  class prometheus,grafana observabilityClass;

  style api fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
  style services fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
  style obs fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
```

## Deploy local com Docker Compose

Use este segundo diagrama se quiser reforcar o slide de Docker ou Deploy.

Arquivos prontos:

```text
docs/diagrams/deploy-local.mmd
docs/diagrams/deploy-local.svg
```

Use o `.svg` no Gamma/Canva. Use o `.mmd` se quiser editar o diagrama no Mermaid.

```mermaid
flowchart TB
  %% Diagrama recomendado para Slide 11 ou apoio de Docker/Deploy.

  dev["Desenvolvedor<br/>docker compose up --build -d"]

  subgraph host["Maquina local"]
    direction TB

    subgraph public["Portas expostas no localhost"]
      direction LR
      gatewayPort["API Gateway<br/>localhost:3000"]
      swaggerPort["Swagger<br/>localhost:3000/docs"]
      prometheusPort["Prometheus<br/>localhost:9090"]
      grafanaPort["Grafana<br/>localhost:3005"]
    end

    subgraph compose["Rede Docker Compose"]
      direction LR

      gateway["api-gateway<br/>container"]

      subgraph apiServices["Servicos Node.js"]
        direction TB
        auth["auth-service<br/>porta interna 3001"]
        catalog["catalog-service<br/>porta interna 3002"]
        game["game-service<br/>porta interna 3003"]
        ranking["ranking-service<br/>porta interna 3004"]
      end

      mongodb[("mongodb<br/>volume mongodb-data")]
      prometheus["prometheus<br/>coleta metricas"]
      grafana["grafana<br/>dashboard provisionado"]
    end
  end

  dev --> host

  gatewayPort --> gateway
  swaggerPort --> gateway
  prometheusPort --> prometheus
  grafanaPort --> grafana

  gateway --> auth
  gateway --> catalog
  gateway --> game
  gateway --> ranking

  game --> catalog
  game --> ranking

  auth --> mongodb
  catalog --> mongodb
  game --> mongodb
  ranking --> mongodb

  prometheus -.-> gateway
  prometheus -.-> auth
  prometheus -.-> catalog
  prometheus -.-> game
  prometheus -.-> ranking
  grafana --> prometheus

  classDef commandClass fill:#eef7ff,stroke:#1f6feb,stroke-width:1px,color:#0f172a;
  classDef portClass fill:#f8fafc,stroke:#64748b,stroke-width:1px,color:#0f172a;
  classDef gatewayClass fill:#0f5132,stroke:#0f5132,stroke-width:2px,color:#ffffff;
  classDef serviceClass fill:#ecfdf3,stroke:#17803d,stroke-width:1px,color:#0f172a;
  classDef databaseClass fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#0f172a;
  classDef observabilityClass fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px,color:#0f172a;

  class dev commandClass;
  class gatewayPort,swaggerPort,prometheusPort,grafanaPort portClass;
  class gateway gatewayClass;
  class auth,catalog,game,ranking serviceClass;
  class mongodb databaseClass;
  class prometheus,grafana observabilityClass;

  style host fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
  style public fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
  style compose fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
  style apiServices fill:#ffffff,stroke:#cbd5e1,stroke-width:1px,color:#0f172a
```

## Como explicar o desenho

Use esta fala curta:

> O cliente nunca chama os microservicos diretamente. Toda requisicao entra pelo api-gateway, que valida JWT, aplica CORS/rate limit e encaminha para o servico correto. O game-service conversa internamente com o catalog-service para buscar cartas, inimigos e bosses, e envia um evento ao ranking-service quando a run termina. Todos persistem no MongoDB. Em paralelo, Prometheus coleta metricas dos servicos e Grafana exibe o dashboard.

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
