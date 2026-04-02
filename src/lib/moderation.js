// Contact info detection patterns
const CONTACT_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // email
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g, // phone
  /@[a-zA-Z0-9_]{2,30}/g, // social media handles
  /(?:instagram|telegram|whatsapp|twitter|tiktok|discord|facebook|linkedin)[\s.:\/]*[a-zA-Z0-9_.\/]+/gi,
  /(?:t\.me|wa\.me|bit\.ly|linktr\.ee)\/[a-zA-Z0-9_]+/gi, // short links
  /https?:\/\/[^\s]+/gi, // URLs
];

export function detectContactInfo(text) {
  if (!text) return { hasContact: false, matches: [] };
  
  const matches = [];
  for (const pattern of CONTACT_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return {
    hasContact: matches.length > 0,
    matches: [...new Set(matches)],
  };
}

export function getViolationAction(violationCount) {
  if (violationCount === 0) return 'warning';
  if (violationCount === 1) return 'message_sent';
  if (violationCount === 2) return 'blocked_30_days';
  return 'permanent_ban';
}

export function getWarningMessage(attemptNumber) {
  switch (attemptNumber) {
    case 1:
      return 'Seu conteúdo foi bloqueado por conter informações de contato pessoal. Isso não é permitido na comunidade.';
    case 2:
      return 'Você tentou compartilhar informações de contato pessoal novamente. Caso tente mais uma vez, sua conta será bloqueada por 30 dias.';
    case 3:
      return 'Sua conta foi bloqueada por 30 dias por violações repetidas das regras da comunidade.';
    default:
      return 'Sua conta foi banida permanentemente da comunidade por violações repetidas.';
  }
}

export function canViewContent(userRole, vipAccess, contentLevel) {
  const levels = { public: 0, mentored: 1, advanced: 2, vip: 3 };
  const roleLevel = { user: 0, mentored: 1, advanced: 2, admin: 3 };
  
  if (userRole === 'admin') return true;
  if (contentLevel === 'vip') return vipAccess || userRole === 'admin';
  
  return (roleLevel[userRole] || 0) >= (levels[contentLevel] || 0);
}

export function getRoleBadge(role, vipAccess) {
  if (role === 'admin') return { label: 'Admin', color: 'text-destructive' };
  if (vipAccess) return { label: 'VIP', color: 'text-neon-purple' };
  if (role === 'advanced') return { label: 'Avançado', color: 'text-neon-blue' };
  if (role === 'mentored') return { label: 'Mentorado', color: 'text-primary' };
  return { label: 'Membro', color: 'text-muted-foreground' };
}