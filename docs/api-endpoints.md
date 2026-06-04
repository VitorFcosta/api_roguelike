# Endpoints

Base publica:

```text
http://localhost:3000/v1
```

Swagger:

```text
http://localhost:3000/docs
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

Essa rota interna existe no `ranking-service`, mas nao e exposta publicamente pelo gateway.

## Infra

Sem prefixo `/v1`:

- `GET /health`
- `GET /metrics`

