# Crypto Nexus - Rede Social de Criptomoedas

Plataforma completa para entusiastas de criptomoedas com recursos de rede social, sinais de trading, áreas exclusivas e sistema de moderação.

## Tecnologias

- **Frontend**: React + Vite + TailwindCSS + Radix UI
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL (Neon)
- **Deploy**: Vercel (monorepo)

## Estrutura do Projeto

```
crypto-nexus-flow/
frontend/          # Aplicação React (raiz)
backend/           # API Node.js + Prisma
```

## Setup Local

### 1. Instalação
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Variáveis de Ambiente

**Frontend** (`.env.local`):
```env
VITE_API_URL=http://localhost:3000/api/v1
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=seu-secret-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-aqui
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 3. Database
```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 4. Executar
```bash
# Backend (terminal 1)
cd backend
npm run dev

# Frontend (terminal 2)
npm run dev
```

## Deploy no Vercel

### 1. Preparar
```bash
npm run build:all
git add .
git commit -m "Ready for deploy"
git push
```

### 2. Configurar Variáveis no Vercel
- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Secret para tokens
- `JWT_REFRESH_SECRET`: Secret para refresh tokens
- `NODE_ENV`: production

### 3. Deploy Automático
Importe o repositório no Vercel e configure as variáveis de ambiente.

## Funcionalidades

- **Autenticação**: Login, registro, recuperação de senha
- **Perfil**: Avatar, bio, estatísticas
- **Posts**: Texto, mídias, sinais de trading
- **Interações**: Likes, comentários, follows
- **Áreas Exclusivas**: Mentored, Advanced, VIP
- **Chat**: Sistema de mensagens com admins
- **Moderação**: Painel administrativo completo
- **Alertas**: Notificações globais e individuais

## API Endpoints

### Autenticação
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`

### Posts
- `GET /api/v1/posts`
- `POST /api/v1/posts`
- `POST /api/v1/posts/:id/like`

### Usuários
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users/:id/follow`

## Contribuição

1. Fork o projeto
2. Crie branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Add feature'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

## Licença

MIT License - veja arquivo LICENSE para detalhes.
