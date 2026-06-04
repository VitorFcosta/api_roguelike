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

## Requisitos de API

- CRUD completo de cartas, inimigos e bosses.
- Soft delete no catalogo por `isActive=false` e `deletedAt`.
- Busca por ID e busca parcial por nome no catalogo.
- Filtros, paginacao e ordenacao nas listagens planejadas.
- Autenticacao JWT.
- Controle de acesso por perfil.
- Rate limit no gateway.
- Swagger para documentacao.
- Health check e metricas Prometheus.

