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
| `game-outbox-worker` | Entrega eventos de fim de run ao ranking com retry e dead-letter |
| `ranking-service` | Ranking global e estatisticas do jogador |
| `mongo-init-replica` | Inicializa o Replica Set local `rs0` uma vez, de forma idempotente |
| `mongodb` | Persistencia e transacoes locais por meio do Replica Set `rs0` |
| `prometheus` | Coleta de metricas |
| `grafana` | Visualizacao de metricas |

## Comunicacao

- Cliente chama o `api-gateway` pela porta local configurada em `API_GATEWAY_HOST_PORT` (`http://localhost:3000` no padrao).
- Rotas publicas de auth sao encaminhadas para `auth-service`.
- Rotas protegidas exigem JWT no gateway.
- O gateway adiciona `X-User-Id` e `X-User-Role` para os servicos internos.
- Chamadas internas protegidas tambem exigem `X-Internal-Service-Secret`, configurado por `INTERNAL_SERVICE_SECRET`.
- O `game-service` consulta o `catalog-service` para cartas, inimigos e bosses.
- O `game-service` nao chama o ranking durante a requisicao do jogador. Ao finalizar uma run, ele atualiza o estado do jogo e cria um `OutboxEvent` na mesma transacao MongoDB.
- O `game-outbox-worker` faz claim atomico desses eventos e chama `POST /ranking/events/run-finished` no `ranking-service`.
- A entrega e pelo menos uma vez: erros de rede, timeout, `408`, `429` e `5xx` usam retry exponencial; erros `4xx` permanentes e a decima falha viram `dead_letter`.
- O `ranking-service` registra o `runId` em `processedruns` e atualiza o ranking na mesma transacao. Repeticoes identicas nao incrementam os totais; payloads diferentes para o mesmo `runId` retornam `409 RUN_EVENT_CONFLICT`.

## Consistencia

- As operacoes `playCard`, `chooseReward`, `abandonRun` e `createBattle` usam transacoes MongoDB para impedir estado parcial entre run, batalha, recompensa e outbox.
- Todas as operacoes da transacao recebem a mesma sessao Mongoose.
- O Mongo local usa um Replica Set de um no somente para desenvolvimento. Ele permite transacoes, mas nao fornece alta disponibilidade.
- O worker usa lock de 30 segundos. Um evento em `processing` com lock expirado pode ser recuperado por outro ciclo.

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
- O worker possui `/live`, `/health` e `/metrics`, mas sua porta `3005` existe apenas na rede Docker; ela nao e publicada no host.
- Prometheus coleta metricas de todos os servicos.
- Grafana possui dashboard provisionado em `monitoring/grafana/provisioning`.
- Portas publicas de observabilidade sao configuradas por `PROMETHEUS_PORT` e `GRAFANA_PORT`.
