# Endpoints

Base publica:

```text
http://localhost:${API_GATEWAY_HOST_PORT}/v1
```

Com o `.env.example`, `API_GATEWAY_HOST_PORT=3000`, entao a base local fica `http://localhost:3000/v1`.

Swagger:

```text
http://localhost:${API_GATEWAY_HOST_PORT}/docs
```

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `GET /users` admin

## Catalogo

Cards:

- `GET /cards`
- `GET /cards/starter`
- `GET /cards/{id}`
- `POST /cards` admin
- `PUT /cards/{id}` admin
- `DELETE /cards/{id}` admin

Enemies:

- `GET /enemies`
- `GET /enemies/random`
- `GET /enemies/{id}`
- `POST /enemies` admin
- `PUT /enemies/{id}` admin
- `DELETE /enemies/{id}` admin

Bosses:

- `GET /bosses`
- `GET /bosses/random`
- `GET /bosses/{id}`
- `POST /bosses` admin
- `PUT /bosses/{id}` admin
- `DELETE /bosses/{id}` admin

## Game

- `POST /runs`
- `GET /runs`
- `GET /runs/{id}`
- `POST /runs/{id}/battles`
- `GET /runs/{id}/rewards`
- `POST /runs/{id}/abandon`
- `GET /battles/{id}`
- `POST /battles/{id}/actions/play-card`
- `POST /rewards/{id}/choose`

## Ranking

- `GET /ranking`
- `GET /ranking/me`

Rota interna entre servicos:

- `POST /ranking/events/run-finished`

Essa rota interna existe no `ranking-service`, mas nao e exposta publicamente pelo gateway. O `game-outbox-worker` a chama depois de obter um evento `run.finished` da outbox. Ela exige o header `X-Internal-Service-Secret`, cujo valor vem de `INTERNAL_SERVICE_SECRET`.

Payload aceito:

```json
{
  "runId": "run-123",
  "userId": "user-456",
  "status": "victory",
  "floor": 6,
  "userName": "Opcional"
}
```

- `runId`, `userId` e `status` sao obrigatorios.
- `runId` e uma string nao vazia de, no maximo, 100 caracteres.
- `status` aceita `victory`, `defeat` ou `abandoned`.
- `floor` e inteiro entre `1` e `100`; se omitido, usa `1`.
- `userName` e opcional; o ranking gera um nome de fallback quando ele nao existe.
- Reenviar o mesmo `runId` com `userId`, `status` e `floor` identicos retorna `200` sem incrementar os totais novamente.
- Reutilizar um `runId` com esses dados diferentes retorna `409 RUN_EVENT_CONFLICT`.

O alias interno temporario `POST /rankings` continua disponivel e segue as mesmas regras. Nenhuma das duas rotas deve ser chamada pelo cliente ou pelo gateway publico.

## Infra

Sem prefixo `/v1`:

- `GET /health`
- `GET /metrics`

Prometheus e Grafana ficam fora do prefixo da API e usam portas publicas configuradas no `.env`:

- Prometheus: `http://localhost:${PROMETHEUS_PORT}`
- Grafana: `http://localhost:${GRAFANA_PORT}`
