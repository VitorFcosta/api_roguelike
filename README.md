# API Roguelike de Cartas

API REST para um jogo de cartas roguelike simplificado, inspirado em Slay the Spire.

Desenvolvida com Node.js, arquitetura em microserviços, MongoDB, Docker, JWT, Prometheus, Grafana e documentação Swagger.

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado e rodando
- [k6](https://k6.io/docs/get-started/installation/) instalado (para testes de carga)

---

## Como subir o ambiente

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd api_roguelike
```

### 2. Suba todos os containers

```bash
docker compose up --build -d
```

Aguarde todos os serviços ficarem saudáveis:

```bash
docker compose ps
```

Todos devem aparecer como `healthy`.

### 3. Execute os seeds

```bash
docker compose exec auth-service npm run seed:admin
docker compose exec catalog-service npm run seed:catalog
```

---

## URLs disponíveis

| Recurso     | URL                        |
|-------------|----------------------------|
| API Gateway | http://localhost:3000      |
| Swagger     | http://localhost:3000/docs |
| Prometheus  | http://localhost:9090      |
| Grafana     | http://localhost:3005      |

---

## Credenciais padrão

| Serviço     | Usuário          | Senha       |
|-------------|------------------|-------------|
| Admin da API | admin@email.com | admin123456 |
| Grafana     | admin            | admin       |

---

## Documentação da API

Acesse o Swagger em **http://localhost:3000/docs** para visualizar e testar todos os endpoints.

Para testar rotas protegidas no Swagger:
1. Execute `POST /auth/login` com as credenciais do admin
2. Copie o token retornado
3. Clique em **Authorize** no topo direito
4. Cole o token e confirme

---

## Testes de carga com k6

O projeto possui cinco scripts k6 na pasta `tests/load/k6/`:

| Script | Descrição |
|--------|-----------|
| `main.js` | Teste de carga geral com múltiplos usuários simultâneos |
| `ranking.js` | Fluxo completo: login, run, batalhas, boss e ranking |
| `populate.js` | Cadastra 8 jogadores e faz runs para popular o ranking |
| `debug.js` | Debug simples de login com 1 usuário |
| `debug2.js` | Debug de login com 5 usuários simultâneos |

### Teste de carga geral

```bash
k6 run tests/load/k6/main.js
```

### Fluxo completo de uma run com ranking

```bash
k6 run tests/load/k6/ranking.js
```

### Popular ranking com múltiplos jogadores

```bash
k6 run tests/load/k6/populate.js
```

Acompanhe os resultados no Grafana em http://localhost:3005 enquanto os testes rodam.

---

## Observabilidade

### Prometheus

Coleta métricas de todos os serviços a cada 15 segundos. Acesse http://localhost:9090.

Exemplo de query útil:
```
rate(api_gateway_http_requests_total[1m])
```

### Grafana

Acesse http://localhost:3005 com usuário `admin` e senha `admin`.

O datasource do Prometheus já vem configurado automaticamente. Para criar um dashboard, vá em **Dashboards → New → New Dashboard** e use as queries do Prometheus.

---

## Health checks

Todos os serviços expõem `/health`:

```bash
curl http://localhost:3000/health
```

---

## Métricas

Todos os serviços expõem `/metrics` no formato Prometheus:

```bash
curl http://localhost:3000/metrics
```

---

## Comandos úteis

```bash
# Ver status dos containers
docker compose ps

# Ver logs de um serviço
docker compose logs api-gateway
docker compose logs game-service
docker compose logs ranking-service

# Ver logs em tempo real
docker compose logs -f

# Reconstruir um serviço específico
docker compose up --build -d ranking-service

# Parar o ambiente
docker compose down

# Parar e remover volumes (apaga dados do banco)
docker compose down -v
```

---

## Estrutura do projeto

```
/
├── services/
│   ├── api-gateway/        Entrada única da API, Swagger e roteamento
│   ├── auth-service/       Cadastro, login e JWT
│   ├── catalog-service/    Cartas, inimigos e bosses
│   ├── game-service/       Runs, batalhas e recompensas
│   └── ranking-service/    Ranking e estatísticas
├── monitoring/
│   ├── prometheus/         Configuração de coleta de métricas
│   └── grafana/            Datasources provisionados automaticamente
├── tests/
│   └── load/k6/            Scripts de teste de carga
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Serviços e portas

| Serviço         | Porta interna | Porta externa |
|-----------------|---------------|---------------|
| api-gateway     | 3000          | 3000          |
| auth-service    | 3001          | —             |
| catalog-service | 3002          | —             |
| game-service    | 3003          | —             |
| ranking-service | 3004          | —             |
| mongodb         | 27017         | —             |
| prometheus      | 9090          | 9090          |
| grafana         | 3000          | 3005          |

---

## Fluxo principal da API

1. `POST /v1/auth/register` — Cadastrar usuário
2. `POST /v1/auth/login` — Fazer login e obter JWT
3. `POST /v1/runs` — Iniciar uma run
4. `POST /v1/runs/:id/battles` — Criar batalha
5. `POST /v1/battles/:id/actions/play-card` — Usar carta
6. `POST /v1/rewards/:id/choose` — Escolher recompensa
7. `GET /v1/ranking` — Consultar ranking
