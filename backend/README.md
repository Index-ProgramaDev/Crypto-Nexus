# CryptoHub Backend API

Backend API para a rede social CryptoHub - uma plataforma de comunidade de criptomoedas com tiers de acesso.

## 🚀 Tecnologias

- **Node.js** + **Express** - Framework web
- **Prisma ORM** - Acesso ao banco de dados
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Zod** - Validação de dados
- **bcryptjs** - Hash de senhas
- **Helmet** + **CORS** + **Rate Limit** - Segurança
- **Winston** - Logging

## 📁 Estrutura do Projeto

```
/backend
├── /src
│   ├── /config           # Configurações (DB, logger, etc.)
│   ├── /controllers      # Request handlers
│   ├── /middleware       # Auth, error handling, rate limit
│   ├── /routes           # Definição de rotas
│   ├── /services         # Lógica de negócio
│   ├── /utils            # Utilitários (auth, moderation, validation)
│   └── server.js         # Entry point
├── /prisma
│   ├── schema.prisma     # Schema do banco
│   └── seed.js           # Dados iniciais
├── /logs                 # Arquivos de log
├── env.example           # Exemplo de variáveis
└── package.json
```

## 🛠️ Setup

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL 14+

### 2. Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com suas configurações
```

### 3. Configurar Banco de Dados

```bash
# Criar migração
npx prisma migrate dev --name init

# Gerar cliente Prisma
npx prisma generate

# Popular com dados iniciais
npm run db:seed
```

### 4. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `PORT` | Porta do servidor | `3000` |
| `DATABASE_URL` | URL de conexão PostgreSQL | - |
| `JWT_SECRET` | Segredo JWT | - |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `CORS_ORIGIN` | Origem CORS permitida | `http://localhost:5173` |

## 📡 Endpoints da API

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Dados do usuário
- `PATCH /api/v1/auth/me` - Atualizar perfil
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/change-password` - Alterar senha

### Posts
- `GET /api/v1/posts` - Listar posts
- `GET /api/v1/posts/:id` - Detalhes do post
- `POST /api/v1/posts` - Criar post
- `PATCH /api/v1/posts/:id` - Atualizar post
- `DELETE /api/v1/posts/:id` - Deletar post
- `POST /api/v1/posts/:id/pin` - Fixar post (admin)

### Comentários
- `GET /api/v1/posts/:id/comments` - Listar comentários
- `POST /api/v1/posts/:id/comments` - Criar comentário
- `PATCH /api/v1/comments/:id` - Atualizar comentário
- `DELETE /api/v1/comments/:id` - Deletar comentário

### Curtidas
- `GET /api/v1/posts/likes/me` - Curtidas do usuário
- `POST /api/v1/posts/:id/like` - Curtir/descurtir

### Alertas
- `GET /api/v1/alerts` - Listar alertas
- `GET /api/v1/alerts/count` - Contar não lidos
- `POST /api/v1/alerts` - Criar alerta (admin)
- `PATCH /api/v1/alerts/:id/read` - Marcar como lido
- `DELETE /api/v1/alerts/:id` - Deletar alerta (admin)

### Admin
- `GET /api/v1/users` - Listar usuários
- `GET /api/v1/users/:id` - Detalhes do usuário
- `PATCH /api/v1/users/:id` - Atualizar usuário
- `POST /api/v1/users/invite` - Convidar usuário
- `DELETE /api/v1/users/:id` - Deletar usuário
- `POST /api/v1/users/:id/block` - Bloquear/desbloquear
- `GET /api/v1/admin/stats` - Estatísticas
- `GET /api/v1/moderation/logs` - Logs de moderação

## 🛡️ Segurança

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input sanitization (XSS protection)
- ✅ SQL injection prevention (Prisma)
- ✅ Content moderation (contact info detection)
- ✅ Role-based access control

## 🔗 Conectar com Frontend

O frontend espera a API em `http://localhost:3000/api/v1`.

Configure no frontend:
```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

## 📝 Scripts

```bash
npm run dev          # Desenvolvimento com hot reload
npm start            # Produção
npm run db:migrate   # Criar migração
npm run db:generate  # Gerar cliente Prisma
npm run db:studio    # Abrir Prisma Studio
npm run db:seed      # Popular banco
npm run test         # Executar testes
npm run lint         # Verificar código
npm run lint:fix     # Corrigir código
```

## 👥 Usuários de Teste

Após rodar o seed, estes usuários estarão disponíveis:

| Email | Senha | Role | VIP |
|-------|-------|------|-----|
| admin@cryptohub.com | admin123 | admin | ✅ |
| user@example.com | password123 | user | ❌ |
| mentored@example.com | password123 | mentored | ❌ |
| advanced@example.com | password123 | advanced | ❌ |
| vip@example.com | password123 | mentored | ✅ |

## 📄 Licença

MIT
