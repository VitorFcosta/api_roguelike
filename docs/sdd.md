# SDD

## Visao geral

O sistema usa microservicos Node.js com Express. O `api-gateway` e a entrada unica publica e encaminha requisicoes para os servicos internos.

## Servicos

| Servico | Responsabilidade |
|---|---|
| `api-gateway` | JWT, CORS, rate limit, Swagger, metricas e roteamento |
| `auth-service` | Cadastro, login, usuarios e seed admin |
| `catalog-service` | Cartas, inimigos e bosses |
| `game-service` | Runs, batalhas, recompensas e regra do jogo |
| `ranking-service` | Ranking global e estatisticas do jogador |
| `mongodb` | Persistencia |
| `prometheus` | Coleta de metricas |
| `grafana` | Visualizacao de metricas |

## Comunicacao

- Cliente chama o `api-gateway` pela porta local configurada em `API_GATEWAY_HOST_PORT` (`http://localhost:3000` no padrao).
- Rotas publicas de auth sao encaminhadas para `auth-service`.
- Rotas protegidas exigem JWT no gateway.
- O gateway adiciona `X-User-Id` e `X-User-Role` para os servicos internos.
- Chamadas internas protegidas tambem exigem `X-Internal-Service-Secret`, configurado por `INTERNAL_SERVICE_SECRET`.
- O `game-service` consulta o `catalog-service` para cartas, inimigos e bosses.
- O `game-service` registra eventos de fim de run no `ranking-service`.

## Seguranca

- JWT HS256 com issuer e audience configurados.
- Segredo interno entre gateway e microservicos via `INTERNAL_SERVICE_SECRET`.
- Perfil `admin` exigido para escrita no catalogo.
- Perfil `user` pode jogar e consultar dados permitidos.
- Rate limit padrao: 100 requisicoes por 60 segundos.
- Validacao de payload com Zod.
- Senhas de cadastro exigem minimo de 12 caracteres e maximo de 72.
- Apps Express usam `helmet`, removem `x-powered-by` e limitam JSON para 100kb.

## Observabilidade

- Todos os servicos possuem `/health`.
- Todos os servicos possuem `/metrics`.
- Prometheus coleta metricas de todos os servicos.
- Grafana possui dashboard provisionado em `monitoring/grafana/provisioning`.
- Portas publicas de observabilidade sao configuradas por `PROMETHEUS_PORT` e `GRAFANA_PORT`.
