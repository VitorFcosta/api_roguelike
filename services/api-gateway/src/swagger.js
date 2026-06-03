const swaggerDocument = {
  openapi: '3.1.0',
  info: {
    title: 'API Roguelike de Cartas',
    version: '1.0.0',
    description: 'API REST para um jogo de cartas roguelike simplificado, inspirado em Slay the Spire. Desenvolvida com Node.js, microserviços, MongoDB, Docker, JWT, Prometheus e Grafana.'
  },
  servers: [
    {
      url: 'http://localhost:3000/v1',
      description: 'Ambiente local via Docker Compose'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Faça login em POST /auth/login, copie o token e cole aqui no formato: Bearer {token}'
      }
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Dados inválidos.' }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '664000000000000000000001' },
          name: { type: 'string', example: 'Ana Souza' },
          email: { type: 'string', example: 'ana@email.com' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' }
        }
      },
      Card: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664000000000000000000010' },
          name: { type: 'string', example: 'Golpe' },
          description: { type: 'string', example: 'Causa 6 de dano ao inimigo.' },
          type: { type: 'string', enum: ['attack', 'block', 'heal'], example: 'attack' },
          cost: { type: 'number', example: 1 },
          value: { type: 'number', example: 6 },
          rarity: { type: 'string', enum: ['basic', 'common', 'rare'], example: 'basic' },
          isStarter: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true }
        }
      },
      Enemy: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664000000000000000000020' },
          name: { type: 'string', example: 'Goblin' },
          description: { type: 'string', example: 'Um inimigo simples.' },
          maxHp: { type: 'number', example: 30 },
          attack: { type: 'number', example: 6 },
          defense: { type: 'number', example: 0 },
          difficulty: { type: 'number', example: 1 },
          isActive: { type: 'boolean', example: true }
        }
      },
      Boss: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664000000000000000000030' },
          name: { type: 'string', example: 'Guardião da Torre' },
          description: { type: 'string', example: 'Boss final da run.' },
          maxHp: { type: 'number', example: 120 },
          attack: { type: 'number', example: 14 },
          specialAttack: { type: 'number', example: 22 },
          difficulty: { type: 'number', example: 5 },
          isActive: { type: 'boolean', example: true }
        }
      },
      Run: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664000000000000000000100' },
          userId: { type: 'string', example: '664000000000000000000001' },
          status: { type: 'string', enum: ['active', 'victory', 'defeat', 'abandoned'], example: 'active' },
          playerHp: { type: 'number', example: 72 },
          playerMaxHp: { type: 'number', example: 80 },
          floor: { type: 'number', example: 1 },
          deck: { type: 'array', items: { '$ref': '#/components/schemas/Card' } }
        }
      },
      Battle: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664000000000000000000200' },
          runId: { type: 'string', example: '664000000000000000000100' },
          status: { type: 'string', enum: ['active', 'won', 'lost'], example: 'active' },
          type: { type: 'string', enum: ['common', 'boss'], example: 'common' },
          turn: { type: 'number', example: 2 },
          playerHp: { type: 'number', example: 72 },
          playerBlock: { type: 'number', example: 0 },
          enemy: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Goblin' },
              currentHp: { type: 'number', example: 18 },
              maxHp: { type: 'number', example: 30 },
              attack: { type: 'number', example: 6 }
            }
          },
          log: { type: 'array', items: { type: 'string' } }
        }
      },
      Ranking: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '664000000000000000000001' },
          userName: { type: 'string', example: 'Ana Souza' },
          totalRuns: { type: 'number', example: 12 },
          victories: { type: 'number', example: 4 },
          defeats: { type: 'number', example: 8 },
          bestScore: { type: 'number', example: 780 },
          bossKills: { type: 'number', example: 4 }
        }
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Cadastro e autenticação' },
    { name: 'Users', description: 'Dados do usuário autenticado' },
    { name: 'Cards', description: 'Gerenciamento de cartas (admin)' },
    { name: 'Enemies', description: 'Gerenciamento de inimigos (admin)' },
    { name: 'Bosses', description: 'Gerenciamento de bosses (admin)' },
    { name: 'Runs', description: 'Runs do jogador' },
    { name: 'Battles', description: 'Batalhas dentro de uma run' },
    { name: 'Rewards', description: 'Recompensas após batalhas' },
    { name: 'Ranking', description: 'Ranking e estatísticas' },
    { name: 'Infra', description: 'Health check e métricas' }
  ],
  paths: {
    // ─── AUTH ────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cadastrar usuário',
        description: 'Cria um novo usuário com perfil user. Rota pública.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Ana Souza' },
                  email: { type: 'string', example: 'ana@email.com' },
                  password: { type: 'string', example: 'senha123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Usuário criado com sucesso' },
          400: { description: 'Dados inválidos' },
          409: { description: 'Email já cadastrado' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Fazer login',
        description: 'Autentica o usuário e retorna um token JWT. Rota pública.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@email.com' },
                  password: { type: 'string', example: 'admin123456' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login realizado com sucesso, retorna JWT' },
          401: { description: 'Credenciais inválidas' }
        }
      }
    },
    // ─── USERS ───────────────────────────────────────────────────────────────
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Consultar próprio perfil',
        description: 'Retorna os dados do usuário autenticado. Requer JWT.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Dados do usuário' },
          401: { description: 'Token ausente ou inválido' }
        }
      }
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Listar todos os usuários',
        description: 'Lista todos os usuários cadastrados. Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de usuários' },
          401: { description: 'Token ausente ou inválido' },
          403: { description: 'Usuário sem permissão de admin' }
        }
      }
    },
    // ─── CARDS ───────────────────────────────────────────────────────────────
    '/cards': {
      get: {
        tags: ['Cards'],
        summary: 'Listar cartas',
        description: 'Retorna todas as cartas ativas. Requer JWT.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de cartas' },
          401: { description: 'Token ausente ou inválido' }
        }
      },
      post: {
        tags: ['Cards'],
        summary: 'Criar carta',
        description: 'Cria uma nova carta no catálogo. Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'type', 'cost', 'value', 'rarity'],
                properties: {
                  name: { type: 'string', example: 'Golpe Duplo' },
                  description: { type: 'string', example: 'Causa 8 de dano.' },
                  type: { type: 'string', enum: ['attack', 'block', 'heal'], example: 'attack' },
                  cost: { type: 'number', example: 1 },
                  value: { type: 'number', example: 8 },
                  rarity: { type: 'string', enum: ['basic', 'common', 'rare'], example: 'common' },
                  isStarter: { type: 'boolean', example: false }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Carta criada com sucesso' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Token ausente ou inválido' },
          403: { description: 'Usuário sem permissão de admin' }
        }
      }
    },
    '/cards/{id}': {
      get: {
        tags: ['Cards'],
        summary: 'Buscar carta por ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Carta encontrada' },
          404: { description: 'Carta não encontrada' }
        }
      },
      put: {
        tags: ['Cards'],
        summary: 'Editar carta',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Card' }
            }
          }
        },
        responses: {
          200: { description: 'Carta atualizada' },
          403: { description: 'Usuário sem permissão de admin' },
          404: { description: 'Carta não encontrada' }
        }
      },
      delete: {
        tags: ['Cards'],
        summary: 'Desativar carta (soft delete)',
        description: 'Marca a carta como inativa. Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Carta desativada' },
          403: { description: 'Usuário sem permissão de admin' },
          404: { description: 'Carta não encontrada' }
        }
      }
    },
    // ─── ENEMIES ─────────────────────────────────────────────────────────────
    '/enemies': {
      get: {
        tags: ['Enemies'],
        summary: 'Listar inimigos',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Lista de inimigos ativos' } }
      },
      post: {
        tags: ['Enemies'],
        summary: 'Criar inimigo',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'maxHp', 'attack', 'difficulty'],
                properties: {
                  name: { type: 'string', example: 'Troll' },
                  description: { type: 'string', example: 'Inimigo resistente.' },
                  maxHp: { type: 'number', example: 60 },
                  attack: { type: 'number', example: 10 },
                  defense: { type: 'number', example: 2 },
                  difficulty: { type: 'number', example: 3 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Inimigo criado' },
          403: { description: 'Usuário sem permissão de admin' }
        }
      }
    },
    '/enemies/{id}': {
      get: {
        tags: ['Enemies'],
        summary: 'Buscar inimigo por ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inimigo encontrado' }, 404: { description: 'Não encontrado' } }
      },
      put: {
        tags: ['Enemies'],
        summary: 'Editar inimigo',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/Enemy' } } } },
        responses: { 200: { description: 'Inimigo atualizado' }, 403: { description: 'Sem permissão' } }
      },
      delete: {
        tags: ['Enemies'],
        summary: 'Desativar inimigo (soft delete)',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inimigo desativado' }, 403: { description: 'Sem permissão' } }
      }
    },
    // ─── BOSSES ──────────────────────────────────────────────────────────────
    '/bosses': {
      get: {
        tags: ['Bosses'],
        summary: 'Listar bosses',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Lista de bosses ativos' } }
      },
      post: {
        tags: ['Bosses'],
        summary: 'Criar boss',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'maxHp', 'attack', 'specialAttack', 'difficulty'],
                properties: {
                  name: { type: 'string', example: 'Guardião da Torre' },
                  description: { type: 'string', example: 'Boss final.' },
                  maxHp: { type: 'number', example: 120 },
                  attack: { type: 'number', example: 14 },
                  specialAttack: { type: 'number', example: 22 },
                  difficulty: { type: 'number', example: 5 }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Boss criado' }, 403: { description: 'Sem permissão' } }
      }
    },
    '/bosses/{id}': {
      get: {
        tags: ['Bosses'],
        summary: 'Buscar boss por ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Boss encontrado' }, 404: { description: 'Não encontrado' } }
      },
      put: {
        tags: ['Bosses'],
        summary: 'Editar boss',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/Boss' } } } },
        responses: { 200: { description: 'Boss atualizado' }, 403: { description: 'Sem permissão' } }
      },
      delete: {
        tags: ['Bosses'],
        summary: 'Desativar boss (soft delete)',
        description: 'Requer perfil admin.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Boss desativado' }, 403: { description: 'Sem permissão' } }
      }
    },
    // ─── RUNS ────────────────────────────────────────────────────────────────
    '/runs': {
      post: {
        tags: ['Runs'],
        summary: 'Iniciar nova run',
        description: 'Cria uma nova run para o usuário autenticado com deck inicial gerado automaticamente.',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Run criada com sucesso' },
          401: { description: 'Token ausente ou inválido' },
          409: { description: 'Usuário já possui uma run ativa' }
        }
      },
      get: {
        tags: ['Runs'],
        summary: 'Histórico de runs',
        description: 'Lista todas as runs do usuário autenticado.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Lista de runs' } }
      }
    },
    '/runs/{id}': {
      get: {
        tags: ['Runs'],
        summary: 'Detalhes de uma run',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Dados da run' },
          403: { description: 'Run pertence a outro usuário' },
          404: { description: 'Run não encontrada' }
        }
      }
    },
    '/runs/{id}/battles': {
      post: {
        tags: ['Runs'],
        summary: 'Criar próxima batalha',
        description: 'Inicia a próxima batalha da run. O sistema escolhe automaticamente o inimigo.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: 'Batalha criada' },
          404: { description: 'Run não encontrada' },
          422: { description: 'Run já finalizada ou batalha já ativa' }
        }
      }
    },
    '/runs/{id}/rewards': {
      get: {
        tags: ['Rewards'],
        summary: 'Consultar recompensa pendente',
        description: 'Retorna as opções de carta após vencer uma batalha comum.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Opções de recompensa' },
          404: { description: 'Nenhuma recompensa pendente' }
        }
      }
    },
    '/runs/{id}/abandon': {
      post: {
        tags: ['Runs'],
        summary: 'Abandonar run',
        description: 'Encerra a run atual como abandonada.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Run abandonada' },
          404: { description: 'Run não encontrada' }
        }
      }
    },
    // ─── BATTLES ─────────────────────────────────────────────────────────────
    '/battles/{id}': {
      get: {
        tags: ['Battles'],
        summary: 'Consultar batalha',
        description: 'Retorna o estado atual de uma batalha.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Estado da batalha' },
          404: { description: 'Batalha não encontrada' }
        }
      }
    },
    '/battles/{id}/actions/play-card': {
      post: {
        tags: ['Battles'],
        summary: 'Usar carta na batalha',
        description: 'Aplica o efeito de uma carta do deck. O inimigo ataca automaticamente em seguida.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cardId'],
                properties: {
                  cardId: { type: 'string', example: '664000000000000000000010' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Estado atualizado da batalha' },
          400: { description: 'cardId ausente ou inválido' },
          422: { description: 'Batalha já finalizada' }
        }
      }
    },
    // ─── REWARDS ─────────────────────────────────────────────────────────────
    '/rewards/{id}/choose': {
      post: {
        tags: ['Rewards'],
        summary: 'Escolher carta de recompensa',
        description: 'Escolhe uma carta entre as opções disponíveis e adiciona ao deck da run.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cardId'],
                properties: {
                  cardId: { type: 'string', example: '664000000000000000000012' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Carta adicionada ao deck' },
          400: { description: 'cardId ausente' },
          422: { description: 'Recompensa já escolhida' }
        }
      }
    },
    // ─── RANKING ─────────────────────────────────────────────────────────────
    '/ranking': {
      get: {
        tags: ['Ranking'],
        summary: 'Ranking geral',
        description: 'Retorna os 50 melhores jogadores ordenados por melhor pontuação.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Lista do ranking' } }
      }
    },
    '/ranking/me': {
      get: {
        tags: ['Ranking'],
        summary: 'Minhas estatísticas',
        description: 'Retorna as estatísticas do usuário autenticado.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Estatísticas do jogador' } }
      }
    }
  }
};

module.exports = { swaggerDocument };
