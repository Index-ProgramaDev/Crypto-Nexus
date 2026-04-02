# CryptoHub - Documentação de Backend

## 1. Visão Geral do Projeto

### 1.1 O que a aplicação faz
O **CryptoHub** é uma rede social vertical focada em comunidade de criptomoedas, traders e investidores. A plataforma permite que usuários compartilhem análises, sinais de trading, educação e interajam em diferentes níveis de acesso baseados em hierarquia de membros.

### 1.2 Conceito principal (rede social)
- **Nicho**: Comunidade de criptomoedas, traders e mentorados
- **Modelo**: Freemium com tiers de acesso (Público → Mentorado → Avançado → VIP)
- **Diferencial**: Sinais de operações em tempo real, moderação automática, sistema de alertas hierárquico

### 1.3 Funcionalidades principais identificadas

| Funcionalidade | Descrição |
|----------------|-----------|
| **Feed público** | Posts abertos para toda a comunidade |
| **Área de mentorados** | Conteúdo exclusivo para membros mentorados |
| **Área avançada** | Análises aprofundadas para traders avançados |
| **Sala VIP** | Sinais de operações cripto em tempo real (admin-only posting) |
| **Sistema de curtidas** | Like/unlike em posts |
| **Comentários** | Sistema de comentários com respostas aninhadas |
| **Perfis de usuário** | Edição de bio, avatar, telefone |
| **Moderação automática** | Detecção de informações de contato com penalidades progressivas |
| **Painel administrativo** | Gestão de usuários, estatísticas, logs de moderação, envio de alertas |
| **Central de alertas** | Notificações hierárquicas (info, aviso, urgente, sinal) |
| **Suporte** | Formulário de contato com envio de email |

---

## 2. Detalhamento de Funcionalidades

### 2.1 Autenticação e Autorização

#### Descrição
O sistema utiliza autenticação JWT via Base44 SDK. Usuários são redirecionados para login quando não autenticados.

#### Comportamento esperado do backend
- **Login**: Redirecionamento OAuth para Base44 ou sistema próprio de JWT
- **Registro**: Apenas via convite de administrador (user_not_registered error)
- **Token**: Armazenado em localStorage, enviado em todas as requisições
- **Roles**: `user`, `mentored`, `advanced`, `admin`
- **Flag especial**: `vip_access` (boolean) - concede acesso à Sala VIP
- **Bloqueio**: `is_blocked` + `blocked_until` para suspensões temporárias

### 2.2 Hierarquia de Acesso a Conteúdo

```
public (0) → mentored (1) → advanced (2) → vip (3)
     ↓              ↓              ↓            ↓
   Todos       Mentorados    Avançados    VIP/Admin
```

| Nível de Usuário | Acesso Permitido |
|------------------|------------------|
| `user` | Apenas feed público |
| `mentored` | Público + Mentorados |
| `advanced` | Público + Mentorados + Avançado |
| `vip_access=true` | Todos os níveis incluindo VIP |
| `admin` | Todos os níveis + painel administrativo |

### 2.3 Sistema de Posts

#### Descrição
Feed de posts com suporte a texto, imagens, e diferentes níveis de visibilidade.

#### Comportamento esperado
- **Criação**: Usuários criam posts (apenas admins em Áreas exclusivas)
- **Níveis**: `public`, `mentored`, `advanced`, `vip`
- **Sinais VIP**: Posts especiais com `is_signal=true` e `signal_type` (buy, sell, hold, alert)
- **Fixar**: Apenas admins podem fixar posts (`is_pinned`)
- **Soft delete**: Posts marcados como `status='deleted'`
- **Upload de imagens**: Via endpoint de upload de arquivos

### 2.4 Sistema de Curtidas

#### Descrição
Sistema de like/unlike em posts. Cada usuário pode curtir um post apenas uma vez.

#### Comportamento esperado
- **Toggle**: Like vira unlike e vice-versa
- **Contador**: Atualizado em tempo real no post
- **Query**: Lista de likes do usuário para identificar posts já curtidos

### 2.5 Sistema de Comentários

#### Descrição
Comentários em posts com suporte a respostas aninhadas (threads).

#### Comportamento esperado
- **Estrutura**: Comentários principais + respostas (parent_comment_id)
- **Moderação**: Mesmas regras de detecção de contato dos posts
- **Contador**: Atualizado no post quando comentário é criado
- **Soft delete**: `status='deleted'`

### 2.6 Perfis de Usuário

#### Descrição
Gerenciamento de perfil com avatar, bio e telefone.

#### Comportamento esperado
- **Avatar**: Upload de imagem com preview
- **Bio**: Texto livre com detecção de contato (exceto admins)
- **Telefone**: Campo opcional para contato
- **Badge**: Visualização do nível do usuário

### 2.7 Sistema de Moderação Automática

#### Descrição
Detecção automática de informações de contato em posts e comentários com penalidades progressivas.

#### Padrões detectados
- Emails (`exemplo@email.com`)
- Telefones (`+55 11 99999-9999`, `(11) 99999-9999`)
- Handles de redes sociais (`@username`)
- Palavras-chave de plataformas (Instagram, Telegram, WhatsApp, etc.)
- Short links (`t.me/`, `wa.me/`, `bit.ly/`, `linktr.ee/`)
- URLs gerais (`http://`, `https://`)

#### Penalidades progressivas
| Tentativa | Ação | Consequência |
|-----------|------|--------------|
| 1 | `warning` | Aviso, conteúdo bloqueado |
| 2 | `message_sent` | Aviso mais severo |
| 3 | `blocked_30_days` | Bloqueio por 30 dias |
| 4+ | `permanent_ban` | Banimento permanente |

### 2.8 Painel Administrativo

#### Descrição
Área restrita para admins gerenciarem a plataforma.

#### Funcionalidades
- **Estatísticas**: Total de usuários, posts, VIPs, logs de moderação, usuários bloqueados
- **Gestão de usuários**: Listar, buscar, alterar role, toggle VIP, bloquear/desbloquear
- **Convites**: Enviar convites para novos usuários
- **Logs de moderação**: Visualizar todas as violações e ações tomadas
- **Envio de alertas**: Criar alertas com targeting por nível ou email específico

### 2.9 Sistema de Alertas

#### Descrição
Notificações hierárquicas enviadas por administradores.

#### Tipos de alerta
- `info`: Informações gerais
- `warning`: Avisos importantes
- `urgent`: Alertas urgentes
- `signal`: Sinais de trading (especial)

#### Targeting
- `target_level`: `all`, `mentored`, `advanced`, `vip`
- `target_email`: Email específico (opcional)
- Filtro baseado na hierarquia do usuário

---

## 3. Lógica de Backend Necessária

### 3.1 Fluxo de Autenticação

```
1. Usuário acessa aplicação
2. Frontend verifica token em localStorage
3. Se não há token → redirect para login
4. Se há token → GET /api/auth/me
5. Backend valida JWT e retorna dados do usuário
6. Se usuário não existe na base → erro 'user_not_registered'
7. Se usuário bloqueado → verificar blocked_until
```

### 3.2 Regras de Autorização

```
MIDDLEWARE: checkRole(requiredRole)
- Verificar JWT válido
- Verificar usuário existe e não bloqueado
- Comparar role do usuário com requiredRole
- Verificar hierarquia para conteúdo tiered

MIDDLEWARE: checkVipAccess()
- Verificar vip_access=true OU role=admin
```

### 3.3 Validação de Dados

#### Criação de Post
```javascript
{
  content: string (opcional se houver imagem),
  image_url: string (opcional),
  access_level: enum['public', 'mentored', 'advanced', 'vip'],
  is_signal: boolean,
  signal_type: enum['buy', 'sell', 'hold', 'alert'] (apenas se is_signal=true)
}
```

#### Criação de Comentário
```javascript
{
  post_id: UUID (obrigatório),
  parent_comment_id: UUID (opcional, para respostas),
  content: string (obrigatório)
}
```

#### Atualização de Perfil
```javascript
{
  bio: string (max 500 chars),
  phone: string,
  avatar_url: string (URL válida)
}
```

### 3.4 Lógica de Negócio

#### Verificação de acesso a conteúdo
```javascript
function canAccessContent(user, contentLevel) {
  if (user.role === 'admin') return true;
  if (contentLevel === 'vip') return user.vip_access;
  
  const roleOrder = { user: 0, mentored: 1, advanced: 2, admin: 3 };
  const levelOrder = { public: 0, mentored: 1, advanced: 2, vip: 3 };
  
  return roleOrder[user.role] >= levelOrder[contentLevel];
}
```

#### Detecção de contato (deve rodar no backend também!)
```javascript
const CONTACT_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // email
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g, // phone
  /@[a-zA-Z0-9_]{2,30}/g, // social handles
  /(?:instagram|telegram|whatsapp|twitter|tiktok|discord|facebook|linkedin)[\s.:\/]*[a-zA-Z0-9_.\/]+/gi,
  /(?:t\.me|wa\.me|bit\.ly|linktr\.ee)\/[a-zA-Z0-9_]+/gi,
  /https?:\/\/[^\s]+/gi,
];
```

---

## 4. Design da API (Endpoints)

### 4.1 Autenticação

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/login` | Login com credentials | Não |
| POST | `/api/auth/logout` | Logout e invalidação de token | Sim |
| GET | `/api/auth/me` | Dados do usuário atual | Sim |
| PATCH | `/api/auth/me` | Atualizar dados do perfil | Sim |
| POST | `/api/auth/refresh` | Refresh do token JWT | Sim |

#### GET /api/auth/me - Response
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "João Silva",
  "role": "mentored",
  "vip_access": true,
  "bio": "Trader desde 2020",
  "phone": "+5511999999999",
  "avatar_url": "https://cdn.example.com/avatar.jpg",
  "violation_count": 0,
  "is_blocked": false,
  "blocked_until": null,
  "created_at": "2024-01-15T10:00:00Z"
}
```

### 4.2 Usuários (Admin)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/users` | Listar todos os usuários | Admin |
| GET | `/api/users/:id` | Detalhes de um usuário | Admin |
| PATCH | `/api/users/:id` | Atualizar usuário | Admin |
| POST | `/api/users/invite` | Convidar novo usuário | Admin |
| DELETE | `/api/users/:id` | Desativar usuário | Admin |

#### PATCH /api/users/:id - Request
```json
{
  "role": "advanced",
  "vip_access": true,
  "is_blocked": false
}
```

### 4.3 Posts

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/posts` | Listar posts (com filtros) | Sim |
| GET | `/api/posts/:id` | Detalhes de um post | Sim |
| POST | `/api/posts` | Criar novo post | Sim |
| PATCH | `/api/posts/:id` | Atualizar post | Sim (dono/admin) |
| DELETE | `/api/posts/:id` | Soft delete de post | Sim (dono/admin) |
| POST | `/api/posts/:id/pin` | Fixar/desafixar post | Admin |

#### GET /api/posts - Query Params
```
?access_level=public|mentored|advanced|vip
?status=active|deleted
?author_email=joao@example.com
?is_signal=true|false
?limit=50&offset=0
?sort=-created_at
```

#### POST /api/posts - Request
```json
{
  "content": "Análise de BTC para hoje...",
  "image_url": "https://cdn.example.com/chart.jpg",
  "access_level": "vip",
  "is_signal": true,
  "signal_type": "buy"
}
```

#### Response
```json
{
  "id": "uuid",
  "content": "Análise de BTC para hoje...",
  "image_url": "https://cdn.example.com/chart.jpg",
  "author_name": "João Silva",
  "author_email": "joao@example.com",
  "author_avatar": "https://cdn.example.com/avatar.jpg",
  "access_level": "vip",
  "is_signal": true,
  "signal_type": "buy",
  "is_pinned": false,
  "likes_count": 0,
  "comments_count": 0,
  "status": "active",
  "created_at": "2024-01-20T14:30:00Z",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

### 4.4 Comentários

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/posts/:id/comments` | Listar comentários do post | Sim |
| POST | `/api/posts/:id/comments` | Criar comentário | Sim |
| PATCH | `/api/comments/:id` | Editar comentário | Sim (dono) |
| DELETE | `/api/comments/:id` | Soft delete comentário | Sim (dono/admin) |

#### POST /api/posts/:id/comments - Request
```json
{
  "content": "Ótima análise!",
  "parent_comment_id": null
}
```

### 4.5 Curtidas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/likes` | Listar likes do usuário atual | Sim |
| POST | `/api/posts/:id/like` | Curtir post | Sim |
| DELETE | `/api/posts/:id/like` | Remover curtida | Sim |

### 4.6 Alertas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/alerts` | Listar alertas para o usuário | Sim |
| PATCH | `/api/alerts/:id/read` | Marcar como lido | Sim |
| POST | `/api/alerts` | Criar alerta | Admin |
| DELETE | `/api/alerts/:id` | Remover alerta | Admin |

#### POST /api/alerts - Request
```json
{
  "title": "Novo Sinal: BTC",
  "message": "Entrada recomendada em $45,000",
  "type": "signal",
  "target_level": "vip",
  "target_email": null
}
```

### 4.7 Moderação (Admin)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/moderation/logs` | Logs de moderação | Admin |
| POST | `/api/moderation/check` | Verificar texto (detecção) | Sim |

### 4.8 Upload

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/upload` | Upload de arquivo/imagem | Sim |

#### Response
```json
{
  "file_url": "https://cdn.example.com/uploads/uuid.jpg"
}
```

### 4.9 Estatísticas (Admin)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/admin/stats` | Estatísticas gerais | Admin |

#### Response
```json
{
  "total_users": 150,
  "total_posts": 450,
  "total_vip_users": 25,
  "total_moderation_logs": 12,
  "blocked_users": 3,
  "posts_today": 15
}
```

---

## 5. Design do Banco de Dados (SQL)

### 5.1 Diagrama de Relacionamentos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │     posts       │     │    comments     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │──┐  │ id (PK)         │     │ id (PK)         │
│ email           │  │  │ author_email (FK)│    │ post_id (FK)    │
│ full_name       │  └──│ content         │     │ author_email (FK)│
│ role            │     │ access_level    │     │ parent_comment_id│
│ vip_access      │     │ status          │     │ content         │
│ bio             │     │ is_signal       │     │ status          │
│ phone           │     │ signal_type     │     │ created_at      │
│ avatar_url      │     │ is_pinned       │     └─────────────────┘
│ violation_count │     │ likes_count     │
│ is_blocked      │     │ comments_count  │     ┌─────────────────┐
│ blocked_until   │     │ created_at      │     │     likes       │
│ created_at      │     └─────────────────┘     ├─────────────────┤
└─────────────────┘           │                   │ id (PK)         │
                              │                   │ post_id (FK)    │
                              │                   │ user_email (FK) │
                              │                   │ created_at      │
                              │                   └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    alerts       │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ title           │
                    │ message         │
                    │ type            │
                    │ target_level    │
                    │ target_email    │
                    │ is_read         │
                    │ created_at      │
                    └─────────────────┘

┌─────────────────┐
│ moderation_logs │
├─────────────────┤
│ id (PK)         │
│ user_email (FK) │
│ user_name       │
│ violation_type  │
│ content_blocked │
│ action_taken    │
│ attempt_number  │
│ context         │
│ created_at      │
└─────────────────┘
```

### 5.2 Schema SQL

```sql
-- Enum types
CREATE TYPE user_role AS ENUM ('user', 'mentored', 'advanced', 'admin');
CREATE TYPE access_level AS ENUM ('public', 'mentored', 'advanced', 'vip');
CREATE TYPE signal_type AS ENUM ('buy', 'sell', 'hold', 'alert');
CREATE TYPE alert_type AS ENUM ('info', 'warning', 'urgent', 'signal');
CREATE TYPE moderation_action AS ENUM ('warning', 'message_sent', 'blocked_30_days', 'permanent_ban');
CREATE TYPE content_status AS ENUM ('active', 'deleted', 'suspended');

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- se autenticação própria
    role user_role DEFAULT 'user',
    vip_access BOOLEAN DEFAULT FALSE,
    bio TEXT,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    violation_count INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT,
    image_url VARCHAR(500),
    author_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(500),
    access_level access_level DEFAULT 'public',
    status content_status DEFAULT 'active',
    is_signal BOOLEAN DEFAULT FALSE,
    signal_type signal_type,
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para posts
CREATE INDEX idx_posts_access_level ON posts(access_level) WHERE status = 'active';
CREATE INDEX idx_posts_author ON posts(author_email);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_pinned ON posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_posts_signal ON posts(is_signal) WHERE is_signal = TRUE;

-- Tabela de comentários
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(500),
    content TEXT NOT NULL,
    status content_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para comentários
CREATE INDEX idx_comments_post ON comments(post_id) WHERE status = 'active';
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_author ON comments(author_email);

-- Tabela de curtidas
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_email)
);

-- Índice para likes
CREATE INDEX idx_likes_user ON likes(user_email);
CREATE INDEX idx_likes_post ON likes(post_id);

-- Tabela de alertas
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type alert_type DEFAULT 'info',
    target_level access_level DEFAULT 'all',
    target_email VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para alertas
CREATE INDEX idx_alerts_target_level ON alerts(target_level);
CREATE INDEX idx_alerts_target_email ON alerts(target_email);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- Tabela de logs de moderação
CREATE TABLE moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    user_name VARCHAR(255),
    violation_type VARCHAR(50) NOT NULL,
    content_blocked TEXT,
    action_taken moderation_action NOT NULL,
    attempt_number INTEGER NOT NULL,
    context VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para moderação
CREATE INDEX idx_moderation_user ON moderation_logs(user_email);
CREATE INDEX idx_moderation_created ON moderation_logs(created_at DESC);

-- Tabela de sessões/tokens (se autenticação própria)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Análise de Segurança (CRÍTICO)

### 6.1 Vulnerabilidades Identificadas

| # | Vulnerabilidade | Risco | Localização |
|---|-----------------|-------|-------------|
| 1 | **Moderação apenas no frontend** | 🔴 CRÍTICO | `CreatePost.jsx`, `CommentSection.jsx` |
| 2 | **Token em localStorage** | 🟡 MÉDIO | `app-params.js` |
| 3 | **Validação de acesso apenas no frontend** | 🔴 CRÍTICO | Todas as páginas |
| 4 | **XSS via conteúdo de posts/comentários** | 🔴 CRÍTICO | `PostCard.jsx`, `CommentSection.jsx` |
| 5 | **Email em texto plano (suporte)** | 🟢 BAIXO | `Support.jsx` |
| 6 | **Falta de rate limiting** | 🟡 MÉDIO | Todos os endpoints |
| 7 | **Upload sem validação de tipo/tamanho** | 🟡 MÉDIO | `CreatePost.jsx`, `Profile.jsx` |
| 8 | **Informações sensíveis em queries** | 🟡 MÉDIO | Várias queries |

### 6.2 Detalhamento e Correções

#### 1. Moderação apenas no frontend 🔴

**Problema**: A detecção de informações de contato e penalidades só acontecem no frontend. Usuários mal-intencionados podem burlar facilmente.

**Risco**: Usuários podem postar conteúdo proibido ignorando as regras da comunidade.

**Fix**:
```javascript
// Backend - middleware de moderação
async function moderationMiddleware(req, res, next) {
  const { content } = req.body;
  
  // Replicar mesma lógica do frontend
  const hasContact = detectContactInfo(content);
  
  if (hasContact && req.user.role !== 'admin') {
    // Registrar violação
    await logViolation(req.user, content, req.path);
    
    // Verificar penalidade
    const action = await getViolationAction(req.user.id);
    
    if (action === 'blocked_30_days') {
      await blockUser(req.user.id, 30);
      return res.status(403).json({ error: 'Usuário bloqueado por 30 dias' });
    }
    
    return res.status(400).json({ 
      error: 'Conteúdo bloqueado',
      message: 'Não é permitido compartilhar informações de contato'
    });
  }
  
  next();
}
```

#### 2. Token em localStorage 🟡

**Problema**: Tokens JWT armazenados em localStorage são vulneráveis a XSS.

**Risco**: Se houver XSS, atacante pode roubar token e impersonar usuário.

**Fix**:
```javascript
// Opção 1: HttpOnly cookies (recomendado)
// Backend deve enviar token em cookie HttpOnly

// Opção 2: Short-lived tokens + refresh token rotation
// Tokens com 15min de expiração, refresh tokens em HttpOnly cookie
```

#### 3. Validação de acesso apenas no frontend 🔴

**Problema**: Todas as verificações de role e nível são feitas no frontend. API pode retornar dados que usuário não deveria ver.

**Risco**: Usuários podem acessar conteúdo VIP ou de outras tiers via API direta.

**Fix**:
```javascript
// Backend - middleware de autorização por nível
function requireAccessLevel(level) {
  return async (req, res, next) => {
    const userLevel = getUserLevel(req.user);
    const contentLevel = getContentLevel(level);
    
    if (!canAccess(userLevel, contentLevel)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

// Usar em todas as rotas tiered
app.get('/api/posts', requireAccessLevel('public'), getPosts);
```

#### 4. XSS via conteúdo 🔴

**Problema**: Conteúdo de posts/comentários é renderizado sem sanitização adequada no frontend.

**Risco**: Injeção de scripts maliciosos.

**Fix**:
```javascript
// Backend - sanitizar todo conteúdo antes de salvar
const DOMPurify = require('isomorphic-dompurify');

function sanitizeContent(content) {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// No modelo antes de salvar
post.content = sanitizeContent(post.content);
```

#### 5. Falta de rate limiting 🟡

**Fix**:
```javascript
const rateLimit = require('express-rate-limit');

const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 posts por janela
  message: 'Limite de posts excedido. Tente novamente mais tarde.'
});

app.post('/api/posts', createPostLimiter, createPost);
```

#### 6. Upload sem validação 🟡

**Fix**:
```javascript
const multer = require('multer');
const path = require('path');

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas'));
  }
});
```

---

## 7. Ferramentas e Stack Recomendados

### 7.1 Backend Framework

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **Node.js + Express** | ⭐ Principal | Mesma linguagem do frontend, grande ecossistema |
| **Node.js + Fastify** | Alternativa | Melhor performance que Express |
| **Django (Python)** | Alternativa | Baterias inclusas, ORM poderoso |
| **Spring Boot (Java)** | Enterprise | Para grandes escalas, mais verboso |

### 7.2 Banco de Dados

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **PostgreSQL** | ⭐ Principal | Gratuito, robusto, suporte a JSON, full-text search |
| **MySQL 8+** | Alternativa | Familiaridade, boa performance |
| **SQLite** | Apenas dev/test | Não recomendado para produção |

### 7.3 Autenticação

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **JWT + bcrypt** | ⭐ Principal | Stateless, amplamente suportado |
| **Passport.js** | Para OAuth | Integração com Google, GitHub, etc. |
| **Auth0/Clerk** | Managed | Menos código para manter, custo adicional |
| ** Lucia-auth** | Moderna | TypeScript-first, session-based |

### 7.4 ORM/Query Builder

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **Prisma** | ⭐ Principal | Type-safe, migrações, excelente DX |
| **TypeORM** | Alternativa | Decorators, mais maduro |
| **Sequelize** | Legacy | Maior adoção, mais verboso |
| **Drizzle** | Moderna | Type-safe, SQL-like syntax |

### 7.5 Validação

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **Zod** | ⭐ Principal | Type-safe, runtime validation |
| **Joi** | Alternativa | Mais verboso, mas poderoso |
| **express-validator** | Simples | Integração direta com Express |

### 7.6 Upload de Arquivos

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **AWS S3** | ⭐ Principal | Escalável, confiável |
| **Cloudflare R2** | Alternativa | Compatível S3, menor custo |
| **Local + CDN** | Simples | Para MVPs iniciais |

### 7.7 Email

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **SendGrid** | ⭐ Principal | Free tier generoso, boa entregabilidade |
| **Resend** | Moderna | Developer-friendly, React Email |
| **AWS SES** | Escalável | Menor custo em volume |

### 7.8 Hosting

| Opção | Recomendação | Porquê |
|-------|--------------|--------|
| **Railway/Render** | ⭐ Principal | Deploy fácil, PostgreSQL integrado |
| **Vercel + Serverless** | JAMstack | Para arquitetura serverless |
| **AWS/GCP/Azure** | Enterprise | Controle total, mais complexo |
| **DigitalOcean** | VPS | Controle do servidor, preço fixo |

### 7.9 Outras Ferramentas

| Ferramenta | Uso |
|------------|-----|
| **Helmet.js** | Headers de segurança HTTP |
| **CORS** | Configuração de CORS |
| **dotenv** | Variáveis de ambiente |
| **Winston/Pino** | Logging |
| **Jest/Vitest** | Testes unitários |
| **Supertest** | Testes de API |
| **Socket.io** | WebSocket (futuro: notificações realtime) |

---

## 8. Plano de Implementação Passo a Passo

### Fase 1: Setup Inicial (Dia 1-2)
```
1. Criar repositório Git
2. Inicializar projeto Node.js com TypeScript
3. Configurar ESLint + Prettier
4. Instalar dependências principais (Express, Prisma, Zod, etc.)
5. Configurar variáveis de ambiente (.env)
6. Setup Docker para PostgreSQL (dev)
7. Configurar estrutura de pastas (MVC/Feature-based)
```

### Fase 2: Database e Models (Dia 3-4)
```
1. Configurar Prisma
2. Criar schema do banco (usuários, posts, etc.)
3. Criar migração inicial
4. Criar seed data para desenvolvimento
5. Configurar conexão com database
6. Testar queries básicas
```

### Fase 3: Autenticação (Dia 5-7)
```
1. Implementar registro de usuários
2. Implementar login com JWT
3. Criar middleware de autenticação
4. Implementar refresh token
5. Criar endpoint /auth/me
6. Implementar atualização de perfil
7. Testar fluxo completo
```

### Fase 4: Posts e Feed (Dia 8-10)
```
1. CRUD de posts
2. Implementar filtros por nível de acesso
3. Middleware de autorização por tier
4. Upload de imagens
5. Sistema de pinar posts (admin)
6. Soft delete
7. Testes
```

### Fase 5: Comentários e Curtidas (Dia 11-12)
```
1. CRUD de comentários
2. Sistema de replies (nested)
3. Sistema de curtidas (toggle)
4. Contadores (likes_count, comments_count)
5. Otimizar queries com índices
```

### Fase 6: Moderação (Dia 13-14)
```
1. Implementar detecção de contato no backend
2. Middleware de moderação para posts
3. Middleware de moderação para comentários
4. Sistema de logs de moderação
5. Penalidades automáticas (warning → block → ban)
6. Testar cenários de violação
```

### Fase 7: Admin e Alertas (Dia 15-17)
```
1. Middleware de admin
2. Endpoints de gestão de usuários
3. Sistema de convites
4. Estatísticas administrativas
5. CRUD de alertas
6. Sistema de targeting de alertas
```

### Fase 8: Segurança (Dia 18-19)
```
1. Implementar rate limiting
2. Configurar Helmet.js
3. Sanitização de inputs
4. Validação de uploads
5. Revisar todas as queries
6. Penetration testing básico
```

### Fase 9: Testes (Dia 20-22)
```
1. Escrever testes unitários (services)
2. Escrever testes de integração (API)
3. Testar casos de borda
4. Testar segurança
5. Cobertura mínima 80%
```

### Fase 10: Deploy (Dia 23-25)
```
1. Configurar CI/CD (GitHub Actions)
2. Setup produção (Railway/Render)
3. Configurar banco de dados produção
4. Variáveis de ambiente de produção
5. SSL/HTTPS
6. Monitoramento (Sentry/LogRocket)
7. Documentação de deploy
```

---

## 9. Boas Práticas

### 9.1 Backend Best Practices

- ✅ **Separação de concerns**: Controllers → Services → Repositories
- ✅ **Validação em camadas**: Middleware → DTO → Database constraints
- ✅ **Erros padronizados**: Estrutura consistente de resposta de erro
- ✅ **Logging estruturado**: Winston/Pino com correlation IDs
- ✅ **Documentação automática**: Swagger/OpenAPI
- ✅ **Versioning de API**: /api/v1/...
- ✅ **Paginação**: Sempre em listas (limit/offset ou cursor)
- ✅ **Soft deletes**: Nunca delete físico de dados importantes
- ✅ **Migrations**: Nunca altere schema manualmente
- ✅ **Transactions**: Para operações multi-tabela

### 9.2 Security Best Practices

- ✅ **Nunca confie no frontend**: Valide tudo no backend
- ✅ **Principle of least privilege**: Apenas permissões necessárias
- ✅ **Prepared statements**: Sempre (proteção contra SQL injection)
- ✅ **HTTPS everywhere**: Em produção, nunca HTTP
- ✅ **Secrets management**: Nunca commit secrets, use .env
- ✅ **Dependency scanning**: npm audit, Snyk
- ✅ **CORS restritivo**: Apenas origins permitidas
- ✅ **Rate limiting**: Proteja contra abuso
- ✅ **Input sanitization**: Escape tudo que vem do usuário
- ✅ **Security headers**: Helmet.js padrão

### 9.3 Code Organization

```
src/
├── config/           # Configurações (database, auth, etc.)
├── controllers/      # Request/Response handlers
├── services/         # Lógica de negócio
├── repositories/     # Acesso a dados
├── middleware/       # Auth, validation, rate limit
├── routes/           # Definição de rotas
├── models/           # Prisma models (types)
├── utils/            # Funções utilitárias
├── validators/       # Schemas Zod/Joi
├── tests/            # Testes unitários e integração
└── app.js            # Entry point
```

### 9.4 Checklist de Code Review

- [ ] Toda entrada validada?
- [ ] Autorização verificada?
- [ ] SQL injection protegido?
- [ ] XSS protegido?
- [ ] Erros tratados?
- [ ] Logs adequados?
- [ ] Testes escritos?
- [ ] Documentação atualizada?

---

## 10. Notas Finais

### Pontos Críticos para Implementação

1. **A moderação DEVE estar no backend** - Isso é não-negociável
2. **Autorização por nível DEVE ser verificada em cada endpoint** - Não confie no frontend
3. **XSS é uma vulnerabilidade real** - Sanitize todos os inputs
4. **Rate limiting é essencial** - Proteja sua API contra abuso
5. **Teste a segurança** - Use ferramentas como OWASP ZAP

### Escalabilidade Futura

- **WebSockets**: Para notificações em tempo real
- **Cache**: Redis para posts populares e sessões
- **CDN**: Cloudflare para assets estáticos
- **Queue**: Bull/Agenda para processamento de moderação
- **Search**: Elasticsearch para busca de posts
- **Analytics**: Mixpanel/Amplitude para métricas de uso

---

**Documento criado para desenvolvedores de nível intermediário.**
**Priorize segurança e simplicidade sobre complexidade desnecessária.**
