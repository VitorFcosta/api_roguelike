# Requisitos

## Objetivo

A API Roguelike de Cartas oferece o backend de um jogo simplificado inspirado em roguelikes de cartas. O jogador cria uma run, enfrenta batalhas, recebe recompensas e aparece no ranking ao vencer, perder ou abandonar.

## Perfis

- `user`: joga runs, consulta catalogo, consulta ranking e suas estatisticas.
- `admin`: possui as permissoes de `user` e tambem gerencia cartas, inimigos e bosses.

## Regras principais

- Uma run ativa por usuario.
- Status de run: `active`, `victory`, `defeat`, `abandoned`.
- Status de batalha: `active`, `victory`, `defeat`.
- Status de recompensa: `pending`, `chosen`.
- O fluxo completo tem 5 batalhas comuns antes do boss.
- O boss aparece no `floor` 6, depois de 5 vitorias comuns.
- Apos cada vitoria comum, o jogador deve escolher uma recompensa antes da proxima batalha.
- Cada recompensa deve ter exatamente 3 opcoes.
- Ao vencer o boss, a run termina como `victory`.
- Ao chegar a 0 HP, a run termina como `defeat`.
- Ao abandonar, a run termina como `abandoned`.

## Consistencia de dados e ranking

- Alteracoes de batalha, run, recompensa e evento de fim devem ser atomicas: uma falha nao pode deixar deck, recompensa, HP ou status parcialmente atualizados.
- Cada run finalizada deve criar no maximo um evento `run.finished` na outbox.
- O ranking e atualizado de forma assincrona pelo worker; ele pode demorar alguns segundos para refletir uma run finalizada.
- A entrega ao ranking e pelo menos uma vez, mas cada `runId` deve alterar os totais somente uma vez.
- Falhas temporarias de entrega devem usar retry. Depois de dez falhas, o evento deve ficar em `dead_letter` para recuperacao manual.
- Um evento preso em processamento deve poder ser recuperado depois do timeout do lock.

## Requisitos de API

- CRUD completo de cartas, inimigos e bosses.
- Soft delete no catalogo por `isActive=false` e `deletedAt`.
- Busca por ID e busca parcial por nome no catalogo.
- Filtros, paginacao e ordenacao nas listagens planejadas.
- Autenticacao JWT.
- Controle de acesso por perfil.
- Segredo interno obrigatorio entre gateway e microservicos para aceitar headers `X-User-Id` e `X-User-Role`.
- Senhas de cadastro devem ter entre 12 e 72 caracteres.
- Rate limit no gateway.
- Swagger para documentacao.
- Health check e metricas Prometheus.
- Portas publicas de API, Prometheus e Grafana devem ser configuraveis por `.env`.
