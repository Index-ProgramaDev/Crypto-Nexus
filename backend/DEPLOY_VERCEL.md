# 🚀 Deploy no Vercel + Neon Database

## 1. Configurar Neon Database

### A. Criar conta no Neon (https://neon.tech)
1. Faça login com GitHub ou email
2. Crie um novo projeto chamado `cryptohub`
3. Selecione a região mais próxima (US East recomendado)

### B. Criar banco de dados
1. No Neon Dashboard, clique em `Create Database`
2. Nomeie como `cryptohub`
3. Copie a **Connection String** fornecida

### C. Configurar Connection String
A connection string terá este formato:
```
postgresql://neondb_owner:PASSWORD@ep-XXXXXX.us-east-1.aws.neon.tech/cryptohub?sslmode=require
```

## 2. Configurar .env para Produção

No arquivo `.env` do backend, atualize:

```env
# Database - Neon PostgreSQL
DATABASE_URL="postgresql://neondb_owner:SEU_PASSWORD_AQUI@ep-XXXXXX.us-east-1.aws.neon.tech/cryptohub?sslmode=require"

# JWT Secrets (mude para valores fortes!)
JWT_SECRET=seu-jwt-secret-aqui-minimo-32-caracteres
JWT_REFRESH_SECRET=seu-refresh-secret-aqui-minimo-32-caracteres

# CORS - Atualizar para URL do Vercel depois do deploy
CORS_ORIGIN=https://seu-frontend.vercel.app
```

## 3. Deploy no Vercel

### A. Preparar projeto
```bash
cd backend

# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate
```

### B. Deploy via CLI
```bash
# Instalar Vercel CLI se não tiver
npm i -g vercel

# Login no Vercel
vercel login

# Deploy
vercel
```

### C. Configurar Environment Variables no Vercel
1. Acesse o projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** → **Environment Variables**
3. Adicione todas as variáveis do `.env`:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Sua connection string do Neon |
| `JWT_SECRET` | Seu JWT secret |
| `JWT_REFRESH_SECRET` | Seu refresh secret |
| `CORS_ORIGIN` | URL do frontend (ex: https://seu-app.vercel.app) |
| `NODE_ENV` | production |
| `VERCEL` | 1 |

## 4. Rodar Migrações no Neon

Após o deploy, execute as migrações:

```bash
# Usando a connection string do Neon
DATABASE_URL="sua-connection-string" npx prisma migrate deploy

# Seed do banco (cria admin)
DATABASE_URL="sua-connection-string" npx prisma db seed
```

Ou use o Vercel CLI para executar:
```bash
vercel --prod
```

## 5. Testar API

Após o deploy, teste os endpoints:

```bash
# Health check
curl https://seu-backend.vercel.app/health

# Login
curl -X POST https://seu-backend.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cryptohub.com","password":"admin123"}'
```

## 6. Configurar Frontend

Atualize o frontend para usar a URL do backend:

```env
# .env do frontend
VITE_API_URL=https://seu-backend.vercel.app/api/v1
```

## 📋 Checklist de Deploy

- [ ] Criar projeto no Neon
- [ ] Copiar connection string
- [ ] Configurar .env com secrets fortes
- [ ] Instalar dependências (`npm install`)
- [ ] Gerar Prisma Client (`npx prisma generate`)
- [ ] Deploy no Vercel (`vercel`)
- [ ] Configurar env vars no Vercel Dashboard
- [ ] Rodar migrações (`npx prisma migrate deploy`)
- [ ] Seed do banco (`npx prisma db seed`)
- [ ] Testar health endpoint
- [ ] Atualizar frontend com nova API URL
- [ ] Testar login

## 🐛 Troubleshooting

### Erro de conexão com banco
```
Connection refused / timeout
```
**Solução**: Verifique se `sslmode=require` está na connection string

### Erro 500 no deploy
```
Internal server error
```
**Solução**: Verifique os logs no Vercel Dashboard → Functions

### Prisma Client não encontrado
```
Can't find Prisma Client
```
**Solução**: Adicione `npx prisma generate` no build command do Vercel:
- Settings → General → Build Command: `npx prisma generate && npm run build`

### CORS error no frontend
```
CORS policy: No 'Access-Control-Allow-Origin'
```
**Solução**: Atualize `CORS_ORIGIN` no Vercel com a URL exata do frontend

## 📝 Notas Importantes

1. **Neon**: O plano gratuito tem limites de conexão (simultâneo). Para produção, considere upgrade.

2. **Vercel**: Funções serverless têm timeout de 10s (Hobby) ou 60s (Pro).

3. **Prisma**: Em serverless, use `@prisma/adapter-neon` para melhor performance:
   ```bash
   npm install @prisma/adapter-neon ws
   ```

4. **Segurança**: Nunca commite o arquivo `.env`. Use Vercel Environment Variables.

5. **Logs**: Acesse logs em tempo real: `vercel logs --json`

---

**Admin padrão**: `admin@cryptohub.com` / `admin123` (altere após primeiro login!)
